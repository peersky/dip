-- AlterTable
ALTER TABLE "RawFile" ADD COLUMN     "contentHash" TEXT;

-- CreateTable
CREATE TABLE "ProposalHistory" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorCount" INTEGER NOT NULL,
    "diffSummary" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "rawFileId" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "created" TIMESTAMP(3),
    "discussionsTo" TEXT,
    "requires" TEXT[],

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalHistory_proposalId_idx" ON "ProposalHistory"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalHistory_timestamp_idx" ON "ProposalHistory"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_rawFileId_key" ON "Proposal"("rawFileId");

-- CreateIndex
CREATE INDEX "Proposal_proposalNumber_idx" ON "Proposal"("proposalNumber");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_type_idx" ON "Proposal"("type");

-- CreateIndex
CREATE INDEX "RawFile_contentHash_idx" ON "RawFile"("contentHash");

-- AddForeignKey
ALTER TABLE "ProposalHistory" ADD CONSTRAINT "ProposalHistory_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_rawFileId_fkey" FOREIGN KEY ("rawFileId") REFERENCES "RawFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
