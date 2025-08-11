/**
 * This file serves as the public API for the @peeramid-labs/dip-core package.
 * It explicitly exports all the functions, types, and utilities that are intended
 * to be consumed by other packages in the monorepo (like the `crawler`).
 *
 * This "barrel file" pattern resolves module system ambiguities and ensures a
 * clean, stable, and well-defined interface for the package.
 */
export { repositories, seedRepositoryConfigs, processRepository, resolveMovedProposals, regenerateAllHistoricalSnapshots, backfillGlobalStats, updateLatestSnapshots, calculateAndCacheStatistics, processProposalFile, } from "./processing";
export * from "./parsers";
export * from "./utils";
export * from "./types";
