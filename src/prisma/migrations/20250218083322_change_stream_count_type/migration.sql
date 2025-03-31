/*
  Warnings:

  - The `streamCount` column on the `MostStreamedSongs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `dailyStreamCount` column on the `MostStreamedSongs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MostStreamedSongs" DROP COLUMN "streamCount",
ADD COLUMN     "streamCount" BIGINT,
DROP COLUMN "dailyStreamCount",
ADD COLUMN     "dailyStreamCount" BIGINT;
