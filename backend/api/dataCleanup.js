import express from 'express';
import path from 'path';
import winston from 'winston';
import dataCleanupJob from '../jobs/dataCleanup.js';

const router = express.Router();

// Create logger for data cleanup API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'data-cleanup-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/data-cleanup-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/data-cleanup-api.log' }),
  ],
});

/**
 * POST /api/data-cleanup/start
 * Start the scheduled data cleanup job
 */
router.post('/start', async (req, res) => {
  try {
    logger.info('Starting data cleanup scheduler');

    const options = {
      day: req.body.day,
      time: req.body.time,
      timezone: req.body.timezone,
      runImmediately: req.body.runImmediately || false
    };

    dataCleanupJob.start(options);

    res.json({
      success: true,
      message: 'Data cleanup scheduler started',
      data: dataCleanupJob.getStatus()
    });

  } catch (error) {
    logger.error('Failed to start data cleanup scheduler', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to start data cleanup scheduler',
      details: error.message
    });
  }
});

/**
 * POST /api/data-cleanup/stop
 * Stop the scheduled data cleanup job
 */
router.post('/stop', async (req, res) => {
  try {
    logger.info('Stopping data cleanup scheduler');

    dataCleanupJob.stop();

    res.json({
      success: true,
      message: 'Data cleanup scheduler stopped',
      data: dataCleanupJob.getStatus()
    });

  } catch (error) {
    logger.error('Failed to stop data cleanup scheduler', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to stop data cleanup scheduler',
      details: error.message
    });
  }
});

/**
 * POST /api/data-cleanup/trigger
 * Manually trigger the data cleanup job
 * Useful for testing or on-demand cleanup
 */
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering data cleanup job');

    const result = await dataCleanupJob.trigger();

    res.json({
      success: true,
      message: 'Data cleanup completed',
      data: result
    });

  } catch (error) {
    logger.error('Failed to trigger data cleanup job', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to trigger data cleanup job',
      details: error.message
    });
  }
});

/**
 * GET /api/data-cleanup/status
 * Get the current status of the data cleanup job
 */
router.get('/status', async (req, res) => {
  try {
    const status = dataCleanupJob.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get data cleanup status', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get data cleanup status',
      details: error.message
    });
  }
});

/**
 * GET /api/data-cleanup/preview
 * Preview which files would be deleted without actually deleting them
 * Useful for testing and verification
 */
router.get('/preview', async (req, res) => {
  try {
    logger.info('Previewing data cleanup');

    // Get list of files that would be deleted
    const oldFiles = await dataCleanupJob.findOldTempFiles();

    // Calculate total size
    const totalSize = oldFiles.reduce((sum, file) => sum + file.size, 0);

    // Group by directory
    const byDirectory = oldFiles.reduce((acc, file) => {
      const dir = path.dirname(file.path);
      if (!acc[dir]) {
        acc[dir] = [];
      }
      acc[dir].push(file);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalFiles: oldFiles.length,
        totalSize,
        totalSizeFormatted: dataCleanupJob.formatBytes(totalSize),
        byDirectory: Object.keys(byDirectory).map(dir => ({
          directory: dir,
          count: byDirectory[dir].length,
          size: byDirectory[dir].reduce((sum, f) => sum + f.size, 0),
          sizeFormatted: dataCleanupJob.formatBytes(byDirectory[dir].reduce((sum, f) => sum + f.size, 0)),
          files: byDirectory[dir].map(f => ({
            name: f.name,
            size: f.size,
            sizeFormatted: dataCleanupJob.formatBytes(f.size),
            ageDays: f.ageDays
          }))
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to preview data cleanup', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to preview data cleanup',
      details: error.message
    });
  }
});

export default router;
