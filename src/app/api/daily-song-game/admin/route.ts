import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

const ADMIN_USER_ID = '31scr23lvn5o3erf52cyo7vmlgai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "Access denied - Admin only" }, { status: 403 });
    }

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

    // Check if user is admin
    const userId = (session.user as any).id;
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "Access denied - Admin only" }, { status: 403 });
    }

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

// Update existing game with complete Spotify data
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "Access denied - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 });
    }

    // Get the existing game
    const existingGame = await prisma.dailySongGame.findUnique({
      where: { id: gameId }
    });

    if (!existingGame) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    console.log(`Updating game ${gameId} with complete Spotify data for: ${existingGame.songId}`);

    // Fetch full track data from Spotify
    const { spotifyTrackService } = await import("@/lib/spotify/trackService");
    
    try {
      const spotifyData = await spotifyTrackService.getTrackData(existingGame.songId);
      console.log("Successfully fetched complete Spotify data for update");

      // Update the game with complete Spotify data
      const updatedGame = await prisma.dailySongGame.update({
        where: { id: gameId },
        data: {
          songName: spotifyData.songName,
          artistName: spotifyData.artistName,
          albumName: spotifyData.albumName,
          genre: (spotifyData as any).genre, // Use Spotify genre for consistency
          releaseYear: spotifyData.releaseYear,
          popularity: spotifyData.popularity,
          durationMs: spotifyData.durationMs,
          imageUrl: spotifyData.imageUrl,
          isExplicit: spotifyData.isExplicit
        }
      });

      return NextResponse.json({ 
        game: updatedGame,
        message: "Game updated with complete Spotify data successfully" 
      });
    } catch (error) {
      console.error("Failed to fetch Spotify data for update:", error);
      return NextResponse.json({ 
        error: "Failed to fetch complete Spotify data",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error updating daily song game:", error);
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

    // Check if user is admin
    const userId = (session.user as any).id;
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "Access denied - Admin only" }, { status: 403 });
    }

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
    console.log("Looking for songs in mostStreamedSongs table...");
    
    // First check if we have any songs at all
    const songCount = await prisma.mostStreamedSongs.count({
      where: {
        spotifyId: { not: null },
        name: { not: null },
        artist: { not: null }
      }
    });
    
    console.log(`Found ${songCount} suitable songs in database`);
    
    if (songCount === 0) {
      return NextResponse.json({ 
        error: "No suitable songs found in database. Please import song data first." 
      }, { status: 404 });
    }
    
    const randomOffset = Math.floor(Math.random() * Math.min(songCount, 1000));
    console.log(`Using random offset: ${randomOffset}`);
    
    const randomSong = await prisma.mostStreamedSongs.findFirst({
      where: {
        spotifyId: { not: null },
        name: { not: null },
        artist: { not: null }
      },
      orderBy: {
        streamCount: 'desc'
      },
      skip: randomOffset
    });

    if (!randomSong) {
      return NextResponse.json({ 
        error: "Failed to select random song" 
      }, { status: 500 });
    }
    
    console.log(`Selected song: ${randomSong.name} by ${randomSong.artist}`);
    console.log(`Fetching full Spotify data for: ${randomSong.spotifyId}`);

    // Fetch full track data from Spotify
    const { spotifyTrackService } = await import("@/lib/spotify/trackService");
    let spotifyData;
    
    try {
      spotifyData = await spotifyTrackService.getTrackData(randomSong.spotifyId!);
      console.log("Successfully fetched complete Spotify data");
    } catch (error) {
      console.error("Failed to fetch Spotify data, using database fallback:", error);
      
      // Fallback to database data if Spotify fetch fails
      spotifyData = {
        songId: randomSong.spotifyId!,
        songName: randomSong.name!,
        artistName: randomSong.artist!,
        albumName: null,
        releaseYear: randomSong.year ? parseInt(randomSong.year) : null,
        popularity: null,
        durationMs: null,
        imageUrl: randomSong.thumbnail || null,
        isExplicit: null
      };
    }

    // Create the game with complete Spotify data
    const game = await prisma.dailySongGame.create({
      data: {
        date: today,
        songId: spotifyData.songId,
        songName: spotifyData.songName,
        artistName: spotifyData.artistName,
        albumName: spotifyData.albumName,
        genre: (spotifyData as any).genre, // Use only Spotify genre for consistency
        releaseYear: spotifyData.releaseYear,
        popularity: spotifyData.popularity,
        durationMs: spotifyData.durationMs,
        imageUrl: spotifyData.imageUrl || randomSong.thumbnail,
        isExplicit: spotifyData.isExplicit
      }
    });

    return NextResponse.json({ 
      game,
      message: "Auto-generated today's game successfully" 
    });
  } catch (error) {
    console.error("Error auto-generating daily song game:", error);
    
    // Provide more specific error information
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: "Failed to auto-generate game", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}