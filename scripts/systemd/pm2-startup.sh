#!/bin/bash
# PM2 Startup Wrapper for systemd
# This script loads nvm with Node 24 and then starts PM2

# Source nvm to get Node and PM2 paths
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Set default Node version to 24
nvm use 24.13.1 2>/dev/null || true

# Change to project directory
cd /home/ofer/blush-marketing || exit 1

# Resurrect PM2 processes (starts all saved processes)
pm2 resurrect
