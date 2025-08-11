/*
  Warnings:

  - You are about to drop the `ProposalMetadata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProposalMetadata" DROP CONSTRAINT "ProposalMetadata_rawFileId_fkey";

-- DropTable
DROP TABLE "ProposalMetadata";
