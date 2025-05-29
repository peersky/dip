import { NextRequest, NextResponse } from "next/server";
import { getTenantInfo } from "./lib/subdomain-utils";

// Define your main domain and known protocol subdomains.
// This should ideally be sourced from the same place as getProtocolConfig if possible,
// or kept in sync.
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname.replace(/^www\./, "") : "dip.box";
const PROTOCOL_SUBDOMAINS = ["ethereum", "rollup", "starknet", "arbitrum", "polygon"]; // Add other protocol subdomains here
const AUTH_SUBDOMAIN = "auth";

// Separate page and API endpoints for clearer management
// const authenticatedPages = [];

// // Modified API routes to use exact matching
// const authenticatedApiRoutes = [];

// Static paths that should bypass middleware
const staticPaths = ["/", "/favicon.ico", "/logo.png", "/advanturista.png", "/clouds.png", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg", "/file.svg"];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone(); // Clone the URL to modify it
  let hostname = request.headers.get("host");

  if (!hostname) {
    // Try to get it from the URL as a fallback (e.g., during Vercel builds or specific environments)
    hostname = url.host;
    if (!hostname) {
      console.warn("Middleware: Hostname not found in headers or URL. Skipping rewrite.");
      return NextResponse.next();
    }
  }

  // For local development, hostname might include the port.
  hostname = hostname.split(":")[0];

  const currentPath = url.pathname;

  // Prevent rewrite for API routes, static assets, and Next.js specific paths
  if (
    currentPath.startsWith("/api/") ||
    currentPath.startsWith("/_next/") ||
    currentPath.startsWith("/static/") ||
    currentPath.startsWith("/favicon.ico") ||
    currentPath.includes(".") // Heuristic for files with extensions like .png, .jpg, .css, .js
  ) {
    return NextResponse.next();
  }

  // Handle subdomain.localhost for local development
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    if (parts.length === 2) {
      // e.g., ethereum.localhost
      const subdomain = parts[0];
      if (PROTOCOL_SUBDOMAINS.includes(subdomain) || subdomain === AUTH_SUBDOMAIN) {
        url.pathname = `/${subdomain}${currentPath}`;
        // console.log(`Middleware: Rewriting ${hostname}${request.nextUrl.pathname} to ${url.pathname}`);
        return NextResponse.rewrite(url);
      }
    }
  } else if (hostname !== MAIN_DOMAIN && hostname.endsWith(`.${MAIN_DOMAIN}`)) {
    // Handle actual subdomains like ethereum.dip.box
    const subdomain = hostname.replace(`.${MAIN_DOMAIN}`, "");
    if (PROTOCOL_SUBDOMAINS.includes(subdomain) || subdomain === AUTH_SUBDOMAIN) {
      url.pathname = `/${subdomain}${currentPath}`;
      // console.log(`Middleware: Rewriting ${hostname}${request.nextUrl.pathname} to ${url.pathname}`);
      return NextResponse.rewrite(url);
    }
  }

  // No rewrite for main domain or unrecognized hostnames
  return NextResponse.next();
}

// Matcher to specify paths where the middleware should run.
// We want it to run on most paths to catch subdomain requests.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|static|favicon.ico|sitemap.xml|robots.txt).*)", // Adjusted matcher
  ],
};
