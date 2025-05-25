import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const songId = parseInt(id);

    if (isNaN(songId)) {
      return NextResponse.json(
        { error: "Invalid song ID" },
        { status: 400 }
      );
    }

    const song = await prisma.mostStreamedSongs.findUnique({
      where: { id: songId },
      select: {
        id: true,
        name: true,
        artist: true,
        spotifyId: true,
        thumbnail: true,
      }
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(song);

  } catch (error) {
    console.error("Error fetching song data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}