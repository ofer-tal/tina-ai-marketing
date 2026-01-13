import express from 'express';
import imageGenerationService from '../services/imageGenerationService.js';
import Story from '../models/Story.js';
import winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'image-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/image-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/image-api.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

const router = express.Router();

/**
 * POST /api/image/generate/cover
 * Generate cover art image from story prompt
 *
 * Request body:
 * {
 *   "storyId": "story_id", // Optional - if provided, will fetch coverPrompt from story
 *   "prompt": "A romantic scene...", // Optional - overrides story prompt
 *   "spiciness": 1,
 *   "category": "Billionaire",
 *   "width": 1080, // Optional - default 1080
 *   "height": 1920 // Optional - default 1920
 * }
 */
router.post('/generate/cover', async (req, res) => {
  const startTime = Date.now();

  logger.info('Cover art generation request received', {
    body: { ...req.body, prompt: req.body.prompt?.substring(0, 50) }
  });

  try {
    const { storyId, prompt, spiciness, category, width, height } = req.body;

    let finalPrompt = prompt;
    let finalSpiciness = spiciness || 0;
    let finalCategory = category || '';

    // If storyId is provided, fetch the story to get coverPrompt
    if (storyId) {
      logger.info('Fetching story for cover art generation', { storyId });

      const story = await Story.findById(storyId).lean();
      if (!story) {
        return res.status(404).json({
          success: false,
          error: 'Story not found'
        });
      }

      // Use story's coverPrompt if prompt not explicitly provided
      if (!finalPrompt && story.coverPrompt) {
        finalPrompt = story.coverPrompt;
      }

      // Use story's spiciness and category if not provided
      if (spiciness === undefined) {
        finalSpiciness = story.spiciness || 0;
      }
      if (!finalCategory) {
        finalCategory = story.category || '';
      }

      logger.info('Using story data for generation', {
        title: story.title,
        hasCoverPrompt: !!story.coverPrompt,
        spiciness: finalSpiciness,
        category: finalCategory
      });
    }

    // Validate prompt
    if (!finalPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing prompt - either provide prompt or storyId with coverPrompt'
      });
    }

    // Validate width
    if (width && (width < 480 || width > 2160)) {
      return res.status(400).json({
        success: false,
        error: 'Width must be between 480 and 2160 pixels'
      });
    }

    // Validate height
    if (height && (height < 480 || height > 2160)) {
      return res.status(400).json({
        success: false,
        error: 'Height must be between 480 and 2160 pixels'
      });
    }

    // Validate spiciness
    if (finalSpiciness < 0 || finalSpiciness > 3) {
      return res.status(400).json({
        success: false,
        error: 'Spiciness must be between 0 and 3'
      });
    }

    // Generate cover art
    const result = await imageGenerationService.generateCoverArt({
      prompt: finalPrompt,
      spiciness: finalSpiciness,
      category: finalCategory,
      width: width || 1080,
      height: height || 1920
    });

    const duration_ms = Date.now() - startTime;

    logger.info('Cover art generation completed', {
      duration: `${duration_ms}ms`,
      success: result.success,
      mock: result.mock || false
    });

    res.json({
      success: true,
      data: result,
      meta: {
        duration_ms,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration_ms = Date.now() - startTime;

    logger.error('Cover art generation failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration_ms}ms`
    });

    res.status(500).json({
      success: false,
      error: error.message,
      meta: {
        duration_ms,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/image/status
 * Get image generation service status
 */
router.get('/status', (req, res) => {
  const status = imageGenerationService.getStatus();

  logger.info('Service status requested', status);

  res.json({
    success: true,
    data: status
  });
});

/**
 * GET /api/image/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const health = await imageGenerationService.healthCheck().catch(() => ({
    healthy: false,
    reason: 'error'
  }));

  res.json({
    success: true,
    service: 'image-generation',
    status: health.healthy ? 'healthy' : 'unhealthy',
    ...health,
    timestamp: new Date().toISOString()
  });
});

export default router;
