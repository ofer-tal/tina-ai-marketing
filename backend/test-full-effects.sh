#!/bin/bash

# Test with full Tier 1 effects: Ken Burns + vignette + fade

IMAGE="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769772166408_697b925d6cf671564eee400b.png"
AUDIO="/mnt/c/Projects/blush-marketing/storage/audio/narration/1769772166408_697b925d6cf671564eee400b.wav"
OUTPUT="/mnt/c/Projects/blush-marketing/storage/temp/test_ken_burns.mp4"

DURATION=19

# Full filter chain from tieredVideoGenerator.js
# loop -> scale -> Ken Burns zoom -> vignette -> fade in -> fade out
VIDEO_FILTER="loop=loop=-1:size=1:start=0,scale=1080:1920:flags=bicubic,zoompan=z=1+(0.15*sin(on/475*PI)):d=1:x=iw/2-iw/zoom/2:y=ih/2-ih/zoom/2:s=1080x1920:fps=25,vignette=angle=PI/2:aspect=0.3,fade=t=in:st=0:d=0.5,fade=t=out:st=18:d=0.5"

# Audio filter - resample to 48kHz stereo
AUDIO_FILTER="[1:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[aout]"

FILTER_COMPLEX="[0:v]${VIDEO_FILTER}[vout];${AUDIO_FILTER}"

echo "Creating video with full Ken Burns effect..."
timeout 120 ffmpeg -y \
  -loop 1 -i "$IMAGE" \
  -i "$AUDIO" \
  -filter_complex "$FILTER_COMPLEX" \
  -map "[vout]" \
  -map "[aout]" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a libmp3lame -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT" 2>&1 | tail -10

echo ""
if [ -f "$OUTPUT" ]; then
  echo "Created: $OUTPUT"
  ls -lh "$OUTPUT"
  echo ""
  echo "Effects included:"
  echo "  - Ken Burns zoom (15% sine wave in/out)"
  echo "  - Vignette (0.3 strength)"
  echo "  - Fade in (0.5s)"
  echo "  - Fade out (0.5s)"
  echo "  - Audio: MP3 48kHz stereo"
else
  echo "FAILED"
fi
