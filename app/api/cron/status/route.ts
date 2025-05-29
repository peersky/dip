import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const repositories = await prisma.repository.findMany({
      include: {
        _count: {
          select: {
            rawFiles: true,
            crawlRuns: true,
          },
        },
        crawlRuns: {
          take: 3,
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            totalFilesFound: true,
            totalProcessed: true,
            totalErrors: true,
          },
        },
      },
    });

    const totalRawFiles = await prisma.rawFile.count();
    const totalCrawlRuns = await prisma.crawlRun.count();

    return NextResponse.json({
      success: true,
      summary: {
        totalRepositories: repositories.length,
        totalRawFiles,
        totalCrawlRuns,
      },
      repositories: repositories.map((repo) => ({
        id: repo.id,
        name: `${repo.owner}/${repo.repo}`,
        protocol: repo.protocol,
        enabled: repo.enabled,
        rawFilesCount: repo._count.rawFiles,
        crawlRunsCount: repo._count.crawlRuns,
        recentCrawls: repo.crawlRuns,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
