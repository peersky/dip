-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiGenerationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "citizenship" VARCHAR(255);
