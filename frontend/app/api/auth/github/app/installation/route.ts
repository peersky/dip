import { NextResponse } from "next/server";
import { App } from "octokit";

export async function POST(request: Request) {
  try {
    const { installationId } = await request.json();

    if (!installationId) {
      return NextResponse.json(
        { error: "Installation ID is required" },
        { status: 400 },
      );
    }

    // Development mode: return mock data for testing
    if (
      process.env.NODE_ENV === "development" &&
      installationId === "12345678"
    ) {
      console.log("🧪 Development mode: returning mock installation data");
      return NextResponse.json({
        installation: {
          id: 12345678,
          account: {
            login: "testuser",
            type: "User",
            id: 123456,
            avatar_url: "https://github.com/testuser.png",
          },
          repositories: [
            {
              id: 1,
              name: "EIPs",
              full_name: "ethereum/EIPs",
              private: false,
            },
            {
              id: 2,
              name: "test-repo",
              full_name: "testuser/test-repo",
              private: false,
            },
          ],
        },
        user: {
          login: "testuser",
          id: 123456,
          avatar_url: "https://github.com/testuser.png",
          name: "Test User",
          email: "test@example.com",
        },
      });
    }

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      console.error("Missing GitHub App configuration");
      return NextResponse.json(
        { error: "GitHub App not configured" },
        { status: 500 },
      );
    }

    // Create GitHub App instance
    const app = new App({
      appId: appId,
      privateKey: privateKey.replace(/\\n/g, "\n"), // Handle newlines in env var
    });

    // Authenticate as the app to get installation details
    const appOctokit = await app.getInstallationOctokit(
      parseInt(installationId),
    );
    const { data: installation } = await appOctokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId),
    });

    // Check if installation has an account
    if (!installation.account) {
      console.error("Installation has no associated account");
      return NextResponse.json(
        { error: "Installation account not found" },
        { status: 404 },
      );
    }

    // Get installation access token
    const installationOctokit = await app.getInstallationOctokit(
      parseInt(installationId),
    );

    // Get user/organization info - handle both account types
    let user;
    try {
      // Check if it's a User account (has 'type' property) or Organization (has 'slug' property)
      const isUserAccount =
        "type" in installation.account && installation.account.type === "User";
      const isOrgAccount = "slug" in installation.account;

      if (isUserAccount) {
        // For user accounts, get detailed user info
        const userLogin =
          "login" in installation.account ? installation.account.login : "";
        const { data: userData } =
          await installationOctokit.rest.users.getByUsername({
            username: userLogin,
          });
        user = userData;
      } else if (isOrgAccount) {
        // For organizations, use the installation account info
        const orgName =
          "name" in installation.account ? installation.account.name : "";
        const orgLogin =
          "slug" in installation.account ? installation.account.slug : "";
        user = {
          login: orgLogin,
          id: installation.account.id,
          avatar_url: installation.account.avatar_url,
          name: orgName,
          email: null,
        };
      } else {
        // Fallback for unknown account types
        const accountLogin =
          "login" in installation.account
            ? installation.account.login
            : "slug" in installation.account
              ? installation.account.slug
              : "unknown";
        user = {
          login: accountLogin,
          id: installation.account.id,
          avatar_url: installation.account.avatar_url,
          name: accountLogin,
          email: null,
        };
      }
    } catch (userError) {
      console.warn(
        "Could not fetch user details, using installation account info:",
        userError,
      );
      // Fallback to installation account info
      const accountLogin =
        "login" in installation.account
          ? installation.account.login
          : "slug" in installation.account
            ? installation.account.slug
            : "unknown";
      user = {
        login: accountLogin,
        id: installation.account.id,
        avatar_url: installation.account.avatar_url,
        name: accountLogin,
        email: null,
      };
    }

    // Get accessible repositories
    const { data: repositories } =
      await installationOctokit.rest.apps.listReposAccessibleToInstallation();

    // Safe logging that handles both User and Organization account types
    const accountLogin =
      "login" in installation.account
        ? installation.account.login
        : "slug" in installation.account
          ? installation.account.slug
          : "unknown";
    const accountType =
      "type" in installation.account
        ? installation.account.type
        : "Organization";

    console.log(`Installation ${installationId} verified:`, {
      account: accountLogin,
      type: accountType,
      repositoryCount: repositories.repositories.length,
      repositories: repositories.repositories.map((r) => r.name),
    });

    return NextResponse.json({
      installation: {
        id: installation.id,
        account: installation.account,
        repositories: repositories.repositories.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
        })),
      },
      user: {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("GitHub App installation processing error:", error);

    if (error.status === 404) {
      return NextResponse.json(
        { error: "Installation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to process installation",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "GitHub App installation processing endpoint. Use POST with installation ID.",
  });
}
