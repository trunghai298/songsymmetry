#!/usr/bin/env node

/**
 * This script updates the song data in the database by fetching
 * new data from chartmasters.org and updating the database.
 * 
 * It can be run on a schedule (daily, weekly) to keep the data fresh.
 * 
 * Usage:
 *   node update-songs-data.js [options]
 * 
 * Options:
 *   --cached    Use locally cached data instead of fetching new data
 *   --dry-run   Simulate the import without making database changes
 *   --year      Specify year to fetch data for (default: 2024)
 */

const { importChartmasterData } = require('./import-chartmasters-data');

// Wrap in async IIFE to enable top-level await
(async () => {
  console.log('Starting song data update...');
  console.log('Time:', new Date().toISOString());
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  const useCachedData = args.includes('--cached');
  const dryRun = args.includes('--dry-run');
  
  // Parse year parameter
  let year = "2024";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && i + 1 < args.length) {
      year = args[i + 1];
      break;
    }
  }
  
  try {
    console.log(`Processing data for year: ${year}`);
    const startTime = Date.now();
    const results = await importChartmasterData({ useCachedData, dryRun, year });
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\nUpdate ${dryRun ? 'analysis' : 'operation'} completed successfully:`);
    console.log(`- ${dryRun ? 'Would create' : 'New songs created'}: ${results.created}`);
    console.log(`- ${dryRun ? 'Would update' : 'Songs updated'}: ${results.updated}`);
    console.log(`- Unchanged: ${results.unchanged}`);
    console.log(`- Errors: ${results.errors}`);
    console.log(`- Total processed: ${results.total}`);
    console.log(`- Duration: ${duration.toFixed(2)} seconds`);
    console.log('Time:', new Date().toISOString());
    
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
})();