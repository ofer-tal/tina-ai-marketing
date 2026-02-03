#!/bin/bash

# Test the exact FFmpeg command that tieredVideoGenerator.js uses

IMAGE="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769775912109_697b925d6cf671564eee400b.png"
AUDIO="/mnt/c/Projects/blush-marketing/storage/temp/1769775912109_mixed.wav"
OUTPUT="/mnt/c/Projects/blush-marketing/storage/temp/test_zoompan_debug.mp4"

echo "=== Testing zoompan with d=526 frames ==="
echo "Image: $IMAGE"
echo "Audio: $AUDIO"
echo ""

# First check audio duration
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO")
echo "Audio duration: $DUR seconds"
echo "Expected frames: $(echo "$DUR * 25" | bc) (at 25fps)"
echo ""

# Run FFmpeg with zoompan
echo "Running FFmpeg..."
ffmpeg -y \
  -loop 1 -i "$IMAGE" \
  -i "$AUDIO" \
  -filter_complex "[0:v]loop=loop=-1:size=1:start=0,scale=1080:1920:flags=bicubic,zoompan=z=1+(0.15*sin(on/526*PI)):d=526:x=iw/2-iw/zoom/2:y=ih/2-ih/zoom/2:s=1080x1920:fps=25,vignette=angle=PI/2:aspect=0.3,fade=t=in:st=0:d=0.5,fade=t=out:st=20:d=0.5[vout];[1:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[aout]" \
  -map "[vout]" \
  -map "[aout]" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a libmp3lame -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT" 2>&1 | tail -20

echo ""
if [ -f "$OUTPUT" ]; then
  echo "File created: $OUTPUT"
  ls -lh "$OUTPUT"
  echo ""
  echo "Checking moov atom..."
  ffprobe -v error "$OUTPUT" 2>&1 | head -5
else
  echo "FAILED - no output file"
fi
