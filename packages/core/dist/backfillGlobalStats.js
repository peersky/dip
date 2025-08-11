"use strict";
/**
 * This is a one-time use script to backfill the `GlobalStatsSnapshot` table.
 * It reads the entire history from the `ProtocolStatsSnapshot` table, aggregates
 * the data for each month, and populates the summary table.
 *
 * To run this script, execute the following command from the root of the monorepo:
 * `node packages/core/dist/backfillGlobalStats.js`
 *
 * Make sure you have run the database migration to create the
 * `GlobalStatsSnapshot` table before running this script.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
/**
 * Aggregates all individual protocol snapshots for a given month into a single
 * global snapshot record.
 * @param {Date} dateForMonth A date within the month to aggregate (the script will use its year and month).
 */
async function aggregateAndStoreForMonth(dateForMonth) {
    const year = dateForMonth.getUTCFullYear();
    const month = dateForMonth.getUTCMonth() + 1; // getUTCMonth() is 0-indexed.
    console.log(`-> Aggregating global statistics for ${year}-${month}`);
    const monthlySnapshots = await prisma.protocolStatsSnapshot.findMany({
        where: {
            year: year,
            month: month,
        },
    });
    if (monthlySnapshots.length === 0) {
        console.log(`   No protocol snapshots found for ${year}-${month} to aggregate.`);
        return;
    }
    const globalStats = monthlySnapshots.reduce((acc, snapshot) => {
        acc.totalProposals += snapshot.totalProposals;
        acc.distinctAuthorsCount += snapshot.distinctAuthorsCount;
        acc.authorsOnFinalizedCount += snapshot.authorsOnFinalizedCount;
        return acc;
    }, {
        totalProposals: 0,
        distinctAuthorsCount: 0,
        authorsOnFinalizedCount: 0,
    });
    const acceptanceRate = globalStats.distinctAuthorsCount > 0
        ? globalStats.authorsOnFinalizedCount / globalStats.distinctAuthorsCount
        : 0;
    const centralizationRate = 1 - acceptanceRate;
    // Use the last day of the month for the snapshotDate for consistency.
    const snapshotDate = new Date(Date.UTC(year, month, 0));
    const globalSnapshotData = {
        snapshotDate: snapshotDate,
        year: year,
        month: month,
        totalProposals: globalStats.totalProposals,
        distinctAuthorsCount: globalStats.distinctAuthorsCount,
        authorsOnFinalizedCount: globalStats.authorsOnFinalizedCount,
        acceptanceRate: acceptanceRate,
        centralizationRate: centralizationRate,
    };
    await prisma.globalStatsSnapshot.upsert({
        where: {
            year_month: {
                year: year,
                month: month,
            },
        },
        update: globalSnapshotData,
        create: globalSnapshotData,
    });
    console.log(`   Successfully stored global statistics snapshot for ${year}-${month}.`);
}
/**
 * Main function to drive the backfilling process.
 */
async function backfillGlobalStats() {
    console.log("Starting backfill process for GlobalStatsSnapshot...");
    const firstSnapshot = await prisma.protocolStatsSnapshot.findFirst({
        orderBy: { snapshotDate: 'asc' },
    });
    const lastSnapshot = await prisma.protocolStatsSnapshot.findFirst({
        orderBy: { snapshotDate: 'desc' },
    });
    if (!firstSnapshot || !lastSnapshot) {
        console.log("No protocol snapshots found in the database. Exiting backfill script.");
        return;
    }
    console.log(`Found data ranging from ${firstSnapshot.snapshotDate.toISOString()} to ${lastSnapshot.snapshotDate.toISOString()}`);
    let currentDate = new Date(Date.UTC(firstSnapshot.snapshotDate.getUTCFullYear(), firstSnapshot.snapshotDate.getUTCMonth(), 1));
    const lastDate = new Date(Date.UTC(lastSnapshot.snapshotDate.getUTCFullYear(), lastSnapshot.snapshotDate.getUTCMonth(), 1));
    while (currentDate <= lastDate) {
        await aggregateAndStoreForMonth(currentDate);
        // Move to the first day of the next month
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }
    console.log("Backfill process completed successfully!");
}
// Execute the script and handle errors.
backfillGlobalStats()
    .catch((e) => {
    console.error("An error occurred during the backfill process:");
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
