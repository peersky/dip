import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensure fresh data on each request

interface RouteContext {
  params: Promise<{ protocol: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { protocol } = await context.params;

  if (!protocol) {
    return NextResponse.json(
      { success: false, error: "Protocol parameter is required" },
      { status: 400 },
    );
  }

  try {
    // Find the latest snapshot for the protocol from the database
    const latestSnapshot = await prisma.protocolStatsSnapshot.findFirst({
      where: { protocol: protocol },
      orderBy: { snapshotDate: "desc" },
      include: {
        tracks: true, // Include the related track stats snapshots
      },
    });

    if (!latestSnapshot) {
      return NextResponse.json(
        {
          success: false,
          error: `No statistics found for protocol: ${protocol}`,
        },
        { status: 404 },
      );
    }

    // --- New Query for Average Time in Stage ---
    const averageTimeInStageQuery = `
      WITH "VersionDurations" AS (
        SELECT
          pv.status,
          pv."commitDate",
          LEAD(pv."commitDate", 1) OVER (PARTITION BY pv."proposalId" ORDER BY pv."commitDate" ASC) as "nextCommitDate"
        FROM "ProposalVersion" pv
        JOIN "Proposal" p ON pv."proposalId" = p.id
        WHERE p."repositoryProtocol" = $1 AND p.status NOT IN ('Moved', 'Deleted')
      )
      SELECT
        status,
        AVG(EXTRACT(EPOCH FROM ("nextCommitDate" - "commitDate")) / 86400) as "averageDays"
      FROM "VersionDurations"
      WHERE "nextCommitDate" IS NOT NULL AND status IN ('Draft', 'Review', 'Last Call')
      GROUP BY status
      ORDER BY "averageDays" DESC;
    `;

    const averageTimeInStageResult: {
      status: string;
      averageDays: number;
    }[] = await prisma.$queryRawUnsafe(averageTimeInStageQuery, protocol);

    const averageTimeInStage = Object.fromEntries(
      averageTimeInStageResult.map((row) => [
        row.status,
        parseFloat(row.averageDays.toFixed(1)),
      ]),
    );
    // --- End New Query ---

    // The frontend expects a `tracksBreakdown` object, so we transform the array
    const tracksBreakdown: Record<string, any> = {};
    latestSnapshot.tracks.forEach((track) => {
      // Simple acceptance score calculation for the track
      const acceptanceScoreForTrack =
        track.totalProposalsInTrack > 0
          ? track.finalizedProposalsInTrack / track.totalProposalsInTrack
          : 0;

      tracksBreakdown[track.trackName] = {
        totalProposalsInTrack: track.totalProposalsInTrack,
        finalizedProposalsInTrack: track.finalizedProposalsInTrack,
        distinctAuthorsInTrackCount: track.distinctAuthorsInTrackCount,
        authorsOnFinalizedInTrackCount: track.authorsOnFinalizedInTrackCount,
        statusCountsInTrack: track.statusCountsInTrack,
        acceptanceScoreForTrack: acceptanceScoreForTrack,
      };
    });

    // Calculate the overall acceptance score for the protocol
    const acceptanceScore =
      latestSnapshot.distinctAuthorsCount > 0
        ? latestSnapshot.authorsOnFinalizedCount /
          latestSnapshot.distinctAuthorsCount
        : 0;

    // Construct the final statistics object in the shape the frontend expects
    const statistics = {
      totalProposals: latestSnapshot.totalProposals,
      distinctAuthorsCount: latestSnapshot.distinctAuthorsCount,
      authorsOnFinalizedCount: latestSnapshot.authorsOnFinalizedCount,
      totalWordCount: latestSnapshot.totalWordCount,
      averageWordCount: latestSnapshot.averageWordCount,
      statusCounts: latestSnapshot.statusCounts,
      typeCounts: latestSnapshot.typeCounts,
      yearCounts: latestSnapshot.yearCounts,
      acceptanceScore: acceptanceScore,
      tracksBreakdown: tracksBreakdown,
      lastUpdated: latestSnapshot.snapshotDate.toISOString(),
      averageTimeInStage,
    };

    return NextResponse.json({
      success: true,
      protocol,
      statistics: statistics,
      lastUpdate: latestSnapshot.snapshotDate.toISOString(),
    });
  } catch (error: any) {
    console.error(`Error fetching statistics for ${protocol}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch statistics",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
