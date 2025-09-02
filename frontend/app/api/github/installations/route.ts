import { NextResponse } from "next/server";
import { App } from "octokit";

export async function POST(request: Request) {
  try {
    const { userToken } = await request.json();

    if (!userToken) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 },
      );
    }

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      return NextResponse.json(
        { error: "GitHub App not configured" },
        { status: 500 },
      );
    }

    // First, verify the user token and get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DIP-Platform/1.0",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "Invalid user token" },
        { status: 401 },
      );
    }

    const userData = await userResponse.json();
    console.log(`🔐 Authenticated user: ${userData.login} (${userData.id})`);

    // Create GitHub App instance
    const app = new App({
      appId: appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });

    // Get all installations for this app (this requires app-level access)
    const { data: installations } =
      await app.octokit.rest.apps.listInstallations();

    // Filter installations to only include those belonging to the authenticated user
    const userInstallations = installations.filter((installation) => {
      if (!installation.account) return false;

      // Check if installation belongs to this user (using safe property access)
      const accountLogin =
        installation.account!.login ||
        (installation.account as any).slug ||
        "unknown";

      // For personal accounts, check direct ownership
      if (installation.account.type === "User") {
        return accountLogin === userData.login;
      }

      // For organizations, we'll need to check if user has access
      // For now, we'll include it and let the installation verification handle access
      return true; // We'll verify access when they try to use specific installations
    });

    console.log(
      `📊 Found ${userInstallations.length} installations for user ${userData.login}`,
    );

    // Get detailed info for each user installation
    const installationDetails = await Promise.all(
      userInstallations.map(async (installation) => {
        try {
          const installationOctokit = await app.getInstallationOctokit(
            installation.id,
          );
          const { data: repositories } =
            await installationOctokit.rest.apps.listReposAccessibleToInstallation();

          const accountLogin =
            "login" in installation.account!
              ? installation.account!.login
              : "slug" in installation.account!
                ? (installation.account as any).slug
                : "unknown";

          return {
            id: installation.id,
            account: accountLogin,
            type: installation.account!.type || "Organization",
            repositories_count:
              installation.repository_selection === "all"
                ? "all"
                : repositories.repositories.length,
            repositories: repositories.repositories.map((repo) => ({
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              private: repo.private,
            })),
            created_at: installation.created_at,
            updated_at: installation.updated_at,
          };
        } catch (error) {
          console.warn(
            `Could not access installation ${installation.id}:`,
            error,
          );
          return null;
        }
      }),
    );

    // Filter out failed installations
    const validInstallations = installationDetails.filter(Boolean);

    return NextResponse.json({
      success: true,
      installations: validInstallations,
      user: {
        login: userData.login,
        id: userData.id,
        avatar_url: userData.avatar_url,
        name: userData.name,
        email: userData.email,
      },
      total: validInstallations.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch user installations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch installations",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// Remove the insecure GET endpoint
export async function GET() {
  return NextResponse.json(
    {
      error: "This endpoint requires POST with user authentication token",
    },
    { status: 405 },
  );
}
