import { Octokit } from "@octokit/core";
import { RepositoryConfig } from "./types";
declare const MyOctokitWithPlugins: typeof Octokit & import("@octokit/core/dist-types/types").Constructor<import("@octokit/plugin-rest-endpoint-methods").Api> & import("@octokit/core/dist-types/types").Constructor<{}> & import("@octokit/core/dist-types/types").Constructor<{
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
}> & import("@octokit/core/dist-types/types").Constructor<any>;
export type OctokitClient = InstanceType<typeof MyOctokitWithPlugins>;
export declare const repositories: RepositoryConfig[];
export declare function seedRepositoryConfigs(): Promise<void>;
export declare function processRepository(octokit: OctokitClient, repoConfig: RepositoryConfig): Promise<void>;
export declare function processProposalFile(octokit: OctokitClient, repoConfig: RepositoryConfig, filePath: string, commitSha: string, commitDateStr?: string): Promise<void>;
export interface TrackBreakdownStats {
    totalProposalsInTrack: number;
    finalizedProposalsInTrack: number;
    distinctAuthorsInTrackCount: number;
    authorsOnFinalizedInTrackCount: number;
    acceptanceScoreForTrack: number;
    statusCountsInTrack: Record<string, number>;
}
export interface ProtocolStatistics {
    totalProposals: number;
    distinctAuthorsCount: number;
    authorsOnFinalizedCount: number;
    acceptanceScore: number;
    tracksBreakdown: Record<string, TrackBreakdownStats>;
    totalWordCount: number;
    averageWordCount: number;
    statusCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    yearCounts: Record<string, number>;
    lastUpdated: string;
}
export declare function calculateAndCacheStatistics(protocol: string, snapshotDate: Date): Promise<void>;
export declare function resolveMovedProposals(): Promise<void>;
export declare function regenerateAllHistoricalSnapshots(): Promise<void>;
export declare function backfillGlobalStats(): Promise<void>;
export declare function updateLatestSnapshots(): Promise<void>;
export {};
