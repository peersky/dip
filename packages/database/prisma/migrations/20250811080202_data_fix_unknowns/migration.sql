/*
  Warnings:

  - A unique constraint covering the columns `[movedToId]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "movedToId" TEXT,
ADD COLUMN     "movedToPath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_movedToId_key" ON "Proposal"("movedToId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_movedToId_fkey" FOREIGN KEY ("movedToId") REFERENCES "Proposal"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
