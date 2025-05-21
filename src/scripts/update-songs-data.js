#!/usr/bin/env node

/**
 * This script updates the song data in the database by fetching
 * new data from chartmasters.org and updating the database.
 * 
 * It can be run on a schedule (daily, weekly) to keep the data fresh.
 * 
 * Usage:
 *   node update-songs-data.js [--cached]
 * 
 * Options:
 *   --cached    Use locally cached data instead of fetching new data
 */

const { importChartmasterData } = require('./import-chartmasters-data');

// Wrap in async IIFE to enable top-level await
(async () => {
  console.log('Starting song data update...');
  console.log('Time:', new Date().toISOString());
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  const useCachedData = args.includes('--cached');
  
  try {
    const startTime = Date.now();
    const results = await importChartmasterData({ useCachedData });
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('Update completed successfully:');
    console.log(`- New songs created: ${results.created}`);
    console.log(`- Existing songs updated: ${results.updated}`);
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