import { NextResponse } from "next/server";
import { App } from "octokit";

interface SubmissionParams {
  filename: string;
  content: string;
  title: string;
  eipNumber?: string;
  installationId?: string;
  targetRepository?: {
    owner: string;
    repo: string;
  };
  githubUser?: {
    login: string;
  };
  userToken?: string;
}

export async function POST(request: Request) {
  const { filename, content, title, eipNumber, installationId, githubUser, targetRepository, userToken } = await request.json();

  console.log("🔍 EIP submission request:", {
    filename,
    title,
    eipNumber,
    installationId,
    githubUser: githubUser?.login,
    targetRepository,
    hasUserToken: !!userToken,
    nodeEnv: process.env.NODE_ENV,
    hasGitHubAppId: !!process.env.GITHUB_APP_ID,
    hasGitHubPrivateKey: !!process.env.GITHUB_APP_PRIVATE_KEY,
  });

  if (!filename || !content || !title) {
    console.log("❌ Missing required fields");
    return NextResponse.json({ error: "Filename, content, and title are required" }, { status: 400 });
  }

  // Default to Ethereum EIPs if no target repository specified
  const target = targetRepository || { owner: "ethereum", repo: "EIPs" };
  console.log("🎯 Target repository:", target);

  // If user has GitHub App installed, use app-based approach
  if (installationId && userToken) {
    console.log("📱 Using hybrid submission with installation ID and user token");
    return handleHybridSubmission({ filename, content, title, eipNumber, installationId, githubUser, targetRepository: target, userToken });
  }

  // Otherwise, provide manual submission instructions
  console.log("📝 Using manual submission (missing installation ID or user token)");
  return handleManualSubmission({ filename, content, title, eipNumber, targetRepository: target });
}

async function handleHybridSubmission({ filename, content, title, eipNumber, installationId, githubUser, targetRepository, userToken }: SubmissionParams) {
  try {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    console.log("🚀 Attempting hybrid GitHub submission (app + user token)");
    console.log("📋 App ID present:", !!appId);
    console.log("🔑 Private key present:", !!privateKey);
    console.log("🆔 Installation ID:", installationId);
    console.log("👤 User token present:", !!userToken);

    if (!appId || !privateKey) {
      console.log("❌ Missing GitHub App credentials, falling back to manual submission");
      return handleManualSubmission({ filename, content, title, eipNumber, targetRepository });
    }

    if (!installationId || !userToken) {
      console.log("❌ Missing installation ID or user token, falling back to manual submission");
      return handleManualSubmission({ filename, content, title, eipNumber, targetRepository });
    }

    // Create GitHub App instance for fork operations
    const app = new App({
      appId: appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });

    // Create user OAuth client for PR operations
    const { Octokit } = await import("octokit");
    const userOctokit = new Octokit({
      auth: userToken,
    });

    // Get installation octokit for fork operations
    const appOctokit = await app.getInstallationOctokit(parseInt(installationId!));

    // Get installation details
    const { data: installation } = await app.octokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId!),
    });

    if (!installation.account) {
      throw new Error("Installation account not found");
    }

    // Use the user data passed from frontend
    if (!githubUser?.login) {
      throw new Error("GitHub user data not provided");
    }

    const username = githubUser.login;
    console.log(`👤 Using user: ${username}`);

    // 1. Check if user has a fork of the target repository (using user token)
    let userFork;
    try {
      console.log(`🔍 Checking if ${username} has a fork of ${targetRepository!.owner}/${targetRepository!.repo}`);
      const { data: fork } = await userOctokit.rest.repos.get({
        owner: username,
        repo: targetRepository!.repo,
      });
      userFork = fork;
      console.log(`✅ Found existing fork: ${username}/${targetRepository!.repo}`);
    } catch (error: any) {
      if (error.status === 404) {
        // Fork doesn't exist, create it using user token
        console.log(`🍴 Fork not found. Creating fork of ${targetRepository!.owner}/${targetRepository!.repo} for ${username}`);
        try {
          const { data: fork } = await userOctokit.rest.repos.createFork({
            owner: targetRepository!.owner,
            repo: targetRepository!.repo,
          });
          userFork = fork;
          console.log(`✅ Fork created successfully: ${fork.full_name}`);

          // Wait a moment for fork to be ready
          console.log("⏳ Waiting for fork to be ready...");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (forkError: any) {
          console.error("❌ Failed to create fork:", forkError);
          throw new Error(`Failed to create fork: ${forkError.message}`);
        }
      } else {
        console.error("❌ Error checking for fork:", error);
        throw new Error(`Failed to check for fork: ${error.message}`);
      }
    }

    // 2. Create a new branch for this EIP in the user's fork (using user token)
    const branchName = `eip-${eipNumber || "draft"}-${Date.now()}`;
    console.log(`🌿 Creating branch: ${branchName} in ${username}/${targetRepository!.repo}`);

    // Get the default branch's latest commit from the user's fork
    const { data: defaultBranch } = await userOctokit.rest.repos.getBranch({
      owner: username,
      repo: targetRepository!.repo,
      branch: userFork.default_branch,
    });

    // Create new branch in user's fork
    await userOctokit.rest.git.createRef({
      owner: username,
      repo: targetRepository!.repo,
      ref: `refs/heads/${branchName}`,
      sha: defaultBranch.commit.sha,
    });

    // 3. Create/update the EIP file in the new branch of user's fork (using user token)
    const folderName = targetRepository!.repo === "EIPs" ? "EIPS" : targetRepository!.repo.toUpperCase();
    console.log(`📝 Creating EIP file: ${folderName}/${filename} in ${username}/${targetRepository!.repo}:${branchName}`);

    await userOctokit.rest.repos.createOrUpdateFileContents({
      owner: username,
      repo: targetRepository!.repo,
      path: `${folderName}/${filename}`,
      message: `Add ${title}`,
      content: Buffer.from(content).toString("base64"),
      branch: branchName,
    });

    // 4. Create pull request from user's fork to the target repository (using user token)
    // First, get the target repository's default branch
    const { data: targetRepo } = await userOctokit.rest.repos.get({
      owner: targetRepository!.owner,
      repo: targetRepository!.repo,
    });

    console.log(`🔄 Creating PR from ${username}:${branchName} to ${targetRepository!.owner}:${targetRepo.default_branch} using user token`);

    const { data: pullRequest } = await userOctokit.rest.pulls.create({
      owner: targetRepository!.owner,
      repo: targetRepository!.repo,
      title: title,
      head: `${username}:${branchName}`,
      base: targetRepo.default_branch,
      body: `This pull request adds ${title}.\n\nSubmitted via DIP Platform.\n\n**Author:** ${username}\n**EIP Number:** ${eipNumber || "Draft"}\n**Submission Date:** ${new Date().toISOString().split("T")[0]}`,
      maintainer_can_modify: true,
    });

    console.log(`✅ PR created successfully: #${pullRequest.number} - ${pullRequest.html_url}`);

    return NextResponse.json({
      success: true,
      pullRequest: {
        number: pullRequest.number,
        url: pullRequest.html_url,
        title: pullRequest.title,
      },
      message: "Pull request created successfully!",
    });
  } catch (error: any) {
    console.error("Hybrid GitHub submission error:", error);
    console.error(JSON.stringify(error, null, 2));

    // If submission fails, fall back to manual instructions
    return handleManualSubmission({ filename, content, title, eipNumber, targetRepository });
  }
}

async function handleManualSubmission({ filename, content, title, eipNumber, targetRepository }: SubmissionParams) {
  const repoUrl = `https://github.com/${targetRepository!.owner}/${targetRepository!.repo}`;
  const folderName = targetRepository!.repo === "EIPs" ? "EIPS" : targetRepository!.repo.toUpperCase();

  const instructions = `
## Manual EIP Submission Instructions

Since automatic GitHub submission is not available, please follow these steps:

### Step 1: Fork the Repository
1. Go to ${repoUrl}
2. Click the "Fork" button to create your own fork

### Step 2: Create the EIP File
1. In your fork, navigate to the \`${folderName}/\` directory
2. Create a new file named \`${filename}\`
3. Copy and paste the content below into the file

### Step 3: Create Pull Request
1. Commit the file with message: "${title}"
2. Create a pull request from your fork to ${targetRepository!.owner}/${targetRepository!.repo}
3. Use "${title}" as the PR title
4. In the PR description, mention that this was created via DIP Platform

### Step 4: Follow EIP Process
1. Respond to any feedback from EIP editors
2. Make necessary revisions
3. Follow the standard EIP review process

---

**File: ${filename}**
\`\`\`
${content}
\`\`\`
  `.trim();

  return NextResponse.json({
    success: false,
    manualSubmission: true,
    instructions,
    downloadData: {
      filename,
      content,
    },
    message: "Manual submission instructions provided",
  });
}

export async function GET() {
  return NextResponse.json({
    message: "EIP submission API endpoint. Supports both user-authenticated and manual submission modes.",
  });
}
