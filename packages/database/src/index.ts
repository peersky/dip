import { PrismaClient } from "@prisma/client";

// This pattern ensures that a single instance of PrismaClient is used across the application,
// preventing the exhaustion of database connections, especially in serverless or hot-reloading environments.

declare global {
  // Allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
};

export const prisma = global.prisma ?? prismaSingleton();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Re-export all the types from the generated client.
// This allows other packages to import types like `User`, `Proposal`, etc.,
// directly from this `database` package.
export * from "@prisma/client";
