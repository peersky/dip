import { PrismaClient } from '@prisma/client';

// This file is responsible for instantiating the Prisma client.
// It ensures that only one instance of the Prisma client is created,
// which is a best practice to avoid connection issues.

declare global {
  // We must use `var` here, not `let` or `const`, to allow for a global declaration.
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// In development, we use a global variable to preserve the Prisma client across hot reloads.
// In production, we create a new instance for each serverless function invocation.
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };
