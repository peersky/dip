import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(request: NextRequest, { params }: { params: { protocol: string; number: string } }) {
  try {
    const { protocol, number } = params;

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
    console.error(`Error fetching EIP ${params.number}:`, error);
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
