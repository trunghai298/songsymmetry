-- CreateTable
CREATE TABLE "DailySongGame" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "songId" TEXT NOT NULL,
    "songName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumName" TEXT,
    "genre" TEXT,
    "releaseYear" INTEGER,
    "popularity" INTEGER,
    "durationMs" INTEGER,
    "imageUrl" TEXT,
    "isExplicit" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySongGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySongGameAttempt" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guessedSongId" TEXT NOT NULL,
    "guessedSongName" TEXT NOT NULL,
    "guessedArtistName" TEXT NOT NULL,
    "guessedAlbumName" TEXT,
    "guessedGenre" TEXT,
    "guessedReleaseYear" INTEGER,
    "guessedPopularity" INTEGER,
    "guessedDurationMs" INTEGER,
    "guessedImageUrl" TEXT,
    "guessedIsExplicit" BOOLEAN,
    "attemptNumber" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySongGameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailySongGame_date_key" ON "DailySongGame"("date");

-- CreateIndex
CREATE INDEX "DailySongGame_date_idx" ON "DailySongGame"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySongGameAttempt_gameId_userId_attemptNumber_key" ON "DailySongGameAttempt"("gameId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "DailySongGameAttempt_gameId_idx" ON "DailySongGameAttempt"("gameId");

-- CreateIndex
CREATE INDEX "DailySongGameAttempt_userId_idx" ON "DailySongGameAttempt"("userId");

-- CreateIndex
CREATE INDEX "DailySongGameAttempt_createdAt_idx" ON "DailySongGameAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "DailySongGameAttempt" ADD CONSTRAINT "DailySongGameAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "DailySongGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySongGameAttempt" ADD CONSTRAINT "DailySongGameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;