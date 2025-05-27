-- AlterTable
ALTER TABLE "DailySongGameAttempt" ADD COLUMN "hintsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[];