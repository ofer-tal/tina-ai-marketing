/**
 * Content Performance API Routes
 *
 * Provides endpoints for tracking and analyzing content performance
 * across blog posts, press releases, and social media posts.
 *
 * Feature #271: Content performance tracking
 */

import express from 'express';
import contentPerformanceService from '../services/contentPerformanceService.js';

const router = express.Router();

/**
 * GET /api/content-performance/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'content-performance',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/content-performance/summary
 * Get overall performance summary across all content types
 * Query params: startDate, endDate (ISO dates)
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await contentPerformanceService.getOverallSummary({
      startDate,
      endDate,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/content-performance/top/:limit?
 * Get top performing content across all types
 * Params: limit (default: 10)
 * Query params: startDate, endDate
 */
router.get('/top/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    const { startDate, endDate } = req.query;

    const result = await contentPerformanceService.getTopPerformingContent(limit, {
      startDate,
      endDate,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/content-performance/trends/:days?
 * Get performance trends over time
 * Params: days (default: 30)
 */
router.get('/trends/:days?', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const result = await contentPerformanceService.getPerformanceTrends(days);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/content-performance/breakdown
 * Get content type breakdown
 * Query params: startDate, endDate
 */
router.get('/breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await contentPerformanceService.getContentTypeBreakdown({
      startDate,
      endDate,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/content-performance/:contentType
 * Get detailed performance by content type
 * Params: contentType (blog|press|social)
 * Query params: startDate, endDate
 * NOTE: This must be last to avoid catching specific routes
 */
router.get('/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const { startDate, endDate } = req.query;

    if (!['blog', 'press', 'social'].includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type. Must be blog, press, or social',
      });
    }

    const result = await contentPerformanceService.getPerformanceByContentType(contentType, {
      startDate,
      endDate,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
