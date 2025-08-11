"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositories = void 0;
exports.seedRepositoryConfigs = seedRepositoryConfigs;
exports.processRepository = processRepository;
exports.processProposalFile = processProposalFile;
exports.calculateAndCacheStatistics = calculateAndCacheStatistics;
exports.resolveMovedProposals = resolveMovedProposals;
exports.regenerateAllHistoricalSnapshots = regenerateAllHistoricalSnapshots;
exports.backfillGlobalStats = backfillGlobalStats;
exports.updateLatestSnapshots = updateLatestSnapshots;
const core_1 = require("@octokit/core");
const plugin_rest_endpoint_methods_1 = require("@octokit/plugin-rest-endpoint-methods");
const plugin_throttling_1 = require("@octokit/plugin-throttling");
const plugin_paginate_rest_1 = require("@octokit/plugin-paginate-rest");
const plugin_retry_1 = require("@octokit/plugin-retry");
const dip_database_1 = require("@peeramid-labs/dip-database");
const crypto_1 = __importDefault(require("crypto"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const path_1 = __importDefault(require("path"));
const parsers_1 = require("./parsers");
// --- Type Definition ---
// This is the correct way to define the type for the Octokit client that this library expects.
// The application (crawler) will be responsible for creating an instance of this type.
const MyOctokitWithPlugins = core_1.Octokit.plugin(plugin_rest_endpoint_methods_1.restEndpointMethods)
    .plugin(plugin_throttling_1.throttling)
    .plugin(plugin_paginate_rest_1.paginateRest)
    .plugin(plugin_retry_1.retry);
// --- Configuration ---
exports.repositories = [
    {
        owner: "ethereum",
        ecosystem: "ethereum",
        repo: "EIPs",
        branch: "master",
        eipsFolder: "EIPS",
        protocol: "ethereum",
        proposalPrefix: "EIP",
        enabled: true,
        description: "Ethereum Improvement Proposals",
        website: "https://eips.ethereum.org",
    },
    {
        owner: "ethereum",
        ecosystem: "ethereum",
        repo: "RIPs",
        branch: "master",
        eipsFolder: "RIPS",
        protocol: "rollup",
        proposalPrefix: "RIP",
        enabled: true,
        description: "Rollup Improvement Proposals",
        website: "https://rip.ethereum.org",
    },
    {
        owner: "starknet-io",
        ecosystem: "starknet",
        repo: "SNIPs",
        branch: "main",
        eipsFolder: "SNIPS",
        protocol: "starknet",
        proposalPrefix: "SNIP",
        enabled: true,
        description: "Starknet Improvement Proposals",
        website: "https://github.com/starknet-io/SNIPs",
    },
    {
        owner: "ethereum",
        ecosystem: "ethereum",
        repo: "ERCs",
        branch: "master",
        eipsFolder: "ERCS",
        protocol: "erc",
        proposalPrefix: "ERC",
        enabled: true,
        description: "Ethereum Request for Comments",
        forkedFrom: {
            owner: "ethereum",
            repo: "EIPs",
            protocol: "ethereum",
        },
        website: "https://github.com/ethereum/ercs",
    },
    {
        owner: "maticnetwork",
        ecosystem: "polygon",
        repo: "Polygon-Improvement-Proposals",
        branch: "main",
        eipsFolder: "PIPs",
        protocol: "polygon",
        proposalPrefix: "PIP",
        enabled: true,
        description: "Polygon Improvement Proposals",
        website: "https://github.com/maticnetwork/Polygon-Improvement-Proposals",
    },
];
// --- Database Seeding ---
async function seedRepositoryConfigs() {
    console.log("Seeding repository configurations...");
    for (const config of exports.repositories) {
        await dip_database_1.prisma.repository.upsert({
            where: {
                owner_repo_protocol: {
                    owner: config.owner,
                    repo: config.repo,
                    protocol: config.protocol,
                },
            },
            update: config,
            create: config,
        });
    }
    console.log("Seeding complete.");
}
// --- GitHub Data Fetching ---
async function fetchAllCommits(octokit, options) {
    return octokit.paginate("GET /repos/{owner}/{repo}/commits", options);
}
// --- Core Processing Logic ---
async function processRepository(octokit, repoConfig) {
    console.log(`Processing repository: ${repoConfig.owner}/${repoConfig.repo}`);
    const repository = await dip_database_1.prisma.repository.findUnique({
        where: {
            owner_repo_protocol: {
                owner: repoConfig.owner,
                repo: repoConfig.repo,
                protocol: repoConfig.protocol,
            },
        },
    });
    const lastCrawledCommitSha = repository?.lastCrawledCommitSha;
    console.log(`Last crawled commit SHA: ${lastCrawledCommitSha || "None"}`);
    const allCommits = await fetchAllCommits(octokit, {
        owner: repoConfig.owner,
        repo: repoConfig.repo,
        sha: repoConfig.branch,
    });
    let newCommits = allCommits;
    if (lastCrawledCommitSha) {
        const lastCrawledIndex = allCommits.findIndex((c) => c.sha === lastCrawledCommitSha);
        if (lastCrawledIndex !== -1) {
            newCommits = allCommits.slice(0, lastCrawledIndex);
        }
    }
    if (newCommits.length === 0) {
        console.log("No new commits to process.");
        return;
    }
    console.log(`Found ${newCommits.length} new commits to process.`);
    for (const commit of newCommits.reverse()) {
        await processCommit(octokit, repoConfig, commit);
    }
    if (newCommits.length > 0) {
        await dip_database_1.prisma.repository.update({
            where: {
                owner_repo_protocol: {
                    owner: repoConfig.owner,
                    repo: repoConfig.repo,
                    protocol: repoConfig.protocol,
                },
            },
            data: {
                lastCrawledCommitSha: allCommits[0].sha,
            },
        });
    }
}
async function processCommit(octokit, repoConfig, commitSummary) {
    console.log(`Processing commit: ${commitSummary.sha}`);
    const { data: commit } = await octokit.rest.repos.getCommit({
        owner: repoConfig.owner,
        repo: repoConfig.repo,
        ref: commitSummary.sha,
    });
    if (!commit.files)
        return;
    if (commit.author || commit.commit.author?.email) {
        try {
            await dip_database_1.prisma.$transaction(async (tx) => {
                let dbAuthor;
                const githubHandle = commit.author?.login;
                const email = commit.commit.author?.email;
                if (githubHandle) {
                    dbAuthor = await tx.author.findUnique({ where: { githubHandle } });
                }
                if (!dbAuthor && email) {
                    dbAuthor = await tx.author.findUnique({ where: { email } });
                }
                if (dbAuthor) {
                    const updateData = {
                        name: commit.commit.author?.name || dbAuthor.name,
                        githubHandle: githubHandle || dbAuthor.githubHandle,
                    };
                    if (email && email !== dbAuthor.email) {
                        const existingAuthorByEmail = await tx.author.findUnique({
                            where: { email },
                        });
                        if (existingAuthorByEmail && existingAuthorByEmail.id !== dbAuthor.id) {
                            console.warn(`Could not update email for author ${dbAuthor.name || dbAuthor.githubHandle} to ${email} as it's already taken.`);
                        }
                        else {
                            updateData.email = email;
                        }
                    }
                    dbAuthor = await tx.author.update({
                        where: { id: dbAuthor.id },
                        data: updateData,
                    });
                }
                else {
                    try {
                        dbAuthor = await tx.author.create({
                            data: {
                                name: commit.commit.author?.name,
                                githubHandle: githubHandle,
                                email: email,
                            },
                        });
                    }
                    catch (e) {
                        if (e.code === "P2002") {
                            console.warn(`Failed to create author (${githubHandle || email}) due to unique constraint, likely a race condition.`);
                            if (githubHandle) {
                                dbAuthor = await tx.author.findUnique({
                                    where: { githubHandle },
                                });
                            }
                            if (!dbAuthor && email) {
                                dbAuthor = await tx.author.findUnique({ where: { email } });
                            }
                        }
                        else {
                            throw e;
                        }
                    }
                }
                if (dbAuthor) {
                    await tx.maintainer.upsert({
                        where: {
                            authorId_repositoryOwner_repositoryRepo_repositoryProtocol: {
                                authorId: dbAuthor.id,
                                repositoryOwner: repoConfig.owner,
                                repositoryRepo: repoConfig.repo,
                                repositoryProtocol: repoConfig.protocol,
                            },
                        },
                        create: {
                            authorId: dbAuthor.id,
                            repositoryOwner: repoConfig.owner,
                            repositoryRepo: repoConfig.repo,
                            repositoryProtocol: repoConfig.protocol,
                        },
                        update: {},
                    });
                }
            });
        }
        catch (error) {
            console.error(`Failed to process maintainer for commit ${commit.sha}:`, error);
        }
    }
    for (const file of commit.files) {
        if (!file.filename.endsWith(".md")) {
            continue;
        }
        const isProposalFile = file.filename.startsWith(repoConfig.eipsFolder);
        const wasProposalFile = file.previous_filename?.startsWith(repoConfig.eipsFolder) ?? false;
        if (!isProposalFile && !wasProposalFile) {
            continue;
        }
        switch (file.status) {
            case "added":
            case "modified":
                await processProposalFile(octokit, repoConfig, file.filename, commit.sha, commit.commit.author?.date);
                break;
            case "renamed":
                await handleRenamedFile(octokit, repoConfig, file.previous_filename, file.filename, commit.sha, commit.commit.author?.date);
                break;
            case "removed":
                await handleRemovedFile(repoConfig, file.filename, commit.sha, commit.commit.author?.date);
                break;
            default:
                break;
        }
    }
}
async function handleRenamedFile(octokit, repoConfig, previousPath, newPath, commitSha, commitDateStr) {
    console.log(`[Renamed] File renamed from ${previousPath} to ${newPath}`);
    const oldProposalNumberMatch = previousPath.match(/(?:[a-zA-Z]*-)?(\d+)\.md$/);
    if (!oldProposalNumberMatch) {
        console.warn(`[Renamed] Could not extract proposal number from old path: ${previousPath}. Processing as new file.`);
        await processProposalFile(octokit, repoConfig, newPath, commitSha, commitDateStr);
        return;
    }
    const oldProposalNumber = oldProposalNumberMatch[1];
    const newProposalNumberMatch = newPath.match(/(?:[a-zA-Z]*-)?(\d+)\.md$/);
    if (!newProposalNumberMatch) {
        console.warn(`[Renamed] Could not extract proposal number from new path: ${newPath}. Aborting rename.`);
        return;
    }
    const newProposalNumber = newProposalNumberMatch[1];
    const proposal = await dip_database_1.prisma.proposal.findUnique({
        where: {
            repositoryOwner_repositoryRepo_repositoryProtocol_proposalNumber: {
                repositoryOwner: repoConfig.owner,
                repositoryRepo: repoConfig.repo,
                repositoryProtocol: repoConfig.protocol,
                proposalNumber: oldProposalNumber,
            },
        },
    });
    if (!proposal) {
        console.warn(`[Renamed] Could not find original proposal number: ${oldProposalNumber}. Processing as new file.`);
        await processProposalFile(octokit, repoConfig, newPath, commitSha, commitDateStr);
        return;
    }
    console.log(`[Renamed] Updating proposal ${proposal.id} path to ${newPath} and number to ${newProposalNumber}`);
    await dip_database_1.prisma.proposal.update({
        where: { id: proposal.id },
        data: {
            githubPath: newPath,
            proposalNumber: newProposalNumber,
        },
    });
    await processProposalFile(octokit, repoConfig, newPath, commitSha, commitDateStr);
}
async function handleRemovedFile(repoConfig, filePath, commitSha, commitDateStr) {
    console.log(`[Removed] File removed: ${filePath}`);
    const proposalNumberMatch = filePath.match(/(?:[a-zA-Z]*-)?(\d+)\.md$/);
    if (!proposalNumberMatch) {
        console.warn(`[Removed] Could not extract proposal number from path: ${filePath}`);
        return;
    }
    const proposalNumber = proposalNumberMatch[1];
    const proposal = await dip_database_1.prisma.proposal.findUnique({
        where: {
            repositoryOwner_repositoryRepo_repositoryProtocol_proposalNumber: {
                repositoryOwner: repoConfig.owner,
                repositoryRepo: repoConfig.repo,
                repositoryProtocol: repoConfig.protocol,
                proposalNumber,
            },
        },
    });
    if (!proposal) {
        console.warn(`[Removed] Could not find proposal for path: ${filePath}. It may have been removed in a previous step.`);
        return;
    }
    console.log(`[Removed] Marking proposal ${proposal.id} as 'Deleted'`);
    const commitDate = commitDateStr ? new Date(commitDateStr) : new Date();
    await dip_database_1.prisma.proposalVersion.create({
        data: {
            proposalId: proposal.id,
            commitSha,
            commitDate,
            rawMarkdown: `# Proposal Deleted\n\nThis proposal was removed at commit ${commitSha}.`,
            contentHash: crypto_1.default.createHash("sha256").update("deleted").digest("hex"),
            title: proposal.title,
            status: "Deleted",
            type: proposal.type,
            category: proposal.category,
            created: proposal.created,
            discussionsTo: proposal.discussionsTo,
            requires: proposal.requires,
        },
    });
    await dip_database_1.prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: "Deleted" },
    });
}
async function processProposalFile(octokit, repoConfig, filePath, commitSha, commitDateStr) {
    console.log(`Processing file: ${filePath} at commit ${commitSha}`);
    try {
        const { data: contentResponse } = await octokit.rest.repos.getContent({
            owner: repoConfig.owner,
            repo: repoConfig.repo,
            path: filePath,
            ref: commitSha,
        });
        if (!("content" in contentResponse)) {
            console.warn(`No content found for ${filePath} at ${commitSha}`);
            return;
        }
        const rawMarkdown = Buffer.from(contentResponse.content, "base64").toString("utf8");
        const { content: contentBody } = (0, gray_matter_1.default)(rawMarkdown);
        const proposalNumberMatch = filePath.match(/(?:[a-zA-Z]*-)?(\d+)\.md$/);
        if (!proposalNumberMatch)
            return;
        const proposalNumber = proposalNumberMatch[1];
        if (rawMarkdown.includes("This file was moved to") || rawMarkdown.includes("This EIP was moved to")) {
            console.log(`[Moved] Detected moved notice for: ${filePath}`);
            const movePathMatch = rawMarkdown.match(/\[.*?\]\((.*?\/\S+\.md)\)/);
            const movedToPath = movePathMatch ? movePathMatch[1] : null;
            if (movedToPath) {
                console.log(`[Moved] Extracted destination path: ${movedToPath}`);
            }
            else {
                console.warn(`[Moved] Could not extract destination path from move notice for: ${filePath}`);
            }
            const commitDate = commitDateStr ? new Date(commitDateStr) : new Date();
            const contentHash = crypto_1.default.createHash("sha256").update(contentBody).digest("hex");
            await dip_database_1.prisma.$transaction(async (tx) => {
                const proposal = await tx.proposal.findUnique({
                    where: {
                        repositoryOwner_repositoryRepo_repositoryProtocol_proposalNumber: {
                            repositoryOwner: repoConfig.owner,
                            repositoryRepo: repoConfig.repo,
                            repositoryProtocol: repoConfig.protocol,
                            proposalNumber,
                        },
                    },
                });
                if (proposal) {
                    await tx.proposal.update({
                        where: { id: proposal.id },
                        data: {
                            status: "Moved",
                            movedToPath: movedToPath,
                        },
                    });
                    await tx.proposalVersion.upsert({
                        where: {
                            proposalId_commitSha: {
                                proposalId: proposal.id,
                                commitSha,
                            },
                        },
                        create: {
                            proposalId: proposal.id,
                            commitSha,
                            commitDate,
                            rawMarkdown: contentBody,
                            contentHash,
                            title: proposal.title,
                            status: "Moved",
                            type: proposal.type,
                            category: proposal.category,
                            created: proposal.created,
                            discussionsTo: proposal.discussionsTo,
                            requires: proposal.requires,
                        },
                        update: { status: "Moved" },
                    });
                }
            });
            return;
        }
        const parser = (0, parsers_1.getParser)(repoConfig);
        const parsedData = parser.parse(rawMarkdown, `Proposal ${proposalNumber}`);
        if (!parsedData) {
            console.warn(`[Parsing Failed] Could not parse metadata for: ${filePath}`);
            return;
        }
        const { title, status, type, category, created, discussionsTo, authors, requires } = parsedData;
        const commitDate = commitDateStr ? new Date(commitDateStr) : new Date();
        const contentHash = crypto_1.default.createHash("sha256").update(contentBody).digest("hex");
        await dip_database_1.prisma.$transaction(async (tx) => {
            const proposal = await tx.proposal.upsert({
                where: {
                    repositoryOwner_repositoryRepo_repositoryProtocol_proposalNumber: {
                        repositoryOwner: repoConfig.owner,
                        repositoryRepo: repoConfig.repo,
                        repositoryProtocol: repoConfig.protocol,
                        proposalNumber,
                    },
                },
                create: {
                    repositoryOwner: repoConfig.owner,
                    repositoryRepo: repoConfig.repo,
                    repositoryProtocol: repoConfig.protocol,
                    proposalNumber,
                    githubPath: filePath,
                    title,
                    status,
                    type,
                    category,
                    created,
                    discussionsTo,
                    requires,
                },
                update: {
                    githubPath: filePath,
                    title,
                    status,
                    type,
                    category,
                    created,
                    discussionsTo,
                    requires,
                },
            });
            const proposalVersion = await tx.proposalVersion.upsert({
                where: {
                    proposalId_commitSha: {
                        proposalId: proposal.id,
                        commitSha,
                    },
                },
                create: {
                    proposalId: proposal.id,
                    commitSha,
                    commitDate,
                    rawMarkdown: contentBody,
                    contentHash,
                    title,
                    status,
                    type,
                    category,
                    created,
                    discussionsTo,
                    requires,
                },
                update: {
                    commitDate,
                    rawMarkdown: contentBody,
                    contentHash,
                    title,
                    status,
                    type,
                    category,
                    created,
                    discussionsTo,
                    requires,
                },
            });
            for (const author of authors) {
                let dbAuthor = null;
                if (author.githubHandle) {
                    dbAuthor = await tx.author.findUnique({
                        where: { githubHandle: author.githubHandle },
                    });
                }
                if (!dbAuthor && author.email) {
                    dbAuthor = await tx.author.findUnique({
                        where: { email: author.email },
                    });
                }
                if (!dbAuthor && author.name) {
                    const authorsByName = await tx.author.findMany({
                        where: { name: author.name },
                    });
                    if (authorsByName.length === 1) {
                        dbAuthor = authorsByName[0];
                    }
                }
                if (dbAuthor) {
                    const dataToUpdate = {};
                    if (author.name && !dbAuthor.name)
                        dataToUpdate.name = author.name;
                    if (author.email && !dbAuthor.email)
                        dataToUpdate.email = author.email;
                    if (author.githubHandle && !dbAuthor.githubHandle)
                        dataToUpdate.githubHandle = author.githubHandle;
                    if (Object.keys(dataToUpdate).length > 0) {
                        dbAuthor = await tx.author.update({
                            where: { id: dbAuthor.id },
                            data: dataToUpdate,
                        });
                    }
                }
                else {
                    dbAuthor = await tx.author.create({
                        data: {
                            name: author.name,
                            githubHandle: author.githubHandle,
                            email: author.email,
                        },
                    });
                }
                if (dbAuthor) {
                    await tx.authorsOnProposalVersions.upsert({
                        where: {
                            proposalVersionId_authorId: {
                                proposalVersionId: proposalVersion.id,
                                authorId: dbAuthor.id,
                            },
                        },
                        create: {
                            proposalVersionId: proposalVersion.id,
                            authorId: dbAuthor.id,
                        },
                        update: {},
                    });
                }
            }
        }, { timeout: 30000 });
    }
    catch (error) {
        console.error(`Failed to process file ${filePath} at commit ${commitSha}:`, error);
    }
}
async function calculateAndCacheStatistics(protocol, snapshotDate) {
    console.log(`Processing statistics for protocol: ${protocol} at ${snapshotDate.toISOString()}`);
    const allProposals = await dip_database_1.prisma.proposal.findMany({
        where: { repositoryProtocol: protocol },
        include: {
            versions: {
                where: { commitDate: { lte: snapshotDate } },
                orderBy: { commitDate: "desc" },
                include: {
                    authors: { include: { author: true } },
                },
            },
        },
    });
    const proposalMap = new Map(allProposals.map((p) => [p.id, p]));
    const unifiedHistories = new Map();
    function getFullVersionHistory(proposalId) {
        if (unifiedHistories.has(proposalId)) {
            return unifiedHistories.get(proposalId);
        }
        const proposal = proposalMap.get(proposalId);
        if (!proposal)
            return [];
        let allVersions = [...proposal.versions];
        const sourceProposals = allProposals.filter((p) => p.movedToId === proposalId);
        for (const source of sourceProposals) {
            allVersions.push(...getFullVersionHistory(source.id));
        }
        const sorted = allVersions.sort((a, b) => b.commitDate.getTime() - a.commitDate.getTime());
        unifiedHistories.set(proposalId, sorted);
        return sorted;
    }
    const finalDestinationProposals = allProposals.filter((p) => !p.movedToId);
    for (const proposal of finalDestinationProposals) {
        proposal.versions = getFullVersionHistory(proposal.id);
    }
    const proposalsWithVersions = finalDestinationProposals;
    const proposals = proposalsWithVersions
        .map((p) => {
        if (p.versions.length === 0) {
            return null;
        }
        const latestVersionAtTime = p.versions[0];
        let statusForCentralization = latestVersionAtTime.status;
        if (statusForCentralization === "Deleted" && p.versions.length > 1) {
            statusForCentralization = p.versions[1].status;
        }
        return {
            ...p,
            status: latestVersionAtTime.status,
            type: latestVersionAtTime.type,
            category: latestVersionAtTime.category,
            created: latestVersionAtTime.created,
            statusForCentralization,
            isDeleted: latestVersionAtTime.status === "Deleted",
        };
    })
        .filter((p) => p !== null);
    if (proposals.length === 0) {
        console.log(`No proposals found for protocol: ${protocol}`);
        return;
    }
    const stats = {
        totalProposals: 0,
        distinctAuthorsCount: 0,
        authorsOnFinalizedCount: 0,
        acceptanceScore: 0,
        tracksBreakdown: {},
        totalWordCount: 0,
        averageWordCount: 0,
        statusCounts: {},
        typeCounts: {},
        yearCounts: {},
        lastUpdated: new Date().toISOString(),
    };
    const allAuthors = new Set();
    const finalizedAuthors = new Set();
    const eligibleAuthors = new Set();
    const finalizedStatuses = ["Final", "Living"];
    const ineligibleStatuses = ["Withdrawn", "Stagnant"];
    const authorsByTrack = new Map();
    const finalizedAuthorsByTrack = new Map();
    for (const proposal of proposals) {
        const isEligible = !ineligibleStatuses.includes(proposal.status);
        const track = proposal.category || proposal.type;
        if (!authorsByTrack.has(track)) {
            authorsByTrack.set(track, new Set());
            finalizedAuthorsByTrack.set(track, new Set());
        }
        proposal.versions.forEach((version) => {
            version.authors.forEach((authorOnVersion) => {
                const authorName = authorOnVersion.author.name || authorOnVersion.author.githubHandle;
                if (authorName) {
                    allAuthors.add(authorName);
                    if (isEligible) {
                        eligibleAuthors.add(authorName);
                    }
                    authorsByTrack.get(track).add(authorName);
                    if (finalizedStatuses.includes(proposal.statusForCentralization)) {
                        finalizedAuthors.add(authorName);
                        finalizedAuthorsByTrack.get(track).add(authorName);
                    }
                }
            });
        });
        if (!proposal.isDeleted) {
            stats.totalProposals++;
            if (!stats.tracksBreakdown[track]) {
                stats.tracksBreakdown[track] = {
                    totalProposalsInTrack: 0,
                    finalizedProposalsInTrack: 0,
                    distinctAuthorsInTrackCount: 0,
                    authorsOnFinalizedInTrackCount: 0,
                    acceptanceScoreForTrack: 0,
                    statusCountsInTrack: {},
                };
            }
            stats.statusCounts[proposal.status] = (stats.statusCounts[proposal.status] || 0) + 1;
            stats.typeCounts[proposal.type] = (stats.typeCounts[proposal.type] || 0) + 1;
            if (proposal.created) {
                const year = new Date(proposal.created).getFullYear().toString();
                stats.yearCounts[year] = (stats.yearCounts[year] || 0) + 1;
            }
            if (proposal.versions.length > 0) {
                const latestVersion = proposal.versions[0];
                const wordCount = latestVersion.rawMarkdown.split(/\s+/).length;
                stats.totalWordCount += wordCount;
            }
            const trackStats = stats.tracksBreakdown[track];
            trackStats.totalProposalsInTrack++;
            trackStats.statusCountsInTrack[proposal.status] = (trackStats.statusCountsInTrack[proposal.status] || 0) + 1;
            if (finalizedStatuses.includes(proposal.status)) {
                trackStats.finalizedProposalsInTrack++;
            }
        }
    }
    for (const track in stats.tracksBreakdown) {
        stats.tracksBreakdown[track].distinctAuthorsInTrackCount = authorsByTrack.get(track)?.size || 0;
        stats.tracksBreakdown[track].authorsOnFinalizedInTrackCount = finalizedAuthorsByTrack.get(track)?.size || 0;
    }
    stats.distinctAuthorsCount = eligibleAuthors.size;
    stats.authorsOnFinalizedCount = finalizedAuthors.size;
    stats.averageWordCount = stats.totalProposals > 0 ? stats.totalWordCount / stats.totalProposals : 0;
    stats.acceptanceScore = eligibleAuthors.size > 0 ? finalizedAuthors.size / eligibleAuthors.size : 0;
    const year = snapshotDate.getUTCFullYear();
    const month = snapshotDate.getUTCMonth() + 1;
    const snapshotData = {
        protocol: protocol,
        snapshotDate: snapshotDate,
        year: year,
        month: month,
        totalProposals: stats.totalProposals,
        distinctAuthorsCount: stats.distinctAuthorsCount,
        authorsOnFinalizedCount: stats.authorsOnFinalizedCount,
        totalWordCount: stats.totalWordCount,
        averageWordCount: stats.averageWordCount,
        statusCounts: stats.statusCounts,
        typeCounts: stats.typeCounts,
        yearCounts: stats.yearCounts,
    };
    const snapshot = await dip_database_1.prisma.protocolStatsSnapshot.upsert({
        where: {
            protocol_year_month: {
                protocol: protocol,
                year: year,
                month: month,
            },
        },
        update: snapshotData,
        create: snapshotData,
    });
    for (const trackName in stats.tracksBreakdown) {
        const trackStats = stats.tracksBreakdown[trackName];
        const trackData = {
            snapshotId: snapshot.id,
            trackName: trackName,
            totalProposalsInTrack: trackStats.totalProposalsInTrack,
            finalizedProposalsInTrack: trackStats.finalizedProposalsInTrack,
            distinctAuthorsInTrackCount: trackStats.distinctAuthorsInTrackCount,
            authorsOnFinalizedInTrackCount: trackStats.authorsOnFinalizedInTrackCount,
            statusCountsInTrack: trackStats.statusCountsInTrack,
        };
        await dip_database_1.prisma.trackStatsSnapshot.upsert({
            where: {
                snapshotId_trackName: {
                    snapshotId: snapshot.id,
                    trackName: trackName,
                },
            },
            update: trackData,
            create: trackData,
        });
    }
    console.log(`Successfully processed and stored statistics snapshot for protocol: ${protocol}`);
}
async function resolveMovedProposals() {
    console.log("Starting moved proposal resolution process...");
    const allRepos = await dip_database_1.prisma.repository.findMany({
        where: { enabled: true },
    });
    const repoMapByFolder = new Map();
    for (const repo of allRepos) {
        repoMapByFolder.set(repo.eipsFolder, repo);
    }
    const proposalsToResolve = await dip_database_1.prisma.proposal.findMany({
        where: {
            status: "Moved",
            movedToPath: {
                not: null,
            },
            movedToId: null,
        },
    });
    if (proposalsToResolve.length === 0) {
        console.log("No unresolved moved proposals found. Exiting.");
        return;
    }
    console.log(`Found ${proposalsToResolve.length} proposals to resolve.`);
    let resolvedCount = 0;
    for (const sourceProposal of proposalsToResolve) {
        console.log(`\n-> Resolving move for proposal #${sourceProposal.proposalNumber} from ${sourceProposal.repositoryRepo}...`);
        console.log(`   Destination path from notice: ${sourceProposal.movedToPath}`);
        const destinationPath = sourceProposal.movedToPath;
        const destDir = path_1.default.dirname(destinationPath).split(path_1.default.sep).pop();
        const destFilename = path_1.default.basename(destinationPath);
        if (!destDir) {
            console.warn(`   [WARN] Could not determine destination folder. Skipping.`);
            continue;
        }
        const destRepoConfig = repoMapByFolder.get(destDir);
        if (!destRepoConfig) {
            console.warn(`   [WARN] No repository configuration found for folder "${destDir}". Skipping.`);
            continue;
        }
        const destProposalNumberMatch = destFilename.match(/(?:[a-zA-Z]*-)?(\d+)\.md$/);
        if (!destProposalNumberMatch) {
            console.warn(`   [WARN] Could not parse proposal number from "${destFilename}". Skipping.`);
            continue;
        }
        const destProposalNumber = destProposalNumberMatch[1];
        console.log(`   Attempting to find destination: Repo=${destRepoConfig.repo}, Number=${destProposalNumber}`);
        const destinationProposal = await dip_database_1.prisma.proposal.findUnique({
            where: {
                repositoryOwner_repositoryRepo_repositoryProtocol_proposalNumber: {
                    repositoryOwner: destRepoConfig.owner,
                    repositoryRepo: destRepoConfig.repo,
                    repositoryProtocol: destRepoConfig.protocol,
                    proposalNumber: destProposalNumber,
                },
            },
        });
        if (destinationProposal) {
            await dip_database_1.prisma.proposal.update({
                where: { id: sourceProposal.id },
                data: {
                    movedToId: destinationProposal.id,
                },
            });
            console.log(`   [SUCCESS] Successfully linked to proposal ID: ${destinationProposal.id}`);
            resolvedCount++;
        }
        else {
            console.warn(`   [WARN] Destination proposal not found in database. It may not have been processed yet. Skipping for now.`);
        }
    }
    console.log(`\nMove resolution process complete. Successfully resolved ${resolvedCount} of ${proposalsToResolve.length} proposals.`);
}
const CONCURRENCY_LIMIT = 4;
async function regenerateAllHistoricalSnapshots() {
    console.log("Starting historical snapshot regeneration process...");
    const firstVersion = await dip_database_1.prisma.proposalVersion.findFirst({
        orderBy: {
            commitDate: "asc",
        },
    });
    if (!firstVersion) {
        console.log("No proposal versions found in the database. Cannot regenerate snapshots.");
        return;
    }
    const startDate = new Date(Date.UTC(firstVersion.commitDate.getUTCFullYear(), firstVersion.commitDate.getUTCMonth(), 1));
    const endDate = new Date();
    console.log(`Found data ranging from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    const enabledRepositories = await dip_database_1.prisma.repository.findMany({
        where: { enabled: true },
        select: { protocol: true },
        distinct: ["protocol"],
    });
    const protocols = enabledRepositories.map((repo) => repo.protocol);
    console.log(`Found ${protocols.length} enabled protocols to process.`);
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const year = currentDate.getUTCFullYear();
        const month = currentDate.getUTCMonth() + 1;
        console.log(`\n--- Processing snapshots for ${year}-${month} ---`);
        for (let i = 0; i < protocols.length; i += CONCURRENCY_LIMIT) {
            const batch = protocols.slice(i, i + CONCURRENCY_LIMIT);
            console.log(`   -> Processing batch of ${batch.length} protocols: [${batch.join(", ")}]`);
            const snapshotDateForMonth = new Date(Date.UTC(year, month, 0));
            const batchPromises = batch.map((protocol) => calculateAndCacheStatistics(protocol, snapshotDateForMonth));
            await Promise.all(batchPromises);
        }
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }
    console.log("\nHistorical snapshot regeneration completed successfully!");
}
async function aggregateAndStoreForMonth(dateForMonth) {
    const year = dateForMonth.getUTCFullYear();
    const month = dateForMonth.getUTCMonth() + 1;
    console.log(`-> Aggregating global statistics for ${year}-${month}`);
    const monthlySnapshots = await dip_database_1.prisma.protocolStatsSnapshot.findMany({
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
    const acceptanceRate = globalStats.distinctAuthorsCount > 0 ? globalStats.authorsOnFinalizedCount / globalStats.distinctAuthorsCount : 0;
    const centralizationRate = 1 - acceptanceRate;
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
    await dip_database_1.prisma.globalStatsSnapshot.upsert({
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
async function backfillGlobalStats() {
    console.log("Starting backfill process for GlobalStatsSnapshot...");
    const firstSnapshot = await dip_database_1.prisma.protocolStatsSnapshot.findFirst({
        orderBy: { snapshotDate: "asc" },
    });
    const lastSnapshot = await dip_database_1.prisma.protocolStatsSnapshot.findFirst({
        orderBy: { snapshotDate: "desc" },
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
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }
    console.log("Backfill process completed successfully!");
}
async function updateLatestSnapshots() {
    console.log("Starting lightweight update for latest monthly snapshots...");
    const protocols = await dip_database_1.prisma.repository
        .findMany({
        where: { enabled: true },
        select: { protocol: true },
        distinct: ["protocol"],
    })
        .then((repos) => repos.map((repo) => repo.protocol));
    const now = new Date();
    const snapshotDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), 0);
    const year = snapshotDate.getUTCFullYear();
    const month = snapshotDate.getUTCMonth() + 1;
    console.log(`Updating snapshots for all protocols for the period ending ${snapshotDate.toISOString()} (${year}-${month})`);
    for (let i = 0; i < protocols.length; i += CONCURRENCY_LIMIT) {
        const batch = protocols.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`   -> Processing batch of ${batch.length} protocols: [${batch.join(", ")}]`);
        const batchPromises = batch.map((protocol) => calculateAndCacheStatistics(protocol, snapshotDate));
        await Promise.all(batchPromises);
    }
    console.log(`\nAggregating global snapshot for ${year}-${month}...`);
    await aggregateAndStoreForMonth(snapshotDate);
    console.log("\nLatest monthly snapshots updated successfully!");
}
