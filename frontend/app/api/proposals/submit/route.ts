import { NextRequest, NextResponse } from "next/server";
import { App } from "octokit";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import { prisma } from "@/lib/prisma";

// Helper function to add a delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * This API endpoint is the core of the proposal submission feature. It orchestrates
 * the entire "fork-and-PR" workflow on behalf of an authenticated user.
 *
 * It handles both creating new proposals and submitting edits to existing ones.
 */
export async function POST(request: NextRequest) {
  try {
    const {
      installationId,
      content,
      fileName,
      title,
      protocol,
      isNew,
    } = await request.json();

    if (!installationId || !content || !fileName || !title || !protocol) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 },
      );
    }

    // 1. --- AUTHENTICATION ---
    // Authenticate as the GitHub App to get an installation-specific Octokit client.
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      console.error("Missing GitHub App configuration in environment variables.");
      return NextResponse.json(
        { success: false, error: "GitHub App is not configured on the server." },
        { status: 500 },
      );
    }

    const app = new App({
      appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });

    const installationOctokit = await app.getInstallationOctokit(installationId);
    const { data: user } =
      await installationOctokit.rest.users.getAuthenticated();

    // 2. --- GET REPOSITORY CONFIG ---
    // Look up the target repository details based on the protocol.
    const protocolConfig = getProtocolConfig(protocol);
    if (!protocolConfig) {
      return NextResponse.json(
        { success: false, error: `Protocol "${protocol}" is not configured.` },
        { status: 400 },
      );
    }
    const upstreamOwner = protocolConfig.repoOwner;
    const upstreamRepo = protocolConfig.repoName;
    const userFork = user.login;

    // 3. --- FORK THE REPOSITORY ---
    // Check if the user already has a fork. If not, create one.
    try {
      await installationOctokit.rest.repos.get({
        owner: userFork,
        repo: upstreamRepo,
      });
      console.log(`Fork already exists for ${userFork}/${upstreamRepo}.`);
    } catch (error) {
      console.log(`No fork found, creating one for ${userFork}...`);
      await installationOctokit.rest.repos.createFork({
        owner: upstreamOwner,
        repo: upstreamRepo,
      });
      // It can take a few seconds for a new fork to become available via the API.
      await delay(5000);
      console.log("Fork created successfully.");
    }

    // 4. --- CREATE A NEW BRANCH ---
    // Get the latest commit from the UPSTREAM repo to branch from.
    const { data: upstreamBranch } =
      await installationOctokit.rest.repos.getBranch({
        owner: upstreamOwner,
        repo: upstreamRepo,
        branch: protocolConfig.defaultBranch,
      });
    const latestSha = upstreamBranch.commit.sha;

    // Create a new, unique branch in the USER'S FORK.
    const newBranchName = `dip-submission-${fileName.replace(".md", "")}-${Date.now()}`;
    await installationOctokit.rest.git.createRef({
      owner: userFork,
      repo: upstreamRepo,
      ref: `refs/heads/${newBranchName}`,
      sha: latestSha,
    });
    console.log(`Created new branch: ${newBranchName}`);

    // 5. --- COMMIT THE FILE ---
    const filePath = `${protocolConfig.proposalPrefix}/${fileName}`;
    const commitMessage = isNew ? `Propose ${title}` : `Update ${title}`;

    let fileSha: string | undefined;
    // If we are editing an existing file, we need its SHA to update it.
    if (!isNew) {
      try {
        const { data: existingFile } =
          await installationOctokit.rest.repos.getContent({
            owner: userFork,
            repo: upstreamRepo,
            path: filePath,
            ref: newBranchName, // check on the new branch
          });
        if ("sha" in existingFile) {
          fileSha = existingFile.sha;
        }
      } catch (e) {
        // If the file doesn't exist in the fork, it might be a new proposal being edited,
        // or an edit to a file that hasn't been forked yet. We can proceed without the SHA.
        console.warn(`Could not find existing file SHA for edit: ${filePath}`);
      }
    }

    await installationOctokit.rest.repos.createOrUpdateFileContents({
      owner: userFork,
      repo: upstreamRepo,
      branch: newBranchName,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(content).toString("base64"),
      sha: fileSha,
    });
    console.log(`Committed file: ${filePath}`);

    // 6. --- CREATE THE PULL REQUEST ---
    // Open a PR from the user's fork back to the upstream repository.
    const { data: pullRequest } = await installationOctokit.rest.pulls.create({
      owner: upstreamOwner,
      repo: upstreamRepo,
      head: `${userFork}:${newBranchName}`,
      base: protocolConfig.defaultBranch,
      title: commitMessage,
      body: `This pull request was generated by the DIP Platform on behalf of @${user.login}.`,
      maintainer_can_modify: true,
    });
    console.log(`Created Pull Request: ${pullRequest.html_url}`);

    // 7. --- RETURN THE PR URL ---
    return NextResponse.json({
      success: true,
      pullRequestUrl: pullRequest.html_url,
    });
  } catch (error: any) {
    console.error("Failed to create pull request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create pull request.", details: error.message },
      { status: 500 },
    );
  }
}
