import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * This API endpoint retrieves pre-aggregated historical statistics for the entire ecosystem.
 * It is highly efficient as it queries a summary table instead of calculating on the fly.
 */
export async function GET() {
  try {
    // Fetch all pre-aggregated global snapshots, ordered by date.
    const historicalData = await prisma.globalStatsSnapshot.findMany({
      orderBy: {
        snapshotDate: "asc",
      },
    });

    if (historicalData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No pre-calculated historical data found.",
      });
    }

    // Format the data for the frontend chart.
    const timeSeriesData = historicalData.map((snapshot) => ({
      date: `${snapshot.year}-${String(snapshot.month).padStart(2, "0")}`,
      Proposals: snapshot.totalProposals,
      Authors: snapshot.distinctAuthorsCount,
      "Acceptance Rate": parseFloat((snapshot.acceptanceRate * 100).toFixed(2)),
      "Centralization Rate": parseFloat(
        (snapshot.centralizationRate * 100).toFixed(2),
      ),
    }));

    return NextResponse.json({
      success: true,
      data: timeSeriesData,
    });
  } catch (error: any) {
    console.error(
      "Failed to fetch pre-aggregated historical statistics:",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching historical statistics.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
