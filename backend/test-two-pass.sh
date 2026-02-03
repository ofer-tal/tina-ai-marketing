#!/bin/bash

# Two-pass approach: create video, then add audio

TEMP_VIDEO="/mnt/c/Projects/blush-marketing/storage/temp/temp_video.mp4"
FINAL_OUTPUT="/mnt/c/Projects/blush-marketing/storage/temp/test_two_pass.mp4"

echo "=== Step 1: Create silent video ==="
ffmpeg -y -loop 1 \
  -i "/mnt/c/Projects/blush-marketing/storage/images/tier1/1769768960544_697b925d6cf671564eee400b.png" \
  -vf "scale=1080:1920" \
  -t 18.43 \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -an \
  "$TEMP_VIDEO" 2>&1 | tail -5

echo ""
echo "=== Step 2: Add audio to video ==="
ffmpeg -y \
  -i "$TEMP_VIDEO" \
  -i "/mnt/c/Projects/blush-marketing/storage/temp/1769768960544_mixed.wav" \
  -c:v copy \
  -c:a aac -b:a 128k -ac 2 -ar 48000 \
  -map 0:v:0 -map 1:a:0 \
  -shortest \
  "$FINAL_OUTPUT" 2>&1 | tail -10

echo ""
echo "=== Verify output ==="
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels,duration -of default=noprint_wrappers=1 "$FINAL_OUTPUT" 2>/dev/null

echo ""
rm -f "$TEMP_VIDEO"
