"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dip_core_1 = require("@peeramid-labs/dip-core");
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
            onRateLimit: (retryAfter, options) => {
                console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
                if (options.request.retryCount < 3) {
                    console.log(`Retrying after ${retryAfter} seconds!`);
                    return true;
                }
            },
            onSecondaryRateLimit: (retryAfter, options) => {
                console.warn(`Secondary rate limit hit for ${options.method} ${options.url}`);
            },
        },
    });
    try {
        // --- Phase 1: Data Collection ---
        console.log("\n--- [PHASE 1/3] Starting Data Collection ---");
        await (0, dip_core_1.seedRepositoryConfigs)();
        for (const repoConfig of dip_core_1.repositories) {
            if (repoConfig.enabled) {
                await (0, dip_core_1.processRepository)(octokit, repoConfig);
            }
        }
        console.log("✅ --- [PHASE 1/3] Data Collection Complete ---");
        // --- Phase 2: Data Resolution ---
        console.log("\n--- [PHASE 2/3] Starting Data Resolution ---");
        await (0, dip_core_1.resolveMovedProposals)();
        console.log("✅ --- [PHASE 2/3] Data Resolution Complete ---");
        // --- Phase 3: Snapshot Update ---
        console.log("\n--- [PHASE 3/3] Starting Snapshot Update ---");
        await (0, dip_core_1.updateLatestSnapshots)();
        console.log("✅ --- [PHASE 3/3] Snapshot Update Complete ---");
        console.log("\n🎉 Full data regeneration job finished successfully.");
        if (process.env.NODE_ENV !== "test") {
            process.exit(0);
        }
    }
    catch (error) {
        console.error(`\n❌ FATAL: A critical error occurred during the job: ${error.message}`, error);
        if (process.env.NODE_ENV !== "test") {
            process.exit(1);
        }
    }
}
// This allows the script to be run directly from the command line
if (require.main === module) {
    main();
}
