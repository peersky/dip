import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProtocolStatsSnapshot } from "@peeramid-labs/dip-database";

export const dynamic = "force-dynamic"; // Ensures the data is fetched fresh on each request.

/**
 * API route to fetch the complete historical time series data for a specific protocol.
 * This powers the "Analytics" tab on the subdomain pages, providing data for
 * trend analysis charts.
 *
 * This endpoint performs the metric calculations on the fly from the snapshot data.
 * This is necessary because the desired metrics (like a proposal-centric Acceptance Rate)
 * are derived from several fields within the snapshot.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ protocol: string }> },
) {
  const { protocol } = await params;

  if (!protocol) {
    return NextResponse.json(
      { success: false, error: "A 'protocol' parameter is required." },
      { status: 400 },
    );
  }

  try {
    // Fetch all historical snapshots for the specified protocol, ordered chronologically.
    const historicalSnapshots = await prisma.protocolStatsSnapshot.findMany({
      where: {
        protocol: protocol,
      },
      orderBy: {
        snapshotDate: "asc",
      },
    });

    if (historicalSnapshots.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No historical data found for this protocol.",
      });
    }

    // Transform the raw snapshot data into a format suitable for time series charts,
    // applying the final, correct metric definitions.
    const timeSeriesData = historicalSnapshots.map((snapshot) => {
      // --- PROPOSAL-CENTRIC ACCEPTANCE RATE ---
      // As per user definition: Finalized / (Total - Withdrawn - Stagnant)
      const statusCounts = snapshot.statusCounts as Record<string, number>;
      const finalizedCount =
        (statusCounts["Final"] || 0) + (statusCounts["Living"] || 0);
      const withdrawnCount = statusCounts["Withdrawn"] || 0;
      const stagnantCount = statusCounts["Stagnant"] || 0;

      // Note: `snapshot.totalProposals` from the DB already excludes moved/deleted proposals.
      const eligibleProposals =
        snapshot.totalProposals - withdrawnCount - stagnantCount;

      const acceptanceRate =
        eligibleProposals > 0 ? finalizedCount / eligibleProposals : 0;

      // --- AUTHOR-CENTRIC CENTRALIZATION RATE ---
      // As per user definition: 1 - (Finalized Authors / Eligible Authors)
      // Note: `distinctAuthorsCount` from the DB already represents authors of eligible (non-withdrawn/stagnant) proposals.
      const eligibleAuthors = snapshot.distinctAuthorsCount;
      const finalizedAuthors = snapshot.authorsOnFinalizedCount;

      const authorSuccessRatio =
        eligibleAuthors > 0 ? finalizedAuthors / eligibleAuthors : 0;
      const centralizationRate = 1 - authorSuccessRatio;

      // --- AUTHOR EFFICIENCY ---
      const proposalsPerAuthor =
        snapshot.distinctAuthorsCount > 0
          ? snapshot.totalProposals / snapshot.distinctAuthorsCount
          : 0;

      return {
        date: `${snapshot.year}-${String(snapshot.month).padStart(2, "0")}`,
        totalProposals: snapshot.totalProposals,
        distinctAuthors: snapshot.distinctAuthorsCount,
        acceptanceRate: parseFloat((acceptanceRate * 100).toFixed(2)),
        centralizationRate: parseFloat((centralizationRate * 100).toFixed(2)),
        proposalsPerAuthor: parseFloat(proposalsPerAuthor.toFixed(2)),
      };
    });

    return NextResponse.json({
      success: true,
      data: timeSeriesData,
    });
  } catch (error: any) {
    console.error(
      `Failed to fetch historical analytics for protocol ${protocol}:`,
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching historical analytics.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
