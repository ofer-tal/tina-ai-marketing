#!/bin/bash

# Start servers script for testing
echo "Starting servers..."

# Start backend in background
cd /c/Projects/blush-marketing
node backend/server.js > logs/backend-test.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend in background
npm run dev > logs/frontend-test.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Save PIDs for cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo "Servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"
