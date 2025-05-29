import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface RouteContext {
  params: Promise<{ protocol: string; number: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { protocol, number } = await context.params;

    console.log(`Fetching EIP ${number} for protocol: ${protocol}`);

    // Fetch individual EIP from cache
    const eip = await kv.get(`eip:${protocol}:${number}`);

    if (!eip) {
      return NextResponse.json(
        {
          success: false,
          error: `EIP ${number} not found for protocol ${protocol}`,
          details: "This EIP might not exist or the data hasn't been cached yet. Run the static generation cron job.",
        },
        { status: 404 }
      );
    }

    console.log(`Found EIP ${number} for protocol: ${protocol}`);

    return NextResponse.json({
      success: true,
      data: eip,
      protocol,
      number,
    });
  } catch (error: any) {
    const { number } = await context.params;
    console.error(`Error fetching EIP ${number}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch EIP",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
