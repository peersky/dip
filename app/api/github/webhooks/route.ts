import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const delivery = request.headers.get("x-github-delivery");

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const isDevelopment = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_MODE === "true";

    if (!webhookSecret) {
      console.error("GITHUB_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Skip signature verification in development mode
    if (!isDevelopment) {
      if (!signature) {
        return NextResponse.json({ error: "No signature provided" }, { status: 401 });
      }

      // Verify signature
      const expectedSignature = `sha256=${crypto.createHmac("sha256", webhookSecret).update(body).digest("hex")}`;

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.log("Development mode: Skipping webhook signature verification");
    }

    const payload = JSON.parse(body);

    console.log(`Received GitHub webhook: ${event} (${delivery})`);

    // Handle different event types
    switch (event) {
      case "installation":
        await handleInstallationEvent(payload);
        break;

      case "installation_repositories":
        await handleInstallationRepositoriesEvent(payload);
        break;

      case "meta":
        await handleMetaEvent(payload);
        break;

      case "pull_request":
        await handlePullRequestEvent(payload);
        break;

      case "pull_request_review":
        await handlePullRequestReviewEvent(payload);
        break;

      case "pull_request_review_comment":
        await handlePullRequestReviewCommentEvent(payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function handleInstallationEvent(payload: any) {
  const { action, installation, sender } = payload;

  console.log(`Installation ${action} by ${sender.login}:`, {
    installationId: installation.id,
    account: installation.account.login,
    repositoryCount: installation.repository_selection === "all" ? "all" : installation.repositories?.length || 0,
  });

  // TODO: Update database with installation changes
  // - Store installation data
  // - Track user installations
  // - Handle uninstallation cleanup
}

async function handleInstallationRepositoriesEvent(payload: any) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  console.log(`Installation repositories ${action}:`, {
    installationId: installation.id,
    added: repositories_added?.length || 0,
    removed: repositories_removed?.length || 0,
  });

  // TODO: Update repository access cache
  // - Refresh accessible repositories for installation
  // - Invalidate cached repository lists
}

async function handleMetaEvent(payload: any) {
  const { action, hook } = payload;

  console.log(`Meta event ${action}:`, {
    hookId: hook.id,
    hookType: hook.type,
  });

  // TODO: Handle app deletion
  // - Clean up installation data
  // - Notify affected users
}

async function handlePullRequestEvent(payload: any) {
  const { action, pull_request, repository } = payload;

  // Only track PRs that might be EIP submissions
  if (repository.name === "EIPs" || repository.name.includes("improvement") || repository.name.includes("proposal")) {
    console.log(`PR ${action} in ${repository.full_name}:`, {
      prNumber: pull_request.number,
      title: pull_request.title,
      author: pull_request.user.login,
      state: pull_request.state,
      merged: pull_request.merged,
    });

    // TODO: Track EIP submission progress
    // - Update EIP status in database
    // - Notify user of PR status changes
    // - Track review progress
  }
}

async function handlePullRequestReviewEvent(payload: any) {
  const { action, review, pull_request, repository } = payload;

  if (repository.name === "EIPs" || repository.name.includes("improvement")) {
    console.log(`PR review ${action} in ${repository.full_name}:`, {
      prNumber: pull_request.number,
      reviewer: review.user.login,
      state: review.state,
      body: review.body?.substring(0, 100) + "...",
    });

    // TODO: Handle review feedback
    // - Notify EIP author of reviews
    // - Track review status
    // - Show feedback in platform
  }
}

async function handlePullRequestReviewCommentEvent(payload: any) {
  const { action, comment, pull_request, repository } = payload;

  if (repository.name === "EIPs" || repository.name.includes("improvement")) {
    console.log(`PR review comment ${action} in ${repository.full_name}:`, {
      prNumber: pull_request.number,
      commenter: comment.user.login,
      body: comment.body?.substring(0, 100) + "...",
    });

    // TODO: Handle review comments
    // - Notify relevant users
    // - Track discussion progress
  }
}

export async function GET() {
  return NextResponse.json({
    message: "GitHub webhook endpoint. Use POST to receive webhook events.",
  });
}
