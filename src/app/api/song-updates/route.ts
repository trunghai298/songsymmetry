import { NextRequest, NextResponse } from 'next/server';
import { isRedisAvailable } from '@/lib/redis';
import { scheduleFullUpdate, scheduleYearUpdate, scheduleWeeklyUpdate, scheduleDailyUpdate } from '@/lib/redis/queues';

// API route handler for song updates
export async function GET(request: NextRequest) {
  try {
    // Check if Redis is available
    const redisAvailable = await isRedisAvailable();
    
    return NextResponse.json({ 
      status: 'ok',
      redisAvailable,
      message: redisAvailable 
        ? 'Song update service is available' 
        : 'Song update service is not available (Upstash Redis connection failed)'
    });
  } catch (error) {
    console.error('Error in song-updates GET handler:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to check song update service status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { action, year } = body;
    
    // Check if Redis is available
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { status: 'error', message: 'Upstash Redis is not available' },
        { status: 503 }
      );
    }
    
    // Handle different actions
    switch (action) {
      case 'run-full-update': {
        const jobId = await scheduleFullUpdate();
        if (!jobId) {
          return NextResponse.json(
            { status: 'error', message: 'Failed to schedule full update' },
            { status: 500 }
          );
        }
        return NextResponse.json({ 
          status: 'ok', 
          message: 'Full update scheduled', 
          jobId 
        });
      }
      
      case 'update-year': {
        if (!year) {
          return NextResponse.json(
            { status: 'error', message: 'Year parameter is required' },
            { status: 400 }
          );
        }
        
        const jobId = await scheduleYearUpdate(year);
        if (!jobId) {
          return NextResponse.json(
            { status: 'error', message: `Failed to schedule update for year ${year}` },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ 
          status: 'ok', 
          message: `Update scheduled for year ${year}`, 
          jobId 
        });
      }
      
      case 'schedule-weekly': {
        const jobId = await scheduleWeeklyUpdate();
        if (!jobId) {
          return NextResponse.json(
            { status: 'error', message: 'Failed to schedule weekly updates' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ 
          status: 'ok', 
          message: 'Weekly updates scheduled', 
          jobId 
        });
      }
      
      case 'schedule-daily': {
        try {
          console.log('Attempting to schedule daily update...');
          const jobId = await scheduleDailyUpdate();
          
          if (!jobId) {
            console.log('Schedule daily update returned null job ID');
            return NextResponse.json(
              { status: 'error', message: 'Failed to schedule daily updates - null job ID' },
              { status: 500 }
            );
          }
          
          console.log(`Successfully scheduled daily update with job ID: ${jobId}`);
          return NextResponse.json({ 
            status: 'ok', 
            message: 'Daily updates scheduled', 
            jobId 
          });
        } catch (err) {
          console.error('Error scheduling daily update:', err);
          return NextResponse.json(
            { 
              status: 'error', 
              message: 'Exception in daily update scheduling',
              error: err instanceof Error ? err.message : String(err)
            },
            { status: 500 }
          );
        }
      }

      case 'run-daily': {
        try {
          console.log('Running daily update immediately...');
          const jobId = await scheduleDailyUpdate();
          
          if (!jobId) {
            return NextResponse.json(
              { status: 'error', message: 'Failed to run daily update - null job ID' },
              { status: 500 }
            );
          }
          
          console.log(`Successfully scheduled immediate daily update with job ID: ${jobId}`);
          return NextResponse.json({ 
            status: 'ok', 
            message: 'Daily update started immediately', 
            jobId 
          });
        } catch (err) {
          console.error('Error running daily update:', err);
          return NextResponse.json(
            { 
              status: 'error', 
              message: 'Exception in daily update execution',
              error: err instanceof Error ? err.message : String(err)
            },
            { status: 500 }
          );
        }
      }

      case 'run-weekly': {
        try {
          console.log('Running weekly update immediately...');
          const jobId = await scheduleWeeklyUpdate();
          
          if (!jobId) {
            return NextResponse.json(
              { status: 'error', message: 'Failed to run weekly update - null job ID' },
              { status: 500 }
            );
          }
          
          console.log(`Successfully scheduled immediate weekly update with job ID: ${jobId}`);
          return NextResponse.json({ 
            status: 'ok', 
            message: 'Weekly update started immediately', 
            jobId 
          });
        } catch (err) {
          console.error('Error running weekly update:', err);
          return NextResponse.json(
            { 
              status: 'error', 
              message: 'Exception in weekly update execution',
              error: err instanceof Error ? err.message : String(err)
            },
            { status: 500 }
          );
        }
      }
      
      default:
        return NextResponse.json(
          { status: 'error', message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in song-updates POST handler:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to process song update request' },
      { status: 500 }
    );
  }
}