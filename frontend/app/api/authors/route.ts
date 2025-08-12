import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * A high-performance API route to fetch authors and their contribution statistics.
 *
 * This endpoint uses a single, optimized raw SQL query to delegate all heavy
 * lifting (counting, aggregation, JSON building) to the PostgreSQL database.
 * This is significantly faster and more scalable than fetching all data and
 * processing it in the application layer.
 *
 * It supports filtering by protocol via a query parameter (e.g., /api/authors?protocol=ethereum).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get("protocol");

  if (!protocol) {
    return NextResponse.json(
      { success: false, error: "A 'protocol' query parameter is required." },
      { status: 400 },
    );
  }

  try {
    // This CTE-based (Common Table Expression) query is designed for performance.
    // Each CTE handles a specific part of the aggregation, allowing the database
    // to efficiently plan and execute the query.
    const sqlQuery = `
      WITH "AuthorRepoContributions" AS (
        -- Step 1: Count each author's distinct proposals per repository for the given protocol.
        SELECT
          a.id AS "authorId",
          p."repositoryRepo",
          COUNT(DISTINCT p.id) AS "contributionCount"
        FROM "Author" a
        JOIN "AuthorsOnProposalVersions" aopv ON a.id = aopv."authorId"
        JOIN "ProposalVersion" pv ON aopv."proposalVersionId" = pv.id
        JOIN "Proposal" p ON pv."proposalId" = p.id
        WHERE
          ($1 = 'all' OR p."repositoryProtocol" = $1)
        GROUP BY
          a.id, p."repositoryRepo"
      ),
      "AuthorRepoContributionsJson" AS (
        -- Step 2: Aggregate the per-repo counts from the previous step into a single JSON object for each author.
        SELECT
          "authorId",
          jsonb_object_agg("repositoryRepo", "contributionCount") AS "contributionByRepo"
        FROM "AuthorRepoContributions"
        GROUP BY "authorId"
      ),
      "AuthorTotalContributions" AS (
        -- Step 3: Calculate the total and finalized distinct proposal counts for each author.
        SELECT
          a.id AS "authorId",
          COUNT(DISTINCT p.id) AS "totalContributions",
          COUNT(DISTINCT CASE WHEN pv.status IN ('Final', 'Living') THEN p.id END) AS "finalizedContributions"
        FROM "Author" a
        JOIN "AuthorsOnProposalVersions" aopv ON a.id = aopv."authorId"
        JOIN "ProposalVersion" pv ON aopv."proposalVersionId" = pv.id
        JOIN "Proposal" p ON pv."proposalId" = p.id
        WHERE
          ($1 = 'all' OR p."repositoryProtocol" = $1)
        GROUP BY
          a.id
      ),
      "TotalFinalized" AS (
        -- Step 4: Calculate the total number of finalized proposals across the entire scope.
        -- This is the denominator for the influence score.
        SELECT COUNT(DISTINCT p.id) as "total"
        FROM "ProposalVersion" pv
        JOIN "Proposal" p ON pv."proposalId" = p.id
        WHERE pv.status IN ('Final', 'Living')
        AND ($1 = 'all' OR p."repositoryProtocol" = $1)
      )
      -- Final Step: Join all the aggregated stats back to the Author table.
      SELECT
        a.id,
        a.name,
        a."githubHandle",
        a.email,
        COALESCE(tc."totalContributions", 0)::int AS "totalContributions",
        COALESCE(tc."finalizedContributions", 0)::int AS "finalizedContributions",
        COALESCE(arcj."contributionByRepo", '{}'::jsonb) AS "contributionByRepo",
        -- Calculate the influence score as a percentage of total finalized proposals.
        (COALESCE(tc."finalizedContributions", 0) * 100.0 / NULLIF((SELECT "total" FROM "TotalFinalized"), 0)) AS "influenceScore"
      FROM
        "Author" a
      -- We join on the total contributions to ensure we only get authors relevant to the filter.
      JOIN "AuthorTotalContributions" tc ON a.id = tc."authorId"
      -- We LEFT JOIN the repo breakdown as an author might have contributions but not a repo breakdown (edge case).
      LEFT JOIN "AuthorRepoContributionsJson" arcj ON a.id = arcj."authorId"
      -- Cross join is fine here as TotalFinalized will always have exactly one row.
      CROSS JOIN "TotalFinalized"
      ORDER BY
        "influenceScore" DESC NULLS LAST, "finalizedContributions" DESC;
    `;

    const authors = await prisma.$queryRawUnsafe(sqlQuery, protocol);

    return NextResponse.json({
      success: true,
      authors: authors,
    });
  } catch (error: any) {
    console.error(`Failed to fetch authors for protocol ${protocol}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching author data.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
