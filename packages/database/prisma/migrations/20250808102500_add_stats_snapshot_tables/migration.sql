-- CreateTable
CREATE TABLE "Repository" (
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "eipsFolder" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "proposalPrefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "website" TEXT,
    "lastCrawledCommitSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("owner","repo","protocol")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "repositoryOwner" TEXT NOT NULL,
    "repositoryRepo" TEXT NOT NULL,
    "repositoryProtocol" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
    "githubPath" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "created" TIMESTAMP(3),
    "discussionsTo" TEXT,
    "requires" TEXT[],

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "commitDate" TIMESTAMP(3) NOT NULL,
    "rawMarkdown" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "created" TIMESTAMP(3),
    "discussionsTo" TEXT,
    "requires" TEXT[],

    CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "githubHandle" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorsOnProposalVersions" (
    "proposalVersionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorsOnProposalVersions_pkey" PRIMARY KEY ("proposalVersionId","authorId")
);

-- CreateTable
CREATE TABLE "ProtocolStatsSnapshot" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalProposals" INTEGER NOT NULL DEFAULT 0,
    "distinctAuthorsCount" INTEGER NOT NULL DEFAULT 0,
    "authorsOnFinalizedCount" INTEGER NOT NULL DEFAULT 0,
    "totalWordCount" INTEGER NOT NULL DEFAULT 0,
    "averageWordCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusCounts" JSONB NOT NULL,
    "typeCounts" JSONB NOT NULL,
    "yearCounts" JSONB NOT NULL,

    CONSTRAINT "ProtocolStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackStatsSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "totalProposalsInTrack" INTEGER NOT NULL DEFAULT 0,
    "finalizedProposalsInTrack" INTEGER NOT NULL DEFAULT 0,
    "distinctAuthorsInTrackCount" INTEGER NOT NULL DEFAULT 0,
    "authorsOnFinalizedInTrackCount" INTEGER NOT NULL DEFAULT 0,
    "statusCountsInTrack" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolStats" (
    "protocol" TEXT NOT NULL,
    "totalProposals" INTEGER NOT NULL DEFAULT 0,
    "distinctAuthorsCount" INTEGER NOT NULL DEFAULT 0,
    "authorsOnFinalizedCount" INTEGER NOT NULL DEFAULT 0,
    "totalWordCount" INTEGER NOT NULL DEFAULT 0,
    "averageWordCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusCounts" JSONB NOT NULL,
    "typeCounts" JSONB NOT NULL,
    "yearCounts" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolStats_pkey" PRIMARY KEY ("protocol")
);

-- CreateTable
CREATE TABLE "TrackStats" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "totalProposalsInTrack" INTEGER NOT NULL DEFAULT 0,
    "finalizedProposalsInTrack" INTEGER NOT NULL DEFAULT 0,
    "distinctAuthorsInTrackCount" INTEGER NOT NULL DEFAULT 0,
    "authorsOnFinalizedInTrackCount" INTEGER NOT NULL DEFAULT 0,
    "acceptanceScoreForTrack" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusCountsInTrack" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_type_idx" ON "Proposal"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_repositoryOwner_repositoryRepo_repositoryProtocol__key" ON "Proposal"("repositoryOwner", "repositoryRepo", "repositoryProtocol", "proposalNumber");

-- CreateIndex
CREATE INDEX "ProposalVersion_commitSha_idx" ON "ProposalVersion"("commitSha");

-- CreateIndex
CREATE INDEX "ProposalVersion_proposalId_commitDate_idx" ON "ProposalVersion"("proposalId", "commitDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_proposalId_commitSha_key" ON "ProposalVersion"("proposalId", "commitSha");

-- CreateIndex
CREATE UNIQUE INDEX "Author_githubHandle_key" ON "Author"("githubHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Author_email_key" ON "Author"("email");

-- CreateIndex
CREATE INDEX "Author_githubHandle_idx" ON "Author"("githubHandle");

-- CreateIndex
CREATE INDEX "ProtocolStatsSnapshot_protocol_createdAt_idx" ON "ProtocolStatsSnapshot"("protocol", "createdAt");

-- CreateIndex
CREATE INDEX "TrackStatsSnapshot_snapshotId_idx" ON "TrackStatsSnapshot"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackStatsSnapshot_snapshotId_trackName_key" ON "TrackStatsSnapshot"("snapshotId", "trackName");

-- CreateIndex
CREATE UNIQUE INDEX "TrackStats_protocol_trackName_key" ON "TrackStats"("protocol", "trackName");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_repositoryOwner_repositoryRepo_repositoryProtocol_fkey" FOREIGN KEY ("repositoryOwner", "repositoryRepo", "repositoryProtocol") REFERENCES "Repository"("owner", "repo", "protocol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorsOnProposalVersions" ADD CONSTRAINT "AuthorsOnProposalVersions_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorsOnProposalVersions" ADD CONSTRAINT "AuthorsOnProposalVersions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackStatsSnapshot" ADD CONSTRAINT "TrackStatsSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ProtocolStatsSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackStats" ADD CONSTRAINT "TrackStats_protocol_fkey" FOREIGN KEY ("protocol") REFERENCES "ProtocolStats"("protocol") ON DELETE CASCADE ON UPDATE CASCADE;
