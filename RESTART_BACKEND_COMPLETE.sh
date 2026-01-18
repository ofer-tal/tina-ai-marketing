#!/bin/bash

# Feature #176 Backend Restart Script
# This script restarts the backend server to pick up ES module fixes

echo "═══════════════════════════════════════════════════════════════"
echo "Feature #176 Backend Restart Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Stop existing server
echo "[1/4] Stopping existing backend server..."
if [ -f backend.pid ]; then
  OLD_PID=$(cat backend.pid)
  echo "Found PID file: $OLD_PID"

  if ps -p $OLD_PID > /dev/null 2>&1; then
    echo "Killing process $OLD_PID..."
    kill $OLD_PID
    sleep 2

    # Force kill if still running
    if ps -p $OLD_PID > /dev/null 2>&1; then
      echo "Force killing process $OLD_PID..."
      kill -9 $OLD_PID
      sleep 1
    fi

    echo "✓ Process stopped"
  else
    echo "✓ Process already stopped"
  fi
else
  echo "✓ No PID file found"
fi

# Step 2: Kill any remaining node processes on port 3001
echo ""
echo "[2/4] Checking for processes on port 3001..."
if command -v lsof > /dev/null 2>&1; then
  LSOF_PID=$(lsof -ti:3001 2>/dev/null | head -1)
  if [ -n "$LSOF_PID" ]; then
    echo "Killing process $LSOF_PID on port 3001..."
    kill -9 $LSOF_PID 2>/dev/null
    sleep 1
    echo "✓ Port 3001 cleared"
  else
    echo "✓ Port 3001 is free"
  fi
else
  echo "⚠ lsof not available, skipping port check"
fi

# Step 3: Start backend server
echo ""
echo "[3/4] Starting backend server..."
cd backend
node server.js > ../logs/backend.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > ../backend.pid
cd ..

echo "Backend started with PID: $NEW_PID"
echo "Waiting for server to initialize..."
sleep 5

# Step 4: Verify server is running
echo ""
echo "[4/4] Verifying server health..."
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health 2>&1)

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
  UPTIME=$(echo "$HEALTH_CHECK" | grep -o '"uptime":[0-9.]*' | cut -d: -f2)
  echo "✓ Server is running!"
  echo "✓ Uptime: $UPTIME seconds (should be < 10 seconds)"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "✓ Backend restart successful!"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "Next steps:"
  echo "1. Open browser: http://localhost:5173/todos"
  echo "2. Test checkbox on todo 'TEST_COMPLETION_176'"
  echo "3. Or run: curl -X PUT http://localhost:3001/api/todos/696d01e4dba7fdd1571066e3 -H 'Content-Type: application/json' -d '{\"status\":\"completed\"}'"
  echo ""
else
  echo "✗ Server health check failed"
  echo "Response: $HEALTH_CHECK"
  echo ""
  echo "Check logs: tail -50 logs/backend.log"
  exit 1
fi
