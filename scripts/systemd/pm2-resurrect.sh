#!/bin/bash
# PM2 Startup Wrapper for systemd
# This script properly loads nvm and runs PM2 resurrect once

# Exit if already running to prevent fork bombs
if [ -f /tmp/blush-marketing-pm2-lock ]; then
  echo "PM2 startup already in progress"
  exit 0
fi

# Create lock file
touch /tmp/blush-marketing-pm2-lock

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Use Node 24
nvm use 24.13.1 >/dev/null 2>&1 || true

# Change to project directory
cd /home/ofer/blush-marketing || exit 1

# Ensure PM2 directory exists (use project-local .pm2 for systemd)
mkdir -p .pm2

# Set PM2 to use project-local directory for state
export PM2_HOME="/home/ofer/blush-marketing/.pm2"

# Run PM2 resurrect (will start all saved processes)
pm2 resurrect

# Remove lock file
rm -f /tmp/blush-marketing-pm2-lock
