import { NextRequest, NextResponse } from 'next/server';
import Bull from 'bull';

// Job monitoring API for admin panel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status': {
        // Get queue status and recent jobs
        return await getJobsStatus();
      }
      
      case 'stats': {
        // Get queue statistics
        return await getJobsStats();
      }

      case 'scheduled': {
        // Get scheduled/repeatable jobs
        return await getScheduledJobs();
      }
      
      default:
        return NextResponse.json({
          error: 'Invalid action. Use ?action=status, ?action=stats, or ?action=scheduled'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin jobs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    const queueName = searchParams.get('queue');

    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'delete-job': {
        if (!jobId || !queueName) {
          return NextResponse.json(
            { error: 'jobId and queue parameters are required' },
            { status: 400 }
          );
        }

        return await deleteJobFromQueue(jobId, queueName);
      }

      case 'clear-completed': {
        if (!queueName) {
          return NextResponse.json(
            { error: 'queue parameter is required' },
            { status: 400 }
          );
        }

        return await clearCompletedJobs(queueName);
      }

      case 'clear-failed': {
        if (!queueName) {
          return NextResponse.json(
            { error: 'queue parameter is required' },
            { status: 400 }
          );
        }

        return await clearFailedJobs(queueName);
      }

      case 'clear-scheduled': {
        if (!queueName) {
          return NextResponse.json(
            { error: 'queue parameter is required' },
            { status: 400 }
          );
        }

        return await clearScheduledJobs(queueName);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: delete-job, clear-completed, clear-failed, or clear-scheduled' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin jobs DELETE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, type, year } = body;

    console.log(`Admin jobs API called with action: ${action}`);

    switch (action) {
      case 'start-daily-games': {
        // Enable automatic daily game creation
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/daily-game-jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enable-auto-schedule' })
        });
        
        const result = await response.json();
        
        return NextResponse.json({
          success: response.ok,
          message: response.ok ? 'Automatic daily games enabled' : result.error,
          data: result
        });
      }

      case 'create-game-now': {
        // Create a game immediately
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/daily-game-jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-now' })
        });
        
        const result = await response.json();
        
        return NextResponse.json({
          success: response.ok,
          message: response.ok ? 'Game creation job scheduled' : result.error,
          data: result
        });
      }

      case 'start-song-updates': {
        // Enable automatic song data updates
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/song-updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'schedule-daily' })
        });
        
        const result = await response.json();
        
        return NextResponse.json({
          success: response.ok,
          message: response.ok ? 'Automatic song updates enabled' : result.error,
          data: result
        });
      }

      case 'run-song-update': {
        if (!type) {
          return NextResponse.json(
            { error: 'Update type is required (daily, weekly, year, full)' },
            { status: 400 }
          );
        }

        let updateAction = '';
        let requestBody: any = { action: '' };

        switch (type) {
          case 'daily':
            updateAction = 'run-daily';
            requestBody.action = 'run-daily';
            break;
          case 'weekly': 
            updateAction = 'run-weekly';
            requestBody.action = 'run-weekly';
            break;
          case 'year':
            if (!year) {
              return NextResponse.json(
                { error: 'Year is required for year update' },
                { status: 400 }
              );
            }
            updateAction = 'update-year';
            requestBody.action = 'update-year';
            requestBody.year = year;
            break;
          case 'full':
            updateAction = 'run-full-update';
            requestBody.action = 'run-full-update';
            break;
          default:
            return NextResponse.json(
              { error: 'Invalid update type. Use: daily, weekly, year, or full' },
              { status: 400 }
            );
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/song-updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        return NextResponse.json({
          success: response.ok,
          message: response.ok ? `${type} update job scheduled` : result.error,
          data: result
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin jobs POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function getJobsStatus() {
  let songUpdateQueue: Bull.Queue | null = null;
  let dailyGameQueue: Bull.Queue | null = null;
  
  try {
    // Create queue connections to get status
    songUpdateQueue = new Bull('song-updates', {
      redis: process.env.REDIS_URL,
    });
    
    dailyGameQueue = new Bull('daily-game', {
      redis: process.env.REDIS_URL,
    });

    // Wait for connections to be ready
    await Promise.all([
      songUpdateQueue.isReady(),
      dailyGameQueue.isReady()
    ]);

    // Get recent jobs from both queues
    const [songUpdateJobs, dailyGameJobs] = await Promise.all([
      songUpdateQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, 10),
      dailyGameQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, 10)
    ]);

    const formatJob = async (job: Bull.Job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      state: await job.getState(),
      progress: job.progress(),
      createdAt: new Date(job.timestamp).toISOString(),
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      failedReason: job.failedReason || null
    });

    const formattedSongJobs = await Promise.all(songUpdateJobs.map(formatJob));
    const formattedGameJobs = await Promise.all(dailyGameJobs.map(formatJob));

    return NextResponse.json({
      success: true,
      queues: {
        songUpdates: {
          name: 'song-updates',
          jobs: formattedSongJobs
        },
        dailyGames: {
          name: 'daily-game', 
          jobs: formattedGameJobs
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    // Clean up connections
    try {
      if (songUpdateQueue) await songUpdateQueue.close();
      if (dailyGameQueue) await dailyGameQueue.close();
    } catch (closeError) {
      console.warn('Error closing queue connections:', closeError);
    }
  }
}

async function getJobsStats() {
  let songUpdateQueue: Bull.Queue | null = null;
  let dailyGameQueue: Bull.Queue | null = null;
  
  try {
    songUpdateQueue = new Bull('song-updates', {
      redis: process.env.REDIS_URL,
    });
    
    dailyGameQueue = new Bull('daily-game', {
      redis: process.env.REDIS_URL,
    });

    // Wait for connections to be ready
    await Promise.all([
      songUpdateQueue.isReady(),
      dailyGameQueue.isReady()
    ]);

    // Get queue statistics
    const [songUpdateCounts, dailyGameCounts] = await Promise.all([
      songUpdateQueue.getJobCounts(),
      dailyGameQueue.getJobCounts()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        songUpdates: {
          name: 'song-updates',
          counts: songUpdateCounts
        },
        dailyGames: {
          name: 'daily-game',
          counts: dailyGameCounts
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting job stats:', error);
    return NextResponse.json(
      { error: 'Failed to get job stats', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    // Clean up connections
    try {
      if (songUpdateQueue) await songUpdateQueue.close();
      if (dailyGameQueue) await dailyGameQueue.close();
    } catch (closeError) {
      console.warn('Error closing queue connections:', closeError);
    }
  }
}

async function deleteJobFromQueue(jobId: string, queueName: string) {
  let queue: Bull.Queue | null = null;
  
  try {
    // Create queue connection
    queue = new Bull(queueName, {
      redis: process.env.REDIS_URL,
    });

    await queue.isReady();

    // Find and remove the job
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: `Job ${jobId} not found in queue ${queueName}` },
        { status: 404 }
      );
    }

    // Remove the job
    await job.remove();

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} removed from ${queueName} queue`,
      deletedJob: {
        id: job.id,
        name: job.name,
        data: job.data
      }
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    try {
      if (queue) await queue.close();
    } catch (closeError) {
      console.warn('Error closing queue connection:', closeError);
    }
  }
}

async function clearCompletedJobs(queueName: string) {
  let queue: Bull.Queue | null = null;
  
  try {
    queue = new Bull(queueName, {
      redis: process.env.REDIS_URL,
    });

    await queue.isReady();

    // Get completed jobs and count them
    const completedJobs = await queue.getJobs(['completed'], 0, -1);
    const count = completedJobs.length;

    // Remove all completed jobs
    await queue.clean(0, 'completed');

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} completed jobs from ${queueName} queue`,
      clearedCount: count
    });
  } catch (error) {
    console.error('Error clearing completed jobs:', error);
    return NextResponse.json(
      { error: 'Failed to clear completed jobs', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    try {
      if (queue) await queue.close();
    } catch (closeError) {
      console.warn('Error closing queue connection:', closeError);
    }
  }
}

async function clearFailedJobs(queueName: string) {
  let queue: Bull.Queue | null = null;
  
  try {
    queue = new Bull(queueName, {
      redis: process.env.REDIS_URL,
    });

    await queue.isReady();

    // Get failed jobs and count them
    const failedJobs = await queue.getJobs(['failed'], 0, -1);
    const count = failedJobs.length;

    // Remove all failed jobs
    await queue.clean(0, 'failed');

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} failed jobs from ${queueName} queue`,
      clearedCount: count
    });
  } catch (error) {
    console.error('Error clearing failed jobs:', error);
    return NextResponse.json(
      { error: 'Failed to clear failed jobs', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    try {
      if (queue) await queue.close();
    } catch (closeError) {
      console.warn('Error closing queue connection:', closeError);
    }
  }
}

async function getScheduledJobs() {
  let songUpdateQueue: Bull.Queue | null = null;
  let dailyGameQueue: Bull.Queue | null = null;
  
  try {
    // Create queue connections
    songUpdateQueue = new Bull('song-updates', {
      redis: process.env.REDIS_URL,
    });
    
    dailyGameQueue = new Bull('daily-game', {
      redis: process.env.REDIS_URL,
    });

    // Wait for connections to be ready
    await Promise.all([
      songUpdateQueue.isReady(),
      dailyGameQueue.isReady()
    ]);

    // Get repeatable jobs (scheduled jobs)
    const [songUpdateRepeatable, dailyGameRepeatable] = await Promise.all([
      songUpdateQueue.getRepeatableJobs(),
      dailyGameQueue.getRepeatableJobs()
    ]);

    return NextResponse.json({
      success: true,
      scheduled: {
        songUpdates: songUpdateRepeatable.map((job: any) => ({
          id: job.id,
          name: job.name || 'Repeatable Job',
          cron: job.cron,
          next: job.next,
          data: job.data || {}
        })),
        dailyGames: dailyGameRepeatable.map((job: any) => ({
          id: job.id,
          name: job.name || 'Repeatable Job',
          cron: job.cron,
          next: job.next,
          data: job.data || {}
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting scheduled jobs:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduled jobs', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    // Clean up connections
    try {
      if (songUpdateQueue) await songUpdateQueue.close();
      if (dailyGameQueue) await dailyGameQueue.close();
    } catch (closeError) {
      console.warn('Error closing queue connections:', closeError);
    }
  }
}

async function clearScheduledJobs(queueName: string) {
  let queue: Bull.Queue | null = null;
  
  try {
    queue = new Bull(queueName, {
      redis: process.env.REDIS_URL,
    });

    await queue.isReady();

    // Get all repeatable jobs
    const repeatableJobs = await queue.getRepeatableJobs();
    const count = repeatableJobs.length;

    // Remove all repeatable jobs
    for (const job of repeatableJobs) {
      await queue.removeRepeatableByKey(job.key);
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} scheduled jobs from ${queueName} queue`,
      clearedCount: count
    });
  } catch (error) {
    console.error('Error clearing scheduled jobs:', error);
    return NextResponse.json(
      { error: 'Failed to clear scheduled jobs', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    try {
      if (queue) await queue.close();
    } catch (closeError) {
      console.warn('Error closing queue connection:', closeError);
    }
  }
}