/**
 * Metrics API Routes
 *
 * Endpoints for fetching and managing performance metrics for social media posts.
 */

import express from 'express';
import performanceMetricsService from '../services/performanceMetricsService.js';
import MarketingPost from '../models/MarketingPost.js';
import AnalyticsMetric from '../models/AnalyticsMetric.js';
import metricsAggregatorJob from '../jobs/metricsAggregator.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'metrics');

/**
 * GET /api/metrics/post/:postId
 * Fetch metrics for a single post
 */
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info(`Fetching metrics for post ${postId}...`);

    const result = await performanceMetricsService.fetchPostMetrics(postId);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      success: true,
      data: result.data,
      platform: result.platform,
      fetchedAt: result.fetchedAt,
    });

  } catch (error) {
    logger.error('Error fetching post metrics', {
      error: error.message,
      postId: req.params.postId,
    });

    res.status(500).json({
      error: 'Failed to fetch post metrics',
      message: error.message,
    });
  }
});

/**
 * POST /api/metrics/batch
 * Fetch metrics for multiple posts
 * Body: { postIds: string[] }
 */
router.post('/batch', async (req, res) => {
  try {
    const { postIds } = req.body;

    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({
        error: 'postIds array is required',
      });
    }

    if (postIds.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 posts per batch request',
      });
    }

    logger.info(`Fetching batch metrics for ${postIds.length} posts...`);

    const result = await performanceMetricsService.fetchBatchMetrics(postIds);

    res.json({
      success: result.success,
      results: result.results,
      errors: result.errors,
      summary: {
        total: postIds.length,
        success: result.results.length,
        errors: result.errors.length,
      },
    });

  } catch (error) {
    logger.error('Error fetching batch metrics', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to fetch batch metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/range
 * Fetch metrics for posts in a date range
 * Query params:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - platform: optional (tiktok, instagram, youtube_shorts)
 */
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)',
      });
    }

    logger.info(`Fetching metrics for date range ${startDate} to ${endDate}...`);

    const result = await performanceMetricsService.fetchMetricsForDateRange(
      startDate,
      endDate,
      platform
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
      });
    }

    res.json({
      success: true,
      startDate,
      endDate,
      platform: platform || 'all',
      ...result,
    });

  } catch (error) {
    logger.error('Error fetching range metrics', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to fetch range metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/aggregate
 * Get aggregate metrics for dashboard
 * Query params:
 *   - period: '24h', '7d', '30d' (default: '24h')
 */
router.get('/aggregate', async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    logger.info(`Fetching aggregate metrics for period: ${period}...`);

    const result = await performanceMetricsService.getAggregateMetrics(period);

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
      });
    }

    res.json(result);

  } catch (error) {
    logger.error('Error fetching aggregate metrics', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to fetch aggregate metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/post/:postId/history
 * Get metrics history for a post
 */
router.get('/post/:postId/history', async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      postId,
      platform: post.platform,
      currentMetrics: post.performanceMetrics,
      history: post.metricsHistory || [],
      lastFetched: post.metricsLastFetchedAt,
    });

  } catch (error) {
    logger.error('Error fetching metrics history', {
      error: error.message,
      postId: req.params.postId,
    });

    res.status(500).json({
      error: 'Failed to fetch metrics history',
      message: error.message,
    });
  }
});

/**
 * POST /api/metrics/platform/set-token
 * Set access token for a platform (called by posting services)
 * Body: { platform: string, token: string }
 */
router.post('/platform/set-token', async (req, res) => {
  try {
    const { platform, token } = req.body;

    if (!platform || !token) {
      return res.status(400).json({
        error: 'platform and token are required',
      });
    }

    const validPlatforms = ['tiktok', 'instagram', 'youtube'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      });
    }

    performanceMetricsService.setPlatformToken(platform, token);

    logger.info(`Access token set for ${platform}`);

    res.json({
      success: true,
      message: `Access token set for ${platform}`,
    });

  } catch (error) {
    logger.error('Error setting platform token', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to set platform token',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'performance-metrics',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/metrics/aggregation/schedule/start
 * Start the metrics aggregation scheduler
 */
router.post('/aggregation/schedule/start', async (req, res) => {
  try {
    const { scheduleTime, timezone } = req.body;

    metricsAggregatorJob.start({ scheduleTime, timezone });

    res.json({
      success: true,
      message: 'Metrics aggregation scheduler started',
      status: metricsAggregatorJob.getStatus()
    });

  } catch (error) {
    logger.error('Failed to start metrics aggregation scheduler', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to start metrics aggregation scheduler',
      message: error.message
    });
  }
});

/**
 * POST /api/metrics/aggregation/schedule/stop
 * Stop the metrics aggregation scheduler
 */
router.post('/aggregation/schedule/stop', async (req, res) => {
  try {
    metricsAggregatorJob.stop();

    res.json({
      success: true,
      message: 'Metrics aggregation scheduler stopped',
      status: metricsAggregatorJob.getStatus()
    });

  } catch (error) {
    logger.error('Failed to stop metrics aggregation scheduler', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to stop metrics aggregation scheduler',
      message: error.message
    });
  }
});

/**
 * POST /api/metrics/aggregation/schedule/trigger
 * Manually trigger metrics aggregation for a specific date
 * Body: { date: string (ISO date, optional) }
 */
router.post('/aggregation/schedule/trigger', async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : null;

    logger.info('Manually triggering metrics aggregation', { date });

    const result = await metricsAggregatorJob.trigger(targetDate);

    res.json({
      success: true,
      message: 'Metrics aggregation completed',
      data: result
    });

  } catch (error) {
    logger.error('Failed to trigger metrics aggregation', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to trigger metrics aggregation',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/aggregation/schedule/status
 * Get the status of the metrics aggregation scheduler
 */
router.get('/aggregation/schedule/status', async (req, res) => {
  try {
    const status = metricsAggregatorJob.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get metrics aggregation status', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get metrics aggregation status',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/aggregation/data
 * Get aggregated metrics data
 * Query params:
 *   - metric: metric name (e.g., 'mrr', 'active_subscribers')
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - period: daily, weekly, monthly (default: daily)
 *   - platform: optional platform filter
 *   - category: optional category filter
 *   - source: optional source filter
 */
router.get('/aggregation/data', async (req, res) => {
  try {
    const { metric, startDate, endDate, period = 'daily', platform, category, source } = req.query;

    if (!metric) {
      return res.status(400).json({
        error: 'metric parameter is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)'
      });
    }

    const dimensions = {};
    if (platform) dimensions.platform = platform;
    if (category) dimensions.category = category;
    if (source) dimensions.source = source;

    const metrics = await AnalyticsMetric.getMetrics(metric, start, end, dimensions);

    res.json({
      success: true,
      metric,
      startDate,
      endDate,
      period,
      dimensions,
      count: metrics.length,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get aggregated metrics data', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get aggregated metrics data',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/aggregation/latest/:metric
 * Get the latest value for a specific metric
 */
router.get('/aggregation/latest/:metric', async (req, res) => {
  try {
    const { metric } = req.params;
    const { platform, category, source } = req.query;

    const dimensions = {};
    if (platform) dimensions.platform = platform;
    if (category) dimensions.category = category;
    if (source) dimensions.source = source;

    const latest = await AnalyticsMetric.getLatest(metric, dimensions);

    if (!latest) {
      return res.status(404).json({
        error: 'No metrics found for the specified criteria'
      });
    }

    res.json({
      success: true,
      metric,
      data: latest
    });

  } catch (error) {
    logger.error('Failed to get latest metric', {
      error: error.message,
      metric: req.params.metric
    });

    res.status(500).json({
      error: 'Failed to get latest metric',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/aggregation/aggregate
 * Aggregate metrics by period
 * Query params:
 *   - metric: metric name
 *   - period: daily, weekly, monthly
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 */
router.get('/aggregation/aggregate', async (req, res) => {
  try {
    const { metric, period, startDate, endDate } = req.query;

    if (!metric || !period || !startDate || !endDate) {
      return res.status(400).json({
        error: 'metric, period, startDate, and endDate are required'
      });
    }

    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const aggregated = await AnalyticsMetric.aggregateByPeriod(metric, period, start, end);

    res.json({
      success: true,
      metric,
      period,
      startDate,
      endDate,
      count: aggregated.length,
      data: aggregated
    });

  } catch (error) {
    logger.error('Failed to aggregate metrics by period', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to aggregate metrics by period',
      message: error.message
    });
  }
});

export default router;
