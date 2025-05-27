import Bull from "bull";
import { PrismaClient } from "@prisma/client";
import { SONG_UPDATE_QUEUE, DAILY_GAME_QUEUE } from "./queues.js";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Creates and starts a worker to process song update jobs
 */
export function startSongUpdateWorker() {
  console.log("Starting song update worker with Redis...");

  // Create the queue
  const queue = new Bull(SONG_UPDATE_QUEUE, {
    redis: process.env.REDIS_URL,
  });

  // Set up named processors for job types
  queue.process('daily-update-simple', async (job) => {
    console.log(`Processing named job 'daily-update-simple' with ID ${job.id}`);
    console.log(`Job data: ${JSON.stringify(job.data)}`);
    
    try {
      return await processDailyUpdate(job);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  });
  
  // Process general jobs
  queue.process(async (job) => {
    console.log(`Processing unnamed job ${job.id} with data: ${JSON.stringify(job.data)}`);
    
    try {
      const type = job.data?.type;
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

      console.log(`Job ${job.id} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error; // Re-throw to let Bull handle the retry
    }
  });

  // Set up event handlers
  queue.on("completed", (job) => {
    console.log(`Job ${job.id} has completed`);
  });

  queue.on("failed", (job, error) => {
    console.error(`Job ${job?.id} has failed with error:`, error);
  });

  queue.on("error", (error) => {
    console.error("Queue error:", error);
  });

  console.log("Worker started and listening for jobs");
  return queue;
}

/**
 * Process a full update of all songs
 */
async function processFullUpdate(job: Bull.Job) {
  console.log(`Starting full update of all songs, job ${job.id}`);

  try {
    // Import the multiYearImport function from the script
    const { multiYearImport } = await import("../../scripts/multi-year-import.js");

    // Log the start of the operation
    console.log("Starting full update of all years (2020-2025)...");

    // Define options for the multi-year import
    const options = {
      years: [2020, 2021, 2022, 2023, 2024, 2025],
      useCachedData: false, // Always fetch fresh data
      dryRun: false, // Actually update the database
      limit: 10000, // Reasonable limit for song entries per year
      concurrentYears: false, // Process years sequentially to avoid rate limiting
    };

    // Execute the multiYearImport function
    const summary = await multiYearImport(options);

    console.log("Full update completed successfully");

    // Return the summary for tracking
    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error("Error during full update:", error);
    throw error;
  }
}

/**
 * Process an update for a specific year
 */
async function processYearUpdate(job: Bull.Job) {
  const { year } = job.data;

  if (!year) {
    throw new Error("Year parameter is required for year update");
  }

  console.log(`Starting update for year ${year}, job ${job.id}`);

  try {
    // Import the multiYearImport function from the script
    const { multiYearImport } = await import("../../scripts/multi-year-import.js");

    // Convert year string to number
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      throw new Error(`Invalid year format: ${year}`);
    }

    // Log the start of the operation
    console.log(`Starting update for year ${year}...`);

    // Define options for the multi-year import, but with only one year
    const options = {
      years: [yearNum], // Only process the specified year
      useCachedData: false, // Always fetch fresh data
      dryRun: false, // Actually update the database
      limit: 10000, // Reasonable limit for song entries
      concurrentYears: false, // Not relevant when only one year
    };

    // Execute the multiYearImport function
    const summary = await multiYearImport(options);

    console.log(`Update for year ${year} completed successfully`);

    // Return the summary for tracking
    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error(`Error during update for year ${year}:`, error);
    throw error;
  }
}

/**
 * Process a weekly update - only updates the current year's data
 */
async function processWeeklyUpdate(job: Bull.Job) {
  console.log(`Starting weekly update, job ${job.id}`);

  try {
    // Import the multiYearImport function from the script
    const { multiYearImport } = await import("../../scripts/multi-year-import.js");

    // Get current year
    const currentYear = new Date().getFullYear();

    // Log the start of the operation
    console.log(`Starting weekly update for current year (${currentYear})...`);

    // Define options for the multi-year import, but only for current year
    const options = {
      years: [currentYear], // Only process the current year
      useCachedData: false, // Always fetch fresh data
      dryRun: false, // Actually update the database
      limit: 10000, // Reasonable limit for song entries
      concurrentYears: false, // Not relevant when only one year
    };

    // Execute the multiYearImport function
    const summary = await multiYearImport(options);

    console.log(`Weekly update for year ${currentYear} completed successfully`);

    // Return the summary for tracking
    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error("Error during weekly update:", error);
    throw error;
  }
}

/**
 * Process a daily update - fetches and updates the most recent songs
 */
async function processDailyUpdate(job: Bull.Job) {
  console.log(`Starting daily update, job ${job.id}`);

  try {
    // Import the fetchChartmastersData function directly
    const { fetchChartmastersData } = await import("../../scripts/fetch-chartmasters.js");

    // Get current year
    const currentYear = new Date().getFullYear();
    const yearString = currentYear.toString();

    // Log the start of the operation
    console.log(`Starting daily update for current year (${yearString})...`);
    // Define options - for daily, we'll get fewer songs to be more efficient
    const options = {
      year: yearString,
      limit: 1000, // Reduced limit for daily updates (most recent/popular songs)
    };

    // Execute the fetch for latest data
    console.log(`Fetching fresh data for daily update...`);
    const songData = await fetchChartmastersData(options);

    // Now process the data and update the database
    console.log(`Processing ${songData.length} songs from daily update...`);

    // Track statistics
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Process each song
    for (const song of songData) {
      try {
        // Try to find existing song record by title and artist
        const existingSong = await prisma.mostStreamedSongs.findFirst({
          where: {
            name: song.title,
            artist: song.artist,
            year: song.year,
          },
        });

        if (existingSong) {
          // Check if streamCount or dailyStreamCount are different
          if (
            existingSong.streamCount !== BigInt(song.streamCount) ||
            existingSong.dailyStreamCount !== BigInt(song.dailyStreamCount)
          ) {
            // Update the existing record
            await prisma.mostStreamedSongs.update({
              where: { id: existingSong.id },
              data: {
                streamCount: BigInt(song.streamCount),
                dailyStreamCount: BigInt(song.dailyStreamCount),
                updatedAt: new Date(), // Update the timestamp
              },
            });
            updated++;
          } else {
            unchanged++;
          }
        } else {
          // Create new record
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
        console.error(
          `Error processing song: ${song.title} by ${song.artist}`,
          err
        );
        errors++;
      }
    }

    console.log("Daily update completed successfully");
    console.log(`- Created: ${created}`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Unchanged: ${unchanged}`);
    console.log(`- Errors: ${errors}`);

    // Return the summary for tracking
    return {
      success: true,
      summary: {
        processed: songData.length,
        created,
        updated,
        unchanged,
        errors,
      },
    };
  } catch (error) {
    console.error("Error during daily update:", error);
    throw error;
  }
}

/**
 * Creates and starts a worker to process daily game jobs
 */
export function startDailyGameWorker() {
  console.log("Starting daily game worker with Redis...");

  // Create the queue
  const queue = new Bull(DAILY_GAME_QUEUE, {
    redis: process.env.REDIS_URL,
  });

  // Process daily game jobs
  queue.process(async (job) => {
    console.log(`Processing daily game job ${job.id} with data: ${JSON.stringify(job.data)}`);
    
    try {
      const jobData = job.data;
      const type = jobData?.type;
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

      console.log(`Daily game job ${job.id} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Daily game job ${job.id} failed:`, error);
      throw error; // Re-throw to let Bull handle the retry
    }
  });

  // Set up event handlers
  queue.on("completed", (job) => {
    console.log(`Daily game job ${job.id} has completed`);
  });

  queue.on("failed", (job, error) => {
    console.error(`Daily game job ${job?.id} has failed with error:`, error);
  });

  queue.on("error", (error) => {
    console.error("Daily game queue error:", error);
  });

  console.log("Daily game worker started and listening for jobs");
  return queue;
}

/**
 * Process creating multiple daily games
 */
async function processCreateDailyGames(job: Bull.Job) {
  const { date, count = 2 } = job.data;
  console.log(`Creating ${count} daily games for date: ${date}`);

  try {
    const createdGames = [];

    for (let i = 0; i < count; i++) {
      const game = await createSingleDailyGame(date, i + 1);
      if (game) {
        createdGames.push(game);
        console.log(`Created game ${i + 1}/${count}: ${game.songName} by ${game.artistName}`);
      }
    }

    console.log(`Successfully created ${createdGames.length} daily games`);
    return {
      success: true,
      gamesCreated: createdGames.length,
      games: createdGames.map(g => ({ id: g.id, song: g.songName, artist: g.artistName }))
    };
  } catch (error) {
    console.error("Error creating daily games:", error);
    throw error;
  }
}

/**
 * Process creating a single daily game
 */
async function processCreateSingleGame(job: Bull.Job) {
  const { date } = job.data;
  console.log(`Creating single daily game for date: ${date || 'today'}`);

  try {
    const game = await createSingleDailyGame(date);
    
    if (game) {
      console.log(`Successfully created daily game: ${game.songName} by ${game.artistName}`);
      return {
        success: true,
        game: { id: game.id, song: game.songName, artist: game.artistName }
      };
    } else {
      throw new Error("Failed to create daily game - no game returned");
    }
  } catch (error) {
    console.error("Error creating single daily game:", error);
    throw error;
  }
}

/**
 * Create a single daily game using the existing logic
 */
async function createSingleDailyGame(targetDate?: string, gameNumber?: number) {
  const today = targetDate ? new Date(targetDate) : new Date();
  today.setHours(0, 0, 0, 0);

  // If creating multiple games for the same day, adjust the time
  if (gameNumber && gameNumber > 1) {
    // For the second game, set it to noon (12:00)
    today.setHours(12, 0, 0, 0); // 12:00 for the second game
  } else {
    // First game at midnight (00:00)
    today.setHours(0, 0, 0, 0); // 00:00 for the first game
  }

  console.log(`Creating daily game for ${today.toISOString()}`);

  // Check if game already exists for this exact date/time
  const existingGame = await prisma.dailySongGame.findFirst({
    where: { 
      date: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0)
      }
    }
  });

  // If we're creating multiple games, check the exact hour too
  if (existingGame && gameNumber) {
    const existingHour = existingGame.date.getHours();
    const targetHour = today.getHours();
    
    if (existingHour === targetHour) {
      console.log(`Game already exists for ${today.toISOString()}, skipping creation`);
      return existingGame;
    }
  } else if (existingGame && !gameNumber) {
    console.log(`Game already exists for ${today.toDateString()}, skipping creation`);
    return existingGame;
  }

  // Get a random popular song with Spotify ID
  const randomSong = await prisma.mostStreamedSongs.findFirst({
    where: {
      spotifyId: { not: null },
      name: { not: null },
      artist: { not: null }
    },
    skip: Math.floor(Math.random() * 500) // Random offset in top 500
  });

  if (!randomSong || !randomSong.spotifyId) {
    throw new Error("No suitable songs found for daily game");
  }

  console.log(`Selected song: ${randomSong.name} by ${randomSong.artist}`);

  // Fetch full track data from Spotify
  const { spotifyTrackService } = await import("../spotify/trackService.js");
  let spotifyData;
  
  try {
    spotifyData = await spotifyTrackService.getTrackData(randomSong.spotifyId);
    console.log("Successfully fetched complete Spotify data");
  } catch (error) {
    console.error("Failed to fetch Spotify data, using database fallback:", error);
    
    // Fallback to database data if Spotify fetch fails
    spotifyData = {
      songId: randomSong.spotifyId,
      songName: randomSong.name!,
      artistName: randomSong.artist!,
      albumName: null,
      releaseYear: randomSong.year ? parseInt(randomSong.year) : null,
      popularity: null,
      durationMs: null,
      imageUrl: randomSong.thumbnail || null,
      isExplicit: null
    };
  }

  // Create the game with complete Spotify data
  const game = await prisma.dailySongGame.create({
    data: {
      date: today,
      songId: spotifyData.songId,
      songName: spotifyData.songName,
      artistName: spotifyData.artistName,
      albumName: spotifyData.albumName,
      genre: (spotifyData as any).genre || randomSong.genre,
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

