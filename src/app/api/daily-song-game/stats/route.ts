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
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (gameId) {
      // Get stats for specific game
      const game = await prisma.dailySongGame.findUnique({
        where: { id: gameId },
        include: {
          attempts: {
            include: {
              user: {
                select: { id: true, name: true, image: true }
              }
            }
          }
        }
      });

      if (!game) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 });
      }

      // Calculate statistics
      const totalPlayers = new Set(game.attempts.map(a => a.userId)).size;
      const winnersData = game.attempts
        .filter(a => a.isCorrect)
        .reduce((acc, attempt) => {
          if (!acc[attempt.userId]) {
            acc[attempt.userId] = {
              user: attempt.user,
              attemptNumber: attempt.attemptNumber,
              completedAt: attempt.createdAt
            };
          }
          return acc;
        }, {} as Record<string, any>);

      const winners = Object.values(winnersData);
      const winRate = totalPlayers > 0 ? (winners.length / totalPlayers) * 100 : 0;

      // Attempt distribution
      const attemptDistribution = winners.reduce((acc, winner: any) => {
        acc[winner.attemptNumber] = (acc[winner.attemptNumber] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return NextResponse.json({
        game: {
          id: game.id,
          date: game.date,
          songName: game.songName,
          artistName: game.artistName
        },
        stats: {
          totalPlayers,
          winners: winners.length,
          winRate: Math.round(winRate),
          attemptDistribution,
          topWinners: winners
            .sort((a: any, b: any) => a.attemptNumber - b.attemptNumber || new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
            .slice(0, 10)
        }
      });
    } else {
      // Get user's personal stats
      const userAttempts = await prisma.dailySongGameAttempt.findMany({
        where: { userId },
        include: {
          game: {
            select: { date: true, songName: true, artistName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const gamesPlayed = new Set(userAttempts.map(a => a.gameId)).size;
      const gamesWon = userAttempts.filter(a => a.isCorrect).length;
      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

      // Streak calculation
      const gamesByDate = userAttempts.reduce((acc, attempt) => {
        const gameId = attempt.gameId;
        if (!acc[gameId]) {
          acc[gameId] = {
            date: attempt.game.date,
            won: attempt.isCorrect,
            attempts: []
          };
        }
        acc[gameId].attempts.push(attempt);
        acc[gameId].won = acc[gameId].won || attempt.isCorrect;
        return acc;
      }, {} as Record<string, any>);

      const sortedGames = Object.values(gamesByDate)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      for (const game of sortedGames) {
        if (game.won) {
          tempStreak++;
          if (currentStreak === tempStreak - 1) {
            currentStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
        }
        maxStreak = Math.max(maxStreak, tempStreak);
      }

      // Attempt distribution for wins
      const winningAttempts = userAttempts
        .filter(a => a.isCorrect)
        .map(a => a.attemptNumber);

      const attemptDistribution = winningAttempts.reduce((acc, attempt) => {
        acc[attempt] = (acc[attempt] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return NextResponse.json({
        userStats: {
          gamesPlayed,
          gamesWon,
          winRate: Math.round(winRate),
          currentStreak,
          maxStreak,
          attemptDistribution,
          recentGames: sortedGames.slice(0, 7).map((game: any) => ({
            date: game.date,
            won: game.won,
            songName: game.attempts[0]?.game?.songName,
            artistName: game.attempts[0]?.game?.artistName
          }))
        }
      });
    }
  } catch (error) {
    console.error("Error fetching daily song game stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}