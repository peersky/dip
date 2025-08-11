"use strict";
// dip/crawler/src/merge-duplicate-authors-v2.ts
Object.defineProperty(exports, "__esModule", { value: true });
const dip_database_1 = require("@peeramid-labs/dip-database");
const prisma = new dip_database_1.PrismaClient();
const transliterateMap = {
    'ł': 'l', 'ą': 'a', 'ę': 'e', 'ó': 'o', 'ś': 's', 'ż': 'z', 'ź': 'z', 'ć': 'c', 'ń': 'n',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ç': 'c', 'ñ': 'n',
};
/**
 * Normalizes an author's name for fuzzy matching by transliterating special
 * characters, lowercasing, and removing non-alphanumeric characters.
 * @param name The author's name.
 * @returns A normalized string.
 */
const normalizeName = (name) => {
    return name
        .toLowerCase()
        .split('')
        .map(char => transliterateMap[char] || char)
        .join('')
        .replace(/[^a-z0-9]/g, '');
};
/**
 * v2: Creates a canonical key for an author using fuzzy name matching.
 * The priority is GitHub handle > email > normalized fuzzy name.
 * @param author The author object.
 * @returns A canonical string identifier.
 */
const getCanonicalKeyV2 = (author) => {
    if (author.githubHandle) {
        return `handle:${author.githubHandle.toLowerCase()}`;
    }
    if (author.email) {
        return `email:${author.email.toLowerCase()}`;
    }
    return `name:${normalizeName(author.name || "")}`;
};
/**
 * Scores an author record to determine which one to keep as the primary.
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
async function main() {
    console.log("Starting v2 duplicate author cleanup job...");
    // 1. Fetch all authors
    const allAuthors = await prisma.author.findMany();
    if (allAuthors.length === 0) {
        console.log("No authors found. Exiting.");
        return;
    }
    console.log(`Found ${allAuthors.length} total author records to process.`);
    // 2. Group authors using the v2 canonical key
    const authorGroups = new Map();
    for (const author of allAuthors) {
        const key = getCanonicalKeyV2(author);
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
        // 4. Select primary author based on score and creation date
        group.sort((a, b) => {
            const scoreDiff = scoreAuthor(b) - scoreAuthor(a);
            if (scoreDiff !== 0)
                return scoreDiff;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
        const [primaryAuthor, ...duplicates] = group;
        const duplicateIds = duplicates.map((d) => d.id);
        console.log(`\nMerging group (Key: ${getCanonicalKeyV2(primaryAuthor)}). Primary: ${primaryAuthor.name} (ID: ${primaryAuthor.id}). Merging ${duplicates.length} duplicates.`);
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
                // 6. Robustly re-link proposal versions row-by-row
                const proposalRelations = await tx.authorsOnProposalVersions.findMany({
                    where: { authorId: { in: duplicateIds } },
                });
                for (const relation of proposalRelations) {
                    const conflictExists = await tx.authorsOnProposalVersions.count({
                        where: {
                            proposalVersionId: relation.proposalVersionId,
                            authorId: primaryAuthor.id,
                        },
                    });
                    if (conflictExists > 0) {
                        await tx.authorsOnProposalVersions.delete({
                            where: {
                                proposalVersionId_authorId: {
                                    proposalVersionId: relation.proposalVersionId,
                                    authorId: relation.authorId,
                                },
                            },
                        });
                    }
                    else {
                        await tx.authorsOnProposalVersions.update({
                            where: {
                                proposalVersionId_authorId: {
                                    proposalVersionId: relation.proposalVersionId,
                                    authorId: relation.authorId,
                                },
                            },
                            data: { authorId: primaryAuthor.id },
                        });
                    }
                }
                // 7. Re-link maintainers
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
            }, { timeout: 60000 });
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
    console.error("A fatal error occurred during the v2 author cleanup job:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
