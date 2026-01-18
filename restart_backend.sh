#!/bin/bash

echo "🔄 Restarting Backend Server..."
echo ""

# Kill existing backend process
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    echo "🛑 Stopping backend process (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || echo "Process already stopped"
    sleep 2
fi

# Kill any node process on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "Port 3001 is free"
sleep 1

# Start new backend process
echo "🚀 Starting new backend process..."
nohup node backend/server.js > backend.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > backend.pid

echo "✅ Backend started with PID: $NEW_PID"
echo ""

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Verify server is running
echo "🔍 Verifying server health..."
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health 2>/dev/null)

if [ ! -z "$HEALTH_CHECK" ]; then
    echo "✅ Backend server is running!"
    echo ""
    echo "📊 Health Check:"
    echo "$HEALTH_CHECK" | head -c 300
    echo ""
    echo ""
    echo "🎯 Ready to test Feature #178: Todo Snooze"
    echo "   Open http://localhost:5173/todos in your browser"
else
    echo "❌ Backend server failed to start"
    echo "   Check backend.log for errors"
fi
