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
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const protocolKey = searchParams.get("protocol") || "ethereum"; // Default to ethereum if not specified
    const search = searchParams.get("search")?.toLowerCase() || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10"); // Default to 10 items per page

    console.log("API: [/api/eips/list] - Fetching proposals with filters:", {
      protocolKey,
      search,
      status,
      type,
      category,
      page,
      limit,
    });

    // Fetch data from Vercel KV
    const [cachedEips, cachedFilters, lastUpdate] = await Promise.all([kv.get<EipListItem[]>(`eips-list:${protocolKey}`), kv.get<FilterOptions>(`eips-filters:${protocolKey}`), kv.get<string>(`eips-last-update:${protocolKey}`)]);

    if (!cachedEips || cachedEips.length === 0) {
      console.warn(`API: [/api/eips/list] - No cached proposals found for protocol: ${protocolKey}. Cron job might not have run yet.`);
      return NextResponse.json({
        success: true,
        data: {
          eips: [],
          protocol: getProtocolConfig(protocolKey),
          pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit, hasNextPage: false, hasPrevPage: false },
          filters: { applied: { search, status, type, category }, options: { statuses: [], types: [], categories: [] } },
        },
        message: `No proposals found for ${protocolKey}. Data might still be generating.`,
        lastUpdate: null,
        timestamp: new Date().toISOString(),
      });
    }

    let filteredEips = [...cachedEips];

    // Apply search filter (on title, description, number, author)
    if (search) {
      filteredEips = filteredEips.filter((eip) => eip.title.toLowerCase().includes(search) || (eip.description && eip.description.toLowerCase().includes(search)) || eip.number.includes(search) || eip.author.toLowerCase().includes(search));
    }

    // Apply status filter
    if (status) {
      filteredEips = filteredEips.filter((eip) => eip.status === status);
    }

    // Apply type filter
    if (type) {
      filteredEips = filteredEips.filter((eip) => eip.type === type);
    }

    // Apply category filter
    if (category) {
      filteredEips = filteredEips.filter((eip) => eip.category === category);
    }

    // Sort by number (descending - assuming higher numbers are newer or more relevant by default)
    // The cron job should ideally sort them if a specific order is desired before caching.
    // For now, let's sort by number numerically, descending.
    filteredEips.sort((a, b) => parseInt(b.number) - parseInt(a.number));

    const totalCount = filteredEips.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedEips = filteredEips.slice(startIndex, startIndex + limit);

    console.log(`API: [/api/eips/list] - Returning ${paginatedEips.length} proposals for ${protocolKey} (page ${page}/${totalPages})`);

    return NextResponse.json({
      success: true,
      data: {
        eips: paginatedEips,
        protocol: getProtocolConfig(protocolKey),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          applied: { search, status, type, category },
          options: cachedFilters || { statuses: [], types: [], categories: [] }, // Use cached filters
        },
      },
      lastUpdate: lastUpdate || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API: [/api/eips/list] - Error fetching proposals:", error);
    const protocolKey = new URL(request.url).searchParams.get("protocol") || "ethereum";
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch proposals list",
        details: error instanceof Error ? error.message : String(error),
        protocol: getProtocolConfig(protocolKey),
        timestamp: new Date().toISOString(),
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
