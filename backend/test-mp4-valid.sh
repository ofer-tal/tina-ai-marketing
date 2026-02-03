#!/bin/bash

# Test MP4 output with authoritative FFmpeg parameters
# Based on FFmpeg documentation for MOV/MP4 muxer

FFMPEG="ffmpeg"
TEST_AUDIO="/mnt/c/Projects/blush-marketing/storage/temp/1769768960544_mixed.wav"
TEST_IMAGE="/mnt/c/Projects/blush-marketing/storage/images/tier1/1769768960544_697b925d6cf671564eee400b.png"
OUTPUT_DIR="/mnt/c/Projects/blush-marketing/storage/temp"

echo "=== MP4 Output Test - Authoritative Parameters ==="
echo ""
echo "Checking input files..."
echo "Audio:"
ffprobe -v error -show_entries format=duration,bit_rate,stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "$TEST_AUDIO" 2>/dev/null || ffmpeg -i "$TEST_AUDIO" 2>&1 | grep -E "Duration|Audio"
echo ""
echo "Image:"
ffprobe -v error -show_entries stream=width,height,codec_name -of default=noprint_wrappers=1 "$TEST_IMAGE" 2>/dev/null || ffmpeg -i "$TEST_IMAGE" 2>&1 | grep -E "Stream"
echo ""

# Test 1: Basic MP4 with movflags faststart (most important!)
echo "=== Test 1: MP4 with faststart (moov atom at beginning) ==="
OUTPUT1="$OUTPUT_DIR/test1_faststart.mp4"
timeout 60 ffmpeg -y \
  -loop 1 -i "$TEST_IMAGE" \
  -i "$TEST_AUDIO" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT1" 2>&1 | tail -20

if [ $? -eq 0 ]; then
  echo "SUCCESS! Checking output..."
  ffprobe -v error -show_entries format=format_name,duration,size,bit_rate -show_entries stream=codec_name,width,height,sample_rate,channels -of default=noprint_wrappers=1 "$OUTPUT1" 2>/dev/null
  echo ""
  ls -lh "$OUTPUT1"
else
  echo "FAILED"
fi
echo ""

# Test 2: With explicit profile and level for TikTok/Instagram compatibility
echo "=== Test 2: MP4 with H.264 profile=high for social media ==="
OUTPUT2="$OUTPUT_DIR/test2_social_media.mp4"
timeout 60 ffmpeg -y \
  -loop 1 -i "$TEST_IMAGE" \
  -i "$TEST_AUDIO" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -profile:v high -level 4.0 \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT2" 2>&1 | tail -20

if [ $? -eq 0 ]; then
  echo "SUCCESS! Checking output..."
  ffprobe -v error -show_entries format=format_name,duration,size -show_entries stream=codec_name,profile,width,height -of default=noprint_wrappers=1 "$OUTPUT2" 2>/dev/null
  ls -lh "$OUTPUT2"
else
  echo "FAILED"
fi
echo ""

# Test 3: With aformat filter for audio resampling
echo "=== Test 3: MP4 with aformat audio filter (resample 192kHz->44.1kHz) ==="
OUTPUT3="$OUTPUT_DIR/test3_aformat.mp4"
timeout 60 ffmpeg -y \
  -loop 1 -i "$TEST_IMAGE" \
  -i "$TEST_AUDIO" \
  -filter_complex "[0:v]scale=1080:1920[v];[1:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT3" 2>&1 | tail -20

if [ $? -eq 0 ]; then
  echo "SUCCESS! Checking output..."
  ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "$OUTPUT3" 2>/dev/null
  ls -lh "$OUTPUT3"
else
  echo "FAILED"
fi
echo ""

# Test 4: With video filters (Ken Burns, vignette, fade)
echo "=== Test 4: MP4 with video effects + faststart ==="
OUTPUT4="$OUTPUT_DIR/test4_effects.mp4"
VIDEO_FILTERS="scale=1080:1920:flags=bicubic,zoompan=z=1+(0.15*sin(on/450*PI)):d=1:x=iw/2-iw/zoom/2:y=ih/2-ih/zoom/2:s=1080x1920:fps=25,vignette=angle=PI/2:aspect=0.2,fade=t=in:st=0:d=0.5,fade=t=out:st=17:d=0.5"

timeout 60 ffmpeg -y \
  -loop 1 -i "$TEST_IMAGE" \
  -i "$TEST_AUDIO" \
  -filter_complex "[0:v]${VIDEO_FILTERS}[v];[1:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT4" 2>&1 | tail -20

if [ $? -eq 0 ]; then
  echo "SUCCESS! Checking output..."
  ffprobe -v error -show_entries format=format_name,duration,size -show_entries stream -of default=noprint_wrappers=1 "$OUTPUT4" 2>/dev/null
  ls -lh "$OUTPUT4"
else
  echo "FAILED"
fi
echo ""

# Test 5: Simple baseline profile for maximum compatibility
echo "=== Test 5: MP4 baseline profile (maximum compatibility) ==="
OUTPUT5="$OUTPUT_DIR/test5_baseline.mp4"
timeout 60 ffmpeg -y \
  -loop 1 -i "$TEST_IMAGE" \
  -i "$TEST_AUDIO" \
  -filter_complex "[0:v]scale=1080:1920[v];[1:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset fast -tune stillimage -crf 23 -pix_fmt yuv420p \
  -profile:v baseline -level 3.1 \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT5" 2>&1 | tail -20

if [ $? -eq 0 ]; then
  echo "SUCCESS! Checking output..."
  ffprobe -v error -show_entries stream -of default=noprint_wrappers=1 "$OUTPUT5" 2>/dev/null
  ls -lh "$OUTPUT5"
else
  echo "FAILED"
fi
echo ""

echo "=== Summary ==="
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/test*.mp4 2>/dev/null || echo "No files generated"
echo ""
echo "Recommended command for TikTok/Instagram:"
echo "ffmpeg -y -loop 1 -i image.png -i audio.wav \\"
echo "  -filter_complex \"[0:v]scale=1080:1920[v];[1:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[a]\" \\"
echo "  -map \"[v]\" -map \"[a]\" \\"
echo "  -c:v libx264 -preset medium -tune stillimage -crf 23 -pix_fmt yuv420p \\"
echo "  -c:a aac -b:a 192k -ar 44100 -ac 2 \\"
echo "  -movflags +faststart \\"
echo "  -shortest output.mp4"
