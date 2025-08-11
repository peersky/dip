"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// dip/crawler/src/merge-erc-histories.ts
const dip_database_1 = require("@peeramid-labs/dip-database");
const prisma = new dip_database_1.PrismaClient();
/**
 * Merges the historical data of EIPs that were migrated to the ERCs repository.
 *
 * The ERCs repository is a fork of the EIPs repository, meaning the commit
 * history is continuous. This script stitches the two proposal histories
 * together at the database level to create a single, uninterrupted timeline
 * for each migrated proposal.
 *
 * The logic is as follows:
 * 1. Find all proposals that exist in both the 'ethereum' (EIPs) and 'erc' (ERCs) protocols.
 * 2. For each matched pair, designate the ERC record as the canonical "primary" record.
 * 3. In a transaction, re-link all `ProposalVersion` records from the old EIP record
 *    to the new canonical ERC record.
 * 4. Delete the now-empty, redundant EIP `Proposal` record.
 */
async function main() {
    console.log("Starting EIP -> ERC history merge process...");
    try {
        // 1. Fetch all proposals from both protocols
        const eips = await prisma.proposal.findMany({
            where: { repositoryProtocol: "ethereum" },
        });
        const ercs = await prisma.proposal.findMany({
            where: { repositoryProtocol: "erc" },
        });
        const eipsByNumber = new Map(eips.map((p) => [p.proposalNumber, p]));
        let mergedCount = 0;
        console.log(`Found ${eips.length} EIPs and ${ercs.length} ERCs to analyze.`);
        // 2. Iterate through ERCs to find matches in the EIPs list
        for (const primaryErc of ercs) {
            if (eipsByNumber.has(primaryErc.proposalNumber)) {
                const redundantEip = eipsByNumber.get(primaryErc.proposalNumber);
                console.log(`\nMerging history for EIP/ERC-${primaryErc.proposalNumber}...`);
                console.log(`  - Canonical ERC record ID: ${primaryErc.id}`);
                console.log(`  - Redundant EIP record ID: ${redundantEip.id}`);
                try {
                    // 3. Perform the merge within a transaction for safety
                    await prisma.$transaction(async (tx) => {
                        // 3a. Re-link all ProposalVersions from the old EIP to the new ERC
                        const { count } = await tx.proposalVersion.updateMany({
                            where: { proposalId: redundantEip.id },
                            data: { proposalId: primaryErc.id },
                        });
                        console.log(`  - Re-linked ${count} historical versions.`);
                        // 3b. Delete the now-empty, redundant EIP Proposal record
                        await tx.proposal.delete({
                            where: { id: redundantEip.id },
                        });
                        console.log(`  - Deleted redundant EIP record.`);
                    });
                    mergedCount++;
                }
                catch (error) {
                    console.error(`❌ FAILED to merge history for EIP/ERC-${primaryErc.proposalNumber}. Transaction rolled back.`, error);
                }
            }
        }
        console.log("\n--- EIP/ERC History Merge Complete ---");
        console.log(`Successfully merged the histories for ${mergedCount} proposals.`);
        console.log("--------------------------------------");
    }
    catch (error) {
        console.error("A fatal error occurred during the merge process:", error);
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
