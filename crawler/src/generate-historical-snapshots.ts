import { PrismaClient } from "@peeramid-labs/dip-database";
import {
  calculateAndCacheStatistics,
  repositories,
  seedRepositoryConfigs,
} from "@peeramid-labs/dip-core";

const prisma = new PrismaClient();

/**
 * Generates historical monthly snapshots for all configured protocols.
 *
 * This script is designed to be run to backfill statistical data. It does the following:
 * 1. Determines the full time span of all proposal activity by finding the very first
 *    and very last commit dates across all tracked repositories.
 * 2. It then iterates month by month from the start to the end date.
 * 3. For each month, it calculates and stores a statistical snapshot for every
 *    enabled protocol. The calculation is based on the state of all proposals
 *    as they were at the end of that specific month.
 * 4. To prevent duplicate data, it checks if a snapshot for a given protocol and
 *    month already exists before performing the calculation.
 */
async function main() {
  console.log("Starting historical snapshot generation job...");

  // Ensure repository configurations are loaded to know which protocols to process
  await seedRepositoryConfigs();

  // 1. Determine the global time range by finding the first and last commits
  const firstVersion = await prisma.proposalVersion.findFirst({
    orderBy: { commitDate: "asc" },
  });

  const lastVersion = await prisma.proposalVersion.findFirst({
    orderBy: { commitDate: "desc" },
  });

  if (!firstVersion || !lastVersion) {
    console.log(
      "No proposal versions found in the database. Cannot generate historical snapshots. Exiting.",
    );
    return;
  }

  // Start iterating from the beginning of the month of the very first commit.
  let currentDate = new Date(
    firstVersion.commitDate.getUTCFullYear(),
    firstVersion.commitDate.getUTCMonth(),
    1,
  );
  const lastCommitDate = lastVersion.commitDate;

  console.log(
    `Generating monthly snapshots from ${currentDate.toISOString()} to ${lastCommitDate.toISOString()}`,
  );

  // 2. Iterate through each month in the determined time range
  while (currentDate <= lastCommitDate) {
    // The snapshot for a given month is taken at the very last moment of that month
    // to include all activity within it.
    const snapshotDate = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() + 1, // Move to the first day of the next month
        0, // Go back to the last day of the current month
        23,
        59,
        59,
        999, // Set time to the end of the day
      ),
    );

    console.log(
      `\n--- Generating snapshots for month: ${snapshotDate.getUTCFullYear()}-${snapshotDate.getUTCMonth() + 1} ---`,
    );

    // 3. For the current month, generate a snapshot for every enabled protocol
    for (const repoConfig of repositories) {
      if (repoConfig.enabled) {
        try {
          const year = snapshotDate.getUTCFullYear();
          const month = snapshotDate.getUTCMonth() + 1; // For DB (1-12)

          // First, check if a snapshot already exists to avoid reprocessing.
          const existingSnapshot =
            await prisma.protocolStatsSnapshot.findUnique({
              where: {
                protocol_year_month: {
                  protocol: repoConfig.protocol,
                  year: year,
                  month: month,
                },
              },
            });

          if (existingSnapshot) {
            console.log(
              `SKIPPING: Snapshot for ${repoConfig.protocol} for ${year}-${month} already exists.`,
            );
            continue; // Move to the next protocol
          }

          // If no snapshot exists, calculate and store a new one.
          await calculateAndCacheStatistics(repoConfig.protocol, snapshotDate);
        } catch (error: any) {
          console.error(
            `ERROR: Failed to generate snapshot for ${
              repoConfig.protocol
            } for month ending ${snapshotDate.toISOString()}: ${error.message}`,
          );
          // Continue to the next protocol even if one fails.
        }
      }
    }

    // Advance to the first day of the next month for the next iteration.
    currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
  }

  console.log("\nHistorical snapshot generation job finished successfully.");
}

main()
  .catch((e) => {
    console.error(
      "A fatal error occurred during the snapshot generation job:",
      e,
    );
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
