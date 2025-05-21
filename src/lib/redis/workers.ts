import Bull from 'bull';
import { PrismaClient } from '@prisma/client';
import { SONG_UPDATE_QUEUE, SongUpdateJobData } from './queues';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Creates and starts a worker to process song update jobs
 */
export function startSongUpdateWorker() {
  console.log('Starting song update worker with Redis...');
  
  // Create the queue
  const queue = new Bull(SONG_UPDATE_QUEUE, {
    redis: process.env.REDIS_URL
  });
  
  // Process jobs
  queue.process(async (job) => {
    console.log(`Processing job ${job.id} of type ${job.data.type}`);
    
    try {
      switch (job.data.type) {
        case 'update-all':
          await processFullUpdate(job);
          break;
        case 'update-year':
          await processYearUpdate(job);
          break;
        case 'update-weekly':
          await processWeeklyUpdate(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.data.type}`);
      }
      
      console.log(`Job ${job.id} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error; // Re-throw to let Bull handle the retry
    }
  });

  // Set up event handlers
  queue.on('completed', (job) => {
    console.log(`Job ${job.id} has completed`);
  });

  queue.on('failed', (job, error) => {
    console.error(`Job ${job?.id} has failed with error:`, error);
  });

  queue.on('error', (error) => {
    console.error('Queue error:', error);
  });

  console.log('Worker started and listening for jobs');
  return queue;
}

/**
 * Process a full update of all songs
 */
async function processFullUpdate(job: any) {
  console.log(`Starting full update of all songs, job ${job.id}`);
  
  // In a real implementation, you would call your existing update scripts
  try {
    // Example: Update all songs in the database
    // TODO: Add actual implementation to call existing update scripts
    // For example: const { default: updateSongs } = await import('../../scripts/update-songs-data');
    // await updateSongs();
    
    // For testing, just log the action
    await job.updateProgress(50);
    console.log('Full update in progress...');
    
    // Simulating work
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Full update completed');
    await job.updateProgress(100);
  } catch (error) {
    console.error('Error during full update:', error);
    throw error;
  }
}

/**
 * Process an update for a specific year
 */
async function processYearUpdate(job: any) {
  const { year } = job.data;
  console.log(`Starting update for year ${year}, job ${job.id}`);
  
  // In a real implementation, you would call your existing update scripts
  try {
    // Example: Update songs for a specific year
    // TODO: Add actual implementation to call existing update scripts with year parameter
    // For example: const { updateYear } = await import('../../scripts/update-songs-data');
    // await updateYear(year);
    
    // For testing, just log the action
    await job.updateProgress(50);
    console.log(`Update for year ${year} in progress...`);
    
    // Simulating work
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`Update for year ${year} completed`);
    await job.updateProgress(100);
  } catch (error) {
    console.error(`Error during update for year ${year}:`, error);
    throw error;
  }
}

/**
 * Process a weekly update
 */
async function processWeeklyUpdate(job: any) {
  console.log(`Starting weekly update, job ${job.id}`);
  
  // In a real implementation, you would call your existing update scripts
  try {
    // Example: Update latest songs
    // TODO: Add actual implementation to call existing auto-import script
    // For example: const { default: autoImport } = await import('../../scripts/auto-import');
    // await autoImport();
    
    // For testing, just log the action
    await job.updateProgress(50);
    console.log('Weekly update in progress...');
    
    // Simulating work
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Weekly update completed');
    await job.updateProgress(100);
  } catch (error) {
    console.error('Error during weekly update:', error);
    throw error;
  }
}

export default {
  startSongUpdateWorker,
};