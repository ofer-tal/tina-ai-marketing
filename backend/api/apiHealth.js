import express from 'express';
import apiHealthMonitorJob from '../jobs/apiHealthMonitor.js';
import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api-health-api', 'api-health-api');
const router = express.Router();

/**
 * Get or create Strategy model
 * Uses marketing_strategy collection
 */
const getStrategyModel = () => {
  if (mongoose.models.Strategy) {
    return mongoose.models.Strategy;
  }

  return mongoose.model('Strategy', new mongoose.Schema({
    type: { type: String, enum: ['decision', 'recommendation', 'analysis', 'pivot', 'review', 'daily_briefing', 'api_health_report'], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    reasoning: String,
    dataReferences: [mongoose.Schema.Types.Mixed],
    status: { type: String, enum: ['proposed', 'approved', 'rejected', 'implemented'], default: 'proposed' },
    expectedOutcome: String,
    actualOutcome: String,
    reviewDate: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, { collection: 'marketing_strategy' }));
};

/**
 * POST /api/api-health/schedule/start
 * Start the API health monitor scheduler
 */
router.post('/schedule/start', async (req, res) => {
  try {
    const { interval, timezone } = req.body;

    logger.info('Starting API health monitor scheduler', {
      interval,
      timezone
    });

    apiHealthMonitorJob.start({ interval, timezone });

    res.json({
      success: true,
      message: 'API health monitor scheduler started',
      data: {
        jobName: apiHealthMonitorJob.jobName,
        isScheduled: true,
        interval: interval || process.env.API_HEALTH_CHECK_INTERVAL || '*/30 * * * *',
        timezone: timezone || process.env.API_HEALTH_CHECK_TIMEZONE || 'UTC'
      }
    });

  } catch (error) {
    logger.error('Failed to start API health monitor scheduler', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to start API health monitor scheduler',
      error: error.message
    });
  }
});

/**
 * POST /api/api-health/schedule/stop
 * Stop the API health monitor scheduler
 */
router.post('/schedule/stop', async (req, res) => {
  try {
    logger.info('Stopping API health monitor scheduler');

    apiHealthMonitorJob.stop();

    res.json({
      success: true,
      message: 'API health monitor scheduler stopped',
      data: {
        jobName: apiHealthMonitorJob.jobName,
        isScheduled: false
      }
    });

  } catch (error) {
    logger.error('Failed to stop API health monitor scheduler', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to stop API health monitor scheduler',
      error: error.message
    });
  }
});

/**
 * POST /api/api-health/schedule/trigger
 * Manually trigger the API health check
 */
router.post('/schedule/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering API health check');

    // Execute health check in background
    apiHealthMonitorJob.execute().then(() => {
      logger.info('Manual API health check completed');
    }).catch(error => {
      logger.error('Manual API health check failed', {
        error: error.message
      });
    });

    res.json({
      success: true,
      message: 'API health check triggered',
      data: {
        jobName: apiHealthMonitorJob.jobName,
        triggeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to trigger API health check', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to trigger API health check',
      error: error.message
    });
  }
});

/**
 * GET /api/api-health/schedule/status
 * Get the status of the API health monitor scheduler
 */
router.get('/schedule/status', async (req, res) => {
  try {
    const status = apiHealthMonitorJob.getHealthStatus();
    const schedulerStatus = apiHealthMonitorJob.isScheduled;

    // Get job stats from scheduler service
    const jobStats = {
      isScheduled: schedulerStatus,
      healthStatus: status
    };

    // Get recent health reports from database
    const recentReports = await getStrategyModel().find({
      type: 'api_health_report'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      data: {
        ...jobStats,
        recentReports: recentReports.map(r => ({
          id: r._id,
          timestamp: r.createdAt,
          summary: r.title,
          content: r.content
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to get API health monitor status', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get API health monitor status',
      error: error.message
    });
  }
});

/**
 * GET /api/api-health/status
 * Get current health status for all APIs
 */
router.get('/status', async (req, res) => {
  try {
    const status = apiHealthMonitorJob.getHealthStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get API health status', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get API health status',
      error: error.message
    });
  }
});

/**
 * GET /api/api-health/status/:api
 * Get health status for a specific API
 */
router.get('/status/:api', async (req, res) => {
  try {
    const { api } = req.params;
    const status = apiHealthMonitorJob.getApiHealthStatus(api);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: `No health status found for API: ${api}`
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get API health status', {
      error: error.message,
      api: req.params.api
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get API health status',
      error: error.message
    });
  }
});

/**
 * GET /api/api-health/reports
 * Get recent health check reports
 */
router.get('/reports', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const reports = await getStrategyModel().find({
      type: 'api_health_report'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const total = await getStrategyModel().countDocuments({
      type: 'api_health_report'
    });

    res.json({
      success: true,
      data: {
        reports: reports.map(r => ({
          id: r._id,
          timestamp: r.createdAt,
          summary: r.title,
          content: r.content,
          dataReferences: r.dataReferences
        })),
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + limit < total
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get API health reports', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get API health reports',
      error: error.message
    });
  }
});

/**
 * GET /api/api-health/reports/latest
 * Get the latest health check report
 */
router.get('/reports/latest', async (req, res) => {
  try {
    const latestReport = await getStrategyModel().findOne({
      type: 'api_health_report'
    })
    .sort({ createdAt: -1 })
    .lean();

    if (!latestReport) {
      return res.status(404).json({
        success: false,
        message: 'No health reports found'
      });
    }

    res.json({
      success: true,
      data: {
        id: latestReport._id,
        timestamp: latestReport.createdAt,
        summary: latestReport.title,
        content: latestReport.content,
        dataReferences: latestReport.dataReferences
      }
    });

  } catch (error) {
    logger.error('Failed to get latest API health report', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get latest API health report',
      error: error.message
    });
  }
});

export default router;
