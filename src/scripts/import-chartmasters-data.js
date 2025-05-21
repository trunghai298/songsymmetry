const { PrismaClient } = require('@prisma/client');
const { fetchChartmastersData } = require('./fetch-chartmasters');
const path = require('path');
const fs = require('fs');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Imports chart data into the database
 * Can either use a local JSON file or fetch fresh data
 * @param {Object} options - Configuration options
 * @param {boolean} options.useCachedData - Use cached data file instead of fetching new data
 * @param {boolean} options.dryRun - If true, no database changes will be made, just simulation
 * @param {string} options.year - Year to fetch data for (default: "2024")
 */
async function importChartmasterData(options = { useCachedData: false, dryRun: false, year: "2024" }) {
  try {
    let songData;
    
    // Either use cached data or fetch fresh data
    const year = options.year || "2024";
    
    if (options.useCachedData) {
      const dataPath = path.join(__dirname, `chartmasters-data-${year}.json`);
      
      if (fs.existsSync(dataPath)) {
        console.log(`Using cached data file for year ${year}...`);
        songData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      } else {
        console.log(`Cached file for year ${year} not found, fetching fresh data...`);
        songData = await fetchChartmastersData({ year: year });
      }
    } else {
      console.log(`Fetching fresh data for year ${year}...`);
      songData = await fetchChartmastersData({ year: year });
    }
    
    // Log mode information
    if (options.dryRun) {
      console.log('DRY RUN MODE: No database changes will be made');
    }
    
    console.log(`Preparing to ${options.dryRun ? 'analyze' : 'import'} ${songData.length} songs...`);
    
    // Track progress
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    
    // Sample of songs that would be updated/created (for dry run mode)
    let sampleUpdates = [];
    let sampleCreates = [];
    
    // Import data into database
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
            if (options.dryRun && sampleUpdates.length < 5) {
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
            if (!options.dryRun) {
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
          if (options.dryRun && sampleCreates.length < 5) {
            sampleCreates.push({
              title: song.title,
              artist: song.artist,
              streamCount: song.streamCount,
              dailyStreamCount: song.dailyStreamCount,
              year: song.year
            });
          }
          
          // Only create if not in dry run mode
          if (!options.dryRun) {
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
    
    console.log(`${options.dryRun ? 'Analysis' : 'Import'} complete:`);
    console.log(`- Would create: ${created}`);
    console.log(`- Would update: ${updated}`);
    console.log(`- Unchanged: ${unchanged}`);
    console.log(`- Errors: ${errors}`);
    console.log(`- Total processed: ${songData.length}`);
    
    // For dry run, show samples of what would be created/updated
    if (options.dryRun) {
      if (sampleCreates.length > 0) {
        console.log("\nSample of songs that would be created:");
        sampleCreates.forEach((song, i) => {
          console.log(`${i+1}. "${song.title}" by ${song.artist} (${song.year})`);
          console.log(`   Stream count: ${song.streamCount}, Daily stream count: ${song.dailyStreamCount}`);
        });
      }
      
      if (sampleUpdates.length > 0) {
        console.log("\nSample of songs that would be updated:");
        sampleUpdates.forEach((song, i) => {
          console.log(`${i+1}. "${song.title}" by ${song.artist}`);
          console.log(`   Stream count: ${song.oldStreamCount} -> ${song.newStreamCount}`);
          console.log(`   Daily stream count: ${song.oldDailyStreamCount} -> ${song.newDailyStreamCount}`);
        });
      }
    }
    
    return { 
      created, 
      updated, 
      unchanged,
      errors, 
      total: songData.length, 
      sampleCreates: options.dryRun ? sampleCreates : [], 
      sampleUpdates: options.dryRun ? sampleUpdates : [] 
    };
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { 
    useCachedData: false, 
    dryRun: false,
    year: "2024"
  };
  
  // Parse Boolean flags
  options.useCachedData = args.includes('--cached');
  options.dryRun = args.includes('--dry-run');
  
  // Parse year parameter
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && i + 1 < args.length) {
      options.year = args[i + 1];
      break;
    }
  }
  
  return options;
}

// Add the ability to run this script directly
if (require.main === module) {
  // Parse command line arguments
  const options = parseArgs();
  
  console.log('\n=== Song Data Import Tool ===');
  console.log('Options:');
  console.log('--cached   Use cached data file (faster, no new data fetch)');
  console.log('--dry-run  Simulate import without making database changes');
  console.log('--year     Specify year to fetch data for (default: 2024)');
  console.log('=====================================\n');
  console.log(`Running with year: ${options.year}, cached: ${options.useCachedData}, dry-run: ${options.dryRun}`);
  
  importChartmasterData(options)
    .then(results => {
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
module.exports = { importChartmasterData };