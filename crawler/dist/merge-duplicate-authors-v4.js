"use strict";
// dip/crawler/src/merge-duplicate-authors-v4.ts
Object.defineProperty(exports, "__esModule", { value: true });
const dip_database_1 = require("@peeramid-labs/dip-database");
const prisma = new dip_database_1.PrismaClient();
// --- Step 1: Helper functions for normalization and scoring ---
const transliterateMap = {
    'ł': 'l', 'ą': 'a', 'ę': 'e', 'ó': 'o', 'ś': 's', 'ż': 'z', 'ź': 'z', 'ć': 'c', 'ń': 'n',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'ö': 'o',
    'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ç': 'c', 'ñ': 'n',
};
const normalizeName = (name) => {
    if (!name)
        return "";
    return name
        .toLowerCase()
        .split('')
        .map(char => transliterateMap[char] || char)
        .join('')
        .replace(/[^a-z0-9]/g, '');
};
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
// --- Step 2: Disjoint Set (Union-Find) for transitive merging ---
class DisjointSet {
    constructor(ids) {
        this.parent = new Map();
        ids.forEach(id => this.parent.set(id, id));
    }
    find(id) {
        if (this.parent.get(id) === id) {
            return id;
        }
        const root = this.find(this.parent.get(id));
        this.parent.set(id, root);
        return root;
    }
    union(id1, id2) {
        const root1 = this.find(id1);
        const root2 = this.find(id2);
        if (root1 !== root2) {
            this.parent.set(root2, root1);
        }
    }
}
// --- Main script logic ---
async function main() {
    console.log("Starting v4 duplicate author cleanup job...");
    // 1. Fetch all authors
    const allAuthors = await prisma.author.findMany();
    if (allAuthors.length === 0) {
        console.log("No authors found. Exiting.");
        return;
    }
    console.log(`Found ${allAuthors.length} total author records to process.`);
    // 2. Create initial groupings by different keys
    const byNormalizedName = new Map();
    const byHandle = new Map();
    const byEmail = new Map();
    for (const author of allAuthors) {
        if (author.name) {
            const key = normalizeName(author.name);
            if (!byNormalizedName.has(key))
                byNormalizedName.set(key, []);
            byNormalizedName.get(key).push(author.id);
        }
        if (author.githubHandle) {
            const key = author.githubHandle.toLowerCase();
            if (!byHandle.has(key))
                byHandle.set(key, []);
            byHandle.get(key).push(author.id);
        }
        if (author.email) {
            const key = author.email.toLowerCase();
            if (!byEmail.has(key))
                byEmail.set(key, []);
            byEmail.get(key).push(author.id);
        }
    }
    // 3. Use Disjoint Set to find all transitive connections
    const authorIds = allAuthors.map(a => a.id);
    const disjointSet = new DisjointSet(authorIds);
    const allGroups = [...byNormalizedName.values(), ...byHandle.values(), ...byEmail.values()];
    for (const group of allGroups) {
        if (group.length > 1) {
            for (let i = 1; i < group.length; i++) {
                disjointSet.union(group[0], group[i]);
            }
        }
    }
    // 4. Consolidate final groups based on the disjoint set roots
    const authorsById = new Map(allAuthors.map(a => [a.id, a]));
    const finalGroups = new Map();
    for (const authorId of authorIds) {
        const rootId = disjointSet.find(authorId);
        if (!finalGroups.has(rootId))
            finalGroups.set(rootId, []);
        finalGroups.get(rootId).push(authorsById.get(authorId));
    }
    // 5. Process the final duplicate groups
    const duplicateGroups = Array.from(finalGroups.values()).filter(g => g.length > 1);
    if (duplicateGroups.length === 0) {
        console.log("✅ No duplicate authors found after v4 analysis. Database is clean!");
        return;
    }
    console.log(`Found ${duplicateGroups.length} groups of duplicate authors. Starting final merge...`);
    let totalMergedCount = 0;
    for (const group of duplicateGroups) {
        group.sort((a, b) => scoreAuthor(b) - scoreAuthor(a) || a.createdAt.getTime() - b.createdAt.getTime());
        const [primaryAuthor, ...duplicates] = group;
        const duplicateIds = duplicates.map(d => d.id);
        console.log(`\nMerging group. Primary: ${primaryAuthor.name} (ID: ${primaryAuthor.id}). Merging ${duplicates.length} duplicates.`);
        try {
            await prisma.$transaction(async (tx) => {
                // Enrich primary author
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
                    await tx.author.update({ where: { id: primaryAuthor.id }, data: dataToUpdate });
                    console.log(`  - Enriched primary author.`);
                }
                // Re-link relations row-by-row
                for (const duplicate of duplicates) {
                    const relations = await tx.authorsOnProposalVersions.findMany({ where: { authorId: duplicate.id } });
                    for (const relation of relations) {
                        const conflict = await tx.authorsOnProposalVersions.count({ where: { proposalVersionId: relation.proposalVersionId, authorId: primaryAuthor.id } });
                        if (conflict > 0) {
                            await tx.authorsOnProposalVersions.delete({ where: { proposalVersionId_authorId: { proposalVersionId: relation.proposalVersionId, authorId: duplicate.id } } });
                        }
                        else {
                            await tx.authorsOnProposalVersions.update({ where: { proposalVersionId_authorId: { proposalVersionId: relation.proposalVersionId, authorId: duplicate.id } }, data: { authorId: primaryAuthor.id } });
                        }
                    }
                }
                await tx.maintainer.updateMany({ where: { authorId: { in: duplicateIds } }, data: { authorId: primaryAuthor.id } });
                // Delete duplicates
                await tx.author.deleteMany({ where: { id: { in: duplicateIds } } });
                console.log(`  - Successfully merged and deleted ${duplicates.length} records.`);
                totalMergedCount += duplicates.length;
            }, { timeout: 120000 }); // 2 minute timeout
        }
        catch (error) {
            console.error(`❌ Failed to merge group for primary author ${primaryAuthor.id}. Transaction rolled back.`, error);
        }
    }
    console.log(`\n--- Cleanup Complete ---`);
    console.log(`Total authors merged and deleted: ${totalMergedCount}`);
    console.log(`------------------------`);
}
main()
    .catch((e) => {
    console.error("A fatal error occurred during the v4 author cleanup job:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
