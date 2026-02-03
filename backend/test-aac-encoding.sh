#!/bin/bash

# Test different AAC encoding approaches to find one that works
# Source: https://ffmpeg.org/ffmpeg-formats.html

FFMPEG="ffmpeg"
AUDIO_IN="/mnt/c/Projects/blush-marketing/storage/temp/1769768960544_mixed.wav"
IMAGE_IN="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769768960544_697b925d6cf671564eee400b.png"
OUTPUT_DIR="/mnt/c/Projects/blush-marketing/storage/temp"

echo "=== AAC Encoding Test ==="
echo ""
echo "Source audio: 192kHz, mono, pcm_s16le"
echo ""

# Test 1: Simple AAC encode without video
echo "=== Test 1: Audio only AAC (no video) ==="
OUT1="$OUTPUT_DIR/test_audio_only.aac"
timeout 30 $FFMPEG -y -i "$AUDIO_IN" \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  "$OUT1" 2>&1 | grep -E "Stream|Duration|error|Error" | head -10

if [ -f "$OUT1" ]; then
  echo "Created: $OUT1"
  $FFMPEG -i "$OUT1" 2>&1 | grep -E "Duration|Stream.*Audio" | head -3
else
  echo "FAILED"
fi
echo ""

# Test 2: AAC with -strict experimental (some FFmpeg builds need this)
echo "=== Test 2: AAC with strict experimental ==="
OUT2="$OUTPUT_DIR/test_aac_explicit.mp4"
timeout 30 $FFMPEG -y -i "$AUDIO_IN" \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -strict experimental \
  "$OUT2" 2>&1 | grep -E "Stream|Duration|error|Error" | head -10

if [ -f "$OUT2" ]; then
  echo "Created: $OUT2"
  $FFMPEG -i "$OUT2" 2>&1 | grep -E "Duration|Stream.*Audio" | head -3
else
  echo "FAILED"
fi
echo ""

# Test 3: Convert to stereo first, then encode
echo "=== Test 3: Convert mono->stereo, then AAC ==="
OUT3="$OUTPUT_DIR/test_stereo_first.mp4"
timeout 30 $FFMPEG -y -i "$AUDIO_IN" \
  -af "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo" \
  -ac 2 -ar 44100 \
  -c:a aac -b:a 192k \
  "$OUT3" 2>&1 | grep -E "Stream|Duration|error|Error" | head -10

if [ -f "$OUT3" ]; then
  echo "Created: $OUT3"
  $FFMPEG -i "$OUT3" 2>&1 | grep -E "Duration|Stream.*Audio" | head -3
else
  echo "FAILED"
fi
echo ""

# Test 4: MP3 instead of AAC
echo "=== Test 4: MP3 encode (fallback) ==="
OUT4="$OUTPUT_DIR/test_mp3.mp3"
timeout 30 $FFMPEG -y -i "$AUDIO_IN" \
  -c:a libmp3lame -b:a 192k -ar 44100 -ac 2 \
  "$OUT4" 2>&1 | grep -E "Stream|Duration|error|Error" | head -10

if [ -f "$OUT4" ]; then
  echo "Created: $OUT4"
  $FFMPEG -i "$OUT4" 2>&1 | grep -E "Duration|Stream.*Audio" | head -3
else
  echo "FAILED"
fi
echo ""

# Test 5: Full video with simple audio mapping (no filter_complex)
echo "=== Test 5: Full video, simple audio mapping ==="
OUT5="$OUTPUT_DIR/test_simple_full.mp4"
timeout 60 $FFMPEG -y \
  -loop 1 -i "$IMAGE_IN" \
  -i "$AUDIO_IN" \
  -vf "scale=1080:1920" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ac 2 -ar 44100 \
  -movflags +faststart \
  -shortest \
  "$OUT5" 2>&1 | tail -15

if [ -f "$OUT5" ]; then
  echo "Created: $OUT5"
  $FFMPEG -i "$OUT5" 2>&1 | grep -E "Duration|Stream" | head -10
else
  echo "FAILED"
fi
echo ""

# Test 6: Full video with -map 0:a? (optional audio)
echo "=== Test 6: Full video with -map 0:a? ==="
OUT6="$OUTPUT_DIR/test_optional_audio.mp4"
timeout 60 $FFMPEG -y \
  -loop 1 -i "$IMAGE_IN" \
  -i "$AUDIO_IN" \
  -vf "scale=1080:1920" \
  -map 0:v -map 0:a? \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ac 2 -ar 44100 \
  -movflags +faststart \
  -shortest \
  "$OUT6" 2>&1 | tail -15

if [ -f "$OUT6" ]; then
  echo "Created: $OUT6"
  $FFMPEG -i "$OUT6" 2>&1 | grep -E "Duration|Stream" | head -10
else
  echo "FAILED"
fi
echo ""

# Test 7: Use -acodec instead of -c:a
echo "=== Test 7: Full video with -acodec aac ==="
OUT7="$OUTPUT_DIR/test_acodec.mp4"
timeout 60 $FFMPEG -y \
  -loop 1 -i "$IMAGE_IN" \
  -i "$AUDIO_IN" \
  -vf "scale=1080:1920" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -acodec aac -ab 192k -ac 2 -ar 44100 \
  -movflags +faststart \
  -shortest \
  "$OUT7" 2>&1 | tail -15

if [ -f "$OUT7" ]; then
  echo "Created: $OUT7"
  $FFMPEG -i "$OUT7" 2>&1 | grep -E "Duration|Stream" | head -10
else
  echo "FAILED"
fi
echo ""

# Test 8: Convert WAV to stereo first, then use in video
echo "=== Test 8: Pre-convert audio to stereo 44.1kHz WAV ==="
TEMP_AUDIO="$OUTPUT_DIR/temp_audio_44k.wav"
timeout 30 $FFMPEG -y -i "$AUDIO_IN" \
  -ar 44100 -ac 2 \
  "$TEMP_AUDIO" 2>&1 | tail -5

OUT8="$OUTPUT_DIR/test_preconverted.mp4"
timeout 60 $FFMPEG -y \
  -loop 1 -i "$IMAGE_IN" \
  -i "$TEMP_AUDIO" \
  -vf "scale=1080:1920" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  -shortest \
  "$OUT8" 2>&1 | tail -15

if [ -f "$OUT8" ]; then
  echo "Created: $OUT8"
  $FFMPEG -i "$OUT8" 2>&1 | grep -E "Duration|Stream" | head -10
else
  echo "FAILED"
fi
echo ""

echo "=== Summary ==="
ls -lh "$OUTPUT_DIR"/test_*.{mp4,aac,mp3,wav} 2>/dev/null || echo "Check which files were created"
