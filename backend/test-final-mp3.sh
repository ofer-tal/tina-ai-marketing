#!/bin/bash

# Final test: Complete Tier 1 video generation with MP3 audio
# This matches the exact FFmpeg command that tieredVideoGenerator.js now uses

FFMPEG="ffmpeg"
AUDIO_IN="/mnt/c/Projects/blush-marketing/storage/temp/1769768960544_mixed.wav"
IMAGE_IN="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769768960544_697b925d6cf671564eee400b.png"
OUTPUT="/mnt/c/Projects/blush-marketing/storage/temp/test_final_tier1.mp4"

echo "=== Final Tier 1 Video Generation Test ==="
echo ""
echo "This test uses the EXACT parameters from tieredVideoGenerator.js:"
echo "  - Video: H.264 High Profile, Level 4.0, 1080x1920"
echo "  - Audio: MP3 192kbps, 48kHz, stereo (libmp3lame)"
echo "  - Container: MP4 with faststart enabled"
echo "  - Effects: Ken Burns zoom, vignette, fade in/out"
echo ""

# Get audio duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_IN" 2>/dev/null)
DURATION_INT=${DURATION%.*}
echo "Audio duration: ${DURATION}s"
echo ""

# Build video filter chain matching tieredVideoGenerator.js
VIDEO_FILTERS="loop=loop=-1:size=1:start=0,scale=1080:1920:flags=bicubic,zoompan=z='min(zoom,1.15)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=25,vignette=angle=PI/2:aspect=0.2,fade=t=in:st=0:d=0.5,fade=t=out:st=$((DURATION_INT - 1)):d=1"

# Build audio filter matching tieredVideoGenerator.js (48kHz resample)
AUDIO_FILTER="[1:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[aout]"

# Build filter_complex
FILTER_COMPLEX="[0:v]${VIDEO_FILTERS}[vout];${AUDIO_FILTER}"

echo "Generating video..."
timeout 120 $FFMPEG -y \
  -loop 1 -i "$IMAGE_IN" \
  -i "$AUDIO_IN" \
  -filter_complex "$FILTER_COMPLEX" \
  -map "[vout]" \
  -map "[aout]" \
  -c:v libx264 \
  -preset medium \
  -tune stillimage \
  -crf 23 \
  -pix_fmt yuv420p \
  -profile:v high \
  -level 4.0 \
  -c:a libmp3lame \
  -b:a 192k \
  -ar 48000 \
  -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT" 2>&1 | tail -20

echo ""
if [ $? -eq 0 ]; then
  echo "SUCCESS! Video created: $OUTPUT"
  echo ""
  echo "=== File Info ==="
  ls -lh "$OUTPUT"
  echo ""
  echo "=== Stream Information ==="
  ffprobe -v error -show_entries stream=codec_name,profile,width,height,sample_rate,channels,duration -of default=noprint_wrappers=1 "$OUTPUT" 2>/dev/null
  echo ""
  echo "=== PLEASE TEST AUDIO ==="
  echo "Play the file and confirm audio works:"
  echo "  $OUTPUT"
else
  echo "FAILED to create video"
fi
