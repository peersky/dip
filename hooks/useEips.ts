import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface EipItem {
  number: string;
  title: string;
  description?: string;
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string;
  wordCount?: number;
  sections?: string[];
  fileSize?: number;
  authorEmails?: string[];
  authorGithubHandles?: string[];
}

interface EipListResponse {
  success: boolean;
  data: EipItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    statuses: string[];
    types: string[];
    categories: string[];
    authors?: string[];
    sections?: string[];
  };
  statistics?: {
    totalProposals: number;
    totalWordCount: number;
    averageWordCount: number;
    statusCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    yearCounts: Record<string, number>;
    lastUpdated: string;
  };
  lastUpdate?: string;
  protocol: string;
  error?: string;
}

export interface EipListParams {
  protocol: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  track?: string;
}

interface CreatePRParams {
  // EIP content
  title: string;
  description: string;
  content: string;
  author: string;
  type: string;
  category?: string;
  status: string;
  protocol: string;

  // GitHub-specific parameters
  filename: string;
  eipNumber?: string;
  installationId?: string;
  githubUser?: {
    login: string;
  };
  targetRepository?: {
    owner: string;
    repo: string;
  };
}

// API functions
const fetchEipsList = async (params: EipListParams): Promise<EipListResponse> => {
  const searchParams = new URLSearchParams({
    protocol: params.protocol,
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  });

  if (params.search) searchParams.append("search", params.search);
  if (params.status) searchParams.append("status", params.status);
  if (params.track) searchParams.append("track", params.track);

  const response = await fetch(`/api/eips/list?${searchParams}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Request failed with status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch proposals");
  }

  return data;
};

const createPR = async (params: CreatePRParams) => {
  const response = await fetch("/api/eips/create-pr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: params.filename,
      content: params.content,
      title: params.title,
      eipNumber: params.eipNumber,
      installationId: params.installationId,
      githubUser: params.githubUser,
      targetRepository: params.targetRepository,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Request failed with status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to create pull request");
  }

  return data;
};

// Query keys
export const eipKeys = {
  all: ["eips"] as const,
  lists: () => [...eipKeys.all, "list"] as const,
  list: (params: EipListParams) => [...eipKeys.lists(), params] as const,
  detail: (protocol: string, number: string) => [...eipKeys.all, "detail", protocol, number] as const,
};

// Hooks
export const useEipsList = (params: EipListParams) => {
  return useQuery({
    queryKey: eipKeys.list(params),
    queryFn: () => fetchEipsList(params),
    enabled: !!params.protocol, // Only run if protocol is provided
  });
};

export const useCreatePR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPR,
    onSuccess: (data, variables) => {
      // Invalidate and refetch EIPs list for the protocol
      queryClient.invalidateQueries({
        queryKey: eipKeys.lists(),
      });
    },
  });
};

// Export types for use in components
export type { EipItem, EipListResponse, EipListParams, CreatePRParams };
