const { PrismaClient } = require('@prisma/client');
const { fetchChartmastersData } = require('./fetch-chartmasters');
const path = require('path');
const fs = require('fs');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Imports chart data into the database
 * Can either use a local JSON file or fetch fresh data
 */
async function importChartmasterData(options = { useCachedData: false }) {
  try {
    let songData;
    
    // Either use cached data or fetch fresh data
    if (options.useCachedData) {
      const dataPath = path.join(__dirname, 'chartmasters-data.json');
      
      if (fs.existsSync(dataPath)) {
        console.log('Using cached data file...');
        songData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      } else {
        console.log('Cached file not found, fetching fresh data...');
        songData = await fetchChartmastersData();
      }
    } else {
      console.log('Fetching fresh data...');
      songData = await fetchChartmastersData();
    }
    
    console.log(`Preparing to import ${songData.length} songs to database...`);
    
    // Track progress
    let created = 0;
    let updated = 0;
    let errors = 0;
    
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
          // Update existing record
          await prisma.mostStreamedSongs.update({
            where: { id: existingSong.id },
            data: {
              streamCount: song.streamCount,
              dailyStreams: song.dailyStreams,
              thumbnail: song.imageUrl,
              rank: song.rank,
              // Only update these if they have values
              genre: song.genre || existingSong.genre,
              language: song.language || existingSong.language,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          // Create new record
          await prisma.mostStreamedSongs.create({
            data: {
              name: song.title,
              artist: song.artist,
              year: song.year,
              genre: song.genre || 'Unknown',
              language: song.language || 'Unknown',
              streamCount: song.streamCount,
              dailyStreams: song.dailyStreams,
              thumbnail: song.imageUrl,
              rank: song.rank,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          created++;
        }
      } catch (err) {
        console.error(`Error processing song: ${song.title} by ${song.artist}`, err);
        errors++;
      }
    }
    
    console.log('Import complete:');
    console.log(`- Created: ${created}`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Errors: ${errors}`);
    console.log(`- Total processed: ${songData.length}`);
    
    return { created, updated, errors, total: songData.length };
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Add the ability to run this script directly
if (require.main === module) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const useCachedData = args.includes('--cached');
  
  importChartmasterData({ useCachedData })
    .then(results => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

// Export the function for use in other scripts
module.exports = { importChartmasterData };