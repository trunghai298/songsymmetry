import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin check here
    // For now, any authenticated user can create games

    const body = await request.json();
    const { date, songId, songName, artistName, albumName, genre, releaseYear, popularity, durationMs, imageUrl } = body;

    if (!date || !songId || !songName || !artistName) {
      return NextResponse.json({ 
        error: "Date, songId, songName, and artistName are required" 
      }, { status: 400 });
    }

    const gameDate = new Date(date);
    gameDate.setHours(0, 0, 0, 0);

    // Check if game already exists for this date
    const existingGame = await prisma.dailySongGame.findUnique({
      where: { date: gameDate }
    });

    if (existingGame) {
      return NextResponse.json({ 
        error: "A game already exists for this date" 
      }, { status: 400 });
    }

    // Create the game
    const game = await prisma.dailySongGame.create({
      data: {
        date: gameDate,
        songId,
        songName,
        artistName,
        albumName,
        genre,
        releaseYear,
        popularity,
        durationMs,
        imageUrl
      }
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Error creating daily song game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin check here

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const games = await prisma.dailySongGame.findMany({
      take: limit,
      skip: offset,
      orderBy: { date: 'desc' },
      include: {
        _count: {
          select: { attempts: true }
        }
      }
    });

    const total = await prisma.dailySongGame.count();

    return NextResponse.json({
      games,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching daily song games:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Auto-generate today's game from popular songs
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin check here

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if game already exists for today
    const existingGame = await prisma.dailySongGame.findUnique({
      where: { date: today }
    });

    if (existingGame) {
      return NextResponse.json({ 
        error: "A game already exists for today" 
      }, { status: 400 });
    }

    // Select a random popular song from the database
    const randomSong = await prisma.mostStreamedSongs.findFirst({
      where: {
        spotifyId: { not: null },
        name: { not: null },
        artist: { not: null }
      },
      orderBy: {
        // Use stream count for weighted randomness
        streamCount: 'desc'
      },
      skip: Math.floor(Math.random() * 1000) // Random offset in top 1000
    });

    if (!randomSong) {
      return NextResponse.json({ 
        error: "No suitable songs found in database" 
      }, { status: 404 });
    }

    // Create the game
    const game = await prisma.dailySongGame.create({
      data: {
        date: today,
        songId: randomSong.spotifyId!,
        songName: randomSong.name!,
        artistName: randomSong.artist!,
        albumName: null, // Can be enriched later
        genre: randomSong.genre,
        releaseYear: randomSong.year ? parseInt(randomSong.year) : null,
        popularity: null, // Can be enriched later
        durationMs: null, // Can be enriched later
        imageUrl: randomSong.thumbnail
      }
    });

    return NextResponse.json({ 
      game,
      message: "Auto-generated today's game successfully" 
    });
  } catch (error) {
    console.error("Error auto-generating daily song game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}