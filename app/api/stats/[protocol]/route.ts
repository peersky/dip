import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic"; // Ensure fresh data on each request for now

interface RouteContext {
  params: Promise<{ protocol: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { protocol } = await context.params;

  if (!protocol) {
    return NextResponse.json({ success: false, error: "Protocol parameter is required" }, { status: 400 });
  }

  try {
    const stats = await kv.get(`eips-stats:${protocol}`);
    const lastUpdate = await kv.get(`eips-last-update:${protocol}`);

    if (!stats) {
      return NextResponse.json({ success: false, error: `No statistics found for protocol: ${protocol}` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      protocol,
      statistics: stats,
      lastUpdate: lastUpdate || null,
    });
  } catch (error: any) {
    console.error(`Error fetching statistics for ${protocol}:`, error);
    return NextResponse.json({ success: false, error: "Failed to fetch statistics", details: error.message }, { status: 500 });
  }
}
