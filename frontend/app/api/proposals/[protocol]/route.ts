import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensures the data is fetched fresh on each request.

interface RouteContext {
  params: Promise<{
    protocol: string;
  }>;
}

/**
 * A high-performance API route to fetch a list of all proposals for a specific protocol.
 *
 * This endpoint uses a single, optimized raw SQL query with Common Table Expressions (CTEs)
 * to delegate all heavy lifting (finding the latest version, aggregating authors, etc.)
 * to the PostgreSQL database. This is significantly faster and more scalable than
 * fetching all data and processing it in the application layer.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { protocol } = await context.params;
  const { searchParams } = new URL(request.url);

  // Extract and validate sorting and filtering parameters
  const sortBy = searchParams.get("sort_by") || "proposalNumber";
  const sortOrder = searchParams.get("sort_order") || "desc";
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  if (!protocol) {
    return NextResponse.json(
      { success: false, error: "A 'protocol' parameter is required." },
      { status: 400 },
    );
  }

  try {
    // Whitelist allowed columns for sorting to prevent SQL injection
    const allowedSortColumns: { [key: string]: string } = {
      proposalNumber: `CASE WHEN p."proposalNumber" ~ '^[0-9]+$' THEN p."proposalNumber"::INT ELSE 0 END`,
      lastUpdated: `lpv."commitDate"`,
      status: `lpv.status`,
      title: `lpv.title`,
    };

    const sortColumn =
      allowedSortColumns[sortBy] || allowedSortColumns.proposalNumber;
    const orderDirection = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    // Dynamically build the WHERE clause and parameter array
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle the special "ethereum" ecosystem case which includes both EIPs and ERCs
    if (protocol === "ethereum") {
      whereClauses.push(`p."repositoryProtocol" IN ('ethereum', 'erc')`);
    } else {
      whereClauses.push(`p."repositoryProtocol" = $${paramIndex++}`);
      queryParams.push(protocol);
    }

    whereClauses.push(`p.status NOT IN ('Deleted', 'Moved')`);

    if (status) {
      whereClauses.push(`lpv.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    if (type) {
      whereClauses.push(`lpv.type = $${paramIndex++}`);
      queryParams.push(type);
    }
    if (search) {
      whereClauses.push(
        `(lpv.title ILIKE $${paramIndex} OR (aa.authors)::text ILIKE $${paramIndex} OR p."proposalNumber" ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereStatement = whereClauses.join(" AND ");

    const sqlQuery = `
      WITH "LatestProposalVersions" AS (
        SELECT
          pv.id,
          pv."proposalId",
          pv.title,
          pv.status,
          pv.type,
          pv.category,
          pv."commitDate",
          ROW_NUMBER() OVER(PARTITION BY pv."proposalId" ORDER BY pv."commitDate" DESC) as rn
        FROM "ProposalVersion" pv
      ),
      "AggregatedAuthors" AS (
        SELECT
          aopv."proposalVersionId",
          json_agg(COALESCE(a.name, a."githubHandle")) as authors
        FROM "AuthorsOnProposalVersions" aopv
        JOIN "Author" a ON aopv."authorId" = a.id
        GROUP BY aopv."proposalVersionId"
      )
      SELECT
        p."proposalNumber",
        r."proposalPrefix",
        lpv.title,
        lpv.status,
        lpv.type,
        lpv.category,
        COALESCE(aa.authors, '[]'::json) as authors,
        lpv."commitDate" as "lastUpdated"
      FROM "Proposal" p
      JOIN "Repository" r ON p."repositoryOwner" = r.owner AND p."repositoryRepo" = r.repo AND p."repositoryProtocol" = r.protocol
      JOIN "LatestProposalVersions" lpv ON p.id = lpv."proposalId" AND lpv.rn = 1
      LEFT JOIN "AggregatedAuthors" aa ON lpv.id = aa."proposalVersionId"
      WHERE ${whereStatement}
      ORDER BY ${sortColumn} ${orderDirection}, p."proposalNumber" DESC;
    `;

    const proposals = await prisma.$queryRawUnsafe(sqlQuery, ...queryParams);

    return NextResponse.json({
      success: true,
      proposals: proposals,
    });
  } catch (error: any) {
    console.error(
      `Failed to fetch proposal list for protocol ${protocol}:`,
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching the proposal list.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
