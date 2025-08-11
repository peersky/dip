"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dip/crawler/src/merge-duplicate-authors-v5.ts
const dip_database_1 = require("@peeramid-labs/dip-database");
const readline_1 = __importDefault(require("readline"));
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
// --- Step 2: Disjoint Set (Union-Find) data structure for grouping ---
class DisjointSet {
    constructor(ids) {
        this.parent = new Map();
        ids.forEach(id => this.parent.set(id, id));
    }
    find(id) {
        if (this.parent.get(id) === id) {
            return id;
        }
        // Path compression for efficiency
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
// --- Main Script ---
async function main() {
    console.log("Starting v5 author deduplication process...");
    // 1. Fetch all authors
    const allAuthors = await prisma.author.findMany();
    if (allAuthors.length === 0) {
        console.log("No authors found. Exiting.");
        return;
    }
    console.log(`Found ${allAuthors.length} total author records to analyze.`);
    // 2. Build groups using Disjoint Set for transitive merging
    const disjointSet = new DisjointSet(allAuthors.map(a => a.id));
    const buildGroups = (keyExtractor) => {
        const map = new Map();
        for (const author of allAuthors) {
            const key = keyExtractor(author);
            if (key) {
                if (!map.has(key))
                    map.set(key, []);
                map.get(key).push(author.id);
            }
        }
        for (const group of map.values()) {
            if (group.length > 1) {
                for (let i = 1; i < group.length; i++) {
                    disjointSet.union(group[0], group[i]);
                }
            }
        }
    };
    buildGroups(a => a.githubHandle ? a.githubHandle.toLowerCase() : null);
    buildGroups(a => a.email ? a.email.toLowerCase() : null);
    buildGroups(a => a.name ? normalizeName(a.name) : null);
    // 3. Consolidate final groups based on the disjoint set roots
    const finalGroups = new Map();
    for (const author of allAuthors) {
        const rootId = disjointSet.find(author.id);
        if (!finalGroups.has(rootId))
            finalGroups.set(rootId, []);
        finalGroups.get(rootId).push(author);
    }
    const duplicateGroups = Array.from(finalGroups.values()).filter(g => g.length > 1);
    if (duplicateGroups.length === 0) {
        console.log("✅ No duplicate authors found. Database is clean!");
        return;
    }
    // 4. Perform Dry Run
    console.log("\n--- DRY RUN ---");
    console.log(`Found ${duplicateGroups.length} groups of authors that can be merged.`);
    duplicateGroups.forEach(group => {
        group.sort((a, b) => scoreAuthor(b) - scoreAuthor(a) || a.createdAt.getTime() - b.createdAt.getTime());
        const [primary, ...duplicates] = group;
        console.log(`\nGroup to merge into ${primary.name} (${primary.id}):`);
        duplicates.forEach(d => console.log(`  - ${d.name} (${d.id}) | handle: ${d.githubHandle} | email: ${d.email}`));
    });
    console.log("--- END DRY RUN ---\n");
    // 5. Prompt user to proceed
    const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question('Do you want to proceed with merging these authors? (y/n) ', resolve));
    rl.close();
    if (typeof answer !== 'string' || answer.toLowerCase() !== 'y') {
        console.log("Aborting merge process.");
        return;
    }
    // 6. Execute Merge
    console.log("\n--- EXECUTION ---");
    let totalMergedCount = 0;
    for (const group of duplicateGroups) {
        const [primaryAuthor, ...duplicates] = group;
        const duplicateIds = duplicates.map(d => d.id);
        console.log(`\nMerging into ${primaryAuthor.name} (${primaryAuthor.id})...`);
        try {
            await prisma.$transaction(async (tx) => {
                // Step 6a: Enrich primary author, checking for conflicts first
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
                    if (dataToUpdate.email) {
                        const conflict = await tx.author.count({ where: { email: dataToUpdate.email, id: { not: primaryAuthor.id } } });
                        if (conflict > 0)
                            delete dataToUpdate.email;
                    }
                    if (dataToUpdate.githubHandle) {
                        const conflict = await tx.author.count({ where: { githubHandle: dataToUpdate.githubHandle, id: { not: primaryAuthor.id } } });
                        if (conflict > 0)
                            delete dataToUpdate.githubHandle;
                    }
                    if (Object.keys(dataToUpdate).length > 0) {
                        await tx.author.update({ where: { id: primaryAuthor.id }, data: dataToUpdate });
                        console.log(`  - Enriched primary author.`);
                    }
                }
                // Step 6b: Re-link relations for each duplicate, one by one
                for (const duplicate of duplicates) {
                    // AuthorsOnProposalVersions
                    const avRelations = await tx.authorsOnProposalVersions.findMany({ where: { authorId: duplicate.id } });
                    for (const relation of avRelations) {
                        const conflict = await tx.authorsOnProposalVersions.count({ where: { proposalVersionId: relation.proposalVersionId, authorId: primaryAuthor.id } });
                        if (conflict > 0) {
                            await tx.authorsOnProposalVersions.delete({ where: { proposalVersionId_authorId: { proposalVersionId: relation.proposalVersionId, authorId: duplicate.id } } });
                        }
                        else {
                            await tx.authorsOnProposalVersions.update({ where: { proposalVersionId_authorId: { proposalVersionId: relation.proposalVersionId, authorId: duplicate.id } }, data: { authorId: primaryAuthor.id } });
                        }
                    }
                    // Maintainers
                    const mRelations = await tx.maintainer.findMany({ where: { authorId: duplicate.id } });
                    for (const relation of mRelations) {
                        const conflict = await tx.maintainer.count({ where: { authorId: primaryAuthor.id, repositoryOwner: relation.repositoryOwner, repositoryRepo: relation.repositoryRepo, repositoryProtocol: relation.repositoryProtocol } });
                        if (conflict > 0) {
                            await tx.maintainer.delete({ where: { authorId_repositoryOwner_repositoryRepo_repositoryProtocol: { authorId: duplicate.id, repositoryOwner: relation.repositoryOwner, repositoryRepo: relation.repositoryRepo, repositoryProtocol: relation.repositoryProtocol } } });
                        }
                        else {
                            await tx.maintainer.update({ where: { authorId_repositoryOwner_repositoryRepo_repositoryProtocol: { authorId: duplicate.id, repositoryOwner: relation.repositoryOwner, repositoryRepo: relation.repositoryRepo, repositoryProtocol: relation.repositoryProtocol } }, data: { authorId: primaryAuthor.id } });
                        }
                    }
                }
                // Step 6c: Delete duplicates
                await tx.author.deleteMany({ where: { id: { in: duplicateIds } } });
                console.log(`  - Successfully merged and deleted ${duplicates.length} records.`);
                totalMergedCount += duplicates.length;
            }, { timeout: 180000 }); // 3 minute timeout for very large transactions
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
    console.error("A fatal error occurred during the v5 author cleanup job:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
