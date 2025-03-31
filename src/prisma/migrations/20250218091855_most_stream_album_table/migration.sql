-- CreateTable
CREATE TABLE "MostStreamedAlbums" (
    "id" SERIAL NOT NULL,
    "albName" TEXT,
    "artist" TEXT,
    "thumbnail" TEXT,
    "albType" TEXT,
    "streamCount" BIGINT,
    "dailyStreamCount" BIGINT,
    "year" TEXT,
    "genre" TEXT,
    "language" TEXT,

    CONSTRAINT "MostStreamedAlbums_pkey" PRIMARY KEY ("id")
);
