import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { prisma } from "@/lib/prisma";

let appOctokit: Octokit | null = null;

/**
 * Creates and memoizes an Octokit instance authenticated as the GitHub App.
 * This is used for app-level API calls (e.g., getting installation details).
 * @returns An Octokit instance authenticated with a JWT.
 */
export function getAppAuthenticatedOctokit(): Octokit {
  if (appOctokit) {
    return appOctokit;
  }

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "GitHub App credentials are not configured in environment variables.",
    );
  }

  appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    },
  });

  return appOctokit;
}

/**
 * Creates an Octokit instance authenticated for a specific installation of the GitHub App.
 * This allows the server to perform actions on behalf of the app for a user's repository.
 * @param installationId - The ID of the GitHub App installation.
 * @returns An authenticated Octokit instance.
 */
export async function getInstallationOctokit(
  installationId: number,
): Promise<Octokit | null> {
  try {
    const appAuth = getAppAuthenticatedOctokit();
    const { token } = await (appAuth.auth as any)({
      type: "installation",
      installationId,
    });

    return new Octokit({ auth: token });
  } catch (error) {
    console.error(
      `Failed to create Octokit instance for installation ${installationId}:`,
      error,
    );
    return null;
  }
}
