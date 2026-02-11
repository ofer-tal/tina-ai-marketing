/**
 * Frequency Spike Detector
 *
 * Tracks mentions of books, topics, tropes, hashtags over time.
 * Detects sudden frequency increases (configurable threshold, default 200%+).
 *
 * Example: "Fourth Wing" mentions up 300% this week.
 */

import { getLogger } from '../../../utils/logger.js';
import MarketingBookTrendMetrics from '../../../models/MarketingBookTrendMetrics.js';

const logger = getLogger('services', 'booktok-spike-detector');

// Spike detection thresholds
const SPIKE_THRESHOLDS = {
  MIN_MENTION_COUNT: 5, // Minimum mentions to consider
  DEFAULT_SPIKE_PERCENTAGE: 200, // 200% increase = 3x
  EXTREME_SPIKE_PERCENTAGE: 500, // 500% increase = 6x
  MIN_ABSOLUTE_INCREASE: 3 // Minimum absolute increase in mentions
};

// Time windows for comparison
const COMPARISON_WINDOWS = {
  HOURLY: { current: 1, baseline: 24 }, // Compare last hour to last 24h average
  DAILY: { current: 24, baseline: 168 }, // Compare last day to last week average
  WEEKLY: { current: 168, baseline: 720 } // Compare last week to last month average
};

class FrequencySpikeDetector {
  constructor() {
    this.spikeCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Detect spikes for a specific entity type
   * @param {string} entityType - Entity type (book, topic, trope, hashtag, etc.)
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Detected spikes
   */
  async detectSpikes(entityType, options = {}) {
    const {
      platform = 'all',
      timeWindow = 'daily', // hourly, daily, weekly
      minSpikePercentage = SPIKE_THRESHOLDS.DEFAULT_SPIKE_PERCENTAGE,
      minMentionCount = SPIKE_THRESHOLDS.MIN_MENTION_COUNT,
      limit = 50
    } = options;

    try {
      logger.info('Detecting frequency spikes', {
        entityType,
        platform,
        timeWindow,
        minSpikePercentage
      });

      const window = COMPARISON_WINDOWS[timeWindow.toUpperCase()] || COMPARISON_WINDOWS.DAILY;
      const now = new Date();
      const currentWindowStart = new Date(now.getTime() - window.current * 60 * 60 * 1000);
      const baselineWindowStart = new Date(now.getTime() - window.baseline * 60 * 60 * 1000);

      // Get metrics for current window
      const currentMetrics = await this.getMetricsForWindow(
        entityType,
        platform,
        currentWindowStart,
        now
      );

      // Get metrics for baseline window
      const baselineMetrics = await this.getMetricsForWindow(
        entityType,
        platform,
        baselineWindowStart,
        currentWindowStart
      );

      // Calculate baseline averages
      const baselineAverages = this.calculateBaselineAverages(baselineMetrics);

      // Detect spikes
      const spikes = [];

      for (const current of currentMetrics) {
        const baseline = baselineAverages.get(current.entityId);

        if (!baseline || baseline.avgMentions < minMentionCount) {
          continue;
        }

        const spikeScore = this.calculateSpikeScore(
          current.mentionCount,
          baseline.avgMentions
        );

        if (spikeScore.percentageIncrease >= minSpikePercentage &&
            spikeScore.absoluteIncrease >= SPIKE_THRESHOLDS.MIN_ABSOLUTE_INCREASE) {
          spikes.push({
            entityType: current.entityType,
            entityId: current.entityId,
            entityName: current.entityName,
            platform: current.platform,
            currentMentions: current.mentionCount,
            baselineMentions: baseline.avgMentions,
            percentageIncrease: spikeScore.percentageIncrease,
            absoluteIncrease: spikeScore.absoluteIncrease,
            spikeScore: spikeScore.score,
            severity: this.calculateSeverity(spikeScore.percentageIncrease),
            timeWindow,
            detectedAt: now
          });
        }
      }

      // Sort by spike score
      spikes.sort((a, b) => b.spikeScore - a.spikeScore);

      // Limit results
      const limitedSpikes = spikes.slice(0, limit);

      logger.info('Spikes detected', {
        entityType,
        platform,
        detected: limitedSpikes.length,
        topSpike: limitedSpikes[0]?.entityName || 'none'
      });

      return limitedSpikes;

    } catch (error) {
      logger.error('Error detecting spikes', {
        error: error.message,
        entityType
      });
      return [];
    }
  }

  /**
   * Get metrics for a specific time window
   * @param {string} entityType - Entity type
   * @param {string} platform - Platform
   * @param {Date} startDate - Start of window
   * @param {Date} endDate - End of window
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsForWindow(entityType, platform, startDate, endDate) {
    try {
      const metrics = await MarketingBookTrendMetrics.aggregate([
        {
          $match: {
            entityType,
            platform,
            timestamp: { $gte: startDate, $lt: endDate }
          }
        },
        {
          $group: {
            _id: '$entityId',
            entityId: { $first: '$entityId' },
            entityName: { $first: '$entityName' },
            entityType: { $first: '$entityType' },
            platform: { $first: '$platform' },
            totalMentions: { $sum: '$mentionCount' },
            avgEngagementRate: { $avg: '$avgEngagementRate' },
            dataPoints: { $sum: 1 }
          }
        }
      ]);

      return metrics.map(m => ({
        entityId: m.entityId,
        entityName: m.entityName,
        entityType: m.entityType,
        platform: m.platform,
        mentionCount: m.totalMentions,
        avgEngagementRate: m.avgEngagementRate,
        dataPoints: m.dataPoints
      }));

    } catch (error) {
      logger.error('Error getting metrics for window', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Calculate baseline averages from metrics
   * @param {Array} metrics - Array of metrics
   * @returns {Map} Map of entityId to baseline data
   */
  calculateBaselineAverages(metrics) {
    const baselineMap = new Map();

    // Group by entity
    const entityGroups = new Map();
    for (const metric of metrics) {
      if (!entityGroups.has(metric.entityId)) {
        entityGroups.set(metric.entityId, []);
      }
      entityGroups.get(metric.entityId).push(metric);
    }

    // Calculate averages
    for (const [entityId, entityMetrics] of entityGroups) {
      const totalMentions = entityMetrics.reduce((sum, m) => sum + m.mentionCount, 0);
      const avgMentions = totalMentions / entityMetrics.length;
      const avgEngagement = entityMetrics.reduce((sum, m) => sum + m.avgEngagementRate, 0) / entityMetrics.length;

      baselineMap.set(entityId, {
        entityId,
        avgMentions,
        avgEngagementRate: avgEngagement,
        dataPoints: entityMetrics.length
      });
    }

    return baselineMap;
  }

  /**
   * Calculate spike score
   * @param {number} currentAvg - Current average mentions
   * @param {number} baselineAvg - Baseline average mentions
   * @returns {Object} Spike score data
   */
  calculateSpikeScore(currentAvg, baselineAvg) {
    if (baselineAvg === 0) {
      return {
        score: currentAvg > 0 ? 100 : 0,
        percentageIncrease: currentAvg > 0 ? Infinity : 0,
        absoluteIncrease: currentAvg
      };
    }

    const absoluteIncrease = currentAvg - baselineAvg;
    const percentageIncrease = (absoluteIncrease / baselineAvg) * 100;

    // Calculate a normalized score (0-100)
    // Logarithmic scale to handle extreme spikes
    let score = Math.min(100, Math.log10(percentageIncrease + 1) * 20);

    return {
      score: Math.round(score),
      percentageIncrease: Math.round(percentageIncrease),
      absoluteIncrease: Math.round(absoluteIncrease)
    };
  }

  /**
   * Calculate severity level
   * @param {number} percentageIncrease - Percentage increase
   * @returns {string} Severity level
   */
  calculateSeverity(percentageIncrease) {
    if (percentageIncrease >= SPIKE_THRESHOLDS.EXTREME_SPIKE_PERCENTAGE) {
      return 'extreme';
    } else if (percentageIncrease >= SPIKE_THRESHOLDS.DEFAULT_SPIKE_PERCENTAGE * 1.5) {
      return 'high';
    } else if (percentageIncrease >= SPIKE_THRESHOLDS.DEFAULT_SPIKE_PERCENTAGE) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get all spikes across entity types
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Spikes by entity type
   */
  async getAllSpikes(options = {}) {
    const entityTypes = ['book', 'topic', 'trope', 'hashtag', 'hook'];
    const results = {};

    for (const entityType of entityTypes) {
      try {
        results[entityType] = await this.detectSpikes(entityType, options);
      } catch (error) {
        logger.error(`Error detecting spikes for ${entityType}`, {
          error: error.message
        });
        results[entityType] = [];
      }
    }

    return results;
  }

  /**
   * Get top trending entities
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top trending entities
   */
  async getTopTrending(options = {}) {
    const {
      entityType,
      platform = 'all',
      limit = 20
    } = options;

    if (entityType) {
      return await this.detectSpikes(entityType, { ...options, limit });
    }

    // Get all spikes and merge
    const allSpikes = await this.getAllSpikes(options);
    const mergedSpikes = [];

    for (const spikes of Object.values(allSpikes)) {
      mergedSpikes.push(...spikes);
    }

    // Sort by spike score and limit
    mergedSpikes.sort((a, b) => b.spikeScore - a.spikeScore);

    return mergedSpikes.slice(0, limit);
  }

  /**
   * Check if a specific entity is spiking
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} options - Check options
   * @returns {Promise<Object|null>} Spike data if spiking
   */
  async checkEntitySpike(entityType, entityId, options = {}) {
    const spikes = await this.detectSpikes(entityType, options);
    return spikes.find(s => s.entityId === entityId) || null;
  }

  /**
   * Get spike history for an entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {number} days - History in days
   * @returns {Promise<Array>} Spike history
   */
  async getSpikeHistory(entityType, entityId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const metrics = await MarketingBookTrendMetrics.find({
        entityType,
        entityId,
        timestamp: { $gte: startDate, $lte: endDate }
      })
        .sort({ timestamp: 1 })
        .select('timestamp mentionCount trendVelocity trendDirection')
        .lean();

      return metrics.map(m => ({
        timestamp: m.timestamp,
        mentions: m.mentionCount,
        velocity: m.trendVelocity,
        direction: m.trendDirection
      }));

    } catch (error) {
      logger.error('Error getting spike history', {
        error: error.message,
        entityType,
        entityId
      });
      return [];
    }
  }

  /**
   * Clear the spike cache
   */
  clearCache() {
    this.spikeCache.clear();
    logger.info('Spike detector cache cleared');
  }

  /**
   * Get cache status
   * @returns {Object} Cache status
   */
  getCacheStatus() {
    return {
      size: this.spikeCache.size,
      keys: Array.from(this.spikeCache.keys()),
      expiry: this.cacheExpiry
    };
  }
}

// Export singleton instance
const frequencySpikeDetector = new FrequencySpikeDetector();
export default frequencySpikeDetector;
