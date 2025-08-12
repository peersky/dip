import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Define a type for the raw query result for better type safety.
// Note: Prisma raw queries on PostgreSQL might return snake_case column names
// depending on the query, but here we are aliasing and selecting explicitly
// so we expect camelCase based on the model.
type LatestSnapshot = {
  protocol: string;
  snapshotDate: Date;
  totalProposals: number;
  distinctAuthorsCount: number;
  authorsOnFinalizedCount: number;
};

export const dynamic = "force-dynamic"; // Ensure fresh data on each request

export async function GET() {
  try {
    // This raw query is the most efficient way to get the single latest snapshot for each protocol.
    // It's a common SQL pattern known as "greatest-n-per-group".
    const latestSnapshots = await prisma.$queryRaw<LatestSnapshot[]>`
      SELECT
          p1.protocol,
          p1."snapshotDate",
          p1."totalProposals",
          p1."distinctAuthorsCount",
          p1."authorsOnFinalizedCount"
      FROM
          "ProtocolStatsSnapshot" AS p1
      INNER JOIN (
          SELECT
              protocol,
              MAX("snapshotDate") AS max_date
          FROM
              "ProtocolStatsSnapshot"
          GROUP BY
              protocol
      ) AS p2 ON p1.protocol = p2.protocol AND p1."snapshotDate" = p2.max_date
    `;

    // Fetch all repository configurations that are currently enabled.
    const repositories = await prisma.repository.findMany({
      where: {
        enabled: true,
      },
      select: {
        protocol: true,
        description: true,
        website: true,
        ecosystem: true,
        proposalPrefix: true,
        owner: true,
        repo: true,
      },
    });

    // Create a map for efficient lookup of repository info by protocol.
    const repositoryMap = new Map(
      repositories.map((repo) => [repo.protocol, repo]),
    );

    // Combine the snapshot data with repository metadata.
    // This creates a rich object perfect for rendering cards on the frontend.
    const combinedData = latestSnapshots.map((snapshot) => {
      const repoInfo = repositoryMap.get(snapshot.protocol);

      // Calculate the centralization rate.
      // A rate of 0 means perfect decentralization (all authors have finalized work).
      // A rate closer to 1 means high centralization (few authors have finalized work).
      const centralizationRate =
        snapshot.distinctAuthorsCount > 0
          ? 1 - snapshot.authorsOnFinalizedCount / snapshot.distinctAuthorsCount
          : 0;

      return {
        // Spread the fields from the snapshot
        protocol: snapshot.protocol,
        snapshotDate: snapshot.snapshotDate,
        totalProposals: snapshot.totalProposals,
        distinctAuthorsCount: snapshot.distinctAuthorsCount,
        // Add the newly calculated field
        centralizationRate,
        // Add relevant info from the repository config
        description: repoInfo?.description ?? null,
        website: repoInfo?.website ?? null,
        ecosystem: repoInfo?.ecosystem ?? null,
        proposalPrefix: repoInfo?.proposalPrefix ?? null,
        owner: repoInfo?.owner ?? null,
        repo: repoInfo?.repo ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: combinedData,
    });
  } catch (error: any) {
    console.error("Failed to fetch all protocol stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching protocol statistics.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
