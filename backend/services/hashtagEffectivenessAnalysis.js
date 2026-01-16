import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('hashtag-effectiveness-analysis', 'hashtag-effectiveness-analysis');

/**
 * Hashtag Effectiveness Tracking Service
 *
 * Tracks and analyzes hashtag performance:
 * - Step 1: Extract hashtags from posts
 * - Step 2: Correlate with engagement
 * - Step 3: Calculate effectiveness score
 * - Step 4: Track trending hashtags
 * - Step 5: Recommend hashtag strategy
 */
class HashtagEffectivenessService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Extract hashtags from posts
   */
  async extractHashtags(filters = {}) {
    try {
      logger.info('Extracting hashtags from posts', { filters });

      const cacheKey = `extract-${JSON.stringify(filters)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.info('Returning cached hashtag extraction');
        return cached.data;
      }

      const {
        platform,
        startDate,
        endDate,
        minViews = 100
      } = filters;

      // Build query
      const query = {
        status: 'posted',
        'performanceMetrics.views': { $gte: minViews }
      };

      if (platform) {
        query.platform = platform;
      }

      if (startDate || endDate) {
        query.postedAt = {};
        if (startDate) query.postedAt.$gte = new Date(startDate);
        if (endDate) query.postedAt.$lte = new Date(endDate);
      }

      // Fetch posts with hashtags and performance data
      const posts = await MarketingPost.find(query)
        .select('hashtags platform performanceMetrics caption postedAt')
        .lean();

      logger.info('Fetched posts for hashtag extraction', { count: posts.length });

      // Extract all hashtags from all posts
      const hashtagMap = new Map(); // hashtag -> {posts, totalViews, totalLikes, totalComments, totalShares, platforms}

      posts.forEach(post => {
        const postHashtags = post.hashtags || [];
        const views = post.performanceMetrics?.views || 0;
        const likes = post.performanceMetrics?.likes || 0;
        const comments = post.performanceMetrics?.comments || 0;
        const shares = post.performanceMetrics?.shares || 0;
        const platform = post.platform;

        postHashtags.forEach(hashtag => {
          // Normalize hashtag (lowercase, remove special chars)
          const normalized = hashtag.toLowerCase().trim().replace(/^#+/, '');

          if (!hashtagMap.has(normalized)) {
            hashtagMap.set(normalized, {
              hashtag: normalized,
              postCount: 0,
              totalViews: 0,
              totalLikes: 0,
              totalComments: 0,
              totalShares: 0,
              platforms: new Set(),
              posts: []
            });
          }

          const data = hashtagMap.get(normalized);
          data.postCount++;
          data.totalViews += views;
          data.totalLikes += likes;
          data.totalComments += comments;
          data.totalShares += shares;
          data.platforms.add(platform);
          data.posts.push({
            postId: post._id,
            platform,
            views,
            likes,
            comments,
            shares,
            postedAt: post.postedAt
          });
        });
      });

      // Convert Map to array and calculate averages
      const hashtags = Array.from(hashtagMap.values()).map(h => ({
        hashtag: h.hashtag,
        postCount: h.postCount,
        totalViews: h.totalViews,
        totalLikes: h.totalLikes,
        totalComments: h.totalComments,
        totalShares: h.totalShares,
        avgViews: Math.round(h.totalViews / h.postCount),
        avgLikes: Math.round(h.totalLikes / h.postCount),
        avgComments: Math.round(h.totalComments / h.postCount),
        avgShares: Math.round(h.totalShares / h.postCount),
        avgEngagementRate: h.totalViews > 0 ? ((h.totalLikes + h.totalComments + h.totalShares) / h.totalViews) * 100 : 0,
        platforms: Array.from(h.platforms),
        posts: h.posts
      }));

      const result = {
        success: true,
        totalPosts: posts.length,
        totalUniqueHashtags: hashtags.length,
        hashtags
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      logger.info('Hashtag extraction complete', { totalHashtags: hashtags.length });

      return result;

    } catch (error) {
      logger.error('Error extracting hashtags', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 2: Correlate hashtags with engagement
   */
  async correlateWithEngagement(hashtags) {
    try {
      logger.info('Correlating hashtags with engagement', { hashtagCount: hashtags.length });

      if (!hashtags || hashtags.length === 0) {
        return {
          success: false,
          message: 'No hashtags to analyze'
        };
      }

      // Calculate engagement metrics for each hashtag
      const correlatedHashtags = hashtags.map(h => {
        const totalEngagement = h.avgLikes + h.avgComments + h.avgShares;
        const engagementScore = (totalEngagement / h.avgViews) * 100;

        return {
          ...h,
          totalEngagement: Math.round(totalEngagement),
          engagementScore: parseFloat(engagementScore.toFixed(2)),
          viralityScore: parseFloat((h.avgViews * engagementScore / 1000).toFixed(2))
        };
      });

      // Sort by engagement score
      correlatedHashtags.sort((a, b) => b.engagementScore - a.engagementScore);

      logger.info('Engagement correlation complete', { topHashtag: correlatedHashtags[0]?.hashtag });

      return {
        success: true,
        hashtags: correlatedHashtags
      };

    } catch (error) {
      logger.error('Error correlating with engagement', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 3: Calculate effectiveness score
   */
  async calculateEffectivenessScore(hashtags) {
    try {
      logger.info('Calculating effectiveness scores', { hashtagCount: hashtags.length });

      if (!hashtags || hashtags.length === 0) {
        return {
          success: false,
          message: 'No hashtags to score'
        };
      }

      // Calculate metrics for scoring
      const maxViews = Math.max(...hashtags.map(h => h.avgViews));
      const maxEngagement = Math.max(...hashtags.map(h => h.engagementScore));
      const maxVirality = Math.max(...hashtags.map(h => h.viralityScore));
      const maxPosts = Math.max(...hashtags.map(h => h.postCount));

      // Calculate effectiveness score for each hashtag
      const scoredHashtags = hashtags.map(h => {
        // Normalize metrics to 0-100 scale
        const viewScore = maxViews > 0 ? (h.avgViews / maxViews) * 100 : 0;
        const engagementScore = maxEngagement > 0 ? (h.engagementScore / maxEngagement) * 100 : 0;
        const viralityScore = maxVirality > 0 ? (h.viralityScore / maxVirality) * 100 : 0;
        const consistencyScore = maxPosts > 0 ? (h.postCount / maxPosts) * 100 : 0;

        // Weighted effectiveness score
        // Views: 25%, Engagement: 35%, Virality: 25%, Consistency: 15%
        const effectivenessScore =
          (viewScore * 0.25) +
          (engagementScore * 0.35) +
          (viralityScore * 0.25) +
          (consistencyScore * 0.15);

        return {
          ...h,
          viewScore: parseFloat(viewScore.toFixed(2)),
          engagementScore: parseFloat(engagementScore.toFixed(2)),
          viralityScore: parseFloat(viralityScore.toFixed(2)),
          consistencyScore: parseFloat(consistencyScore.toFixed(2)),
          effectivenessScore: parseFloat(effectivenessScore.toFixed(2)),
          tier: this.getEffectivenessTier(effectivenessScore)
        };
      });

      // Sort by effectiveness score
      scoredHashtags.sort((a, b) => b.effectivenessScore - a.effectivenessScore);

      logger.info('Effectiveness scoring complete', {
        topHashtag: scoredHashtags[0]?.hashtag,
        topScore: scoredHashtags[0]?.effectivenessScore
      });

      return {
        success: true,
        hashtags: scoredHashtags
      };

    } catch (error) {
      logger.error('Error calculating effectiveness scores', { error: error.message });
      throw error;
    }
  }

  /**
   * Get effectiveness tier based on score
   */
  getEffectivenessTier(score) {
    if (score >= 80) return 'S-Tier';
    if (score >= 60) return 'A-Tier';
    if (score >= 40) return 'B-Tier';
    if (score >= 20) return 'C-Tier';
    return 'D-Tier';
  }

  /**
   * Step 4: Track trending hashtags
   */
  async trackTrendingHashtags(hashtags, daysBack = 7) {
    try {
      logger.info('Tracking trending hashtags', { daysBack });

      if (!hashtags || hashtags.length === 0) {
        return {
          success: false,
          message: 'No hashtags to analyze'
        };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Analyze recent performance
      const trendingHashtags = hashtags.map(h => {
        // Filter posts from the last N days
        const recentPosts = h.posts.filter(p => new Date(p.postedAt) >= cutoffDate);

        if (recentPosts.length === 0) {
          return {
            ...h,
            recentPostCount: 0,
            recentAvgViews: 0,
            recentEngagementScore: 0,
            trendDirection: 'stable',
            trendStrength: 0
          };
        }

        const recentAvgViews = recentPosts.reduce((sum, p) => sum + p.views, 0) / recentPosts.length;
        const recentEngagement = recentPosts.reduce(
          (sum, p) => sum + (p.likes + p.comments + p.shares), 0
        ) / recentPosts.reduce((sum, p) => sum + p.views, 0) * 100;

        // Compare recent vs overall
        const viewsRatio = recentAvgViews / (h.avgViews || 1);
        const engagementRatio = recentEngagement / (h.engagementScore || 1);

        // Determine trend
        let trendDirection = 'stable';
        let trendStrength = 0;

        if (viewsRatio > 1.2 && engagementRatio > 1.1) {
          trendDirection = 'rising';
          trendStrength = Math.min(((viewsRatio + engagementRatio) / 2 - 1) * 100, 100);
        } else if (viewsRatio < 0.8 || engagementRatio < 0.9) {
          trendDirection = 'falling';
          trendStrength = Math.min((1 - (viewsRatio + engagementRatio) / 2) * 100, 100);
        }

        return {
          ...h,
          recentPostCount: recentPosts.length,
          recentAvgViews: Math.round(recentAvgViews),
          recentEngagementScore: parseFloat(recentEngagement.toFixed(2)),
          trendDirection,
          trendStrength: parseFloat(trendStrength.toFixed(2))
        };
      });

      // Sort by trend strength (rising first)
      trendingHashtags.sort((a, b) => {
        if (a.trendDirection === 'rising' && b.trendDirection !== 'rising') return -1;
        if (b.trendDirection === 'rising' && a.trendDirection !== 'rising') return 1;
        return b.trendStrength - a.trendStrength;
      });

      const trending = trendingHashtags.filter(h => h.trendDirection === 'rising');
      const falling = trendingHashtags.filter(h => h.trendDirection === 'falling');

      logger.info('Trending analysis complete', {
        trending: trending.length,
        falling: falling.length
      });

      return {
        success: true,
        hashtags: trendingHashtags,
        trending: trending.slice(0, 10), // Top 10 rising
        falling: falling.slice(0, 10), // Top 10 falling
        analysisPeriod: `${daysBack} days`
      };

    } catch (error) {
      logger.error('Error tracking trending hashtags', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 5: Recommend hashtag strategy
   */
  async recommendHashtagStrategy(hashtags) {
    try {
      logger.info('Generating hashtag strategy recommendations');

      if (!hashtags || hashtags.length === 0) {
        return {
          success: false,
          message: 'No hashtags to analyze'
        };
      }

      // Categorize hashtags
      const topTier = hashtags.filter(h => h.tier === 'S-Tier' || h.tier === 'A-Tier');
      const midTier = hashtags.filter(h => h.tier === 'B-Tier');
      const lowTier = hashtags.filter(h => h.tier === 'C-Tier' || h.tier === 'D-Tier');

      // Identify rising hashtags
      const rising = hashtags.filter(h => h.trendDirection === 'rising').slice(0, 5);

      // Generate recommendations
      const recommendations = [];

      // Always use top performers
      if (topTier.length > 0) {
        recommendations.push({
          type: 'core',
          priority: 'high',
          title: 'Core Hashtags',
          description: `Use these ${topTier.length} hashtags consistently in every post`,
          hashtags: topTier.slice(0, 5).map(h => h.hashtag),
          reasoning: 'These hashtags have proven effectiveness and high engagement rates',
          impact: 'High',
          effort: 'Low'
        });
      }

      // Test rising hashtags
      if (rising.length > 0) {
        recommendations.push({
          type: 'growth',
          priority: 'medium',
          title: 'Emerging Opportunities',
          description: `Test these ${rising.length} rising hashtags to capitalize on trends`,
          hashtags: rising.map(h => h.hashtag),
          reasoning: 'These hashtags are trending upward and show growth potential',
          impact: 'Medium',
          effort: 'Low'
        });
      }

      // Use mid-tier for variety
      if (midTier.length > 0) {
        recommendations.push({
          type: 'variety',
          priority: 'medium',
          title: 'Variety Hashtags',
          description: `Rotate these ${midTier.length} hashtags for audience diversity`,
          hashtags: midTier.slice(0, 10).map(h => h.hashtag),
          reasoning: 'These hashtags provide good performance and help reach different audiences',
          impact: 'Medium',
          effort: 'Low'
        });
      }

      // Avoid low performers
      if (lowTier.length > 0) {
        recommendations.push({
          type: 'avoid',
          priority: 'low',
          title: 'Hashtags to Avoid',
          description: `Stop using these ${lowTier.length} underperforming hashtags`,
          hashtags: lowTier.slice(0, 10).map(h => h.hashtag),
          reasoning: 'These hashtags consistently show low engagement and effectiveness',
          impact: 'Positive',
          effort: 'Low'
        });
      }

      // Optimal hashtag count recommendation
      const avgHashtagCount = Math.round(
        hashtags.reduce((sum, h) => sum + h.postCount, 0) / hashtags.length
      );

      const optimalCount = this.calculateOptimalHashtagCount(hashtags);

      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Optimal Hashtag Strategy',
        description: `Use ${optimalCount.min}-${optimalCount.max} hashtags per post`,
        reasoning: `Based on analysis, posts with ${optimalCount.min}-${optimalCount.max} hashtags perform best`,
        optimalCount,
        currentAvg: avgHashtagCount,
        impact: 'High',
        effort: 'Low'
      });

      // Platform-specific recommendations
      const platformRecommendations = this.generatePlatformRecommendations(hashtags);
      if (platformRecommendations.length > 0) {
        recommendations.push({
          type: 'platform',
          priority: 'medium',
          title: 'Platform-Specific Strategy',
          description: 'Tailor hashtags for each platform',
          platforms: platformRecommendations,
          reasoning: 'Different platforms have different hashtag performance patterns',
          impact: 'Medium',
          effort: 'Medium'
        });
      }

      logger.info('Strategy recommendations generated', { count: recommendations.length });

      return {
        success: true,
        recommendations,
        summary: {
          totalAnalyzed: hashtags.length,
          core: topTier.length,
          variety: midTier.length,
          avoid: lowTier.length,
          rising: rising.length
        }
      };

    } catch (error) {
      logger.error('Error generating hashtag strategy recommendations', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate optimal hashtag count
   */
  calculateOptimalHashtagCount(hashtags) {
    // Analyze performance by hashtag count
    const postsByHashtagCount = new Map();

    hashtags.forEach(h => {
      h.posts.forEach(post => {
        const hashtagCount = post.hashtagCount || h.posts.length; // Approximate
        if (!postsByHashtagCount.has(hashtagCount)) {
          postsByHashtagCount.set(hashtagCount, []);
        }
        postsByHashtagCount.get(hashtagCount).push(post);
      });
    });

    // Find best performing count
    let bestCount = { min: 3, max: 5 };
    let bestAvgEngagement = 0;

    postsByHashtagCount.forEach((posts, count) => {
      if (posts.length < 5) return; // Need sufficient data

      const avgEngagement = posts.reduce((sum, p) =>
        sum + (p.likes + p.comments + p.shares) / p.views, 0
      ) / posts.length;

      if (avgEngagement > bestAvgEngagement) {
        bestAvgEngagement = avgEngagement;
        bestCount = {
          min: Math.max(1, count - 1),
          max: count + 1
        };
      }
    });

    return bestCount;
  }

  /**
   * Generate platform-specific recommendations
   */
  generatePlatformRecommendations(hashtags) {
    const platforms = ['tiktok', 'instagram', 'youtube_shorts'];
    const recommendations = [];

    platforms.forEach(platform => {
      const platformHashtags = hashtags.filter(h => h.platforms.includes(platform));

      if (platformHashtags.length > 0) {
        const topPerformers = platformHashtags
          .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
          .slice(0, 5);

        recommendations.push({
          platform,
          topHashtags: topPerformers.map(h => h.hashtag),
          avgEffectiveness: parseFloat(
            (topPerformers.reduce((sum, h) => sum + h.effectivenessScore, 0) / topPerformers.length).toFixed(2)
          )
        });
      }
    });

    return recommendations;
  }

  /**
   * Complete analysis pipeline
   */
  async analyze(filters = {}) {
    try {
      logger.info('Starting complete hashtag effectiveness analysis');

      // Step 1: Extract hashtags
      const extraction = await this.extractHashtags(filters);
      if (!extraction.success) return extraction;

      // Step 2: Correlate with engagement
      const correlation = await this.correlateWithEngagement(extraction.hashtags);
      if (!correlation.success) return correlation;

      // Step 3: Calculate effectiveness score
      const scoring = await this.calculateEffectivenessScore(correlation.hashtags);
      if (!scoring.success) return scoring;

      // Step 4: Track trending hashtags
      const trending = await this.trackTrendingHashtags(scoring.hashtags, 7);
      if (!trending.success) return trending;

      // Step 5: Recommend strategy
      const strategy = await this.recommendHashtagStrategy(trending.hashtags);
      if (!strategy.success) return strategy;

      return {
        success: true,
        extraction: {
          totalPosts: extraction.totalPosts,
          totalUniqueHashtags: extraction.totalUniqueHashtags
        },
        hashtags: strategy.recommendations,
        trending: {
          rising: trending.trending,
          falling: trending.falling
        },
        summary: strategy.summary
      };

    } catch (error) {
      logger.error('Error in complete analysis', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Hashtag effectiveness analysis cache cleared');
  }
}

export default new HashtagEffectivenessService();
