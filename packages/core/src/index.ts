/**
 * This file serves as the public API for the @peeramid-labs/dip-core package.
 * It explicitly exports all the functions, types, and utilities that are intended
 * to be consumed by other packages in the monorepo (like the `crawler`).
 *
 * This "barrel file" pattern resolves module system ambiguities and ensures a
 * clean, stable, and well-defined interface for the package.
 */

// Export core processing functions
export {
  repositories,
  seedRepositoryConfigs,
  processRepository,
  resolveMovedProposals,
  regenerateAllHistoricalSnapshots,
  backfillGlobalStats,
  updateLatestSnapshots,
  // Note: The following are lower-level functions, but are exported for utility scripts
  calculateAndCacheStatistics,
  processProposalFile,
} from "./processing";

// Export all parsers
export * from "./parsers";

// Export shared utility functions
export * from "./utils";

// Export all shared types
export * from "./types";
