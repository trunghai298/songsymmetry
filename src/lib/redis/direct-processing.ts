import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Directly process a daily update without using Bull queue
 * This avoids issues with Redis/Bull on Fly.io
 */
export async function processDailyUpdate(): Promise<any> {
  console.log('Starting direct daily update execution');
  
  try {
    // Import the fetch script directly
    const { fetchChartmastersData } = await import('../scripts/fetch-chartmasters');
    
    // Get the current year
    const currentYear = new Date().getFullYear().toString();
    
    // Configure fetch options - just the current year with a smaller limit
    const options = {
      year: currentYear,
      limit: 1000 // Smaller limit for daily updates
    };
    
    console.log(`Fetching latest data for year ${currentYear}...`);
    
    // Fetch the latest data
    const songs = await fetchChartmastersData(options);
    
    console.log(`Processing ${songs.length} songs...`);
    
    // Now update the database with the fetched songs
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    
    for (const song of songs) {
      try {
        // Try to find existing song
        const existingSong = await prisma.mostStreamedSongs.findFirst({
          where: {
            name: song.title,
            artist: song.artist,
            year: song.year,
          },
        });
        
        if (existingSong) {
          // Update if stream counts changed
          if (existingSong.streamCount !== BigInt(song.streamCount) || 
              existingSong.dailyStreamCount !== BigInt(song.dailyStreamCount)) {
            
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
            },
          });
          created++;
        }
      } catch (err) {
        console.error(`Error processing song: ${song.title} by ${song.artist}`, err);
        errors++;
      }
    }
    
    const result = {
      processed: songs.length,
      created,
      updated,
      unchanged,
      errors,
      timestamp: new Date().toISOString()
    };
    
    console.log('Daily update completed with results:', result);
    
    return result;
  } catch (error) {
    console.error('Error during direct daily update:', error);
    throw error;
  } finally {
    // Ensure Prisma connection is closed
    await prisma.$disconnect();
  }
}