/**
 * This file acts as the single entry point for the Prisma client in the frontend application.
 *
 * It imports the pre-instantiated, singleton `prisma` client directly from our
 * shared `@peeramid-labs/dip-database` package. This is a critical best practice
 * in a monorepo, as it ensures that the entire application (both frontend and backend)
 * shares the exact same database client instance, preventing connection pool issues
 * and ensuring consistent type inference.
 */
import { prisma } from "@peeramid-labs/dip-database";

export { prisma };
