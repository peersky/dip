import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import matter from "gray-matter";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get('protocol') || 'ethereum';
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // Get repository
    const repo = await prisma.repository.findFirst({
      where: { protocol },
    });

    if (!repo) {
      return NextResponse.json({
        success: false,
        error: `No repository found for protocol: ${protocol}`,
      }, { status: 404 });
    }

    // Get sample raw files
    const rawFiles = await prisma.rawFile.findMany({
      where: { repositoryId: repo.id },
      take: limit,
      orderBy: { crawledAt: 'desc' },
      select: {
        id: true,
        githubPath: true,
        rawMarkdown: true,
      },
    });

    const samples = rawFiles.map(file => {
      try {
        const { data: frontmatter } = matter(file.rawMarkdown);
        const frontmatterKeys = Object.keys(frontmatter);

        return {
          path: file.githubPath,
          frontmatterKeys,
          frontmatter: frontmatter,
          hasType: !!frontmatter.type,
          hasCategory: !!frontmatter.category,
          typeValue: frontmatter.type,
          categoryValue: frontmatter.category,
        };
      } catch (error: any) {
        return {
          path: file.githubPath,
          error: error.message,
        };
      }
    });

    // Get statistics on frontmatter fields
    const fieldStats: Record<string, number> = {};
    const typeValues: Record<string, number> = {};
    const categoryValues: Record<string, number> = {};

    samples.forEach(sample => {
      if ('frontmatterKeys' in sample) {
        sample.frontmatterKeys.forEach(key => {
          fieldStats[key] = (fieldStats[key] || 0) + 1;
        });

        if (sample.typeValue) {
          typeValues[sample.typeValue] = (typeValues[sample.typeValue] || 0) + 1;
        }

        if (sample.categoryValue) {
          categoryValues[sample.categoryValue] = (categoryValues[sample.categoryValue] || 0) + 1;
        }
      }
    });

    return NextResponse.json({
      success: true,
      protocol,
      totalFiles: rawFiles.length,
      fieldStats: Object.entries(fieldStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20), // Top 20 most common fields
      typeValues: Object.entries(typeValues)
        .sort(([,a], [,b]) => b - a),
      categoryValues: Object.entries(categoryValues)
        .sort(([,a], [,b]) => b - a),
      samples: samples.slice(0, 5), // First 5 samples for detailed inspection
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}