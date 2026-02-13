#!/bin/bash
# PM2 Start Script for Blush Marketing
# Usage: ./start.sh [mode]
#   mode: dev (default), dev-watch, prod

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

# Default mode
MODE=${1:-"dev"}

# Validate mode
case "$MODE" in
  dev|development|stable)
    MODE="dev"
    WATCH=""
    ;;
  dev-watch|watch|hot-reload)
    MODE="dev-watch"
    WATCH="--watch"
    ;;
  prod|production)
    MODE="production"
    WATCH=""
    ;;
  *)
    echo -e "${RED}Error: Invalid mode '$MODE'${NC}"
    echo "Usage: $0 [dev|dev-watch|prod]"
    exit 1
    ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Blush Marketing - PM2 Start${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Mode: ${GREEN}${MODE}${NC}"
echo ""

# Check if PM2 is installed
# Try command -v first, then try to detect nvm installation
if ! command -v pm2 &> /dev/null; then
  # Try to detect nvm installation and node version
  if [ -d "$HOME/.nvm" ]; then
    # Get current node version
    NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2)
    if [ -n "$NODE_VERSION" ]; then
      NVM_PM2="$HOME/.nvm/versions/node/v$NODE_VERSION/bin/pm2"
      if [ -f "$NVM_PM2" ]; then
        PM2_CMD="$NVM_PM2"
      else
        # Try to find any installed pm2
        PM2_CMD=$(find "$HOME/.nvm/versions/node" -name "pm2" -type f 2>/dev/null | head -1)
        if [ -z "$PM2_CMD" ]; then
          echo -e "${RED}Error: PM2 is not installed${NC}"
          echo "Install with: npm install -g pm2"
          exit 1
        fi
      fi
    else
      echo -e "${RED}Error: PM2 is not installed${NC}"
      echo "Install with: npm install -g pm2"
      exit 1
    fi
  else
    echo -e "${RED}Error: PM2 is not installed${NC}"
    echo "Install with: npm install -g pm2"
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

# Check if already running
if run_pm2 describe blush-marketing-backend &> /dev/null; then
  echo -e "${YELLOW}⚠️  Backend is already running${NC}"
  echo ""
  run_pm2 status blush-marketing-backend
  echo ""
  read -p "Do you want to restart it? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_pm2 restart blush-marketing-backend
    echo -e "${GREEN}✓ Backend restarted${NC}"
  else
    echo "Skipping..."
  fi
  exit 0
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the appropriate configuration
case "$MODE" in
  dev)
    echo -e "${BLUE}Starting in STABLE development mode...${NC}"
    echo "- No file watch (services won't restart on edits)"
    echo "- Crash-only restarts"
    echo "- Safe for long-running jobs"
    echo ""
    run_pm2 start ecosystem/ecosystem/ecosystem.development.cjs --env development --only blush-marketing-backend
    ;;
  dev-watch)
    echo -e "${BLUE}Starting in HOT RELOAD development mode...${NC}"
    echo "- File watch ENABLED (3s delay)"
    echo "- Auto-restart on changes"
    echo "- ${YELLOW}WARNING: May interrupt long-running jobs${NC}"
    echo ""
    run_pm2 start ecosystem/ecosystem/ecosystem.development.cjs --env development --watch --only blush-marketing-backend
    ;;
  production)
    echo -e "${BLUE}Starting in PRODUCTION mode...${NC}"
    echo "- No file watch"
    echo "- Crash-only restarts"
    echo "- Production logging"
    echo ""
    run_pm2 start ecosystem/ecosystem/ecosystem.production.cjs --env production --only blush-marketing-backend
    ;;
esac

# Save PM2 process list
run_pm2 save

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Services started successfully${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Useful commands:"
echo "  npm run pm2:status     - Show status"
echo "  npm run pm2:logs:follow - Stream logs in real-time"
echo "  npm run pm2:stop      - Stop services"
echo "  npm run pm2:restart   - Restart services"
echo ""
