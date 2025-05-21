import Bull from "bull";
import { PrismaClient } from "@prisma/client";
import { SONG_UPDATE_QUEUE } from "./queues";

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

  // Process jobs
  queue.process(async (job) => {
    console.log(`Processing job ${job.id} of type ${job.data.type}`);

    try {
      switch (job.data.type) {
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
    const { multiYearImport } = await import("../../scripts/multi-year-import");

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
    const { multiYearImport } = await import("../../scripts/multi-year-import");

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
    const { multiYearImport } = await import("../../scripts/multi-year-import");

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
    const { fetchChartmastersData } = await import(
      "../../scripts/fetch-chartmasters"
    );

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

export default {
  startSongUpdateWorker,
};
