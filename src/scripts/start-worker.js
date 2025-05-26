const { startSongUpdateWorker, startDailyGameWorker } = require('../lib/redis/workers.js');
const { isRedisAvailable } = require('../lib/redis/index.js');

// Start the worker process
async function startWorker() {
  console.log('Starting worker processes...');
  console.log('Checking Redis availability...');

  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.error('Redis is not available. Workers cannot start.');
    console.error('Make sure the Redis URL is correct and Redis server is running.');
    process.exit(1);
  }

  console.log('Redis is available. Starting workers...');
  
  try {
    // Start both workers
    const songUpdateWorker = startSongUpdateWorker();
    const dailyGameWorker = startDailyGameWorker();
    
    console.log('Workers started successfully. Waiting for jobs...');
    console.log('');
    console.log('📊 Song Update Jobs:');
    console.log('- Full update: POST /api/song-updates with {"action": "run-full-update"}');
    console.log('- Year update: POST /api/song-updates with {"action": "update-year", "year": "2025"}');
    console.log('- Weekly schedule: POST /api/song-updates with {"action": "schedule-weekly"}');
    console.log('- Daily schedule: POST /api/song-updates with {"action": "schedule-daily"}');
    console.log('');
    console.log('🎮 Daily Game Jobs:');
    console.log('- Create game now: POST /api/daily-game-jobs with {"action": "create-now"}');
    console.log('- Schedule daily: POST /api/daily-game-jobs with {"action": "schedule-daily"}');
    console.log('- Auto schedule: POST /api/daily-game-jobs with {"action": "enable-auto-schedule"}');

    // Handle process termination
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Closing workers...');
      await Promise.all([
        songUpdateWorker.close(),
        dailyGameWorker.close()
      ]);
      console.log('Workers closed. Exiting...');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Closing workers...');
      await Promise.all([
        songUpdateWorker.close(),
        dailyGameWorker.close()
      ]);
      console.log('Workers closed. Exiting...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch(err => {
  console.error('Unhandled error in worker process:', err);
  process.exit(1);
});