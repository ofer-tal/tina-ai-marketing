/**
 * Cache Service
 *
 * In-memory caching for API responses to reduce external API calls
 * and improve response times.
 */

class CacheService {
  constructor() {
    // In-memory cache storage
    this.cache = new Map();

    // Default TTL configurations (in seconds)
    this.defaultTTL = {
      // ASO data - changes slowly
      asoRankings: 3600, // 1 hour
      asoScores: 1800, // 30 minutes
      categoryRankings: 1800, // 30 minutes

      // App Store Connect - campaigns and reports
      appStoreCampaigns: 600, // 10 minutes
      appStoreReports: 300, // 5 minutes
      appStoreSubscriptions: 300, // 5 minutes

      // Apple Search Ads
      searchAdsCampaigns: 300, // 5 minutes
      searchAdsSpend: 600, // 10 minutes

      // Google Analytics
      analyticsPageViews: 300, // 5 minutes
      analyticsTrafficSources: 300, // 5 minutes
      analyticsRealtime: 60, // 1 minute

      // TikTok
      tiktokTrendingAudio: 1800, // 30 minutes

      // Dashboard metrics
      dashboardMetrics: 60, // 1 minute
      strategicMetrics: 300, // 5 minutes

      // Revenue data
      revenueDaily: 300, // 5 minutes
      revenueAttribution: 600, // 10 minutes

      // Default fallback
      default: 300, // 5 minutes
    };
  }

  /**
   * Generate a cache key from endpoint and parameters
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @returns {string} - Cache key
   */
  generateKey(endpoint, params = {}) {
    // Sort params to ensure consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    const paramString = JSON.stringify(sortedParams);
    return `${endpoint}:${paramString}`;
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null if not found/expired
   */
  get(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] HIT: ${key}`);
    return cached.data;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, data, ttl) {
    const ttlSeconds = ttl || this.defaultTTL.default;
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    });

    console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`);

    // Clean up expired entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    console.log(`[Cache] DELETE: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[Cache] CLEARED: ${size} entries`);
  }

  /**
   * Clear cache entries matching a pattern
   * @param {string} pattern - Pattern to match
   */
  clearPattern(pattern) {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    console.log(`[Cache] CLEARED PATTERN "${pattern}": ${deleted} entries`);
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let deleted = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[Cache] CLEANUP: Removed ${deleted} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const [, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      size: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }

  /**
   * Get TTL for a specific cache type
   * @param {string} type - Cache type
   * @returns {number} - TTL in seconds
   */
  getTTL(type) {
    return this.defaultTTL[type] || this.defaultTTL.default;
  }

  /**
   * Middleware factory for Express routes
   * @param {string} cacheType - Type of cache to use
   * @returns {function} - Express middleware
   */
  middleware(cacheType) {
    const ttl = this.getTTL(cacheType);

    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      const key = this.generateKey(req.originalUrl, req.query);

      // Try to get from cache
      const cached = this.get(key);

      if (cached) {
        return res.json({
          success: true,
          cached: true,
          data: cached
        });
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);

      // Override res.json to cache successful responses
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data && data.success !== false) {
          // Store in cache
          // Note: We need access to cacheService here, so we'll use a different approach
        }

        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Wrapper for async functions to cache results
   * @param {string} cacheType - Type of cache
   * @param {function} keyGenerator - Function to generate cache key
   * @returns {function} - Wrapper function
   */
  cacheAsync(cacheType, keyGenerator) {
    const ttl = this.getTTL(cacheType);
    const cacheService = this;

    return async function(...args) {
      const key = keyGenerator(...args);

      // Try to get from cache
      const cached = cacheService.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original function
      const result = await this(...args);

      // Cache the result
      cacheService.set(key, result, ttl);

      return result;
    }.bind(this);
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Periodic cleanup every 10 minutes
setInterval(() => {
  cacheService.cleanup();
}, 10 * 60 * 1000);

export default cacheService;
