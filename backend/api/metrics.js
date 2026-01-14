/**
 * Metrics API Routes
 *
 * Endpoints for fetching and managing performance metrics for social media posts.
 */

import express from 'express';
import performanceMetricsService from '../services/performanceMetricsService.js';
import MarketingPost from '../models/MarketingPost.js';
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

export default router;
