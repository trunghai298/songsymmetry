import Bull from 'bull';
import { isRedisAvailable } from './index';

// Queue names
export const SONG_UPDATE_QUEUE = 'song-updates';
export const DAILY_GAME_QUEUE = 'daily-game';

// Types for job data
export type SongUpdateJobData = {
  type: 'update-all' | 'update-year' | 'update-weekly' | 'update-daily';
  year?: string; // Optional year for year-specific updates
  date?: string; // Optional date for date-specific updates
};

export type DailyGameJobData = {
  type: 'create-daily-games' | 'create-single-game';
  date?: string; // Target date for the games
  count?: number; // Number of games to create (default: 2)
};

// Connection options for Bull
const connectionOptions = {
  redis: process.env.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
};

// Create the queues
let songUpdateQueue: Bull.Queue | null = null;
let dailyGameQueue: Bull.Queue | null = null;

/**
 * Initialize the queues if Redis is available
 */
export async function initializeQueues() {
  // Only initialize if Redis is available
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.warn('Redis is not available, queues will not be initialized');
    return false;
  }

  try {
    // Create the song update queue
    songUpdateQueue = new Bull(SONG_UPDATE_QUEUE, connectionOptions);
    
    // Create the daily game queue
    dailyGameQueue = new Bull(DAILY_GAME_QUEUE, connectionOptions);
    
    console.log('Song update and daily game queues initialized with Redis');
    return true;
  } catch (error) {
    console.error('Failed to initialize queues:', error);
    return false;
  }
}

/**
 * Schedule a full update of all songs
 * @returns Promise<string | null> Job ID if successful
 */
export async function scheduleFullUpdate(): Promise<string | null> {
  // Ensure queue is initialized
  if (!songUpdateQueue) {
    const initialized = await initializeQueues();
    if (!initialized) return null;
  }

  try {
    const job = await songUpdateQueue!.add({ 
      type: 'update-all' 
    });
    
    console.log(`Scheduled full update job: ${job.id}`);
    return String(job.id);
  } catch (error) {
    console.error('Failed to schedule full update job:', error);
    return null;
  }
}

/**
 * Schedule an update for a specific year
 * @param year The year to update
 * @returns Promise<string | null> Job ID if successful
 */
export async function scheduleYearUpdate(year: string): Promise<string | null> {
  // Ensure queue is initialized
  if (!songUpdateQueue) {
    const initialized = await initializeQueues();
    if (!initialized) return null;
  }

  try {
    const job = await songUpdateQueue!.add({ 
      type: 'update-year',
      year 
    });
    
    console.log(`Scheduled update for year ${year}, job: ${job.id}`);
    return String(job.id);
  } catch (error) {
    console.error(`Failed to schedule update for year ${year}:`, error);
    return null;
  }
}

/**
 * Schedule a weekly update job
 * @returns Promise<string | null> Job ID if successful
 */
export async function scheduleWeeklyUpdate(): Promise<string | null> {
  // Ensure queue is initialized
  if (!songUpdateQueue) {
    const initialized = await initializeQueues();
    if (!initialized) return null;
  }

  try {
    // Schedule for the next Monday at 3am
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7)); // Next Monday
    nextMonday.setHours(3, 0, 0, 0); // 3:00 AM

    // Use a simple interval-based approach for weekly updates
    const job = await songUpdateQueue!.add(
      { 
        type: 'update-weekly',
        date: nextMonday.toISOString() 
      },
      { 
        delay: nextMonday.getTime() - now.getTime(),
        repeat: {
          every: 604800000 // 7 days in milliseconds
        }
      }
    );
    
    console.log(`Scheduled weekly update, first run: ${nextMonday.toISOString()}, job: ${job.id}`);
    return String(job.id);
  } catch (error) {
    console.error('Failed to schedule weekly update job:', error);
    return null;
  }
}

/**
 * Schedule a daily update job
 * @returns Promise<string | null> Job ID if successful
 */
export async function scheduleDailyUpdate(): Promise<string | null> {
  console.log('Entry: scheduleDailyUpdate()');
  
  // Ensure queue is initialized
  if (!songUpdateQueue) {
    console.log('Queue not initialized, attempting to initialize...');
    const initialized = await initializeQueues();
    if (!initialized) {
      console.log('Failed to initialize queue, returning null');
      return null;
    }
    console.log('Queue initialized successfully');
  } else {
    console.log('Queue already initialized');
  }

  try {
    // Just basic job with no options for now
    console.log('Adding job to queue...');
    const job = await songUpdateQueue!.add('daily-update-simple', { 
      type: 'update-daily',
      date: new Date().toISOString(),
      simpleTest: true
    });
    
    console.log(`Successfully scheduled daily update with job ID: ${job.id}`);
    console.log(`Job data: ${JSON.stringify(job.data)}`);
    return String(job.id);
  } catch (error) {
    console.error('Exception in scheduleDailyUpdate:', error);
    // Rethrow to let caller handle it
    throw error;
  }
}

/**
 * Schedule daily game creation (2 games per day)
 * @param targetDate Optional target date, defaults to tomorrow
 * @returns Promise<string | null> Job ID if successful
 */
export async function scheduleDailyGameCreation(targetDate?: string): Promise<string | null> {
  // Ensure queue is initialized
  if (!dailyGameQueue) {
    const initialized = await initializeQueues();
    if (!initialized) return null;
  }

  try {
    const date = targetDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const job = await dailyGameQueue!.add({ 
      type: 'create-daily-games',
      date,
      count: 2
    });
    
    console.log(`Scheduled daily game creation for ${date}, job: ${job.id}`);
    return String(job.id);
  } catch (error) {
    console.error('Failed to schedule daily game creation:', error);
    return null;
  }
}

/**
 * Schedule automatic daily game creation with cron-like scheduling
 * Creates 2 games every day at 00:00 and 12:00 (every 12 hours)
 * @returns Promise<string[] | null> Job IDs if successful
 */
export async function scheduleAutomaticDailyGames(): Promise<string[] | null> {
  // Ensure queue is initialized
  if (!dailyGameQueue) {
    const initialized = await initializeQueues();
    if (!initialized) return null;
  }

  try {
    const jobIds: string[] = [];

    // Schedule first game at 00:00 (midnight) every day
    const midnightJob = await dailyGameQueue!.add(
      { 
        type: 'create-single-game',
        count: 1
      },
      {
        repeat: {
          cron: '0 0 * * *' // Every day at 00:00 (midnight)
        }
      }
    );

    // Schedule second game at 12:00 (noon) every day  
    const noonJob = await dailyGameQueue!.add(
      { 
        type: 'create-single-game',
        count: 1
      },
      {
        repeat: {
          cron: '0 12 * * *' // Every day at 12:00 (noon)
        }
      }
    );
    
    jobIds.push(String(midnightJob.id), String(noonJob.id));
    console.log(`Scheduled automatic daily games: midnight job ${midnightJob.id}, noon job ${noonJob.id}`);
    return jobIds;
  } catch (error) {
    console.error('Failed to schedule automatic daily games:', error);
    return null;
  }
}

/**
 * Create a single game immediately
 * @returns Promise<string | null> Job ID if successful
 */
export async function createGameNow(): Promise<string | null> {
  // Ensure queue is initialized
  if (!dailyGameQueue) {
    const initialized = await initializeQueues();
    if (!initialized) return null;
  }

  try {
    const job = await dailyGameQueue!.add({ 
      type: 'create-single-game',
      date: new Date().toISOString(),
      count: 1
    });
    
    console.log(`Scheduled immediate game creation, job: ${job.id}`);
    return String(job.id);
  } catch (error) {
    console.error('Failed to schedule immediate game creation:', error);
    return null;
  }
}

export default {
  initializeQueues,
  scheduleFullUpdate,
  scheduleYearUpdate,
  scheduleWeeklyUpdate,
  scheduleDailyUpdate,
  scheduleDailyGameCreation,
  scheduleAutomaticDailyGames,
  createGameNow,
};