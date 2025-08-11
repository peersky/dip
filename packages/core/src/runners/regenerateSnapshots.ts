/**
 * This is a dedicated runner script for the historical snapshot regeneration process.
 *
 * Its sole purpose is to import and execute the `regenerateAllHistoricalSnapshots`
 * function from the main `processing.ts` engine. This keeps the core logic
 * centralized while providing a clean, easy-to-use entry point for this
 * specific maintenance task.
 *
 * To run this script, use the corresponding command in package.json:
 * `pnpm run db:regenerate-history`
 */

import { regenerateAllHistoricalSnapshots } from "../processing";
import { prisma } from "@peeramid-labs/dip-database";

// Execute the main function and handle the process lifecycle.
regenerateAllHistoricalSnapshots()
  .catch((e: any) => {
    console.error(
      "A critical error occurred during the historical regeneration process:",
    );
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure the Prisma client is always disconnected.
    await prisma.$disconnect();
  });
