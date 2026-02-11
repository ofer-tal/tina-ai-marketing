/**
 * Engagement Velocity Tracker
 *
 * Tracks how fast posts gain engagement in the first 24 hours.
 * Identifies outlier posts with unusually high velocity (2x+ average).
 *
 * Uses sliding window analysis updated hourly.
 */

import { getLogger } from '../../../utils/logger.js';
import MarketingBookTrendMetrics from '../../../models/MarketingBookTrendMetrics.js';

const logger = getLogger('services', 'booktok-velocity-tracker');

// Velocity thresholds
const VELOCITY_THRESHOLDS = {
  OUTLIER_MULTIPLIER: 2.0, // 2x average velocity
  HIGH_VELOCITY: 1000, // views per hour
  VERY_HIGH_VELOCITY: 5000, // views per hour
  VIRAL_VELOCITY: 10000 // views per hour
};

// Time windows for velocity calculation (in hours)
const TIME_WINDOWS = {
  FIRST_HOUR: 1,
  FIRST_6_HOURS: 6,
  FIRST_12_HOURS: 12,
  FIRST_24_HOURS: 24
};

class EngagementVelocityTracker {
  constructor() {
    this.baselineCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Calculate velocity metric for a post
   * @param {Object} post - Post data with views and timestamps
   * @returns {Object} Velocity metrics
   */
  calculateVelocityMetric(post) {
    if (!post.views || !post.createdAt) {
      return {
        velocity: 0,
        viewsPerHour: 0,
        timeElapsed: 0,
        classification: 'unknown'
      };
    }

    const now = new Date();
    const createdAt = new Date(post.createdAt);
    const timeElapsedHours = (now - createdAt) / (1000 * 60 * 60);

    if (timeElapsedHours <= 0) {
      return {
        velocity: 0,
        viewsPerHour: 0,
        timeElapsed: 0,
        classification: 'unknown'
      };
    }

    const viewsPerHour = post.views / timeElapsedHours;

    // Classify velocity
    let classification = 'normal';
    if (viewsPerHour >= VELOCITY_THRESHOLDS.VIRAL_VELOCITY) {
      classification = 'viral';
    } else if (viewsPerHour >= VELOCITY_THRESHOLDS.VERY_HIGH_VELOCITY) {
      classification = 'very_high';
    } else if (viewsPerHour >= VELOCITY_THRESHOLDS.HIGH_VELOCITY) {
      classification = 'high';
    }

    return {
      velocity: viewsPerHour,
      viewsPerHour,
      timeElapsed: Math.round(timeElapsedHours * 10) / 10,
      classification,
      totalViews: post.views,
      projectedViews: this.projectViews(viewsPerHour, timeElapsedHours)
    };
  }

  /**
   * Project total views based on current velocity
   * @param {number} viewsPerHour - Current velocity
   * @param {number} timeElapsed - Hours elapsed
   * @returns {number} Projected total views
   */
  projectViews(viewsPerHour, timeElapsed) {
    // Velocity typically decays over time
    // Use exponential decay model: v(t) = v0 * e^(-lambda*t)
    const decayRate = 0.1; // Adjust based on platform

    // Project for 24 hours total
    const remainingHours = Math.max(0, 24 - timeElapsed);

    // Integrate velocity curve
    let projected = viewsPerHour;

    for (let t = 1; t <= remainingHours; t++) {
      const decayedVelocity = viewsPerHour * Math.exp(-decayRate * t);
      projected += decayedVelocity;
    }

    return Math.round(projected);
  }

  /**
   * Identify velocity outliers from a set of posts
   * @param {Array} posts - Array of posts with views data
   * @param {Object} options - Analysis options
   * @returns {Array} Outlier posts
   */
  identifyVelocityOutliers(posts, options = {}) {
    const {
      multiplier = VELOCITY_THRESHOLDS.OUTLIER_MULTIPLIER,
      minHours = 1,
      platform = 'all'
    } = options;

    if (!posts || posts.length < 3) {
      return [];
    }

    logger.debug('Analyzing velocity outliers', {
      postCount: posts.length,
      platform,
      multiplier
    });

    // Calculate velocity for all posts
    const postsWithVelocity = posts
      .filter(post => post.views && post.createdAt)
      .map(post => ({
        ...post,
        velocity: this.calculateVelocityMetric(post)
      }))
      .filter(post => {
        const hours = post.velocity.timeElapsed;
        return hours >= minHours && hours <= 24;
      });

    if (postsWithVelocity.length < 3) {
      return [];
    }

    // Calculate baseline statistics
    const velocities = postsWithVelocity.map(p => p.velocity.viewsPerHour);
    const baseline = this.calculateBaselineStats(velocities);

    // Identify outliers (posts with velocity > multiplier * stdDev above mean)
    const outliers = postsWithVelocity.filter(post => {
      const zScore = baseline.stdDev > 0
        ? (post.velocity.viewsPerHour - baseline.mean) / baseline.stdDev
        : 0;

      // Also check absolute multiplier threshold
      const velocityMultiplier = baseline.mean > 0
        ? post.velocity.viewsPerHour / baseline.mean
        : 0;

      return zScore > 2 || velocityMultiplier >= multiplier;
    });

    logger.info('Velocity outliers identified', {
      total: posts.length,
      outliers: outliers.length,
      baselineMean: baseline.mean,
      baselineStdDev: baseline.stdDev
    });

    return outliers.map(outlier => ({
      postId: outlier.id || outlier._id,
      velocity: outlier.velocity,
      zScore: baseline.stdDev > 0
        ? (outlier.velocity.viewsPerHour - baseline.mean) / baseline.stdDev
        : 0,
      multiplier: baseline.mean > 0
        ? outlier.velocity.viewsPerHour / baseline.mean
        : 0
    }));
  }

  /**
   * Calculate baseline statistics for velocity
   * @param {Array} velocities - Array of velocity values
   * @returns {Object} Baseline statistics
   */
  calculateBaselineStats(velocities) {
    if (!velocities || velocities.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, p90: 0 };
    }

    const sorted = [...velocities].sort((a, b) => a - b);
    const n = sorted.length;

    // Mean
    const mean = sorted.reduce((sum, v) => sum + v, 0) / n;

    // Median
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Standard deviation
    const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 90th percentile
    const p90Index = Math.floor(n * 0.9);
    const p90 = sorted[p90Index];

    return { mean, median, stdDev, p90, count: n };
  }

  /**
   * Get baseline velocity for a platform/topic
   * @param {Object} filters - Filters for baseline calculation
   * @returns {Promise<Object>} Baseline statistics
   */
  async getBaselineVelocity(filters = {}) {
    const {
      platform = 'all',
      topic,
      hours = 24
    } = filters;

    const cacheKey = `${platform}-${topic || 'all'}-${hours}`;
    const cached = this.baselineCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Calculate baseline from recent trend metrics
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const metrics = await MarketingBookTrendMetrics.find({
        platform,
        timestamp: { $gte: cutoffDate },
        engagementVelocity: { $exists: true, $ne: null }
      })
        .select('engagementVelocity avgEngagementRate')
        .lean();

      if (!metrics || metrics.length === 0) {
        return { mean: 0, median: 0, stdDev: 0, p90: 0 };
      }

      const velocities = metrics
        .map(m => m.engagementVelocity)
        .filter(v => v != null && !isNaN(v));

      const baseline = this.calculateBaselineStats(velocities);

      // Cache the result
      this.baselineCache.set(cacheKey, {
        timestamp: Date.now(),
        data: baseline
      });

      return baseline;

    } catch (error) {
      logger.error('Error getting baseline velocity', {
        error: error.message,
        filters
      });
      return { mean: 0, median: 0, stdDev: 0, p90: 0 };
    }
  }

  /**
   * Track velocity for an entity over time
   * @param {string} entityType - Entity type (book, trope, hashtag, etc.)
   * @param {string} entityId - Entity ID
   * @param {number} hours - Time window in hours
   * @returns {Promise<Array>} Velocity history
   */
  async trackEntityVelocity(entityType, entityId, hours = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const metrics = await MarketingBookTrendMetrics.find({
        entityType,
        entityId,
        timestamp: { $gte: cutoffDate }
      })
        .sort({ timestamp: 1 })
        .select('timestamp engagementVelocity avgEngagementRate mentionCount')
        .lean();

      return metrics.map(m => ({
        timestamp: m.timestamp,
        velocity: m.engagementVelocity,
        engagement: m.avgEngagementRate,
        mentions: m.mentionCount
      }));

    } catch (error) {
      logger.error('Error tracking entity velocity', {
        error: error.message,
        entityType,
        entityId
      });
      return [];
    }
  }

  /**
   * Detect emerging trends from velocity outliers
   * @param {Array} posts - Posts to analyze
   * @returns {Promise<Array>} Emerging trends
   */
  async detectEmergingTrends(posts) {
    const outliers = this.identifyVelocityOutliers(posts);

    if (outliers.length === 0) {
      return [];
    }

    // Group outliers by common attributes to identify trends
    const trendGroups = new Map();

    for (const outlier of outliers) {
      // This would need full post data to extract attributes
      // For now, just return the outliers
      trendGroups.set(outlier.postId, {
        postId: outlier.postId,
        velocity: outlier.velocity,
        confidence: Math.min(1, outlier.multiplier / 3)
      });
    }

    return Array.from(trendGroups.values()).sort((a, b) =>
      b.velocity.viewsPerHour - a.velocity.viewsPerHour
    );
  }

  /**
   * Clear the baseline cache
   */
  clearCache() {
    this.baselineCache.clear();
    logger.info('Velocity tracker cache cleared');
  }

  /**
   * Get cache status
   * @returns {Object} Cache status
   */
  getCacheStatus() {
    return {
      size: this.baselineCache.size,
      keys: Array.from(this.baselineCache.keys()),
      expiry: this.cacheExpiry
    };
  }
}

// Export singleton instance
const engagementVelocityTracker = new EngagementVelocityTracker();
export default engagementVelocityTracker;
