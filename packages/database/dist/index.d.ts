import { PrismaClient } from "@prisma/client";
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export * from "@prisma/client";
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
export * from "@prisma/client";
