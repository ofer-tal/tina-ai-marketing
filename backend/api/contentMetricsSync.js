import express from 'express';
import winston from 'winston';
import contentMetricsSyncJob from '../jobs/contentMetricsSyncJob.js';
import MarketingPost from '../models/MarketingPost.js';
import performanceMetricsService from '../services/performanceMetricsService.js';

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

/**
 * POST /api/content-metrics-sync/post/:postId
 * Manually trigger metrics sync for a specific post
 * Useful for immediate fix of stuck posts or testing
 */
router.post('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info(`Manual sync triggered for post ${postId}`);

    // Find the post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        details: `No post found with ID: ${postId}`
      });
    }

    // Determine which platforms to sync based on post's platform status
    const platforms = post.platforms || [post.platform].filter(Boolean);
    const results = {};
    let totalUpdated = 0;
    let totalFailed = 0;

    // Sync metrics for each platform that has been posted
    for (const platform of platforms) {
      const platformStatus = post.platformStatus?.[platform];

      // Only sync if platform is posted
      if (platformStatus?.status === 'posted') {
        try {
          logger.info(`Syncing ${platform} metrics for post ${postId}`);

          let metricsResult;
          if (platform === 'youtube_shorts') {
            // Use the syncSingleYouTubePost method from the job
            metricsResult = await contentMetricsSyncJob.syncSingleYouTubePost(post);
          } else if (platform === 'tiktok') {
            metricsResult = await contentMetricsSyncJob.syncSingleTikTokPost(post);
          } else if (platform === 'instagram') {
            metricsResult = await contentMetricsSyncJob.syncSingleInstagramPost(post);
          }

          if (metricsResult?.success) {
            if (metricsResult.updated) {
              results[platform] = { success: true, updated: true };
              totalUpdated++;
            } else if (metricsResult.skipped) {
              results[platform] = { success: true, updated: false, skipped: true, reason: metricsResult.reason };
            }
          } else {
            results[platform] = { success: false, error: metricsResult?.reason || 'Sync failed' };
            totalFailed++;
          }
        } catch (error) {
          logger.error(`Failed to sync ${platform} metrics for post ${postId}`, {
            error: error.message
          });
          results[platform] = { success: false, error: error.message };
          totalFailed++;
        }
      } else {
        results[platform] = { success: false, skipped: true, reason: `Platform status is: ${platformStatus?.status || 'not set'}` };
      }
    }

    res.json({
      success: true,
      message: `Metrics sync completed for post ${postId}`,
      data: {
        postId,
        platforms: results,
        summary: {
          totalUpdated,
          totalFailed,
          platformsCount: platforms.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to manually sync post metrics', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to manually sync post metrics',
      details: error.message
    });
  }
});

export default router;
