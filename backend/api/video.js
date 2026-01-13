import express from 'express';
import falAiService from '../services/falAiService.js';
import runPodService from '../services/runPodService.js';
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
router.get('/health', async (req, res) => {
  // Check both services
  const falHealth = await falAiService.healthCheck().catch(() => ({ healthy: false, reason: 'error' }));
  const runpodHealth = await runPodService.healthCheck().catch(() => ({ healthy: false, reason: 'error' }));

  res.json({
    success: true,
    service: 'video-generation',
    status: (falHealth.healthy || runpodHealth.healthy) ? 'healthy' : 'degraded',
    services: {
      fal_ai: falHealth,
      runpod: runpodHealth
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/video/generate/runpod
 * Generate vertical video content using RunPod PixelWave/Flux
 *
 * Request body:
 * {
 *   "prompt": "A romantic scene with...",
 *   "spiciness": 1,
 *   "category": "Billionaire",
 *   "duration": 10,
 *   "aspectRatio": "9:16",
 *   "fps": 24,
 *   "resolution": 1080
 * }
 */
router.post('/generate/runpod', async (req, res) => {
  const startTime = Date.now();

  logger.info('RunPod video generation request received', {
    body: { ...req.body, prompt: req.body.prompt?.substring(0, 50) }
  });

  try {
    const { prompt, spiciness, category, duration, aspectRatio, fps, resolution } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    // Validate duration
    if (duration && (duration < 3 || duration > 60)) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be between 3 and 60 seconds'
      });
    }

    // Validate spiciness
    if (spiciness !== undefined && (spiciness < 0 || spiciness > 3)) {
      return res.status(400).json({
        success: false,
        error: 'Spiciness must be between 0 and 3'
      });
    }

    // Validate fps
    if (fps && (fps < 10 || fps > 60)) {
      return res.status(400).json({
        success: false,
        error: 'FPS must be between 10 and 60'
      });
    }

    // Validate resolution
    if (resolution && (resolution < 480 || resolution > 2160)) {
      return res.status(400).json({
        success: false,
        error: 'Resolution must be between 480 and 2160'
      });
    }

    // Generate video
    const result = await runPodService.generateVideo({
      prompt,
      spiciness: spiciness || 0,
      category: category || '',
      duration: duration || 10,
      aspectRatio: aspectRatio || '9:16',
      fps: fps || 24,
      resolution: resolution || 1080
    });

    const duration_ms = Date.now() - startTime;

    logger.info('RunPod video generation completed', {
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

    logger.error('RunPod video generation failed', {
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
 * GET /api/video/status/runpod
 * Get RunPod service status
 */
router.get('/status/runpod', (req, res) => {
  const status = runPodService.getStatus();

  logger.info('RunPod service status requested', status);

  res.json({
    success: true,
    data: status
  });
});

/**
 * GET /api/video/status/fal
 * Get Fal.ai service status (for consistency)
 */
router.get('/status/fal', (req, res) => {
  const status = falAiService.getStatus();

  logger.info('Fal.ai service status requested', status);

  res.json({
    success: true,
    data: status
  });
});

export default router;
