/**
 * Engagement Outlier Detector
 *
 * Compares post engagement to baseline averages.
 * Identifies statistically significant winners (z-score > 2).
 * Pattern-matches WHY they won (hook analysis, hashtags, topic).
 *
 * Uses z-score with confidence intervals for statistical significance.
 */

import { getLogger } from '../../../utils/logger.js';
import MarketingBookTrendMetrics from '../../../models/MarketingBookTrendMetrics.js';
import MarketingHookPattern from '../../../models/MarketingHookPattern.js';
import MarketingHashtagPerformance from '../../../models/MarketingHashtagPerformance.js';

const logger = getLogger('services', 'booktok-outlier-detector');

// Outlier detection thresholds
const OUTLIER_THRESHOLDS = {
  Z_SCORE_SIGNIFICANT: 2.0, // 95% confidence
  Z_SCORE_HIGHLY_SIGNIFICANT: 3.0, // 99.7% confidence
  MIN_ENGAGEMENT_RATE: 0.1, // 0.1% minimum engagement to consider
  MIN_VIEWS: 1000 // Minimum views to consider
};

class EngagementOutlierDetector {
  constructor() {
    this.baselineCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Detect outliers from a set of posts
   * @param {Array} posts - Array of post data
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Outlier posts with analysis
   */
  async detectOutliers(posts, options = {}) {
    const {
      platform = 'all',
      topic,
      minZScore = OUTLIER_THRESHOLDS.Z_SCORE_SIGNIFICANT,
      minViews = OUTLIER_THRESHOLDS.MIN_VIEWS,
      includePatternAnalysis = true
    } = options;

    if (!posts || posts.length < 3) {
      return [];
    }

    logger.info('Detecting engagement outliers', {
      postCount: posts.length,
      platform,
      minZScore
    });

    try {
      // Get baseline statistics
      const baseline = await this.calculateBaselineStats(platform, topic);

      if (!baseline || baseline.count === 0) {
        logger.warn('No baseline data available');
        return [];
      }

      // Calculate z-scores for each post
      const postsWithZScore = posts
        .filter(post => {
          const views = post.views || post.performanceMetrics?.views || 0;
          const engagement = post.engagementRate || post.performanceMetrics?.engagementRate || 0;
          return views >= minViews && engagement >= OUTLIER_THRESHOLDS.MIN_ENGAGEMENT_RATE;
        })
        .map(post => {
          const engagement = post.engagementRate || post.performanceMetrics?.engagementRate || 0;
          const views = post.views || post.performanceMetrics?.views || 0;

          const zScore = baseline.stdDev > 0
            ? (engagement - baseline.meanEngagementRate) / baseline.stdDev
            : 0;

          return {
            ...post,
            zScore,
            isOutlier: Math.abs(zScore) >= minZScore,
            isHighOutlier: zScore >= minZScore,
            isLowOutlier: zScore <= -minZScore,
            engagement,
            views
          };
        });

      // Filter to outliers only
      const outliers = postsWithZScore.filter(p => p.isOutlier);

      logger.info('Outliers detected', {
        total: posts.length,
        outliers: outliers.length,
        highOutliers: outliers.filter(p => p.isHighOutlier).length,
        lowOutliers: outliers.filter(p => p.isLowOutlier).length
      });

      // Analyze patterns for high outliers if requested
      if (includePatternAnalysis) {
        for (const outlier of outliers.filter(o => o.isHighOutlier)) {
          outlier.patternAnalysis = await this.analyzeWinningPatterns(outlier, baseline);
        }
      }

      return outliers;

    } catch (error) {
      logger.error('Error detecting outliers', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Calculate baseline statistics for a platform/topic
   * @param {string} platform - Platform name
   * @param {string} topic - Optional topic filter
   * @returns {Promise<Object>} Baseline statistics
   */
  async calculateBaselineStats(platform = 'all', topic = null) {
    const cacheKey = `${platform}-${topic || 'all'}`;
    const cached = this.baselineCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Last 7 days

      const query = {
        timestamp: { $gte: cutoffDate },
        avgEngagementRate: { $gt: 0 }
      };

      if (platform !== 'all') {
        query.platform = platform;
      }

      const metrics = await MarketingBookTrendMetrics
        .find(query)
        .select('avgEngagementRate mentionCount')
        .lean();

      if (!metrics || metrics.length === 0) {
        return { mean: 0, stdDev: 0, median: 0, count: 0 };
      }

      const engagementRates = metrics.map(m => m.avgEngagementRate);

      const baseline = this.calculateStatistics(engagementRates);

      // Cache the result
      this.baselineCache.set(cacheKey, {
        timestamp: Date.now(),
        data: { ...baseline, count: metrics.length }
      });

      return baseline;

    } catch (error) {
      logger.error('Error calculating baseline stats', {
        error: error.message,
        platform,
        topic
      });
      return { mean: 0, stdDev: 0, median: 0, count: 0 };
    }
  }

  /**
   * Calculate statistical measures
   * @param {Array} values - Array of numeric values
   * @returns {Object} Statistics
   */
  calculateStatistics(values) {
    if (!values || values.length === 0) {
      return { mean: 0, stdDev: 0, median: 0, p25: 0, p75: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    // Mean
    const mean = sorted.reduce((sum, v) => sum + v, 0) / n;

    // Median
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Standard deviation (sample)
    const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1 || 1);
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const p25 = sorted[Math.floor(n * 0.25)];
    const p75 = sorted[Math.floor(n * 0.75)];

    return { mean, stdDev, median, p25, p75 };
  }

  /**
   * Analyze why a post performed well
   * @param {Object} post - Outlier post data
   * @param {Object} baseline - Baseline statistics
   * @returns {Promise<Object>} Pattern analysis
   */
  async analyzeWinningPatterns(post, baseline) {
    const patterns = {
      hook: null,
      hashtags: [],
      timing: null,
      topic: null,
      overall: []
    };

    try {
      // Analyze hook
      if (post.hook || post.caption) {
        const hookAnalysis = await this.analyzeHookPattern(post.hook || post.caption);
        patterns.hook = hookAnalysis;
        if (hookAnalysis.likelyContributor) {
          patterns.overall.push('Strong hook pattern');
        }
      }

      // Analyze hashtags
      if (post.hashtags) {
        const hashtagAnalysis = await this.analyzeHashtagPattern(post.hashtags, baseline);
        patterns.hashtags = hashtagAnalysis;
        if (hashtagAnalysis.likelyContributor) {
          patterns.overall.push('Effective hashtag combination');
        }
      }

      // Analyze timing
      if (post.postedAt || post.scheduledAt) {
        const timingAnalysis = this.analyzeTimingPattern(post.postedAt || post.scheduledAt);
        patterns.timing = timingAnalysis;
        if (timingAnalysis.isOptimal) {
          patterns.overall.push('Optimal posting time');
        }
      }

      // Analyze topic
      if (post.topic || post.storyCategory) {
        const topicAnalysis = await this.analyzeTopicPattern(post.topic || post.storyCategory);
        patterns.topic = topicAnalysis;
        if (topicAnalysis.isTrending) {
          patterns.overall.push('Trending topic');
        }
      }

    } catch (error) {
      logger.error('Error analyzing winning patterns', {
        error: error.message
      });
    }

    return patterns;
  }

  /**
   * Analyze hook pattern
   * @param {string} hook - Hook text
   * @returns {Promise<Object>} Hook analysis
   */
  async analyzeHookPattern(hook) {
    if (!hook) return { likelyContributor: false };

    try {
      // Check against known high-performing hooks
      const similarHooks = await MarketingHookPattern
        .find({
          active: true,
          hookTemplate: { $regex: hook.substring(0, 50), $options: 'i' }
        })
        .sort({ avgEngagementRate: -1 })
        .limit(3)
        .lean();

      if (similarHooks.length > 0) {
        const avgHookPerformance = similarHooks.reduce((sum, h) => sum + h.avgEngagementRate, 0) / similarHooks.length;
        return {
          likelyContributor: avgHookPerformance > 8,
          similarHooks: similarHooks.map(h => ({
            template: h.hookTemplate,
            performance: h.avgEngagementRate
          })),
          avgPerformance: avgHookPerformance
        };
      }

      // Analyze hook structure
      const structure = this.analyzeHookStructure(hook);
      return {
        likelyContributor: structure.hasQuestion || structure.isControversial,
        structure
      };

    } catch (error) {
      logger.error('Error analyzing hook pattern', { error: error.message });
      return { likelyContributor: false };
    }
  }

  /**
   * Analyze hook structure
   * @param {string} hook - Hook text
   * @returns {Object} Structure analysis
   */
  analyzeHookStructure(hook) {
    const lowerHook = hook.toLowerCase();

    return {
      hasQuestion: lowerHook.includes('?'),
      hasNumber: /\d+/.test(hook),
      length: hook.length,
      category: this.categorizeHook(hook),
      isControversial: this.isControversial(hook),
      isEmotional: this.isEmotional(hook)
    };
  }

  /**
   * Categorize hook type
   * @param {string} hook - Hook text
   * @returns {string} Category
   */
  categorizeHook(hook) {
    const lowerHook = hook.toLowerCase();

    if (lowerHook.includes('?')) return 'question';
    if (lowerHook.includes('confess') || lowerHook.includes('admit')) return 'confession';
    if (lowerHook.includes('opinion') || lowerHook.includes('think') || lowerHook.includes('believe')) return 'opinion';
    if (lowerHook.includes('stop') || lowerHook.includes('need') || lowerHook.includes('why')) return 'challenge';
    if (lowerHook.includes('best') || lowerHook.includes('top') || lowerHook.includes('favorite')) return 'recommendation';

    return 'statement';
  }

  /**
   * Check if hook is controversial
   * @param {string} hook - Hook text
   * @returns {boolean} Is controversial
   */
  isControversial(hook) {
    const controversialWords = ['controversial', 'unpopular opinion', 'hot take', 'hate', 'love', 'overrated', 'underrated'];
    const lowerHook = hook.toLowerCase();
    return controversialWords.some(word => lowerHook.includes(word));
  }

  /**
   * Check if hook is emotional
   * @param {string} hook - Hook text
   * @returns {boolean} Is emotional
   */
  isEmotional(hook) {
    const emotionalWords = ['love', 'hate', 'obsessed', 'can\'t stop', 'heartbreaking', 'devastating', 'incredible', 'amazing'];
    const lowerHook = hook.toLowerCase();
    return emotionalWords.some(word => lowerHook.includes(word));
  }

  /**
   * Analyze hashtag pattern
   * @param {Object} hashtags - Hashtag object
   * @param {Object} baseline - Baseline stats
   * @returns {Promise<Object>} Hashtag analysis
   */
  async analyzeHashtagPattern(hashtags, baseline) {
    const hashtagArray = Array.isArray(hashtags)
      ? hashtags
      : hashtags.tiktok || hashtags.instagram || hashtags.all || [];

    if (hashtagArray.length === 0) {
      return { likelyContributor: false };
    }

    try {
      // Get performance data for hashtags
      const hashtagPerf = await MarketingHashtagPerformance
        .find({
          hashtag: { $in: hashtagArray.map(h => h.replace('#', '')) },
          active: true
        })
        .lean();

      if (hashtagPerf.length === 0) {
        return { likelyContributor: false };
      }

      const avgHashtagPerformance = hashtagPerf.reduce((sum, h) => sum + h.engagementRate, 0) / hashtagPerf.length;
      const hasHighPerformer = hashtagPerf.some(h => h.engagementRate > baseline.meanEngagementRate * 1.5);

      return {
        likelyContributor: hasHighPerformer,
        avgPerformance: avgHashtagPerformance,
        topPerformers: hashtagPerf
          .sort((a, b) => b.engagementRate - a.engagementRate)
          .slice(0, 3)
          .map(h => ({
            hashtag: h.hashtag,
            performance: h.engagementRate
          }))
      };

    } catch (error) {
      logger.error('Error analyzing hashtag pattern', { error: error.message });
      return { likelyContributor: false };
    }
  }

  /**
   * Analyze timing pattern
   * @param {Date} postedAt - Post timestamp
   * @returns {Object} Timing analysis
   */
  analyzeTimingPattern(postedAt) {
    if (!postedAt) return { isOptimal: false };

    const date = new Date(postedAt);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Typical optimal times (would be better derived from data)
    const optimalHours = [9, 10, 12, 15, 18, 19, 20, 21];
    const optimalDays = [0, 1, 2, 3, 4]; // Weekdays

    return {
      isOptimal: optimalHours.includes(hour),
      hour,
      dayOfWeek,
      isWeekday: optimalDays.includes(dayOfWeek)
    };
  }

  /**
   * Analyze topic pattern
   * @param {string} topic - Topic name
   * @returns {Promise<Object>} Topic analysis
   */
  async analyzeTopicPattern(topic) {
    if (!topic) return { isTrending: false };

    try {
      const topicMetrics = await MarketingBookTrendMetrics
        .findOne({
          entityType: 'topic',
          entityName: topic
        })
        .sort({ timestamp: -1 })
        .lean();

      if (!topicMetrics) {
        return { isTrending: false };
      }

      return {
        isTrending: topicMetrics.trendDirection === 'rising',
        direction: topicMetrics.trendDirection,
        velocity: topicMetrics.trendVelocity
      };

    } catch (error) {
      logger.error('Error analyzing topic pattern', { error: error.message });
      return { isTrending: false };
    }
  }

  /**
   * Clear the baseline cache
   */
  clearCache() {
    this.baselineCache.clear();
    logger.info('Outlier detector cache cleared');
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
const engagementOutlierDetector = new EngagementOutlierDetector();
export default engagementOutlierDetector;
