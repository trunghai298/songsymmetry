#!/usr/bin/env node
/**
 * Auto-import script for scheduled execution
 * This script is designed to be run automatically by a scheduler (cron)
 * It will import song data for all years from 2020 to current year
 * 
 * Features:
 * - Automatic logging to a log file
 * - Emailing of results (if configured)
 * - Proper error handling and reporting
 */

const { multiYearImport } = require('./multi-year-import');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const config = {
  logDir: path.join(__dirname, '../../logs'),
  sendEmail: false,
  emailRecipient: '', // Set your email here if you want to receive notifications
  yearRange: getCurrentYearRange(),
  limit: 10000,
  concurrentYears: false,
  useCachedData: false // Always fetch fresh data for scheduled runs
};

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

// Set up logging
const logFile = path.join(config.logDir, `auto-import-${new Date().toISOString().slice(0, 10)}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Redirect console output to the log file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  const message = Array.from(arguments).join(' ');
  logStream.write(`${new Date().toISOString()} [INFO]: ${message}\n`);
  originalConsoleLog.apply(console, arguments);
};

console.error = function() {
  const message = Array.from(arguments).join(' ');
  logStream.write(`${new Date().toISOString()} [ERROR]: ${message}\n`);
  originalConsoleError.apply(console, arguments);
};

// Get the range of years from 2020 to current year
function getCurrentYearRange() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = 2020; year <= currentYear; year++) {
    years.push(year);
  }
  return years;
}

// Main execution
async function runAutoImport() {
  console.log('=== Starting Automated Song Data Import ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Years to process: ${config.yearRange.join(', ')}`);
  
  try {
    // Run the import with production settings
    const options = {
      useCachedData: config.useCachedData,
      dryRun: false, // Always make actual changes in scheduled run
      years: config.yearRange,
      limit: config.limit,
      concurrentYears: config.concurrentYears
    };
    
    console.log('Starting import with options:', JSON.stringify(options, null, 2));
    
    const summary = await multiYearImport(options);
    
    // Log the results
    console.log('\n=== Import Summary ===');
    console.log(`Total Processed: ${summary.totalProcessed}`);
    console.log(`Total Created: ${summary.totalCreated}`);
    console.log(`Total Updated: ${summary.totalUpdated}`);
    console.log(`Total Unchanged: ${summary.totalUnchanged}`);
    console.log(`Total Errors: ${summary.totalErrors}`);
    
    // Send email notification if configured
    if (config.sendEmail && config.emailRecipient) {
      sendEmailNotification(summary);
    }
    
    console.log('=== Automated Import Completed Successfully ===');
    
    // Close the log stream
    logStream.end();
    
    return summary;
  } catch (error) {
    console.error('Automated import failed:', error);
    
    // Send failure email notification if configured
    if (config.sendEmail && config.emailRecipient) {
      sendEmailNotification(null, error);
    }
    
    // Close the log stream
    logStream.end();
    
    throw error;
  }
}

// Simple email notification using system mail command
function sendEmailNotification(summary, error = null) {
  const subject = error 
    ? 'ERROR: Song Data Automated Import Failed' 
    : 'Song Data Automated Import Completed';
  
  let body = '';
  
  if (error) {
    body = `The automated song data import failed with the following error:\n\n${error.toString()}\n\nPlease check the logs at ${logFile} for more details.`;
  } else {
    body = `The automated song data import completed successfully.\n\n`;
    body += `Summary:\n`;
    body += `- Total Processed: ${summary.totalProcessed}\n`;
    body += `- Total Created: ${summary.totalCreated}\n`;
    body += `- Total Updated: ${summary.totalUpdated}\n`;
    body += `- Total Unchanged: ${summary.totalUnchanged}\n`;
    body += `- Total Errors: ${summary.totalErrors}\n\n`;
    body += `Please check the logs at ${logFile} for more details.`;
  }
  
  const mailCommand = `echo "${body}" | mail -s "${subject}" ${config.emailRecipient}`;
  
  exec(mailCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Failed to send email notification: ${error}`);
      return;
    }
    console.log('Email notification sent successfully');
  });
}

// If run directly via CLI
if (require.main === module) {
  runAutoImport()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Error in auto import script:', error);
      process.exit(1);
    });
}

module.exports = { runAutoImport };