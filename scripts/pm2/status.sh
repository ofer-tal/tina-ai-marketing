#!/bin/bash
# PM2 Status Script for Blush Marketing
# Shows service status and resource usage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

cd "$PROJECT_ROOT"

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Blush Marketing - PM2 Status          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
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

# Function to run pm2 command
run_pm2() {
  if [ "$PM2_CMD" = "pm2" ]; then
    pm2 "$@"
  else
    "$PM2_CMD" "$@"
  fi
}

# Check if any blush-marketing processes are running
if ! run_pm2 list | grep -q "blush-marketing"; then
  echo -e "${YELLOW}No blush-marketing processes are running${NC}"
  echo ""
  echo "Start services with: npm run pm2:start"
  exit 0
fi

# Show detailed status
echo -e "${BLUE}Process Status:${NC}"
run_pm2 list | grep -E "(online|stopped|errored)|blush-marketing" || echo "No processes found"
echo ""

# Show detailed info for backend
if run_pm2 describe blush-marketing-backend &> /dev/null; then
  echo -e "${BLUE}Backend Details:${NC}"
  run_pm2 describe blush-marketing-backend 2>/dev/null | grep -E "(status|restarts|cpu|memory|uptime|created|node)" || true
  echo ""
fi

# Show resource usage (try monit, fallback to show)
echo -e "${BLUE}Resource Usage:${NC}"
if run_pm2 list | grep -q "blush-marketing"; then
  run_pm2 list | grep "blush-marketing"
else
  echo "No data available"
fi
echo ""

# Show recent logs summary
echo -e "${BLUE}Recent Activity (last 5 log lines):${NC}"
run_pm2 logs blush-marketing-backend --nostream --lines 5 --no-color 2>/dev/null || true
echo ""

echo -e "${CYAN}────────────────────────────────────────────${NC}"
echo ""
echo "Useful commands:"
echo "  npm run pm2:logs:follow - Stream logs in real-time"
echo "  npm run pm2:restart      - Restart services"
echo "  npm run pm2:stop         - Stop services"
echo "  npm run pm2:monitor      - Interactive monitoring dashboard"
echo ""
