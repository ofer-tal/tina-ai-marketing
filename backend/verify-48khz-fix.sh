#!/bin/bash

# Verify that the mixer filter chain now outputs 48kHz

echo "=== Verifying 48kHz Output Fix ==="
echo ""
echo "Testing filter: aformat BEFORE + amix + aformat AFTER"
echo ""

# The fixed filter - aformat before amix, and aformat AFTER amix
FILTER='[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[a0];[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,volume=0.15,aloop=loop=-1:size=2e+09[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,aresample=48000,aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo'

# Use one of the existing narration files as input
INPUT="/mnt/c/Projects/blush-marketing/storage/audio/narration/1769760230046_697b925d6cf671564eee400b.wav"
OUTPUT="/mnt/c/Projects/blush-marketing/storage/temp/verify_48khz.wav"

echo "Input file info:"
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "$INPUT" 2>/dev/null
echo ""

echo "Processing with fixed filter..."
ffmpeg -y -i "$INPUT" \
  -filter_complex "$FILTER" \
  -c:a pcm_s16le -ar 48000 -ac 2 \
  "$OUTPUT" 2>&1 | tail -5

echo ""
if [ -f "$OUTPUT" ]; then
  echo "Output file info (should be 48000 Hz):"
  ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "$OUTPUT" 2>/dev/null
  echo ""
  echo "✓ Success if sample_rate=48000"
else
  echo "✗ Failed to create output"
fi
