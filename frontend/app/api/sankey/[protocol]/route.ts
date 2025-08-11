import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface StatusEvent {
  status: string;
}

/**
 * A high-performance API route to fetch and calculate the data for a Sankey diagram.
 *
 * This endpoint performs a sophisticated "state machine" analysis on the entire
 * history of every proposal to generate a clean, acyclic graph of the proposal
 * lifecycle. It is designed to fulfill the user's specific request to "eliminate"
 * noisy, back-and-forth status changes and only show the net forward progress.
 *
 * The process is as follows:
 * 1. Fetch the full, ordered history of status changes for every proposal.
 * 2. Define a strict numerical hierarchy for statuses to determine "forward" movement.
 * 3. For each proposal, "collapse" its history into a simplified, forward-only trace.
 *    This is the key step that removes circular flows.
 * 4. Aggregate the transitions from all the clean traces.
 * 5. Format the final data structure for the Nivo charting library.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { protocol: string } },
) {
  const { protocol } = params;

  if (!protocol) {
    return NextResponse.json(
      { success: false, error: "A 'protocol' parameter is required." },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch all relevant version histories for the protocol, ordered chronologically.
    const allVersions = await prisma.proposalVersion.findMany({
      where: {
        proposal: {
          repositoryProtocol: protocol,
          status: { notIn: ["Moved", "Deleted"] },
        },
        status: { not: "Unknown" }, // Per request, filter out Unknown statuses.
      },
      select: {
        proposalId: true,
        status: true,
        commitDate: true,
      },
      orderBy: [{ proposalId: "asc" }, { commitDate: "asc" }],
    });

    // Group all status events by their proposalId, removing consecutive duplicates.
    const histories = allVersions.reduce<Record<string, StatusEvent[]>>(
      (acc, version) => {
        if (!acc[version.proposalId]) {
          acc[version.proposalId] = [];
        }
        if (
          acc[version.proposalId][acc[version.proposalId].length - 1]
            ?.status !== version.status
        ) {
          acc[version.proposalId].push({ status: version.status });
        }
        return acc;
      },
      {},
    );

    // 2a. Define a mapping to collapse redundant statuses into their canonical form.
    const statusMap: Record<string, string> = {
      Accepted: "Final",
      Abandoned: "Withdrawn",
      Superseded: "Withdrawn",
      Deferred: "Withdrawn",
      Replaced: "Withdrawn",
    };

    // 2b. Define a strict numerical hierarchy for the cleaned statuses.
    const statusRank: Record<string, number> = {
      Idea: 0,
      Draft: 1,
      Review: 2,
      "Last Call": 3,
      Final: 4,
      Living: 4,
      // Terminal statuses are given the highest rank.
      Withdrawn: 5,
      Stagnant: 5,
    };

    // 3. For each proposal, "collapse" its history into a simplified, forward-only trace.
    const transitions = new Map<string, number>();

    for (const proposalId in histories) {
      const history = histories[proposalId];
      if (history.length < 2) continue; // Can't have a transition with less than 2 events.

      const simplifiedTrace: string[] = [];
      for (const event of history) {
        // Collapse the status if a mapping exists, otherwise use the original.
        const currentStatus = statusMap[event.status] || event.status;
        const currentRank = statusRank[currentStatus];

        if (currentRank === undefined) continue; // Skip any status not in our hierarchy.

        let lastStatusInTrace = simplifiedTrace[simplifiedTrace.length - 1];
        let lastRankInTrace = lastStatusInTrace
          ? statusRank[lastStatusInTrace]
          : -1;

        // The core "cycle collapse" logic: while the current status is a step backwards
        // (or at the same level), pop the last status from our simplified trace.
        while (simplifiedTrace.length > 0 && currentRank <= lastRankInTrace) {
          simplifiedTrace.pop();
          lastStatusInTrace = simplifiedTrace[simplifiedTrace.length - 1];
          lastRankInTrace = lastStatusInTrace
            ? statusRank[lastStatusInTrace]
            : -1;
        }
        simplifiedTrace.push(currentStatus);
      }

      // 4. Generate links from the final, clean trace.
      for (let i = 0; i < simplifiedTrace.length - 1; i++) {
        const source = simplifiedTrace[i];
        const target = simplifiedTrace[i + 1];
        const key = `${source}|${target}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }
    }

    // 5. Format the aggregated data for the Nivo charting library.
    const links = Array.from(transitions.entries()).map(([key, value]) => {
      const [source, target] = key.split("|");
      return { source, target, value };
    });

    const nodeSet = new Set<string>();
    links.forEach((link) => {
      nodeSet.add(link.source);
      nodeSet.add(link.target);
    });

    const nodes = Array.from(nodeSet).map((name) => ({ id: name, name }));

    return NextResponse.json({
      success: true,
      data: { nodes, links },
    });
  } catch (error: any) {
    console.error(
      `Failed to fetch Sankey data for protocol ${protocol}:`,
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching Sankey diagram data.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
