# SongSymmetry Automated Data Import

This directory contains scripts for automatically fetching and importing song data from chartmasters.org into the SongSymmetry database on a scheduled basis.

## Scripts Overview

1. **multi-year-import.js** - Core script to fetch and import data for multiple years
2. **auto-import.js** - Script designed for automatic scheduled execution
3. **weekly-import.sh** - Shell wrapper for cron/launchd scheduled execution
4. **run-multi-year-import.js** - Interactive CLI script for manual execution

## Setting Up Weekly Automation

### On macOS

1. Edit the plist file to match your paths:
   ```bash
   # Update the paths in the plist file to match your system
   vim /Users/trunghai/personal/songsymmetry/com.songsymmetry.weekly-import.plist
   ```

2. Install the launchd service:
   ```bash
   # Copy the plist file to the user's LaunchAgents directory
   cp /Users/trunghai/personal/songsymmetry/com.songsymmetry.weekly-import.plist ~/Library/LaunchAgents/
   
   # Load the service
   launchctl load ~/Library/LaunchAgents/com.songsymmetry.weekly-import.plist
   ```

3. Verify the service is installed:
   ```bash
   launchctl list | grep songsymmetry
   ```

4. To run the service immediately for testing:
   ```bash
   launchctl start com.songsymmetry.weekly-import
   ```

### On Linux with Cron

1. Edit your crontab:
   ```bash
   crontab -e
   ```

2. Add the following line to run the script every Monday at 3:00 AM:
   ```
   0 3 * * 1 /path/to/songsymmetry/src/scripts/weekly-import.sh
   ```

## Manual Execution

You can also run the scripts manually:

```bash
# Run a dry-run to see what would happen (no database changes)
npm run import:multi-year:dry

# Run with cached data (faster, uses previously downloaded files)
npm run import:multi-year:cached

# Run the full import with fresh data
npm run import:multi-year
```

## Customizing the Schedule

The default schedule is every Monday at 3:00 AM. To change this:

### On macOS

Edit the `StartCalendarInterval` in the plist file:
- Weekday: 1-7 (1 is Monday, 7 is Sunday)
- Hour: 0-23
- Minute: 0-59

After editing, reload the service:
```bash
launchctl unload ~/Library/LaunchAgents/com.songsymmetry.weekly-import.plist
launchctl load ~/Library/LaunchAgents/com.songsymmetry.weekly-import.plist
```

### On Linux

Edit the cron schedule. The format is:
```
minute hour day-of-month month day-of-week command
```

Example: `0 3 * * 1` means "every Monday at 3:00 AM"

## Logs

Logs are stored in the `/Users/trunghai/personal/songsymmetry/logs/` directory:

- Daily auto-import logs: `auto-import-YYYY-MM-DD.log`
- Weekly script execution logs: `weekly-import-YYYY-MM-DD.log`
- LaunchAgent standard output/error: `weekly-import-output.log` and `weekly-import-error.log`

## Troubleshooting

If the scheduled task isn't running:

1. Check the log files for errors
2. Verify the paths in the scripts and plist file
3. Make sure the scripts are executable:
   ```bash
   chmod +x /Users/trunghai/personal/songsymmetry/src/scripts/weekly-import.sh
   chmod +x /Users/trunghai/personal/songsymmetry/src/scripts/auto-import.js
   ```
4. On macOS, check the service status:
   ```bash
   launchctl list | grep songsymmetry
   ```

## Email Notifications

To receive email notifications when the import completes:

1. Edit `auto-import.js` and set:
   ```javascript
   const config = {
     // ... other settings
     sendEmail: true,
     emailRecipient: 'your.email@example.com',
     // ... other settings
   };
   ```

2. Ensure your system has a configured mail command that can send emails.