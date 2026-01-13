import express from 'express';
import winston from 'winston';
import contentGenerationJob from '../jobs/contentGeneration.js';
import captionGenerationService from '../services/captionGenerationService.js';
import hashtagGenerationService from '../services/hashtagGenerationService.js';
import tiktokOptimizationService from '../services/tiktokOptimizationService.js';
import instagramOptimizationService from '../services/instagramOptimizationService.js';
import youtubeOptimizationService from '../services/youtubeOptimizationService.js';

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

export default router;
