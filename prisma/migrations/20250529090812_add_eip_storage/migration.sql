-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "eipsFolder" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "proposalPrefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlRun" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalFilesFound" INTEGER,
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "apiCallsUsed" INTEGER NOT NULL DEFAULT 0,
    "rateLimitHit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrawlRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawFile" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "crawlRunId" TEXT,
    "githubPath" TEXT NOT NULL,
    "githubSha" TEXT NOT NULL,
    "fileSize" INTEGER,
    "lastCommitDate" TIMESTAMP(3),
    "rawMarkdown" TEXT NOT NULL,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repository_protocol_idx" ON "Repository"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_owner_repo_protocol_key" ON "Repository"("owner", "repo", "protocol");

-- CreateIndex
CREATE INDEX "CrawlRun_repositoryId_startedAt_idx" ON "CrawlRun"("repositoryId", "startedAt");

-- CreateIndex
CREATE INDEX "RawFile_repositoryId_idx" ON "RawFile"("repositoryId");

-- CreateIndex
CREATE INDEX "RawFile_crawledAt_idx" ON "RawFile"("crawledAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawFile_repositoryId_githubPath_key" ON "RawFile"("repositoryId", "githubPath");

-- AddForeignKey
ALTER TABLE "CrawlRun" ADD CONSTRAINT "CrawlRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawFile" ADD CONSTRAINT "RawFile_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawFile" ADD CONSTRAINT "RawFile_crawlRunId_fkey" FOREIGN KEY ("crawlRunId") REFERENCES "CrawlRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
