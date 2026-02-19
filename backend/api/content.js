import express from 'express';
import winston from 'winston';
import multer from 'multer';
import contentGenerationJob from '../jobs/contentGeneration.js';
import postingSchedulerJob from '../jobs/postingScheduler.js';
import batchGenerationScheduler from '../jobs/batchGenerationScheduler.js';
import captionGenerationService from '../services/captionGenerationService.js';
import hashtagGenerationService from '../services/hashtagGenerationService.js';
import hookGenerationService from '../services/hookGenerationService.js';
import tiktokOptimizationService from '../services/tiktokOptimizationService.js';
import instagramOptimizationService from '../services/instagramOptimizationService.js';
import youtubeOptimizationService from '../services/youtubeOptimizationService.js';
import contentBatchingService from '../services/contentBatchingService.js';
import contentModerationService from '../services/contentModerationService.js';
import MarketingPost from '../models/MarketingPost.js';
import AIAvatar from '../models/AIAvatar.js';
import Story from '../models/Story.js';
import { getStories, createPost } from '../services/tinaTools/postManagementTools.js';
import storageService from '../services/storage.js';
import ffmpegWrapper from '../utils/ffmpegWrapper.js';
import sseService from '../services/sseService.js';
import { normalizeHashtagsForStorage } from '../utils/hashtagUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for video uploads (memory storage)
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Only allow video files
    const allowedTypes = /mp4|mov|avi|webm|mkv/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed (mp4, mov, avi, webm, mkv)'));
  }
});

const router = express.Router();

// Create logger for content API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-api.log' }),
  ],
});

/**
 * Convert storage file path to URL
 * Converts Windows and WSL paths to /storage/ URLs for frontend access
 * @param {string} filePath - Absolute file path
 * @returns {string} URL path like /storage/videos/tier1/final/video.mp4
 */
function storagePathToUrl(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Match the storage directory (after normalization to forward slashes)
  const storageMatch = normalizedPath.match(/\/?mnt\/[cC]\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/[A-Z]:\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/\/storage\/(.+)/);

  if (storageMatch) {
    const url = `/storage/${storageMatch[1]}`;
    logger.debug('Path converted to URL', { input: filePath, output: url });
    return url;
  }

  // If path is already under /storage, use as-is
  if (normalizedPath.startsWith('/storage/')) {
    return normalizedPath;
  }

  // Log warning if path couldn't be converted
  logger.warn('Could not convert path to URL', { input: filePath, normalized: normalizedPath });
  return filePath; // Return original if no pattern matched
}

/**
 * POST /api/content/generate
 * Run content generation job to select stories
 */
router.post('/generate', async (req, res) => {
  try {
    logger.info('Content generation triggered via API');

    const results = await contentGenerationJob.execute(req.body.options);

    if (!results) {
      return res.status(503).json({
        success: false,
        error: 'Job already running'
      });
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Content generation API error', {
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
 * GET /api/content/stories
 * Get a single story for content generation
 */
router.get('/stories', async (req, res) => {
  try {
    logger.info('Fetching story for content generation');

    const story = await contentGenerationJob.getSingleStory();

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'No stories found matching criteria'
      });
    }

    res.json({
      success: true,
      data: story
    });

  } catch (error) {
    logger.error('Get story API error', {
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
 * GET /api/content/stories/list
 * Get list of stories available for post creation
 * Query params: category, spiciness, limit
 */
router.get('/stories/list', async (req, res) => {
  try {
    const { category, spiciness, limit, search } = req.query;

    logger.info('Fetching stories list for post creation', {
      category: category || 'all',
      spiciness: spiciness || 'any',
      limit: limit || 20,
      search: search || 'none'
    });

    const result = await getStories({
      category,
      spiciness: spiciness ? parseInt(spiciness) : undefined,
      limit: limit ? parseInt(limit) : 50, // Get more to allow client-side filtering
      search
    });

    res.json({
      success: true,
      data: {
        count: result.count,
        stories: result.stories
      }
    });

  } catch (error) {
    logger.error('Get stories list API error', {
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
 * POST /api/content/verify
 * Verify story selection criteria
 */
router.post('/verify', async (req, res) => {
  try {
    const { storyId } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    logger.info('Verifying story selection', { storyId });

    const verification = await contentGenerationJob.verifySelection(storyId);

    res.json({
      success: true,
      data: verification
    });

  } catch (error) {
    logger.error('Verify story API error', {
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
 * GET /api/content/status
 * Get content generation job status
 */
router.get('/status', async (req, res) => {
  try {
    const status = contentGenerationJob.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get status API error', {
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
 * POST /api/content/posts/create
 * Create a new marketing post from the UI or Tina
 */
router.post('/posts/create', async (req, res) => {
  try {
    logger.info('Creating marketing post via API', { body: req.body });

    const {
      storyId,
      title,
      platforms,
      caption,
      hook,
      hashtags,
      contentType = 'video',
      contentTier = 'tier_1',
      tierParameters = {},
      preset = 'triple_visual',  // Extract preset from request
      voice = 'female_1',
      generateVideo = false,
      musicId = null,
      scheduleFor,
      // Tier 2 specific parameters
      avatarId,
      script
    } = req.body;

    // Validate required fields
    // storyId is required for tier_1, but optional for tier_2
    if (contentTier === 'tier_1' && !storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: storyId (required for tier_1 posts)'
      });
    }

    // For tier_2, if no storyId, title must be provided
    if (contentTier === 'tier_2' && !storyId && !req.body.title) {
      return res.status(400).json({
        success: false,
        error: 'For tier_2 posts, either storyId or title is required'
      });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: platforms (array)'
      });
    }

    // Log preset for debugging
    logger.info('Post creation with preset', { preset, contentTier });

    // Use the createPost function from postManagementTools
    const result = await createPost({
      storyId,
      title,
      platforms,
      caption,
      hook,
      hashtags,
      contentType,
      contentTier,
      tierParameters,
      preset,  // Pass preset through to createPost
      voice,
      generateVideo,
      musicId,
      scheduleFor,
      // Pass tier_2 specific parameters
      avatarId,
      script
    });

    logger.info('Marketing post(s) created', {
      created: result.created,
      videoGenerated: result.videoGenerated
    });

    // Broadcast SSE events for each created post
    if (result.posts && Array.isArray(result.posts)) {
      for (const postData of result.posts) {
        const fullPost = await MarketingPost.findById(postData.id);
        if (fullPost) {
          sseService.broadcastPostCreated(fullPost);
        }
      }
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Create marketing post API error', {
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
 * POST /api/content/schedule/start
 * Start scheduled content generation
 */
router.post('/schedule/start', (req, res) => {
  try {
    contentGenerationJob.startSchedule();

    logger.info('Content generation schedule started');

    res.json({
      success: true,
      message: 'Content generation schedule started'
    });

  } catch (error) {
    logger.error('Start schedule API error', {
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
 * POST /api/content/schedule/stop
 * Stop scheduled content generation
 */
router.post('/schedule/stop', (req, res) => {
  try {
    contentGenerationJob.stopSchedule();

    logger.info('Content generation schedule stopped');

    res.json({
      success: true,
      message: 'Content generation schedule stopped'
    });

  } catch (error) {
    logger.error('Stop schedule API error', {
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
 * GET /api/content/tone/:spiciness
 * Get content tone guidelines for a given spiciness level
 */
router.get('/tone/:spiciness', (req, res) => {
  try {
    const spiciness = parseInt(req.params.spiciness, 10);

    if (isNaN(spiciness) || spiciness < 0 || spiciness > 3) {
      return res.status(400).json({
        success: false,
        error: 'Spiciness must be a number between 0 and 3'
      });
    }

    const guidelines = contentGenerationJob.getContentToneGuidelines(spiciness);

    logger.info('Content tone guidelines requested', { spiciness });

    res.json({
      success: true,
      data: guidelines
    });

  } catch (error) {
    logger.error('Get tone guidelines API error', {
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
 * GET /api/content/hashtags
 * Generate appropriate hashtags based on spiciness and category
 */
router.get('/hashtags', (req, res) => {
  try {
    const { spiciness, category } = req.query;

    if (!spiciness) {
      return res.status(400).json({
        success: false,
        error: 'Spiciness parameter is required'
      });
    }

    const spicinessNum = parseInt(spiciness, 10);

    if (isNaN(spicinessNum) || spicinessNum < 0 || spicinessNum > 3) {
      return res.status(400).json({
        success: false,
        error: 'Spiciness must be a number between 0 and 3'
      });
    }

    const hashtags = contentGenerationJob.generateHashtags(spicinessNum, category || '');

    logger.info('Hashtags generated', {
      spiciness: spicinessNum,
      category: category || 'none',
      hashtagCount: hashtags.length
    });

    res.json({
      success: true,
      data: {
        spiciness: spicinessNum,
        category: category || null,
        hashtags,
        count: hashtags.length
      }
    });

  } catch (error) {
    logger.error('Generate hashtags API error', {
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
 * POST /api/content/hashtags/generate
 * Generate comprehensive hashtags based on story metadata
 */
router.post('/hashtags/generate', (req, res) => {
  try {
    const { story, options } = req.body;

    // Validate required fields
    if (!story) {
      return res.status(400).json({
        success: false,
        error: 'story object is required'
      });
    }

    if (!story.title) {
      return res.status(400).json({
        success: false,
        error: 'story.title is required'
      });
    }

    if (story.spiciness === undefined || story.spiciness === null) {
      return res.status(400).json({
        success: false,
        error: 'story.spiciness is required (0-3)'
      });
    }

    // Validate spiciness range
    if (story.spiciness < 0 || story.spiciness > 3) {
      return res.status(400).json({
        success: false,
        error: 'story.spiciness must be between 0 and 3'
      });
    }

    logger.info('Advanced hashtag generation requested', {
      storyTitle: story.title,
      category: story.category,
      spiciness: story.spiciness,
      options: options || {}
    });

    // Generate hashtags
    const result = hashtagGenerationService.generateHashtags(story, options);

    // Validate hashtags
    const validation = hashtagGenerationService.validateHashtags(result.hashtags);

    res.json({
      success: true,
      data: {
        ...result,
        validation
      }
    });

  } catch (error) {
    logger.error('Advanced hashtag generation API error', {
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
 * POST /api/content/hashtags/batch
 * Generate hashtags for multiple stories at once
 */
router.post('/hashtags/batch', (req, res) => {
  try {
    const { stories, options } = req.body;

    // Validate required fields
    if (!stories || !Array.isArray(stories)) {
      return res.status(400).json({
        success: false,
        error: 'stories array is required'
      });
    }

    if (stories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'stories array cannot be empty'
      });
    }

    if (stories.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'maximum 10 stories per batch request'
      });
    }

    logger.info('Batch hashtag generation requested', {
      storyCount: stories.length,
      options: options || {}
    });

    // Generate hashtags for each story
    const results = stories.map(story => {
      const result = hashtagGenerationService.generateHashtags(story, options);
      const validation = hashtagGenerationService.validateHashtags(result.hashtags);

      return {
        storyTitle: story.title,
        storyCategory: story.category,
        ...result,
        validation
      };
    });

    res.json({
      success: true,
      data: {
        count: results.length,
        results
      }
    });

  } catch (error) {
    logger.error('Batch hashtag generation API error', {
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
 * GET /api/content/hashtags/health
 * Health check for hashtag generation service
 */
router.get('/hashtags/health', (req, res) => {
  try {
    const health = hashtagGenerationService.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Hashtag health check API error', {
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
 * POST /api/content/caption/generate
 * Generate a caption for a story with brand voice
 */
router.post('/caption/generate', async (req, res) => {
  try {
    const { story, platform, options } = req.body;

    // Validate required fields
    if (!story) {
      return res.status(400).json({
        success: false,
        error: 'story object is required'
      });
    }

    if (!story.title) {
      return res.status(400).json({
        success: false,
        error: 'story.title is required'
      });
    }

    if (!story.category) {
      return res.status(400).json({
        success: false,
        error: 'story.category is required'
      });
    }

    if (story.spiciness === undefined || story.spiciness === null) {
      return res.status(400).json({
        success: false,
        error: 'story.spiciness is required (0-3)'
      });
    }

    // Validate spiciness range
    if (story.spiciness < 0 || story.spiciness > 3) {
      return res.status(400).json({
        success: false,
        error: 'story.spiciness must be between 0 and 3'
      });
    }

    // Validate platform
    const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];
    const selectedPlatform = platform || 'tiktok';

    if (!validPlatforms.includes(selectedPlatform)) {
      return res.status(400).json({
        success: false,
        error: `platform must be one of: ${validPlatforms.join(', ')}`
      });
    }

    logger.info('Caption generation requested', {
      storyTitle: story.title,
      category: story.category,
      spiciness: story.spiciness,
      platform: selectedPlatform
    });

    // Generate caption
    const result = await captionGenerationService.generateCaption(
      story,
      selectedPlatform,
      options || {}
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Caption generation API error', {
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
 * POST /api/content/caption/batch
 * Generate multiple captions for batch processing
 */
router.post('/caption/batch', async (req, res) => {
  try {
    const { stories, platform, options } = req.body;

    // Validate required fields
    if (!stories || !Array.isArray(stories)) {
      return res.status(400).json({
        success: false,
        error: 'stories array is required'
      });
    }

    if (stories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'stories array cannot be empty'
      });
    }

    if (stories.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 stories per batch request'
      });
    }

    const selectedPlatform = platform || 'tiktok';

    logger.info('Batch caption generation requested', {
      storyCount: stories.length,
      platform: selectedPlatform
    });

    // Generate captions in parallel
    const promises = stories.map(story =>
      captionGenerationService.generateCaption(story, selectedPlatform, options || {})
    );

    const results = await Promise.all(promises);

    res.json({
      success: true,
      data: {
        captions: results,
        count: results.length
      }
    });

  } catch (error) {
    logger.error('Batch caption generation API error', {
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
 * GET /api/content/caption/health
 * Check caption generation service health
 */
router.get('/caption/health', (req, res) => {
  try {
    const health = {
      service: 'caption-generation',
      status: 'ok',
      mockMode: captionGenerationService.isMockMode,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Caption health check error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content/tiktok/trending-audio
 * Get trending audio tracks for TikTok
 */
router.get('/tiktok/trending-audio', (req, res) => {
  try {
    const { limit, category } = req.query;

    logger.info('Trending audio requested', { limit, category });

    const result = tiktokOptimizationService.getTrendingAudio({
      limit: limit ? parseInt(limit, 10) : undefined,
      category
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Trending audio API error', {
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
 * POST /api/content/tiktok/validate-video
 * Validate video format for TikTok specs
 */
router.post('/tiktok/validate-video', (req, res) => {
  try {
    const { video } = req.body;

    if (!video) {
      return res.status(400).json({
        success: false,
        error: 'video object is required'
      });
    }

    logger.info('Video validation requested', {
      duration: video.duration,
      resolution: video.resolution,
      format: video.format
    });

    const result = tiktokOptimizationService.validateVideoFormat(video);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Video validation API error', {
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
 * POST /api/content/tiktok/optimize-caption
 * Optimize caption for TikTok audience
 */
router.post('/tiktok/optimize-caption', (req, res) => {
  try {
    const { caption, story, spiciness } = req.body;

    if (!caption) {
      return res.status(400).json({
        success: false,
        error: 'caption is required'
      });
    }

    if (spiciness === undefined || spiciness === null) {
      return res.status(400).json({
        success: false,
        error: 'spiciness is required (0-3)'
      });
    }

    if (spiciness < 0 || spiciness > 3) {
      return res.status(400).json({
        success: false,
        error: 'spiciness must be between 0 and 3'
      });
    }

    logger.info('Caption optimization requested', {
      captionLength: caption.length,
      story: story?.title,
      spiciness
    });

    const result = tiktokOptimizationService.optimizeCaption({
      caption,
      story,
      spiciness
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Caption optimization API error', {
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
 * GET /api/content/tiktok/hashtags
 * Get TikTok-specific hashtags
 */
router.get('/tiktok/hashtags', (req, res) => {
  try {
    const { count, category, spiciness } = req.query;

    if (spiciness === undefined || spiciness === null) {
      return res.status(400).json({
        success: false,
        error: 'spiciness is required (0-3)'
      });
    }

    const spicinessNum = parseInt(spiciness, 10);

    if (spicinessNum < 0 || spicinessNum > 3) {
      return res.status(400).json({
        success: false,
        error: 'spiciness must be between 0 and 3'
      });
    }

    logger.info('TikTok hashtags requested', {
      count,
      category,
      spiciness: spicinessNum
    });

    const result = tiktokOptimizationService.getTiktokHashtags({
      count: count ? parseInt(count, 10) : undefined,
      category: category || 'romance',
      spiciness: spicinessNum
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('TikTok hashtags API error', {
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
 * POST /api/content/tiktok/verify-aspect-ratio
 * Verify vertical 9:16 aspect ratio
 */
router.post('/tiktok/verify-aspect-ratio', (req, res) => {
  try {
    const { video } = req.body;

    if (!video) {
      return res.status(400).json({
        success: false,
        error: 'video object is required with width/height or aspectRatio'
      });
    }

    if (!video.width && !video.height && !video.aspectRatio) {
      return res.status(400).json({
        success: false,
        error: 'Must provide either width/height or aspectRatio'
      });
    }

    logger.info('Aspect ratio verification requested', {
      width: video.width,
      height: video.height,
      aspectRatio: video.aspectRatio
    });

    const result = tiktokOptimizationService.verifyAspectRatio(video);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Aspect ratio verification API error', {
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
 * POST /api/content/tiktok/optimize
 * Comprehensive TikTok content optimization
 * Combines all optimization steps
 */
router.post('/tiktok/optimize', (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content object is required'
      });
    }

    logger.info('Comprehensive TikTok optimization requested', {
      hasCaption: !!content.caption,
      hasVideo: !!content.video,
      hasStory: !!content.story
    });

    const result = tiktokOptimizationService.optimizeForTikTok(content);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('TikTok optimization API error', {
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
 * GET /api/content/tiktok/health
 * Health check for TikTok optimization service
 */
router.get('/tiktok/health', (req, res) => {
  try {
    const health = tiktokOptimizationService.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('TikTok health check error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// Instagram Optimization Endpoints
// ========================================

/**
 * GET /api/content/instagram/trending-audio
 * Get trending Instagram audio tracks for Reels
 */
router.get('/instagram/trending-audio', (req, res) => {
  try {
    const { limit = 5, category = 'all' } = req.query;

    logger.info('Instagram trending audio requested', { limit, category });

    const result = instagramOptimizationService.getTrendingAudio({
      limit: parseInt(limit),
      category
    });

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram trending audio error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/instagram/validate-video
 * Validate video format for Instagram Reels specs
 */
router.post('/instagram/validate-video', (req, res) => {
  try {
    const { video } = req.body;

    if (!video) {
      return res.status(400).json({
        success: false,
        error: 'Video data is required'
      });
    }

    logger.info('Instagram video validation requested', {
      duration: video.duration,
      resolution: video.resolution
    });

    const result = instagramOptimizationService.validateVideoFormat(video);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram video validation error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/instagram/optimize-caption
 * Optimize caption for Instagram audience
 */
router.post('/instagram/optimize-caption', (req, res) => {
  try {
    const { caption, story, spiciness = 1 } = req.body;

    if (!caption) {
      return res.status(400).json({
        success: false,
        error: 'Caption is required'
      });
    }

    logger.info('Instagram caption optimization requested', {
      captionLength: caption.length,
      story: story?.title,
      spiciness
    });

    const result = instagramOptimizationService.optimizeCaption({
      caption,
      story,
      spiciness
    });

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram caption optimization error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content/instagram/hashtags
 * Get Instagram-specific hashtags
 */
router.get('/instagram/hashtags', (req, res) => {
  try {
    const { count = 10, category = 'romance', spiciness = 1 } = req.query;

    logger.info('Instagram hashtags requested', { count, category, spiciness });

    const result = instagramOptimizationService.getInstagramHashtags({
      count: parseInt(count),
      category,
      spiciness: parseInt(spiciness)
    });

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram hashtags error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/instagram/verify-aspect-ratio
 * Verify 9:16 aspect ratio for Instagram Reels
 */
router.post('/instagram/verify-aspect-ratio', (req, res) => {
  try {
    const { video } = req.body;

    if (!video || (!video.aspectRatio && (!video.width || !video.height))) {
      return res.status(400).json({
        success: false,
        error: 'Video with aspectRatio or width/height is required'
      });
    }

    logger.info('Instagram aspect ratio verification requested', video);

    const result = instagramOptimizationService.verifyAspectRatio(video);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram aspect ratio verification error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/instagram/verify-duration
 * Verify video duration under 90 seconds for Instagram Reels
 */
router.post('/instagram/verify-duration', (req, res) => {
  try {
    const { video } = req.body;

    if (!video || !video.duration) {
      return res.status(400).json({
        success: false,
        error: 'Video with duration is required'
      });
    }

    logger.info('Instagram duration verification requested', { duration: video.duration });

    const result = instagramOptimizationService.verifyDuration(video);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram duration verification error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/instagram/optimize
 * Comprehensive Instagram Reels optimization
 * Combines all optimization steps
 */
router.post('/instagram/optimize', (req, res) => {
  try {
    const content = req.body;

    logger.info('Instagram comprehensive optimization requested', {
      story: content.story?.title,
      spiciness: content.spiciness
    });

    const result = instagramOptimizationService.optimizeForInstagram(content);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Instagram comprehensive optimization error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content/instagram/health
 * Health check for Instagram optimization service
 */
router.get('/instagram/health', (req, res) => {
  try {
    const health = instagramOptimizationService.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Instagram health check error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// YouTube Shorts Optimization Endpoints
// ========================================

/**
 * GET /api/content/youtube/trending-audio
 * Get trending YouTube audio tracks for Shorts
 */
router.get('/youtube/trending-audio', (req, res) => {
  try {
    const { limit = 5, category = 'all' } = req.query;

    logger.info('YouTube Shorts trending audio requested', { limit, category });

    const result = youtubeOptimizationService.getTrendingAudio({
      limit: parseInt(limit),
      category
    });

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('YouTube trending audio error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/youtube/validate-video
 * Validate video format for YouTube Shorts specs
 */
router.post('/youtube/validate-video', (req, res) => {
  try {
    const video = req.body;

    logger.info('YouTube video validation requested', {
      duration: video.duration,
      resolution: video.resolution
    });

    const result = youtubeOptimizationService.validateVideoFormat(video);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('YouTube video validation error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/youtube/optimize-title
 * Optimize title for YouTube Shorts
 */
router.post('/youtube/optimize-title', (req, res) => {
  try {
    const { title, story, spiciness } = req.body;

    logger.info('YouTube title optimization requested', {
      titleLength: title?.length,
      story: story?.title,
      spiciness
    });

    const result = youtubeOptimizationService.optimizeTitle({
      title,
      story,
      spiciness
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('YouTube title optimization error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/youtube/optimize-description
 * Optimize description for YouTube Shorts
 */
router.post('/youtube/optimize-description', (req, res) => {
  try {
    const { description, story, spiciness } = req.body;

    logger.info('YouTube description optimization requested', {
      descriptionLength: description?.length,
      story: story?.title,
      spiciness
    });

    const result = youtubeOptimizationService.optimizeDescription({
      description,
      story,
      spiciness
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('YouTube description optimization error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content/youtube/hashtags
 * Generate YouTube Shorts hashtags
 */
router.get('/youtube/hashtags', (req, res) => {
  try {
    const { category, spiciness = 1, limit = 5 } = req.query;

    logger.info('YouTube hashtag generation requested', {
      category,
      spiciness,
      limit
    });

    const result = youtubeOptimizationService.getYoutubeHashtags({
      category,
      spiciness: parseInt(spiciness),
      limit: parseInt(limit)
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('YouTube hashtag generation error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/youtube/verify-aspect-ratio
 * Verify aspect ratio for YouTube Shorts
 */
router.post('/youtube/verify-aspect-ratio', (req, res) => {
  try {
    const video = req.body;

    logger.info('YouTube aspect ratio verification requested', {
      width: video.width,
      height: video.height,
      aspectRatio: video.aspectRatio
    });

    const result = youtubeOptimizationService.verifyAspectRatio(video);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('YouTube aspect ratio verification error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content/youtube/optimize
 * Comprehensive YouTube Shorts optimization
 * Combines all optimization steps
 */
router.post('/youtube/optimize', (req, res) => {
  try {
    const content = req.body;

    logger.info('YouTube comprehensive optimization requested', {
      story: content.story?.title,
      spiciness: content.spiciness
    });

    const result = youtubeOptimizationService.optimizeForYoutube(content);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('YouTube comprehensive optimization error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content/youtube/health
 * Health check for YouTube optimization service
 */
router.get('/youtube/health', (req, res) => {
  try {
    const health = youtubeOptimizationService.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('YouTube health check error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// Content Batching Endpoints
// ========================================

/**
 * POST /api/content/batch/generate
 * Generate a batch of content posts (3-5 posts, 1-2 days ahead)
 */
router.post('/batch/generate', async (req, res) => {
  try {
    const { batchSize, daysAhead, platforms } = req.body;

    logger.info('Batch generation requested', {
      batchSize,
      daysAhead,
      platforms
    });

    const result = await contentBatchingService.generateBatch({
      batchSize,
      daysAhead,
      platforms
    });

    if (!result.success) {
      return res.status(503).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('Batch generation API error', {
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
 * GET /api/content/batch/upcoming
 * Get upcoming scheduled posts
 */
router.get('/batch/upcoming', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    logger.info('Fetching upcoming posts', { days });

    const posts = await contentBatchingService.getUpcomingPosts(parseInt(days));

    res.json({
      success: true,
      data: {
        count: posts.length,
        days: parseInt(days),
        posts: posts.map(post => ({
          id: post._id,
          title: post.title,
          platform: post.platform,
          status: post.status,
          scheduledAt: post.scheduledAt,
          storyName: post.storyName,
          storyCategory: post.storyCategory,
          storySpiciness: post.storySpiciness,
          caption: post.caption,
          hashtags: post.hashtags
        }))
      }
    });

  } catch (error) {
    logger.error('Get upcoming posts API error', {
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
 * GET /api/content/batch/range
 * Get posts scheduled within a date range
 */
router.get('/batch/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required (ISO 8601 format)'
      });
    }

    logger.info('Fetching posts in range', { startDate, endDate });

    const posts = await contentBatchingService.getScheduledInRange(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: {
        count: posts.length,
        startDate,
        endDate,
        posts: posts.map(post => ({
          id: post._id,
          title: post.title,
          platform: post.platform,
          status: post.status,
          scheduledAt: post.scheduledAt,
          storyName: post.storyName,
          storyCategory: post.storyCategory,
          storySpiciness: post.storySpiciness
        }))
      }
    });

  } catch (error) {
    logger.error('Get posts in range API error', {
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
 * GET /api/content/batch/status
 * Get batch generation service status
 */
router.get('/batch/status', (req, res) => {
  try {
    const status = contentBatchingService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get batch status API error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content/batch/health
 * Health check for batching service
 */
router.get('/batch/health', (req, res) => {
  try {
    const health = contentBatchingService.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Batch health check error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// Marketing Post Management Endpoints
// ========================================

/**
 * GET /api/content/posts/:id
 * Get a single marketing post by ID
 */
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Fetching marketing post', { id });

    const post = await MarketingPost.findById(id)
      .populate('storyId', 'title coverPath spiciness category tags');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Convert file paths to URLs for frontend access
    const postWithUrls = {
      ...post.toObject(),
      videoPath: storagePathToUrl(post.videoPath),
      imagePath: storagePathToUrl(post.imagePath),
      thumbnailPath: storagePathToUrl(post.thumbnailPath)
    };

    res.json({
      success: true,
      data: postWithUrls
    });

  } catch (error) {
    logger.error('Get marketing post API error', {
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
 * POST /api/content/posts/bulk/delete
 * Bulk delete marketing posts
 */
router.post('/posts/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk deleting marketing posts', { count: ids.length });

    const result = await MarketingPost.deleteMany({
      _id: { $in: ids }
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} posts`,
      data: {
        deletedCount: result.deletedCount,
        ids
      }
    });

  } catch (error) {
    logger.error('Bulk delete marketing posts API error', {
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
 * POST /api/content/posts/bulk/approve
 * Bulk approve marketing posts
 */
router.post('/posts/bulk/approve', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk approving marketing posts', { count: ids.length });

    const posts = await MarketingPost.find({
      _id: { $in: ids }
    });

    const updatePromises = posts.map(post => post.markAsApproved());
    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Successfully approved ${posts.length} posts`,
      data: {
        approvedCount: posts.length,
        ids
      }
    });

  } catch (error) {
    logger.error('Bulk approve marketing posts API error', {
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
 * POST /api/content/posts/bulk/export
 * Bulk export marketing posts data
 */
router.post('/posts/bulk/export', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk exporting marketing posts', { count: ids.length });

    const posts = await MarketingPost.find({
      _id: { $in: ids }
    }).populate('storyId', 'title coverPath spiciness category');

    // Format data for export
    const exportData = posts.map(post => ({
      id: post._id,
      title: post.title,
      description: post.description,
      platform: post.platform,
      status: post.status,
      contentType: post.contentType,
      caption: post.caption,
      hashtags: post.hashtags,
      hook: post.hook,
      storyName: post.storyName,
      storyCategory: post.storyCategory,
      storySpiciness: post.storySpiciness,
      scheduledAt: post.scheduledAt,
      postedAt: post.postedAt,
      performanceMetrics: post.performanceMetrics,
      videoPath: post.videoPath,
      imagePath: post.imagePath
    }));

    res.json({
      success: true,
      message: `Successfully exported ${exportData.length} posts`,
      data: {
        exportCount: exportData.length,
        posts: exportData
      }
    });

  } catch (error) {
    logger.error('Bulk export marketing posts API error', {
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
 * POST /api/content/posts/bulk/reject
 * Bulk reject marketing posts with optional reason
 */
router.post('/posts/bulk/reject', async (req, res) => {
  try {
    const { ids, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk rejecting marketing posts', { count: ids.length, reason });

    const posts = await MarketingPost.find({
      _id: { $in: ids }
    });

    const updatePromises = posts.map(post => {
      post.status = 'rejected';
      post.rejectedAt = new Date();
      post.rejectionReason = reason || 'Bulk rejected';
      return post.save();
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Successfully rejected ${posts.length} posts`,
      data: {
        rejectedCount: posts.length,
        ids,
        reason
      }
    });

  } catch (error) {
    logger.error('Bulk reject marketing posts API error', {
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
 * PUT /api/content/posts/:id
 * Update a marketing post (caption, hashtags, etc.)
 * For tier_2 posts: Allow editing caption, hashtags, script only before video is uploaded
 */
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, caption, hashtags, script, scheduledAt, platforms, ...otherUpdates } = req.body;

    logger.info('Updating marketing post', { id, updates: req.body });

    const post = await MarketingPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Update title (metadata, always allowed)
    if (title !== undefined) {
      post.title = title;
    }

    // Restrict content editing after approval
    const isCaptionOrScriptEdit = caption !== undefined || script !== undefined;
    const isHashtagEdit = hashtags !== undefined;
    const isApprovedOrLater = ['approved', 'scheduled', 'posting', 'posted', 'partial_posted'].includes(post.status);
    const isPostedOrLater = ['posting', 'posted', 'partial_posted'].includes(post.status);

    // Block caption/script editing for all approved+ posts
    if (isCaptionOrScriptEdit && isApprovedOrLater) {
      return res.status(400).json({
        success: false,
        error: `Cannot edit content (caption, script) when post is ${post.status}. Only hashtag and platform changes are allowed.`
      });
    }

    // Allow hashtag editing for approved/scheduled (but NOT posting/posted/partial_posted)
    if (isHashtagEdit && isPostedOrLater) {
      return res.status(400).json({
        success: false,
        error: `Cannot edit hashtags when post is ${post.status}. Hashtags are locked once posting begins.`
      });
    }

    // Handle tier_2 posts with special rules
    if (post.contentTier === 'tier_2') {
      // If video already exists, lock most fields
      if (post.videoPath) {
        // Allow updating scheduledAt AND platforms after video is uploaded
        const allowedUpdates = {};

        if (scheduledAt !== undefined) {
          // Validate date is valid - no 4-hour minimum for UI edits
          const newScheduledDate = new Date(scheduledAt);

          if (isNaN(newScheduledDate.getTime())) {
            return res.status(400).json({
              success: false,
              error: 'scheduledAt must be a valid ISO date'
            });
          }

          allowedUpdates.scheduledAt = newScheduledDate;
        }

        // CRITICAL FIX: Also allow platforms updates
        // Handle hashtags update (allowed for approved/scheduled posts even with video)
        if (hashtags !== undefined) {
          // Handle both array (legacy) and object (platform-specific) formats
          if (Array.isArray(hashtags)) {
            // Legacy array format - convert to platform-specific structure
            const platformKey = post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform;
            const normalizedHashtags = normalizeHashtagsForStorage(hashtags);
            allowedUpdates.hashtags = {
              tiktok: platformKey === 'tiktok' ? normalizedHashtags : (post.hashtags?.tiktok || []),
              instagram: platformKey === 'instagram' ? normalizedHashtags : (post.hashtags?.instagram || []),
              youtube_shorts: platformKey === 'youtube_shorts' ? normalizedHashtags : (post.hashtags?.youtube_shorts || [])
            };
          } else if (typeof hashtags === 'object' && hashtags !== null) {
            // Platform-specific object format - normalize each platform's hashtags
            allowedUpdates.hashtags = {
              tiktok: hashtags.tiktok ? normalizeHashtagsForStorage(hashtags.tiktok) : (post.hashtags?.tiktok || []),
              instagram: hashtags.instagram ? normalizeHashtagsForStorage(hashtags.instagram) : (post.hashtags?.instagram || []),
              youtube_shorts: hashtags.youtube_shorts ? normalizeHashtagsForStorage(hashtags.youtube_shorts) : (post.hashtags?.youtube_shorts || [])
            };
          } else {
            return res.status(400).json({
              success: false,
              error: 'hashtags must be an array or object'
            });
          }

          logger.info('Updated hashtags for post with video', {
            postId: post._id,
            hashtags: allowedUpdates.hashtags
          });
        }

        if (platforms !== undefined && Array.isArray(platforms) && platforms.length > 0) {
          // Validate platforms
          const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];
          const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));

          if (invalidPlatforms.length > 0) {
            return res.status(400).json({
              success: false,
              error: `Invalid platforms: ${invalidPlatforms.join(', ')}`
            });
          }

          // Prevent removing platforms that are already posted or posting
          if (post.platformStatus) {
            const currentPlatforms = post.platforms || [post.platform].filter(Boolean);
            const removedPlatforms = currentPlatforms.filter(p => !platforms.includes(p));

            for (const platform of removedPlatforms) {
              const platformStatus = post.platformStatus[platform]?.status;
              if (platformStatus === 'posted' || platformStatus === 'posting') {
                return res.status(400).json({
                  success: false,
                  error: `Cannot remove ${platform} - platform is ${platformStatus}`
                });
              }
            }
          }

          // Update platforms array
          allowedUpdates.platforms = platforms;

          // Update legacy platform field (first platform)
          allowedUpdates.platform = platforms[0];

          // Initialize platformStatus for any new platforms
          for (const platform of platforms) {
            if (!post.platformStatus) {
              post.platformStatus = {};
            }
            if (!post.platformStatus[platform]) {
              post.platformStatus[platform] = {
                status: 'pending',
                postedAt: null,
                mediaId: null,
                error: null,
                retryCount: 0
              };
            }
          }

          // Mark removed platforms as 'skipped' in platformStatus
          if (post.platformStatus) {
            for (const platform of validPlatforms) {
              if (post.platformStatus[platform] && !platforms.includes(platform)) {
                post.platformStatus[platform].status = 'skipped';
              }
            }
          }
        }

        if (Object.keys(allowedUpdates).length > 0) {
          Object.assign(post, allowedUpdates);
          await post.save();
        }

        return res.json({
          success: true,
          data: post
        });
      }

      // No video yet - allow editing caption, hashtags, script, platforms
      if (caption !== undefined) {
        post.caption = caption.trim();
      }

      // Handle platforms update
      if (platforms !== undefined) {
        if (Array.isArray(platforms) && platforms.length > 0) {
          // Validate platforms
          const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];
          const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));

          if (invalidPlatforms.length > 0) {
            return res.status(400).json({
              success: false,
              error: `Invalid platforms: ${invalidPlatforms.join(', ')}`
            });
          }

          // Prevent removing platforms that are already posted or posting
          if (post.platformStatus) {
            const currentPlatforms = post.platforms || [post.platform].filter(Boolean);
            const removedPlatforms = currentPlatforms.filter(p => !platforms.includes(p));

            for (const platform of removedPlatforms) {
              const platformStatus = post.platformStatus[platform]?.status;
              if (platformStatus === 'posted' || platformStatus === 'posting') {
                return res.status(400).json({
                  success: false,
                  error: `Cannot remove ${platform} - platform is ${platformStatus}`
                });
              }
            }
          }

          // Update platforms array
          post.platforms = platforms;

          // Update legacy platform field (first platform)
          post.platform = platforms[0];

          // Initialize platformStatus for any new platforms
          for (const platform of platforms) {
            if (!post.platformStatus) {
              post.platformStatus = {};
            }
            if (!post.platformStatus[platform]) {
              post.platformStatus[platform] = {
                status: 'pending',
                postedAt: null,
                mediaId: null,
                error: null,
                retryCount: 0
              };
            }
          }

          // Mark removed platforms as 'skipped' in platformStatus
          if (post.platformStatus) {
            for (const platform of validPlatforms) {
              if (post.platformStatus[platform] && !platforms.includes(platform)) {
                post.platformStatus[platform].status = 'skipped';
              }
            }
          }

          logger.info('Updated platforms for post', {
            postId: post._id,
            platforms
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'platforms must be a non-empty array'
          });
        }
      }

      if (hashtags !== undefined) {
        // Handle both array (legacy) and object (platform-specific) formats
        if (Array.isArray(hashtags)) {
          // Legacy array format - convert to platform-specific structure
          const platformKey = post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform;
          const normalizedHashtags = normalizeHashtagsForStorage(hashtags);
          post.hashtags = {
            tiktok: platformKey === 'tiktok' ? normalizedHashtags : (post.hashtags?.tiktok || []),
            instagram: platformKey === 'instagram' ? normalizedHashtags : (post.hashtags?.instagram || []),
            youtube_shorts: platformKey === 'youtube_shorts' ? normalizedHashtags : (post.hashtags?.youtube_shorts || [])
          };
        } else if (typeof hashtags === 'object' && hashtags !== null) {
          // Platform-specific object format - normalize each platform's hashtags
          post.hashtags = {
            tiktok: hashtags.tiktok ? normalizeHashtagsForStorage(hashtags.tiktok) : (post.hashtags?.tiktok || []),
            instagram: hashtags.instagram ? normalizeHashtagsForStorage(hashtags.instagram) : (post.hashtags?.instagram || []),
            youtube_shorts: hashtags.youtube_shorts ? normalizeHashtagsForStorage(hashtags.youtube_shorts) : (post.hashtags?.youtube_shorts || [])
          };
        } else {
          return res.status(400).json({
            success: false,
            error: 'hashtags must be an array or platform-specific object'
          });
        }
      }

      if (script !== undefined) {
        // Ensure tierParameters Map exists
        if (!post.tierParameters || typeof post.tierParameters.set !== 'function') {
          post.tierParameters = new Map();
        }
        post.tierParameters.set('script', script.trim());
        post.tierParameters.set('scriptPreview', script.trim().substring(0, 200));
      }

      if (scheduledAt !== undefined) {
        // Validate date is valid
        const newScheduledDate = new Date(scheduledAt);

        if (isNaN(newScheduledDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'scheduledAt must be a valid ISO date'
          });
        }

        // No 4-hour minimum for UI edits - user can schedule whenever they want
        post.scheduledAt = newScheduledDate;
      }

      await post.save();

      // Broadcast SSE event for updated post
      sseService.broadcastPostUpdated(post);

      return res.json({
        success: true,
        data: post
      });
    }

    // Handle tier_1 and other posts
    // Process caption
    if (caption !== undefined) {
      post.caption = caption.trim();
    }

    // Handle platforms update (for tier_1 and other posts)
    if (platforms !== undefined) {
      if (Array.isArray(platforms) && platforms.length > 0) {
        // Validate platforms
        const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];
        const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));

        if (invalidPlatforms.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid platforms: ${invalidPlatforms.join(', ')}`
          });
        }

        // Prevent removing platforms that are already posted or posting
        if (post.platformStatus) {
          const currentPlatforms = post.platforms || [post.platform].filter(Boolean);
          const removedPlatforms = currentPlatforms.filter(p => !platforms.includes(p));

          for (const platform of removedPlatforms) {
            const platformStatus = post.platformStatus[platform]?.status;
            if (platformStatus === 'posted' || platformStatus === 'posting') {
              return res.status(400).json({
                success: false,
                error: `Cannot remove ${platform} - platform is ${platformStatus}`
              });
            }
          }
        }

        // Update platforms array
        post.platforms = platforms;

        // Update legacy platform field (first platform)
        post.platform = platforms[0];

        // Initialize platformStatus for any new platforms
        for (const platform of platforms) {
          if (!post.platformStatus) {
            post.platformStatus = {};
          }
          if (!post.platformStatus[platform]) {
            post.platformStatus[platform] = {
              status: 'pending',
              postedAt: null,
              mediaId: null,
              error: null,
              retryCount: 0
            };
          }
        }

        // Mark removed platforms as 'skipped' in platformStatus
        if (post.platformStatus) {
          for (const platform of validPlatforms) {
            if (post.platformStatus[platform] && !platforms.includes(platform)) {
              post.platformStatus[platform].status = 'skipped';
            }
          }
        }

        logger.info('Updated platforms for post', {
          postId: post._id,
          platforms
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'platforms must be a non-empty array'
        });
      }
    }

    // Process hashtags - handle both array and platform-specific object formats
    if (hashtags !== undefined) {
      if (Array.isArray(hashtags)) {
        // Legacy array format - convert to platform-specific structure
        const platformKey = post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform;
        const normalizedHashtags = normalizeHashtagsForStorage(hashtags);
        post.hashtags = {
          tiktok: platformKey === 'tiktok' ? normalizedHashtags : (post.hashtags?.tiktok || []),
          instagram: platformKey === 'instagram' ? normalizedHashtags : (post.hashtags?.instagram || []),
          youtube_shorts: platformKey === 'youtube_shorts' ? normalizedHashtags : (post.hashtags?.youtube_shorts || [])
        };
      } else if (typeof hashtags === 'object' && hashtags !== null) {
        // Platform-specific object format - normalize each platform's hashtags
        post.hashtags = {
          tiktok: hashtags.tiktok ? normalizeHashtagsForStorage(hashtags.tiktok) : (post.hashtags?.tiktok || []),
          instagram: hashtags.instagram ? normalizeHashtagsForStorage(hashtags.instagram) : (post.hashtags?.instagram || []),
          youtube_shorts: hashtags.youtube_shorts ? normalizeHashtagsForStorage(hashtags.youtube_shorts) : (post.hashtags?.youtube_shorts || [])
        };
      }
    }

    // Process scheduledAt - this was missing for tier_1 posts!
    if (scheduledAt !== undefined) {
      const newScheduledDate = new Date(scheduledAt);

      if (isNaN(newScheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'scheduledAt must be a valid ISO date'
        });
      }

      post.scheduledAt = newScheduledDate;
    }

    // Apply other updates
    Object.assign(post, otherUpdates);

    await post.save();

    // Broadcast SSE event for updated post
    sseService.broadcastPostUpdated(post);

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Update marketing post API error', {
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
 * DELETE /api/content/posts/:id
 * Delete a marketing post
 */
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Deleting marketing post', { id });

    const post = await MarketingPost.findByIdAndDelete(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Broadcast SSE event for deleted post
    sseService.broadcastPostDeleted(id);

    res.json({
      success: true,
      message: 'Marketing post deleted successfully',
      data: { id }
    });

  } catch (error) {
    logger.error('Delete marketing post API error', {
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
 * POST /api/content/posts/:id/approve
 * Approve a marketing post for posting
 */
router.post('/posts/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Approving marketing post', { id });

    const post = await MarketingPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    const oldStatus = post.status;
    await post.markAsApproved();

    // Broadcast SSE event for status change
    sseService.broadcastPostStatusChanged(post, oldStatus);

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Approve marketing post API error', {
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
 * POST /api/content/posts/:id/duplicate
 * Duplicate a marketing post for regeneration
 */
router.post('/posts/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Duplicating marketing post', { id });

    const originalPost = await MarketingPost.findById(id);

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Create a copy of the post
    const duplicatedPost = new MarketingPost({
      title: `${originalPost.title} (Copy)`,
      description: originalPost.description,
      platform: originalPost.platform,
      status: 'draft', // Reset to draft for regeneration
      contentType: originalPost.contentType,
      videoPath: originalPost.videoPath,
      imagePath: originalPost.imagePath,
      caption: originalPost.caption,
      hashtags: originalPost.hashtags ? [...originalPost.hashtags] : [],
      scheduledAt: new Date(Date.now() + 86400000), // Schedule for tomorrow
      postedAt: null, // Reset posted date
      storyId: originalPost.storyId,
      storyName: originalPost.storyName,
      storyCategory: originalPost.storyCategory,
      storySpiciness: originalPost.storySpiciness,
      generatedAt: new Date(),
      approvedAt: null, // Reset approval
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      rejectionCategory: null,
      hook: originalPost.hook,
      feedback: null,
      regenerationCount: 0, // Reset regeneration count
      regenerationHistory: [],
      lastRegeneratedAt: null,
      performanceMetrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0
      },
      generationSource: 'duplicate'
    });

    await duplicatedPost.save();

    logger.info('Marketing post duplicated successfully', {
      originalId: id,
      newId: duplicatedPost._id
    });

    res.json({
      success: true,
      data: duplicatedPost,
      message: 'Post duplicated successfully'
    });

  } catch (error) {
    logger.error('Duplicate marketing post API error', {
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
 * POST /api/content/posts/:id/reject
 * Reject a marketing post with reason
 */
router.post('/posts/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    logger.info('Rejecting marketing post', { id, reason });

    const post = await MarketingPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    const oldStatus = post.status;
    await post.markAsRejected(reason);

    // Broadcast SSE event for status change
    sseService.broadcastPostStatusChanged(post, oldStatus);

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Reject marketing post API error', {
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
 * POST /api/content/posts/:id/schedule
 * Schedule a marketing post for a specific date
 */
router.post('/posts/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required (ISO 8601 format)'
      });
    }

    logger.info('Scheduling marketing post', { id, scheduledAt });

    const post = await MarketingPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    const oldStatus = post.status;
    await post.scheduleFor(new Date(scheduledAt));

    // Broadcast SSE event for status change
    sseService.broadcastPostStatusChanged(post, oldStatus);

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Schedule marketing post API error', {
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
 * GET /api/content/posts
 * Get marketing posts with filters
 */
router.get('/posts', async (req, res) => {
  try {
    const {
      platform,
      status,
      search,
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = req.query;

    logger.info('Fetching marketing posts with filters', {
      platform,
      status,
      search,
      startDate,
      endDate,
      limit,
      skip
    });

    // Build query
    const query = {};
    if (platform) {
      // Support both legacy platform field and new platforms array
      query.$or = [
        { platform: platform },
        { platforms: platform }
      ];
    }
    if (status) query.status = status;
    if (search) {
      const searchQuery = [
        { title: { $regex: search, $options: 'i' } },
        { storyName: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } }
      ];
      // If there's already a $or from platform filter, combine with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchQuery }
        ];
        delete query.$or;
      } else {
        query.$or = searchQuery;
      }
      logger.info('Search query built', { search, query });
    }
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    logger.info('MongoDB query', { query });

    // Use aggregation to properly sort posts by their "display date"
    // For multi-platform posts: use earliest platform postedAt or lastFailedAt
    // For single-platform posted posts: use postedAt
    // For non-posted posts: use scheduledAt
    // For posts with neither: use createdAt
    const aggregationPipeline = [
      { $match: query },
      {
        $addFields: {
          // Compute a sortDate field for proper sorting
          sortDate: {
            $cond: {
              if: { $eq: ['$status', 'posted'] },
              then: {
                $ifNull: [
                  '$postedAt',
                  // For multi-platform, try to get earliest platform postedAt
                  {
                    $min: [
                      { $ifNull: ['$platformStatus.tiktok.postedAt', null] },
                      { $ifNull: ['$platformStatus.instagram.postedAt', null] },
                      { $ifNull: ['$platformStatus.youtube_shorts.postedAt', null] },
                      // Also check failed attempts
                      { $ifNull: ['$platformStatus.tiktok.lastFailedAt', null] },
                      { $ifNull: ['$platformStatus.instagram.lastFailedAt', null] },
                      { $ifNull: ['$platformStatus.youtube_shorts.lastFailedAt', null] },
                    ]
                  },
                  '$scheduledAt',
                  '$createdAt'
                ]
              },
              else: {
                $ifNull: [
                  // For non-posted posts, also check platform failed attempts
                  {
                    $min: [
                      { $ifNull: ['$platformStatus.tiktok.lastFailedAt', null] },
                      { $ifNull: ['$platformStatus.instagram.lastFailedAt', null] },
                      { $ifNull: ['$platformStatus.youtube_shorts.lastFailedAt', null] },
                    ]
                  },
                  '$scheduledAt',
                  '$createdAt'
                ]
              }
            }
          }
        }
      },
      { $sort: { sortDate: -1, createdAt: -1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    ];

    const posts = await MarketingPost.aggregate(aggregationPipeline);

    // Manually populate storyId since aggregation doesn't support populate()
    const storyIds = posts.map(p => p.storyId).filter(id => id);
    let storiesMap = {};
    if (storyIds.length > 0) {
      const Story = (await import('../models/Story.js')).default;
      const stories = await Story.find({ _id: { $in: storyIds } })
        .select('title coverPath spiciness category tags');
      storiesMap = Object.fromEntries(stories.map(s => [s._id.toString(), s]));
    }

    // Attach story data to posts
    const postsWithStories = posts.map(post => ({
      ...post,
      story: post.storyId ? storiesMap[post.storyId.toString()] : null
    }));

    const total = await MarketingPost.countDocuments(query);

    // Convert file paths to URLs for frontend access
    const postsWithUrls = postsWithStories.map(post => {
      // For aggregation results, post is already a plain object
      const plainPost = post;

      // Explicitly convert tierParameters Map to plain object (if it's a Map)
      let tierParameters = plainPost.tierParameters;
      if (tierParameters instanceof Map) {
        tierParameters = Object.fromEntries(tierParameters);
      }

      return {
        ...plainPost,
        tierParameters,
        videoPath: storagePathToUrl(plainPost.videoPath),
        imagePath: storagePathToUrl(plainPost.imagePath),
        thumbnailPath: storagePathToUrl(plainPost.thumbnailPath)
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsWithUrls,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get marketing posts API error', {
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
 * POST /api/content/moderate
 * Run moderation check on content draft
 */
router.post('/moderate', async (req, res) => {
  try {
    const { caption, hashtags, hook, platform, story } = req.body;

    if (!caption || !platform) {
      return res.status(400).json({
        success: false,
        error: 'caption and platform are required'
      });
    }

    logger.info('Content moderation requested', {
      platform,
      hasCaption: !!caption,
      hasHashtags: hashtags?.length > 0,
      hasHook: !!hook
    });

    // Run moderation check
    const moderationResult = await contentModerationService.moderateContent({
      caption,
      hashtags: hashtags || [],
      hook,
      platform,
      story
    });

    res.json({
      success: true,
      data: moderationResult
    });

  } catch (error) {
    logger.error('Content moderation API error', {
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
 * GET /api/content/moderation/stats
 * Get moderation statistics
 */
router.get('/moderation/stats', (req, res) => {
  try {
    const stats = contentModerationService.getStatistics();

    logger.info('Moderation statistics requested');

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get moderation stats API error', {
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
 * DELETE /api/content/moderation/history
 * Clear moderation history
 */
router.delete('/moderation/history', (req, res) => {
  try {
    contentModerationService.clearHistory();

    logger.info('Moderation history cleared');

    res.json({
      success: true,
      message: 'Moderation history cleared'
    });

  } catch (error) {
    logger.error('Clear moderation history API error', {
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
 * POST /api/content/:id/regenerate
 * Regenerate content with user feedback
 */
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({
        success: false,
        error: 'feedback is required'
      });
    }

    logger.info('Content regeneration requested', {
      contentId: id,
      feedback: feedback.substring(0, 100)
    });

    // Find the content
    const content = await MarketingPost.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Store original values for comparison
    const originalCaption = content.caption;
    const originalHashtags = content.hashtags;
    const originalHook = content.hook;

    // Update content with regeneration tracking
    await content.regenerateWithFeedback(feedback);

    // Generate new content based on feedback
    const story = {
      _id: content.storyId,
      title: content.storyName,
      category: content.storyCategory,
      spiciness: content.storySpiciness
    };

    // Generate new hook with feedback consideration
    let newHook = originalHook;
    try {
      const hookResult = await hookGenerationService.generateHooks(story, {
        count: 1,
        feedback: feedback
      });
      newHook = hookResult.hooks && hookResult.hooks.length > 0
        ? hookResult.hooks[0].text
        : originalHook;
      logger.info('New hook generated', { hook: newHook.substring(0, 50) });
    } catch (error) {
      logger.warn('Hook generation failed, using original', { error: error.message });
    }

    // Generate new caption with feedback
    let newCaption;
    try {
      const captionResult = await captionGenerationService.generateCaption(
        story,
        content.platform,
        {
          includeCTA: true,
          includeHook: true,
          hook: newHook,
          feedback: feedback
        }
      );
      newCaption = captionResult.caption;
      logger.info('New caption generated', { captionLength: newCaption.length });
    } catch (error) {
      logger.warn('Caption generation failed', { error: error.message });
      newCaption = originalCaption;
    }

    // Generate new hashtags with feedback consideration
    let newHashtags;
    try {
      const hashtagResult = await hashtagGenerationService.generateHashtags(story, {
        platform: content.platform,
        feedback: feedback
      });
      newHashtags = hashtagResult.hashtags;
      logger.info('New hashtags generated', { count: newHashtags.length });
    } catch (error) {
      logger.warn('Hashtag generation failed, using original', { error: error.message });
      newHashtags = originalHashtags;
    }

    // Update content with regenerated values
    content.caption = newCaption;
    content.hashtags = newHashtags;
    content.hook = newHook;
    content.status = 'draft'; // Reset to draft for review
    content.generatedAt = new Date(); // Update generation timestamp

    await content.save();

    logger.info('Content regenerated successfully', {
      contentId: id,
      regenerationCount: content.regenerationCount,
      captionChanged: newCaption !== originalCaption,
      hashtagsChanged: JSON.stringify(newHashtags) !== JSON.stringify(originalHashtags)
    });

    // Broadcast SSE event for updated post
    sseService.broadcastPostUpdated(content);

    res.json({
      success: true,
      data: {
        id: content._id,
        caption: newCaption,
        hashtags: newHashtags,
        hook: newHook,
        regenerationCount: content.regenerationCount,
        status: content.status,
        changes: {
          captionChanged: newCaption !== originalCaption,
          hashtagsChanged: JSON.stringify(newHashtags) !== JSON.stringify(originalHashtags),
          hookChanged: newHook !== originalHook
        },
        previous: {
          caption: originalCaption,
          hashtags: originalHashtags,
          hook: originalHook
        }
      }
    });

  } catch (error) {
    logger.error('Content regeneration API error', {
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
 * GET /api/content/:id/regeneration-history
 * Get regeneration history for content
 */
router.get('/:id/regeneration-history', async (req, res) => {
  try {
    const { id } = req.params;

    const content = await MarketingPost.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: {
        regenerationCount: content.regenerationCount || 0,
        lastRegeneratedAt: content.lastRegeneratedAt,
        history: content.regenerationHistory || []
      }
    });

  } catch (error) {
    logger.error('Get regeneration history API error', {
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
 * POST /api/content/:id/fetch-metrics
 * Manually trigger metrics fetch for a post
 */
router.post('/:id/fetch-metrics', async (req, res) => {
  try {
    const { id } = req.params;

    const content = await MarketingPost.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Use performance metrics service to fetch latest metrics
    const performanceMetricsService = (await import('../services/performanceMetricsService.js')).default;
    const result = await performanceMetricsService.fetchPostMetrics(id);

    if (result.success) {
      const post = await MarketingPost.findById(id);

      // Save metrics to database for each platform
      const results = result.results || {};
      const platforms = Object.keys(results);

      for (const platform of platforms) {
        const metrics = results[platform];

        // Calculate engagement rate
        const engagementRate = metrics.views > 0
          ? ((metrics.likes + metrics.comments + (metrics.shares || 0)) / metrics.views) * 100
          : 0;

        // Update platform-specific metrics
        const platformField = platform === 'youtube_shorts' ? 'youtube_shorts' : platform;
        await MarketingPost.findByIdAndUpdate(id, {
          [`platformStatus.${platformField}.performanceMetrics.views`]: metrics.views || 0,
          [`platformStatus.${platformField}.performanceMetrics.likes`]: metrics.likes || 0,
          [`platformStatus.${platformField}.performanceMetrics.comments`]: metrics.comments || 0,
          [`platformStatus.${platformField}.performanceMetrics.shares`]: metrics.shares || 0,
          [`platformStatus.${platformField}.performanceMetrics.engagementRate`]: engagementRate,
          [`platformStatus.${platformField}.lastFetchedAt`]: new Date(),
        });
      }

      // Calculate and save aggregate metrics
      if (platforms.length > 0) {
        let aggregateViews = 0, aggregateLikes = 0, aggregateComments = 0, aggregateShares = 0;

        for (const platform of platforms) {
          aggregateViews += results[platform].views || 0;
          aggregateLikes += results[platform].likes || 0;
          aggregateComments += results[platform].comments || 0;
          aggregateShares += results[platform].shares || 0;
        }

        const aggregateEngagementRate = aggregateViews > 0
          ? ((aggregateLikes + aggregateComments + aggregateShares) / aggregateViews) * 100
          : 0;

        await MarketingPost.findByIdAndUpdate(id, {
          'performanceMetrics.views': aggregateViews,
          'performanceMetrics.likes': aggregateLikes,
          'performanceMetrics.comments': aggregateComments,
          'performanceMetrics.shares': aggregateShares,
          'performanceMetrics.engagementRate': aggregateEngagementRate,
          'metricsLastFetchedAt': new Date(),
        });
      }

      // Fetch updated post to return current metrics
      const updatedPost = await MarketingPost.findById(id);

      res.json({
        success: true,
        data: {
          message: 'Metrics fetched and saved successfully',
          results: result.results,
          aggregate: result.aggregate,
          performanceMetrics: updatedPost.performanceMetrics,
          platformStatus: updatedPost.platformStatus
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }

  } catch (error) {
    logger.error('Fetch metrics API error', {
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
 * GET /api/content/rejection-insights
 * Get rejection statistics and insights for AI learning
 */
router.get("/rejection-insights", async (req, res) => {
  try {
    logger.info('Fetching rejection insights');

    // Get all rejected posts
    const rejectedPosts = await MarketingPost.find({
      status: 'rejected'
    }).select('rejectionReason rejectionCategory rejectedAt storyCategory platform');

    // Analyze by category
    const categoryStats = {};
    rejectedPosts.forEach(post => {
      const category = post.rejectionCategory || 'other';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          reasons: [],
          recentRejections: []
        };
      }
      categoryStats[category].count++;

      // Add unique reasons
      if (post.rejectionReason && !categoryStats[category].reasons.includes(post.rejectionReason)) {
        categoryStats[category].reasons.push(post.rejectionReason);
      }

      // Add recent rejections
      categoryStats[category].recentRejections.push({
        reason: post.rejectionReason,
        date: post.rejectedAt,
        category: post.storyCategory,
        platform: post.platform
      });
    });

    // Calculate total rejections
    const totalRejections = rejectedPosts.length;

    // Sort categories by count
    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1].count - a[1].count)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    res.json({
      totalRejections,
      categoryBreakdown: sortedCategories,
      commonReasons: Object.values(sortedCategories).flatMap(cat => cat.reasons).slice(0, 10),
      lastUpdated: new Date()
    });

    logger.info('Rejection insights retrieved', {
      totalRejections,
      categories: Object.keys(sortedCategories).length
    });
  } catch (error) {
    logger.error('Error fetching rejection insights:', error);
    res.status(500).json({
      error: 'Failed to fetch rejection insights',
      details: error.message
    });
  }
});

// ========================================
// Scheduled Posting Endpoints
// ========================================

/**
 * POST /api/content/scheduler/start
 * Start the scheduled posting job
 */
router.post('/scheduler/start', (req, res) => {
  try {
    logger.info('Starting scheduled posting job');

    postingSchedulerJob.start();

    res.json({
      success: true,
      message: 'Scheduled posting job started'
    });

  } catch (error) {
    logger.error('Start scheduler API error', {
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
 * POST /api/content/scheduler/stop
 * Stop the scheduled posting job
 */
router.post('/scheduler/stop', (req, res) => {
  try {
    logger.info('Stopping scheduled posting job');

    postingSchedulerJob.stop();

    res.json({
      success: true,
      message: 'Scheduled posting job stopped'
    });

  } catch (error) {
    logger.error('Stop scheduler API error', {
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
 * GET /api/content/scheduler/status
 * Get the status of the scheduled posting job
 */
router.get('/scheduler/status', (req, res) => {
  try {
    const status = postingSchedulerJob.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get scheduler status API error', {
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
 * POST /api/content/scheduler/trigger
 * Manually trigger the scheduled posting job (for testing)
 */
router.post('/scheduler/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering scheduled posting job');

    await postingSchedulerJob.trigger();

    res.json({
      success: true,
      message: 'Scheduled posting job triggered'
    });

  } catch (error) {
    logger.error('Trigger scheduler API error', {
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
 * GET /api/content/scheduled
 * Get all scheduled posts
 */
router.get('/scheduled', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    logger.info('Fetching scheduled posts', { limit, skip });

    const posts = await MarketingPost.find({
      status: 'scheduled'
    })
      .populate('storyId', 'title coverPath spiciness category')
      .sort({ scheduledAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await MarketingPost.countDocuments({
      status: 'scheduled'
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get scheduled posts API error', {
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
 * GET /api/content/scheduled/due
 * Get posts that are due to be posted (scheduledAt <= now)
 */
router.get('/scheduled/due', async (req, res) => {
  try {
    logger.info('Fetching due scheduled posts');

    const posts = await MarketingPost.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() }
    })
      .populate('storyId', 'title coverPath spiciness category')
      .sort({ scheduledAt: 1 });

    res.json({
      success: true,
      data: {
        count: posts.length,
        posts
      }
    });

  } catch (error) {
    logger.error('Get due scheduled posts API error', {
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
 * GET /api/content/posts/:id/export
 * Export post content for manual posting
 * Returns JSON with video path, caption, hashtags, and posting instructions
 */
router.get('/posts/:id/export', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Exporting post for manual posting', { id });

    const post = await MarketingPost.findById(id)
      .populate('storyId', 'title coverPath spiciness category tags');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Generate platform-specific posting instructions
    const instructions = {
      tiktok: {
        title: 'How to Manually Post to TikTok',
        steps: [
          '1. Open the TikTok app on your phone',
          '2. Tap the + button to create a new post',
          '3. Upload the video from the bundle',
          '4. Copy and paste the caption from the text file',
          '5. Add the hashtags from the text file',
          '6. Set appropriate visibility settings (Public)',
          '7. Tap "Post" to publish',
          '8. Come back to this app and click "Mark as Manually Posted"'
        ]
      },
      instagram: {
        title: 'How to Manually Post to Instagram Reels',
        steps: [
          '1. Open the Instagram app on your phone',
          '2. Tap the + button and select "Reel"',
          '3. Upload the video from the bundle',
          '4. Copy and paste the caption from the text file',
          '5. Add the hashtags from the text file',
          '6. Tag the @blush.app account',
          '7. Set appropriate visibility settings (Public)',
          '8. Tap "Share" to publish',
          '9. Come back to this app and click "Mark as Manually Posted"'
        ]
      },
      youtube_shorts: {
        title: 'How to Manually Post to YouTube Shorts',
        steps: [
          '1. Open the YouTube app on your phone',
          '2. Tap the + button and select "Create a Short"',
          '3. Upload the video from the bundle',
          '4. Copy and paste the caption from the text file',
          '5. Add the hashtags from the text file to the description',
          '6. Set appropriate visibility settings (Public)',
          '7. Tap "Upload Short" to publish',
          '8. Come back to this app and click "Mark as Manually Posted"'
        ]
      }
    };

    const platformInstructions = instructions[post.platform] || instructions.tiktok;

    res.json({
      success: true,
      data: {
        post: {
          id: post._id,
          title: post.title,
          platform: post.platform,
          videoPath: post.videoPath,
          caption: post.caption,
          hashtags: post.hashtags,
          storyName: post.storyName,
          storyCategory: post.storyCategory
        },
        bundle: {
          videoFile: post.videoPath ? post.videoPath.split('/').pop() : null,
          captionText: `${post.caption}\n\n${post.hashtags.join(' ')}`,
          platform: post.platform
        },
        instructions: platformInstructions,
        downloadUrl: `/api/content/posts/${id}/download`
      }
    });

  } catch (error) {
    logger.error('Export post API error', {
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
 * POST /api/content/posts/:id/manual-posted
 * Mark a post as manually posted
 */
router.post('/posts/:id/manual-posted', async (req, res) => {
  try {
    const { id } = req.params;
    const { postedUrl, notes } = req.body;

    logger.info('Marking post as manually posted', { id, postedUrl });

    const post = await MarketingPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Update post status and metadata
    post.status = 'posted';
    post.postedAt = new Date();

    if (postedUrl) {
      post.postedUrl = postedUrl;
    }

    if (notes) {
      post.notes = notes;
    }

    // Add to posting history if it doesn't exist
    if (!post.postingHistory) {
      post.postingHistory = [];
    }

    post.postingHistory.push({
      status: 'posted',
      timestamp: new Date(),
      method: 'manual',
      notes: notes || 'Manually posted by user'
    });

    await post.save();

    logger.info('Post marked as manually posted', {
      id,
      platform: post.platform,
      postedUrl: postedUrl || 'not provided'
    });

    res.json({
      success: true,
      data: {
        post,
        message: 'Post marked as manually posted successfully'
      }
    });

  } catch (error) {
    logger.error('Mark manual posted API error', {
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
 * POST /api/content/batch/schedule/start
 * Start the scheduled batch generation job
 */
router.post('/batch/schedule/start', async (req, res) => {
  try {
    logger.info('Starting batch generation scheduler via API');

    batchGenerationScheduler.start({
      scheduleTime: req.body.scheduleTime,
      timezone: req.body.timezone,
      runImmediately: req.body.runImmediately || false
    });

    const status = batchGenerationScheduler.getStatus();

    res.json({
      success: true,
      data: {
        message: 'Batch generation scheduler started successfully',
        status
      }
    });

  } catch (error) {
    logger.error('Start batch scheduler API error', {
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
 * POST /api/content/batch/schedule/stop
 * Stop the scheduled batch generation job
 */
router.post('/batch/schedule/stop', async (req, res) => {
  try {
    logger.info('Stopping batch generation scheduler via API');

    batchGenerationScheduler.stop();

    const status = batchGenerationScheduler.getStatus();

    res.json({
      success: true,
      data: {
        message: 'Batch generation scheduler stopped successfully',
        status
      }
    });

  } catch (error) {
    logger.error('Stop batch scheduler API error', {
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
 * POST /api/content/batch/schedule/trigger
 * Manually trigger batch generation (for testing or on-demand)
 */
router.post('/batch/schedule/trigger', async (req, res) => {
  try {
    logger.info('Manual batch generation triggered via API', { options: req.body });

    const results = await batchGenerationScheduler.trigger(req.body.options);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Manual batch generation API error', {
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
 * GET /api/content/batch/schedule/status
 * Get the status of the batch generation scheduler
 */
router.get('/batch/schedule/status', async (req, res) => {
  try {
    const status = batchGenerationScheduler.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Batch scheduler status API error', {
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
 * POST /api/content/posts/bulk/delete
 * Bulk delete marketing posts
 */
router.post('/posts/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk deleting marketing posts', { count: ids.length });

    const result = await MarketingPost.deleteMany({
      _id: { $in: ids }
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} posts`,
      data: {
        deletedCount: result.deletedCount,
        ids
      }
    });

  } catch (error) {
    logger.error('Bulk delete marketing posts API error', {
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
 * POST /api/content/posts/bulk/approve
 * Bulk approve marketing posts
 */
router.post('/posts/bulk/approve', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk approving marketing posts', { count: ids.length });

    const posts = await MarketingPost.find({
      _id: { $in: ids }
    });

    const updatePromises = posts.map(post => post.markAsApproved());
    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Successfully approved ${posts.length} posts`,
      data: {
        approvedCount: posts.length,
        ids
      }
    });

  } catch (error) {
    logger.error('Bulk approve marketing posts API error', {
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
 * POST /api/content/posts/bulk/export
 * Bulk export marketing posts data
 */
router.post('/posts/bulk/export', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk exporting marketing posts', { count: ids.length });

    const posts = await MarketingPost.find({
      _id: { $in: ids }
    }).populate('storyId', 'title coverPath spiciness category');

    // Format data for export
    const exportData = posts.map(post => ({
      id: post._id,
      title: post.title,
      description: post.description,
      platform: post.platform,
      status: post.status,
      contentType: post.contentType,
      caption: post.caption,
      hashtags: post.hashtags,
      hook: post.hook,
      storyName: post.storyName,
      storyCategory: post.storyCategory,
      storySpiciness: post.storySpiciness,
      scheduledAt: post.scheduledAt,
      postedAt: post.postedAt,
      performanceMetrics: post.performanceMetrics,
      videoPath: post.videoPath,
      imagePath: post.imagePath
    }));

    res.json({
      success: true,
      message: `Successfully exported ${exportData.length} posts`,
      data: {
        exportCount: exportData.length,
        posts: exportData
      }
    });

  } catch (error) {
    logger.error('Bulk export marketing posts API error', {
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
 * POST /api/content/posts/bulk/reject
 * Bulk reject marketing posts with optional reason
 */
router.post('/posts/bulk/reject', async (req, res) => {
  try {
    const { ids, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }

    logger.info('Bulk rejecting marketing posts', { count: ids.length, reason });

    const posts = await MarketingPost.find({
      _id: { $in: ids }
    });

    const updatePromises = posts.map(post => {
      post.status = 'rejected';
      post.rejectedAt = new Date();
      post.rejectionReason = reason || 'Bulk rejected';
      return post.save();
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Successfully rejected ${posts.length} posts`,
      data: {
        rejectedCount: posts.length,
        ids,
        reason
      }
    });

  } catch (error) {
    logger.error('Bulk reject marketing posts API error', {
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
 * POST /api/content/posts/create-tier2
 * Create a new tier_2 marketing post (AI-Avatar video)
 */
router.post('/posts/create-tier2', async (req, res) => {
  try {
    const {
      storyId,
      platform,
      caption,
      hashtags,
      scheduledAt,
      avatarId,
      script
    } = req.body;

    // Validate required fields
    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'platform is required'
      });
    }

    const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `platform must be one of: ${validPlatforms.join(', ')}`
      });
    }

    if (!caption || caption.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'caption is required'
      });
    }

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'hashtags is required and must be an array'
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required'
      });
    }

    // Validate scheduledAt is at least 4 hours in the future
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt must be a valid ISO date'
      });
    }

    if (scheduledDate < minScheduleTime) {
      return res.status(400).json({
        success: false,
        error: `scheduledAt must be at least 4 hours in the future. Current time: ${now.toISOString()}, Minimum: ${minScheduleTime.toISOString()}`
      });
    }

    if (!avatarId) {
      return res.status(400).json({
        success: false,
        error: 'avatarId is required for tier_2 posts'
      });
    }

    if (!script || script.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'script is required for tier_2 posts'
      });
    }

    logger.info('Creating tier_2 marketing post', {
      storyId,
      platform,
      avatarId,
      scriptLength: script.length
    });

    // Fetch and validate avatar
    const avatar = await AIAvatar.findById(avatarId);
    if (!avatar) {
      return res.status(400).json({
        success: false,
        error: 'Avatar not found'
      });
    }

    if (!avatar.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Avatar is not active'
      });
    }

    // Fetch and validate story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(400).json({
        success: false,
        error: 'Story not found'
      });
    }

    // Create tier_2 post with draft status (no video yet)
    const post = new MarketingPost({
      title: `${story.title} - Tier 2`,
      description: `AI Avatar video featuring ${avatar.name}`,
      platform,
      status: 'draft', // Draft until video is uploaded
      contentType: 'video',
      contentTier: 'tier_2',
      caption: caption.trim(),
      hashtags: normalizeHashtagsForStorage(hashtags),
      scheduledAt: scheduledDate,
      videoPath: null, // No video yet
      thumbnailPath: null,
      storyId,
      storyName: story.title,
      storyCategory: story.category,
      storySpiciness: story.spiciness || 0,
      // Store tier-specific parameters
      tierParameters: new Map([
        ['avatarId', avatarId],
        ['avatarName', avatar.name],
        ['script', script.trim()],
        ['scriptPreview', script.trim().substring(0, 200)]
      ]),
      // Generation metadata for tier_2
      generationMetadata: {
        tier: 'tier_2',
        imageModel: 'heygen_avatar',
        videoModel: 'manual_upload'
      }
    });

    await post.save();

    // Increment avatar usage count
    await avatar.incrementUsage();

    logger.info('Tier_2 marketing post created', {
      postId: post._id,
      storyId,
      avatarId
    });

    res.status(201).json({
      success: true,
      data: {
        id: post._id,
        title: post.title,
        platform: post.platform,
        status: post.status,
        contentTier: post.contentTier,
        caption: post.caption,
        hashtags: post.hashtags,
        scheduledAt: post.scheduledAt,
        storyId: post.storyId,
        storyName: post.storyName,
        tierParameters: Object.fromEntries(post.tierParameters),
        createdAt: post.createdAt
      }
    });

  } catch (error) {
    logger.error('Create tier_2 marketing post API error', {
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
 * POST /api/content/posts/:id/upload-tier2-video
 * Upload a manually generated video for a tier_2 post
 */
router.post('/posts/:id/upload-tier2-video', videoUpload.single('video'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    logger.info('Uploading tier_2 video', {
      postId: id,
      filename: req.file.originalname,
      size: req.file.size
    });

    // Fetch post
    const post = await MarketingPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

    // Verify it's a tier_2 post
    if (post.contentTier !== 'tier_2') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for tier_2 posts'
      });
    }

    // Verify video doesn't already exist
    if (post.videoPath) {
      return res.status(400).json({
        success: false,
        error: 'Video already uploaded for this post'
      });
    }

    // Ensure tier2 video directory exists
    const tier2Dir = storageService.directories.tier2Videos;
    await fs.mkdir(tier2Dir, { recursive: true });

    // Generate filename
    const filename = `tier2-${post._id}-${Date.now()}.mp4`;
    const videoPath = path.join(tier2Dir, filename);

    // Save video file
    await fs.writeFile(videoPath, req.file.buffer);

    logger.info('Video saved to storage', {
      postId: id,
      videoPath
    });

    // Generate thumbnail
    const thumbnailFilename = `tier2-${post._id}-${Date.now()}-thumb.jpg`;
    const thumbnailPath = path.join(storageService.directories.thumbnails, thumbnailFilename);

    try {
      await ffmpegWrapper.extractThumbnail(videoPath, thumbnailPath, {
        timestamp: 1,
        width: 320,
        height: -1
      });
      logger.info('Thumbnail generated', {
        postId: id,
        thumbnailPath
      });
    } catch (thumbError) {
      logger.warn('Failed to generate thumbnail', {
        error: thumbError.message
      });
      // Continue without thumbnail
    }

    // Convert to URL paths for storage (consistent with tier_1 videos)
    const videoUrl = `/storage/videos/tier2/final/${filename}`;
    const thumbnailUrl = thumbnailPath ? `/storage/thumbnails/${thumbnailFilename}` : null;

    // Update post - store URL paths for frontend
    post.videoPath = videoUrl;
    post.thumbnailPath = thumbnailUrl;
    post.status = 'ready'; // Ready for approval
    await post.save();

    // Broadcast SSE event for post update (video uploaded)
    sseService.broadcastPostUpdated(post);

    logger.info('Tier_2 video uploaded successfully', {
      postId: id,
      videoPath: post.videoPath,
      thumbnailPath: post.thumbnailPath
    });

    res.json({
      success: true,
      data: {
        id: post._id,
        videoPath: post.videoPath,
        videoUrl: post.videoPath,
        thumbnailPath: post.thumbnailPath,
        thumbnailUrl: post.thumbnailPath,
        status: post.status
      }
    });

  } catch (error) {
    logger.error('Upload tier_2 video API error', {
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
 * GET /api/content/posts/tier2/pending
 * Get tier_2 posts that are pending video upload
 */
router.get('/posts/tier2/pending', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    logger.info('Fetching tier_2 posts pending video upload');

    const posts = await MarketingPost.find({
      contentTier: 'tier_2',
      status: 'draft',
      videoPath: null
    })
    .sort({ scheduledAt: 1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        count: posts.length,
        posts: posts.map(post => ({
          id: post._id,
          title: post.title,
          platform: post.platform,
          status: post.status,
          caption: post.caption,
          hashtags: post.hashtags,
          scheduledAt: post.scheduledAt,
          tierParameters: Object.fromEntries(post.tierParameters),
          storyId: post.storyId,
          storyName: post.storyName,
          createdAt: post.createdAt
        }))
      }
    });

  } catch (error) {
    logger.error('Get tier_2 pending posts API error', {
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
 * POST /api/content/sync-metrics
 * Manually trigger the content metrics sync job
 */
router.post('/sync-metrics', async (req, res) => {
  try {
    logger.info('Manual trigger of content metrics sync');

    const contentMetricsSyncJob = (await import('../jobs/contentMetricsSyncJob.js')).default;
    const result = await contentMetricsSyncJob.execute();

    res.json({
      success: true,
      message: 'Content metrics sync completed',
      data: result
    });
  } catch (error) {
    logger.error('Failed to trigger content metrics sync', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
