import express from 'express';
import winston from 'winston';
import contentGenerationJob from '../jobs/contentGeneration.js';

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

export default router;
