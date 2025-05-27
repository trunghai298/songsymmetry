-- CreateTable
CREATE TABLE "Station" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "playlistId" TEXT,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationMember" (
  "id" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "StationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationTrack" (
  "id" TEXT NOT NULL,
  "trackId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT,
  "artist" TEXT,
  "imageUrl" TEXT,
  "stationId" TEXT NOT NULL,
  "addedById" TEXT NOT NULL,
  CONSTRAINT "StationTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "image" TEXT,
  "spotifyId" TEXT,
  "spotifyToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Station_ownerId_idx" ON "Station"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "StationMember_stationId_userId_key" ON "StationMember"("stationId", "userId");

-- CreateIndex
CREATE INDEX "StationMember_stationId_idx" ON "StationMember"("stationId");

-- CreateIndex
CREATE INDEX "StationMember_userId_idx" ON "StationMember"("userId");

-- CreateIndex
CREATE INDEX "StationTrack_stationId_idx" ON "StationTrack"("stationId");

-- CreateIndex
CREATE INDEX "StationTrack_addedById_idx" ON "StationTrack"("addedById");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationMember" ADD CONSTRAINT "StationMember_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationMember" ADD CONSTRAINT "StationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationTrack" ADD CONSTRAINT "StationTrack_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationTrack" ADD CONSTRAINT "StationTrack_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;