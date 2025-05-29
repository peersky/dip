import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantInfo } from "./lib/subdomain-utils";

// Separate page and API endpoints for clearer management
// const authenticatedPages = [];

// // Modified API routes to use exact matching
// const authenticatedApiRoutes = [];

// Static paths that should bypass middleware
const staticPaths = ["/", "/favicon.ico", "/logo.png", "/advanturista.png", "/clouds.png", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg", "/file.svg"];

export async function middleware(request: NextRequest) {
  console.log("middleware");
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const tenantInfo = getTenantInfo(hostname);

  // Clone the URL to modify it
  const url = request.nextUrl.clone();

  // Add tenant info to headers for use in components
  const response = NextResponse.next();
  response.headers.set("x-tenant-subdomain", tenantInfo.subdomain);
  response.headers.set("x-tenant-protocol", tenantInfo.protocol);
  response.headers.set("x-tenant-is-auth", tenantInfo.isAuthDomain.toString());
  response.headers.set("x-tenant-is-main", tenantInfo.isMainDomain.toString());

  // Handle auth domain routing
  if (tenantInfo.isAuthDomain) {
    // Auth domain should only handle OAuth callbacks
    if (!url.pathname.startsWith("/auth/")) {
      // Redirect to main domain for non-auth routes
      url.hostname = "dip.box";
      return NextResponse.redirect(url);
    }
  }

  // Skip middleware for:
  // 1. Static files
  // 2. Next.js internal requests
  // 3. Static paths
  // 4. Data requests for static paths
  if (
    pathname.startsWith("/_next/") || // Next.js internal
    pathname.includes(".") || // Static files
    staticPaths.includes(pathname) || // Static paths
    (pathname.startsWith("/_next/data/") && pathname.endsWith("/index.json")) // Data requests for index
  ) {
    return NextResponse.next();
  }

  // Create response after authentication check
  const responseAfterAuth = NextResponse.next();

  // For all requests, ensure the Cache-Control headers are set properly
  responseAfterAuth.headers.set("Cache-Control", "no-store, must-revalidate, max-age=0");
  responseAfterAuth.headers.set("Pragma", "no-cache");
  responseAfterAuth.headers.set("Expires", "0");

  return responseAfterAuth;
}

// Update the matcher to use exact matching instead of wildcards for the API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
