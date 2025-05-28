import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { getTenantInfo } from "./lib/subdomain-utils";

// Explicitly set Node.js runtime for middleware - needed for PrivyClient
export const runtime = "nodejs";

// Separate page and API endpoints for clearer management
const authenticatedPages = ["/activity", "/activity/user-activity", "/proposals", "/dashboard/country-data", "/dashboard/stats", "/settings", "/dashboard", "/onboarding", "/dashboard/user-data", "/dashboard/country-data", "/activity/user-activity"];

// Modified API routes to use exact matching
const authenticatedApiRoutes = ["/api/generate-proposal", "/api/refine-proposal", "/api/proposals", "/api/user-settings", "/api/country-data", "/api/user-activity", "/api/dashboard/stats", "/api/dashboard/user-data", "/api/dashboard/country-data", "/api/activity/user-activity", "/api/admin/ai-approvals"];

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

  // Handle main domain routing
  if (tenantInfo.isMainDomain) {
    // The main domain (e.g., dip.box) will be handled by app/page.tsx
    // to show protocol cards. No redirect needed here.
    // If specific paths on the main domain needed different handling,
    // it could be added here.
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

  // Check if this is an API route
  const isApiRoute = pathname.startsWith("/api/");
  console.log("pathname", pathname);

  // Check if the path requires authentication
  // For API routes, use exact matching or prefix matching to avoid issues with trailing slashes
  const requiresAuth = isApiRoute ? authenticatedApiRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) : authenticatedPages.some((page) => pathname.includes(page));

  // Create response after authentication check
  const responseAfterAuth = NextResponse.next();

  // For all requests, ensure the Cache-Control headers are set properly
  responseAfterAuth.headers.set("Cache-Control", "no-store, must-revalidate, max-age=0");
  responseAfterAuth.headers.set("Pragma", "no-cache");
  responseAfterAuth.headers.set("Expires", "0");

  if (requiresAuth) {
    try {
      const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
      const privyAppSecret = process.env.PRIVY_SECRET;

      if (!privyAppId || !privyAppSecret) {
        console.error("Missing Privy configuration");
        if (isApiRoute) {
          return NextResponse.json(
            {
              error: "Server configuration error",
              details: "Authentication service is not properly configured",
            },
            {
              status: 500,
              headers: {
                "Cache-Control": "no-store, must-revalidate, max-age=0",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );
        }
        return NextResponse.redirect(new URL("/", request.url));
      }

      const privy = new PrivyClient(privyAppId, privyAppSecret);
      const idToken = request.cookies.get("privy-id-token")?.value;
      if (!idToken) {
        throw new Error("No privy-id-token found");
      }
      const user = await privy.getUser({ idToken });
      const walletAddress = user?.wallet?.address;

      if (!walletAddress) {
        throw new Error("No walletAddress found");
      }
      const accessToken = request.cookies.get("privy-token")?.value;

      if (!accessToken) {
        if (isApiRoute) {
          return NextResponse.json(
            {
              error: "Authentication required",
              details: "Please log in to access this resource",
            },
            {
              status: 401,
              headers: {
                "Cache-Control": "no-store, must-revalidate, max-age=0",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );
        }
        return NextResponse.redirect(new URL("/", request.url));
      }

      const verifiedClaims = await privy.verifyAuthToken(accessToken);

      if (!verifiedClaims) {
        if (isApiRoute) {
          return NextResponse.json(
            {
              error: "Invalid authentication",
              details: "Your session has expired. Please log in again",
            },
            {
              status: 401,
              headers: {
                "Cache-Control": "no-store, must-revalidate, max-age=0",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );
        }
        return NextResponse.redirect(new URL("/", request.url));
      }

      // Create a new response with the headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", verifiedClaims.userId);
      requestHeaders.set("x-session-id", verifiedClaims.sessionId);
      requestHeaders.set("x-expiration", verifiedClaims.expiration.toString());
      requestHeaders.set("x-user-wallet-address", walletAddress);
      console.log("setting verifiedClaims", verifiedClaims);
      console.log("setting walletAddress", walletAddress);
      console.log("API route", isApiRoute);
      // Create a new response with the modified headers
      const newResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Set headers on the response for both API and non-API routes
      newResponse.headers.set("x-user-id", verifiedClaims.userId);
      newResponse.headers.set("x-session-id", verifiedClaims.sessionId);
      newResponse.headers.set("x-expiration", verifiedClaims.expiration.toString());
      newResponse.headers.set("x-user-wallet-address", walletAddress);

      // Add cache control headers
      newResponse.headers.set("Cache-Control", "no-store, must-revalidate, max-age=0");
      newResponse.headers.set("Pragma", "no-cache");
      newResponse.headers.set("Expires", "0");

      return newResponse;
    } catch (error) {
      console.error("Authentication error:", error);
      if (isApiRoute) {
        return NextResponse.json(
          {
            error: "Authentication error",
            details: "An error occurred while verifying your authentication",
          },
          {
            status: 401,
            headers: {
              "Cache-Control": "no-store, must-revalidate, max-age=0",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

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
