-- CreateTable
CREATE TABLE "GlobalStatsSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalProposals" INTEGER NOT NULL,
    "distinctAuthorsCount" INTEGER NOT NULL,
    "authorsOnFinalizedCount" INTEGER NOT NULL,
    "centralizationRate" DOUBLE PRECISION NOT NULL,
    "acceptanceRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GlobalStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalStatsSnapshot_snapshotDate_idx" ON "GlobalStatsSnapshot"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalStatsSnapshot_year_month_key" ON "GlobalStatsSnapshot"("year", "month");
