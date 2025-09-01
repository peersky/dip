import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getInstallationOctokit } from "../../../../../lib/github-app";
import { prisma } from "@/lib/prisma";
import { getProtocolConfig } from "@/lib/subdomain-utils";

interface UpdateRequestBody {
  filename: string;
  content: string;
  title: string; // This is the EIP Title, used for the PR title
  description: string; // This is the EIP description, used for the PR body
  githubInstallationId: string;
  userToken: string; // User's GitHub OAuth token
  eipNumber: string;
}

export async function POST(
  request: NextRequest,
  context: { params: { protocol: string } },
) {
  const body: UpdateRequestBody = await request.json();
  const {
    filename,
    content,
    title,
    description,
    githubInstallationId,
    userToken,
    eipNumber,
  } = body;
  const { protocol } = context.params;

  if (
    !protocol ||
    !filename ||
    !content ||
    !title ||
    !githubInstallationId ||
    !userToken ||
    !eipNumber
  ) {
    return NextResponse.json(
      { success: false, error: "Missing required fields." },
      { status: 400 },
    );
  }

  try {
    const prefix = filename.split("-")[0];
    const repository = await prisma.repository.findFirst({
      where: {
        protocol: protocol,
        proposalPrefix: prefix.toUpperCase(),
      },
    });

    if (!repository) {
      return NextResponse.json(
        {
          success: false,
          error: `Repository for prefix '${prefix}' in protocol '${protocol}' not found.`,
        },
        { status: 404 },
      );
    }

    const owner = repository.owner;
    const repo = repository.repo;
    const eipsFolder = repository.eipsFolder;
    const baseBranch = repository.branch;
    const filePath = `${eipsFolder}/${filename}`;

    // --- Step 1: Authenticate and Prepare Fork ---
    // We use the user's token to handle forks, as the app can't fork on a user's behalf.
    const userOctokit = new Octokit({ auth: userToken });
    const user = (await userOctokit.users.getAuthenticated()).data;

    let forkOwner: string;
    let forkRepo: string;

    // Check if the user has a fork already
    try {
      const forks = await userOctokit.repos.listForks({ owner, repo });
      const userFork = forks.data.find((f) => f.owner.login === user.login);

      if (userFork) {
        forkOwner = userFork.owner.login;
        forkRepo = userFork.name;
      } else {
        // If no fork exists, create one
        const { data: newFork } = await userOctokit.repos.createFork({
          owner,
          repo,
        });
        forkOwner = newFork.owner.login;
        forkRepo = newFork.name;
        // Give GitHub a moment to create the fork before we try to use it
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error: any) {
      console.error("Error finding or creating fork:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to find or create a fork for ${owner}/${repo}. Error: ${error.message}`,
        },
        { status: 500 },
      );
    }

    // --- Step 2: Authenticate as the GitHub App Installation ---
    // The app installation has the necessary permissions to create branches, commit files, and open PRs.
    const octokit = await getInstallationOctokit(
      parseInt(githubInstallationId, 10),
    );
    if (!octokit) {
      throw new Error("Failed to authenticate as GitHub App installation.");
    }

    // --- Step 3: Create a New Branch ---
    const newBranchName = `dip-update-${eipNumber}-${Date.now()}`;
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = refData.object.sha;

    await octokit.git.createRef({
      owner: forkOwner,
      repo: forkRepo,
      ref: `refs/heads/${newBranchName}`,
      sha: baseSha,
    });

    // --- Step 4: Commit the File ---
    // We need the SHA of the existing file to update it.
    let fileSha: string | undefined;
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner, // Check for the file in the upstream repo
        repo,
        path: filePath,
        ref: baseBranch,
      });
      if (!Array.isArray(fileData) && "sha" in fileData) {
        fileSha = fileData.sha;
      }
    } catch (e: any) {
      if (e.status !== 404) {
        throw e; // Re-throw if it's not a "file not found" error
      }
      // If the file doesn't exist, fileSha remains undefined, and a new file will be created.
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: forkOwner,
      repo: forkRepo,
      path: filePath,
      message: `Update ${filename}`,
      content: Buffer.from(content).toString("base64"),
      branch: newBranchName,
      sha: fileSha, // This is undefined for new files, which is correct
    });

    // --- Step 5: Create the Pull Request ---
    const prTitle = `Update ${filename}: ${title}`;
    const prBody = `This pull request was generated by the DIP platform to update \`${filename}\`.

**Description:**
${description || "No description provided."}
`;

    const { data: pullRequest } = await octokit.pulls.create({
      owner, // The PR is opened against the upstream repository
      repo,
      title: prTitle,
      head: `${forkOwner}:${newBranchName}`, // Head is from the user's fork
      base: baseBranch, // Base is the main branch of the upstream repo
      body: prBody,
      maintainer_can_modify: true,
    });

    return NextResponse.json({
      success: true,
      pullRequestUrl: pullRequest.html_url,
    });
  } catch (error: any) {
    console.error("Failed to create pull request:", error);
    return NextResponse.json(
      {
        success: false,
        error: `An unexpected error occurred: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
