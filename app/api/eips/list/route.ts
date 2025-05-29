import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getProtocolConfig } from "@/lib/subdomain-utils";

// Add dynamic configuration for static export
export const dynamic = "force-dynamic";

// Interface for the EIP list items (metadata only, content is not needed here)
interface EipListItem {
  number: string;
  title: string;
  description?: string;
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string;
  discussionsTo?: string;
  requires?: string[];
  protocol: string;
}

interface FilterOptions {
  statuses: string[];
  types: string[];
  categories: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const protocol = searchParams.get("protocol");

    if (!protocol) {
      return NextResponse.json(
        {
          success: false,
          error: "Protocol parameter is required",
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          },
          filters: {
            statuses: [],
            types: [],
            categories: [],
          },
          statistics: null,
          lastUpdate: null,
        },
        { status: 400 }
      );
    }

    const status = searchParams.get("status");
    const track = searchParams.get("track");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    console.log(`Fetching EIPs for protocol: ${protocol}`);
    console.log(`Request URL: ${request.url}`);
    console.log(`Params:`, { protocol, status, track, search, page, limit });

    // Fetch cached data from KV
    const [eipsList, filtersData, statsData, lastUpdate] = await Promise.all([kv.get(`eips-list:${protocol}`), kv.get(`eips-filters:${protocol}`), kv.get(`eips-stats:${protocol}`), kv.get(`eips-last-update:${protocol}`)]);

    console.log(`Cache check for protocol ${protocol}:`);
    console.log(`- eips-list:${protocol} found:`, !!eipsList, Array.isArray(eipsList) ? eipsList.length : "not array");
    console.log(`- eips-filters:${protocol} found:`, !!filtersData);
    console.log(`- eips-stats:${protocol} found:`, !!statsData);
    console.log(`- eips-last-update:${protocol} found:`, !!lastUpdate);

    if (!eipsList || !Array.isArray(eipsList)) {
      console.log(`No cached data found for protocol: ${protocol}`);

      // Let's also check what keys exist in KV for debugging
      console.log("Checking available KV keys...");
      try {
        // Try to get all available keys (this may not work in all KV implementations)
        const allKeys = await kv.keys("eips-list:*");
        console.log("Available eips-list keys:", allKeys);
      } catch (error) {
        console.log("Could not fetch all keys:", error);
      }

      return NextResponse.json({
        success: false,
        error: "No data available for this protocol. Run the static generation cron job first.",
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: limit,
          totalPages: 0,
        },
        filters: {
          statuses: [],
          types: [],
          categories: [],
        },
        statistics: null,
        lastUpdate: null,
      });
    }

    let filteredEips = [...eipsList];
    console.log(`Starting with ${filteredEips.length} total EIPs`);

    // Apply filters
    if (status) {
      const beforeStatusFilter = filteredEips.length;
      filteredEips = filteredEips.filter((eip) => eip.status === status);
      console.log(`After status filter (${status}): ${filteredEips.length} EIPs (filtered out ${beforeStatusFilter - filteredEips.length})`);
    }
    if (track) {
      const beforeTrackFilter = filteredEips.length;
      filteredEips = filteredEips.filter((eip) => {
        // Apply the same track normalization logic as used in statistics generation
        let eipTrack = eip.type || eip.category || "Unknown";

        // Apply the same normalization logic as the cron job
        if (protocol === "ethereum") {
          if (eip.type === "Standards Track" && eip.category) {
            // For Standards Track EIPs, use the category but normalize ERC to App
            if (eip.category === "ERC") {
              eipTrack = "App";
            } else {
              eipTrack = eip.category;
            }
          } else {
            // For Meta and Informational, use the type
            eipTrack = eip.type || "Unknown";
          }

          // Additional normalization for any remaining ERC references
          if (eipTrack === "ERC") {
            eipTrack = "App";
          }
        } else {
          // For other protocols, prioritize type, then category
          if (eip.type === "Standards Track") {
            // For Standards Track proposals, use category if available, otherwise default to "Core"
            eipTrack = eip.category || "Core";
          } else {
            eipTrack = eip.type || eip.category || "Unknown";
          }

          // Normalize application-level categories to "App"
          if (eipTrack && ["ERC", "SRC", "Contracts", "Contract", "Application", "Applications", "RRC", "ARC"].includes(eipTrack)) {
            eipTrack = "App";
          }

          // Normalize protocol-specific proposal types to "Core"
          if (eipTrack && ["RIP", "AIP", "SNIP", "PIP"].includes(eipTrack)) {
            eipTrack = "Core";
          }
        }

        const matches = eipTrack === track;
        if (beforeTrackFilter <= 10) {
          // Only log first few for debugging
          console.log(`EIP-${eip.number}: type="${eip.type}", category="${eip.category}" -> normalized track="${eipTrack}", matches filter "${track}": ${matches}`);
        }
        return matches;
      });
      console.log(`After track filter (${track}): ${filteredEips.length} EIPs (filtered out ${beforeTrackFilter - filteredEips.length})`);
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEips = filteredEips.filter((eip) => eip.title.toLowerCase().includes(searchLower) || eip.description?.toLowerCase().includes(searchLower) || eip.author.toLowerCase().includes(searchLower) || eip.number.includes(search));
    }

    // Sort by EIP number (descending)
    filteredEips.sort((a, b) => parseInt(b.number) - parseInt(a.number));

    // Pagination
    const total = filteredEips.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedEips = filteredEips.slice(offset, offset + limit);

    console.log(`Returning ${paginatedEips.length} EIPs (${total} total) for protocol: ${protocol}`);

    return NextResponse.json({
      success: true,
      data: paginatedEips,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      filters: filtersData || { statuses: [], types: [], categories: [] },
      statistics: statsData || null,
      lastUpdate: lastUpdate || null,
      protocol,
    });
  } catch (error: any) {
    console.error("Error fetching EIPs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch EIPs",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Optional: POST handler for health check or alternative triggering if needed
export async function POST(request: NextRequest) {
  const protocolKey = new URL(request.url).searchParams.get("protocol") || "default";
  return NextResponse.json({
    message: `EIPs list API endpoint is healthy for protocol: ${protocolKey}`,
    timestamp: new Date().toISOString(),
  });
}
