const { PrismaClient } = require('@prisma/client');
const { fetchChartmastersData } = require('./fetch-chartmasters');
const path = require('path');
const fs = require('fs');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Script to fetch and import song data for multiple years (2020-2025)
 * This script will:
 * 1. Fetch data for each year from chartmasters.org
 * 2. Process and save the data to JSON files (for caching)
 * 3. Import the data into the database
 * 4. Generate a summary report of all operations
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.useCachedData - Use cached data files instead of fetching new data
 * @param {boolean} options.dryRun - If true, no database changes will be made, just simulation
 * @param {number[]} options.years - Array of years to process (defaults to 2020-2025)
 * @param {number} options.limit - Maximum number of songs to fetch per year (default: 10000)
 */
async function multiYearImport(options = {}) {
  // Set default options
  const config = {
    useCachedData: options.useCachedData || false,
    dryRun: options.dryRun || false,
    years: options.years || [2020, 2021, 2022, 2023, 2024, 2025],
    limit: options.limit || 10000,
    concurrentYears: options.concurrentYears || false
  };

  console.log('\n=== Multi-Year Song Data Import Tool ===');
  console.log(`Years to process: ${config.years.join(', ')}`);
  console.log(`Use cached data: ${config.useCachedData}`);
  console.log(`Dry run mode: ${config.dryRun}`);
  console.log(`Limit per year: ${config.limit}`);
  console.log('=======================================\n');

  // Summary statistics
  const summary = {
    totalProcessed: 0,
    totalCreated: 0,
    totalUpdated: 0,
    totalUnchanged: 0,
    totalErrors: 0,
    yearStats: {}
  };

  try {
    // Process each year sequentially to avoid rate limiting
    if (config.concurrentYears) {
      // Process all years in parallel (warning: may trigger rate limiting)
      console.log('Processing all years in parallel (warning: may trigger rate limiting)');
      const promises = config.years.map(year => processYear(year, config, summary));
      await Promise.all(promises);
    } else {
      // Process years sequentially (safer)
      for (const year of config.years) {
        await processYear(year, config, summary);
      }
    }

    // Display final summary
    console.log('\n=== Final Import Summary ===');
    for (const year of config.years) {
      if (summary.yearStats[year]) {
        const stats = summary.yearStats[year];
        console.log(`\nYear ${year}:`);
        console.log(`- Processed: ${stats.processed}`);
        console.log(`- Created: ${stats.created}`);
        console.log(`- Updated: ${stats.updated}`);
        console.log(`- Unchanged: ${stats.unchanged}`);
        console.log(`- Errors: ${stats.errors}`);
      }
    }
    
    console.log('\nOverall Summary:');
    console.log(`- Total Processed: ${summary.totalProcessed}`);
    console.log(`- Total Created: ${summary.totalCreated}`);
    console.log(`- Total Updated: ${summary.totalUpdated}`);
    console.log(`- Total Unchanged: ${summary.totalUnchanged}`);
    console.log(`- Total Errors: ${summary.totalErrors}`);

    if (config.dryRun) {
      console.log('\nThis was a dry run. No database changes were made.');
      console.log('To perform the actual import, run without the --dry-run flag.');
    }

    return summary;
  } catch (error) {
    console.error('Multi-year import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Process a single year of data
 * @param {number} year - The year to process
 * @param {Object} config - Configuration options
 * @param {Object} summary - Summary statistics object to update
 */
async function processYear(year, config, summary) {
  console.log(`\nProcessing year ${year}...`);
  
  try {
    // Initialize year stats
    summary.yearStats[year] = {
      processed: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    };

    // Get song data for this year
    let songData;
    const yearStr = year.toString();
    const dataPath = path.join(__dirname, `chartmasters-data-${yearStr}.json`);
    
    if (config.useCachedData && fs.existsSync(dataPath)) {
      console.log(`Using cached data file for year ${yearStr}...`);
      songData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } else {
      console.log(`Fetching fresh data for year ${yearStr}...`);
      songData = await fetchChartmastersData({ 
        year: yearStr, 
        limit: config.limit 
      });
    }

    if (!songData || songData.length === 0) {
      console.log(`No data available for year ${yearStr}`);
      return;
    }

    console.log(`Found ${songData.length} songs for year ${yearStr}`);
    
    // Track progress for this year
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    
    // Sample of songs that would be updated/created (for dry run mode)
    let sampleUpdates = [];
    let sampleCreates = [];
    
    // Log mode information
    if (config.dryRun) {
      console.log(`DRY RUN MODE: Analyzing what would happen for year ${yearStr}`);
    } else {
      console.log(`Beginning database import for year ${yearStr}...`);
    }
    
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
          if (existingSong.streamCount !== BigInt(song.streamCount) || 
              existingSong.dailyStreamCount !== BigInt(song.dailyStreamCount)) {
            
            // Store before/after sample for dry run mode
            if (config.dryRun && sampleUpdates.length < 3) {
              sampleUpdates.push({
                title: song.title,
                artist: song.artist,
                oldStreamCount: existingSong.streamCount?.toString(),
                newStreamCount: song.streamCount,
                oldDailyStreamCount: existingSong.dailyStreamCount?.toString(),
                newDailyStreamCount: song.dailyStreamCount
              });
            }
            
            // Only update if not in dry run mode
            if (!config.dryRun) {
              await prisma.mostStreamedSongs.update({
                where: { id: existingSong.id },
                data: {
                  streamCount: BigInt(song.streamCount),
                  dailyStreamCount: BigInt(song.dailyStreamCount),
                  updatedAt: new Date(), // Update the timestamp
                },
              });
            }
            updated++;
          } else {
            unchanged++;
          }
        } else {
          // Store sample for dry run mode
          if (config.dryRun && sampleCreates.length < 3) {
            sampleCreates.push({
              title: song.title,
              artist: song.artist,
              streamCount: song.streamCount,
              dailyStreamCount: song.dailyStreamCount,
              year: song.year
            });
          }
          
          // Only create if not in dry run mode
          if (!config.dryRun) {
            // Create new record
            await prisma.mostStreamedSongs.create({
              data: {
                name: song.title,
                artist: song.artist,
                year: song.year,
                genre: song.genre || 'Unknown',
                language: song.language || 'Unknown',
                streamCount: BigInt(song.streamCount),
                dailyStreamCount: BigInt(song.dailyStreamCount),
                thumbnail: song.imageUrl,
                // These will be set automatically by Prisma
                // createdAt: new Date(),
                // updatedAt: new Date(),
              },
            });
          }
          created++;
        }
      } catch (err) {
        console.error(`Error processing song: ${song.title} by ${song.artist}`, err);
        errors++;
      }
    }

    // Update summary statistics
    summary.yearStats[year] = {
      processed: songData.length,
      created,
      updated,
      unchanged,
      errors
    };
    
    summary.totalProcessed += songData.length;
    summary.totalCreated += created;
    summary.totalUpdated += updated;
    summary.totalUnchanged += unchanged;
    summary.totalErrors += errors;

    // Print year summary
    console.log(`\nCompleted processing for year ${yearStr}:`);
    console.log(`- ${config.dryRun ? 'Would create' : 'Created'}: ${created}`);
    console.log(`- ${config.dryRun ? 'Would update' : 'Updated'}: ${updated}`);
    console.log(`- Unchanged: ${unchanged}`);
    console.log(`- Errors: ${errors}`);
    console.log(`- Total processed: ${songData.length}`);
    
    // For dry run, show samples of what would be created/updated
    if (config.dryRun) {
      if (sampleCreates.length > 0) {
        console.log(`\nSample of songs that would be created for ${yearStr}:`);
        sampleCreates.forEach((song, i) => {
          console.log(`${i+1}. "${song.title}" by ${song.artist} (${song.year})`);
          console.log(`   Stream count: ${song.streamCount}, Daily stream count: ${song.dailyStreamCount}`);
        });
      }
      
      if (sampleUpdates.length > 0) {
        console.log(`\nSample of songs that would be updated for ${yearStr}:`);
        sampleUpdates.forEach((song, i) => {
          console.log(`${i+1}. "${song.title}" by ${song.artist}`);
          console.log(`   Stream count: ${song.oldStreamCount} -> ${song.newStreamCount}`);
          console.log(`   Daily stream count: ${song.oldDailyStreamCount} -> ${song.newDailyStreamCount}`);
        });
      }
    }
  } catch (error) {
    console.error(`Error processing year ${year}:`, error);
    summary.yearStats[year] = {
      processed: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 1
    };
    summary.totalErrors += 1;
  }
}

// Function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { 
    useCachedData: false, 
    dryRun: false,
    years: [2020, 2021, 2022, 2023, 2024, 2025],
    limit: 10000,
    concurrentYears: false
  };
  
  // Parse Boolean flags
  options.useCachedData = args.includes('--cached');
  options.dryRun = args.includes('--dry-run');
  options.concurrentYears = args.includes('--concurrent');
  
  // Parse specific years if provided
  if (args.includes('--years')) {
    const yearIndex = args.indexOf('--years');
    if (yearIndex + 1 < args.length) {
      const yearArg = args[yearIndex + 1];
      // Check if it's a year range or specific years
      if (yearArg.includes('-')) {
        // Year range like 2020-2023
        const [start, end] = yearArg.split('-').map(y => parseInt(y, 10));
        options.years = [];
        for (let y = start; y <= end; y++) {
          options.years.push(y);
        }
      } else if (yearArg.includes(',')) {
        // Comma-separated years like 2020,2022,2024
        options.years = yearArg.split(',').map(y => parseInt(y, 10));
      } else {
        // Single year
        options.years = [parseInt(yearArg, 10)];
      }
    }
  }
  
  // Parse limit parameter
  if (args.includes('--limit')) {
    const limitIndex = args.indexOf('--limit');
    if (limitIndex + 1 < args.length) {
      options.limit = parseInt(args[limitIndex + 1], 10);
    }
  }
  
  return options;
}

// Add the ability to run this script directly
if (require.main === module) {
  // Parse command line arguments
  const options = parseArgs();
  
  console.log('\n=== Multi-Year Song Data Import Tool ===');
  console.log('Options:');
  console.log('--cached        Use cached data files (faster, no new data fetch)');
  console.log('--dry-run       Simulate import without making database changes');
  console.log('--years         Specify years to process (e.g., "2020-2023" or "2020,2022,2024")');
  console.log('--limit         Maximum songs to fetch per year (default: 10000)');
  console.log('--concurrent    Process all years in parallel (warning: may trigger rate limiting)');
  console.log('==========================================\n');
  
  multiYearImport(options)
    .then(summary => {
      console.log('\nScript completed successfully');
      
      if (options.dryRun) {
        console.log('\nTo run the actual import, run this command without --dry-run');
      }
      
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

// Export the function for use in other scripts
module.exports = { multiYearImport };