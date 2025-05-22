-- AlterTable
ALTER TABLE "Station" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "idx_most_streamed_songs_artist" ON "MostStreamedSongs"("artist");

-- CreateIndex
CREATE INDEX "idx_most_streamed_songs_genre" ON "MostStreamedSongs"("genre");

-- CreateIndex
CREATE INDEX "idx_most_streamed_songs_language" ON "MostStreamedSongs"("language");

-- CreateIndex
CREATE INDEX "idx_most_streamed_songs_name" ON "MostStreamedSongs"("name");

-- CreateIndex
CREATE INDEX "idx_most_streamed_songs_year" ON "MostStreamedSongs"("year");
