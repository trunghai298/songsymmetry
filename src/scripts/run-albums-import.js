const { fetchChartmastersAlbumsData } = require('./fetch-chartmasters-albums');
const { importAlbumsData } = require('./import-albums-data');

/**
 * Combined script to fetch albums data from ChartMasters and import into database
 * This script will:
 * 1. Fetch all 7,147 albums from ChartMasters API
 * 2. Process and clean the data
 * 3. Import into the MostStreamedAlbums table
 */
async function runFullAlbumsImport() {
  try {
    console.log('🎵 Starting complete albums import process...\n');

    // Step 1: Fetch data from ChartMasters API
    console.log('📥 Step 1: Fetching albums data from ChartMasters...');
    const albumsData = await fetchChartmastersAlbumsData();
    console.log(`✅ Successfully fetched ${albumsData.length} albums\n`);

    // Step 2: Import data into database
    console.log('💾 Step 2: Importing albums data into database...');
    await importAlbumsData();
    console.log('✅ Albums data imported successfully\n');

    console.log('🎉 Complete albums import process finished!');
    console.log(`📊 Total albums processed: ${albumsData.length}`);

  } catch (error) {
    console.error('❌ Error during albums import process:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  runFullAlbumsImport()
    .then(() => {
      console.log('\n🏁 Albums import process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Albums import process failed:', error);
      process.exit(1);
    });
}

module.exports = { runFullAlbumsImport };