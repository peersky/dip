import {
  repositories,
  seedRepositoryConfigs,
  processRepository,
  RepositoryConfig,
  resolveMovedProposals,
  updateLatestSnapshots,
} from "@peeramid-labs/dip-core";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { throttling } from "@octokit/plugin-throttling";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { retry } from "@octokit/plugin-retry";

const OctokitWithPlugins = Octokit.plugin(restEndpointMethods)
  .plugin(throttling)
  .plugin(paginateRest)
  .plugin(retry);

/**
 * Main entry point for the standalone crawler and data processing service.
 * This script performs the entire data pipeline from end-to-end to ensure
 * the database is in a complete and consistent state.
 *
 * The pipeline is designed to be idempotent and can be run repeatedly.
 *
 * --- PIPELINE STAGES ---
 * 1. Data Collection: Fetches the latest commit history from all enabled
 *    GitHub repositories and updates the core proposal data.
 *
 * 2. Data Resolution: Links proposals that have been moved or renamed,
 *    ensuring historical continuity.
 *
 * 3. Snapshot Update: Calculates and saves the statistical snapshots for the
 *    single most recent month, ensuring the data is fresh. This includes
 *    both per-protocol stats and the globally aggregated summary.
 */
async function main() {
  console.log("🚀 Starting full data regeneration job...");

  const octokit = new OctokitWithPlugins({
    auth: process.env.GITHUB_PAT,
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`,
        );
        if (options.request.retryCount < 3) {
          console.log(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `Secondary rate limit hit for ${options.method} ${options.url}`,
        );
      },
    },
  });

  try {
    // --- Phase 1: Data Collection ---
    console.log("\n--- [PHASE 1/3] Starting Data Collection ---");
    await seedRepositoryConfigs();
    for (const repoConfig of repositories) {
      if (repoConfig.enabled) {
        await processRepository(octokit as any, repoConfig as RepositoryConfig);
      }
    }
    console.log("✅ --- [PHASE 1/3] Data Collection Complete ---");

    // --- Phase 2: Data Resolution ---
    console.log("\n--- [PHASE 2/3] Starting Data Resolution ---");
    await resolveMovedProposals();
    console.log("✅ --- [PHASE 2/3] Data Resolution Complete ---");

    // --- Phase 3: Snapshot Update ---
    console.log("\n--- [PHASE 3/3] Starting Snapshot Update ---");
    await updateLatestSnapshots();
    console.log("✅ --- [PHASE 3/3] Snapshot Update Complete ---");

    console.log("\n🎉 Full data regeneration job finished successfully.");
    if (process.env.NODE_ENV !== "test") {
      process.exit(0);
    }
  } catch (error: any) {
    console.error(
      `\n❌ FATAL: A critical error occurred during the job: ${error.message}`,
      error,
    );
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

// This allows the script to be run directly from the command line
if (require.main === module) {
  main();
}
