import express from 'express';
import revenueSyncJob from '../jobs/revenueSyncJob.js';

const router = express.Router();

/**
 * POST /api/revenue-sync/start
 * Start the revenue sync scheduler
 */
router.post('/start', async (req, res) => {
  try {
    console.log('Starting revenue sync scheduler...');

    // Schedule the job to run daily at configured time
    const cronSchedule = revenueSyncJob.syncSchedule || '0 2 * * *';

    // Register job with scheduler service
    const { default: schedulerService } = await import('../services/scheduler.js');
    schedulerService.scheduleJob(
      revenueSyncJob.jobName,
      cronSchedule,
      () => revenueSyncJob.execute()
    );

    res.json({
      success: true,
      message: 'Revenue sync scheduler started',
      schedule: cronSchedule,
      timezone: revenueSyncJob.timezone
    });
  } catch (error) {
    console.error('Error starting revenue sync scheduler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/revenue-sync/stop
 * Stop the revenue sync scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    console.log('Stopping revenue sync scheduler...');

    // Unregister job from scheduler service
    const { default: schedulerService } = await import('../services/scheduler.js');
    schedulerService.unscheduleJob(revenueSyncJob.jobName);

    res.json({
      success: true,
      message: 'Revenue sync scheduler stopped'
    });
  } catch (error) {
    console.error('Error stopping revenue sync scheduler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/revenue-sync/trigger
 * Manually trigger revenue sync
 */
router.post('/trigger', async (req, res) => {
  try {
    console.log('Manually triggering revenue sync...');

    // Execute the job
    const stats = await revenueSyncJob.execute();

    res.json({
      success: true,
      message: 'Revenue sync completed',
      data: stats
    });
  } catch (error) {
    console.error('Error triggering revenue sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue-sync/status
 * Get revenue sync status
 */
router.get('/status', async (req, res) => {
  try {
    const stats = revenueSyncJob.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting revenue sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue-sync/config
 * Get revenue sync configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      schedule: revenueSyncJob.syncSchedule,
      timezone: revenueSyncJob.timezone,
      daysToSync: revenueSyncJob.daysToSync,
      environment: {
        REVENUE_SYNC_SCHEDULE: process.env.REVENUE_SYNC_SCHEDULE || '0 2 * * *',
        REVENUE_SYNC_TIMEZONE: process.env.REVENUE_SYNC_TIMEZONE || 'UTC',
        REVENUE_SYNC_DAYS: process.env.REVENUE_SYNC_DAYS || '7'
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting revenue sync config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/revenue-sync/config
 * Update revenue sync configuration (requires restart)
 */
router.put('/config', async (req, res) => {
  try {
    const { schedule, timezone, daysToSync } = req.body;

    // Validate inputs
    if (schedule && !validateCronExpression(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cron schedule format'
      });
    }

    if (timezone && !isValidTimezone(timezone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timezone'
      });
    }

    if (daysToSync && (isNaN(daysToSync) || daysToSync < 1 || daysToSync > 30)) {
      return res.status(400).json({
        success: false,
        error: 'daysToSync must be between 1 and 30'
      });
    }

    const updated = {
      schedule: schedule || revenueSyncJob.syncSchedule,
      timezone: timezone || revenueSyncJob.timezone,
      daysToSync: daysToSync || revenueSyncJob.daysToSync
    };

    res.json({
      success: true,
      message: 'Configuration updated. Restart scheduler to apply changes.',
      data: updated
    });
  } catch (error) {
    console.error('Error updating revenue sync config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue-sync/metrics
 * Get latest revenue metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const lastStats = revenueSyncJob.lastSyncStats;

    if (!lastStats || !lastStats.metrics) {
      return res.json({
        success: true,
        message: 'No metrics available yet',
        data: null
      });
    }

    res.json({
      success: true,
      data: lastStats.metrics
    });
  } catch (error) {
    console.error('Error getting revenue metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to validate cron expression
 */
function validateCronExpression(expression) {
  // Basic validation: 5 parts separated by spaces
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  // More sophisticated validation could be added here
  return true;
}

/**
 * Helper function to validate timezone
 */
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export default router;
