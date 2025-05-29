import { useQuery } from "@tanstack/react-query";
import { getAllProtocols, getProtocolConfig } from "@/lib/subdomain-utils";

// Matches the structure in the cron job for finalTracksBreakdown
export interface TrackBreakdownStats {
  totalProposalsInTrack: number;
  distinctAuthorsInTrackCount: number;
  authorsOnFinalizedInTrackCount: number;
  acceptanceScoreForTrack: number;
}

export interface ProtocolStatistics {
  totalProposals: number;
  distinctAuthorsCount: number;
  authorsOnFinalizedCount: number;
  acceptanceScore: number;
  // finalizedContributorsByTrack: Record<string, number>; // Replaced by tracksBreakdown
  tracksBreakdown: Record<string, TrackBreakdownStats>; // New detailed breakdown
  totalWordCount: number;
  averageWordCount: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>; // General type distribution
  yearCounts: Record<string, number>;
  lastUpdated: string;
}

interface ProtocolStatsResponse {
  success: boolean;
  protocol: string;
  statistics: ProtocolStatistics;
  lastUpdate: string | null;
  error?: string;
}

interface AllProtocolsStatsResult {
  protocolsData: Record<string, ProtocolStatistics>;
  allTracks: string[];
  protocols: Array<ReturnType<typeof getProtocolConfig>>;
}

const fetchProtocolStats = async (protocol: string): Promise<ProtocolStatsResponse> => {
  if (!protocol || protocol === "main") {
    // Don't fetch for "main" or invalid protocol names in this specific hook
    return {
      success: false,
      protocol,
      statistics: {} as ProtocolStatistics, // Return empty stats
      lastUpdate: null,
      error: "Invalid protocol for stats fetching",
    };
  }
  const response = await fetch(`/api/stats/${protocol}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Failed to fetch stats for ${protocol}`);
  }
  return response.json();
};

const fetchAllProtocolsStats = async (): Promise<AllProtocolsStatsResult> => {
  const baseProtocols = getAllProtocols();
  const tracks = new Set<string>();
  const protocolsData: Record<string, ProtocolStatistics> = {};

  // Fetch all protocol stats in parallel
  const statsPromises = baseProtocols.map(async (protocol) => {
    try {
      const response = await fetch(`/api/stats/${protocol.subdomain}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.statistics?.tracksBreakdown) {
          protocolsData[protocol.subdomain] = result.statistics;
          Object.keys(result.statistics.tracksBreakdown).forEach((track) => tracks.add(track));
        }
      }
    } catch (error) {
      console.error(`Failed to fetch stats for ${protocol.subdomain}:`, error);
    }
  });

  await Promise.all(statsPromises);

  return {
    protocolsData,
    allTracks: Array.from(tracks).sort(),
    protocols: baseProtocols,
  };
};

export const useProtocolStats = (protocol: string) => {
  return useQuery<ProtocolStatsResponse, Error>({
    // Specify Error type for the query
    queryKey: ["protocolStats", protocol],
    queryFn: () => fetchProtocolStats(protocol),
    enabled: !!protocol && protocol !== "main", // Only run if protocol is valid
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useAllProtocolsStats = () => {
  return useQuery<AllProtocolsStatsResult, Error>({
    queryKey: ["allProtocolsStats"],
    queryFn: fetchAllProtocolsStats,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Don't refetch when component remounts if data exists
  });
};
