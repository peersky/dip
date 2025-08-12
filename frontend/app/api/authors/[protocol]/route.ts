import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface AuthorStats {
  name: string;
  totalProposals: number;
  finalizedProposals: number;
  trackDistribution: Record<string, number>;
  acceptanceRate: number;
  firstProposal: string;
  lastProposal: string;
}

interface RouteContext {
  params: Promise<{ protocol: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { protocol } = await context.params;

    if (!protocol) {
      return NextResponse.json(
        { success: false, error: "Protocol parameter is required" },
        { status: 400 },
      );
    }

    // Fetch all proposals for the given protocol, including versions and author details
    const proposals = await prisma.proposal.findMany({
      where: { repositoryProtocol: protocol },
      include: {
        versions: {
          include: {
            authors: {
              include: {
                author: true,
              },
            },
          },
        },
      },
    });

    if (proposals.length === 0) {
      return NextResponse.json({
        success: true,
        protocol,
        authors: [],
        message: "No proposals found for this protocol",
      });
    }

    // Use a map to aggregate data for each author
    const authorMap = new Map<
      string,
      {
        proposals: Set<string>; // Use Set to count unique proposals
        finalizedProposals: Set<string>;
        trackDistribution: Record<string, number>;
        proposalDates: Date[];
      }
    >();

    const finalizedStatuses = ["Final", "Living"];

    // Iterate through each proposal and its versions to populate the author map
    proposals.forEach((proposal) => {
      const track = proposal.category || proposal.type || "Unknown";
      proposal.versions.forEach((version) => {
        version.authors.forEach((authorOnVersion) => {
          const authorName =
            authorOnVersion.author.name || authorOnVersion.author.githubHandle;
          if (!authorName) return; // Skip if author has no identifiable name

          if (!authorMap.has(authorName)) {
            authorMap.set(authorName, {
              proposals: new Set(),
              finalizedProposals: new Set(),
              trackDistribution: {},
              proposalDates: [],
            });
          }

          const authorData = authorMap.get(authorName)!;
          authorData.proposals.add(proposal.id);

          if (proposal.created) {
            authorData.proposalDates.push(new Date(proposal.created));
          }

          if (finalizedStatuses.includes(proposal.status)) {
            authorData.finalizedProposals.add(proposal.id);
          }

          // Increment the count for the proposal's track
          authorData.trackDistribution[track] =
            (authorData.trackDistribution[track] || 0) + 1;
        });
      });
    });

    // Convert the map to the final author stats array
    const authors: AuthorStats[] = Array.from(authorMap.entries()).map(
      ([name, data]) => {
        const totalProposals = data.proposals.size;
        const finalizedProposals = data.finalizedProposals.size;
        const acceptanceRate =
          totalProposals > 0 ? finalizedProposals / totalProposals : 0;

        const sortedDates = data.proposalDates.sort(
          (a, b) => a.getTime() - b.getTime(),
        );

        return {
          name,
          totalProposals,
          finalizedProposals,
          trackDistribution: data.trackDistribution,
          acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
          firstProposal: sortedDates.length ? sortedDates[0].toISOString() : "",
          lastProposal: sortedDates.length
            ? sortedDates[sortedDates.length - 1].toISOString()
            : "",
        };
      },
    );

    // Sort authors by the total number of proposals they've contributed to
    authors.sort((a, b) => b.totalProposals - a.totalProposals);

    const totalFinalizedProposals = proposals.filter((p) =>
      finalizedStatuses.includes(p.status),
    ).length;

    return NextResponse.json({
      success: true,
      protocol,
      authors,
      totalAuthors: authors.length,
      totalFinalizedProposals: totalFinalizedProposals,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(
      `Error fetching authors for protocol ${(await context.params).protocol}:`,
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        protocol: (await context.params).protocol,
      },
      { status: 500 },
    );
  }
}
