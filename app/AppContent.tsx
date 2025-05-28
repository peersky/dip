"use client";

import { usePathname } from "next/navigation";
import { isPublicPath } from "@/lib/auth";

// AppContent component for the EIP platform
export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  // For now, we'll treat all paths as public since we're focusing on EIP functionality
  // Authentication can be added later when needed
  return <>{children}</>;
}