import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songId, spotifyId, thumbnail } = body;

    if (!songId || !spotifyId) {
      return NextResponse.json(
        { error: "Song ID and Spotify ID are required" },
        { status: 400 }
      );
    }

    // Update the song with the new spotifyId and optionally thumbnail
    const updatedSong = await prisma.mostStreamedSongs.update({
      where: { id: parseInt(songId) },
      data: {
        spotifyId: spotifyId,
        ...(thumbnail && { thumbnail: thumbnail }),
        updatedAt: new Date()
      }
    });

    console.log(`Updated song ${songId} with Spotify ID: ${spotifyId}`);

    return NextResponse.json({
      message: "Song updated with Spotify ID",
      song: {
        id: updatedSong.id,
        spotifyId: updatedSong.spotifyId,
        thumbnail: updatedSong.thumbnail
      }
    });

  } catch (error) {
    console.error("Error updating song Spotify ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}