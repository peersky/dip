/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ProtocolStatsSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TrackStatsSnapshot` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[protocol,year,month]` on the table `ProtocolStatsSnapshot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `month` to the `ProtocolStatsSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `snapshotDate` to the `ProtocolStatsSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `ProtocolStatsSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProtocolStatsSnapshot_protocol_createdAt_idx";

-- AlterTable
ALTER TABLE "ProtocolStatsSnapshot" DROP COLUMN "createdAt",
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "snapshotDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TrackStatsSnapshot" DROP COLUMN "createdAt";

-- CreateIndex
CREATE INDEX "ProtocolStatsSnapshot_protocol_snapshotDate_idx" ON "ProtocolStatsSnapshot"("protocol", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolStatsSnapshot_protocol_year_month_key" ON "ProtocolStatsSnapshot"("protocol", "year", "month");
