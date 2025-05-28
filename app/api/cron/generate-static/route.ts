import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { kv } from "@vercel/kv";
import matter from "gray-matter";

// Add dynamic configuration for static export
export const dynamic = "force-dynamic";

interface EipMetadata {
  number: string;
  title: string;
  description?: string; // Optional as not all EIPs might have it in frontmatter
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string; // This will be set by us
  discussionsTo?: string;
  requires?: string[];
  content: string; // Full markdown content
  sha: string;
  path: string;
  protocol: string; // Added to identify the protocol
}

interface RepositoryConfig {
  owner: string;
  repo: string;
  branch: string;
  eipsFolder: string;
  protocol: string; // e.g., "ethereum", "arbitrum"
  proposalPrefix: string; // e.g., "EIP", "AIP"
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
    protocol: "rollup", // Assuming "rollup" is the protocol key for RIPs
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
  // Add more repositories as needed
];

// Updated to use gray-matter and be more flexible
function parseEipData(markdownContent: string, protocol: string): { metadata: Partial<EipMetadata>; mainContent: string } {
  const { data: frontmatter, content: mainContent } = matter(markdownContent);

  const metadata: Partial<EipMetadata> = {
    title: frontmatter.title,
    description: frontmatter.description,
    author: frontmatter.author,
    status: frontmatter.status,
    type: frontmatter.type,
    category: frontmatter.category,
    created: frontmatter.created ? new Date(frontmatter.created).toISOString() : undefined,
    discussionsTo: frontmatter["discussions-to"],
    requires: frontmatter.requires ? (typeof frontmatter.requires === "string" ? frontmatter.requires.split(",").map((r: string) => r.trim()) : Array.isArray(frontmatter.requires) ? frontmatter.requires.map(String) : []) : [],
    protocol: protocol,
  };
  return { metadata, mainContent };
}

// Updated to use proposalPrefix
function extractProposalNumber(filename: string, proposalPrefix: string): string | null {
  const regex = new RegExp(`(?:${proposalPrefix.toLowerCase()})-(\\d+)\\.md$`, "i");
  const match = filename.match(regex);
  return match ? match[1] : null;
}

async function fetchProposalsFromRepository(config: RepositoryConfig): Promise<EipMetadata[]> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Optional: for higher rate limits
  });

  try {
    console.log(`INFO: Fetching ${config.proposalPrefix}s from ${config.owner}/${config.repo}/${config.eipsFolder}`);

    const { data: files } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: config.eipsFolder,
      ref: config.branch,
    });

    if (!Array.isArray(files)) {
      console.error(`ERROR: Expected directory listing for ${config.owner}/${config.repo}/${config.eipsFolder}, but got different type.`);
      return [];
    }

    const proposalFiles = files.filter((file) => file.type === "file" && file.name.endsWith(".md") && extractProposalNumber(file.name, config.proposalPrefix));

    console.log(`INFO: Found ${proposalFiles.length} ${config.proposalPrefix} files in ${config.owner}/${config.repo}`);

    const proposals: EipMetadata[] = [];
    const batchSize = 10; // Process files in batches

    for (let i = 0; i < proposalFiles.length; i += batchSize) {
      const batch = proposalFiles.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: file.path,
            ref: config.branch,
          });

          if ("content" in fileData && fileData.content) {
            const rawMarkdownContent = Buffer.from(fileData.content, "base64").toString("utf-8");
            const { metadata: parsedMetadata, mainContent } = parseEipData(rawMarkdownContent, config.protocol);
            const proposalNumber = extractProposalNumber(file.name, config.proposalPrefix);

            if (proposalNumber && parsedMetadata.title && parsedMetadata.author && parsedMetadata.status && parsedMetadata.type && parsedMetadata.created) {
              return {
                number: proposalNumber,
                title: parsedMetadata.title,
                description: parsedMetadata.description,
                author: parsedMetadata.author,
                status: parsedMetadata.status,
                type: parsedMetadata.type,
                category: parsedMetadata.category,
                created: parsedMetadata.created,
                discussionsTo: parsedMetadata.discussionsTo,
                requires: parsedMetadata.requires,
                content: mainContent, // Store the main content (after frontmatter)
                sha: fileData.sha,
                path: file.path,
                protocol: config.protocol,
                lastModified: new Date().toISOString(), // Set current time as last modified
              } as EipMetadata;
            } else {
              console.warn(`WARN: Missing critical metadata for ${file.path}. Title: ${parsedMetadata.title}, Author: ${parsedMetadata.author}, Status: ${parsedMetadata.status}, Type: ${parsedMetadata.type}, Created: ${parsedMetadata.created}`);
            }
          }
        } catch (error: any) {
          console.error(`ERROR: Processing file ${file.path} from ${config.owner}/${config.repo}: ${error.message}`);
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      proposals.push(...(batchResults.filter(Boolean) as EipMetadata[]));

      if (i + batchSize < proposalFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay
      }
    }

    console.log(`INFO: Successfully processed ${proposals.length} ${config.proposalPrefix}s from ${config.owner}/${config.repo}`);
    return proposals;
  } catch (error: any) {
    console.error(`ERROR: Fetching ${config.proposalPrefix}s from ${config.owner}/${config.repo}: ${error.message}`);
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
    // Cache individual proposal
    pipeline.set(`eip:${protocol}:${proposal.number}`, proposal); // Using 'eip' prefix for generic proposal key

    // Prepare metadata for list view
    const { content, sha, path, ...listItem } = proposal;
    listMetadata.push(listItem);

    // Collect filter options
    if (proposal.status) allStatuses.add(proposal.status);
    if (proposal.type) allTypes.add(proposal.type);
    if (proposal.category) allCategories.add(proposal.category);
  }

  // Cache the list of metadata items
  pipeline.set(`eips-list:${protocol}`, listMetadata);

  // Cache filter options
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

// Allow manual trigger via POST as well, for easier testing if needed
export async function POST(request: NextRequest) {
  return GET(request);
}
