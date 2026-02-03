#!/bin/bash

# Test that the audio mixer outputs 48kHz correctly

NARRATION="C:/Projects/blush-marketing/storage/audio/narration/1769760230046_697b925d6cf671564eee400b.wav"
OUTPUT="C:/Projects/blush-marketing/storage/temp/test_48khz_mixed.wav"

echo "=== Testing Audio Mixer at 48kHz ==="
echo ""
echo "Original narration:"
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "$NARRATION" 2>/dev/null
echo ""

echo "Testing the fixed filter chain (with aformat AFTER amix)..."
echo ""

# The fixed filter chain with aformat AFTER amix
FILTER='[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11[a0];[1:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,volume=0.15,aloop=loop=-1:size=2e+09[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,aresample=48000,aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo'

# Test with narration only (no music) - use amix with 1 input
FILTER_NO_MUSIC='[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11[aout]'

ffmpeg -y \
  -i "$NARRATION" \
  -filter_complex "$FILTER_NO_MUSIC" \
  -map "[aout]" \
  -c:a pcm_s16le \
  -ar 48000 \
  -ac 2 \
  "$OUTPUT" 2>&1 | tail -10

echo ""
if [ -f "$OUTPUT" ]; then
  echo "SUCCESS! Checking output sample rate..."
  ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "$OUTPUT" 2>/dev/null
  echo ""
  ls -lh "$OUTPUT"
else
  echo "FAILED"
fi
