import { NextRequest, NextResponse } from "next/server";
import { Octokit as OctokitCore } from "@octokit/core";
import { restEndpointMethods, RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { throttling } from "@octokit/plugin-throttling";
import { kv } from "@vercel/kv";
import { prisma } from "../../../lib/prisma";
import matter from "gray-matter";

// Add dynamic configuration for static export
export const dynamic = "force-dynamic";

const Octokit = OctokitCore.plugin(restEndpointMethods, throttling);

interface EipMetadata {
  number: string;
  title: string;
  description?: string;
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string;
  discussionsTo?: string;
  requires?: string[];
  content: string;
  sha: string;
  path: string;
  protocol: string;
  // Enhanced metadata
  wordCount?: number;
  sections?: string[];
  lastCommitDate?: string;
  fileSize?: number;
  authorEmails?: string[];
  authorGithubHandles?: string[];
}

interface RepositoryConfig {
  owner: string;
  repo: string;
  branch: string;
  eipsFolder: string;
  protocol: string;
  proposalPrefix: string;
  // Enhanced config
  enabled: boolean;
  description?: string;
  website?: string;
}

const repositories: RepositoryConfig[] = [
  {
    owner: "ethereum",
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
    repo: "RIPs",
    branch: "master",
    eipsFolder: "RIPS",
    protocol: "rollup",
    proposalPrefix: "RIP",
    enabled: true,
    description: "Rollup Improvement Proposals",
  },
  {
    owner: "starknet-io",
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
    owner: "arbitrum-foundation",
    repo: "AIPs",
    branch: "main",
    eipsFolder: "AIPS",
    protocol: "arbitrum",
    proposalPrefix: "AIP",
    enabled: true,
    description: "Arbitrum Improvement Proposals",
    website: "https://github.com/arbitrum-foundation/AIPs",
  },
  // Add more repositories here
  {
    owner: "ethereum",
    repo: "ERCs",
    branch: "master",
    eipsFolder: "ERCS",
    protocol: "ethereum",
    proposalPrefix: "ERC",
    enabled: true,
    description: "Ethereum Request for Comments",
  },
];

// Enhanced markdown parsing with better metadata extraction
function parseEipData(
  markdownContent: string,
  protocol: string,
  filePath: string,
  fileSize?: number
): {
  metadata: Partial<Omit<EipMetadata, "content" | "sha" | "path" | "lastModified">>;
  mainContent: string;
  parsingIssues: string[];
  enhancedData: {
    wordCount: number;
    sections: string[];
    authorEmails: string[];
    authorGithubHandles: string[];
  };
} {
  const { data: frontmatter, content: mainContent } = matter(markdownContent);
  const issues: string[] = [];

  // Log frontmatter keys for debugging
  const frontmatterKeys = Object.keys(frontmatter);
  if (frontmatterKeys.length === 0) {
    issues.push("No frontmatter found");
  }

  const getString = (key: string, defaultValue: string | undefined = undefined, isCritical = false): string | undefined => {
    // Try multiple variations of the key
    const variations = [key, key.toLowerCase(), key.toUpperCase(), key.replace(/[-_]/g, ""), key.replace(/[-_]/g, "").toLowerCase()];

    for (const variation of variations) {
      const value = frontmatter[variation];
      if (value !== undefined) {
        return String(value).trim();
      }
    }

    if (defaultValue === undefined && isCritical) {
      issues.push(`Missing critical field '${key}'. Available keys: ${frontmatterKeys.join(", ")}`);
    }
    return defaultValue;
  };

  const getDateString = (key: string, defaultValue: string | undefined = undefined, isCritical = false): string | undefined => {
    const value = getString(key);
    if (value === undefined) {
      if (defaultValue === undefined && isCritical) {
        issues.push(`Missing critical field '${key}'`);
      }
      return defaultValue;
    }
    try {
      return value ? new Date(value).toISOString() : defaultValue;
    } catch (e) {
      issues.push(`Invalid date format for field '${key}': ${value}`);
      return defaultValue;
    }
  };

  const getStringArray = (key: string): string[] => {
    const value = getString(key);
    if (value === undefined) return [];
    if (typeof value === "string")
      return value
        .split(",")
        .map((r: string) => r.trim())
        .filter(Boolean);
    // Check if the original frontmatter value is an array
    const originalValue = frontmatter[key] || frontmatter[key.toLowerCase()];
    if (Array.isArray(originalValue)) return originalValue.map(String).filter(Boolean);
    return [];
  };

  // Enhanced author parsing to extract emails and GitHub handles
  const parseAuthors = (authorString: string): { emails: string[]; githubHandles: string[] } => {
    const emails: string[] = [];
    const githubHandles: string[] = [];

    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const foundEmails = authorString.match(emailRegex);
    if (foundEmails) emails.push(...foundEmails);

    // Extract GitHub handles
    const githubRegex = /@([A-Za-z0-9_-]+)/g;
    let match;
    while ((match = githubRegex.exec(authorString)) !== null) {
      githubHandles.push(match[1]);
    }

    return { emails, githubHandles };
  };

  // Extract sections from markdown content
  const extractSections = (content: string): string[] => {
    const sections: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.startsWith("## ")) {
        const sectionName = line.replace("## ", "").trim();
        if (sectionName && !sections.includes(sectionName)) {
          sections.push(sectionName);
        }
      }
    }

    return sections;
  };

  // Calculate word count
  const calculateWordCount = (content: string): number => {
    return content.split(/\s+/).filter((word) => word.length > 0).length;
  };

  // Get author field - support both 'author' and 'authors' formats
  const authorString = getString("author") || getString("authors") || "Unknown Author";
  const { emails, githubHandles } = parseAuthors(authorString);

  // Improved type detection - handle EIP-specific frontmatter structure
  let detectedType = getString("type");
  if (!detectedType) {
    // Try alternative field names commonly used
    detectedType = getString("eip-type") || getString("eiptype") || getString("category");
  }

  // For EIPs, the 'type' field is actually the track type (Standards Track, Meta, etc.)
  // and 'category' is the sub-category (Core, ERC, etc.)
  // We want to use 'type' as the primary track identifier
  if (!detectedType && protocol === "ethereum") {
    // For ethereum protocol, check if we have the 'eip' field (which contains the number)
    const eipNumber = getString("eip");
    if (eipNumber) {
      // This is likely an EIP file, but missing type field
      detectedType = "Standards Track"; // Default for EIPs
    }
  }

  if (!detectedType) {
    issues.push(`No type field found. Available keys: ${frontmatterKeys.join(", ")}`);
    detectedType = "Unknown Type";
  }

  const metadata: Partial<Omit<EipMetadata, "content" | "sha" | "path" | "lastModified">> = {
    title: getString("title", `Proposal from ${filePath}`, true),
    description: getString("description"),
    author: authorString,
    status: getString("status", "Draft", true),
    type: detectedType,
    category: getString("category"),
    created: getDateString("created", new Date(0).toISOString(), true),
    discussionsTo: getString("discussions-to") || getString("discussions_to"),
    requires: getStringArray("requires"),
    protocol: protocol,
    fileSize: fileSize,
    authorEmails: emails,
    authorGithubHandles: githubHandles,
  };

  const enhancedData = {
    wordCount: calculateWordCount(mainContent),
    sections: extractSections(mainContent),
    authorEmails: emails,
    authorGithubHandles: githubHandles,
  };

  if (issues.length > 0) {
    console.warn(`WARN: [${filePath}] Frontmatter parsing issues: ${issues.join("; ")}. Raw frontmatter: ${JSON.stringify(frontmatter).substring(0, 300)}...`);
  }

  return { metadata, mainContent, parsingIssues: issues, enhancedData };
}

function extractProposalNumber(filename: string, proposalPrefix: string): string | null {
  // First try exact pattern: eip-123.md, erc-456.md etc.
  const exactRegex = new RegExp(`(?:${proposalPrefix.toLowerCase()})-(\\d+)\\.md$`, "i");
  const exactMatch = filename.match(exactRegex);
  if (exactMatch) return exactMatch[1];

  // Then try any number pattern in .md files: 123.md, eip123.md, erc-456-draft.md etc.
  const numberRegex = /(\d+)\.md$/i;
  const numberMatch = filename.match(numberRegex);
  if (numberMatch) return numberMatch[1];

  // Finally try any number anywhere in filename for .md files
  const anyNumberRegex = /(\d+)/;
  const anyMatch = filename.match(anyNumberRegex);
  if (anyMatch && filename.endsWith(".md")) return anyMatch[1];

  return null;
}

// Define types for Octokit tree items
interface OctokitTreeItem {
  path?: string;
  mode?: string;
  type?: "blob" | "tree" | "commit" | string;
  sha?: string | null;
  size?: number;
  url?: string;
}

// Enhanced repository fetching with better error handling and metadata
async function fetchProposalsFromRepository(config: RepositoryConfig): Promise<EipMetadata[]> {
  if (!config.enabled) {
    console.log(`INFO: Repository ${config.owner}/${config.repo} is disabled, skipping.`);
    return [];
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
        if (retryCount < 3) {
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url}`);
        return true;
      },
    },
  });

  try {
    console.log(`INFO: Fetching ${config.proposalPrefix}s from ${config.owner}/${config.repo} (${config.description})`);
    console.log(`INFO: Repository details - Branch: ${config.branch}, Folder: ${config.eipsFolder}`);

    // Get repository information
    const { data: repoInfo } = await octokit.rest.repos.get({
      owner: config.owner,
      repo: config.repo,
    });
    console.log(`INFO: Repository ${config.owner}/${config.repo} - Stars: ${repoInfo.stargazers_count}, Last push: ${repoInfo.pushed_at}`);

    const { data: branchData } = await octokit.rest.repos.getBranch({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
    });
    const rootTreeSha = branchData.commit.commit.tree.sha;
    const lastCommitDate = branchData.commit.commit.committer?.date;

    const { data: rootTree } = await octokit.rest.git.getTree({
      owner: config.owner,
      repo: config.repo,
      tree_sha: rootTreeSha,
    });

    const eipsFolderEntry = rootTree.tree.find((item: OctokitTreeItem) => item.path === config.eipsFolder && item.type === "tree");
    if (!eipsFolderEntry || !eipsFolderEntry.sha) {
      console.error(`ERROR: Could not find folder SHA for ${config.eipsFolder} in ${config.owner}/${config.repo}`);
      return [];
    }
    const eipsFolderTreeSha = eipsFolderEntry.sha;

    const { data: eipsFolderTree } = await octokit.rest.git.getTree({
      owner: config.owner,
      repo: config.repo,
      tree_sha: eipsFolderTreeSha,
      recursive: "1",
    });

    if (!eipsFolderTree.tree) {
      console.error(`ERROR: No tree found for ${config.owner}/${config.repo}/${config.eipsFolder}`);
      return [];
    }

    const proposalFileEntries = eipsFolderTree.tree.filter((item: OctokitTreeItem) => item.type === "blob" && item.path && item.path.endsWith(".md") && !item.path.includes("README") && !item.path.includes("template") && !item.path.includes("TEMPLATE"));

    console.log(`INFO: Found ${proposalFileEntries.length} potential ${config.proposalPrefix} files in ${config.owner}/${config.repo}/${config.eipsFolder}`);

    const proposals: EipMetadata[] = [];
    const batchSize = 5;
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < proposalFileEntries.length; i += batchSize) {
      const batch = proposalFileEntries.slice(i, i + batchSize);
      console.log(`INFO: Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(proposalFileEntries.length / batchSize)} (${batch.length} files)`);

      const batchPromises = batch.map(async (entry: OctokitTreeItem) => {
        if (!entry.path || !entry.sha) return null;
        const fullPath = `${config.eipsFolder}/${entry.path}`;

        try {
          const { data: fileDataUncasted } = await octokit.rest.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: fullPath,
          });

          const fileData = fileDataUncasted as RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"];
          if (Array.isArray(fileData) || !("content" in fileData) || !fileData.content) {
            console.warn(`WARN: [${fullPath}] No content found or unexpected format.`);
            return null;
          }

          const rawMarkdownContent = Buffer.from(fileData.content, "base64").toString("utf-8");
          const { metadata: parsedMetadata, mainContent, parsingIssues, enhancedData } = parseEipData(rawMarkdownContent, config.protocol, fullPath, fileData.size);

          const proposalNumber = extractProposalNumber(entry.path.split("/").pop() || "", config.proposalPrefix);

          if (proposalNumber && parsedMetadata.title) {
            processedCount++;
            return {
              number: proposalNumber,
              title: parsedMetadata.title,
              description: parsedMetadata.description,
              author: parsedMetadata.author || "Unknown Author",
              status: parsedMetadata.status || "Draft",
              type: parsedMetadata.type || "Unknown Type",
              category: parsedMetadata.category,
              created: parsedMetadata.created || new Date(0).toISOString(),
              discussionsTo: parsedMetadata.discussionsTo,
              requires: parsedMetadata.requires || [],
              content: mainContent,
              sha: entry.sha,
              path: fullPath,
              protocol: config.protocol,
              lastModified: new Date().toISOString(),
              lastCommitDate: lastCommitDate,
              wordCount: enhancedData.wordCount,
              sections: enhancedData.sections,
              fileSize: fileData.size,
              authorEmails: enhancedData.authorEmails,
              authorGithubHandles: enhancedData.authorGithubHandles,
            } as EipMetadata;
          } else {
            console.warn(`WARN: [${fullPath}] Skipped due to missing EIP number or title. Number: ${proposalNumber}, Title: ${parsedMetadata.title}. Issues: ${parsingIssues.join(", ")}`);
          }
        } catch (error: any) {
          errorCount++;
          console.error(`ERROR: [${fullPath}] Processing file from ${config.owner}/${config.repo}: ${error.message}`);
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      proposals.push(...(batchResults.filter(Boolean) as EipMetadata[]));

      // Add small delay between batches to be respectful to GitHub API
      if (i + batchSize < proposalFileEntries.length) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    console.log(`INFO: Successfully processed ${processedCount} ${config.proposalPrefix}s from ${config.owner}/${config.repo} (${errorCount} errors)`);
    return proposals;
  } catch (error: any) {
    console.error(`ERROR: Fetching ${config.proposalPrefix}s from ${config.owner}/${config.repo}: ${error.message}`);
    if (error.status === 404) {
      console.error(`ERROR: Repository or branch not found for ${config.owner}/${config.repo}, branch ${config.branch}. Please check config.`);
    } else if (error.status === 403) {
      console.error(`ERROR: Rate limited or forbidden access to ${config.owner}/${config.repo}. Check GitHub token permissions.`);
    }
    return [];
  }
}

// Enhanced caching with better metadata organization
async function cacheProposalsData(protocol: string, proposals: EipMetadata[]): Promise<void> {
  if (proposals.length === 0) {
    console.log(`INFO: No proposals to cache for ${protocol}.`);
    return;
  }

  console.log(`INFO: Caching ${proposals.length} proposals for protocol: ${protocol}`);
  const pipeline = kv.pipeline();
  const listMetadata = [];
  const allStatuses = new Set<string>();
  const allTypes = new Set<string>();
  const allCategories = new Set<string>();
  const allAuthors = new Set<string>();
  const allSections = new Set<string>();

  const finalizedStatuses = ["Final", "Living"];
  const authorsOnFinalizedProposals = new Set<string>();
  const finalizedContributorsByTrack: Record<string, Set<string>> = {};

  let totalWordCount = 0;
  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};

  // For detailed track breakdown
  const tracksBreakdownData: Record<
    string,
    {
      totalProposalsInTrack: number;
      allAuthorsInTrack: Set<string>;
      authorsOnFinalizedInTrack: Set<string>;
    }
  > = {};

  for (const proposal of proposals) {
    // Cache individual proposal
    pipeline.set(`eip:${protocol}:${proposal.number}`, proposal);

    // Prepare list metadata (excluding large content)
    const { content, ...listItem } = proposal;
    listMetadata.push(listItem);

    // Collect filter options & basic author counting
    if (proposal.status) {
      allStatuses.add(proposal.status);
      statusCounts[proposal.status] = (statusCounts[proposal.status] || 0) + 1;
    }
    if (proposal.type) {
      allTypes.add(proposal.type);
      typeCounts[proposal.type] = (typeCounts[proposal.type] || 0) + 1;
    }
    if (proposal.category) allCategories.add(proposal.category);

    const authors = (proposal.author || "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    authors.forEach((auth) => allAuthors.add(auth));

    if (proposal.sections) {
      proposal.sections.forEach((section) => allSections.add(section));
    }

    if (proposal.wordCount) totalWordCount += proposal.wordCount;
    if (proposal.created) {
      const year = new Date(proposal.created).getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }

    const isFinalized = finalizedStatuses.includes(proposal.status);
    if (isFinalized) {
      authors.forEach((auth) => authorsOnFinalizedProposals.add(auth));

      let proposalTrack = proposal.type;
      if (!proposalTrack && proposal.category) {
        proposalTrack = proposal.category;
      } else if (proposalTrack && proposal.category && proposal.type !== proposal.category) {
        // If both exist and are different, perhaps we should decide on a primary one or handle combined.
        // For now, prioritizing .type if it exists.
        // This could be refined if specific protocols have distinct uses for type vs category for finalized stats.
      }

      if (proposalTrack) {
        if (!finalizedContributorsByTrack[proposalTrack]) {
          finalizedContributorsByTrack[proposalTrack] = new Set<string>();
        }
        authors.forEach((auth) => finalizedContributorsByTrack[proposalTrack].add(auth));
      }
    }

    // Logic to determine the primary track for the proposal
    let proposalTrack = proposal.type; // Prioritize type
    if (!proposalTrack && proposal.category) {
      proposalTrack = proposal.category; // Fallback to category
    } else if (proposalTrack && proposal.category && proposal.type !== proposal.category) {
      // If both type and category exist and are different, we might concatenate or choose one.
      // For simplicity, let's assume type is primary if it exists.
      // Or, a combined key could be: proposalTrack = `${proposal.type} - ${proposal.category}`;
      // For now, just using type if present, then category.
    }

    if (proposalTrack) {
      if (!tracksBreakdownData[proposalTrack]) {
        tracksBreakdownData[proposalTrack] = {
          totalProposalsInTrack: 0,
          allAuthorsInTrack: new Set<string>(),
          authorsOnFinalizedInTrack: new Set<string>(),
        };
      }
      tracksBreakdownData[proposalTrack].totalProposalsInTrack++;
      const currentProposalAuthors = (proposal.author || "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      currentProposalAuthors.forEach((auth) => tracksBreakdownData[proposalTrack].allAuthorsInTrack.add(auth));

      if (finalizedStatuses.includes(proposal.status)) {
        currentProposalAuthors.forEach((auth) => tracksBreakdownData[proposalTrack].authorsOnFinalizedInTrack.add(auth));
      }
    }
  }

  // Cache list metadata
  pipeline.set(`eips-list:${protocol}`, listMetadata);

  // Cache filter options with enhanced metadata
  const filterOptions = {
    statuses: Array.from(allStatuses).sort(),
    types: Array.from(allTypes).sort(),
    categories: Array.from(allCategories).filter(Boolean).sort(),
    authors: Array.from(allAuthors).sort().slice(0, 100),
    sections: Array.from(allSections).sort(),
  };
  pipeline.set(`eips-filters:${protocol}`, filterOptions);

  const distinctAuthorsCount = allAuthors.size;
  const authorsOnFinalizedCount = authorsOnFinalizedProposals.size;
  const acceptanceScore = distinctAuthorsCount > 0 ? authorsOnFinalizedCount / distinctAuthorsCount : 0;

  const finalizedContributorsByTrackCounts: Record<string, number> = {};
  for (const track in finalizedContributorsByTrack) {
    finalizedContributorsByTrackCounts[track] = finalizedContributorsByTrack[track].size;
  }

  // Convert sets to counts and calculate acceptance scores for tracksBreakdown
  const finalTracksBreakdown: Record<
    string,
    {
      totalProposalsInTrack: number;
      distinctAuthorsInTrackCount: number;
      authorsOnFinalizedInTrackCount: number;
      acceptanceScoreForTrack: number;
    }
  > = {};

  for (const trackName in tracksBreakdownData) {
    const trackData = tracksBreakdownData[trackName];
    const distinctAuthorsInTrack = trackData.allAuthorsInTrack.size;
    const authorsOnFinalized = trackData.authorsOnFinalizedInTrack.size;
    finalTracksBreakdown[trackName] = {
      totalProposalsInTrack: trackData.totalProposalsInTrack,
      distinctAuthorsInTrackCount: distinctAuthorsInTrack,
      authorsOnFinalizedInTrackCount: authorsOnFinalized,
      acceptanceScoreForTrack: distinctAuthorsInTrack > 0 ? parseFloat((authorsOnFinalized / distinctAuthorsInTrack).toFixed(2)) : 0,
    };
  }

  const statistics = {
    totalProposals: proposals.length,
    distinctAuthorsCount: allAuthors.size, // Overall distinct authors
    authorsOnFinalizedCount: authorsOnFinalizedProposals.size, // Overall authors on any finalized proposal
    acceptanceScore: parseFloat(acceptanceScore.toFixed(2)), // Overall acceptance score
    finalizedContributorsByTrack: finalizedContributorsByTrackCounts, // Counts of authors on finalized proposals by track (from previous step, can be reviewed if redundant)
    tracksBreakdown: finalTracksBreakdown, // New detailed breakdown
    totalWordCount,
    averageWordCount: proposals.length > 0 ? Math.round(totalWordCount / proposals.length) : 0,
    statusCounts,
    typeCounts,
    yearCounts,
    lastUpdated: new Date().toISOString(),
  };
  pipeline.set(`eips-stats:${protocol}`, statistics);

  // Cache update timestamp
  pipeline.set(`eips-last-update:${protocol}`, new Date().toISOString());

  try {
    await pipeline.exec();
    console.log(`INFO: Successfully cached ${proposals.length} proposals, filters, and statistics for ${protocol} in Vercel KV.`);
  } catch (error: any) {
    console.error(`ERROR: Caching proposals for ${protocol} in Vercel KV: ${error.message}`);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase") || "all"; // 'collect', 'process', or 'all'

  console.log(`CRON JOB: Starting EIP data pipeline (phase: ${phase})...`);

  try {
    if (phase === "collect" || phase === "all") {
      console.log("=== PHASE 1: COLLECTING RAW DATA ===");

      // Seed repository configurations
      await seedRepositoryConfigs();

      // Get repositories from database
      const repos = await prisma.repository.findMany({
        where: { enabled: true },
      });

      let totalCollected = 0;
      let totalErrors = 0;

      for (const repo of repos) {
        const result = await collectRawFilesToDatabase(repo.id, {
          owner: repo.owner,
          repo: repo.repo,
          branch: repo.branch,
          eipsFolder: repo.eipsFolder,
          protocol: repo.protocol,
          proposalPrefix: repo.proposalPrefix,
          enabled: repo.enabled,
          description: repo.description ?? undefined,
          website: repo.website ?? undefined,
        });

        totalCollected += result.totalFiles;
        totalErrors += result.errors;
      }

      console.log(`✓ Collection phase completed: ${totalCollected} files collected, ${totalErrors} errors`);
    }

    if (phase === "process" || phase === "all") {
      console.log("=== PHASE 2: PROCESSING DATA ===");
      await processRawFilesToCache();
      console.log("✓ Processing phase completed");
    }

    // Get summary stats
    const summary = await prisma.repository.findMany({
      include: {
        _count: {
          select: {
            rawFiles: true,
            crawlRuns: true,
          },
        },
        crawlRuns: {
          take: 1,
          orderBy: { startedAt: "desc" },
          select: {
            status: true,
            completedAt: true,
            totalProcessed: true,
            totalErrors: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      phase,
      summary: summary.map((repo) => ({
        protocol: repo.protocol,
        repository: `${repo.owner}/${repo.repo}`,
        totalFiles: repo._count.rawFiles,
        totalCrawlRuns: repo._count.crawlRuns,
        lastCrawl: repo.crawlRuns[0] || null,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("CRON JOB ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

// Database-first collection functions

// Initialize repository configurations in database
async function seedRepositoryConfigs(): Promise<void> {
  console.log("Seeding repository configurations to database...");

  for (const config of repositories) {
    try {
      await prisma.repository.upsert({
        where: {
          owner_repo_protocol: {
            owner: config.owner,
            repo: config.repo,
            protocol: config.protocol,
          },
        },
        update: {
          branch: config.branch,
          eipsFolder: config.eipsFolder,
          proposalPrefix: config.proposalPrefix,
          enabled: config.enabled,
          description: config.description,
          website: config.website,
        },
        create: {
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          eipsFolder: config.eipsFolder,
          protocol: config.protocol,
          proposalPrefix: config.proposalPrefix,
          enabled: config.enabled,
          description: config.description,
          website: config.website,
        },
      });
      console.log(`✓ Seeded repository: ${config.owner}/${config.repo} (${config.protocol})`);
    } catch (error: any) {
      console.error(`✗ Failed to seed repository ${config.owner}/${config.repo}:`, error.message);
    }
  }
}

// Collect raw markdown files and store in database
async function collectRawFilesToDatabase(repositoryId: string, config: RepositoryConfig): Promise<{ totalFiles: number; errors: number }> {
  console.log(`Collecting raw files from ${config.owner}/${config.repo}...`);

  // Create a new crawl run
  const crawlRun = await prisma.crawlRun.create({
    data: {
      repositoryId: repositoryId,
      status: "running",
    },
  });

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
        if (retryCount < 3) {
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url}`);
        return true;
      },
    },
  });

  let totalFiles = 0;
  let errors = 0;

  try {
    console.log(`INFO: Fetching files from ${config.owner}/${config.repo}/${config.eipsFolder}`);

    const { data: branchData } = await octokit.rest.repos.getBranch({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
    });
    const rootTreeSha = branchData.commit.commit.tree.sha;
    const lastCommitDate = branchData.commit.commit.committer?.date;

    const { data: rootTree } = await octokit.rest.git.getTree({
      owner: config.owner,
      repo: config.repo,
      tree_sha: rootTreeSha,
    });

    const eipsFolderEntry = rootTree.tree.find((item: OctokitTreeItem) => item.path === config.eipsFolder && item.type === "tree");
    if (!eipsFolderEntry || !eipsFolderEntry.sha) {
      throw new Error(`Could not find folder ${config.eipsFolder}`);
    }

    const { data: eipsFolderTree } = await octokit.rest.git.getTree({
      owner: config.owner,
      repo: config.repo,
      tree_sha: eipsFolderEntry.sha,
      recursive: "1",
    });

    const markdownFiles = eipsFolderTree.tree?.filter((item: OctokitTreeItem) => item.type === "blob" && item.path && item.path.endsWith(".md") && !item.path.includes("README") && !item.path.includes("template") && !item.path.includes("TEMPLATE")) || [];

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: { totalFilesFound: markdownFiles.length },
    });

    console.log(`Found ${markdownFiles.length} markdown files to process`);

    const batchSize = 5;
    for (let i = 0; i < markdownFiles.length; i += batchSize) {
      const batch = markdownFiles.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(markdownFiles.length / batchSize)}`);

      const batchPromises = batch.map(async (file: OctokitTreeItem) => {
        if (!file.path || !file.sha) return;

        const fullPath = `${config.eipsFolder}/${file.path}`;

        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: fullPath,
          });

          if (Array.isArray(fileData) || !("content" in fileData) || !fileData.content) {
            return;
          }

          const rawMarkdown = Buffer.from(fileData.content, "base64").toString("utf-8");

          // Store raw file in database
          await prisma.rawFile.upsert({
            where: {
              repositoryId_githubPath: {
                repositoryId: repositoryId,
                githubPath: fullPath,
              },
            },
            update: {
              githubSha: file.sha,
              fileSize: fileData.size,
              lastCommitDate: lastCommitDate ? new Date(lastCommitDate) : null,
              rawMarkdown: rawMarkdown,
              crawlRunId: crawlRun.id,
            },
            create: {
              repositoryId: repositoryId,
              crawlRunId: crawlRun.id,
              githubPath: fullPath,
              githubSha: file.sha,
              fileSize: fileData.size,
              lastCommitDate: lastCommitDate ? new Date(lastCommitDate) : null,
              rawMarkdown: rawMarkdown,
            },
          });

          totalFiles++;
        } catch (error: any) {
          console.error(`Error processing file ${fullPath}:`, error.message);
          errors++;
        }
      });

      await Promise.all(batchPromises);

      // Update progress
      await prisma.crawlRun.update({
        where: { id: crawlRun.id },
        data: {
          totalProcessed: Math.min(totalFiles, i + batchSize),
          totalErrors: errors,
        },
      });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Mark crawl as completed
    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        totalProcessed: totalFiles,
        totalErrors: errors,
      },
    });

    console.log(`✓ Collected ${totalFiles} files from ${config.owner}/${config.repo} (${errors} errors)`);
    return { totalFiles, errors };
  } catch (error: any) {
    console.error(`✗ Failed to collect from ${config.owner}/${config.repo}:`, error.message);

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        totalErrors: errors + 1,
        errorDetails: { message: error.message },
      },
    });

    return { totalFiles, errors: errors + 1 };
  }
}

// Process raw files from database and generate statistics
async function processRawFilesToCache(): Promise<void> {
  console.log("Processing raw files from database to generate statistics...");

  // Get all enabled repositories
  const repositories = await prisma.repository.findMany({
    where: { enabled: true },
  });

  // Group by protocol
  const protocolGroups: Record<string, any[]> = {};

  for (const repo of repositories) {
    // Get all raw files for this repository
    const rawFiles = await prisma.rawFile.findMany({
      where: { repositoryId: repo.id },
      orderBy: { crawledAt: "desc" },
    });

    console.log(`Found ${rawFiles.length} raw files for ${repo.owner}/${repo.repo}`);

    const processedProposals: EipMetadata[] = [];

    for (const rawFile of rawFiles) {
      try {
        const { metadata: parsedMetadata, mainContent, parsingIssues, enhancedData } = parseEipData(rawFile.rawMarkdown, repo.protocol, rawFile.githubPath);

        const filename = rawFile.githubPath.split("/").pop() || "";

        // Try to get proposal number from frontmatter first, then filename
        let proposalNumber: string | null = null;

        if (repo.protocol === "ethereum") {
          // For EIPs, try the 'eip' field first
          const { data: frontmatter } = matter(rawFile.rawMarkdown);
          proposalNumber = frontmatter.eip ? String(frontmatter.eip) : null;
        }

        // Fallback to filename extraction
        if (!proposalNumber) {
          proposalNumber = extractProposalNumber(filename, repo.proposalPrefix);
        }

        if (proposalNumber && parsedMetadata.title) {
          processedProposals.push({
            number: proposalNumber,
            title: parsedMetadata.title,
            description: parsedMetadata.description,
            author: parsedMetadata.author || "Unknown Author",
            status: parsedMetadata.status || "Draft",
            type: parsedMetadata.type || "Unknown Type",
            category: parsedMetadata.category,
            created: parsedMetadata.created || new Date(0).toISOString(),
            discussionsTo: parsedMetadata.discussionsTo,
            requires: parsedMetadata.requires || [],
            content: mainContent,
            sha: rawFile.githubSha,
            path: rawFile.githubPath,
            protocol: repo.protocol,
            lastModified: rawFile.updatedAt.toISOString(),
            lastCommitDate: rawFile.lastCommitDate?.toISOString(),
            wordCount: enhancedData.wordCount,
            sections: enhancedData.sections,
            fileSize: rawFile.fileSize,
            authorEmails: enhancedData.authorEmails,
            authorGithubHandles: enhancedData.authorGithubHandles,
          } as EipMetadata);
        }
      } catch (error: any) {
        console.warn(`Warning processing ${rawFile.githubPath}:`, error.message);
      }
    }

    if (!protocolGroups[repo.protocol]) {
      protocolGroups[repo.protocol] = [];
    }
    protocolGroups[repo.protocol].push(...processedProposals);
  }

  // Generate statistics and cache for each protocol
  for (const [protocol, proposals] of Object.entries(protocolGroups)) {
    if (proposals.length > 0) {
      console.log(`Generating statistics for ${protocol}: ${proposals.length} proposals`);
      await cacheProposalsData(protocol, proposals);
    }
  }
}
