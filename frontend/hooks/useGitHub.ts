import { useQuery } from "@tanstack/react-query";

// Types
interface GitHubInstallation {
  id: number;
  account: string;
  type: string;
  repositories_count: string | number;
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
  created_at: string;
  updated_at: string;
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
  user: GitHubUser;
  total: number;
}

// API functions
const fetchGitHubInstallations = async (
  userToken: string,
): Promise<GitHubInstallationsResponse> => {
  const response = await fetch("/api/github/installations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userToken }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(
      errorData.error || `Request failed with status: ${response.status}`,
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch GitHub installations");
  }

  return data;
};

const fetchGitHubUser = async (userToken: string): Promise<GitHubUser> => {
  const response = await fetch("/api/auth/github/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: userToken }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || "Failed to fetch user data");
  }

  const data = await response.json();
  return data.user;
};

// Query keys
export const githubKeys = {
  all: ["github"] as const,
  installations: (userToken: string) =>
    [...githubKeys.all, "installations", userToken] as const,
  user: (userToken: string) => [...githubKeys.all, "user", userToken] as const,
};

// Hooks
export const useGitHubInstallations = (userToken: string | null) => {
  return useQuery({
    queryKey: githubKeys.installations(userToken || ""),
    queryFn: () => fetchGitHubInstallations(userToken!),
    enabled: !!userToken, // Only run if userToken is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on auth failures
  });
};

export const useGitHubUser = (userToken: string | null) => {
  return useQuery({
    queryKey: githubKeys.user(userToken || ""),
    queryFn: () => fetchGitHubUser(userToken!),
    enabled: !!userToken, // Only run if userToken is provided
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Export types for use in components
export type { GitHubInstallation, GitHubUser, GitHubInstallationsResponse };
