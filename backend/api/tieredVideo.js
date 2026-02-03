/**
 * Tiered Video API Endpoints
 *
 * Provides REST API endpoints for tiered video generation.
 *
 * Endpoints:
 * - POST /api/tiered-video/generate-tier1 - Generate Tier 1 video
 * - GET /api/tiered-video/status/:jobId - Get generation status
 * - GET /api/tiered-video/health - Health check
 * - GET /api/tiered-video/cost-estimate - Get cost estimate
 * - GET /api/tiered-video/voices - Get available voices
 */

import express from 'express';
import { getLogger } from '../utils/logger.js';
import * as tieredVideoGenerator from '../services/tieredVideoGenerator.js';
import * as runPodTTSGenerator from '../services/runPodTTSGenerator.js';
import MarketingPost from '../models/MarketingPost.js';

// Available presets for validation
const AVAILABLE_PRESETS = ['triple_visual', 'hook_first'];

const router = express.Router();
const logger = getLogger('api', 'tiered-video');

/**
 * Convert a file path to a storage URL for frontend access
 * @param {string} filePath - Absolute file path
 * @returns {string|null} URL path or null
 */
function storagePathToUrl(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Match various storage path patterns (after normalization to forward slashes)
  const storageMatch = normalizedPath.match(/\/?mnt\/[cC]\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/[A-Z]:\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/\/storage\/(.+)/);

  if (storageMatch) {
    const url = `/storage/${storageMatch[1]}`;
    logger.debug('Path converted', {
      input: filePath,
      normalized: normalizedPath,
      output: url
    });
    return url;
  }

  // If path is already under /storage, use as-is
  if (normalizedPath.startsWith('/storage/')) {
    logger.debug('Path already in URL format', {
      input: filePath,
      output: normalizedPath
    });
    return normalizedPath;
  }

  // Log warning if path couldn't be converted
  logger.warn('Could not convert path to URL', {
    input: filePath,
    normalized: normalizedPath
  });

  return filePath;
}

/**
 * POST /api/tiered-video/generate-tier1
 *
 * Generate a Tier 1 enhanced static video with multi-slide presets
 *
 * Request body:
 * {
 *   "storyId": string,          // Story ID to generate video for
 *   "preset": "triple_visual",  // Preset: 'triple_visual', 'hook_first', or null for legacy
 *   "caption": string,          // Caption text
 *   "hook": string,             // Hook text for video opening
 *   "cta": string,              // Call-to-action text (default: "Read more on Blush 🔥")
 *   "voice": "female_1",        // Voice selection
 *   "musicId": string,          // Background music track ID (optional - omit for narration only)
 *   "effects": {                // Effect configuration
 *     "kenBurns": true,
 *     "pan": false,
 *     "textOverlay": true,
 *     "vignette": true
 *   },
 *   "createPost": true,         // Create MarketingPost after generation
 *   "platform": "tiktok",       // Platform for the post
 *   "scheduledAt": string       // ISO date for scheduling
 * }
 */
router.post('/generate-tier1', async (req, res) => {
  const requestId = req.headers['x-request-id'] || Date.now().toString(36);

  try {
    const {
      storyId,
      preset = 'triple_visual',
      caption = '',
      hook = '',
      cta = 'Read more on Blush 🔥',
      voice = 'female_1',
      musicId = null,
      effects = {},
      createPost = true,
      platform = 'tiktok',
      scheduledAt = null
    } = req.body;

    // Log key parameters for debugging
    logger.info('Tier 1 video generation requested', {
      requestId,
      storyId,
      preset,
      voice,
      platform
    });

    // Validate required fields
    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: storyId'
      });
    }

    // Validate preset
    if (preset && !AVAILABLE_PRESETS.includes(preset)) {
      return res.status(400).json({
        success: false,
        error: `Invalid preset. Must be one of: ${AVAILABLE_PRESETS.join(', ')}`
      });
    }

    // Validate voice
    const validVoices = ['female_1', 'female_2', 'female_3', 'male_1', 'male_2', 'male_3'];
    if (!validVoices.includes(voice)) {
      return res.status(400).json({
        success: false,
        error: `Invalid voice. Must be one of: ${validVoices.join(', ')}`
      });
    }

    // Validate platform
    const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
      });
    }

    // Fetch story from database
    const Story = req.db?.model('Story') || (await import('../models/Story.js')).default;
    const { ObjectId } = await import('mongoose');

    // Convert string ID to ObjectId explicitly
    let objectId;
    try {
      objectId = new ObjectId(storyId);
    } catch (err) {
      logger.error('Invalid story ID format', { storyId, error: err.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid story ID format'
      });
    }

    const story = await Story.findById(objectId);

    if (!story) {
      logger.error('Story not found', { storyId, objectId });
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    logger.info('Story found', {
      storyId,
      storyName: story.name,
      hasTextUrl: !!story.fullStory?.textUrl
    });

    // Generate the video
    const result = await tieredVideoGenerator.generateTier1Video({
      story: story.toObject({ minimize: false }),  // Preserve fields not in schema (like fullStory)
      caption,
      hook,
      cta,
      voice,
      musicId,
      preset,  // Pass preset through to video generator
      effects: {
        kenBurns: effects.kenBurns !== false,
        pan: effects.pan === true,
        textOverlay: effects.textOverlay !== false,
        vignette: effects.vignette !== false,
        fadeIn: effects.fadeIn !== false,
        fadeOut: effects.fadeOut !== false
      }
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Create MarketingPost if requested
    let marketingPost = null;
    if (createPost) {
      // Generate default caption if none provided
      const finalCaption = caption || `Watch "${story.name}" - a romantic story from blush! 💕 #romance #story #blush`;
      const hashtags = finalCaption.match(/#[\w]+/g) || [];

      marketingPost = new MarketingPost({
        title: `${story.name} - ${platform} Video`,
        description: hook || finalCaption.substring(0, 200),
        platform,
        status: 'draft',
        contentType: 'video',
        videoPath: storagePathToUrl(result.videoPath),
        thumbnailPath: result.thumbnailPath ? storagePathToUrl(result.thumbnailPath) : null,
        caption: finalCaption,
        hashtags,
        hook: hook || 'You won\'t believe what happens next...',  // Neutral default, no story name
        storyId: story._id,
        storyName: story.name,
        storyCategory: story.category || 'romance',
        storySpiciness: story.spiciness || 1,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        contentTier: 'tier_1',
        generationMetadata: result.metadata
      });

      await marketingPost.save();
      logger.info('MarketingPost created', {
        postId: marketingPost._id,
        tier: 'tier_1'
      });
    }

    res.json({
      success: true,
      data: {
        videoPath: storagePathToUrl(result.videoPath),
        duration: result.duration,
        metadata: result.metadata,
        postId: marketingPost?._id
      }
    });

  } catch (error) {
    logger.error('Tier 1 video generation failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiered-video/health
 *
 * Health check for tiered video generation system
 */
router.get('/health', async (req, res) => {
  try {
    const health = await tieredVideoGenerator.healthCheck();

    const statusCode = health.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: health.healthy,
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });

    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiered-video/cost-estimate
 *
 * Get cost estimate for Tier 1 video generation
 *
 * Query params:
 * - preset: 'triple_visual', 'hook_first', or undefined
 * - musicId: string (optional - music track ID)
 */
router.get('/cost-estimate', (req, res) => {
  try {
    const preset = req.query.preset || 'triple_visual';
    const musicId = req.query.musicId || null;

    // Validate preset
    if (preset && !AVAILABLE_PRESETS.includes(preset)) {
      return res.status(400).json({
        success: false,
        error: `Invalid preset. Must be one of: ${AVAILABLE_PRESETS.join(', ')}`
      });
    }

    const estimate = tieredVideoGenerator.getCostEstimate({
      preset,
      musicId
    });

    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    logger.error('Cost estimate failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiered-video/voices
 *
 * Get available TTS voices
 */
router.get('/voices', (req, res) => {
  try {
    const voices = runPodTTSGenerator.getAvailableVoices();

    res.json({
      success: true,
      data: {
        voices,
        default: 'female_1'
      }
    });
  } catch (error) {
    logger.error('Get voices failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiered-video/stats
 *
 * Get tiered video generation statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = tieredVideoGenerator.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get stats failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tiered-video/regenerate/:postId
 *
 * Regenerate a video for an existing MarketingPost
 *
 * Request body:
 * {
 *   "feedback": string,       // Regeneration feedback
 *   "options": {              // Generation options
 *     "preset": "triple_visual", // Preset for regeneration
 *     "voice": "female_1",
 *     "musicId": string,      // Background music track ID (optional)
 *     "effects": {...},
 *     "hook": string,         // New hook text (optional, updates post)
 *     "caption": string,      // New caption text (optional, updates post)
 *     "cta": string           // New CTA text (optional, default: "Read more on Blush 🔥")
 *   }
 * }
 */
router.post('/regenerate/:postId', async (req, res) => {
  const requestId = req.headers['x-request-id'] || Date.now().toString(36);
  const { postId } = req.params;
  // Support both nested options format and flat format from frontend
  const { feedback, options = {}, voice, hook, caption, cta, effects, preset, musicId } = req.body;

  // Merge flat properties into options if provided (frontend sends them flat)
  const mergedOptions = {
    ...options,
    ...(preset !== undefined && { preset }),
    ...(voice !== undefined && { voice }),
    ...(hook !== undefined && { hook }),
    ...(caption !== undefined && { caption }),
    ...(cta !== undefined && { cta }),
    ...(effects !== undefined && { effects }),
    ...(musicId !== undefined && { musicId })
  };

  try {
    logger.info('Video regeneration requested', {
      requestId,
      postId,
      feedback,
      options
    });

    // Validate preset if provided
    if (mergedOptions.preset && !AVAILABLE_PRESETS.includes(mergedOptions.preset)) {
      return res.status(400).json({
        success: false,
        error: `Invalid preset. Must be one of: ${AVAILABLE_PRESETS.join(', ')}`
      });
    }

    // Find the existing post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'MarketingPost not found'
      });
    }

    // Check for force parameter to allow overriding stuck 'generating' status
    const forceRegenerate = options.force === true || req.query.force === 'true';

    // Check if already generating (and handle stale states)
    if (post.status === 'generating') {
      // Check if this is a stale generation (started more than 10 minutes ago)
      const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
      const isStale = post.videoGenerationProgress?.startedAt &&
        (Date.now() - new Date(post.videoGenerationProgress.startedAt).getTime()) > STALE_THRESHOLD_MS;

      if (isStale || forceRegenerate) {
        // Reset stale state
        logger.info('Resetting stale or forced regeneration', {
          postId,
          wasStale: isStale,
          wasForced: forceRegenerate
        });
        post.status = 'draft';
        await post.save();
      } else {
        // genuinely still generating, reject request
        return res.status(409).json({
          success: false,
          error: 'Video generation already in progress',
          data: {
            status: 'generating',
            progress: post.videoGenerationProgress?.progress || 0,
            currentStep: post.videoGenerationProgress?.currentStep || 'Initializing...',
            hint: 'Add ?force=true to override'
          }
        });
      }
    }

    // Store previous state
    const previousVideoPath = post.videoPath;
    const previousMetadata = post.generationMetadata;

    // Set status to generating before starting
    await post.startVideoGeneration();

    // Respond immediately with generation started status
    res.json({
      success: true,
      data: {
        status: 'generating',
        postId: post._id,
        message: 'Video generation started'
      }
    });

    // Continue generation in background
    setImmediate(async () => {
      try {
        // Fetch story
        const Story = (await import('../models/Story.js')).default;
        const story = await Story.findById(post.storyId);

        if (!story) {
          await post.failVideoGeneration('Associated story not found');
          logger.error('Story not found for video generation', { postId, storyId: post.storyId });
          return;
        }

        logger.info('Story found for regeneration', {
          postId,
          storyId: story._id,
          storyName: story.name,
          hasTextUrl: !!story.fullStory?.textUrl
        });

        // Update progress - extracting text
        await post.updateVideoGenerationProgress('extracting_text', 10, 'Extracting story text...');

        // Update progress - generating images
        await post.updateVideoGenerationProgress('generating_images', 30, 'Generating AI images...');

        // Generate new video with preset
        // Use hook from mergedOptions if provided, otherwise use existing post hook
        const hookToUse = mergedOptions.hook !== undefined ? mergedOptions.hook : post.hook;
        const captionToUse = mergedOptions.caption !== undefined ? mergedOptions.caption : post.caption;
        const ctaToUse = mergedOptions.cta !== undefined ? mergedOptions.cta : post.cta || 'Read more on Blush 🔥';

        // Update post with new hook/caption/cta if provided
        if (mergedOptions.hook !== undefined) {
          post.hook = mergedOptions.hook;
        }
        if (mergedOptions.caption !== undefined) {
          post.caption = mergedOptions.caption;
        }
        if (mergedOptions.cta !== undefined) {
          post.cta = mergedOptions.cta;
        }

        // Try to get preset from multiple sources (in order of priority)
        const presetFromMetadata = post.generationMetadata?.preset;
        const presetFromTierParams = post.tierParameters?.get?.('preset')?.parameterValue;

        const finalPreset = mergedOptions.preset || presetFromMetadata || presetFromTierParams || 'triple_visual';

        // Try to get musicId from multiple sources (in order of priority)
        const musicIdFromMetadata = post.generationMetadata?.musicId;
        const finalMusicId = mergedOptions.musicId !== undefined ? mergedOptions.musicId : musicIdFromMetadata;

        const result = await tieredVideoGenerator.generateTier1Video({
          story: story.toObject({ minimize: false }),  // Preserve fields not in schema (like fullStory)
          caption: captionToUse,
          hook: hookToUse,
          cta: ctaToUse,
          voice: mergedOptions.voice || post.generationMetadata?.voice || 'female_1',
          musicId: finalMusicId,
          preset: finalPreset,
          effects: mergedOptions.effects || {}
        });

        // Log what preset and musicId were actually used
        logger.info('Video generation using preset and musicId', {
          postId,
          presetPassedIn: mergedOptions.preset,
          presetFromMetadata,
          presetFromTierParams,
          presetFinallyUsed: finalPreset,
          musicIdPassedIn: mergedOptions.musicId,
          musicIdFromMetadata,
          musicIdFinallyUsed: finalMusicId
        });

        if (!result.success) {
          await post.failVideoGeneration(result.error || 'Video generation failed');
          logger.error('Video generation failed', { postId, error: result.error });
          return;
        }

        // Update progress - completing
        await post.updateVideoGenerationProgress('processing_video', 90, 'Finalizing video...');

        // Update post with completed video
        post.videoPath = storagePathToUrl(result.videoPath);
        post.thumbnailPath = result.thumbnailPath ? storagePathToUrl(result.thumbnailPath) : null;
        post.contentTier = 'tier_1';
        // Merge result.metadata with preset and musicId to ensure they're stored
        post.generationMetadata = {
          ...result.metadata,
          preset: finalPreset,
          musicId: finalMusicId,
          voice: mergedOptions.voice || post.generationMetadata?.voice || 'female_1'
        };
        post.regenerationCount = (post.regenerationCount || 0) + 1;
        post.lastRegeneratedAt = new Date();

        // Add to regeneration history
        post.regenerationHistory.push({
          timestamp: new Date(),
          feedback,
          previousCaption: post.caption,
          previousHashtags: post.hashtags,
          previousHook: post.hook
        });

        // Complete the generation
        await post.completeVideoGeneration(
          storagePathToUrl(result.videoPath),
          result.duration,
          result.metadata
        );

        logger.info('Video regenerated successfully', {
          requestId,
          postId,
          newVideoPath: result.videoPath
        });

      } catch (error) {
        await post.failVideoGeneration(error.message);
        logger.error('Video regeneration background job failed', {
          requestId,
          postId,
          error: error.message,
          stack: error.stack
        });
      }
    });

  } catch (error) {
    logger.error('Video regeneration failed', {
      requestId,
      postId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiered-video/progress/:postId
 *
 * Get video generation progress for a post
 */
router.get('/progress/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'MarketingPost not found'
      });
    }

    const progress = post.videoGenerationProgress || {
      status: 'idle',
      progress: 0,
      currentStep: 'Not started'
    };

    res.json({
      success: true,
      data: {
        postId: post._id,
        status: post.status,
        progress: progress.progress || 0,
        currentStep: progress.currentStep || 'Not started',
        stage: progress.status || 'idle',
        videoPath: post.videoPath,
        completedAt: progress.completedAt,
        errorMessage: progress.errorMessage
      }
    });

  } catch (error) {
    logger.error('Get video generation progress failed', {
      postId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
