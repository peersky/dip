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
    enabled: false,
    description: "Arbitrum Improvement Proposals",
    website: "https://github.com/arbitrum-foundation/AIPs",
  },
  {
    owner: "maticnetwork",
    repo: "Polygon-Improvement-Proposals",
    branch: "main",
    eipsFolder: "PIPs",
    protocol: "polygon",
    proposalPrefix: "PIP",
    enabled: true,
    description: "Polygon Improvement Proposals",
    website: "https://github.com/maticnetwork/Polygon-Improvement-Proposals",
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
    } catch (error) {
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

  // Create metadata object early to avoid reference errors
  let metadata: Partial<Omit<EipMetadata, "content" | "sha" | "path" | "lastModified">> = {
    title: getString("title", `Proposal from ${filePath}`, true),
    description: getString("description"),
    author: authorString,
    status: getString("status", "Draft", true),
    type: "", // Will be populated below
    category: getString("category"),
    created: getDateString("created", new Date(0).toISOString(), true),
    discussionsTo: getString("discussions-to") || getString("discussions_to"),
    requires: getStringArray("requires"),
    protocol: protocol,
    fileSize: fileSize,
    authorEmails: emails,
    authorGithubHandles: githubHandles,
  };

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

  // Protocol-specific handling for Polygon Improvement Proposals
  if (!detectedType && protocol === "polygon") {
    const pipNumber = getString("pip");

    // Check for PIP frontmatter format - Polygon uses both PIP and pip fields
    if (!pipNumber) {
      const pipField = getString("PIP");
      if (pipField) {
        issues.push(`Found PIP field with uppercase key: ${pipField}`);
      }
    }

    // Normalize status values for Polygon PIPs
    if (protocol === "polygon" && metadata.status) {
      // Fix common typos and normalize status values
      const normalizedStatus = metadata.status.toLowerCase().trim();

      if (normalizedStatus === "stagnent" || normalizedStatus === "stagnant") {
        metadata.status = "Stagnant";
      } else if (normalizedStatus === "continous" || normalizedStatus === "continuous") {
        metadata.status = "Living"; // Map to EIP's Living status
      } else if (normalizedStatus === "final") {
        metadata.status = "Final";
      } else if (normalizedStatus === "peer review") {
        metadata.status = "Review"; // Normalize to EIP's Review status
      } else if (normalizedStatus === "withdrawn" || normalizedStatus === "withdrawed") {
        metadata.status = "Withdrawn";
      }
    }

    // Special handling for PRC files - Polygon Request for Comments
    if (filePath.includes("/PRC/")) {
      detectedType = "Standards Track";
      if (!metadata.category) {
        metadata.category = "PRC";
      }

      // Normalize PRC to App track for consistency with ERCs
      if (metadata.category === "PRC") {
        metadata.category = "App";
      }

      // Special handling for table-based PRC frontmatter
      if (frontmatterKeys.length === 0) {
        // Extract data from markdown table format used in some PRC files
        const tableMatch = mainContent.match(/\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
        if (tableMatch) {
          const [, number, title, description, author, discussion, status, type, category, created] = tableMatch.map((s) => s?.trim());

          if (number) metadata.title = `PRC-${number}: ${title || ""}`.trim();
          if (description) metadata.description = description;
          if (author) {
            metadata.author = author.replace(/@/g, " @").trim();
            const { emails, githubHandles } = parseAuthors(author);
            metadata.authorEmails = emails;
            metadata.authorGithubHandles = githubHandles;
          }
          if (status) metadata.status = status;
          if (created) {
            try {
              metadata.created = new Date(created).toISOString();
            } catch (error) {
              issues.push(`Invalid date format in table: ${created}`);
            }
          }
        }

        // Also try the simpler format with | symbol at beginning of lines
        if (!metadata.author || metadata.author === "Unknown Author") {
          const authorLine = mainContent.split("\n").find((line) => line.startsWith("|") && line.toLowerCase().includes("author") && !line.includes("---"));

          if (authorLine) {
            const parts = authorLine.split("|");
            if (parts.length >= 3) {
              const authorPart = parts[2].trim();
              if (authorPart) {
                metadata.author = authorPart.replace(/@/g, " @").trim();
                const { emails, githubHandles } = parseAuthors(authorPart);
                metadata.authorEmails = emails;
                metadata.authorGithubHandles = githubHandles;
              }
            }
          }
        }

        // Check for a created date line
        if (metadata.created === new Date(0).toISOString()) {
          const dateLine = mainContent.split("\n").find((line) => line.startsWith("|") && (line.toLowerCase().includes("created") || line.toLowerCase().includes("date")) && !line.includes("---"));

          if (dateLine) {
            const parts = dateLine.split("|");
            if (parts.length >= 3) {
              const datePart = parts[parts.length - 2].trim();
              if (datePart) {
                try {
                  metadata.created = new Date(datePart).toISOString();
                } catch (error) {
                  issues.push(`Invalid date format in table line: ${datePart}`);
                }
              }
            }
          }
        }
      }
    }
    // If the file has a pip field or is in the PIPs folder, it's likely a standards track
    else if (pipNumber || filePath.includes("/PIPs/") || filePath.match(/PIP-\d+\.md$/i)) {
      detectedType = "Standards Track"; // Default for PIPs
    }

    // For files without frontmatter, try to extract info from the content
    if (frontmatterKeys.length === 0) {
      // Check for placeholder files (files that list other PIPs)
      if (mainContent.includes("This is a placeholder for PRCs")) {
        detectedType = "Placeholder";
        metadata.title = "PRC Placeholder";
        metadata.description = "Index of Polygon Request for Comments";
      } else {
        // Extract title from the first heading
        const titleMatch = mainContent.match(/^#\s+(.+?)(?:\n|$)/m);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        }

        // Extract author
        const authorMatch = mainContent.match(/^(?:Author|Authors):\s*(.+?)(?:\n|$)/im);
        if (authorMatch) {
          metadata.author = authorMatch[1].trim();
          const { emails, githubHandles } = parseAuthors(authorMatch[1]);
          metadata.authorEmails = emails;
          metadata.authorGithubHandles = githubHandles;
        }

        // Extract status
        const statusMatch = mainContent.match(/^Status:\s*(.+?)(?:\n|$)/im);
        if (statusMatch) {
          metadata.status = statusMatch[1].trim();
        }

        // Extract created date
        const createdMatch = mainContent.match(/^(?:Date|Created):\s*(.+?)(?:\n|$)/im);
        if (createdMatch) {
          try {
            metadata.created = new Date(createdMatch[1].trim()).toISOString();
          } catch (e) {
            metadata.created = new Date(0).toISOString();
          }
        }

        // Look for PIP number in the content
        const pipNumberMatch = mainContent.match(/^PIP(?:\s*|-*|:+)\s*(\d+)/im);
        if (pipNumberMatch && pipNumberMatch[1]) {
          issues.push(`Extracted PIP number ${pipNumberMatch[1]} from content (not frontmatter)`);
        }
      }
    } else {
      // Handle the proper frontmatter format like PIP-11
      if (getString("Author")) {
        const authorString = getString("Author") || "";
        metadata.author = authorString;
        const { emails, githubHandles } = parseAuthors(authorString);
        metadata.authorEmails = emails;
        metadata.authorGithubHandles = githubHandles;
      }

      if (getString("Date")) {
        try {
          metadata.created = new Date(getString("Date") || "").toISOString();
        } catch (error) {
          issues.push(`Invalid date format in Date field: ${getString("Date")}`);
        }
      }

      if (getString("PIP")) {
        const pipNum = getString("PIP");
        if (pipNum && metadata.title && !metadata.title.includes(`PIP-${pipNum}`)) {
          metadata.title = `PIP-${pipNum}: ${metadata.title}`;
        }
      }
    }
  }

  // For other protocols, provide sensible defaults based on common patterns
  if (!detectedType) {
    // If we have a proposal number, it's likely a standards track proposal
    const hasProposalNumber = getString("snip") || getString("rip") || getString("aip") || getString("pip") || filePath.match(/\d+\.md$/i);
    if (hasProposalNumber) {
      detectedType = "Standards Track";
    }
  }

  // Final fallback - if we still don't have a type, skip this proposal entirely
  // rather than creating "Unknown Type" entries
  if (!detectedType) {
    issues.push(`No type field found. Available keys: ${frontmatterKeys.join(", ")}`);
    detectedType = "SKIP_THIS_PROPOSAL"; // We'll filter this out in processing
  }

  // Set the detected type in the metadata
  metadata.type = detectedType;

  const enhancedData = {
    wordCount: calculateWordCount(mainContent),
    sections: extractSections(mainContent),
    authorEmails: metadata.authorEmails || [],
    authorGithubHandles: metadata.authorGithubHandles || [],
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

  // Special handling for PRC files in Polygon
  if (filename.toLowerCase().includes("prc")) {
    const prcRegex = /prc-(\d+)\.md$/i;
    const prcMatch = filename.match(prcRegex);
    if (prcMatch) return prcMatch[1];
  }

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

          if (proposalNumber && parsedMetadata.title && parsedMetadata.type !== "SKIP_THIS_PROPOSAL") {
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

  // Author deduplication functions
  function extractGitHubHandle(authorName: string): string | null {
    const match = authorName.match(/@([a-zA-Z0-9_-]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  function normalizeAuthorName(authorName: string): string {
    return authorName.toLowerCase().replace(/\s+/g, " ").replace(/[(),]/g, "").trim();
  }

  function getCanonicalAuthorName(names: string[]): string {
    return names.sort((a, b) => {
      const scoreA = a.length + (a.match(/[()]/g) || []).length * 2;
      const scoreB = b.length + (b.match(/[()]/g) || []).length * 2;
      return scoreA - scoreB;
    })[0];
  }

  function deduplicateAuthors(authors: string[]): Map<string, string> {
    const handleMap = new Map<string, string[]>();
    const nameMap = new Map<string, string[]>();
    const deduplicationMap = new Map<string, string>();

    authors.forEach((author) => {
      const handle = extractGitHubHandle(author);
      const normalizedName = normalizeAuthorName(author);

      if (handle) {
        if (!handleMap.has(handle)) {
          handleMap.set(handle, []);
        }
        handleMap.get(handle)!.push(author);
      } else {
        if (!nameMap.has(normalizedName)) {
          nameMap.set(normalizedName, []);
        }
        nameMap.get(normalizedName)!.push(author);
      }
    });

    handleMap.forEach((names) => {
      const canonical = getCanonicalAuthorName(names);
      names.forEach((name) => {
        deduplicationMap.set(name, canonical);
      });
    });

    nameMap.forEach((names) => {
      const canonical = getCanonicalAuthorName(names);
      names.forEach((name) => {
        deduplicationMap.set(name, canonical);
      });
    });

    return deduplicationMap;
  }

  // First pass: collect all author names for deduplication
  const allRawAuthors = new Set<string>();
  for (const proposal of proposals) {
    if (proposal.author && proposal.author.trim() !== "" && proposal.author !== "Unknown Author") {
      const authors = proposal.author
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      authors.forEach((author) => allRawAuthors.add(author));
    }
  }

  // Create deduplication mapping
  const authorDeduplicationMap = deduplicateAuthors(Array.from(allRawAuthors));
  console.log(`INFO: Author deduplication for ${protocol}: ${allRawAuthors.size} raw authors → ${new Set(authorDeduplicationMap.values()).size} unique authors`);

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
      finalizedProposalsInTrack: number;
      allAuthorsInTrack: Set<string>;
      authorsOnFinalizedInTrack: Set<string>;
      statusCountsInTrack: Record<string, number>;
    }
  > = {};

  for (const proposal of proposals) {
    // Apply author deduplication to the proposal data itself
    if (proposal.author && proposal.author.trim() !== "" && proposal.author !== "Unknown Author") {
      const authors = proposal.author
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const deduplicatedAuthors = authors.map((author) => authorDeduplicationMap.get(author) || author);
      proposal.author = deduplicatedAuthors.join(", ");
    }

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

    // Only count authors if we have valid author information
    const hasValidAuthor = proposal.author && proposal.author.trim() !== "" && proposal.author !== "Unknown Author";

    if (hasValidAuthor) {
      const authors = (proposal.author || "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .map((author) => authorDeduplicationMap.get(author) || author); // Apply deduplication
      authors.forEach((auth) => allAuthors.add(auth));

      const isFinalized = finalizedStatuses.includes(proposal.status);
      if (isFinalized) {
        authors.forEach((auth) => authorsOnFinalizedProposals.add(auth));

        let proposalTrack: string | undefined;

        // For Ethereum protocol, use proper EIP categorization
        if (protocol === "ethereum") {
          if (proposal.type === "Standards Track" && proposal.category) {
            // For Standards Track EIPs, use the category (Core, ERC, Networking, Interface)
            // But normalize ERC to "App" for cross-protocol consistency
            if (proposal.category === "ERC") {
              proposalTrack = "App";
            } else {
              proposalTrack = proposal.category;
            }
          } else {
            // For Meta and Informational, use the type
            proposalTrack = proposal.type;
            // But if we only have a category and it's ERC, normalize to App
            if (!proposalTrack && proposal.category === "ERC") {
              proposalTrack = "App";
            } else if (!proposalTrack && proposal.category) {
              proposalTrack = proposal.category;
            }
          }

          // Additional normalization for any remaining ERC references
          if (proposalTrack === "ERC") {
            proposalTrack = "App";
          }
        } else {
          // For other protocols, prioritize type, then category
          if (proposal.type === "Standards Track") {
            // For Standards Track proposals, use category if available, otherwise default to "Core"
            proposalTrack = proposal.category || "Core";
          } else {
            proposalTrack = proposal.type;
            if (!proposalTrack && proposal.category) {
              proposalTrack = proposal.category;
            }
          }

          // Normalize application-level categories to "App"
          if (proposalTrack && ["ERC", "SRC", "Contracts", "Contract", "Application", "Applications", "RRC", "ARC", "PRC"].includes(proposalTrack)) {
            proposalTrack = "App";
          }

          // Normalize protocol-specific proposal types to "Core"
          if (proposalTrack && ["RIP", "AIP", "SNIP", "PIP"].includes(proposalTrack)) {
            proposalTrack = "Core";
          }
        }

        if (proposalTrack) {
          if (!finalizedContributorsByTrack[proposalTrack]) {
            finalizedContributorsByTrack[proposalTrack] = new Set<string>();
          }
          authors.forEach((auth) => finalizedContributorsByTrack[proposalTrack].add(auth));
        }
      }
    }

    if (proposal.sections) {
      proposal.sections.forEach((section) => allSections.add(section));
    }

    if (proposal.wordCount) totalWordCount += proposal.wordCount;
    if (proposal.created) {
      const year = new Date(proposal.created).getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }

    // Logic to determine the primary track for the proposal
    let proposalTrack: string | undefined;

    // For Ethereum protocol, use proper EIP categorization
    if (protocol === "ethereum") {
      if (proposal.type === "Standards Track" && proposal.category) {
        // For Standards Track EIPs, use the category (Core, ERC, Networking, Interface)
        // But normalize ERC to "App" for cross-protocol consistency
        if (proposal.category === "ERC") {
          proposalTrack = "App";
        } else {
          proposalTrack = proposal.category;
        }
      } else {
        // For Meta and Informational, use the type
        proposalTrack = proposal.type;
        // But if we only have a category and it's ERC, normalize to App
        if (!proposalTrack && proposal.category === "ERC") {
          proposalTrack = "App";
        } else if (!proposalTrack && proposal.category) {
          proposalTrack = proposal.category;
        }
      }

      // Additional normalization for any remaining ERC references
      if (proposalTrack === "ERC") {
        proposalTrack = "App";
      }
    } else {
      // For other protocols, prioritize type, then category
      if (proposal.type === "Standards Track") {
        // For Standards Track proposals, use category if available, otherwise default to "Core"
        proposalTrack = proposal.category || "Core";
      } else {
        proposalTrack = proposal.type;
        if (!proposalTrack && proposal.category) {
          proposalTrack = proposal.category;
        }
      }

      // Normalize application-level categories to "App"
      if (proposalTrack && ["ERC", "SRC", "Contracts", "Contract", "Application", "Applications", "RRC", "ARC", "PRC"].includes(proposalTrack)) {
        proposalTrack = "App";
      }

      // Normalize protocol-specific proposal types to "Core"
      if (proposalTrack && ["RIP", "AIP", "SNIP", "PIP"].includes(proposalTrack)) {
        proposalTrack = "Core";
      }
    }

    if (proposalTrack) {
      if (!tracksBreakdownData[proposalTrack]) {
        tracksBreakdownData[proposalTrack] = {
          totalProposalsInTrack: 0,
          finalizedProposalsInTrack: 0,
          allAuthorsInTrack: new Set<string>(),
          authorsOnFinalizedInTrack: new Set<string>(),
          statusCountsInTrack: {},
        };
      }
      tracksBreakdownData[proposalTrack].totalProposalsInTrack++;

      // Only count authors if we have valid author information
      const hasValidAuthor = proposal.author && proposal.author.trim() !== "" && proposal.author !== "Unknown Author";

      if (hasValidAuthor) {
        const currentProposalAuthors = (proposal.author || "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
          .map((author) => authorDeduplicationMap.get(author) || author); // Apply deduplication
        currentProposalAuthors.forEach((auth) => tracksBreakdownData[proposalTrack].allAuthorsInTrack.add(auth));

        if (finalizedStatuses.includes(proposal.status)) {
          currentProposalAuthors.forEach((auth) => tracksBreakdownData[proposalTrack].authorsOnFinalizedInTrack.add(auth));
          tracksBreakdownData[proposalTrack].finalizedProposalsInTrack++;
        }

        if (proposal.status) {
          tracksBreakdownData[proposalTrack].statusCountsInTrack[proposal.status] = (tracksBreakdownData[proposalTrack].statusCountsInTrack[proposal.status] || 0) + 1;
        }
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
      finalizedProposalsInTrack: number;
      distinctAuthorsInTrackCount: number;
      authorsOnFinalizedInTrackCount: number;
      acceptanceScoreForTrack: number;
      statusCountsInTrack: Record<string, number>;
    }
  > = {};

  for (const trackName in tracksBreakdownData) {
    const trackData = tracksBreakdownData[trackName];
    const distinctAuthorsInTrack = trackData.allAuthorsInTrack.size;
    const authorsOnFinalized = trackData.authorsOnFinalizedInTrack.size;
    // Calculate proposal-level acceptance rate instead of author-level
    const proposalAcceptanceRate = trackData.totalProposalsInTrack > 0 ? trackData.finalizedProposalsInTrack / trackData.totalProposalsInTrack : 0;

    finalTracksBreakdown[trackName] = {
      totalProposalsInTrack: trackData.totalProposalsInTrack,
      finalizedProposalsInTrack: trackData.finalizedProposalsInTrack,
      distinctAuthorsInTrackCount: distinctAuthorsInTrack,
      authorsOnFinalizedInTrackCount: authorsOnFinalized,
      acceptanceScoreForTrack: parseFloat(proposalAcceptanceRate.toFixed(2)),
      statusCountsInTrack: trackData.statusCountsInTrack,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: Caching proposals for ${protocol} in Vercel KV: ${errorMessage}`);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase") || "all"; // 'crawl', 'parse', 'stats', or 'all'
  const protocol = searchParams.get("protocol"); // Optional: only process specific protocol

  console.log(`CRON JOB: Starting pipeline (phase: ${phase}, protocol: ${protocol || "all"})...`);

  try {
    if (phase === "crawl" || phase === "all") {
      console.log("=== PHASE 1: CRAWLING RAW DATA ===");
      await seedRepositoryConfigs();

      const repos = await prisma.repository.findMany({
        where: {
          enabled: true,
          ...(protocol && { protocol }),
        },
      });

      let totalCollected = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const repo of repos) {
        const result = await crawlRepositoryFiles(repo.id, {
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

        totalCollected += result.newFiles;
        totalSkipped += result.skippedFiles;
        totalErrors += result.errors;
      }

      console.log(`✓ Crawl phase completed: ${totalCollected} new files, ${totalSkipped} skipped (unchanged), ${totalErrors} errors`);
    }

    if (phase === "parse" || phase === "all") {
      console.log("=== PHASE 2: PARSING RAW DATA ===");
      const parseResult = await parseRawFilesToProposals(protocol);
      console.log(`✓ Parse phase completed: ${parseResult.parsed} proposals parsed, ${parseResult.errors} errors`);
    }

    if (phase === "stats" || phase === "all") {
      console.log("=== PHASE 3: GENERATING STATISTICS ===");
      const statsResult = await generateProtocolStatistics(protocol);
      console.log(`✓ Stats phase completed: ${statsResult.protocols} protocols processed`);
    }

    // Get summary stats
    const summary = await prisma.repository.findMany({
      where: protocol ? { protocol } : {},
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
      protocol: protocol || "all",
      summary: summary.map((repo) => ({
        protocol: repo.protocol,
        repository: `${repo.owner}/${repo.repo}`,
        totalFiles: repo._count.rawFiles,
        totalCrawlRuns: repo._count.crawlRuns,
        lastCrawl: repo.crawlRuns[0] || null,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("CRON JOB ERROR:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
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

// Pure crawler with smart caching - only fetches and stores raw files
async function crawlRepositoryFiles(repositoryId: string, config: RepositoryConfig): Promise<{ newFiles: number; skippedFiles: number; errors: number }> {
  console.log(`Crawling files from ${config.owner}/${config.repo}...`);

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

  let newFiles = 0;
  let skippedFiles = 0;
  let errors = 0;

  try {
    console.log(`INFO: Crawling files from ${config.owner}/${config.repo}/${config.eipsFolder}`);

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

    console.log(`Found ${markdownFiles.length} markdown files to process`);

    // Get existing files from database for comparison
    const existingFiles = await prisma.rawFile.findMany({
      where: { repositoryId: repositoryId },
      select: {
        githubPath: true,
        githubSha: true,
        lastCommitDate: true,
      },
    });

    const existingFileMap = new Map(existingFiles.map((file) => [file.githubPath, { sha: file.githubSha, lastCommitDate: file.lastCommitDate }]));

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: { totalFilesFound: markdownFiles.length },
    });

    const batchSize = 5;
    for (let i = 0; i < markdownFiles.length; i += batchSize) {
      const batch = markdownFiles.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(markdownFiles.length / batchSize)}`);

      const batchPromises = batch.map(async (file: OctokitTreeItem) => {
        if (!file.path || !file.sha) return;

        const fullPath = `${config.eipsFolder}/${file.path}`;
        const existingFile = existingFileMap.get(fullPath);

        // Smart caching: skip if SHA hasn't changed
        if (existingFile && existingFile.sha === file.sha) {
          skippedFiles++;
          return;
        }

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

          // Store/update raw file in database
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

          newFiles++;
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
          totalProcessed: Math.min(newFiles + skippedFiles, i + batchSize),
          totalErrors: errors,
        },
      });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced delay since we're skipping unchanged files
    }

    // Mark crawl as completed
    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        totalProcessed: newFiles + skippedFiles,
        totalErrors: errors,
      },
    });

    console.log(`✓ Crawled ${config.owner}/${config.repo}: ${newFiles} new, ${skippedFiles} skipped, ${errors} errors`);
    return { newFiles, skippedFiles, errors };
  } catch (error: any) {
    console.error(`✗ Failed to crawl ${config.owner}/${config.repo}:`, error.message);

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        totalErrors: errors + 1,
        errorDetails: { message: error.message },
      },
    });

    return { newFiles, skippedFiles, errors: errors + 1 };
  }
}

// Parse raw files from database into structured proposals (no caching yet)
async function parseRawFilesToProposals(protocolFilter?: string | null): Promise<{ parsed: number; errors: number }> {
  console.log("Parsing raw files from database...");

  // Get repositories to process
  const repositories = await prisma.repository.findMany({
    where: {
      enabled: true,
      ...(protocolFilter && { protocol: protocolFilter }),
    },
  });

  let totalParsed = 0;
  let totalErrors = 0;

  for (const repo of repositories) {
    console.log(`Processing ${repo.owner}/${repo.repo} (${repo.protocol})`);

    // Get all raw files for this repository
    const rawFiles = await prisma.rawFile.findMany({
      where: { repositoryId: repo.id },
      orderBy: { crawledAt: "desc" },
    });

    console.log(`Found ${rawFiles.length} raw files for ${repo.owner}/${repo.repo}`);

    // Special handling for Polygon protocol to ensure PRC files are included
    if (repo.protocol === "polygon") {
      const prcFiles = rawFiles.filter((file) => file.githubPath.includes("/PRC/") && file.githubPath.endsWith(".md") && !file.githubPath.includes("README") && !file.githubPath.includes("template"));

      if (prcFiles.length > 0) {
        console.log(`Found ${prcFiles.length} PRC files in ${repo.owner}/${repo.repo}`);
      }
    }

    for (const rawFile of rawFiles) {
      try {
        const { metadata: parsedMetadata, mainContent, parsingIssues, enhancedData } = parseEipData(rawFile.rawMarkdown, repo.protocol, rawFile.githubPath);

        // Only process if parsing was successful
        if (parsedMetadata.title && parsedMetadata.type !== "SKIP_THIS_PROPOSAL") {
          totalParsed++;

          // You could store parsed data in a separate table here if needed
          // For now, we'll continue to use the existing caching approach
        } else {
          console.warn(`Skipped ${rawFile.githubPath}: ${parsingIssues.join(", ")}`);
        }
      } catch (error: any) {
        console.error(`Error parsing ${rawFile.githubPath}:`, error.message);
        totalErrors++;
      }
    }
  }

  console.log(`Parse completed: ${totalParsed} parsed, ${totalErrors} errors`);
  return { parsed: totalParsed, errors: totalErrors };
}

// Generate statistics and cache them for protocols
async function generateProtocolStatistics(protocolFilter?: string | null): Promise<{ protocols: number }> {
  console.log("Generating protocol statistics...");

  // Get repositories to process
  const repositories = await prisma.repository.findMany({
    where: {
      enabled: true,
      ...(protocolFilter && { protocol: protocolFilter }),
    },
  });

  // Group by protocol
  const protocolGroups: Record<string, any[]> = {};

  for (const repo of repositories) {
    console.log(`Generating stats for ${repo.protocol}: ${repo.owner}/${repo.repo}`);

    // Get all raw files for this repository
    const rawFiles = await prisma.rawFile.findMany({
      where: { repositoryId: repo.id },
      orderBy: { crawledAt: "desc" },
    });

    const processedProposals: EipMetadata[] = [];

    for (const rawFile of rawFiles) {
      try {
        const { metadata: parsedMetadata, mainContent, parsingIssues, enhancedData } = parseEipData(rawFile.rawMarkdown, repo.protocol, rawFile.githubPath);

        const filename = rawFile.githubPath.split("/").pop() || "";

        // Extract proposal number with protocol-specific logic
        let proposalNumber: string | null = null;

        if (repo.protocol === "ethereum") {
          const { data: frontmatter } = matter(rawFile.rawMarkdown);
          proposalNumber = frontmatter.eip ? String(frontmatter.eip) : null;
        } else if (repo.protocol === "polygon") {
          const { data: frontmatter } = matter(rawFile.rawMarkdown);
          proposalNumber = frontmatter.pip ? String(frontmatter.pip) : null;
        } else if (repo.protocol === "starknet") {
          const { data: frontmatter } = matter(rawFile.rawMarkdown);
          proposalNumber = frontmatter.snip ? String(frontmatter.snip) : null;
        } else if (repo.protocol === "rollup") {
          const { data: frontmatter } = matter(rawFile.rawMarkdown);
          proposalNumber = frontmatter.rip ? String(frontmatter.rip) : null;
        }

        // Fallback to filename extraction
        if (!proposalNumber) {
          proposalNumber = extractProposalNumber(filename, repo.proposalPrefix);
        }

        if (proposalNumber && parsedMetadata.title && parsedMetadata.type !== "SKIP_THIS_PROPOSAL") {
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
  let processedProtocols = 0;
  for (const [protocol, proposals] of Object.entries(protocolGroups)) {
    if (proposals.length > 0) {
      console.log(`Caching statistics for ${protocol}: ${proposals.length} proposals`);
      await cacheProposalsData(protocol, proposals);
      processedProtocols++;
    }
  }

  console.log(`Statistics generated for ${processedProtocols} protocols`);
  return { protocols: processedProtocols };
}
