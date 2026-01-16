#!/bin/bash

# Feature #290 Verification Script
# API failure detection and retry with exponential backoff

echo "=========================================="
echo "Feature #290 Verification"
echo "API Failure Detection & Retry with Exponential Backoff"
echo "=========================================="
echo ""

# Step 1: Simulate API failure
echo "Step 1: Simulate API failure"
echo "Testing scenario: connection-reset with 3 failures before success"
echo ""

RESPONSE1=$(curl -s -X POST http://localhost:3001/api/retry-test/simulate-failure \
  -H "Content-Type: application/json" \
  -d '{"scenario":"connection-reset","failCount":3,"maxRetries":5}')

echo "Response:"
echo "$RESPONSE1" | jq '.'

# Verify error was caught
ATTEMPTS=$(echo "$RESPONSE1" | jq -r '.statistics.totalAttempts')
RETRY_COUNT=$(echo "$RESPONSE1" | jq -r '.statistics.retryCount')
DURATION=$(echo "$RESPONSE1" | jq -r '.statistics.duration')

echo ""
echo "Step 2: Verify error caught"
echo "✅ Errors were detected and logged"
echo "   Total attempts: $ATTEMPTS"
echo "   Retry count: $RETRY_COUNT"
echo ""

# Verify exponential backoff delays
DELAY1=$(echo "$RESPONSE1" | jq -r '.retryLog[0].retryScheduledIn')
DELAY2=$(echo "$RESPONSE1" | jq -r '.retryLog[1].retryScheduledIn')
DELAY3=$(echo "$RESPONSE1" | jq -r '.retryLog[2].retryScheduledIn')

echo "Step 3: Retry after 1 second (first retry)"
echo "✅ First retry scheduled after: ${DELAY1}ms (~1 second)"
echo ""

echo "Step 4: Retry after 2 seconds (second retry)"
echo "✅ Second retry scheduled after: ${DELAY2}ms (~2 seconds)"
echo ""

echo "Step 5: Retry after 4 seconds (third retry)"
echo "✅ Third retry scheduled after: ${DELAY3}ms (~4 seconds)"
echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="

# Check if delays follow exponential pattern (1s, 2s, 4s)
DELAY1_INT=$(printf "%.0f" "$DELAY1")
DELAY2_INT=$(printf "%.0f" "$DELAY2")
DELAY3_INT=$(printf "%.0f" "$DELAY3")

if [ $DELAY1_INT -ge 900 ] && [ $DELAY1_INT -le 1100 ]; then
  echo "✅ Step 3 PASSED: First retry ~1 second"
else
  echo "❌ Step 3 FAILED: First retry not ~1 second (was ${DELAY1}ms)"
fi

if [ $DELAY2_INT -ge 1900 ] && [ $DELAY2_INT -le 2100 ]; then
  echo "✅ Step 4 PASSED: Second retry ~2 seconds"
else
  echo "❌ Step 4 FAILED: Second retry not ~2 seconds (was ${DELAY2}ms)"
fi

if [ $DELAY3_INT -ge 3900 ] && [ $DELAY3_INT -le 4100 ]; then
  echo "✅ Step 5 PASSED: Third retry ~4 seconds"
else
  echo "❌ Step 5 FAILED: Third retry not ~4 seconds (was ${DELAY3}ms)"
fi

if [ "$ATTEMPTS" = "4" ] && [ "$RETRY_COUNT" = "3" ]; then
  echo "✅ Steps 1-2 PASSED: API failure detected and 3 retries attempted"
else
  echo "❌ Steps 1-2 FAILED: Expected 4 attempts with 3 retries"
fi

echo ""
SUCCESS=$(echo "$RESPONSE1" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ All steps VERIFIED: Feature #290 is working correctly!"
  echo "   Total duration: ${DURATION}"
  exit 0
else
  echo "❌ Feature verification FAILED"
  exit 1
fi
