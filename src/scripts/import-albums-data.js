const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Import albums data into the MostStreamedAlbums table
 * Reads from processed-albums-data.json file
 */
async function importAlbumsData() {
  try {
    console.log('Starting albums data import...');

    // Read the processed albums data
    const dataPath = path.join(__dirname, 'processed-albums-data.json');
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}. Please run fetch-chartmasters-albums.js first.`);
    }

    const albumsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Found ${albumsData.length} albums to import`);

    // Clear existing data (optional - remove if you want to preserve existing data)
    console.log('Clearing existing album data...');
    await prisma.mostStreamedAlbums.deleteMany({});
    console.log('Existing data cleared');

    // Import data in batches to avoid memory issues
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < albumsData.length; i += batchSize) {
      const batch = albumsData.slice(i, i + batchSize);
      
      try {
        // Prepare data for database insertion
        const albumsToInsert = batch.map(album => ({
          albName: album.albName || null,
          artist: album.artist || null,
          thumbnail: album.thumbnail || null,
          albType: album.albType || null,
          streamCount: album.streamCount ? BigInt(album.streamCount.toString()) : null,
          dailyStreamCount: album.dailyStreamCount ? BigInt(album.dailyStreamCount.toString()) : null,
          genre: album.genre || null,
          language: album.language || null,
          year: album.year || null,
        }));

        // Insert batch
        await prisma.mostStreamedAlbums.createMany({
          data: albumsToInsert,
          skipDuplicates: true, // Skip if duplicate entries exist
        });

        importedCount += batch.length;
        console.log(`Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(albumsData.length / batchSize)} - Total: ${importedCount} albums`);

      } catch (error) {
        console.error(`Error importing batch starting at index ${i}:`, error);
        // Continue with next batch
      }
    }

    console.log(`✅ Successfully imported ${importedCount} albums into the database`);

    // Display some statistics
    const totalCount = await prisma.mostStreamedAlbums.count();
    console.log(`Total albums in database: ${totalCount}`);

    // Show top 10 albums by stream count
    const topAlbums = await prisma.mostStreamedAlbums.findMany({
      orderBy: { streamCount: 'desc' },
      take: 10,
      select: {
        albName: true,
        artist: true,
        streamCount: true,
        year: true,
      }
    });

    console.log('\nTop 10 most streamed albums:');
    topAlbums.forEach((album, index) => {
      console.log(`${index + 1}. ${album.albName} by ${album.artist} - ${album.streamCount?.toString()} streams (${album.year})`);
    });

  } catch (error) {
    console.error('Error importing albums data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  importAlbumsData()
    .then(() => {
      console.log('Albums import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Albums import failed:', error);
      process.exit(1);
    });
}

module.exports = { importAlbumsData };