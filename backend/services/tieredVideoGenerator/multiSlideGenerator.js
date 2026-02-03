/**
 * Multi-Slide Video Generator
 *
 * Generates Tier 1 videos with multiple slides using preset configurations.
 * Supports:
 * - "triple_visual": 3 AI images with text overlays
 * - "hook_first": Gradient text slide + 2 AI images
 *
 * Text is rendered onto images using Canvas API (full emoji support)
 * before FFmpeg processing for video effects.
 */

import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../../utils/logger.js';
import ffmpegWrapper from '../../utils/ffmpegWrapper.js';
import FfmpegEffects from '../../utils/ffmpegEffects.js';
import audioMixer from '../../utils/audioMixer.js';
import * as falAiImageGenerator from '../falAiImageGenerator.js';
import * as runPodImageGenerator from '../runPodImageGenerator.js';
import * as runPodTTSGenerator from '../runPodTTSGenerator.js';
import falAiAudioService from '../falAiAudioService.js';
import { getCategoryStyle, generateImagePrompt } from './categoryStyles.js';
import { extractTextForDuration, TARGET_DURATION } from './durationController.js';
import textOverlayRenderer from '../textOverlayRenderer.js';

const logger = getLogger('services', 'multi-slide-generator');

// Storage paths
const STORAGE_BASE = path.join(process.cwd(), 'storage');
const STORAGE_VIDEOS = path.join(STORAGE_BASE, 'videos', 'tier1', 'final');
const STORAGE_TEMP_IMAGES = path.join(STORAGE_BASE, 'temp', 'images');
const STORAGE_TEMP_GRADIENTS = path.join(STORAGE_BASE, 'temp', 'gradients');
const STORAGE_TEMP = path.join(STORAGE_BASE, 'temp');
const STORAGE_THUMBNAILS = path.join(STORAGE_BASE, 'thumbnails');

/**
 * Slide composition presets
 * Each preset defines the structure and timing of slides
 */
export const SLIDE_PRESETS = {
  triple_visual: {
    name: 'Triple Visual',
    description: '3 AI-generated images with text overlays',
    slides: [
      {
        type: 'image',
        textSource: 'hook',
        durationRatio: 0.33
      },
      {
        type: 'image',
        textSource: 'narrative',
        durationRatio: 0.34
      },
      {
        type: 'image',
        textSource: 'cta',
        durationRatio: 0.33
      }
    ],
    effects: { kenBurns: true, vignette: true },
    imageCount: 3,
    gradientSlideCount: 0
  },
  hook_first: {
    name: 'Hook First',
    description: 'Text slide + 2 AI images',
    slides: [
      {
        type: 'gradient_text',
        textSource: 'hook',
        durationRatio: 0.20
      },
      {
        type: 'image',
        textSource: 'narrative',
        durationRatio: 0.40
      },
      {
        type: 'image',
        textSource: 'cta',
        durationRatio: 0.40
      }
    ],
    effects: { kenBurns: true, vignette: true },
    imageCount: 2,
    gradientSlideCount: 1
  }
};

/**
 * Get preset configuration by name
 *
 * @param {string} presetName - Name of preset
 * @returns {Object|null} Preset configuration
 */
export function getPreset(presetName) {
  return SLIDE_PRESETS[presetName] || SLIDE_PRESETS.triple_visual;
}

/**
 * Get all available presets
 *
 * @returns {Array} Array of preset info objects
 */
export function getAllPresets() {
  return Object.entries(SLIDE_PRESETS).map(([key, preset]) => ({
    id: key,
    name: preset.name,
    description: preset.description,
    imageCount: preset.imageCount,
    gradientSlideCount: preset.gradientSlideCount
  }));
}

/**
 * Create a gradient background slide with centered text
 * Uses Canvas API for proper emoji support
 *
 * @param {Object} options - Slide options
 * @returns {Promise<string>} Path to generated gradient slide image
 */
async function createGradientSlide(options) {
  const {
    text = '',
    gradientStart = '#e94560',
    gradientEnd = '#1a1a2e',
    foregroundColor = '#ffffff',
    outputPath = null
  } = options;

  // Use the Canvas-based renderer from textOverlayRenderer
  return await textOverlayRenderer.createGradientSlide({
    text,
    gradientStart,
    gradientEnd,
    foregroundColor,
    width: 1080,
    height: 1920,
    outputPath
  });
}

/**
 * Generate images for all slides in a preset (parallel for speed)
 *
 * @param {Object} preset - Preset configuration
 * @param {Object} story - Story object
 * @returns {Promise<Array>} Array of slide data with image paths
 */
async function generateSlideImages(preset, story) {
  const timestamp = Date.now();
  const categoryStyle = getCategoryStyle(story?.category);

  // First, identify which slides need image generation
  const imageSlideIndices = [];
  const slides = [];

  for (let i = 0; i < preset.slides.length; i++) {
    const slideConfig = preset.slides[i];

    if (slideConfig.type === 'gradient_text') {
      // Gradient text slide - will be generated later with actual text
      slides.push({
        index: i,
        type: 'gradient',
        path: null, // Generated later
        gradientStart: categoryStyle.gradientStart,
        gradientEnd: categoryStyle.gradientEnd,
        foregroundColor: categoryStyle.foregroundColor,
        durationRatio: slideConfig.durationRatio  // Include duration ratio
      });
    } else {
      // Mark this slide for parallel image generation
      imageSlideIndices.push(i);
    }
  }

  // Generate all images in parallel for speed
  const imageGenerationPromises = imageSlideIndices.map(async (i) => {
    const imagePath = path.join(
      STORAGE_TEMP_IMAGES,
      `${timestamp}_slide${i}_${story?._id || 'story'}.png`
    );

    const imagePrompt = generateImagePrompt(story, i + 1, preset.slides.length);

    // Use fal.ai FLUX.2 [turbo] by default, fallback to PixelWave on error
    let imageResult;
    try {
      logger.info('Generating image with fal.ai FLUX.2', { slideIndex: i });
      imageResult = await falAiImageGenerator.generateForStory(story, {
        outputPath: imagePath,
        prompt: imagePrompt
      });
    } catch (falError) {
      logger.warn('fal.ai image generation failed, falling back to PixelWave', {
        slideIndex: i,
        error: falError.message
      });
      // Fallback to PixelWave
      imageResult = await runPodImageGenerator.generateForStory(story, {
        outputPath: imagePath,
        prompt: imagePrompt
      });
    }

    logger.info('Generated slide image', {
      slideIndex: i,
      path: imageResult.path
    });

    return {
      index: i,
      type: 'image',
      path: imageResult.path,
      prompt: imagePrompt,
      durationRatio: preset.slides[i].durationRatio  // Include duration ratio
    };
  });

  // Wait for all images to generate in parallel
  const generatedSlides = await Promise.all(imageGenerationPromises);

  // Merge generated slides with placeholder slides (gradients)
  // Sort by index to maintain correct order
  const allSlides = [...slides, ...generatedSlides]
    .sort((a, b) => a.index - b.index);

  return allSlides;
}

/**
 * Get text content for a slide based on textSource
 *
 * @param {string} textSource - Source type: 'hook', 'narrative', 'cta'
 * @param {Object} context - Context with hook, caption, cta, story, narrationText
 * @returns {string} Text content for slide
 */
function getTextForSlide(textSource, context) {
  const { hook = '', caption = '', cta = 'Read more on Blush 🔥', story = null, narrationText = '' } = context;

  switch (textSource) {
    case 'hook':
      return hook || 'You won\'t believe what happens next...';

    case 'narrative':
      // Use the narration text (from story's fullStory.textUrl content)
      // Fall back to caption, then description if narration not available
      if (narrationText && narrationText.length > 20) {
        // Get first 150 characters for the narrative slide
        return narrationText.length > 150
          ? narrationText.substring(0, 150) + '...'
          : narrationText;
      }
      const captionText = caption || story?.description || '';
      return captionText.length > 150
        ? captionText.substring(0, 150) + '...'
        : captionText || 'A story of passion and desire...';

    case 'cta':
      return cta || 'Read more on Blush 🔥';

    default:
      return '';
  }
}

/**
 * Create individual slide videos with effects
 *
 * @param {Array} slides - Slide data with image paths
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} Array of slide video paths
 */
async function createSlideVideos(slides, options) {
  const {
    duration = TARGET_DURATION,
    effects = {},
    hook = '',
    caption = '',
    cta = 'Read more on Blush 🔥',
    story = null,
    narrationText = '',
    preset = 'triple_visual'
  } = options;

  // Get the preset configuration for text source mapping
  const presetConfig = getPreset(preset);

  const slideVideos = [];
  const timestamp = Date.now();
  let currentTime = 0;

  // Ken Burns directions to cycle through for variety
  const kenBurnsDirections = ['in', 'out', 'in']; // Different direction for middle slide
  // Slower zoom amount (1.1 instead of 1.15 for gentler effect)

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    // Use durationRatio from slide if available, otherwise divide equally
    const slideDuration = slide.durationRatio
      ? duration * slide.durationRatio
      : duration / slides.length;

    const slideStart = currentTime;
    const slideEnd = currentTime + slideDuration;

    let videoPath;

    if (slide.type === 'gradient') {
      // Generate gradient slide with text
      const text = getTextForSlide('hook', { hook, caption, story });
      const gradientPath = await createGradientSlide({
        text,
        gradientStart: slide.gradientStart,
        gradientEnd: slide.gradientEnd,
        foregroundColor: slide.foregroundColor
      });

      // Add video effects (just fade in/out for gradient)
      videoPath = path.join(
        STORAGE_TEMP,
        `slide_${i}_${timestamp}.mp4`
      );

      await applySlideEffects(gradientPath, videoPath, {
        duration: slideDuration,
        fadeIn: true,
        fadeOut: true,
        kenBurns: false, // No Ken Burns on gradient slides
        vignette: false
      });

      slide.path = gradientPath;

    } else {
      // Image slide with text rendered first, then video effects
      // Determine text for this slide based on preset position
      const slideConfig = presetConfig?.slides?.[i];
      let overlayText = '';
      let slideType = 'narrative'; // For Canvas renderer

      if (slideConfig) {
        switch (slideConfig.textSource) {
          case 'hook':
            overlayText = hook || 'You won\'t believe what happens next...';
            slideType = 'hook';
            break;
          case 'narrative':
            // Use narration text, then caption, then description as fallback
            const narrativeText = narrationText || caption || story?.description || '';
            overlayText = narrativeText || 'A story of passion...';
            slideType = 'narrative';
            break;
          case 'cta':
            overlayText = cta || 'Read more on Blush 🔥';
            slideType = 'cta';
            break;
        }
      }

      // NEW: Render text onto image FIRST using Canvas API (supports emojis!)
      let imageWithPathText = slide.path;
      if (overlayText) {
        imageWithPathText = await textOverlayRenderer.renderSlideText({
          imagePath: slide.path,
          text: overlayText,
          slideType,
          position: 'center'  // All text centered vertically now
        });
        logger.debug('Text rendered onto image', {
          slideIndex: i,
          slideType,
          textLength: overlayText.length
        });
      }

      videoPath = path.join(
        STORAGE_TEMP,
        `slide_${i}_${timestamp}.mp4`
      );

      // Use different Ken Burns direction for each slide
      const slideDirection = kenBurnsDirections[i % kenBurnsDirections.length];

      // Apply ONLY video effects (no text overlay needed - already on image!)
      await applySlideEffects(imageWithPathText, videoPath, {
        duration: slideDuration,
        ...effects,
        kenBurnsDirection: slideDirection,
        kenBurnsZoomAmount: 1.08 // Slower zoom (8% instead of 15%)
      });
    }

    slideVideos.push({
      index: i,
      path: videoPath,
      duration: slideDuration,
      startTime: slideStart,
      endTime: slideEnd
    });

    currentTime = slideEnd;
  }

  return slideVideos;
}

/**
 * Apply video effects to a single slide
 * NOTE: Text is now rendered onto images BEFORE this function using Canvas API
 * This function ONLY applies video effects (no text overlay)
 *
 * @param {string} imagePath - Input image path (text already rendered if needed)
 * @param {string} outputPath - Output video path
 * @param {Object} effects - Effects configuration
 */
async function applySlideEffects(imagePath, outputPath, effects) {
  const {
    duration = 7,
    kenBurns = true,
    vignette = true,
    fadeIn = true,
    fadeOut = true,
    kenBurnsDirection = 'inout',
    kenBurnsZoomAmount = 1.15
  } = effects;

  const videoFilters = [];

  // Start with loop filter
  videoFilters.push('loop=loop=-1:size=1:start=0');

  // Scale to 9:16
  videoFilters.push('scale=1080:1920:flags=bicubic');

  // Ken Burns effect - with custom direction and zoom amount
  if (kenBurns) {
    videoFilters.push(FfmpegEffects.kenBurnsFilter(duration, kenBurnsZoomAmount, kenBurnsDirection));
  }

  // Vignette
  if (vignette) {
    videoFilters.push(FfmpegEffects.vignetteFilter(0.3));
  }

  // Fade effects
  if (fadeIn) {
    videoFilters.push('fade=t=in:st=0:d=0.5');
  }
  if (fadeOut) {
    videoFilters.push(`fade=t=out:st=${duration - 0.5}:d=0.5`);
  }

  const command = [
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-vf', videoFilters.join(','),
    '-frames:v', Math.round(duration * 25).toString(),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-tune', 'stillimage',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-an', // No audio yet
    '-movflags', '+faststart',
    outputPath
  ];

  await ffmpegWrapper.execute(command);
}

/**
 * Concatenate slide videos with audio
 *
 * @param {Array} slideVideos - Array of slide video paths with durations
 * @param {string} audioPath - Mixed audio path
 * @param {string} outputPath - Final output path
 * @returns {Promise<string>} Path to final video
 */
async function concatenateSlidesWithAudio(slideVideos, audioPath, outputPath) {
  logger.info('Concatenating slides with audio', {
    slideCount: slideVideos.length,
    audioPath,
    slideDurations: slideVideos.map(s => s.duration.toFixed(2))
  });

  const totalDuration = slideVideos.reduce((sum, slide) => sum + slide.duration, 0);

  logger.info('Slide timing', {
    totalVideoDuration: totalDuration.toFixed(2),
    slideCount: slideVideos.length
  });

  // Create concat filter
  const inputs = slideVideos.map(s => `-i ${s.path}`).join(' ');
  const filterParts = slideVideos.map((_, i) => `[${i}:v]`).join('');
  const concatFilter = `${filterParts}concat=n=${slideVideos.length}:v=1:a=0[v]`;

  const command = [
    '-y',
    ...slideVideos.flatMap(s => ['-i', s.path]),
    '-i', audioPath,
    '-filter_complex', concatFilter,
    '-map', '[v]',
    '-map', `${slideVideos.length}:a`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'libmp3lame',
    '-b:a', '192k',
    '-ar', '48000',
    '-t', totalDuration.toFixed(2), // Explicitly set output duration to match video length
    '-movflags', '+faststart',
    outputPath
  ];

  await ffmpegWrapper.execute(command);

  logger.info('Video concatenation complete', { path: outputPath });

  // NOTE: No cleanup of temp slide videos - scheduled job handles cleanup
  // Keeping files for troubleshooting

  return outputPath;
}

/**
 * Generate a multi-slide Tier 1 video
 *
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export async function generateMultiSlideVideo(options) {
  const startTime = Date.now();

  const {
    story,
    caption = '',
    hook = '',
    cta = 'Read more on Blush 🔥',  // Default CTA with emoji
    voice = 'female_1',
    musicId = null,
    preset = 'triple_visual',
    effects = {
      kenBurns: true,
      vignette: true
    },
    outputPath: customOutputPath = null
  } = options;

  try {
    logger.info('Starting multi-slide video generation', {
      storyId: story?._id,
      preset,
      musicId
    });

    // Ensure directories exist
    await fs.mkdir(STORAGE_VIDEOS, { recursive: true });
    await fs.mkdir(STORAGE_TEMP_IMAGES, { recursive: true });
    await fs.mkdir(STORAGE_TEMP_GRADIENTS, { recursive: true });
    await fs.mkdir(STORAGE_THUMBNAILS, { recursive: true });

    // Get preset configuration
    const presetConfig = getPreset(preset);

    logger.info('Using preset', {
      name: presetConfig.name,
      imageCount: presetConfig.imageCount
    });

    // ============================================================
    // Step 1: Generate narration with duration control
    // ============================================================
    logger.info('Step 1: Generating narration with duration control...');

    // Import fetchStoryScene from parent module
    const { fetchStoryScene } = await import('../tieredVideoGenerator.js');

    const { text: narrationText, duration: estimatedDuration, inRange: durationInRange, ttsPath: durationTtsPath } = await extractTextForDuration(
      story,
      fetchStoryScene,
      { voice }
    );

    logger.info('Narration text extracted', {
      estimatedDuration: estimatedDuration.toFixed(1),
      textLength: narrationText.length,
      inRange: durationInRange,
      ttsPathProvided: !!durationTtsPath
    });

    // ============================================================
    // Step 2: Use TTS from duration control or generate new one
    // ============================================================
    let ttsPath;
    let ttsResult;

    if (durationTtsPath) {
      // Reuse the TTS file from duration control
      ttsPath = durationTtsPath;
      ttsResult = { path: ttsPath, duration: estimatedDuration };
      logger.info('Using TTS from duration control', { path: ttsPath, duration: estimatedDuration.toFixed(1) });
    } else {
      // Generate new TTS (fallback)
      logger.info('Generating new TTS (fallback)...');
      ttsPath = path.join(STORAGE_TEMP, `narration_${Date.now()}.wav`);
      ttsResult = await runPodTTSGenerator.generateForStory(story, narrationText, {
        voice,
        outputPath: ttsPath
      });
    }

    // Log final TTS duration
    const MIN_VIDEO_DURATION = 15;
    const MAX_VIDEO_DURATION = 30;
    const inRangeAfterTTS = ttsResult.duration >= MIN_VIDEO_DURATION && ttsResult.duration <= MAX_VIDEO_DURATION;

    // Log narration text details to verify it's complete
    const narrationStart = narrationText.substring(0, 80);
    const narrationEnd = narrationText.length > 80 ? narrationText.substring(narrationText.length - 80) : narrationText;

    logger.info('TTS ready for video generation', {
      path: ttsResult.path,
      duration: ttsResult.duration.toFixed(2),
      inRange: inRangeAfterTTS,
      targetRange: `${MIN_VIDEO_DURATION}-${MAX_VIDEO_DURATION}s`,
      textLength: narrationText.length,
      textStart: narrationStart.replace(/\n/g, ' '),
      textEnd: narrationEnd.replace(/\n/g, ' ')
    });

    // If duration is out of range, log a warning but continue
    if (!inRangeAfterTTS) {
      if (ttsResult.duration < MIN_VIDEO_DURATION) {
        logger.warn(`Narration shorter than minimum (${ttsResult.duration.toFixed(2)}s < ${MIN_VIDEO_DURATION}s), but continuing after max attempts...`);
      } else {
        logger.warn(`Narration longer than preferred (${ttsResult.duration.toFixed(2)}s > ${MAX_VIDEO_DURATION}s), but continuing...`);
      }
    }

    // Log the actual TTS file to verify duration
    logger.info('TTS file details', {
      path: ttsResult.path,
      fileSize: (await fs.stat(ttsResult.path).catch(() => ({ size: 0 })))?.size || 'unknown'
    });

    // ============================================================
    // Step 3: Get Background Music
    // ============================================================
    let musicPath = null;

    // If musicId is provided, fetch that specific track
    if (musicId) {
      logger.info('Step 3: Getting background music from library...', { musicId });
      try {
        const Music = (await import('../../models/Music.js')).default;
        const musicTrack = await Music.findById(musicId);

        logger.info('Music track fetched from DB', {
          musicId,
          found: !!musicTrack,
          status: musicTrack?.status,
          audioPath: musicTrack?.audioPath
        });

        if (musicTrack && musicTrack.status === 'available' && musicTrack.audioPath) {
          // Convert URL path to file system path
          musicPath = path.join(process.cwd(), musicTrack.audioPath.startsWith('/storage/')
            ? musicTrack.audioPath.substring(1)  // Remove leading /
            : musicTrack.audioPath);

          // Increment usage count
          await musicTrack.incrementUsage();

          logger.info('Background music loaded from library', {
            musicId,
            name: musicTrack.name,
            audioPath: musicTrack.audioPath,
            resolvedPath: musicPath,
            fileExists: await fs.access(musicPath).then(() => true).catch(() => false)
          });
        } else {
          logger.warn('Music track not available', { musicId, track: musicTrack });
        }
      } catch (error) {
        logger.error('Failed to load music from library', {
          musicId,
          error: error.message,
          stack: error.stack
        });
      }
    } else {
      logger.info('Step 3: No musicId provided, generating narration-only video');
    }

    // If no musicId provided, musicPath remains null (narration only video)

    // ============================================================
    // Step 4: Mix Audio
    // ============================================================
    logger.info('Step 4: Mixing audio...', {
      hasNarration: !!ttsResult?.path,
      hasMusic: !!musicPath,
      musicPath
    });

    const mixedAudioPath = path.join(STORAGE_TEMP, `mixed_${Date.now()}.wav`);

    const mixResult = await audioMixer.mixNarrationWithMusic(
      ttsResult.path,
      musicPath,
      {
        outputPath: mixedAudioPath,
        narrationVolume: 1.0,
        musicVolume: musicPath ? 0.15 : 0
      }
    );

    if (!mixResult.success) {
      throw new Error(`Audio mixing failed: ${mixResult.error}`);
    }

    logger.info('Audio mixed', { duration: mixResult.duration.toFixed(2) });

    // CRITICAL: Compare TTS duration with mixed audio duration
    logger.info('Duration comparison', {
      ttsDuration: ttsResult.duration.toFixed(2),
      mixedDuration: mixResult.duration.toFixed(2),
      difference: (mixResult.duration - ttsResult.duration).toFixed(2),
      match: Math.abs(mixResult.duration - ttsResult.duration) < 0.5
    });

    // ============================================================
    // Step 5: Generate slide images
    // ============================================================
    logger.info('Step 5: Generating slide images...');

    const slides = await generateSlideImages(presetConfig, story);

    logger.info('Slide images generated', { count: slides.length });

    // ============================================================
    // Step 6: Create slide videos with effects
    // ============================================================
    logger.info('Step 6: Creating slide videos...');

    const slideVideos = await createSlideVideos(slides, {
      duration: mixResult.duration,
      effects,
      hook,
      caption,
      cta,  // Pass CTA text for use in cta slides
      story,
      narrationText,  // Pass narration text for use in narrative slides
      preset  // Pass preset to determine correct text sources per slide
    });

    logger.info('Slide videos created', {
      count: slideVideos.length,
      slideDurations: slideVideos.map(s => ({ index: s.index, duration: s.duration.toFixed(2) })),
      totalDuration: slideVideos.reduce((sum, s) => sum + s.duration, 0).toFixed(2)
    });

    // ============================================================
    // Step 7: Concatenate slides with audio
    // ============================================================
    logger.info('Step 7: Concatenating final video...');

    const finalOutputPath = customOutputPath || path.join(
      STORAGE_VIDEOS,
      `${Date.now()}_${story?._id || 'story'}_${preset}.mp4`
    );

    await concatenateSlidesWithAudio(
      slideVideos,
      mixResult.outputPath,
      finalOutputPath
    );

    logger.info('Final video created', { path: finalOutputPath });

    // ============================================================
    // Step 8: Generate thumbnail
    // ============================================================
    logger.info('Step 8: Generating thumbnail...');

    const thumbnailPath = path.join(
      STORAGE_THUMBNAILS,
      `${path.basename(finalOutputPath, '.mp4')}_thumb.jpg`
    );

    await ffmpegWrapper.extractThumbnail(finalOutputPath, thumbnailPath, {
      timestamp: 1, // Extract frame at 1 second
      width: 320,
      height: -1 // Maintain aspect ratio
    });

    logger.info('Thumbnail generated', { path: thumbnailPath });

    // ============================================================
    // Step 9: Calculate cost
    // ============================================================
    // NOTE: No manual cleanup needed - scheduled job handles temp file cleanup
    // Keeping temp files for troubleshooting audio issues
    const imageCost = presetConfig.imageCount * 0.005; // $0.005 per image
    const ttsCost = 0.002;
    const musicCost = musicId ? 0.01 : 0;
    const totalCost = imageCost + ttsCost + musicCost;

    const generationTime = Date.now() - startTime;

    logger.info('Multi-slide video generation complete', {
      videoPath: finalOutputPath,
      thumbnailPath,
      duration: mixResult.duration,
      generationTime,
      estimatedCost: totalCost.toFixed(4)
    });

    return {
      success: true,
      videoPath: finalOutputPath,
      thumbnailPath,
      duration: mixResult.duration,
      metadata: {
        preset,
        slideCount: slides.length,
        imageCount: presetConfig.imageCount,
        generationTime,
        estimatedCost: totalCost,
        tier: 'tier_1',
        videoModel: 'ffmpeg_multi_slide'
      }
    };

  } catch (error) {
    logger.error('Multi-slide video generation failed', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get cost estimate for a preset
 *
 * @param {string} preset - Preset name
 * @param {Object} options - Options
 * @returns {Object} Cost breakdown
 */
export function getPresetCostEstimate(preset = 'triple_visual', options = {}) {
  const presetConfig = getPreset(preset);
  const { musicId = null } = options;

  const imageCost = presetConfig.imageCount * 0.005;
  const ttsCost = 0.002;
  const musicCost = musicId ? 0.01 : 0;
  const totalCost = imageCost + ttsCost + musicCost;

  return {
    total: totalCost,
    breakdown: {
      images: imageCost,
      tts: ttsCost,
      music: musicCost,
      processing: 0
    },
    currency: 'USD',
    imageCount: presetConfig.imageCount
  };
}

export default {
  SLIDE_PRESETS,
  getPreset,
  getAllPresets,
  generateMultiSlideVideo,
  getPresetCostEstimate,
  createGradientSlide
};
