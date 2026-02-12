#!/bin/bash
# PM2 Log Viewer Script for Blush Marketing
# Usage: ./logs.sh [all|error|out|follow] [lines]

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

# Parse arguments
LOG_TYPE=${1:-"all"}
LINES=${2:-100}

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Blush Marketing - PM2 Logs${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Show logs based on type
case "$LOG_TYPE" in
  all|a)
    echo -e "${BLUE}Showing all logs (last ${LINES} lines)...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop viewing (doesn't stop services)${NC}"
    echo ""
    run_pm2 logs blush-marketing-backend --nostream --lines "$LINES"
    ;;
  error|err|e)
    echo -e "${BLUE}Showing error logs (last ${LINES} lines)...${NC}"
    echo ""
    run_pm2 logs blush-marketing-backend --err --nostream --lines "$LINES"
    ;;
  out|output|o)
    echo -e "${BLUE}Showing output logs (last ${LINES} lines)...${NC}"
    echo ""
    run_pm2 logs blush-marketing-backend --out --nostream --lines "$LINES"
    ;;
  follow|f|tail)
    echo -e "${BLUE}Streaming logs in real-time...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop streaming (doesn't stop services)${NC}"
    echo ""
    run_pm2 logs blush-marketing-backend --lines "$LINES"
    ;;
  frontend|front)
    echo -e "${BLUE}Showing frontend logs (last ${LINES} lines)...${NC}"
    echo ""
    run_pm2 logs blush-marketing-frontend --nostream --lines "$LINES"
    ;;
  *)
    echo -e "${RED}Error: Invalid log type '$LOG_TYPE'${NC}"
    echo ""
    echo "Usage: $0 [all|error|out|follow|frontend] [lines]"
    echo ""
    echo "Examples:"
    echo "  $0           - Show all logs (last 100 lines)"
    echo "  $0 error 50  - Show error logs (last 50 lines)"
    echo "  $0 out 200   - Show output logs (last 200 lines)"
    echo "  $0 follow    - Stream logs in real-time"
    echo ""
    echo "NPM shortcuts:"
    echo "  npm run pm2:logs       - Show all logs"
    echo "  npm run pm2:logs:err   - Show error logs"
    echo "  npm run pm2:logs:out   - Show output logs"
    echo "  npm run pm2:logs:follow - Stream logs real-time"
    exit 1
    ;;
esac
