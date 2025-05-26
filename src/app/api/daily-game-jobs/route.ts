import { NextRequest, NextResponse } from "next/server";
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
    const body = await request.json();
    const { action, date, count } = body;

    console.log(`Daily game job request: ${action}`);

    switch (action) {
      case "create-now": {
        const jobId = await createGameNow();
        if (jobId) {
          return NextResponse.json({ 
            success: true, 
            message: "Game creation job scheduled immediately",
            jobId 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: "Failed to schedule immediate game creation" 
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
            schedule: "Two games per day at 00:00 and 12:00 (every 12 hours)"
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: "Failed to enable automatic scheduling" 
          }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ 
          error: "Unknown action. Available actions: create-now, schedule-daily, enable-auto-schedule" 
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