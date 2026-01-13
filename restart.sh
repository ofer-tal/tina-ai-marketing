#!/bin/bash

# Blush Marketing - Server Restart Script
# This script kills all node processes and restarts the development servers

echo "🔄 Blush Marketing Operations Center - Server Restart"
echo "======================================================="
echo ""

# Step 1: Kill all node processes
echo "🛑 Stopping all node processes..."
pkill -9 node 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Verify no node processes remain
REMAINING=$(ps aux | grep -E "node|nodemon" | grep -v grep | wc -l)
if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️  Warning: $REMAINING node process(es) still running"
    echo "   You may need to manually kill them with: kill -9 <PID>"
else
    echo "✅ All node processes stopped"
fi

echo ""
echo "🚀 Starting development servers..."
echo ""

# Start the development servers
npm run dev

# If npm run dev exits, show instructions
echo ""
echo "======================================================="
echo "Servers stopped. To restart:"
echo "  cd /c/Projects/blush-marketing"
echo "  ./restart.sh"
echo ""
echo "Or manually:"
echo "  npm run dev"
