#!/bin/bash

echo "Stopping backend server..."
if [ -f backend.pid ]; then
  pid=$(cat backend.pid)
  if ps -p $pid > /dev/null 2>&1; then
    kill $pid
    sleep 2
    echo "Server stopped (PID: $pid)"
  fi
fi

# Force kill any remaining on port 3001
lsof -ti:3001 | head -1 | xargs kill -9 2>/dev/null
sleep 2

echo "Starting backend server..."
cd backend
node server.js > ../logs/backend.log 2>&1 &
echo $! > ../backend.pid

echo "Waiting for server to start..."
sleep 5

echo "Checking health..."
curl -s http://localhost:3001/api/health | head -5

echo ""
echo "Backend server restarted!"
