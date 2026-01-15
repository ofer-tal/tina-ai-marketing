#!/bin/bash

# Feature #176 Verification Script
# This script verifies that the todo completion checkbox feature works correctly
# Run this AFTER restarting the backend server

echo "=================================="
echo "Feature #176 Verification Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test todo ID from previous sessions
TEST_TODO_ID="6968bf002a1d0c35dd19121d"
API_URL="http://localhost:3001/api/todos"

echo "Step 1: Checking current todo status..."
CURRENT_STATUS=$(curl -s "$API_URL" | grep -o "\"id\":\"$TEST_TODO_ID\"[^}]*" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)

if [ "$CURRENT_STATUS" = "pending" ]; then
    echo -e "${GREEN}✓${NC} Todo is currently pending (correct)"
else
    echo -e "${YELLOW}⚠${NC} Todo is currently: $CURRENT_STATUS"
fi
echo ""

echo "Step 2: Attempting to mark todo as complete..."
RESPONSE=$(curl -s -X POST "$API_URL/$TEST_TODO_ID/complete")
echo "API Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✓${NC} API returned success"
else
    echo -e "${RED}✗${NC} API returned error"
    exit 1
fi
echo ""

echo "Step 3: Verifying status actually changed in database..."
sleep 1  # Give database a moment to update
NEW_STATUS=$(curl -s "$API_URL" | grep -o "\"id\":\"$TEST_TODO_ID\"[^}]*" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)

if [ "$NEW_STATUS" = "completed" ]; then
    echo -e "${GREEN}✓${NC} Todo status changed to: $NEW_STATUS"
    echo -e "${GREEN}✓${NC} MongoDB ObjectId bug is FIXED!"
    echo ""
    echo "=================================="
    echo -e "${GREEN}Feature #176: VERIFIED ✅${NC}"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "1. Test the UI: Open http://localhost:5173/todos"
    echo "2. Click checkbox next to TEST_MANUAL_TODO_174"
    echo "3. Verify status changes visually"
    echo "4. Mark feature as passing using MCP tool"
    echo ""
    exit 0
else
    echo -e "${RED}✗${NC} Todo status is still: $NEW_STATUS (should be 'completed')"
    echo -e "${RED}✗${NC} MongoDB ObjectId bug still exists!"
    echo ""
    echo "=================================="
    echo -e "${RED}Feature #176: FAILED ❌${NC}"
    echo "=================================="
    echo ""
    echo "The backend server is still running stale code."
    echo ""
    echo "To fix this:"
    echo "1. Open Windows Task Manager (Ctrl+Shift+Esc)"
    echo "2. End all node.exe processes"
    echo "3. Run: cd backend && node server.js"
    echo "4. Run this script again"
    echo ""
    exit 1
fi
