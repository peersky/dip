/*
  Warnings:

  - Added the required column `ecosystem` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "ecosystem" TEXT NOT NULL;
