#!/bin/bash
# Weekly import script for SongSymmetry
# This script is designed to be run by launchd (on macOS) or cron (on Linux)

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Change to the project directory
cd "$PROJECT_DIR" || { echo "Failed to change to project directory"; exit 1; }

echo "Starting weekly song data import at $(date)"
echo "Working directory: $(pwd)"

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Log file
LOG_FILE="$PROJECT_DIR/logs/weekly-import-$(date +%Y-%m-%d).log"

# Export Node options if needed
# export NODE_OPTIONS=--max-old-space-size=4096

# Run the script
echo "Running auto-import.js script..." | tee -a "$LOG_FILE"

# Redirect both stdout and stderr to the log file and console
node "$SCRIPT_DIR/auto-import.js" 2>&1 | tee -a "$LOG_FILE"

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "Weekly import completed successfully at $(date)" | tee -a "$LOG_FILE"
else
  echo "Weekly import failed at $(date)" | tee -a "$LOG_FILE"
fi