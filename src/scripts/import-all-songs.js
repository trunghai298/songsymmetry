const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Imports all songs data from all-songs-data.json into the database
 * @param {Object} options - Configuration options
 * @param {boolean} options.dryRun - If true, no database changes will be made, just simulation
 * @param {boolean} options.forceUpdate - If true, update all records even if unchanged
 */
async function importAllSongs(options = { dryRun: false, forceUpdate: false }) {
  try {
    // Load the all-songs-data.json file
    const dataPath = path.join(__dirname, 'all-songs-data.json');
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}. Please run fetch-all-songs.js first.`);
    }
    
    console.log('Loading all songs data from all-songs-data.json...');
    const songData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
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
    
    // First, get all existing songs to avoid repeated database queries
    console.log('Loading existing songs from database...');
    const existingSongs = await prisma.mostStreamedSongs.findMany();
    
    // Create a lookup map for faster searching
    const songLookup = new Map();
    existingSongs.forEach(song => {
      const key = `${song.name}|${song.artist}|${song.year}`;
      songLookup.set(key, song);
    });
    
    console.log(`Found ${existingSongs.length} existing songs in database`);
    
    // Prepare arrays for batch operations
    let songsToCreate = [];
    let songsToUpdate = [];
    
    // Process songs and prepare batch operations
    for (const [index, song] of songData.entries()) {
      try {
        // Show progress every 500 songs
        if (index % 500 === 0) {
          console.log(`Processing song ${index + 1}/${songData.length}...`);
        }
        
        // Look up existing song from our map
        const lookupKey = `${song.title}|${song.artist}|${song.year}`;
        const existingSong = songLookup.get(lookupKey);
        
        if (existingSong) {
          // Check if streamCount or dailyStreamCount are different or force update
          const streamCountChanged = existingSong.streamCount !== BigInt(song.streamCount);
          const dailyStreamCountChanged = existingSong.dailyStreamCount !== BigInt(song.dailyStreamCount);
          const genreChanged = existingSong.genre !== song.genre;
          const languageChanged = existingSong.language !== song.language;
          const thumbnailChanged = existingSong.thumbnail !== song.imageUrl;
          
          if (options.forceUpdate || streamCountChanged || dailyStreamCountChanged || 
              genreChanged || languageChanged || thumbnailChanged) {
            
            // Store before/after sample for dry run mode
            if (options.dryRun && sampleUpdates.length < 5) {
              sampleUpdates.push({
                title: song.title,
                artist: song.artist,
                oldStreamCount: existingSong.streamCount?.toString(),
                newStreamCount: song.streamCount,
                oldDailyStreamCount: existingSong.dailyStreamCount?.toString(),
                newDailyStreamCount: song.dailyStreamCount,
                oldGenre: existingSong.genre,
                newGenre: song.genre,
                oldLanguage: existingSong.language,
                newLanguage: song.language
              });
            }
            
            // Add to update batch
            if (!options.dryRun) {
              songsToUpdate.push({
                id: existingSong.id,
                data: {
                  streamCount: BigInt(song.streamCount),
                  dailyStreamCount: BigInt(song.dailyStreamCount),
                  genre: song.genre || 'Unknown',
                  language: song.language || 'Unknown',
                  thumbnail: song.imageUrl,
                  updatedAt: new Date(),
                }
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
              year: song.year,
              genre: song.genre,
              language: song.language
            });
          }
          
          // Add to create batch
          if (!options.dryRun) {
            songsToCreate.push({
              name: song.title,
              artist: song.artist,
              year: song.year,
              genre: song.genre || 'Unknown',
              language: song.language || 'Unknown',
              streamCount: BigInt(song.streamCount),
              dailyStreamCount: BigInt(song.dailyStreamCount),
              thumbnail: song.imageUrl,
            });
          }
          created++;
        }
      } catch (err) {
        console.error(`Error processing song: ${song.title} by ${song.artist}`, err);
        errors++;
      }
    }
    
    // Execute batch operations
    if (!options.dryRun) {
      // Batch create new songs
      if (songsToCreate.length > 0) {
        console.log(`Creating ${songsToCreate.length} new songs in batches...`);
        const batchSize = 100;
        for (let i = 0; i < songsToCreate.length; i += batchSize) {
          const batch = songsToCreate.slice(i, i + batchSize);
          console.log(`Creating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(songsToCreate.length/batchSize)}...`);
          await prisma.mostStreamedSongs.createMany({
            data: batch,
            skipDuplicates: true
          });
        }
      }
      
      // Batch update existing songs
      if (songsToUpdate.length > 0) {
        console.log(`Updating ${songsToUpdate.length} existing songs...`);
        for (const songUpdate of songsToUpdate) {
          await prisma.mostStreamedSongs.update({
            where: { id: songUpdate.id },
            data: songUpdate.data
          });
        }
      }
    }
    
    console.log(`\n${options.dryRun ? 'Analysis' : 'Import'} complete:`);
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
          console.log(`   Stream count: ${song.streamCount}, Daily: ${song.dailyStreamCount}`);
          console.log(`   Genre: ${song.genre}, Language: ${song.language}`);
        });
      }
      
      if (sampleUpdates.length > 0) {
        console.log("\nSample of songs that would be updated:");
        sampleUpdates.forEach((song, i) => {
          console.log(`${i+1}. "${song.title}" by ${song.artist}`);
          console.log(`   Stream count: ${song.oldStreamCount} -> ${song.newStreamCount}`);
          console.log(`   Daily streams: ${song.oldDailyStreamCount} -> ${song.newDailyStreamCount}`);
          if (song.oldGenre !== song.newGenre) {
            console.log(`   Genre: ${song.oldGenre} -> ${song.newGenre}`);
          }
          if (song.oldLanguage !== song.newLanguage) {
            console.log(`   Language: ${song.oldLanguage} -> ${song.newLanguage}`);
          }
        });
      }
    }
    
    // Show language distribution
    const languageStats = {};
    songData.forEach(song => {
      const lang = song.language || 'Unknown';
      languageStats[lang] = (languageStats[lang] || 0) + 1;
    });
    
    console.log('\nLanguage distribution in dataset:');
    Object.entries(languageStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([lang, count]) => {
        console.log(`  ${lang}: ${count} songs`);
      });
    
    return { 
      created, 
      updated, 
      unchanged,
      errors, 
      total: songData.length, 
      sampleCreates: options.dryRun ? sampleCreates : [], 
      sampleUpdates: options.dryRun ? sampleUpdates : [],
      languageStats
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
    dryRun: false,
    forceUpdate: false
  };
  
  // Parse Boolean flags
  options.dryRun = args.includes('--dry-run');
  options.forceUpdate = args.includes('--force-update');
  
  return options;
}

// Add the ability to run this script directly
if (require.main === module) {
  // Parse command line arguments
  const options = parseArgs();
  
  console.log('\n=== All Songs Data Import Tool ===');
  console.log('Options:');
  console.log('--dry-run      Simulate import without making database changes');
  console.log('--force-update Update all records even if unchanged');
  console.log('=====================================\n');
  console.log(`Running with dry-run: ${options.dryRun}, force-update: ${options.forceUpdate}`);
  
  importAllSongs(options)
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
module.exports = { importAllSongs };