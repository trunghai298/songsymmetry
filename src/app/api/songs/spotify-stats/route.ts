import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get counts of songs with and without Spotify data
    const totalSongs = await prisma.mostStreamedSongs.count();
    
    const songsWithSpotify = await prisma.mostStreamedSongs.count({
      where: {
        spotifyId: { not: null }
      }
    });

    const songsWithoutSpotify = await prisma.mostStreamedSongs.count({
      where: {
        spotifyId: null,
        name: { not: null },
        artist: { not: null }
      }
    });

    const songsWithoutNameOrArtist = await prisma.mostStreamedSongs.count({
      where: {
        OR: [
          { name: null },
          { artist: null }
        ]
      }
    });

    // Get top songs without Spotify data (for preview)
    const sampleSongsWithoutSpotify = await prisma.mostStreamedSongs.findMany({
      where: {
        spotifyId: null,
        name: { not: null },
        artist: { not: null }
      },
      select: {
        id: true,
        name: true,
        artist: true,
        streamCount: true
      },
      orderBy: {
        streamCount: 'desc'
      },
      take: 10
    });

    // Get recently updated songs
    const recentlyUpdated = await prisma.mostStreamedSongs.findMany({
      where: {
        spotifyId: { not: null },
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        name: true,
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
      totalSongs,
      songsWithSpotify,
      songsWithoutSpotify,
      songsWithoutNameOrArtist,
      completionPercentage: totalSongs > 0 ? ((songsWithSpotify / totalSongs) * 100).toFixed(2) : "0",
      sampleSongsWithoutSpotify,
      recentlyUpdated
    };

    return NextResponse.json({
      message: "Spotify data statistics",
      stats
    });

  } catch (error) {
    console.error("Error getting Spotify stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}