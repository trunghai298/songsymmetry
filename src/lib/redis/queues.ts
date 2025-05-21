import Bull from 'bull';
import { isRedisAvailable } from './index';

// Queue names
export const SONG_UPDATE_QUEUE = 'song-updates';

// Types for job data
export type SongUpdateJobData = {
  type: 'update-all' | 'update-year' | 'update-weekly' | 'update-daily';
  year?: string; // Optional year for year-specific updates
  date?: string; // Optional date for date-specific updates
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

// Create the song update queue
let songUpdateQueue: Bull.Queue | null = null;

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
    
    console.log('Song update queue initialized with Redis');
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

export default {
  initializeQueues,
  scheduleFullUpdate,
  scheduleYearUpdate,
  scheduleWeeklyUpdate,
  scheduleDailyUpdate,
};