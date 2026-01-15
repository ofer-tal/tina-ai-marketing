/**
 * Cache Management API Routes
 *
 * Provides endpoints for managing API response cache:
 * - GET /api/cache/stats - Get cache statistics
 * - DELETE /api/cache - Clear all cache or specific patterns
 * - GET /api/cache/config - Get cache configuration
 */

import express from 'express';
import cacheService from '../services/cacheService.js';
import { getCacheStats, clearCache } from '../middleware/cache.js';

const router = express.Router();

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
router.get('/stats', getCacheStats);

/**
 * DELETE /api/cache
 * Clear cache
 * Query params:
 *   - pattern: Optional pattern to match for selective clearing
 */
router.delete('/', clearCache);

/**
 * GET /api/cache/config
 * Get cache TTL configuration
 */
router.get('/config', (req, res) => {
  try {
    const ttlConfig = cacheService.defaultTTL;

    res.json({
      success: true,
      data: {
        ttl: ttlConfig,
        description: 'Time-to-live (TTL) values in seconds for each cache type'
      }
    });
  } catch (error) {
    console.error('Error fetching cache config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cache/keys
 * List all cache keys (for debugging)
 */
router.get('/keys', (req, res) => {
  try {
    const keys = Array.from(cacheService.cache.keys());

    res.json({
      success: true,
      data: {
        count: keys.length,
        keys: keys
      }
    });
  } catch (error) {
    console.error('Error listing cache keys:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
