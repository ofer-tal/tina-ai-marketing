/**
 * Cache Middleware
 *
 * Express middleware for caching API responses
 */

import cacheService from '../services/cacheService.js';

/**
 * Create cache middleware for specific cache type
 * @param {string} cacheType - Type of cache (determines TTL)
 * @param {function} keyGenerator - Optional custom key generator
 * @returns {function} - Express middleware
 */
export function cacheMiddleware(cacheType, keyGenerator = null) {
  const ttl = cacheService.getTTL(cacheType);

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if explicitly disabled
    if (req.query.noCache === 'true') {
      return next();
    }

    // Generate cache key
    const key = keyGenerator
      ? keyGenerator(req)
      : cacheService.generateKey(req.originalUrl, req.query);

    // Try to get from cache
    const cached = cacheService.get(key);

    if (cached !== null) {
      // Add cache header
      res.setHeader('X-Cache', 'HIT');

      return res.json({
        success: true,
        cached: true,
        timestamp: new Date().toISOString(),
        data: cached
      });
    }

    // Cache miss - store original res.json to intercept response
    const originalJson = res.json.bind(res);

    // Override res.json to cache successful responses
    res.json = function(data) {
      // Only cache successful responses (200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Don't cache if explicitly marked
        if (data && data.cache !== false) {
          cacheService.set(key, data, ttl);
          res.setHeader('X-Cache', 'MISS');
        }
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache entries when data changes
 * @param {string} pattern - Pattern to match for invalidation
 * @returns {function} - Express middleware
 */
export function invalidateCache(pattern) {
  return (req, res, next) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to invalidate cache on successful mutations
    res.json = function(data) {
      // Invalidate cache on successful POST/PUT/DELETE/PATCH
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (pattern.includes('*')) {
            // Pattern matching
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            for (const key of cacheService.cache.keys()) {
              if (regex.test(key)) {
                cacheService.delete(key);
              }
            }
          } else {
            // Exact pattern match
            cacheService.clearPattern(pattern);
          }
        }
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Conditional caching based on response status
 * @param {string} cacheType - Type of cache
 * @returns {function} - Express middleware
 */
export function cacheOnSuccess(cacheType) {
  return cacheMiddleware(cacheType);
}

/**
 * Bypass cache middleware
 * Forces cache refresh for this request
 * @returns {function} - Express middleware
 */
export function bypassCache(req, res, next) {
  req.noCache = true;
  res.setHeader('X-Cache-Bypass', 'true');
  next();
}

/**
 * Cache statistics endpoint
 * @returns {function} - Express handler
 */
export function getCacheStats(req, res) {
  try {
    const stats = cacheService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Clear cache endpoint
 * @returns {function} - Express handler
 */
export function clearCache(req, res) {
  try {
    const { pattern } = req.query;

    if (pattern) {
      cacheService.clearPattern(pattern);
      res.json({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`
      });
    } else {
      cacheService.clear();
      res.json({
        success: true,
        message: 'All cache cleared'
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default {
  cacheMiddleware,
  invalidateCache,
  cacheOnSuccess,
  bypassCache,
  getCacheStats,
  clearCache
};
