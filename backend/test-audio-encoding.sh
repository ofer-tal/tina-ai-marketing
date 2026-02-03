#!/bin/bash

# Test audio encoding for MP4
# Test different approaches to find what works

FFMPEG="ffmpeg"
TEST_AUDIO="/mnt/c/Projects/blush-marketing/storage/temp/1769768960544_mixed.wav"
TEST_IMAGE="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769768960544_697b925d6cf671564eee400b.png"
OUTPUT_DIR="/mnt/c/Projects/blush-marketing/storage/temp"

echo "=== Audio Encoding Test ==="
echo "Testing audio file: $TEST_AUDIO"
echo ""

# First, check the audio file properties
echo "1. Checking audio file properties..."
$FFMPEG -i "$TEST_AUDIO" 2>&1 | grep -E "Duration|Audio|Stream"
echo ""

# Test 1: Direct audio conversion to AAC (no video)
echo "2. Test 1: Convert WAV to AAC only (no video)"
TEST1="$OUTPUT_DIR/test_audio_only.aac"
timeout 30 $FFMPEG -y -i "$TEST_AUDIO" \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  "$TEST1" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST1"
  ls -la "$TEST1"
else
  echo "   FAILED"
fi
echo ""

# Test 2: Convert WAV to MP3
echo "3. Test 2: Convert WAV to MP3"
TEST2="$OUTPUT_DIR/test_audio_only.mp3"
timeout 30 $FFMPEG -y -i "$TEST_AUDIO" \
  -c:a libmp3lame -b:a 192k -ar 44100 -ac 2 \
  "$TEST2" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST2"
  ls -la "$TEST2"
else
  echo "   FAILED"
fi
echo ""

# Test 3: Simple image + audio to MP4 (no filters)
echo "4. Test 3: Simple image + audio (no video filters)"
TEST3="$OUTPUT_DIR/test_simple_video.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" -i "$TEST_AUDIO" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -shortest \
  "$TEST3" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST3"
  $FFMPEG -i "$TEST3" 2>&1 | grep -E "Stream|Duration"
else
  echo "   FAILED"
fi
echo ""

# Test 4: Image + audio with explicit audio stream encoding first
echo "5. Test 4: Encode audio separately, then merge"
TEST4_AUDIO="$OUTPUT_DIR/test4_audio.aac"
TEST4_VIDEO="$OUTPUT_DIR/test4_video.mp4"
timeout 30 $FFMPEG -y -i "$TEST_AUDIO" \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  "$TEST4_AUDIO" 2>&1
if [ $? -eq 0 ]; then
  echo "   Audio encoded, now merging..."
  timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" -i "$TEST4_AUDIO" \
    -c:v libx264 -tune stillimage -pix_fmt yuv420p \
    -c:a copy \
    -shortest \
    "$TEST4_VIDEO" 2>&1
  if [ $? -eq 0 ]; then
    echo "   SUCCESS! File: $TEST4_VIDEO"
    $FFMPEG -i "$TEST4_VIDEO" 2>&1 | grep -E "Stream|Duration"
  else
    echo "   Merge FAILED"
  fi
else
  echo "   Audio encoding FAILED"
fi
echo ""

# Test 5: Using -filter_complex for audio normalization before encoding
echo "6. Test 5: Filter audio to 44100Hz before encoding"
TEST5="$OUTPUT_DIR/test_filtered_video.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" -i "$TEST_AUDIO" \
  -filter_complex "[0:v]scale=1080:1920[v];[1:a]aformat=sample_fmts=s16:sample_rates=44100[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -shortest \
  "$TEST5" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST5"
  $FFMPEG -i "$TEST5" 2>&1 | grep -E "Stream|Duration"
else
  echo "   FAILED"
fi
echo ""

# Test 6: Force stereo output
echo "7. Test 6: Force stereo channels"
TEST6="$OUTPUT_DIR/test_stereo_video.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" -i "$TEST_AUDIO" \
  -filter_complex "[0:v]scale=1080:1920[v];[1:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -shortest \
  "$TEST6" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST6"
  $FFMPEG -i "$TEST6" 2>&1 | grep -E "Stream|Duration"
else
  echo "   FAILED"
fi
echo ""

# Test 7: Try with higher AAC bitrate
echo "8. Test 7: Higher AAC bitrate (256k)"
TEST7="$OUTPUT_DIR/test_highbitrate_video.mp4"
timeout 30 $FFMPEG -y -loop 1 -i "$TEST_IMAGE" -i "$TEST_AUDIO" \
  -filter_complex "[0:v]scale=1080:1920[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 44100 -ac 2 \
  -shortest \
  "$TEST7" 2>&1
if [ $? -eq 0 ]; then
  echo "   SUCCESS! File: $TEST7"
  $FFMPEG -i "$TEST7" 2>&1 | grep -E "Stream|Duration"
else
  echo "   FAILED"
fi
echo ""

echo "=== Summary ==="
echo "Check files in $OUTPUT_DIR/test*.mp4 and test*.aac"
ls -la "$OUTPUT_DIR"/test*.mp4 "$OUTPUT_DIR"/test*.aac 2>/dev/null || echo "No test files found"
