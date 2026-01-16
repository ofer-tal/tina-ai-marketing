import express from 'express';
import logRotationJob from '../jobs/logRotationJob.js';

const router = express.Router();

/**
 * POST /api/log-rotation/start
 * Start the log rotation scheduler
 */
router.post('/start', async (req, res) => {
  try {
    logRotationJob.start();

    res.json({
      success: true,
      message: 'Log rotation job started',
      config: logRotationJob.getConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/log-rotation/stop
 * Stop the log rotation scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    logRotationJob.stop();

    res.json({
      success: true,
      message: 'Log rotation job stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/log-rotation/trigger
 * Manually trigger log rotation
 */
router.post('/trigger', async (req, res) => {
  try {
    const results = await logRotationJob.execute();

    res.json({
      success: true,
      message: 'Log rotation completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/log-rotation/status
 * Get log rotation job status
 */
router.get('/status', async (req, res) => {
  try {
    const stats = logRotationJob.getStats();

    res.json({
      success: true,
      status: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/log-rotation/config
 * Get log rotation configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = logRotationJob.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/log-rotation/config
 * Update log rotation configuration
 */
router.put('/config', async (req, res) => {
  try {
    const {
      rotationSchedule,
      retentionDays,
      compressionEnabled,
      maxDiskUsagePercent,
      maxDiskUsageBytes
    } = req.body;

    const updates = {};
    if (rotationSchedule !== undefined) updates.rotationSchedule = rotationSchedule;
    if (retentionDays !== undefined) updates.retentionDays = retentionDays;
    if (compressionEnabled !== undefined) updates.compressionEnabled = compressionEnabled;
    if (maxDiskUsagePercent !== undefined) updates.maxDiskUsagePercent = maxDiskUsagePercent;
    if (maxDiskUsageBytes !== undefined) updates.maxDiskUsageBytes = maxDiskUsageBytes;

    logRotationJob.updateConfig(updates);

    res.json({
      success: true,
      message: 'Configuration updated',
      config: logRotationJob.getConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/log-rotation/stats
 * Get log rotation statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = logRotationJob.getStats();

    res.json({
      success: true,
      stats: {
        lastRun: stats.lastRun,
        lastRunDuration: stats.lastRunDuration,
        lastRotationCount: stats.lastRotationCount,
        lastCompressionCount: stats.lastCompressionCount,
        lastDeletionCount: stats.lastDeletionCount,
        lastDiskUsageBytes: stats.lastDiskUsageBytes,
        lastDiskUsagePercent: stats.lastDiskUsagePercent,
        totalRuns: stats.totalRuns,
        totalRotated: stats.totalRotated,
        totalCompressed: stats.totalCompressed,
        totalDeleted: stats.totalDeleted,
        errors: stats.errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/log-rotation/reset-stats
 * Reset log rotation statistics
 */
router.post('/reset-stats', async (req, res) => {
  try {
    logRotationJob.resetStats();

    res.json({
      success: true,
      message: 'Statistics reset'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/log-rotation/logs
 * List all log files
 */
router.get('/logs', async (req, res) => {
  try {
    const logFiles = await logRotationJob.listLogFiles();

    res.json({
      success: true,
      logs: logFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/log-rotation/logs/:filename
 * Delete a specific log file
 */
router.delete('/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    // Prevent deletion of active logs
    if (filename === 'combined.log' || filename === 'error.log') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active log files'
      });
    }

    const fs = await import('fs');
    const path = await import('path');
    const config = logRotationJob.getConfig();
    const filePath = path.join(config.logDirectory, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Log file deleted',
      file: filename
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
