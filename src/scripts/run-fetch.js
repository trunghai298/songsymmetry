#!/usr/bin/env node

/**
 * Simple script to run the fetch operation and display the results
 * without importing data to the database
 */

const { fetchChartmastersData } = require('./fetch-chartmasters');

console.log('Starting data fetch from chartmasters.org...');
console.log('Time:', new Date().toISOString());

fetchChartmastersData()
  .then(data => {
    console.log(`Fetch completed. Retrieved ${data.length} songs.`);
    console.log('Time:', new Date().toISOString());
    
    // Display some statistics
    let genreCounts = {};
    let yearCounts = {};
    let languageCounts = {};
    
    data.forEach(song => {
      // Count genres
      if (song.genre) {
        genreCounts[song.genre] = (genreCounts[song.genre] || 0) + 1;
      }
      
      // Count years
      if (song.year) {
        yearCounts[song.year] = (yearCounts[song.year] || 0) + 1;
      }
      
      // Count languages
      if (song.language) {
        languageCounts[song.language] = (languageCounts[song.language] || 0) + 1;
      }
    });
    
    console.log('\nData summary:');
    console.log('Top 5 genres:');
    Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([genre, count]) => {
        console.log(`  ${genre}: ${count} songs`);
      });
      
    console.log('\nYear distribution:');
    Object.entries(yearCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([year, count]) => {
        console.log(`  ${year}: ${count} songs`);
      });
      
    console.log('\nJSON data saved to src/scripts/chartmasters-data.json');
    console.log('Run this script with "node src/scripts/run-fetch.js"');
  })
  .catch(error => {
    console.error('Error during fetch:', error);
    process.exit(1);
  });