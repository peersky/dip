"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// dip/crawler/src/reset-crawl-status.ts
const dip_database_1 = require("@peeramid-labs/dip-database");
const prisma = new dip_database_1.PrismaClient();
/**
 * Resets the crawl status for all repositories in the database.
 *
 * This script sets the `lastCrawledCommitSha` field to `null` for every
 * repository. This will cause the main `ip-crawler` script to perform a
 * full re-crawl of all commit histories from the beginning, effectively
 * re-ingesting all proposal data.
 *
 * This is useful after making significant changes to the parsing or
 * data processing logic to ensure all data is consistent with the new rules.
 */
async function main() {
    console.log("Starting to reset crawl status for all repositories...");
    try {
        const result = await prisma.repository.updateMany({
            data: {
                lastCrawledCommitSha: null,
            },
        });
        console.log(`\n--- Reset Complete ---`);
        console.log(`Successfully reset the crawl status for ${result.count} repositories.`);
        console.log("The next run of the crawler will perform a full re-ingestion of all data.");
        console.log(`----------------------`);
    }
    catch (error) {
        console.error("A fatal error occurred during the crawl status reset:", error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
// This allows the script to be run directly from the command line
if (require.main === module) {
    main();
}
