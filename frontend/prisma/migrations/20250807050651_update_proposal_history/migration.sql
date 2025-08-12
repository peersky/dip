/*
  Warnings:

  - You are about to drop the column `contentHash` on the `RawFile` table. All the data in the column will be lost.
  - Added the required column `githubSha` to the `ProposalHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RawFile_contentHash_idx";

-- AlterTable
ALTER TABLE "ProposalHistory" ADD COLUMN     "githubSha" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RawFile" DROP COLUMN "contentHash";
