import express from 'express';
import winston from 'winston';
import hookGenerationService from '../services/hookGenerationService.js';
import Story from '../models/Story.js';

const router = express.Router();

// Create logger for hooks API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hooks-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/hooks-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/hooks-api.log' }),
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

/**
 * POST /api/hooks/generate
 * Generate text hooks for a story
 *
 * Request body:
 * - storyId: string (required) - Story ID to generate hooks for
 * - count: number (optional, default: 5) - Number of hooks to generate
 * - hookType: string (optional) - Specific hook type (question, statement, story, relatable, curiosity)
 * - includeEmojis: boolean (optional, default: true) - Include emojis in hooks
 */
router.post('/generate', async (req, res) => {
  try {
    const { storyId, count, hookType, includeEmojis } = req.body;

    // Validate storyId
    if (!storyId) {
      logger.warn('Hook generation request missing storyId');
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    // Validate count
    if (count !== undefined) {
      if (typeof count !== 'number' || count < 1 || count > 10) {
        logger.warn('Invalid count parameter', { count });
        return res.status(400).json({
          success: false,
          error: 'count must be a number between 1 and 10'
        });
      }
    }

    // Validate hookType
    if (hookType !== undefined) {
      const validTypes = ['question', 'statement', 'story', 'relatable', 'curiosity'];
      if (!validTypes.includes(hookType)) {
        logger.warn('Invalid hookType parameter', { hookType });
        return res.status(400).json({
          success: false,
          error: `hookType must be one of: ${validTypes.join(', ')}`
        });
      }
    }

    logger.info('Generating text hooks', { storyId, count, hookType, includeEmojis });

    // Fetch story from database
    const story = await Story.findById(storyId).lean();

    if (!story) {
      logger.warn('Story not found', { storyId });
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    // Generate hooks
    const result = await hookGenerationService.generateHooks(story, {
      count: count || 5,
      hookType,
      includeEmojis: includeEmojis !== undefined ? includeEmojis : true
    });

    logger.info('Text hooks generated successfully', {
      storyId,
      hookCount: result.hooks.length,
      avgScore: Math.round(
        result.hooks.reduce((sum, h) => sum + h.score, 0) / result.hooks.length
      )
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Hook generation API error', {
      error: error.message,
      stack: error.stack,
      storyId: req.body.storyId
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/hooks/validate
 * Validate a hook text
 *
 * Request body:
 * - hookText: string (required) - Hook text to validate
 */
router.post('/validate', async (req, res) => {
  try {
    const { hookText } = req.body;

    // Validate hookText
    if (!hookText || typeof hookText !== 'string') {
      logger.warn('Hook validation request missing or invalid hookText');
      return res.status(400).json({
        success: false,
        error: 'hookText is required and must be a string'
      });
    }

    logger.info('Validating hook', {
      textLength: hookText.length,
      textPreview: hookText.substring(0, 50)
    });

    // Validate hook
    const validation = hookGenerationService.validateHook(hookText);

    logger.info('Hook validation complete', {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    logger.error('Hook validation API error', {
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
 * GET /api/hooks/status
 * Get hook generation service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = hookGenerationService.getStatus();

    logger.info('Hook service status requested');

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
 * GET /api/hooks/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hooks-api',
    timestamp: new Date().toISOString()
  });
});

export default router;
