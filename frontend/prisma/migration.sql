
DROP TABLE IF EXISTS "Repository" CASCADE;
DROP TABLE IF EXISTS "Proposal" CASCADE;
DROP TABLE IF EXISTS "ProposalVersion" CASCADE;
DROP TABLE IF EXISTS "Author" CASCADE;
DROP TABLE IF EXISTS "AuthorsOnProposalVersions" CASCADE;



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

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_repositoryOwner_repositoryRepo_repositoryProtocol_fkey" FOREIGN KEY ("repositoryOwner", "repositoryRepo", "repositoryProtocol") REFERENCES "Repository"("owner", "repo", "protocol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorsOnProposalVersions" ADD CONSTRAINT "AuthorsOnProposalVersions_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorsOnProposalVersions" ADD CONSTRAINT "AuthorsOnProposalVersions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
