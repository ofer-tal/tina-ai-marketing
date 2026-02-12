#!/bin/bash
# PM2 Restart Script for Blush Marketing
# Restarts services with safety check for active jobs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Blush Marketing - PM2 Restart${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PM2 is installed
# Try command -v first, then try to detect nvm installation
if ! command -v pm2 &> /dev/null; then
  # Try to detect nvm installation and node version
  if [ -d "$HOME/.nvm" ]; then
    NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2)
    if [ -n "$NODE_VERSION" ]; then
      NVM_PM2="$HOME/.nvm/versions/node/v$NODE_VERSION/bin/pm2"
      if [ -f "$NVM_PM2" ]; then
        PM2_CMD="$NVM_PM2"
      else
        PM2_CMD=$(find "$HOME/.nvm/versions/node" -name "pm2" -type f 2>/dev/null | head -1)
        if [ -z "$PM2_CMD" ]; then
          echo -e "${RED}Error: PM2 is not installed${NC}"
          exit 1
        fi
      fi
    else
      echo -e "${RED}Error: PM2 is not installed${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error: PM2 is not installed${NC}"
    exit 1
  fi
else
  PM2_CMD="pm2"
fi

run_pm2() {
  if [ "$PM2_CMD" = "pm2" ]; then
    pm2 "$@"
  else
    "$PM2_CMD" "$@"
  fi
}

# Check if processes are running
if ! run_pm2 describe blush-marketing-backend &> /dev/null; then
  echo -e "${YELLOW}⚠️  No processes are currently running${NC}"
  echo ""
  read -p "Do you want to start services instead? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    exec "$SCRIPT_DIR/start.sh"
  else
    exit 0
  fi
fi

# Show current status
echo -e "${BLUE}Current status:${NC}"
run_pm2 status blush-marketing-backend
echo ""

# Check for active jobs (if safe restart is enabled)
if [ "${SAFE_RESTART:-true}" = "true" ]; then
  echo -e "${BLUE}Checking for active jobs...${NC}"
  # This is a simplified check - in production, you'd query the API
  echo -e "${YELLOW}Note: Restart may interrupt long-running jobs${NC}"
  echo ""
  read -p "Continue with restart? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restart cancelled${NC}"
    exit 0
  fi
fi

# Restart the backend
echo -e "${BLUE}Restarting services...${NC}"
run_pm2 restart blush-marketing-backend

# Save PM2 process list
run_pm2 save

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Services restarted successfully${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Stream logs with: npm run pm2:logs:follow"
echo ""
