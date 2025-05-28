-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "economicPosition" DOUBLE PRECISION,
    "socialPosition" DOUBLE PRECISION,
    "authPosition" DOUBLE PRECISION,
    "globalPosition" DOUBLE PRECISION,
    "envPosition" DOUBLE PRECISION,
    "stanceDescription" VARCHAR(1000),
    "economicSocialComment" VARCHAR(1500),
    "authorityGlobalComment" VARCHAR(1500),
    "environmentalComment" VARCHAR(1500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
