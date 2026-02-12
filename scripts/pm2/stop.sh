#!/bin/bash
# PM2 Stop Script for Blush Marketing
# Gracefully stops all PM2-managed services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Blush Marketing - PM2 Stop${NC}"
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

# Check if any processes are running
if ! run_pm2 list | grep -q "blush-marketing"; then
  echo -e "${YELLOW}No blush-marketing processes are running${NC}"
  exit 0
fi

# Show current status before stopping
echo -e "${BLUE}Current status:${NC}"
run_pm2 list | grep "blush-marketing" || echo "No processes found"
echo ""

# Gracefully stop all blush-marketing processes
echo -e "${BLUE}Stopping services gracefully...${NC}"
run_pm2 stop blush-marketing-backend 2>/dev/null || true
run_pm2 stop blush-marketing-frontend 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Services stopped${NC}"
echo ""
echo "Note: Processes remain in PM2's list and can be restarted."
echo "To completely remove: pm2 delete blush-marketing-backend"
echo ""
