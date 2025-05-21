import { startSongUpdateWorker } from '../lib/redis/workers';
import { isRedisAvailable } from '../lib/redis/index';

// Start the worker process
async function startWorker() {
  console.log('Starting song update worker process...');
  console.log('Checking Upstash Redis availability...');

  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.error('Redis is not available. Worker cannot start.');
    console.error('Make sure the Redis URL is correct and Redis server is running.');
    process.exit(1);
  }

  console.log('Redis is available. Starting song update worker...');
  
  try {
    const worker = startSongUpdateWorker();
    
    console.log('Worker started successfully. Waiting for jobs...');
    console.log('Use the API to schedule jobs:');
    console.log('- Full update: POST /api/song-updates with {"action": "run-full-update"}');
    console.log('- Year update: POST /api/song-updates with {"action": "update-year", "year": "2025"}');
    console.log('- Weekly schedule: POST /api/song-updates with {"action": "schedule-weekly"}');

    // Handle process termination
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Closing worker...');
      await worker.close();
      console.log('Worker closed. Exiting...');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Closing worker...');
      await worker.close();
      console.log('Worker closed. Exiting...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch(err => {
  console.error('Unhandled error in worker process:', err);
  process.exit(1);
});