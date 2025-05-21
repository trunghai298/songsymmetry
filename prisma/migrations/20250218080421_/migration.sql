-- CreateTable
CREATE TABLE "MostStreamedSongs" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "artist" TEXT,
    "thumbnail" TEXT,
    "streamCount" TEXT,
    "dailyStreamCount" TEXT,
    "year" TEXT,
    "genre" TEXT,
    "language" TEXT,

    CONSTRAINT "MostStreamedSongs_pkey" PRIMARY KEY ("id")
);
