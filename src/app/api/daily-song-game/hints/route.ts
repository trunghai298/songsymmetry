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

    const userId = (session.user as any).id;
    const body = await request.json();
    const { hintType } = body;

    if (!hintType || !['thumbnail', 'album', 'artist'].includes(hintType)) {
      return NextResponse.json({ error: "Invalid hint type" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's active game for this user
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

    // Find the current active game (first unfinished game)
    let currentGame = todayGames.find(game => {
      const hasWon = game.attempts.some(attempt => attempt.isCorrect);
      return !hasWon;
    });

    if (!currentGame) {
      return NextResponse.json({ error: "All games completed for today" }, { status: 400 });
    }

    const hasWon = currentGame.attempts.some(attempt => attempt.isCorrect);
    const attemptCount = currentGame.attempts.length;

    // Check if hints are available (need 3+ attempts and haven't won)
    if (attemptCount < 3 || hasWon) {
      return NextResponse.json({ 
        error: "Hints are only available after 3 failed attempts" 
      }, { status: 400 });
    }

    // Get current hints used from the latest attempt
    const latestAttempt = currentGame.attempts[currentGame.attempts.length - 1];
    const currentHintsUsed = latestAttempt?.hintsUsed || [];

    // If hint was already used, return the hint data without updating database
    const wasAlreadyUsed = currentHintsUsed.includes(hintType);

    // Return the appropriate hint
    let hintData = {};
    
    switch (hintType) {
      case 'thumbnail':
        hintData = {
          type: 'thumbnail',
          data: currentGame.imageUrl,
          description: "Song thumbnail/album cover"
        };
        break;
      case 'album':
        hintData = {
          type: 'album',
          data: currentGame.albumName,
          description: "Album name"
        };
        break;
      case 'artist':
        hintData = {
          type: 'artist',
          data: currentGame.artistName,
          description: "Artist name"
        };
        break;
    }

    // Update the latest attempt with the new hint used (only if not already used)
    if (!wasAlreadyUsed) {
      await prisma.dailySongGameAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          hintsUsed: [...currentHintsUsed, hintType]
        }
      });
    }

    return NextResponse.json({
      hint: hintData,
      hintsUsed: wasAlreadyUsed ? currentHintsUsed : [...currentHintsUsed, hintType],
      hintsRemaining: 3 - currentHintsUsed.length - (wasAlreadyUsed ? 0 : 1),
      alreadyUsed: wasAlreadyUsed
    });

  } catch (error) {
    console.error("Error fetching hint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}