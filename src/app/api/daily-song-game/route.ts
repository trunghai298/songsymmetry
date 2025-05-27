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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all of today's games
    const todayGames = await prisma.dailySongGame.findMany({
      where: { 
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        attempts: {
          where: { userId },
          orderBy: { attemptNumber: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    });

    if (!todayGames || todayGames.length === 0) {
      return NextResponse.json({ error: "No games available for today" }, { status: 404 });
    }

    // Find the current active game (first unfinished game, or latest game if all completed)
    let currentGame = todayGames.find(game => {
      const hasWon = game.attempts.some(attempt => attempt.isCorrect);
      return !hasWon; // First game user hasn't won yet
    });

    // If user has completed all games, show the latest one
    if (!currentGame) {
      currentGame = todayGames[todayGames.length - 1];
    }

    // Check if user has already won the current game
    const hasWon = currentGame.attempts.some(attempt => attempt.isCorrect);
    const attemptCount = currentGame.attempts.length;

    // Calculate overall progress
    const completedGames = todayGames.filter(game => 
      game.attempts.some(attempt => attempt.isCorrect)
    ).length;

    // Debug hints calculation
    const hintsAvailableCalc = attemptCount >= 3 && !hasWon;
    console.log('DEBUG API: Hints calculation:', {
      attemptCount,
      hasWon,
      hintsAvailable: hintsAvailableCalc,
      userId
    });

    return NextResponse.json({
      gameId: currentGame.id,
      date: currentGame.date,
      attempts: currentGame.attempts,
      hasWon,
      attemptCount,
      canPlayMore: !hasWon,
      // Game progression info
      gameNumber: todayGames.findIndex(game => game.id === currentGame.id) + 1,
      totalGames: todayGames.length,
      completedGames,
      // Only reveal answer if user has won
      answer: hasWon ? {
        songId: currentGame.songId,
        songName: currentGame.songName,
        artistName: currentGame.artistName,
        albumName: currentGame.albumName,
        genre: currentGame.genre,
        releaseYear: currentGame.releaseYear,
        popularity: currentGame.popularity,
        durationMs: currentGame.durationMs,
        imageUrl: currentGame.imageUrl,
        isExplicit: currentGame.isExplicit
      } : null,
      // Hints system info
      hintsAvailable: hintsAvailableCalc, // Unlock hints after 3 attempts
      hintsUsed: currentGame.attempts.length > 0 ? currentGame.attempts[currentGame.attempts.length - 1].hintsUsed || [] : []
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
    const { guessedSongId, hintsUsed = [] } = body;

    if (!guessedSongId) {
      return NextResponse.json({ error: "Guessed song ID is required" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all of today's games
    const todayGames = await prisma.dailySongGame.findMany({
      where: { 
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: { date: 'asc' }
    });

    if (!todayGames || todayGames.length === 0) {
      return NextResponse.json({ error: "No games available for today" }, { status: 404 });
    }

    // Find the current active game for this user
    let currentGame = null;
    for (const game of todayGames) {
      const gameAttempts = await prisma.dailySongGameAttempt.findMany({
        where: { gameId: game.id, userId }
      });
      const hasWon = gameAttempts.some(attempt => attempt.isCorrect);
      
      if (!hasWon) {
        currentGame = game;
        break;
      }
    }

    // If user has completed all games, they can't make more attempts
    if (!currentGame) {
      return NextResponse.json({ error: "All games completed for today" }, { status: 400 });
    }

    // Check existing attempts for the current game
    const existingAttempts = await prisma.dailySongGameAttempt.findMany({
      where: {
        gameId: currentGame.id,
        userId
      },
      orderBy: { attemptNumber: 'asc' }
    });

    const hasWon = existingAttempts.some(attempt => attempt.isCorrect);

    if (hasWon) {
      return NextResponse.json({ error: "You have already won this game" }, { status: 400 });
    }

    // Check if user already guessed this song for this game
    if (existingAttempts.some(attempt => attempt.guessedSongId === guessedSongId)) {
      return NextResponse.json({ error: "You have already guessed this song for this game" }, { status: 400 });
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
    const isCorrect = guessedSongId === currentGame.songId;
    const attemptNumber = existingAttempts.length + 1;

    // Create the attempt
    const attempt = await prisma.dailySongGameAttempt.create({
      data: {
        gameId: currentGame.id,
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
        isCorrect,
        hintsUsed
      }
    });

    // Calculate comparison results
    const comparison = {
      songName: isCorrect ? 'correct' : 'incorrect',
      artistName: isCorrect ? 'correct' : (attempt.guessedArtistName === currentGame.artistName ? 'correct' : 'incorrect'),
      albumName: isCorrect ? 'correct' : (attempt.guessedAlbumName === currentGame.albumName ? 'correct' : 'incorrect'),
      genre: isCorrect ? 'correct' : (attempt.guessedGenre === currentGame.genre ? 'correct' : 'incorrect'),
      releaseYear: isCorrect ? 'correct' : (attempt.guessedReleaseYear === currentGame.releaseYear ? 'correct' : 
                   Math.abs((attempt.guessedReleaseYear || 0) - (currentGame.releaseYear || 0)) <= 2 ? 'close' : 'incorrect'),
      popularity: isCorrect ? 'correct' : (attempt.guessedPopularity === currentGame.popularity ? 'correct' :
                  Math.abs((attempt.guessedPopularity || 0) - (currentGame.popularity || 0)) <= 10 ? 'close' : 'incorrect'),
      durationMs: isCorrect ? 'correct' : (attempt.guessedDurationMs === currentGame.durationMs ? 'correct' :
                  Math.abs((attempt.guessedDurationMs || 0) - (currentGame.durationMs || 0)) <= 30000 ? 'close' : 'incorrect'),
      isExplicit: isCorrect ? 'correct' : (attempt.guessedIsExplicit === currentGame.isExplicit ? 'correct' : 'incorrect')
    };

    return NextResponse.json({
      attempt,
      comparison,
      isCorrect,
      gameOver: isCorrect,
      answer: isCorrect ? {
        songId: currentGame.songId,
        songName: currentGame.songName,
        artistName: currentGame.artistName,
        albumName: currentGame.albumName,
        genre: currentGame.genre,
        releaseYear: currentGame.releaseYear,
        popularity: currentGame.popularity,
        durationMs: currentGame.durationMs,
        imageUrl: currentGame.imageUrl,
        isExplicit: currentGame.isExplicit
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