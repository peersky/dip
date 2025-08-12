-- AlterTable
ALTER TABLE "User" ADD COLUMN     "priorityCategories" TEXT[],
ALTER COLUMN "stanceDescription" SET DATA TYPE VARCHAR(10000);
