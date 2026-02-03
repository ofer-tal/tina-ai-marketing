#!/bin/bash

# Test different vignette filter syntaxes
# We'll create a simple test video to figure out the correct parameters

FFMPEG="ffmpeg"
TEST_IMAGE="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769768960544_697b925d6cf671564eee400b.png"
TEST_AUDIO="/mnt/c/Projects/blush-marketing/storage/temp/1769768960544_mixed.wav"
OUTPUT_DIR="/mnt/c/Projects/blush-marketing/storage/temp"
OUTPUT="${OUTPUT_DIR}/vignette_test.mp4"

echo "=== Testing Vignette Filter Syntax ==="
echo ""

# First, let's check the vignette filter documentation
echo "1. Checking vignette filter help..."
$FFMPEG -h filter=vignette 2>&1 | grep -A 20 "vignette"
echo ""

# Test 1: Minimal vignette (no position parameters)
echo "2. Test 1: vignette=PI/2 (minimal)"
TEST1="${OUTPUT_DIR}/test1.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" \
  -t 3 \
  -vf "scale=1080:1920,vignette=PI/2:0.2" \
  "$TEST1" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST1"
  # Check if it has audio
  $FFMPEG -i "$TEST1" 2>&1 | grep -i audio
else
  echo "   FAILED"
fi
echo ""

# Test 2: With mode parameter (syntax: angle:aspect:mode)
echo "3. Test 2: vignette=PI/2:0.2:0 (angle:aspect:mode)"
TEST2="${OUTPUT_DIR}/test2.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" \
  -t 3 \
  -vf "scale=1080:1920,vignette=PI/2:0.2:0" \
  "$TEST2" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST2"
else
  echo "   FAILED"
fi
echo ""

# Test 3: Full syntax with dither (angle:aspect:mode:dither)
echo "4. Test 3: vignette=PI/2:0.2:0:16 (with dither)"
TEST3="${OUTPUT_DIR}/test3.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" \
  -t 3 \
  -vf "scale=1080:1920,vignette=PI/2:0.2:0:16" \
  "$TEST3" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST3"
else
  echo "   FAILED"
fi
echo ""

# Test 4: Try geq approach as alternative
echo "5. Test 4: geq vignette (alternative approach)"
TEST4="${OUTPUT_DIR}/test4.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" \
  -t 3 \
  -vf "scale=1080:1920,geq=lum='p(X,Y):a=st(0,gauss((X-W/2)/(W/2)))\\,b=st(0,gauss((Y-H/2)/(H/2)))\\,min(1,lum*(1-0.2*sqrt((a*a+b*b)/2)))':a=alpha" \
  "$TEST4" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST4"
else
  echo "   FAILED"
fi
echo ""

# Test 5: No vignette at all (baseline)
echo "6. Test 5: No vignette (baseline - should work)"
TEST5="${OUTPUT_DIR}/test5.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" \
  -t 3 \
  -vf "scale=1080:1920" \
  "$TEST5" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST5"
else
  echo "   FAILED"
fi
echo ""

# Test 6: Try with audio (the actual use case)
echo "7. Test 6: With audio (vignette=PI/2:0.2:0)"
TEST6="${OUTPUT_DIR}/test6_audio.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" -i "$TEST_AUDIO" \
  -vf "scale=1080:1920,vignette=PI/2:0.2:0" \
  -map 0:v -map 1:a \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -shortest \
  "$TEST6" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST6"
  $FFMPEG -i "$TEST6" 2>&1 | grep -E "Stream|Duration"
else
  echo "   FAILED"
fi
echo ""

echo "=== Summary ==="
echo "Check files in $OUTPUT_DIR/test*.mp4"
ls -la "$OUTPUT_DIR"/test*.mp4 2>/dev/null || echo "No test files found"
