"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dip_database_1 = require("@peeramid-labs/dip-database");
const prisma = new dip_database_1.PrismaClient();
/**
 * Inspects the quality of data in the Proposal table.
 *
 * This script connects to the database and performs a basic data quality check
 * on all entries in the `Proposal` table. It counts how many proposals have
 * missing or default "Unknown" values for key metadata fields.
 *
 * The results are printed to the console to help identify systemic issues
 * with the data crawling and parsing process.
 */
async function inspectProposals() {
    console.log("Starting proposal data quality inspection...");
    try {
        const proposals = await prisma.proposal.findMany();
        const totalProposals = proposals.length;
        if (totalProposals === 0) {
            console.log("No proposals found in the database. Exiting.");
            return;
        }
        console.log(`Found ${totalProposals} proposals to inspect.`);
        const invalidProposals = [];
        for (const proposal of proposals) {
            const issues = [];
            if (!proposal.status || proposal.status === "Unknown") {
                issues.push("Missing 'status'");
            }
            if (!proposal.type || proposal.type === "Unknown") {
                issues.push("Missing 'type'");
            }
            if (proposal.category === null) {
                issues.push("Missing 'category'");
            }
            if (proposal.created === null) {
                issues.push("Missing 'created' date");
            }
            if (proposal.discussionsTo === null || proposal.discussionsTo === "") {
                issues.push("Missing 'discussionsTo'");
            }
            if (issues.length > 0) {
                invalidProposals.push({ path: proposal.githubPath, issues });
            }
        }
        console.log("\n--- Detailed Data Quality Issues ---");
        if (invalidProposals.length === 0) {
            console.log("✅ All proposals have complete metadata!");
        }
        else {
            console.log(`Found ${invalidProposals.length} proposals with incomplete metadata:\n`);
            for (const item of invalidProposals) {
                console.log(`File: ${item.path}`);
                for (const issue of item.issues) {
                    console.log(`  - ${issue}`);
                }
                console.log(""); // Add a blank line for readability
            }
        }
        console.log("--- End of Report ---\n");
    }
    catch (error) {
        console.error(`FATAL: A critical error occurred during the inspection: ${error.message}`, error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
// This allows the script to be run directly from the command line
if (require.main === module) {
    inspectProposals();
}
