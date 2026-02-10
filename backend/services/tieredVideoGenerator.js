/**
 * Tiered Video Generator Service
 *
 * Main orchestrator for Tier 1 video generation.
 * Coordinates image generation, TTS, audio mixing, and FFmpeg processing.
 *
 * Tier 1: Enhanced Static (~$0.01-0.05 per video)
 * - 1 high-quality AI image (RunPod PixelWave on Flux)
 * - ffmpeg effects: Ken Burns zoom, pan, text overlays, vignette
 * - XTTS narration (RunPod serverless)
 * - Optional: fal.ai background music
 * - Output: Vertical 9:16 videos for TikTok/Instagram
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { getLogger } from '../utils/logger.js';
import ffmpegWrapper from '../utils/ffmpegWrapper.js';
import FfmpegEffects from '../utils/ffmpegEffects.js';
import audioMixer from '../utils/audioMixer.js';
import * as runPodImageGenerator from './runPodImageGenerator.js';
import * as runPodTTSGenerator from './runPodTTSGenerator.js';
import falAiAudioService from './falAiAudioService.js';
import { generateMultiSlideVideo, getPreset, getPresetCostEstimate } from './tieredVideoGenerator/multiSlideGenerator.js';

const logger = getLogger('services', 'tiered-video-generator');

// Storage paths
const STORAGE_BASE = path.join(process.cwd(), 'storage');

// Final output directories (keepers - never cleaned up by temp cleanup job)
const STORAGE_VIDEOS = path.join(STORAGE_BASE, 'videos', 'tier1', 'final');

// Temp directories (cleaned up daily - files older than 24 hours are deleted)
const STORAGE_TEMP_IMAGES = path.join(STORAGE_BASE, 'temp', 'images');
const STORAGE_TEMP_NARRATION = path.join(STORAGE_BASE, 'temp', 'narration');
const STORAGE_TEMP = path.join(STORAGE_BASE, 'temp');

// Cost tracking (estimated)
const COSTS = {
  pixelwave_image: 0.005,
  xtts_speech: 0.002,
  fal_ai_music: 0.01,
  ffmpeg_processing: 0
};

// Available presets for Tier 1 video generation
const AVAILABLE_PRESETS = ['triple_visual', 'hook_first'];

// Default preset
const DEFAULT_PRESET = 'triple_visual';

// Objectionable words to filter out (basic content filtering)
const OBJECTIONABLE_WORDS = new Set([
  // Explicit anatomical terms that might trigger filters
  // Keep it PG-13/R-rated but not X-rated
]);

// Keywords that indicate steamy/action scenes (positive indicators)
const STEAMY_KEYWORDS = [
  'kiss', 'touch', 'caress', 'embrace', 'desire', 'passion', 'whisper',
  'breath', 'heart', 'tremble', 'flush', 'skin', 'lips', 'gaze',
  'pull', 'close', 'warmth', 'electric', 'tingle', 'pulse', 'ache',
  'want', 'need', 'crave', 'burn', 'fire', 'intensity', 'connection',
  'pressed', 'against', 'together', 'intertwined', 'entangled', 'wrapped',
  'deeper', 'harder', 'faster', 'closer', ' urgency', 'desperate'
];

/**
 * Download text content from a URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} Text content
 */
function downloadText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extract a steamy action scene from story text
 * Looks for segments with romantic tension without objectionable content
 *
 * @param {string} fullText - Full story text
 * @param {number} targetLength - Target length for narration in characters (default: 300)
 * @returns {string} Extracted scene text
 */
function extractSteamyScene(fullText, targetLength = 300) {
  // Split into paragraphs
  const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 50);

  // Score each paragraph based on steamy keywords
  const scoredParagraphs = paragraphs.map(para => {
    const lower = para.toLowerCase();
    let score = 0;
    for (const keyword of STEAMY_KEYWORDS) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    // Check for objectionable words (penalty)
    for (const bad of OBJECTIONABLE_WORDS) {
      if (lower.includes(bad)) {
        score -= 10;
      }
    }
    return { text: para.trim(), score, length: para.trim().length };
  });

  // Sort by score (highest first) and filter out negatives
  const bestParagraphs = scoredParagraphs
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

  if (bestParagraphs.length === 0) {
    // Fallback: return first paragraph
    return truncateAtSentenceBoundary(paragraphs[0] || fullText.substring(0, targetLength), targetLength);
  }

  // Define acceptable range (±30% of target)
  const minAcceptable = targetLength * 0.7;
  const maxAcceptable = targetLength * 1.3;

  // Try to find a single paragraph that fits in the acceptable range
  for (const para of bestParagraphs) {
    if (para.length >= minAcceptable && para.length <= maxAcceptable) {
      // Paragraph fits in range, use it as-is or truncate at sentence boundary
      return truncateAtSentenceBoundary(para.text, targetLength);
    }
  }

  // If no single paragraph fits, try combining paragraphs
  // Start with the highest scoring paragraph and add more until we reach the target
  let combinedText = bestParagraphs[0].text;
  let combinedLength = bestParagraphs[0].length;

  for (let i = 1; i < bestParagraphs.length; i++) {
    // If we're already close enough to target, stop
    if (combinedLength >= minAcceptable) {
      break;
    }
    // Add next paragraph
    combinedText += ' ' + bestParagraphs[i].text;
    combinedLength = combinedText.length;
  }

  // Truncate at sentence boundary to match target length
  return truncateAtSentenceBoundary(combinedText, targetLength);
}

/**
 * Truncate text at the nearest sentence boundary to match target length
 *
 * @param {string} text - Text to truncate
 * @param {number} targetLength - Target length in characters
 * @returns {string} Truncated text ending at a sentence boundary
 */
function truncateAtSentenceBoundary(text, targetLength) {
  // If text is already short enough, return as-is
  if (text.length <= targetLength) {
    return text;
  }

  // Find the best sentence boundary before or after target
  const searchRange = Math.floor(targetLength * 0.3); // Search within 30% of target
  const startPos = Math.max(0, targetLength - searchRange);
  const endPos = Math.min(text.length, targetLength + searchRange);

  const searchArea = text.substring(startPos, endPos);

  // Look for sentence endings in order of preference: . ! ? ...
  const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '.\r', '!\r', '?\r'];
  let bestEnd = -1;
  let bestDistance = Infinity;

  for (const ending of sentenceEndings) {
    const pos = searchArea.indexOf(ending);
    if (pos !== -1) {
      const actualPos = startPos + pos + ending.length - 1; // Position after the punctuation
      const distance = Math.abs(actualPos - targetLength);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestEnd = actualPos;
      }
    }
  }

  // If we found a good sentence ending (within 20% of target)
  if (bestEnd !== -1 && bestDistance <= targetLength * 0.2) {
    return text.substring(0, bestEnd + 1);
  }

  // Fallback: Find the last sentence ending before target
  const beforeTarget = text.substring(0, targetLength + searchRange);
  for (const ending of sentenceEndings) {
    const pos = beforeTarget.lastIndexOf(ending);
    if (pos > targetLength * 0.5) { // At least halfway to target
      return text.substring(0, pos + 1);
    }
  }

  // Last resort: truncate at target length (avoid cutting mid-word if possible)
  let truncatePos = targetLength;
  const lastSpace = text.lastIndexOf(' ', targetLength);
  if (lastSpace > targetLength * 0.8) {
    truncatePos = lastSpace;
  }

  return text.substring(0, truncatePos) + '...';
}

/**
 * Fetch and extract a scene from story for narration
 * @param {Object} story - Story object from database
 * @param {number} targetLength - Target narration length in characters
 * @returns {Promise<string>} Extracted scene text
 */
async function fetchStoryScene(story, targetLength = 300) {
  try {
    // Check for story text URL
    const textUrl = story?.fullStory?.textUrl;

    if (!textUrl) {
      const error = 'Story missing fullStory.textUrl - cannot extract story text';
      logger.error(error);
      throw new Error(error);
    }

    logger.info('Fetching story text', { textUrl });
    const fullText = await downloadText(textUrl);

    if (!fullText || fullText.length < 100) {
      const error = `Downloaded story text too short (${fullText?.length || 0} chars)`;
      logger.error(error, { textLength: fullText?.length || 0 });
      throw new Error(error);
    }

    const scene = extractSteamyScene(fullText, targetLength);
    logger.info('Extracted steamy scene', { targetLength, actualLength: scene.length });

    return scene;
  } catch (error) {
    logger.error('Failed to fetch story scene - cannot generate post', { error: error.message });
    throw new Error(`Cannot extract story text: ${error.message}`);
  }
}

/**
 * Ensure storage directories exist
 */
async function ensureDirectories() {
  const dirs = [STORAGE_VIDEOS, STORAGE_TEMP_IMAGES, STORAGE_TEMP_NARRATION, STORAGE_TEMP];
  await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true })));
}

/**
 * Tier 1 Video Generation Options
 * @typedef {Object} Tier1Options
 * @property {Object} story - Story object from database
 * @property {string} caption - Caption text
 * @property {string} hook - Hook text for video opening
 * @property {string} cta - Call-to-action text for final slide (default: "Read more on Blush 🔥")
 * @property {string} voice - Voice selection (female_1-3, male_1-3)
 * @property {string} musicId - Background music track ID (optional - omit for narration only)
 * @property {Object} effects - Effect configuration
 * @property {string} preset - Preset: 'triple_visual', 'hook_first', or null for legacy mode
 * @property {string} outputPath - Custom output path (optional)
 */

/**
 * Generate Tier 1 Enhanced Static Video
 *
 * Supports two modes:
 * 1. Multi-slide mode (preset specified): Uses preset configurations for multiple slides
 * 2. Legacy mode (no preset): Original single-image video generation
 *
 * @param {Tier1Options} options - Generation options
 * @returns {Promise<{success: boolean, videoPath: string, duration: number, metadata: Object}|{success: boolean, error: string}>}
 */
async function generateTier1Video(options) {
  const startTime = Date.now();

  const {
    story,
    caption = '',
    hook = '',
    cta = 'Read more on Blush 🔥',
    voice = 'female_1',
    musicId = null,
    effects = {
      kenBurns: true,
      pan: false,
      textOverlay: true,
      vignette: true,
      fadeIn: false,
      fadeOut: false
    },
    preset = DEFAULT_PRESET,
    outputPath: customOutputPath = null
  } = options;

  // Log preset for debugging
  logger.info('generateTier1Video called with preset', { preset, availablePresets: AVAILABLE_PRESETS });

  // If preset is specified and valid, use multi-slide generator
  if (preset && AVAILABLE_PRESETS.includes(preset)) {
    logger.info('Using multi-slide generator', { preset });

    return await generateMultiSlideVideo({
      story,
      caption,
      hook,
      cta,
      voice,
      musicId,
      effects,
      preset,
      outputPath: customOutputPath
    });
  }

  // Otherwise, use legacy single-slide generation
  logger.info('Using legacy single-slide generation');

  try {
    logger.info('Starting Tier 1 video generation', {
      storyId: story?._id,
      voice,
      musicId,
      effects
    });

    // Ensure directories exist
    await ensureDirectories();

    // Track generation metadata
    const generationMetadata = {
      tier: 'tier_1',
      imageModel: 'pixelwave',
      videoModel: 'ffmpeg_enhanced_static',
      ttsModel: 'xtts',
      audioModel: musicId ? 'library' : null,
      effects: []
    };

    let estimatedCost = 0;

    // ============================================================
    // Step 1: Generate AI Image (to temp directory)
    // ============================================================
    logger.info('Step 1: Generating AI image...');
    const timestamp = Date.now();
    const imagePath = path.join(STORAGE_TEMP_IMAGES, `${timestamp}_${story?._id || 'story'}.png`);

    const imageResult = await runPodImageGenerator.generateForStory(story, {
      outputPath: imagePath,
      spiciness: story?.spiciness || 1
    });

    generationMetadata.imageModel = 'pixelwave';
    generationMetadata.imagePrompt = imageResult.prompt;
    estimatedCost += COSTS.pixelwave_image;

    logger.info('Image generated', { path: imageResult.path });

    // ============================================================
    // Step 2: Generate Narration (to temp directory)
    // ============================================================
    logger.info('Step 2: Generating narration...');

    // Fetch a steamy scene from the story for narration
    const sceneText = await fetchStoryScene(story, 300);

    // Build narration text with optional hook and the scene
    const narrationText = hook ? `${hook}. ${sceneText}` : sceneText;
    const narrationPath = path.join(STORAGE_TEMP_NARRATION, `${timestamp}_${story?._id || 'story'}.wav`);

    const ttsResult = await runPodTTSGenerator.generateForStory(story, narrationText, {
      voice,
      outputPath: narrationPath
    });

    const audioDuration = ttsResult.duration;
    generationMetadata.ttsModel = 'xtts';
    generationMetadata.voice = voice;
    generationMetadata.narrationLength = narrationText.length;
    estimatedCost += COSTS.xtts_speech;

    logger.info('Narration generated', {
      path: ttsResult.path,
      duration: `${audioDuration.toFixed(1)}s`,
      textLength: narrationText.length
    });

    // ============================================================
    // Step 3: Get Background Music (optional)
    // ============================================================
    let musicPath = null;
    if (musicId) {
      try {
        const { default: Music } = await import('../models/Music.js');
        const musicTrack = await Music.findById(musicId);

        if (musicTrack && musicTrack.status === 'available') {
          musicPath = path.join(process.cwd(), 'storage', 'audio', 'music', path.basename(musicTrack.audioPath));

          // Increment usage count
          await musicTrack.incrementUsage();

          generationMetadata.audioModel = 'library';
          logger.info('Background music loaded from library', {
            musicId,
            name: musicTrack.name,
            path: musicPath
          });
        } else {
          logger.warn('Music track not available', { musicId });
        }
      } catch (error) {
        logger.error('Failed to load music from library', {
          musicId,
          error: error.message
        });
      }
    }
    // If no musicId provided, musicPath remains null (narration only video)

    // ============================================================
    // Step 4: Mix Audio (narration + music)
    // ============================================================
    logger.info('Step 4: Mixing audio...');
    const mixedAudioPath = path.join(STORAGE_TEMP, `${timestamp}_mixed.wav`);

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

    logger.info('Audio mixed', { path: mixResult.outputPath });

    // ============================================================
    // Step 5: Build FFmpeg Command
    // ============================================================
    logger.info('Step 5: Building FFmpeg command...');

    const videoDuration = mixResult.duration;
    const finalOutputPath = customOutputPath || path.join(
      STORAGE_VIDEOS,
      `${timestamp}_${story?._id || 'story'}.mp4`
    );

    const ffmpegCommand = await buildTier1FFmpegCommand({
      imagePath: imageResult.path,
      audioPath: mixResult.outputPath,
      outputPath: finalOutputPath,
      duration: videoDuration,
      text: hook || caption.substring(0, 100),
      effects: {
        ...effects,
        duration: videoDuration
      }
    });

    // ============================================================
    // Step 6: Execute FFmpeg
    // ============================================================
    logger.info('Step 6: Executing FFmpeg...');

    await ffmpegWrapper.execute(ffmpegCommand);

    logger.info('Video generated', { path: finalOutputPath });

    // ============================================================
    // Step 7: Validate Output
    // ============================================================
    logger.info('Step 7: Validating output...');

    const validation = await validateVideoOutput(finalOutputPath, {
      expectedDuration: videoDuration,
      expectedWidth: 1080,
      expectedHeight: 1920
    });

    if (!validation.valid) {
      throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
    }

    // ============================================================
    // Step 8: Clean up temp files
    // ============================================================
    try {
      await fs.unlink(mixedAudioPath);
    } catch {
      // Ignore cleanup errors
    }

    // Calculate final stats
    const generationTime = Date.now() - startTime;
    generationMetadata.estimatedCost = estimatedCost;
    generationMetadata.generationTime = generationTime;
    generationMetadata.effects = Object.keys(effects).filter(k => effects[k]);

    logger.info('Tier 1 video generation complete', {
      videoPath: finalOutputPath,
      duration: videoDuration,
      generationTime: `${generationTime}ms`,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    return {
      success: true,
      videoPath: finalOutputPath,
      duration: videoDuration,
      metadata: generationMetadata
    };

  } catch (error) {
    logger.error('Tier 1 video generation failed', {
      error: error.message,
      storyId: story?._id
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build FFmpeg command for Tier 1 video
 * IMPORTANT: Uses -vf and -af instead of -filter_complex because the latter
 * produces corrupted files when called through WSL+Node spawn (moov atom not found)
 * @private
 */
async function buildTier1FFmpegCommand(options) {
  const {
    imagePath,
    audioPath,
    outputPath,
    duration,
    text = '',
    effects = {}
  } = options;

  const {
    kenBurns = true,
    pan = false,
    textOverlay = true,
    vignette = true,
    fadeIn = true,
    fadeOut = true,
    duration: videoDuration = 10
  } = effects;

  // Build video filter chain (for -vf option)
  const videoFilters = [];

  // Start with loop filter to extend image to match audio duration
  videoFilters.push(`loop=loop=-1:size=1:start=0`);

  // Scale to exact 9:16 dimensions (1080x1920 for vertical)
  videoFilters.push(`scale=1080:1920:flags=bicubic`);

  // Add Ken Burns zoom effect
  if (kenBurns && !pan) {
    videoFilters.push(FfmpegEffects.kenBurnsFilter(videoDuration, 1.15, 'inout'));
  }

  // Add pan effect (alternative to Ken Burns)
  if (pan && !kenBurns) {
    videoFilters.push(FfmpegEffects.panFilter(videoDuration, 'diagonal', 0.1));
  }

  // Add vignette
  if (vignette) {
    videoFilters.push(FfmpegEffects.vignetteFilter(0.3));
  }

  // Add fade in/out
  if (fadeIn) {
    videoFilters.push('fade=t=in:st=0:d=0.5');
  }
  if (fadeOut) {
    videoFilters.push(`fade=t=out:st=${videoDuration - 0.5}:d=0.5`);
  }

  // Add text overlay
  if (text) {
    const escapedText = text.replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');

    videoFilters.push(
      `drawtext=text='${escapedText}':` +
      `fontsize=42:` +
      `fontcolor=white:` +
      `x='(w-text_w)/2':` +
      `y='h-text_h-100':` +
      `shadowcolor=black@0.5:shadowx=2:shadowy=2:` +
      `borderw=2:bordercolor=black@0.3:` +
      `alpha='if(lt(t,1),t/1,if(lt(t,${videoDuration - 1}),1,(${videoDuration}-t)/1))'`
    );
  }

  // Build the complete FFmpeg command
  // IMPORTANT: Uses -vf and -af instead of -filter_complex because the latter
  // produces corrupted files (moov atom not found) when called through WSL+Node spawn.
  //
  // aformat filter resamples audio to 48kHz for video compatibility
  // The audio input may be any sample rate (XTTS outputs ~24kHz), we normalize to 48kHz
  // Per FFmpeg documentation, -movflags +faststart moves moov atom to beginning
  // for proper web playback (TikTok/Instagram compatibility)
  //
  // NOTE: Using libmp3lame instead of AAC because the native FFmpeg AAC encoder
  // in WSL produces audio that Windows Media Foundation cannot decode properly.

  const videoFilterString = videoFilters.join(',');
  const audioFilterString = 'aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo';

  // Calculate total frames to limit output (25fps * duration)
  const totalFrames = Math.round(videoDuration * 25);

  const command = [
    '-y', // Overwrite output
    '-loop', '1', // Loop the image
    '-i', imagePath, // Input image (stream 0)
    '-i', audioPath, // Input audio (stream 1)
    '-vf', videoFilterString, // Video filter (simple, no labels)
    '-af', audioFilterString, // Audio filter (simple, no labels)
    '-frames:v', totalFrames.toString(), // Limit total video frames
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-tune', 'stillimage',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', // H.264 profile for social media compatibility
    '-level', '4.0',
    '-c:a', 'libmp3lame', // Use MP3 instead of AAC due to AAC encoder issues in WSL FFmpeg
    '-b:a', '192k',
    '-ar', '48000', // 48kHz is more standard for video
    '-ac', '2', // Stereo output
    '-movflags', '+faststart', // CRITICAL: Move moov atom to beginning for web playback
    outputPath
  ];

  return command;
}

/**
 * Validate video output
 * @private
 */
async function validateVideoOutput(videoPath, expectations) {
  const errors = [];

  try {
    await fs.access(videoPath);

    const stats = await fs.stat(videoPath);
    if (stats.size === 0) {
      errors.push('Output file is empty');
    }

    // Get video metadata
    const duration = await ffmpegWrapper.getVideoDuration(videoPath);
    const dimensions = await ffmpegWrapper.getVideoDimensions(videoPath);

    if (expectations.expectedDuration && Math.abs(duration - expectations.expectedDuration) > 1) {
      errors.push(`Duration mismatch: expected ${expectations.expectedDuration}s, got ${duration}s`);
    }

    if (expectations.expectedWidth && dimensions.width !== expectations.expectedWidth) {
      errors.push(`Width mismatch: expected ${expectations.expectedWidth}, got ${dimensions.width}`);
    }

    if (expectations.expectedHeight && dimensions.height !== expectations.expectedHeight) {
      errors.push(`Height mismatch: expected ${expectations.expectedHeight}, got ${dimensions.height}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      duration,
      dimensions,
      size: stats.size
    };

  } catch (error) {
    return {
      valid: false,
      errors: [error.message]
    };
  }
}

/**
 * Get cost estimate for Tier 1 video
 *
 * @param {Object} options - Generation options
 * @returns {Object} Cost breakdown
 */
function getCostEstimate(options = {}) {
  const {
    musicId = null,
    effects = {},
    preset = DEFAULT_PRESET
  } = options;

  // If using a preset, get preset-specific cost
  if (preset && AVAILABLE_PRESETS.includes(preset)) {
    return getPresetCostEstimate(preset, { musicId });
  }

  // Legacy single-slide cost calculation
  let total = 0;
  const breakdown = {};

  // Image generation
  breakdown.image = COSTS.pixelwave_image;
  total += COSTS.pixelwave_image;

  // TTS
  breakdown.tts = COSTS.xtts_speech;
  total += COSTS.xtts_speech;

  // Music (if selected from library)
  if (musicId) {
    breakdown.music = 0.01; // Small cost for library music
    total += 0.01;
  }

  // FFmpeg processing (free, local)
  breakdown.processing = COSTS.ffmpeg_processing;

  return {
    total,
    breakdown,
    currency: 'USD',
    imageCount: 1,
    preset: 'legacy'
  };
}

/**
 * Health check
 */
async function healthCheck() {
  const checks = await Promise.allSettled([
    runPodImageGenerator.healthCheck(),
    runPodTTSGenerator.healthCheck(),
    falAiAudioService.healthCheck(),
    ffmpegWrapper.healthCheck()
  ]);

  return {
    healthy: checks.every(c => c.status === 'fulfilled' && c.value.healthy),
    imageGen: checks[0].status === 'fulfilled' ? checks[0].value : { healthy: false },
    tts: checks[1].status === 'fulfilled' ? checks[1].value : { healthy: false },
    audio: checks[2].status === 'fulfilled' ? checks[2].value : { healthy: false },
    ffmpeg: checks[3].status === 'fulfilled' ? checks[3].value : { healthy: false }
  };
}

/**
 * Get generation statistics
 */
function getStats() {
  return {
    tier: 'tier_1',
    description: 'Enhanced Static with Multi-Slide Presets',
    estimatedCost: getCostEstimate(),
    supportedEffects: ['kenBurns', 'pan', 'textOverlay', 'vignette', 'fadeIn', 'fadeOut'],
    availablePresets: AVAILABLE_PRESETS,
    defaultPreset: DEFAULT_PRESET,
    outputFormat: '9:16 (1080x1920) MP4',
    maxDuration: 30
  };
}

export {
  generateTier1Video,
  getCostEstimate,
  healthCheck,
  getStats,
  COSTS,
  AVAILABLE_PRESETS,
  DEFAULT_PRESET,
  fetchStoryScene
};

export default {
  generateTier1Video,
  getCostEstimate,
  healthCheck,
  getStats,
  AVAILABLE_PRESETS,
  DEFAULT_PRESET
};
