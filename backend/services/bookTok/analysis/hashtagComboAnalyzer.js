/**
 * Hashtag Combination Analyzer
 *
 * Tracks performance of hashtag combinations.
 * Identifies new winning combinations as they emerge.
 *
 * Example: "#booktok + #enemiestolovers = 85% above average"
 */

import { getLogger } from '../../../utils/logger.js';
import MarketingHashtagPerformance from '../../../models/MarketingHashtagPerformance.js';
import MarketingPost from '../../../models/MarketingPost.js';

const logger = getLogger('services', 'booktok-hashtag-combo');

// Analysis thresholds
const COMBO_THRESHOLDS = {
  MIN_SAMPLE_SIZE: 5,
  SYNERGY_THRESHOLD: 1.2, // 20% better than expected
  WINNING_MULTIPLIER: 1.5, // 50% better than average
  MAX_COMBO_SIZE: 5 // Maximum hashtags in a combination
};

class HashtagComboAnalyzer {
  constructor() {
    this.comboCache = new Map();
    this.cacheExpiry = 2 * 60 * 60 * 1000; // 2 hours
  }

  /**
   * Analyze performance of a hashtag combination
   * @param {Array<string>} hashtags - Array of hashtags
   * @param {string} platform - Platform name
   * @returns {Promise<Object>} Combination analysis
   */
  async analyzeCombinationPerformance(hashtags, platform = 'tiktok') {
    if (!hashtags || hashtags.length < 2) {
      return {
        isValid: false,
        error: 'Need at least 2 hashtags'
      };
    }

    try {
      // Clean hashtags
      const cleanTags = hashtags
        .map(h => h.replace('#', '').toLowerCase())
        .slice(0, COMBO_THRESHOLDS.MAX_COMBO_SIZE);

      const comboKey = `${platform}:${cleanTags.sort().join(',')}`;

      // Check cache
      const cached = this.comboCache.get(comboKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      // Get individual hashtag performance
      const individualPerf = await MarketingHashtagPerformance
        .find({
          hashtag: { $in: cleanTags },
          platform,
          active: true
        })
        .lean();

      if (individualPerf.length === 0) {
        const result = {
          isValid: true,
          hashtags: cleanTags,
          platform,
          hasData: false,
          message: 'No performance data available'
        };

        this.comboCache.set(comboKey, { timestamp: Date.now(), data: result });
        return result;
      }

      // Calculate expected performance (average of individual)
      const avgEngagementRate = individualPerf.reduce((sum, h) => sum + h.engagementRate, 0) / individualPerf.length;
      const avgViews = individualPerf.reduce((sum, h) => sum + h.avgViews, 0) / individualPerf.length;

      // Find actual combination performance from posts
      const comboPerf = await this.findActualCombinationPerformance(cleanTags, platform);

      // Calculate synergy score
      let synergyScore = 1;
      let hasActualData = false;

      if (comboPerf && comboPerf.sampleSize >= COMBO_THRESHOLDS.MIN_SAMPLE_SIZE) {
        hasActualData = true;
        const actualAvg = comboPerf.avgEngagementRate || 0;
        synergyScore = avgEngagementRate > 0 ? actualAvg / avgEngagementRate : 1;
      }

      // Check for winning combinations
      const isWinning = synergyScore >= COMBO_THRESHOLDS.WINNING_MULTIPLIER;
      const hasSynergy = synergyScore >= COMBO_THRESHOLDS.SYNERGY_THRESHOLD;

      // Find best paired hashtags from individual data
      const bestPaired = individualPerf
        .flatMap(h => h.bestPairedWith || [])
        .filter(p => cleanTags.includes(p.hashtag));

      const result = {
        isValid: true,
        hashtags: cleanTags,
        platform,
        hasData: true,
        hasActualData,
        expectedPerformance: {
          engagementRate: avgEngagementRate,
          views: avgViews
        },
        actualPerformance: comboPerf ? {
          engagementRate: comboPerf.avgEngagementRate,
          views: comboPerf.avgViews,
          sampleSize: comboPerf.sampleSize
        } : null,
        synergyScore,
        hasSynergy,
        isWinning,
        recommendation: this.getRecommendation(synergyScore, hasActualData),
        individualPerformance: individualPerf.map(h => ({
          hashtag: h.hashtag,
          engagementRate: h.engagementRate,
          views: h.avgViews
        })),
        riskFactors: this.assessRiskFactors(individualPerf)
      };

      // Cache result
      this.comboCache.set(comboKey, { timestamp: Date.now(), data: result });

      return result;

    } catch (error) {
      logger.error('Error analyzing hashtag combination', {
        error: error.message,
        hashtags
      });
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Find actual combination performance from posts
   * @param {Array<string>} hashtags - Cleaned hashtags
   * @param {string} platform - Platform
   * @returns {Promise<Object|null>} Combination performance
   */
  async findActualCombinationPerformance(hashtags, platform) {
    try {
      // Find posts that contain all these hashtags
      // This is simplified - actual implementation would query posts
      // and aggregate their performance

      // For now, return placeholder
      // In production, would query MarketingPost for posts with all hashtags
      // and aggregate their performanceMetrics

      return null;

    } catch (error) {
      logger.error('Error finding combination performance', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Find winning hashtag combinations
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Winning combinations
   */
  async findWinningCombinations(options = {}) {
    const {
      platform = 'tiktok',
      minSynergy = COMBO_THRESHOLDS.WINNING_MULTIPLIER,
      minSampleSize = COMBO_THRESHOLDS.MIN_SAMPLE_SIZE,
      limit = 20
    } = options;

    try {
      logger.info('Finding winning hashtag combinations', {
        platform,
        minSynergy
      });

      // Get hashtags with high performance
      const topHashtags = await MarketingHashtagPerformance
        .find({
          platform,
          active: true,
          engagementRate: { $gte: 5 }
        })
        .sort({ engagementRate: -1 })
        .limit(20)
        .lean();

      const winningCombos = [];

      // Analyze combinations of top hashtags
      for (let i = 0; i < topHashtags.length; i++) {
        for (let j = i + 1; j < topHashtags.length; j++) {
          const combo = await this.analyzeCombinationPerformance(
            [topHashtags[i].hashtag, topHashtags[j].hashtag],
            platform
          );

          if (combo.hasSynergy && combo.synergyScore >= minSynergy) {
            winningCombos.push({
              hashtags: combo.hashtags,
              synergyScore: combo.synergyScore,
              expectedEngagement: combo.expectedPerformance.engagementRate,
              actualEngagement: combo.actualPerformance?.engagementRate,
              sampleSize: combo.actualPerformance?.sampleSize || 0
            });
          }
        }
      }

      // Sort by synergy score
      winningCombos.sort((a, b) => b.synergyScore - a.synergyScore);

      return winningCombos.slice(0, limit);

    } catch (error) {
      logger.error('Error finding winning combinations', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get recommendation for combination
   * @param {number} synergyScore - Synergy score
   * @param {boolean} hasActualData - Whether actual data exists
   * @returns {string} Recommendation
   */
  getRecommendation(synergyScore, hasActualData) {
    if (!hasActualData) {
      return 'No historical data - test this combination';
    }

    if (synergyScore >= 1.5) {
      return 'Excellent combination - highly recommended';
    } else if (synergyScore >= 1.2) {
      return 'Good combination - above average performance';
    } else if (synergyScore >= 0.9) {
      return 'Average performance - acceptable to use';
    } else {
      return 'Below average - consider alternative hashtags';
    }
  }

  /**
   * Assess risk factors for combination
   * @param {Array} individualPerf - Individual hashtag performance
   * @returns {Array} Risk factors
   */
  assessRiskFactors(individualPerf) {
    const risks = [];

    for (const tag of individualPerf) {
      // Check saturation
      if (tag.overuseRisk?.level === 'saturated') {
        risks.push({
          type: 'saturation',
          hashtag: tag.hashtag,
          message: `"${tag.hashtag}" is highly saturated`
        });
      } else if (tag.overuseRisk?.level === 'high') {
        risks.push({
          type: 'saturation',
          hashtag: tag.hashtag,
          message: `"${tag.hashtag}" has high overuse risk`
        });
      }

      // Check declining trend
      if (tag.trendDirection === 'falling') {
        risks.push({
          type: 'declining',
          hashtag: tag.hashtag,
          message: `"${tag.hashtag}" is declining in popularity`
        });
      }
    }

    return risks;
  }

  /**
   * Optimize hashtags for a topic
   * @param {string} topic - Content topic
   * @param {string} platform - Platform
   * @param {number} count - Desired hashtag count
   * @returns {Promise<Array>} Optimized hashtag set
   */
  async optimizeHashtagsForTopic(topic, platform = 'tiktok', count = 5) {
    try {
      // Get trending hashtags for platform
      const trendingHashtags = await MarketingHashtagPerformance
        .find({
          platform,
          active: true,
          'overuseRisk.level': { $in: ['low', 'medium'] }
        })
        .sort({ engagementRate: -1, 'overuseRisk.saturationScore': 1 })
        .limit(count * 2)
        .lean();

      if (trendingHashtags.length === 0) {
        return [];
      }

      // If topic is specified, try to find relevant hashtags
      if (topic) {
        const topicLower = topic.toLowerCase();

        // Score hashtags by relevance
        const scoredHashtags = trendingHashtags.map(tag => {
          let relevanceScore = 0;

          // Check if category matches
          if (tag.category && tag.category.includes(topicLower)) {
            relevanceScore += 10;
          }

          // Check if hashtag contains topic words
          if (tag.hashtag.includes(topicLower)) {
            relevanceScore += 5;
          }

          return {
            ...tag,
            relevanceScore
          };
        });

        // Sort by combined score (engagement + relevance)
        scoredHashtags.sort((a, b) => {
          const scoreA = a.engagementRate + a.relevanceScore;
          const scoreB = b.engagementRate + b.relevanceScore;
          return scoreB - scoreA;
        });

        return scoredHashtags.slice(0, count).map(h => h.hashtag);
      }

      // Return top performing low-saturation hashtags
      return trendingHashtags.slice(0, count).map(h => h.hashtag);

    } catch (error) {
      logger.error('Error optimizing hashtags', {
        error: error.message,
        topic
      });
      return [];
    }
  }

  /**
   * Get combination statistics
   * @param {string} platform - Platform
   * @returns {Promise<Object>} Statistics
   */
  async getCombinationStatistics(platform = 'tiktok') {
    try {
      const totalHashtags = await MarketingHashtagPerformance.countDocuments({
        platform,
        active: true
      });

      const bySaturation = await MarketingHashtagPerformance.aggregate([
        { $match: { platform, active: true } },
        { $group: { _id: '$overuseRisk.level', count: { $sum: 1 } } }
      ]);

      const byTrend = await MarketingHashtagPerformance.aggregate([
        { $match: { platform, active: true } },
        { $group: { _id: '$trendDirection', count: { $sum: 1 } } }
      ]);

      return {
        totalHashtags,
        bySaturation: bySaturation.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        byTrend: byTrend.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {})
      };

    } catch (error) {
      logger.error('Error getting combination statistics', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Clear the combo cache
   */
  clearCache() {
    this.comboCache.clear();
    logger.info('Hashtag combo analyzer cache cleared');
  }

  /**
   * Get cache status
   * @returns {Object} Cache status
   */
  getCacheStatus() {
    return {
      size: this.comboCache.size,
      keys: Array.from(this.comboCache.keys()),
      expiry: this.cacheExpiry
    };
  }
}

// Export singleton instance
const hashtagComboAnalyzer = new HashtagComboAnalyzer();
export default hashtagComboAnalyzer;
