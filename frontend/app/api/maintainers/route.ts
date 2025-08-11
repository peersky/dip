import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensures the data is fetched fresh on each request.

/**
 * API route to fetch all maintainers and their related information.
 * A "maintainer" is defined as an author who has committed directly to a
 * tracked repository's main branch.
 */
export async function GET() {
  try {
    // Fetch all records from the `Maintainer` table.
    // We use `include` to also fetch the full Author object and the full
    // Repository object that are linked to each maintainer entry. This provides
    // all the necessary data to the frontend in a single query.
    const maintainers = await prisma.maintainer.findMany({
      include: {
        author: true, // Include the full author details
        repository: true, // Include the full repository details
      },
      orderBy: [
        {
          repository: {
            protocol: 'asc'
          }
        },
        {
          author: {
            name: 'asc'
          }
        }
      ]
    });

    return NextResponse.json({
      success: true,
      maintainers,
    });
  } catch (error: any) {
    console.error("Failed to fetch maintainers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching maintainer data.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
