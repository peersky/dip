import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  Proposal,
  ProposalVersion,
  Author,
} from "@peeramid-labs/dip-database";

// Define an extended type for our versions to include authors
type VersionWithAuthors = ProposalVersion & {
  authors: { author: Author }[];
};

// Define the final shape of the proposal data we'll return
type UnifiedProposal = Proposal & {
  versions: VersionWithAuthors[];
  isMoved: boolean; // Flag to indicate if the original request was for a moved proposal
  originalPath?: string; // If moved, what was the original path requested
};

interface RouteContext {
  params: Promise<{
    protocol: string;
    slug: string;
  }>;
}

/**
 * Fetches the full, unified history of a proposal, traversing `movedTo` and `movedFrom` links.
 * @param initialProposal - The starting proposal object from the user's request.
 * @returns A unified proposal object with a complete version history.
 */
async function getUnifiedProposalHistory(
  initialProposal: Proposal & { versions: VersionWithAuthors[] },
): Promise<UnifiedProposal> {
  let finalProposal = initialProposal;

  // 1. Traverse forward to find the ultimate destination of the proposal chain.
  while (finalProposal.movedToId) {
    const nextProposal = await prisma.proposal.findUnique({
      where: { id: finalProposal.movedToId },
      include: {
        versions: {
          orderBy: { commitDate: "desc" },
          include: { authors: { include: { author: true } } },
        },
      },
    });
    if (!nextProposal) break;
    finalProposal = nextProposal as any; // Cast to handle recursive type
  }

  // 2. Once we have the final proposal, traverse backward to gather all historical versions.
  const allVersions: VersionWithAuthors[] = [];
  const processedIds = new Set<string>();
  const queue: (Proposal & { versions: VersionWithAuthors[] })[] = [
    finalProposal,
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || processedIds.has(current.id)) continue;

    processedIds.add(current.id);
    allVersions.push(...current.versions);

    // Find all proposals that were moved *to* the current one.
    const sourceProposals = await prisma.proposal.findMany({
      where: { movedToId: current.id },
      include: {
        versions: {
          orderBy: { commitDate: "desc" },
          include: { authors: { include: { author: true } } },
        },
      },
    });
    queue.push(...(sourceProposals as any[])); // Cast to handle recursive type
  }

  // 3. Sort the unified list of all versions chronologically.
  allVersions.sort((a, b) => b.commitDate.getTime() - a.commitDate.getTime());

  return {
    ...finalProposal, // Return the data of the *final* proposal
    versions: allVersions, // But with the *complete* history
    isMoved: initialProposal.id !== finalProposal.id,
    originalPath:
      initialProposal.id !== finalProposal.id
        ? initialProposal.githubPath
        : undefined,
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { protocol, slug } = await params;

  if (!protocol || !slug) {
    return NextResponse.json(
      { success: false, error: "Protocol and slug are required." },
      { status: 400 },
    );
  }

  // Parse the slug (e.g., "EIP-1") into a prefix ("EIP") and a number ("1").
  const slugMatch = slug.match(/^([a-zA-Z]+)-?(\d+)$/);
  if (!slugMatch) {
    return NextResponse.json(
      { success: false, error: `Invalid proposal slug format: "${slug}"` },
      { status: 400 },
    );
  }
  const [, prefix, number] = slugMatch;

  try {
    // This is the key to ambiguity resolution: we find the specific repository
    // that matches BOTH the protocol and the proposal prefix from the slug.
    const repository = await prisma.repository.findFirst({
      where: {
        protocol: protocol,
        proposalPrefix: prefix,
      },
    });

    if (!repository) {
      return NextResponse.json(
        {
          success: false,
          error: `Configuration for proposal type '${prefix}' within protocol '${protocol}' not found.`,
        },
        { status: 404 },
      );
    }

    // Now, perform the precise lookup using the repository's unique keys.
    const initialProposal = await prisma.proposal.findUnique({
      where: {
        repositoryOwner_repositoryRepo_repositoryProtocol_proposalNumber: {
          repositoryOwner: repository.owner,
          repositoryRepo: repository.repo,
          repositoryProtocol: repository.protocol, // Use the repo's specific protocol
          proposalNumber: number,
        },
      },
      include: {
        versions: {
          orderBy: { commitDate: "desc" },
          include: { authors: { include: { author: true } } },
        },
      },
    });

    if (!initialProposal) {
      return NextResponse.json(
        {
          success: false,
          error: `Proposal ${slug} not found for protocol ${protocol}.`,
        },
        { status: 404 },
      );
    }

    // Get the full, unified history for the proposal.
    const unifiedProposal = await getUnifiedProposalHistory(
      initialProposal as any,
    );

    // Enrich the 'requires' field with the status of each dependency.
    let enrichedRequires: { number: string; status: string }[] = [];
    if (
      repository &&
      unifiedProposal.requires &&
      unifiedProposal.requires.length > 0
    ) {
      const dependencyProposals = await prisma.proposal.findMany({
        where: {
          repositoryOwner: repository.owner,
          repositoryRepo: repository.repo,
          repositoryProtocol: repository.protocol,
          proposalNumber: { in: unifiedProposal.requires as string[] },
        },
        select: {
          proposalNumber: true,
          status: true,
        },
      });

      const statusMap = new Map(
        dependencyProposals.map((p) => [p.proposalNumber, p.status]),
      );

      enrichedRequires = (unifiedProposal.requires as string[]).map(
        (reqNumber) => ({
          number: reqNumber,
          status: statusMap.get(reqNumber) || "Unknown",
        }),
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...unifiedProposal,
        enrichedRequires,
      },
    });
  } catch (error: any) {
    console.error(`Failed to fetch proposal ${slug} for ${protocol}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching the proposal.",
      },
      { status: 500 },
    );
  }
}
