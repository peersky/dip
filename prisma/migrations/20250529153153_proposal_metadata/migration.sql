-- CreateTable
CREATE TABLE "ProposalMetadata" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL,
    "discussionsTo" TEXT,
    "parsingIssues" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "rawFileId" TEXT NOT NULL,

    CONSTRAINT "ProposalMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalMetadata_protocol_status_idx" ON "ProposalMetadata"("protocol", "status");

-- CreateIndex
CREATE INDEX "ProposalMetadata_protocol_type_idx" ON "ProposalMetadata"("protocol", "type");

-- CreateIndex
CREATE INDEX "ProposalMetadata_lastUpdated_idx" ON "ProposalMetadata"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalMetadata_protocol_number_key" ON "ProposalMetadata"("protocol", "number");

-- AddForeignKey
ALTER TABLE "ProposalMetadata" ADD CONSTRAINT "ProposalMetadata_rawFileId_fkey" FOREIGN KEY ("rawFileId") REFERENCES "RawFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
