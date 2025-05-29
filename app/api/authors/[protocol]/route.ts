import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

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
      return NextResponse.json({ success: false, error: "Protocol parameter is required" }, { status: 400 });
    }

    // Get proposals list for this protocol
    const proposalsList = await kv.get(`eips-list:${protocol}`);

    if (!proposalsList || !Array.isArray(proposalsList)) {
      return NextResponse.json({
        success: true,
        protocol,
        authors: [],
        message: "No proposals found for this protocol",
      });
    }

    // Group proposals by author and calculate stats
    const authorMap = new Map<
      string,
      {
        proposals: any[];
        finalizedProposals: any[];
        trackDistribution: Record<string, number>;
      }
    >();

    const finalizedStatuses = ["Final", "Living"];

    proposalsList.forEach((proposal: any) => {
      if (!proposal.author || proposal.author === "Unknown Author") return;

      // Split authors by comma and process each
      const authors = proposal.author
        .split(",")
        .map((a: string) => a.trim())
        .filter(Boolean);

      authors.forEach((author) => {
        if (!authorMap.has(author)) {
          authorMap.set(author, {
            proposals: [],
            finalizedProposals: [],
            trackDistribution: {},
          });
        }

        const authorData = authorMap.get(author)!;
        authorData.proposals.push(proposal);

        if (finalizedStatuses.includes(proposal.status)) {
          authorData.finalizedProposals.push(proposal);
        }

        // Track distribution (use type or category with normalization)
        let track = proposal.type || proposal.category || "Unknown";

        // Apply the same normalization logic as the main statistics
        if (protocol === "ethereum") {
          if (proposal.type === "Standards Track" && proposal.category) {
            // For Standards Track EIPs, use the category but normalize ERC to App
            if (proposal.category === "ERC") {
              track = "App";
            } else {
              track = proposal.category;
            }
          } else {
            // For Meta and Informational, use the type
            track = proposal.type || "Unknown";
          }

          // Additional normalization for any remaining ERC references
          if (track === "ERC") {
            track = "App";
          }
        } else {
          // For other protocols, prioritize type, then category
          if (proposal.type === "Standards Track") {
            // For Standards Track proposals, use category if available, otherwise default to "Core"
            track = proposal.category || "Core";
          } else {
            track = proposal.type || proposal.category || "Unknown";
          }

          // Normalize application-level categories to "App"
          if (track && ["ERC", "SRC", "Contracts", "Contract", "Application", "Applications", "RRC", "ARC"].includes(track)) {
            track = "App";
          }

          // Normalize protocol-specific proposal types to "Core"
          if (track && ["RIP", "AIP", "SNIP"].includes(track)) {
            track = "Core";
          }
        }

        authorData.trackDistribution[track] = (authorData.trackDistribution[track] || 0) + 1;
      });
    });

    // Convert to author stats array
    const authors: AuthorStats[] = Array.from(authorMap.entries()).map(([name, data]) => {
      const totalProposals = data.proposals.length;
      const finalizedProposals = data.finalizedProposals.length;
      const acceptanceRate = totalProposals > 0 ? finalizedProposals / totalProposals : 0;

      // Get first and last proposal dates
      const sortedProposals = data.proposals.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

      return {
        name,
        totalProposals,
        finalizedProposals,
        trackDistribution: data.trackDistribution,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        firstProposal: sortedProposals[0]?.created || "",
        lastProposal: sortedProposals[sortedProposals.length - 1]?.created || "",
      };
    });

    // Sort by total proposals (most active first)
    authors.sort((a, b) => b.totalProposals - a.totalProposals);

    return NextResponse.json({
      success: true,
      protocol,
      authors,
      totalAuthors: authors.length,
      totalFinalizedProposals: proposalsList.filter((p: any) => finalizedStatuses.includes(p.status)).length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`Error fetching authors for protocol:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        protocol: (await context.params).protocol,
      },
      { status: 500 }
    );
  }
}
