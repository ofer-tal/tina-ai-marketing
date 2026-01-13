#!/bin/bash

echo "=== Feature #54 Quick Test ==="
echo ""

# Test 1: Status endpoint
echo "Test 1: Status endpoint"
curl -s -X GET http://localhost:4001/api/video/status/runpod
echo ""
echo ""

# Test 2: Health check
echo "Test 2: Health check"
curl -s -X GET http://localhost:4001/api/video/health
echo ""
echo ""

# Test 3: Simple generation (mock mode)
echo "Test 3: Video generation (mock mode)"
curl -s -X POST http://localhost:4001/api/video/generate/runpod \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test video","duration":5}' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""
echo ""

# Test 4: Validation test - missing prompt
echo "Test 4: Validation - missing prompt"
curl -s -X POST http://localhost:4001/api/video/generate/runpod \
  -H "Content-Type: application/json" \
  -d '{"duration":5}' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

echo "=== Tests Complete ==="
