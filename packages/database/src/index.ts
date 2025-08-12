import { PrismaClient, ProtocolStatsSnapshot } from "@prisma/client";

// This pattern ensures that a single instance of PrismaClient is used across the application,
// preventing the exhaustion of database connections, especially in serverless or hot-reloading environments.

declare global {
  // Allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const prisma = global.prisma ?? prismaSingleton();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Re-export all the types from the generated client.
// This allows other packages to import types like `User`, `Proposal`, etc.,
// directly from this `database` package, creating a shared type contract.
export * from "@prisma/client";

// Explicitly re-export model types to ensure they are available in the package's
// final type definition files, which is critical for Vercel builds.
export type { ProtocolStatsSnapshot };

// Define and export the shared data type for the Authors API
export type AuthorStats = {
  id: string;
  name: string | null;
  githubHandle: string | null;
  email: string | null;
  totalContributions: number;
  finalizedContributions: number;
  contributionByRepo: Record<string, number>;
  influenceScore: number | null;
};
