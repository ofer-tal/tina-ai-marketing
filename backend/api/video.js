import express from 'express';
import falAiService from '../services/falAiService.js';
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
  defaultMeta: { service: 'video-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/video-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/video-api.log' }),
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
 * POST /api/video/generate
 * Generate vertical video content using Fal.ai
 *
 * Request body:
 * {
 *   "prompt": "A romantic scene with...",
 *   "spiciness": 1,
 *   "category": "Billionaire",
 *   "duration": 15,
 *   "aspectRatio": "9:16"
 * }
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();

  logger.info('Video generation request received', {
    body: { ...req.body, prompt: req.body.prompt?.substring(0, 50) }
  });

  try {
    const { prompt, spiciness, category, duration, aspectRatio } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    // Validate duration
    if (duration && (duration < 5 || duration > 60)) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be between 5 and 60 seconds'
      });
    }

    // Validate spiciness
    if (spiciness !== undefined && (spiciness < 0 || spiciness > 3)) {
      return res.status(400).json({
        success: false,
        error: 'Spiciness must be between 0 and 3'
      });
    }

    // Generate video
    const result = await falAiService.generateVideo({
      prompt,
      spiciness: spiciness || 0,
      category: category || '',
      duration: duration || 15,
      aspectRatio: aspectRatio || '9:16'
    });

    const duration_ms = Date.now() - startTime;

    logger.info('Video generation completed', {
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

    logger.error('Video generation failed', {
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
 * GET /api/video/status
 * Get Fal.ai service status
 */
router.get('/status', (req, res) => {
  const status = falAiService.getStatus();

  logger.info('Service status requested', status);

  res.json({
    success: true,
    data: status
  });
});

/**
 * GET /api/video/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'video-generation',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
