import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get counts of albums with and without Spotify data
    const totalAlbums = await prisma.mostStreamedAlbums.count();
    
    const albumsWithSpotify = await prisma.mostStreamedAlbums.count({
      where: {
        spotifyId: { not: null }
      }
    });

    const albumsWithoutSpotify = await prisma.mostStreamedAlbums.count({
      where: {
        spotifyId: null,
        albName: { not: null },
        artist: { not: null }
      }
    });

    const albumsWithoutNameOrArtist = await prisma.mostStreamedAlbums.count({
      where: {
        OR: [
          { albName: null },
          { artist: null }
        ]
      }
    });

    // Get top albums without Spotify data (for preview)
    const sampleAlbumsWithoutSpotify = await prisma.mostStreamedAlbums.findMany({
      where: {
        spotifyId: null,
        albName: { not: null },
        artist: { not: null }
      },
      select: {
        id: true,
        albName: true,
        artist: true,
        streamCount: true,
        albType: true
      },
      orderBy: {
        streamCount: 'desc'
      },
      take: 10
    });

    // Convert BigInt values to strings for JSON serialization
    const serializedSampleAlbums = sampleAlbumsWithoutSpotify.map(album => ({
      ...album,
      streamCount: album.streamCount?.toString()
    }));

    // Get recently updated albums
    const recentlyUpdated = await prisma.mostStreamedAlbums.findMany({
      where: {
        spotifyId: { not: null },
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        albName: true,
        artist: true,
        spotifyId: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    const stats = {
      totalAlbums,
      albumsWithSpotify,
      albumsWithoutSpotify,
      albumsWithoutNameOrArtist,
      completionPercentage: totalAlbums > 0 ? ((albumsWithSpotify / totalAlbums) * 100).toFixed(2) : "0",
      sampleAlbumsWithoutSpotify: serializedSampleAlbums,
      recentlyUpdated
    };

    return NextResponse.json({
      message: "Album Spotify data statistics",
      stats
    });

  } catch (error) {
    console.error("Error getting album Spotify stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}