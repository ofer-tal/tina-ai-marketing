import express from 'express';
import databaseService from '../services/database.js';

const router = express.Router();

/**
 * GET /api/database-status/status
 * Get current database connection status
 */
router.get('/status', (req, res) => {
  try {
    const status = databaseService.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/database-status/history
 * Get database reconnection attempt history
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const status = databaseService.getStatus();

    // Return the last N connection attempts
    const history = status.reconnectionHistory.slice(-limit);

    res.json({
      success: true,
      data: {
        totalAttempts: status.reconnectionHistory.length,
        recentAttempts: history,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/database-status/health
 * Check database health for user notification
 */
router.get('/health', (req, res) => {
  try {
    const status = databaseService.getStatus();

    // Determine health status
    let healthStatus = 'healthy';
    let message = 'Database connection is stable';

    if (!status.isConnected) {
      if (status.persistentFailureCount >= 10) {
        healthStatus = 'critical';
        message = 'Database connection has failed repeatedly. Manual intervention may be required.';
      } else if (status.persistentFailureCount >= 5) {
        healthStatus = 'severe';
        message = 'Database connection is unstable. Automatic reconnection in progress.';
      } else {
        healthStatus = 'degraded';
        message = 'Database connection temporarily lost. Reconnecting...';
      }
    } else if (status.persistentFailureCount > 0) {
      healthStatus = 'recovering';
      message = 'Database connection recovered after temporary issues.';
    }

    res.json({
      success: true,
      data: {
        healthStatus,
        message,
        isConnected: status.isConnected,
        persistentFailures: status.persistentFailureCount,
        lastSuccessfulConnection: status.lastSuccessfulConnection,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/database-status/test-reconnection
 * Manually trigger a reconnection attempt (for testing)
 */
router.post('/test-reconnection', async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Manual reconnection not allowed in production',
      });
    }

    const status = databaseService.getStatus();

    if (status.isConnected) {
      return res.json({
        success: true,
        message: 'Already connected to database',
        data: status,
      });
    }

    // Attempt reconnection
    await databaseService.connect();

    const newStatus = databaseService.getStatus();

    res.json({
      success: true,
      message: 'Reconnection attempt completed',
      data: newStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        persistentFailures: databaseService.getStatus().persistentFailureCount,
      },
    });
  }
});

export default router;
