"use client";

// AppContent component for the EIP platform
export default function AppContent({ children }: { children: React.ReactNode }) {
  // For now, we'll treat all paths as public since we're focusing on EIP functionality
  // Authentication can be added later when needed
  return <>{children}</>;
}