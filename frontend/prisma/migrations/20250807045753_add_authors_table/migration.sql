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
CREATE TABLE "AuthorsOnRawFiles" (
    "rawFileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "AuthorsOnRawFiles_pkey" PRIMARY KEY ("rawFileId","authorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Author_githubHandle_key" ON "Author"("githubHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Author_email_key" ON "Author"("email");

-- CreateIndex
CREATE INDEX "Author_githubHandle_idx" ON "Author"("githubHandle");

-- CreateIndex
CREATE INDEX "Author_name_idx" ON "Author"("name");

-- CreateIndex
CREATE INDEX "AuthorsOnRawFiles_rawFileId_idx" ON "AuthorsOnRawFiles"("rawFileId");

-- CreateIndex
CREATE INDEX "AuthorsOnRawFiles_authorId_idx" ON "AuthorsOnRawFiles"("authorId");

-- AddForeignKey
ALTER TABLE "AuthorsOnRawFiles" ADD CONSTRAINT "AuthorsOnRawFiles_rawFileId_fkey" FOREIGN KEY ("rawFileId") REFERENCES "RawFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorsOnRawFiles" ADD CONSTRAINT "AuthorsOnRawFiles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
