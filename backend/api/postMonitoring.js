import express from 'express';
import postMonitoringService from '../services/postMonitoringService.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('post-monitoring-api', 'api');

/**
 * POST /api/post-monitoring/start
 * Start the post monitoring service
 */
router.post('/start', async (req, res) => {
  try {
    postMonitoringService.start();
    res.json({
      success: true,
      message: 'Post monitoring service started',
      status: postMonitoringService.getStatus()
    });
  } catch (error) {
    logger.error('Failed to start post monitoring', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/post-monitoring/stop
 * Stop the post monitoring service
 */
router.post('/stop', async (req, res) => {
  try {
    postMonitoringService.stop();
    res.json({
      success: true,
      message: 'Post monitoring service stopped',
      status: postMonitoringService.getStatus()
    });
  } catch (error) {
    logger.error('Failed to stop post monitoring', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/post-monitoring/trigger
 * Manually trigger a post check
 */
router.post('/trigger', async (req, res) => {
  try {
    await postMonitoringService.triggerCheck();
    res.json({
      success: true,
      message: 'Post check triggered successfully'
    });
  } catch (error) {
    logger.error('Failed to trigger post check', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-monitoring/status
 * Get the current status of the post monitoring service
 */
router.get('/status', async (req, res) => {
  try {
    const status = postMonitoringService.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get post monitoring status', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-monitoring/in-progress
 * Get all posts currently in progress (posting/uploading)
 */
router.get('/in-progress', async (req, res) => {
  try {
    const MarketingPost = (await import('../models/MarketingPost.js')).default;

    const inProgressPosts = await MarketingPost.find({
      status: { $in: ['posting', 'uploading'] }
    })
    .select('title platform status uploadProgress scheduledAt createdAt updatedAt')
    .sort({ createdAt: -1 });

    // Add health status for each post
    const postsWithHealth = inProgressPosts.map(post => {
      const now = new Date();
      const lastUpdate = post.updatedAt || post.createdAt;
      const timeSinceUpdate = now - lastUpdate;
      const postingStartedAt = post.uploadProgress?.startedAt || post.createdAt;
      const timeInPosting = now - postingStartedAt;

      const stuckThreshold = 5 * 60 * 1000; // 5 minutes
      const failedThreshold = 10 * 60 * 1000; // 10 minutes

      let health = 'healthy';
      if (timeSinceUpdate > stuckThreshold || timeInPosting > failedThreshold) {
        health = 'stuck';
      } else if (post.uploadProgress?.errorMessage) {
        health = 'error';
      }

      return {
        ...post.toObject(),
        health,
        timeSinceUpdate: Math.round(timeSinceUpdate / 1000),
        timeInPosting: Math.round(timeInPosting / 1000)
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsWithHealth,
        count: postsWithHealth.length
      }
    });
  } catch (error) {
    logger.error('Failed to get in-progress posts', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-monitoring/alerts
 * Get recent failure alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 50, skip = 0, severity } = req.query;

    const MarketingPost = (await import('../models/MarketingPost.js')).default;

    // Build query
    const query = {
      'metadata.failureAlerts': { $exists: true, $ne: [] }
    };

    if (severity) {
      query['metadata.failureAlerts.severity'] = severity;
    }

    const posts = await MarketingPost.find(query)
      .select('title platform status error failedAt metadata.failureAlerts')
      .sort({ 'metadata.failureAlerts.timestamp': -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Flatten alerts
    const alerts = [];
    posts.forEach(post => {
      if (post.metadata?.failureAlerts) {
        post.metadata.failureAlerts.forEach(alert => {
          alerts.push({
            ...alert,
            post: {
              id: post._id,
              title: post.title,
              platform: post.platform,
              error: post.error,
              failedAt: post.failedAt
            }
          });
        });
      }
    });

    // Sort by timestamp
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const paginatedAlerts = alerts.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          total: alerts.length,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: alerts.length > parseInt(skip) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get alerts', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-monitoring/stats
 * Get monitoring statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const MarketingPost = (await import('../models/MarketingPost.js')).default;

    const now = new Date();
    const stuckThreshold = 5 * 60 * 1000; // 5 minutes
    const failedThreshold = 10 * 60 * 1000; // 10 minutes

    // Get in-progress posts
    const inProgressPosts = await MarketingPost.find({
      status: { $in: ['posting', 'uploading'] }
    }).select('updatedAt uploadProgress');

    // Analyze health
    let healthyCount = 0;
    let stuckCount = 0;
    let errorCount = 0;

    inProgressPosts.forEach(post => {
      const lastUpdate = post.updatedAt || post.createdAt;
      const timeSinceUpdate = now - lastUpdate;
      const postingStartedAt = post.uploadProgress?.startedAt || post.createdAt;
      const timeInPosting = now - postingStartedAt;

      if (post.uploadProgress?.errorMessage) {
        errorCount++;
      } else if (timeSinceUpdate > stuckThreshold || timeInPosting > failedThreshold) {
        stuckCount++;
      } else {
        healthyCount++;
      }
    });

    // Get recent failures (last 24 hours)
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    const recentFailures = await MarketingPost.countDocuments({
      status: 'failed',
      failedAt: { $gte: yesterday }
    });

    // Get permanently failed posts
    const permanentlyFailed = await MarketingPost.countDocuments({
      status: 'failed',
      permanentlyFailed: true
    });

    // Get retryable failed posts
    const retryable = await MarketingPost.countDocuments({
      status: 'failed',
      permanentlyFailed: { $ne: true }
    });

    res.json({
      success: true,
      data: {
        inProgress: {
          total: inProgressPosts.length,
          healthy: healthyCount,
          stuck: stuckCount,
          error: errorCount
        },
        failures: {
          recent24h: recentFailures,
          permanentlyFailed,
          retryable
        },
        monitoring: postMonitoringService.getStatus()
      }
    });
  } catch (error) {
    logger.error('Failed to get monitoring stats', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
