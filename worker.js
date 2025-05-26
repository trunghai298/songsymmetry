#!/usr/bin/env node

const Bull = require('bull');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Queue names
const SONG_UPDATE_QUEUE = 'song-updates';
const DAILY_GAME_QUEUE = 'daily-game';

// Check Redis availability
async function isRedisAvailable() {
  try {
    const testQueue = new Bull('test', { redis: process.env.REDIS_URL });
    await testQueue.isReady();
    await testQueue.close();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    return false;
  }
}

/**
 * Creates and starts a worker to process song update jobs
 */
function startSongUpdateWorker() {
  console.log("🎵 Starting song update worker...");

  const queue = new Bull(SONG_UPDATE_QUEUE, {
    redis: process.env.REDIS_URL,
  });

  // Process song update jobs
  queue.process(async (job) => {
    console.log(`📊 Processing song update job ${job.id}: ${JSON.stringify(job.data)}`);
    
    try {
      const { type, year } = job.data;
      console.log(`Job type: ${type}`);
      
      switch (type) {
        case "update-all":
          await processFullUpdate(job);
          break;
        case "update-year":
          await processYearUpdate(job);
          break;
        case "update-weekly":
          await processWeeklyUpdate(job);
          break;
        case "update-daily":
          await processDailyUpdate(job);
          break;
        default:
          throw new Error(`Unknown job type: ${type || 'undefined'}`);
      }

      console.log(`✅ Song update job ${job.id} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Song update job ${job.id} failed:`, error);
      throw error;
    }
  });

  // Event handlers
  queue.on("completed", (job) => {
    console.log(`✅ Song update job ${job.id} completed`);
  });

  queue.on("failed", (job, error) => {
    console.error(`❌ Song update job ${job?.id} failed:`, error?.message);
  });

  queue.on("error", (error) => {
    console.error("🚨 Song update queue error:", error);
  });

  return queue;
}

/**
 * Creates and starts a worker to process daily game jobs
 */
function startDailyGameWorker() {
  console.log("🎮 Starting daily game worker...");

  const queue = new Bull(DAILY_GAME_QUEUE, {
    redis: process.env.REDIS_URL,
  });

  // Process daily game jobs
  queue.process(async (job) => {
    console.log(`🎯 Processing daily game job ${job.id}: ${JSON.stringify(job.data)}`);
    
    try {
      const { type } = job.data;
      console.log(`Daily game job type: ${type}`);
      
      switch (type) {
        case "create-daily-games":
          await processCreateDailyGames(job);
          break;
        case "create-single-game":
          await processCreateSingleGame(job);
          break;
        default:
          throw new Error(`Unknown daily game job type: ${type || 'undefined'}`);
      }

      console.log(`✅ Daily game job ${job.id} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Daily game job ${job.id} failed:`, error);
      throw error;
    }
  });

  // Event handlers
  queue.on("completed", (job) => {
    console.log(`✅ Daily game job ${job.id} completed`);
  });

  queue.on("failed", (job, error) => {
    console.error(`❌ Daily game job ${job?.id} failed:`, error?.message);
  });

  queue.on("error", (error) => {
    console.error("🚨 Daily game queue error:", error);
  });

  return queue;
}

// Song update job processors
async function processFullUpdate(job) {
  console.log(`🔄 Starting full update of all songs, job ${job.id}`);
  
  try {
    const { multiYearImport } = require("./src/scripts/multi-year-import.js");
    
    const options = {
      years: [2020, 2021, 2022, 2023, 2024, 2025],
      useCachedData: false,
      dryRun: false,
      limit: 10000,
      concurrentYears: false,
    };

    const summary = await multiYearImport(options);
    console.log("✅ Full update completed successfully");
    
    return { success: true, summary };
  } catch (error) {
    console.error("❌ Error during full update:", error);
    throw error;
  }
}

async function processYearUpdate(job) {
  const { year } = job.data;
  
  if (!year) {
    throw new Error("Year parameter is required for year update");
  }

  console.log(`📅 Starting update for year ${year}, job ${job.id}`);

  try {
    const { multiYearImport } = require("./src/scripts/multi-year-import.js");
    
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      throw new Error(`Invalid year format: ${year}`);
    }

    const options = {
      years: [yearNum],
      useCachedData: false,
      dryRun: false,
      limit: 10000,
      concurrentYears: false,
    };

    const summary = await multiYearImport(options);
    console.log(`✅ Update for year ${year} completed successfully`);

    return { success: true, summary };
  } catch (error) {
    console.error(`❌ Error during update for year ${year}:`, error);
    throw error;
  }
}

async function processWeeklyUpdate(job) {
  console.log(`📊 Starting weekly update, job ${job.id}`);

  try {
    const { multiYearImport } = require("./src/scripts/multi-year-import.js");
    
    const currentYear = new Date().getFullYear();
    
    const options = {
      years: [currentYear],
      useCachedData: false,
      dryRun: false,
      limit: 10000,
      concurrentYears: false,
    };

    const summary = await multiYearImport(options);
    console.log(`✅ Weekly update for year ${currentYear} completed successfully`);

    return { success: true, summary };
  } catch (error) {
    console.error("❌ Error during weekly update:", error);
    throw error;
  }
}

async function processDailyUpdate(job) {
  console.log(`📈 Starting daily update, job ${job.id}`);

  try {
    const { fetchChartmastersData } = require("./src/scripts/fetch-chartmasters.js");
    
    const currentYear = new Date().getFullYear();
    const yearString = currentYear.toString();

    const options = {
      year: yearString,
      limit: 1000,
    };

    console.log(`🔍 Fetching fresh data for daily update...`);
    const songData = await fetchChartmastersData(options);
    console.log(`📝 Processing ${songData.length} songs from daily update...`);

    let created = 0, updated = 0, unchanged = 0, errors = 0;

    for (const song of songData) {
      try {
        const existingSong = await prisma.mostStreamedSongs.findFirst({
          where: {
            name: song.title,
            artist: song.artist,
            year: song.year,
          },
        });

        if (existingSong) {
          if (
            existingSong.streamCount !== BigInt(song.streamCount) ||
            existingSong.dailyStreamCount !== BigInt(song.dailyStreamCount)
          ) {
            await prisma.mostStreamedSongs.update({
              where: { id: existingSong.id },
              data: {
                streamCount: BigInt(song.streamCount),
                dailyStreamCount: BigInt(song.dailyStreamCount),
                updatedAt: new Date(),
              },
            });
            updated++;
          } else {
            unchanged++;
          }
        } else {
          await prisma.mostStreamedSongs.create({
            data: {
              name: song.title,
              artist: song.artist,
              year: song.year,
              genre: song.genre || "Unknown",
              language: song.language || "Unknown",
              streamCount: BigInt(song.streamCount),
              dailyStreamCount: BigInt(song.dailyStreamCount),
              thumbnail: song.imageUrl,
            },
          });
          created++;
        }
      } catch (err) {
        console.error(`Error processing song: ${song.title} by ${song.artist}`, err);
        errors++;
      }
    }

    console.log(`✅ Daily update completed - Created: ${created}, Updated: ${updated}, Unchanged: ${unchanged}, Errors: ${errors}`);

    return {
      success: true,
      summary: { processed: songData.length, created, updated, unchanged, errors },
    };
  } catch (error) {
    console.error("❌ Error during daily update:", error);
    throw error;
  }
}

// Daily game job processors
async function processCreateDailyGames(job) {
  const { date, count = 2 } = job.data;
  console.log(`🎮 Creating ${count} daily games for date: ${date}`);

  try {
    const createdGames = [];

    for (let i = 0; i < count; i++) {
      const game = await createSingleDailyGame(date, i + 1);
      if (game) {
        createdGames.push(game);
        console.log(`✅ Created game ${i + 1}/${count}: ${game.songName} by ${game.artistName}`);
      }
    }

    console.log(`🎯 Successfully created ${createdGames.length} daily games`);
    return {
      success: true,
      gamesCreated: createdGames.length,
      games: createdGames.map(g => ({ id: g.id, song: g.songName, artist: g.artistName }))
    };
  } catch (error) {
    console.error("❌ Error creating daily games:", error);
    throw error;
  }
}

async function processCreateSingleGame(job) {
  const { date } = job.data;
  console.log(`🎮 Creating single daily game for date: ${date || 'today'}`);

  try {
    const game = await createSingleDailyGame(date);
    
    if (game) {
      console.log(`✅ Successfully created daily game: ${game.songName} by ${game.artistName}`);
      return {
        success: true,
        game: { id: game.id, song: game.songName, artist: game.artistName }
      };
    } else {
      throw new Error("Failed to create daily game - no game returned");
    }
  } catch (error) {
    console.error("❌ Error creating single daily game:", error);
    throw error;
  }
}

async function createSingleDailyGame(targetDate, gameNumber) {
  const today = targetDate ? new Date(targetDate) : new Date();
  today.setHours(0, 0, 0, 0);

  if (gameNumber && gameNumber > 1) {
    today.setHours(12, 0, 0, 0); // 12:00 for the second game
  } else {
    today.setHours(0, 0, 0, 0); // 00:00 for the first game
  }

  console.log(`🎯 Creating daily game for ${today.toISOString()}`);

  // Check if game already exists
  const existingGame = await prisma.dailySongGame.findFirst({
    where: { 
      date: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0)
      }
    }
  });

  if (existingGame && gameNumber) {
    const existingHour = existingGame.date.getHours();
    const targetHour = today.getHours();
    
    if (existingHour === targetHour) {
      console.log(`⏭️  Game already exists for ${today.toISOString()}, skipping creation`);
      return existingGame;
    }
  } else if (existingGame && !gameNumber) {
    console.log(`⏭️  Game already exists for ${today.toDateString()}, skipping creation`);
    return existingGame;
  }

  // Get a random popular song with Spotify ID
  const randomSong = await prisma.mostStreamedSongs.findFirst({
    where: {
      spotifyId: { not: null },
      name: { not: null },
      artist: { not: null }
    },
    skip: Math.floor(Math.random() * 500)
  });

  if (!randomSong || !randomSong.spotifyId) {
    throw new Error("No suitable songs found for daily game");
  }

  console.log(`🎵 Selected song: ${randomSong.name} by ${randomSong.artist}`);

  // Try to fetch full track data from Spotify
  let spotifyData;
  
  try {
    const { spotifyTrackService } = require("./src/lib/spotify/trackService.js");
    spotifyData = await spotifyTrackService.getTrackData(randomSong.spotifyId);
    console.log("🎶 Successfully fetched complete Spotify data");
  } catch (error) {
    console.warn("⚠️  Failed to fetch Spotify data, using database fallback:", error.message);
    
    spotifyData = {
      songId: randomSong.spotifyId,
      songName: randomSong.name,
      artistName: randomSong.artist,
      albumName: null,
      releaseYear: randomSong.year ? parseInt(randomSong.year) : null,
      popularity: null,
      durationMs: null,
      imageUrl: randomSong.thumbnail || null,
      isExplicit: null
    };
  }

  // Create the game
  const game = await prisma.dailySongGame.create({
    data: {
      date: today,
      songId: spotifyData.songId,
      songName: spotifyData.songName,
      artistName: spotifyData.artistName,
      albumName: spotifyData.albumName,
      genre: spotifyData.genre || randomSong.genre,
      releaseYear: spotifyData.releaseYear,
      popularity: spotifyData.popularity,
      durationMs: spotifyData.durationMs,
      imageUrl: spotifyData.imageUrl || randomSong.thumbnail,
      isExplicit: spotifyData.isExplicit
    }
  });

  console.log(`✅ Created daily game: ${game.songName} by ${game.artistName} for ${game.date.toISOString()}`);
  return game;
}

// Main worker startup function
async function startWorker() {
  console.log('🚀 Starting SongSymmetry Worker Process...');
  console.log('🔍 Checking Redis availability...');

  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.error('❌ Redis is not available. Workers cannot start.');
    console.error('💡 Make sure the Redis URL is correct and Redis server is running.');
    process.exit(1);
  }

  console.log('✅ Redis is available. Starting workers...');
  
  try {
    // Start both workers
    const songUpdateWorker = startSongUpdateWorker();
    const dailyGameWorker = startDailyGameWorker();
    
    console.log('🎉 Workers started successfully. Waiting for jobs...');
    console.log('');
    console.log('📊 Available Job Types:');
    console.log('  Song Updates:');
    console.log('    - Full update: POST /api/song-updates {"action": "run-full-update"}');
    console.log('    - Year update: POST /api/song-updates {"action": "update-year", "year": "2025"}');
    console.log('    - Weekly update: POST /api/song-updates {"action": "schedule-weekly"}');
    console.log('    - Daily update: POST /api/song-updates {"action": "schedule-daily"}');
    console.log('');
    console.log('  Daily Games:');
    console.log('    - Create now: POST /api/daily-game-jobs {"action": "create-now"}');
    console.log('    - Schedule daily: POST /api/daily-game-jobs {"action": "schedule-daily"}');
    console.log('    - Auto schedule: POST /api/daily-game-jobs {"action": "enable-auto-schedule"}');
    console.log('');
    console.log('🔥 Worker is ready! Press Ctrl+C to stop.');

    // Handle graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Gracefully shutting down workers...`);
      try {
        await Promise.all([
          songUpdateWorker.close(),
          dailyGameWorker.close()
        ]);
        await prisma.$disconnect();
        console.log('✅ Workers and database connections closed. Goodbye!');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker().catch(err => {
    console.error('💥 Unhandled error in worker process:', err);
    process.exit(1);
  });
}

module.exports = {
  startWorker,
  startSongUpdateWorker,
  startDailyGameWorker
};