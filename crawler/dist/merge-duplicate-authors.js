"use strict";
// dip/crawler/src/merge-duplicate-authors.ts
Object.defineProperty(exports, "__esModule", { value: true });
const dip_database_1 = require("@peeramid-labs/dip-database");
const prisma = new dip_database_1.PrismaClient();
/**
 * Creates a canonical key for an author to group potential duplicates.
 * The priority is GitHub handle > email > normalized name.
 * @param author The author object.
 * @returns A canonical string identifier.
 */
const getCanonicalKey = (author) => {
    if (author.githubHandle) {
        return `handle:${author.githubHandle.toLowerCase()}`;
    }
    if (author.email) {
        return `email:${author.email.toLowerCase()}`;
    }
    // Normalize the name by making it lowercase and removing spaces/special chars
    return `name:${(author.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
};
/**
 * Scores an author record to determine which one to keep as the primary.
 * A more complete record (with handle, email, etc.) gets a higher score.
 * @param author The author object.
 * @returns A numerical score.
 */
const scoreAuthor = (author) => {
    let score = 0;
    if (author.githubHandle)
        score += 4;
    if (author.email)
        score += 2;
    if (author.name)
        score += 1;
    return score;
};
/**
 * This script finds and merges duplicate author records in the database.
 * It is designed to be run as a one-time cleanup operation.
 *
 * The logic is as follows:
 * 1. Fetch all authors from the database.
 * 2. Group authors by a "canonical key" (handle > email > normalized name).
 * 3. For each group with more than one author, identify them as duplicates.
 * 4. Within each duplicate group, select the "best" record to be the primary author.
 *    The best record is the one with the most complete information.
 * 5. Re-link all `AuthorsOnProposalVersions` and `Maintainer` records from the
 *    duplicate authors to the primary author.
 * 6. Merge any missing information from the duplicates into the primary record.
 * 7. Delete the now-redundant duplicate author records.
 *
 * This entire process is done within a transaction for each merge group to ensure
 * data integrity.
 */
async function main() {
    console.log("Starting duplicate author cleanup job...");
    // 1. Fetch all authors
    const allAuthors = await prisma.author.findMany();
    if (allAuthors.length === 0) {
        console.log("No authors found. Exiting.");
        return;
    }
    console.log(`Found ${allAuthors.length} total author records to process.`);
    // 2. Group authors by canonical key
    const authorGroups = new Map();
    for (const author of allAuthors) {
        const key = getCanonicalKey(author);
        if (!authorGroups.has(key)) {
            authorGroups.set(key, []);
        }
        authorGroups.get(key).push(author);
    }
    // 3. Identify and process duplicate groups
    const duplicateGroups = Array.from(authorGroups.values()).filter((group) => group.length > 1);
    if (duplicateGroups.length === 0) {
        console.log("✅ No duplicate authors found. Database is clean!");
        return;
    }
    console.log(`Found ${duplicateGroups.length} groups of duplicate authors. Starting merge process...`);
    let mergedCount = 0;
    for (const group of duplicateGroups) {
        // 4. Select primary author
        group.sort((a, b) => {
            const scoreDiff = scoreAuthor(b) - scoreAuthor(a);
            if (scoreDiff !== 0)
                return scoreDiff;
            // Tie-break by picking the oldest record
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
        const [primaryAuthor, ...duplicates] = group;
        const duplicateIds = duplicates.map((d) => d.id);
        console.log(`\nMerging group (Key: ${getCanonicalKey(primaryAuthor)}). Primary: ${primaryAuthor.name} (ID: ${primaryAuthor.id}). Merging ${duplicates.length} duplicates.`);
        try {
            await prisma.$transaction(async (tx) => {
                // 5. Enrich the primary author record
                const dataToUpdate = {};
                for (const duplicate of duplicates) {
                    if (!primaryAuthor.name && duplicate.name)
                        dataToUpdate.name = duplicate.name;
                    if (!primaryAuthor.email && duplicate.email)
                        dataToUpdate.email = duplicate.email;
                    if (!primaryAuthor.githubHandle && duplicate.githubHandle)
                        dataToUpdate.githubHandle = duplicate.githubHandle;
                }
                if (Object.keys(dataToUpdate).length > 0) {
                    await tx.author.update({
                        where: { id: primaryAuthor.id },
                        data: dataToUpdate,
                    });
                    console.log(`  - Enriched primary author with new data.`);
                }
                // 6. Robustly re-link proposal versions row-by-row to avoid transaction errors
                const proposalRelations = await tx.authorsOnProposalVersions.findMany({
                    where: { authorId: { in: duplicateIds } },
                });
                let updatedCount = 0;
                let deletedCount = 0;
                for (const relation of proposalRelations) {
                    const conflictExists = await tx.authorsOnProposalVersions.count({
                        where: {
                            proposalVersionId: relation.proposalVersionId,
                            authorId: primaryAuthor.id,
                        },
                    });
                    if (conflictExists > 0) {
                        // Conflict exists, so this link is redundant. Delete it.
                        await tx.authorsOnProposalVersions.delete({
                            where: {
                                proposalVersionId_authorId: {
                                    proposalVersionId: relation.proposalVersionId,
                                    authorId: relation.authorId,
                                },
                            },
                        });
                        deletedCount++;
                    }
                    else {
                        // No conflict, safe to update the link to point to the primary author.
                        await tx.authorsOnProposalVersions.update({
                            where: {
                                proposalVersionId_authorId: {
                                    proposalVersionId: relation.proposalVersionId,
                                    authorId: relation.authorId,
                                },
                            },
                            data: { authorId: primaryAuthor.id },
                        });
                        updatedCount++;
                    }
                }
                if (deletedCount > 0) {
                    console.log(`  - Deleted ${deletedCount} conflicting proposal links.`);
                }
                if (updatedCount > 0) {
                    console.log(`  - Re-linked ${updatedCount} proposal links.`);
                }
                // 7. Re-link maintainers
                // This is simpler as we assume no unique constraint conflicts on the maintainer table itself.
                await tx.maintainer.updateMany({
                    where: { authorId: { in: duplicateIds } },
                    data: { authorId: primaryAuthor.id },
                });
                // 8. Delete the now-empty duplicate authors
                await tx.author.deleteMany({
                    where: { id: { in: duplicateIds } },
                });
                console.log(`  - Successfully merged and deleted ${duplicates.length} duplicate records.`);
                mergedCount += duplicates.length;
            }, {
                timeout: 60000, // Extend timeout to 60 seconds for large transactions
            });
        }
        catch (error) {
            console.error(`❌ Failed to merge group for primary author ${primaryAuthor.id}. Transaction rolled back.`, error);
        }
    }
    console.log(`\n--- Cleanup Complete ---`);
    console.log(`Total authors merged and deleted: ${mergedCount}`);
    console.log(`------------------------`);
}
main()
    .catch((e) => {
    console.error("A fatal error occurred during the author cleanup job:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
