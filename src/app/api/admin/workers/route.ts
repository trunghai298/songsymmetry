import { NextRequest, NextResponse } from 'next/server';
import { startDailyGameWorker, startSongUpdateWorker } from '@/lib/redis/workers';

// Global worker instances to prevent multiple workers
let dailyGameWorker: any = null;
let songUpdateWorker: any = null;
let workersStarted = false;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start': {
        if (workersStarted) {
          return NextResponse.json({
            success: true,
            message: 'Workers are already running',
            status: 'running'
          });
        }

        console.log('🚀 Starting background workers via API...');
        
        // Start both workers
        dailyGameWorker = startDailyGameWorker();
        songUpdateWorker = startSongUpdateWorker();
        workersStarted = true;
        
        console.log('✅ Background workers started successfully');
        
        return NextResponse.json({
          success: true,
          message: 'Background workers started successfully',
          workers: {
            dailyGame: !!dailyGameWorker,
            songUpdate: !!songUpdateWorker
          }
        });
      }

      case 'status': {
        return NextResponse.json({
          success: true,
          workersStarted,
          workers: {
            dailyGame: !!dailyGameWorker,
            songUpdate: !!songUpdateWorker
          }
        });
      }

      case 'stop': {
        if (!workersStarted) {
          return NextResponse.json({
            success: true,
            message: 'Workers are not running',
            status: 'stopped'
          });
        }

        console.log('🛑 Stopping background workers...');
        
        try {
          if (dailyGameWorker) {
            await dailyGameWorker.close();
            dailyGameWorker = null;
          }
          if (songUpdateWorker) {
            await songUpdateWorker.close();
            songUpdateWorker = null;
          }
          workersStarted = false;
          
          console.log('✅ Background workers stopped successfully');
          
          return NextResponse.json({
            success: true,
            message: 'Background workers stopped successfully'
          });
        } catch (error) {
          console.error('Error stopping workers:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to stop workers cleanly'
          }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: start, stop, or status'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Worker management API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    workersStarted,
    workers: {
      dailyGame: !!dailyGameWorker,
      songUpdate: !!songUpdateWorker
    },
    message: 'Worker status'
  });
}