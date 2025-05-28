import { NextResponse } from "next/server";
import { App } from "octokit";

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

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

    try {
      // Get all installations for this app
      const { data: installations } = await app.octokit.rest.apps.listInstallations();

      // Check if any installation belongs to this user
      const userInstallation = installations.find((installation) => installation.account?.login === username);

      if (userInstallation) {
        // Get installation details
        const installationOctokit = await app.getInstallationOctokit(userInstallation.id);
        const { data: repositories } = await installationOctokit.rest.apps.listReposAccessibleToInstallation();

        return NextResponse.json({
          hasInstallation: true,
          installation: {
            id: userInstallation.id,
            account: userInstallation.account,
            repositories: repositories.repositories.map((repo) => ({
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              private: repo.private,
            })),
          },
        });
      } else {
        return NextResponse.json({
          hasInstallation: false,
          installation: null,
        });
      }
    } catch (error: any) {
      console.error("Error checking installations:", error);
      return NextResponse.json({
        hasInstallation: false,
        installation: null,
        error: "Could not check installations",
      });
    }
  } catch (error: any) {
    console.error("GitHub installation check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check installation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "GitHub installation check endpoint. Use POST with username.",
  });
}
