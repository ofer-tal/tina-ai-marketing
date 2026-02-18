import express from 'express';
import winston from 'winston';
import contentMetricsSyncJob from '../jobs/contentMetricsSyncJob.js';

const router = express.Router();

// Create logger for content metrics sync API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-metrics-sync-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-metrics-sync-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-metrics-sync-api.log' }),
  ],
});

/**
 * POST /api/content-metrics-sync/trigger
 * Manually trigger the content metrics sync job
 * Useful for testing or on-demand metrics refresh
 */
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering content metrics sync job');

    const result = await contentMetricsSyncJob.execute();

    res.json({
      success: true,
      message: 'Content metrics sync completed',
      data: result
    });

  } catch (error) {
    logger.error('Failed to trigger content metrics sync job', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to trigger content metrics sync job',
      details: error.message
    });
  }
});

/**
 * GET /api/content-metrics-sync/status
 * Get the current status of the content metrics sync job
 */
router.get('/status', async (req, res) => {
  try {
    const status = contentMetricsSyncJob.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get content metrics sync status', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get content metrics sync status',
      details: error.message
    });
  }
});

/**
 * GET /api/content-metrics-sync/last-sync
 * Get the last sync stats
 */
router.get('/last-sync', async (req, res) => {
  try {
    const lastSyncStats = contentMetricsSyncJob.getLastSyncStats();

    res.json({
      success: true,
      data: lastSyncStats
    });

  } catch (error) {
    logger.error('Failed to get last sync stats', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get last sync stats',
      details: error.message
    });
  }
});

export default router;
