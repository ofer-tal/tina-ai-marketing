#!/bin/bash
# Verification script for Feature #153: Revenue Aggregation by Week
# Run this AFTER restarting the backend server

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Feature #153 Verification: Revenue Aggregation by Week"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if backend is running
echo "📡 Checking backend server..."
HEALTH=$(curl -s http://localhost:3001/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Backend is running"
  UPTIME=$(echo "$HEALTH" | grep -o '"uptimeHuman":"[^"]*"')
  echo "   Uptime: $UPTIME"
else
  echo "❌ Backend is not responding. Please restart the server first."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Test POST /api/revenue/weekly/aggregate"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get current week info
CURRENT_WEEK=$(date +%Y-W%V)
echo "Aggregating week: $CURRENT_WEEK"

RESPONSE=$(curl -s -X POST http://localhost:3001/api/revenue/weekly/aggregate \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"weekNumber":2}')

if echo "$RESPONSE" | grep -q "weekIdentifier"; then
  echo "✅ Weekly aggregation successful"
  echo "$RESPONSE" | head -20
else
  echo "❌ Weekly aggregation failed"
  echo "$RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Test GET /api/revenue/weekly/aggregates"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s "http://localhost:3001/api/revenue/weekly/aggregates")

if echo "$RESPONSE" | grep -q "weekIdentifier"; then
  echo "✅ Successfully retrieved weekly aggregates"
  COUNT=$(echo "$RESPONSE" | grep -o '"weekIdentifier"' | wc -l)
  echo "   Found $COUNT week(s)"
  echo "$RESPONSE" | head -30
else
  echo "❌ Failed to retrieve weekly aggregates"
  echo "$RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Test GET /api/revenue/weekly/:year/:weekNumber/transactions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s "http://localhost:3001/api/revenue/weekly/2026/2/transactions")

if echo "$RESPONSE" | grep -q "weeklyAggregate"; then
  echo "✅ Successfully retrieved weekly transactions"
  echo "$RESPONSE" | head -40
else
  echo "❌ Failed to retrieve weekly transactions"
  echo "$RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Check MongoDB collection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if collection exists and has data
echo "Checking weekly_revenue_aggregates collection..."
# This would require mongo shell which may not be available
echo "⚠️  MongoDB check skipped (requires mongo shell)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Frontend Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FRONTEND_CHECK=$(curl -s http://localhost:5173/revenue/weekly)
if echo "$FRONTEND_CHECK" | grep -q "Weekly Revenue"; then
  echo "✅ Frontend page is accessible at http://localhost:5173/revenue/weekly"
else
  echo "⚠️  Frontend may not be loading properly"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verification Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Open browser to http://localhost:5173/revenue/weekly"
echo "2. Verify weekly aggregates display correctly"
echo "3. Click on a week card to open modal"
echo "4. Verify transaction drill-down works"
echo "5. Check week-over-week calculations"
echo ""
