import express from 'express';
import winston from 'winston';
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
 * POST /api/content/posts/create
 * Create a new marketing post (for testing purposes)
 */
router.post('/posts/create', async (req, res) => {
  try {
    logger.info('Creating marketing post via API', { body: req.body });

    const {
      title,
      description,
      platform,
      contentType,
      status = 'draft',
      caption,
      hashtags,
      scheduledAt,
      storyId,
      storyName,
      storyCategory,
      storySpiciness,
      generatedAt,
      generationSource,
      imagePath
    } = req.body;

    // Validate required fields
    if (!platform || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: platform, contentType'
      });
    }

    // Create the post
    const post = new MarketingPost({
      title: title || 'Test Post',
      description,
      platform,
      contentType,
      status,
      caption: caption || '',
      hashtags: hashtags || [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 86400000),
      storyId: storyId || '000000000000000000000001',
      storyName: storyName || 'Test Story',
      storyCategory: storyCategory || 'Contemporary',
      storySpiciness: storySpiciness || 1,
      imagePath,
      generatedAt: generatedAt ? new Date(generatedAt) : new Date(),
      generationSource: generationSource || 'api'
    });

    await post.save();

    logger.info('Marketing post created', { id: post._id, status });

    res.json({
      success: true,
      data: post
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

    res.json({
      success: true,
      data: post
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
 * PUT /api/content/posts/:id
 * Update a marketing post (caption, hashtags, etc.)
 */
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating marketing post', { id, updates });

    const post = await MarketingPost.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found'
      });
    }

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

    await post.markAsApproved();

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

    await post.markAsRejected(reason);

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

    await post.scheduleFor(new Date(scheduledAt));

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
    if (platform) query.platform = platform;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { storyName: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } }
      ];
      logger.info('Search query built', { search, query });
    }
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    logger.info('MongoDB query', { query });

    const posts = await MarketingPost.find(query)
      .populate('storyId', 'title coverPath spiciness category')
      .sort({ scheduledAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await MarketingPost.countDocuments(query);

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

export default router;
