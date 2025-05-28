import { SITEMAP } from "@/config";

export const isPublicPath = (pathname: string): boolean => {
  // Remove trailing slash for consistent comparison
  const normalizedPath = pathname.replace(/\/$/, "");

  // Check if path is in public paths
  const publicPaths = SITEMAP.filter((s) => !s.authenticated).map((s) => s.path);

  // Special case for root path
  if (normalizedPath === "") {
    return false;
  }

  return publicPaths.some((path) => {
    // Handle exact matches
    if (path === normalizedPath) return true;

    // Handle dynamic routes (paths with [param])
    const pathSegments = path.split("/");
    const normalizedSegments = normalizedPath.split("/");

    if (pathSegments.length !== normalizedSegments.length) return false;

    return pathSegments.every((segment, index) => {
      if (segment.startsWith("[") && segment.endsWith("]")) return true;
      return segment === normalizedSegments[index];
    });
  });
};

export const isAuthenticatedPath = (pathname: string): boolean => {
  return !isPublicPath(pathname);
};
