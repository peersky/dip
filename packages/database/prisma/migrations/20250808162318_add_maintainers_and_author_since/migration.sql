/*
  Warnings:

  - You are about to drop the column `assignedAt` on the `AuthorsOnProposalVersions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AuthorsOnProposalVersions" DROP COLUMN "assignedAt",
ADD COLUMN     "authorSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "maintainers" (
    "authorId" TEXT NOT NULL,
    "repositoryOwner" TEXT NOT NULL,
    "repositoryRepo" TEXT NOT NULL,
    "repositoryProtocol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintainers_pkey" PRIMARY KEY ("authorId","repositoryOwner","repositoryRepo","repositoryProtocol")
);

-- AddForeignKey
ALTER TABLE "maintainers" ADD CONSTRAINT "maintainers_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintainers" ADD CONSTRAINT "maintainers_repositoryOwner_repositoryRepo_repositoryProto_fkey" FOREIGN KEY ("repositoryOwner", "repositoryRepo", "repositoryProtocol") REFERENCES "Repository"("owner", "repo", "protocol") ON DELETE CASCADE ON UPDATE CASCADE;
