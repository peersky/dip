import { NextRequest, NextResponse } from "next/server";
import { Octokit as OctokitCore } from "@octokit/core";
import { restEndpointMethods, RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { throttling } from "@octokit/plugin-throttling";
import { kv } from "@vercel/kv";
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
}

interface RepositoryConfig {
  owner: string;
  repo: string;
  branch: string;
  eipsFolder: string;
  protocol: string;
  proposalPrefix: string;
}

const repositories: RepositoryConfig[] = [
  {
    owner: "ethereum",
    repo: "EIPs",
    branch: "master",
    eipsFolder: "EIPS",
    protocol: "ethereum",
    proposalPrefix: "EIP",
  },
  {
    owner: "ethereum",
    repo: "RIPs",
    branch: "master",
    eipsFolder: "RIPS",
    protocol: "rollup",
    proposalPrefix: "RIP",
  },
  {
    owner: "starknet-io",
    repo: "SNIPs",
    branch: "main",
    eipsFolder: "SNIPS",
    protocol: "starknet",
    proposalPrefix: "SNIP",
  },
  {
    owner: "arbitrum-foundation",
    repo: "AIPs",
    branch: "main",
    eipsFolder: "AIPS",
    protocol: "arbitrum",
    proposalPrefix: "AIP",
  },
];

function parseEipData(markdownContent: string, protocol: string, filePath: string): { metadata: Partial<Omit<EipMetadata, "content" | "sha" | "path" | "lastModified">>; mainContent: string; parsingIssues: string[] } {
  const { data: frontmatter, content: mainContent } = matter(markdownContent);
  const issues: string[] = [];

  const getString = (key: string, defaultValue: string | undefined = undefined, isCritical = false): string | undefined => {
    const value = frontmatter[key] || frontmatter[key.toLowerCase()];
    if (value === undefined && defaultValue === undefined && isCritical) issues.push(`Missing critical field '${key}'`);
    return value !== undefined ? String(value) : defaultValue;
  };

  const getDateString = (key: string, defaultValue: string | undefined = undefined, isCritical = false): string | undefined => {
    const value = frontmatter[key] || frontmatter[key.toLowerCase()];
    if (value === undefined && defaultValue === undefined && isCritical) {
      if (isCritical) issues.push(`Missing critical field '${key}'`);
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
    const value = frontmatter[key] || frontmatter[key.toLowerCase()];
    if (value === undefined) return [];
    if (typeof value === "string")
      return value
        .split(",")
        .map((r: string) => r.trim())
        .filter(Boolean);
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return [];
  };

  const metadata: Partial<Omit<EipMetadata, "content" | "sha" | "path" | "lastModified">> = {
    title: getString("title", `Proposal from ${filePath}`, true),
    description: getString("description"),
    author: getString("author", "Unknown Author", true),
    status: getString("status", "Draft", true),
    type: getString("type", "Unknown Type", true),
    category: getString("category"),
    created: getDateString("created", new Date(0).toISOString(), true),
    discussionsTo: getString("discussions-to") || getString("discussions_to"),
    requires: getStringArray("requires"),
    protocol: protocol,
  };

  if (issues.length > 0) {
    console.warn(`WARN: [${filePath}] Frontmatter parsing issues: ${issues.join("; ")}. Raw frontmatter: ${JSON.stringify(frontmatter).substring(0, 300)}...`);
  }

  return { metadata, mainContent, parsingIssues: issues };
}

function extractProposalNumber(filename: string, proposalPrefix: string): string | null {
  const regex = new RegExp(`(?:${proposalPrefix.toLowerCase()})-(\\d+)\\.md$`, "i");
  const match = filename.match(regex);
  return match ? match[1] : null;
}

// Define types for Octokit tree items
interface OctokitTreeItem {
  path?: string;
  mode?: string;
  type?: "blob" | "tree" | "commit" | string; // Allow string for broader compatibility
  sha?: string | null; // SHA can be null for submodules
  size?: number;
  url?: string;
}

async function fetchProposalsFromRepository(config: RepositoryConfig): Promise<EipMetadata[]> {
  // Explicitly type the octokit instance with the plugins
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
    console.log(`INFO: Fetching ${config.proposalPrefix}s from ${config.owner}/${config.repo}, branch ${config.branch}, folder ${config.eipsFolder}`);

    const { data: branchData } = await octokit.rest.repos.getBranch({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
    });
    const rootTreeSha = branchData.commit.commit.tree.sha;

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

    const proposalFileEntries = eipsFolderTree.tree.filter((item: OctokitTreeItem) => item.type === "blob" && item.path && item.path.endsWith(".md") && extractProposalNumber(item.path.split("/").pop() || "", config.proposalPrefix));

    console.log(`INFO: Found ${proposalFileEntries.length} potential ${config.proposalPrefix} files in ${config.owner}/${config.repo}/${config.eipsFolder} tree.`);

    const proposals: EipMetadata[] = [];
    const batchSize = 5;

    for (let i = 0; i < proposalFileEntries.length; i += batchSize) {
      const batch = proposalFileEntries.slice(i, i + batchSize);
      const batchPromises = batch.map(async (entry: OctokitTreeItem) => {
        if (!entry.path || !entry.sha) return null;
        const fullPath = `${config.eipsFolder}/${entry.path}`;
        try {
          const { data: fileDataUncasted } = await octokit.rest.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: fullPath,
          });

          // Type guard for content
          const fileData = fileDataUncasted as RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"];
          if (Array.isArray(fileData) || !("content" in fileData) || !fileData.content) {
            console.warn(`WARN: [${fullPath}] No content found or unexpected format.`);
            return null;
          }

          const rawMarkdownContent = Buffer.from(fileData.content, "base64").toString("utf-8");
          const { metadata: parsedMetadata, mainContent, parsingIssues } = parseEipData(rawMarkdownContent, config.protocol, fullPath);
          const proposalNumber = extractProposalNumber(entry.path.split("/").pop() || "", config.proposalPrefix);

          if (proposalNumber && parsedMetadata.title) {
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
            } as EipMetadata;
          } else {
            console.warn(`WARN: [${fullPath}] Skipped due to missing EIP number or title. Number: ${proposalNumber}, Title: ${parsedMetadata.title}. Issues: ${parsingIssues.join(", ")}`);
          }
        } catch (error: any) {
          console.error(`ERROR: [${fullPath}] Processing file from ${config.owner}/${config.repo}: ${error.message}`);
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      proposals.push(...(batchResults.filter(Boolean) as EipMetadata[]));
    }

    console.log(`INFO: Successfully processed ${proposals.length} ${config.proposalPrefix}s from ${config.owner}/${config.repo}`);
    return proposals;
  } catch (error: any) {
    console.error(`ERROR: Fetching ${config.proposalPrefix}s from ${config.owner}/${config.repo}: ${error.message}`);
    if (error.status === 404) {
      console.error(`ERROR: Repository or branch not found for ${config.owner}/${config.repo}, branch ${config.branch}. Please check config.`);
    }
    return [];
  }
}

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

  for (const proposal of proposals) {
    pipeline.set(`eip:${protocol}:${proposal.number}`, proposal);
    const { content, sha, path, ...listItem } = proposal;
    listMetadata.push(listItem);
    if (proposal.status) allStatuses.add(proposal.status);
    if (proposal.type) allTypes.add(proposal.type);
    if (proposal.category) allCategories.add(proposal.category);
  }

  pipeline.set(`eips-list:${protocol}`, listMetadata);
  const filterOptions = {
    statuses: Array.from(allStatuses).sort(),
    types: Array.from(allTypes).sort(),
    categories: Array.from(allCategories).sort(),
  };
  pipeline.set(`eips-filters:${protocol}`, filterOptions);
  pipeline.set(`eips-last-update:${protocol}`, new Date().toISOString());

  try {
    await pipeline.exec();
    console.log(`INFO: Successfully cached ${proposals.length} proposals and metadata for ${protocol} in Vercel KV.`);
  } catch (error: any) {
    console.error(`ERROR: Caching proposals for ${protocol} in Vercel KV: ${error.message}`);
  }
}

export async function GET(request: NextRequest) {
  console.log("CRON JOB: Starting static EIP generation and caching process...");
  let totalProcessed = 0;
  let totalCached = 0;
  const processingStats: Record<string, { fetched: number; cached: number; error?: string }> = {};

  for (const repoConfig of repositories) {
    try {
      console.log(`CRON JOB: Processing repository ${repoConfig.owner}/${repoConfig.repo} for protocol ${repoConfig.protocol}`);
      const proposals = await fetchProposalsFromRepository(repoConfig);
      totalProcessed += proposals.length;
      if (proposals.length > 0) {
        await cacheProposalsData(repoConfig.protocol, proposals);
        totalCached += proposals.length;
        processingStats[repoConfig.protocol] = { fetched: proposals.length, cached: proposals.length };
      } else {
        console.log(`CRON JOB: No proposals fetched for ${repoConfig.protocol}, skipping caching.`);
        processingStats[repoConfig.protocol] = { fetched: 0, cached: 0 };
      }
    } catch (error: any) {
      console.error(`CRON JOB: Failed to process repository ${repoConfig.owner}/${repoConfig.repo}: ${error.message}`);
      processingStats[repoConfig.protocol] = { fetched: 0, cached: 0, error: error.message };
    }
  }

  const summary = {
    message: "EIP static generation and caching process completed.",
    totalRepositories: repositories.length,
    totalProposalsProcessedOverall: totalProcessed,
    totalProposalsCachedInKV: totalCached,
    processingStats,
    timestamp: new Date().toISOString(),
  };
  console.log("CRON JOB: Summary:", JSON.stringify(summary, null, 2));
  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
