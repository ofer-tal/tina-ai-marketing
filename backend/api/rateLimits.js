/**
 * Rate Limit Status API
 *
 * Provides endpoints for monitoring rate limit status across all platforms.
 */

import express from 'express';
import { getLogger } from '../utils/logger.js';
import rateLimiterService from '../services/rateLimiter.js';

const router = express.Router();
const logger = getLogger('api', 'rate-limits');

/**
 * GET /api/rate-limits/status
 *
 * Get rate limit status for all platforms
 */
router.get('/status', async (req, res) => {
  try {
    const status = rateLimiterService.getStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get rate limit status', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
    });
  }
});

/**
 * GET /api/rate-limits/status/:host
 *
 * Get rate limit status for a specific host
 */
router.get('/status/:host', async (req, res) => {
  try {
    const { host } = req.params;

    // Decode host (URL encoded)
    const decodedHost = decodeURIComponent(host);

    const status = rateLimiterService.getHostStatus(decodedHost);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get host rate limit status', {
      host: req.params.host,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get host rate limit status',
    });
  }
});

/**
 * POST /api/rate-limits/clear/:host
 *
 * Clear rate limit for a specific host (useful for manual reset)
 */
router.post('/clear/:host', async (req, res) => {
  try {
    const { host } = req.params;

    // Decode host (URL encoded)
    const decodedHost = decodeURIComponent(host);

    rateLimiterService.clearRateLimit(decodedHost);

    logger.info('Rate limit cleared', { host: decodedHost });

    res.json({
      success: true,
      message: `Rate limit cleared for ${decodedHost}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to clear rate limit', {
      host: req.params.host,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to clear rate limit',
    });
  }
});

/**
 * GET /api/rate-limits/config
 *
 * Get rate limit configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      maxQueueSize: rateLimiterService.config.maxQueueSize,
      defaultRetryAfter: rateLimiterService.config.defaultRetryAfter,
      baseDelay: rateLimiterService.config.baseDelay,
      maxDelay: rateLimiterService.config.maxDelay,
      backoffMultiplier: rateLimiterService.config.backoffMultiplier,
      requestDelays: rateLimiterService.config.requestDelays,
    };

    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get rate limit config', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit config',
    });
  }
});

/**
 * POST /api/rate-limits/reset-all
 *
 * Reset all rate limits (useful for testing or recovery)
 */
router.post('/reset-all', async (req, res) => {
  try {
    rateLimiterService.resetAll();

    logger.info('All rate limits reset');

    res.json({
      success: true,
      message: 'All rate limits have been reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to reset rate limits', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limits',
    });
  }
});

export default router;
