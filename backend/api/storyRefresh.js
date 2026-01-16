import express from 'express';
import winston from 'winston';
import storyRefreshJob from '../jobs/storyRefreshJob.js';

const router = express.Router();

// Create logger for story refresh API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'story-refresh-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/story-refresh-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/story-refresh-api.log' }),
  ],
});

/**
 * POST /api/story-refresh/trigger
 * Manually trigger the story database refresh job
 */
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Manual story refresh triggered via API');

    // Check if job is already running
    const status = storyRefreshJob.getStatus();
    if (status.isRunning) {
      return res.status(409).json({
        success: false,
        error: 'Story refresh job already running',
        isRunning: true
      });
    }

    // Trigger the job
    const results = await storyRefreshJob.trigger();

    res.json({
      success: true,
      message: 'Story database refresh completed',
      data: results
    });

  } catch (error) {
    logger.error('Manual story refresh API error', {
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
 * GET /api/story-refresh/status
 * Get the status of the story refresh job
 */
router.get('/status', async (req, res) => {
  try {
    const status = storyRefreshJob.getStatus();

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
 * GET /api/story-refresh/count
 * Get the current eligible story count (without running full refresh)
 */
router.get('/count', async (req, res) => {
  try {
    logger.info('Fetching eligible story count');

    const countData = await storyRefreshJob.getEligibleStoryCount();

    res.json({
      success: true,
      data: countData
    });

  } catch (error) {
    logger.error('Get count API error', {
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
 * GET /api/story-refresh/
 * Root endpoint with API information
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Story Database Refresh API',
    version: '1.0.0',
    endpoints: {
      'POST /trigger': 'Manually trigger story database refresh',
      'GET /status': 'Get job status and last refresh statistics',
      'GET /count': 'Get current eligible story count'
    },
    description: 'Periodically refreshes story database for new eligible content'
  });
});

export default router;
