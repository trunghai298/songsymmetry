import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "../auth/[...nextauth]/authOptions";
import { getAuthUser } from "@/lib/session";
import { 
  scheduleDailyGameCreation, 
  scheduleAutomaticDailyGames, 
  createGameNow 
} from "@/lib/redis/queues";

export async function GET() {
  return NextResponse.json({ 
    message: "Daily game job management API",
    endpoints: {
      "POST /api/daily-game-jobs": "Schedule jobs",
      "GET /api/daily-game-jobs": "This help message"
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get user session for admin check
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);

    // Check if user is admin (you may need to adjust this based on your admin logic)
    // For testing purposes, allow localhost requests or specific admin emails
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const isAdmin = user?.email && (
      user.email.includes('@admin') || 
      user.email === 'admin@songsymmetry.com' ||
      user.email === 'your-email@domain.com' // Add your email here for testing
    );
    
    if (!isLocalhost && !isAdmin) {
      return NextResponse.json(
        { error: "Admin access required. Please log in with an admin account." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, date, count } = body;

    console.log(`Daily game job request by ${user?.email || 'localhost'}: ${action}`);

    switch (action) {
      case "create-now": {
        // For testing, create game directly
        try {
          const { createSingleDailyGame } = await import("@/lib/redis/workers");
          const game = await createSingleDailyGame();
          
          if (game) {
            return NextResponse.json({ 
              success: true, 
              message: "Game created successfully",
              game: { 
                id: game.id, 
                song: game.songName, 
                artist: game.artistName,
                date: game.date 
              }
            });
          } else {
            return NextResponse.json({ 
              success: false, 
              message: "Failed to create game" 
            }, { status: 500 });
          }
        } catch (error) {
          console.error("Direct game creation error:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          return NextResponse.json({ 
            success: false, 
            message: "Failed to create game",
            error: errorMessage,
            stack: errorStack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
          }, { status: 500 });
        }
      }

      case "schedule-daily": {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const gameCount = count || 2;
        
        const jobId = await scheduleDailyGameCreation(targetDate);
        if (jobId) {
          return NextResponse.json({ 
            success: true, 
            message: `Scheduled ${gameCount} games for ${targetDate}`,
            jobId,
            date: targetDate,
            count: gameCount
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: "Failed to schedule daily game creation" 
          }, { status: 500 });
        }
      }

      case "enable-auto-schedule": {
        const jobIds = await scheduleAutomaticDailyGames();
        if (jobIds && jobIds.length > 0) {
          return NextResponse.json({ 
            success: true, 
            message: "Automatic daily game scheduling enabled",
            jobIds,
            schedule: "Two games per day at 00:00 and 12:00 (every 12 hours)",
            note: "Games will be created automatically every day. Manual creation is now admin-only."
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: "Failed to enable automatic scheduling" 
          }, { status: 500 });
        }
      }

      case "create-manual-games": {
        // Admin-only action to create games with specific times (bypasses normal limits)
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        try {
          const { createSingleDailyGame } = await import("@/lib/redis/workers");
          const games = [];
          
          // Create first game at midnight
          const game1 = await createSingleDailyGame(targetDate, 1);
          if (game1) games.push(game1);
          
          // Create second game at noon
          const game2 = await createSingleDailyGame(targetDate, 2);
          if (game2) games.push(game2);
          
          return NextResponse.json({ 
            success: true, 
            message: `Admin created ${games.length} games for ${targetDate}`,
            games: games.map(g => ({
              id: g.id,
              song: g.songName,
              artist: g.artistName,
              date: g.date
            }))
          });
        } catch (error) {
          console.error("Manual games creation error:", error);
          return NextResponse.json({ 
            success: false, 
            message: "Failed to create manual games",
            error: (error as Error).message
          }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ 
          error: "Unknown action. Available actions: create-now, enable-auto-schedule, create-manual-games" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in daily game jobs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}