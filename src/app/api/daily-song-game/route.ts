import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's game
    const todayGame = await prisma.dailySongGame.findUnique({
      where: { date: today },
      include: {
        attempts: {
          where: { userId },
          orderBy: { attemptNumber: 'asc' }
        }
      }
    });

    if (!todayGame) {
      return NextResponse.json({ error: "No game available for today" }, { status: 404 });
    }

    // Check if user has already won
    const hasWon = todayGame.attempts.some(attempt => attempt.isCorrect);
    const attemptCount = todayGame.attempts.length;

    return NextResponse.json({
      gameId: todayGame.id,
      date: todayGame.date,
      attempts: todayGame.attempts,
      hasWon,
      attemptCount,
      canPlayMore: !hasWon,
      // Only reveal answer if user has won
      answer: hasWon ? {
        songId: todayGame.songId,
        songName: todayGame.songName,
        artistName: todayGame.artistName,
        albumName: todayGame.albumName,
        genre: todayGame.genre,
        releaseYear: todayGame.releaseYear,
        popularity: todayGame.popularity,
        durationMs: todayGame.durationMs,
        imageUrl: todayGame.imageUrl,
        isExplicit: todayGame.isExplicit
      } : null
    });
  } catch (error) {
    console.error("Error fetching daily song game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { guessedSongId } = body;

    if (!guessedSongId) {
      return NextResponse.json({ error: "Guessed song ID is required" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's game
    const todayGame = await prisma.dailySongGame.findUnique({
      where: { date: today }
    });

    if (!todayGame) {
      return NextResponse.json({ error: "No game available for today" }, { status: 404 });
    }

    // Check existing attempts
    const existingAttempts = await prisma.dailySongGameAttempt.findMany({
      where: {
        gameId: todayGame.id,
        userId
      },
      orderBy: { attemptNumber: 'asc' }
    });

    const hasWon = existingAttempts.some(attempt => attempt.isCorrect);

    if (hasWon) {
      return NextResponse.json({ error: "You have already won today's game" }, { status: 400 });
    }

    // Check if user already guessed this song
    if (existingAttempts.some(attempt => attempt.guessedSongId === guessedSongId)) {
      return NextResponse.json({ error: "You have already guessed this song" }, { status: 400 });
    }

    // Import and use the Spotify service directly
    const { spotifyTrackService } = await import("@/lib/spotify/trackService");
    
    let spotifyData;
    try {
      spotifyData = await spotifyTrackService.getTrackData(guessedSongId);
    } catch (error) {
      console.error("Error fetching Spotify data:", error);
      return NextResponse.json({ error: "Could not fetch song data from Spotify" }, { status: 400 });
    }

    // Determine if guess is correct
    const isCorrect = guessedSongId === todayGame.songId;
    const attemptNumber = existingAttempts.length + 1;

    // Create the attempt
    const attempt = await prisma.dailySongGameAttempt.create({
      data: {
        gameId: todayGame.id,
        userId,
        guessedSongId,
        guessedSongName: spotifyData.songName,
        guessedArtistName: spotifyData.artistName,
        guessedAlbumName: spotifyData.albumName,
        guessedGenre: (spotifyData as any).genre, // Now includes genre from Spotify
        guessedReleaseYear: spotifyData.releaseYear,
        guessedPopularity: spotifyData.popularity,
        guessedDurationMs: spotifyData.durationMs,
        guessedImageUrl: spotifyData.imageUrl,
        guessedIsExplicit: spotifyData.isExplicit,
        attemptNumber,
        isCorrect
      }
    });

    // Calculate comparison results
    const comparison = {
      songName: isCorrect ? 'correct' : 'incorrect',
      artistName: isCorrect ? 'correct' : (attempt.guessedArtistName === todayGame.artistName ? 'correct' : 'incorrect'),
      albumName: isCorrect ? 'correct' : (attempt.guessedAlbumName === todayGame.albumName ? 'correct' : 'incorrect'),
      genre: isCorrect ? 'correct' : (attempt.guessedGenre === todayGame.genre ? 'correct' : 'incorrect'),
      releaseYear: isCorrect ? 'correct' : (attempt.guessedReleaseYear === todayGame.releaseYear ? 'correct' : 
                   Math.abs((attempt.guessedReleaseYear || 0) - (todayGame.releaseYear || 0)) <= 2 ? 'close' : 'incorrect'),
      popularity: isCorrect ? 'correct' : (attempt.guessedPopularity === todayGame.popularity ? 'correct' :
                  Math.abs((attempt.guessedPopularity || 0) - (todayGame.popularity || 0)) <= 10 ? 'close' : 'incorrect'),
      durationMs: isCorrect ? 'correct' : (attempt.guessedDurationMs === todayGame.durationMs ? 'correct' :
                  Math.abs((attempt.guessedDurationMs || 0) - (todayGame.durationMs || 0)) <= 30000 ? 'close' : 'incorrect'),
      isExplicit: isCorrect ? 'correct' : (attempt.guessedIsExplicit === todayGame.isExplicit ? 'correct' : 'incorrect')
    };

    return NextResponse.json({
      attempt,
      comparison,
      isCorrect,
      gameOver: isCorrect,
      answer: isCorrect ? {
        songId: todayGame.songId,
        songName: todayGame.songName,
        artistName: todayGame.artistName,
        albumName: todayGame.albumName,
        genre: todayGame.genre,
        releaseYear: todayGame.releaseYear,
        popularity: todayGame.popularity,
        durationMs: todayGame.durationMs,
        imageUrl: todayGame.imageUrl,
        isExplicit: todayGame.isExplicit
      } : null
    });
  } catch (error) {
    console.error("Error making daily song game attempt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}