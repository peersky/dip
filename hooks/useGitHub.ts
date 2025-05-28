import { useQuery } from "@tanstack/react-query";

// Types
interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    type: string;
  };
  target_type: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}

interface GitHubInstallationsResponse {
  success: boolean;
  installations: GitHubInstallation[];
  user?: GitHubUser;
}

// API functions
const fetchGitHubInstallations = async (): Promise<GitHubInstallationsResponse> => {
  const response = await fetch("/api/github/installations");

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Request failed with status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch GitHub installations");
  }

  return data;
};

const fetchGitHubUser = async (username: string): Promise<GitHubUser> => {
  const response = await fetch(`https://api.github.com/users/${username}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch user data for ${username}`);
  }

  return response.json();
};

// Query keys
export const githubKeys = {
  all: ["github"] as const,
  installations: () => [...githubKeys.all, "installations"] as const,
  user: (username: string) => [...githubKeys.all, "user", username] as const,
};

// Hooks
export const useGitHubInstallations = () => {
  return useQuery({
    queryKey: githubKeys.installations(),
    queryFn: fetchGitHubInstallations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on auth failures
  });
};

export const useGitHubUser = (username: string) => {
  return useQuery({
    queryKey: githubKeys.user(username),
    queryFn: () => fetchGitHubUser(username),
    enabled: !!username, // Only run if username is provided
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Export types for use in components
export type { GitHubInstallation, GitHubUser, GitHubInstallationsResponse };
