import { NextRequest, NextResponse } from "next/server";
import { getProtocolConfig } from "@/lib/subdomain-utils";

// Add dynamic configuration for static export
export const dynamic = "force-dynamic";

interface EipListItem {
  number: string;
  title: string;
  description: string;
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string;
}

// Mock data for different protocols
const mockEipsData: Record<string, EipListItem[]> = {
  ethereum: [
    {
      number: "1",
      title: "EIP Purpose and Guidelines",
      description: "This EIP provides guidelines and standards for creating EIPs.",
      author: "Martin Becze, Hudson Jameson",
      status: "Living",
      type: "Meta",
      created: "2015-10-27",
      lastModified: "2023-02-01",
    },
    {
      number: "20",
      title: "Token Standard",
      description: "A standard interface for tokens.",
      author: "Fabian Vogelsteller, Vitalik Buterin",
      status: "Final",
      type: "Standards Track",
      category: "ERC",
      created: "2015-11-19",
      lastModified: "2023-01-15",
    },
    {
      number: "721",
      title: "Non-Fungible Token Standard",
      description: "A standard interface for non-fungible tokens.",
      author: "William Entriken, Dieter Shirley, Jacob Evans, Nastassia Sachs",
      status: "Final",
      type: "Standards Track",
      category: "ERC",
      created: "2018-01-24",
      lastModified: "2023-01-10",
    },
    {
      number: "1559",
      title: "Fee market change for ETH 1.0 chain",
      description: "A transaction pricing mechanism that includes fixed-per-block network fee.",
      author: "Vitalik Buterin, Eric Conner, Rick Dudley, Matthew Slipper, Ian Norden, Abdelhamid Bakhta",
      status: "Final",
      type: "Standards Track",
      category: "Core",
      created: "2019-04-13",
      lastModified: "2023-01-05",
    },
  ],
  rollup: [
    {
      number: "1",
      title: "RIP Purpose and Guidelines",
      description: "This RIP provides guidelines and standards for creating RIPs.",
      author: "Rollup Foundation",
      status: "Living",
      type: "Meta",
      created: "2023-01-01",
      lastModified: "2023-12-01",
    },
    {
      number: "2",
      title: "Rollup Interoperability Standard",
      description: "A standard for cross-rollup communication.",
      author: "Rollup Team",
      status: "Draft",
      type: "Standards Track",
      category: "Core",
      created: "2023-06-15",
      lastModified: "2023-11-15",
    },
  ],
  starknet: [
    {
      number: "1",
      title: "SNIP Purpose and Guidelines",
      description: "This SNIP provides guidelines and standards for creating SNIPs.",
      author: "Starknet Foundation",
      status: "Living",
      type: "Meta",
      created: "2022-01-01",
      lastModified: "2023-12-01",
    },
    {
      number: "2",
      title: "Cairo Contract Standard",
      description: "A standard interface for Cairo smart contracts.",
      author: "Starknet Team",
      status: "Final",
      type: "Standards Track",
      category: "Core",
      created: "2022-03-15",
      lastModified: "2023-10-15",
    },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const protocol = searchParams.get("protocol") || "ethereum";
    const search = searchParams.get("search")?.toLowerCase() || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    console.log("📋 Fetching EIPs list with filters:", {
      protocol,
      search,
      status,
      type,
      category,
      page,
      limit,
    });

    // Get protocol configuration
    const protocolConfig = getProtocolConfig(protocol);

    // Get mock data for the protocol
    const mockEips = mockEipsData[protocol] || mockEipsData.ethereum;

    // In a real implementation, this would fetch from cached data based on protocol
    let filteredEips = [...mockEips];

    // Apply search filter
    if (search) {
      filteredEips = filteredEips.filter((eip) => eip.title.toLowerCase().includes(search) || eip.description.toLowerCase().includes(search) || eip.number.includes(search) || eip.author.toLowerCase().includes(search));
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

    // Sort by number (descending - newest first)
    filteredEips.sort((a, b) => parseInt(b.number) - parseInt(a.number));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEips = filteredEips.slice(startIndex, endIndex);

    // Calculate metadata
    const totalCount = filteredEips.length;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Generate filter options from all EIPs (not just filtered ones)
    const filterOptions = {
      statuses: [...new Set(mockEips.map((eip) => eip.status))].sort(),
      types: [...new Set(mockEips.map((eip) => eip.type))].sort(),
      categories: [...new Set(mockEips.map((eip) => eip.category).filter(Boolean))].sort(),
    };

    console.log(`✅ Returning ${paginatedEips.length} ${protocolConfig.proposalPrefix}s (page ${page}/${totalPages})`);

    return NextResponse.json({
      success: true,
      data: {
        eips: paginatedEips,
        protocol: protocolConfig,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          applied: { search, status, type, category },
          options: filterOptions,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching EIPs list:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch EIPs list",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: "EIPs list API endpoint is healthy",
    timestamp: new Date().toISOString(),
    mockDataCount: mockEipsData.ethereum.length,
  });
}
