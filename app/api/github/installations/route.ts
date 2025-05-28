import { NextResponse } from "next/server";
import { App } from "octokit";

export async function GET() {
  try {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      return NextResponse.json({ error: "GitHub App not configured" }, { status: 500 });
    }

    // Create GitHub App instance
    const app = new App({
      appId: appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });

    // Get all installations for this app
    const { data: installations } = await app.octokit.rest.apps.listInstallations();

    const installationInfo = installations.map((installation) => ({
      id: installation.id,
      account: installation.account?.login || installation.account?.name,
      type: installation.account?.type,
      repositories_count: installation.repository_selection === "all" ? "all" : "selected",
      created_at: installation.created_at,
      updated_at: installation.updated_at,
    }));

    return NextResponse.json({
      success: true,
      installations: installationInfo,
      total: installations.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch installations:", error);
    return NextResponse.json({ error: "Failed to fetch installations", details: error.message }, { status: 500 });
  }
}
