#!/usr/bin/env node
const { multiYearImport } = require('./multi-year-import');

// Default options
const options = {
  useCachedData: false,
  dryRun: true,  // Default to dry run for safety
  years: [2020, 2021, 2022, 2023, 2024, 2025],
  limit: 10000,
  concurrentYears: false
};

console.log('Starting multi-year import with dry run mode...');
console.log('This will show what would happen without making any changes.');
console.log('To perform the actual import, run with --no-dry-run');

// Process command line arguments
const args = process.argv.slice(2);
if (args.includes('--no-dry-run')) {
  options.dryRun = false;
}

if (args.includes('--cached')) {
  options.useCachedData = true;
}

if (args.includes('--concurrent')) {
  options.concurrentYears = true;
}

// Run the import
multiYearImport(options)
  .then(() => {
    console.log('Completed multi-year import process');
  })
  .catch(error => {
    console.error('Error during multi-year import:', error);
    process.exit(1);
  });