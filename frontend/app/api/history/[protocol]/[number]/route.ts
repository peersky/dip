import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@peeramid-labs/dip-database";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: {
    protocol: string;
    number: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { protocol, number } = params;

    if (!protocol || !number) {
      return NextResponse.json(
        {
          success: false,
          error: "Protocol and number parameters are required",
        },
        { status: 400 },
      );
    }

    const proposal = await prisma.proposal.findFirst({
      where: {
        proposalNumber: number,
        repositoryProtocol: protocol,
      },
      include: {
        versions: {
          include: {
            _count: {
              select: { authors: true },
            },
          },
          orderBy: {
            commitDate: "asc",
          },
        },
      },
    });

    if (!proposal || !proposal.versions) {
      return NextResponse.json(
        {
          success: false,
          error: `Proposal ${number} not found for protocol ${protocol}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      proposalId: proposal.id,
      proposalNumber: proposal.proposalNumber,
      history: proposal.versions.map((v) => ({
        status: v.status,
        title: v.title,
        contributorCount: v._count.authors,
        githubSha: v.commitSha,
        timestamp: v.commitDate.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error(`Error fetching history for proposal:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch proposal history",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
