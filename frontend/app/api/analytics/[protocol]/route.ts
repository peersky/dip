import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensures the data is fetched fresh on each request.

/**
 * API route to fetch the complete historical time series data for a specific protocol.
 * This powers the "Analytics" tab on the subdomain pages, providing data for
 * trend analysis charts.
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

    // Transform the raw snapshot data into a format suitable for time series charts.
    const timeSeriesData = historicalSnapshots.map((snapshot) => {
      const acceptanceRate =
        snapshot.distinctAuthorsCount > 0
          ? snapshot.authorsOnFinalizedCount / snapshot.distinctAuthorsCount
          : 0;
      const centralizationRate = 1 - acceptanceRate;

      const proposalsPerAuthor =
        snapshot.distinctAuthorsCount > 0
          ? snapshot.totalProposals / snapshot.distinctAuthorsCount
          : 0;

      return {
        // Format the date as YYYY-MM for clean chart labels.
        date: `${snapshot.year}-${String(snapshot.month).padStart(2, "0")}`,
        totalProposals: snapshot.totalProposals,
        distinctAuthors: snapshot.distinctAuthorsCount,
        // Return rates as percentages.
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
