/**
 * Internal Data Connector Service
 *
 * Connects to existing marketing data sources:
 * - MarketingPost model for our content
 * - Performance metrics data
 * - Analytics data
 *
 * Provides unified access to internal performance data
 * for BookTok trend analysis.
 */

import { getLogger } from '../../utils/logger.js';
import MarketingPost from '../../models/MarketingPost.js';
import AnalyticsMetric from '../../models/AnalyticsMetric.js';
import performanceMetricsService from '../performanceMetricsService.js';
import contentEngagementAnalysis from '../contentEngagementAnalysis.js';

const logger = getLogger('services', 'booktok-internal-connector');

class InternalDataConnector {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;

    logger.info('Internal Data Connector Service initialized');
  }

  /**
   * Fetch our performance metrics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Performance metrics
   */
  async fetchOurPerformanceMetrics(options = {}) {
    const {
      platform = 'all',
      startDate,
      endDate,
      includeBreakdown = true
    } = options;

    try {
      logger.info('Fetching our performance metrics', { platform, startDate, endDate });

      const matchQuery = { status: 'posted' };

      // Add platform filter (handle multi-platform)
      if (platform !== 'all') {
        matchQuery.$or = [
          { platform: platform },
          { platforms: platform }
        ];
      }

      // Add date filter
      if (startDate || endDate) {
        matchQuery.postedAt = {};
        if (startDate) matchQuery.postedAt.$gte = startDate;
        if (endDate) matchQuery.postedAt.$lte = endDate;
      }

      // Fetch posted posts
      const posts = await MarketingPost.find(matchQuery)
        .sort({ postedAt: -1 })
        .lean();

      // Calculate aggregate metrics
      const metrics = {
        totalPosts: posts.length,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        avgEngagementRate: 0,
        topPerforming: [],
        platformBreakdown: {
          tiktok: { posts: 0, views: 0, engagementRate: 0 },
          instagram: { posts: 0, views: 0, engagementRate: 0 },
          youtube_shorts: { posts: 0, views: 0, engagementRate: 0 }
        },
        topicBreakdown: {},
        trendOverTime: []
      };

      // Process each post
      for (const post of posts) {
        // Get per-platform metrics
        const platforms = post.getTargetPlatforms();

        for (const pf of platforms) {
          const platformStatus = post.getPlatformStatus(pf);
          const perf = platformStatus?.performanceMetrics || post.performanceMetrics;

          metrics.totalViews += perf.views || 0;
          metrics.totalLikes += perf.likes || 0;
          metrics.totalComments += perf.comments || 0;
          metrics.totalShares += perf.shares || 0;

          // Platform breakdown
          if (metrics.platformBreakdown[pf]) {
            metrics.platformBreakdown[pf].posts++;
            metrics.platformBreakdown[pf].views += perf.views || 0;
          }
        }

        // Track by story category (topic)
        if (post.storyCategory) {
          if (!metrics.topicBreakdown[post.storyCategory]) {
            metrics.topicBreakdown[post.storyCategory] = {
              posts: 0,
              views: 0,
              engagementRate: 0
            };
          }
          metrics.topicBreakdown[post.storyCategory].posts++;
          metrics.topicBreakdown[post.storyCategory].views += post.performanceMetrics?.views || 0;
        }
      }

      // Calculate averages
      if (metrics.totalViews > 0) {
        metrics.avgEngagementRate = ((metrics.totalLikes + metrics.totalComments + metrics.totalShares) / metrics.totalViews) * 100;
      }

      // Calculate platform engagement rates
      for (const pf in metrics.platformBreakdown) {
        const pb = metrics.platformBreakdown[pf];
        if (pb.views > 0) {
          pb.engagementRate = ((metrics.totalLikes + metrics.totalComments + metrics.totalShares) / pb.views) * 100;
        }
      }

      // Top performing posts
      metrics.topPerforming = posts
        .filter(p => (p.performanceMetrics?.views || 0) > 0)
        .sort((a, b) => (b.performanceMetrics?.views || 0) - (a.performanceMetrics?.views || 0))
        .slice(0, 10)
        .map(p => ({
          id: p._id,
          title: p.title,
          platform: p.platform,
          views: p.performanceMetrics?.views || 0,
          likes: p.performanceMetrics?.likes || 0,
          comments: p.performanceMetrics?.comments || 0,
          shares: p.performanceMetrics?.shares || 0,
          engagementRate: p.performanceMetrics?.engagementRate || 0,
          storyCategory: p.storyCategory,
          hook: p.hook
        }));

      logger.info('Performance metrics fetched', {
        totalPosts: metrics.totalPosts,
        totalViews: metrics.totalViews,
        avgEngagementRate: metrics.avgEngagementRate
      });

      return metrics;

    } catch (error) {
      logger.error('Error fetching performance metrics', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Fetch our content library
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Content library
   */
  async fetchOurContentLibrary(options = {}) {
    const {
      status = ['posted', 'approved', 'ready'],
      platform = 'all',
      limit = 100,
      includeMetrics = true
    } = options;

    try {
      logger.info('Fetching content library', { status, platform, limit });

      const query = { status: { $in: Array.isArray(status) ? status : [status] } };

      // Add platform filter
      if (platform !== 'all') {
        query.$or = [
          { platform: platform },
          { platforms: platform }
        ];
      }

      const posts = await MarketingPost.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('storyId', 'title coverPath spiciness category')
        .lean();

      // If metrics are needed, aggregate them
      let enrichedPosts = posts;
      if (includeMetrics) {
        enrichedPosts = await this.enrichPostsWithMetrics(posts);
      }

      logger.info(`Fetched ${posts.length} posts from library`);

      return enrichedPosts;

    } catch (error) {
      logger.error('Error fetching content library', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Enrich posts with aggregated metrics
   * @param {Array} posts - Posts to enrich
   * @returns {Promise<Array>} Enriched posts
   */
  async enrichPostsWithMetrics(posts) {
    // For multi-platform posts, aggregate metrics across platforms
    return posts.map(post => {
      const enriched = { ...post };

      // Aggregate per-platform metrics
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      const platforms = post.getTargetPlatforms();

      for (const pf of platforms) {
        const platformStatus = post.getPlatformStatus(pf);
        const perf = platformStatus?.performanceMetrics || post.performanceMetrics;

        totalViews += perf.views || 0;
        totalLikes += perf.likes || 0;
        totalComments += perf.comments || 0;
        totalShares += perf.shares || 0;
      }

      // Use aggregated metrics
      enriched.aggregatedMetrics = {
        views: totalViews || post.performanceMetrics?.views || 0,
        likes: totalLikes || post.performanceMetrics?.likes || 0,
        comments: totalComments || post.performanceMetrics?.comments || 0,
        shares: totalShares || post.performanceMetrics?.shares || 0,
        engagementRate: totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 : 0
      };

      return enriched;
    });
  }

  /**
   * Get engagement patterns from our posts
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Engagement patterns
   */
  async getEngagementPatterns(options = {}) {
    const {
      days = 30,
      platform = 'all'
    } = options;

    try {
      logger.info('Analyzing engagement patterns', { days, platform });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const posts = await MarketingPost.find({
        status: 'posted',
        postedAt: { $gte: startDate }
      }).lean();

      const patterns = {
        bestDayOfWeek: {},
        bestHourOfDay: {},
        bestCategory: {},
        hookPatterns: {},
        hashtagCombinations: {},
        topicTiming: {}
      };

      for (const post of posts) {
        if (!post.postedAt) continue;

        const postedDate = new Date(post.postedAt);
        const dayOfWeek = postedDate.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = postedDate.getHours();

        // Track by day of week
        if (!patterns.bestDayOfWeek[dayOfWeek]) {
          patterns.bestDayOfWeek[dayOfWeek] = { count: 0, totalViews: 0, totalEngagement: 0 };
        }
        patterns.bestDayOfWeek[dayOfWeek].count++;
        patterns.bestDayOfWeek[dayOfWeek].totalViews += post.performanceMetrics?.views || 0;
        patterns.bestDayOfWeek[dayOfWeek].totalEngagement += post.performanceMetrics?.engagementRate || 0;

        // Track by hour
        if (!patterns.bestHourOfDay[hour]) {
          patterns.bestHourOfDay[hour] = { count: 0, totalViews: 0, totalEngagement: 0 };
        }
        patterns.bestHourOfDay[hour].count++;
        patterns.bestHourOfDay[hour].totalViews += post.performanceMetrics?.views || 0;
        patterns.bestHourOfDay[hour].totalEngagement += post.performanceMetrics?.engagementRate || 0;

        // Track by category
        if (post.storyCategory) {
          if (!patterns.bestCategory[post.storyCategory]) {
            patterns.bestCategory[post.storyCategory] = { count: 0, totalViews: 0, totalEngagement: 0 };
          }
          patterns.bestCategory[post.storyCategory].count++;
          patterns.bestCategory[post.storyCategory].totalViews += post.performanceMetrics?.views || 0;
          patterns.bestCategory[post.storyCategory].totalEngagement += post.performanceMetrics?.engagementRate || 0;
        }

        // Track hook patterns
        if (post.hook) {
          const hookLength = post.hook.length < 50 ? 'short' : post.hook.length < 100 ? 'medium' : 'long';
          const hasQuestion = post.hook.includes('?');
          const hookKey = `${hookLength}_${hasQuestion ? 'question' : 'statement'}`;

          if (!patterns.hookPatterns[hookKey]) {
            patterns.hookPatterns[hookKey] = { count: 0, totalEngagement: 0 };
          }
          patterns.hookPatterns[hookKey].count++;
          patterns.hookPatterns[hookKey].totalEngagement += post.performanceMetrics?.engagementRate || 0;
        }

        // Track hashtag combinations (simplified)
        if (post.hashtags) {
          const platforms = ['tiktok', 'instagram'];
          for (const pf of platforms) {
            const tags = post.hashtags[pf] || post.hashtags;
            if (tags && tags.length > 0) {
              const count = tags.length;
              const range = count <= 3 ? '1-3' : count <= 6 ? '4-6' : '7+';
              const key = `${pf}_${range}`;

              if (!patterns.hashtagCombinations[key]) {
                patterns.hashtagCombinations[key] = { count: 0, totalEngagement: 0 };
              }
              patterns.hashtagCombinations[key].count++;
              patterns.hashtagCombinations[key].totalEngagement += post.performanceMetrics?.engagementRate || 0;
            }
          }
        }
      }

      // Calculate averages
      for (const key in patterns.bestDayOfWeek) {
        const data = patterns.bestDayOfWeek[key];
        data.avgViews = data.totalViews / data.count;
        data.avgEngagement = data.totalEngagement / data.count;
      }

      for (const key in patterns.bestHourOfDay) {
        const data = patterns.bestHourOfDay[key];
        data.avgViews = data.totalViews / data.count;
        data.avgEngagement = data.totalEngagement / data.count;
      }

      for (const key in patterns.bestCategory) {
        const data = patterns.bestCategory[key];
        data.avgViews = data.totalViews / data.count;
        data.avgEngagement = data.totalEngagement / data.count;
      }

      for (const key in patterns.hookPatterns) {
        const data = patterns.hookPatterns[key];
        data.avgEngagement = data.totalEngagement / data.count;
      }

      for (const key in patterns.hashtagCombinations) {
        const data = patterns.hashtagCombinations[key];
        data.avgEngagement = data.totalEngagement / data.count;
      }

      logger.info('Engagement patterns analyzed', {
        postsAnalyzed: posts.length
      });

      return patterns;

    } catch (error) {
      logger.error('Error analyzing engagement patterns', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Get follower growth data
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Follower growth data
   */
  async getFollowerGrowth(options = {}) {
    const {
      days = 30,
      platform = 'all'
    } = options;

    try {
      logger.info('Fetching follower growth data', { days, platform });

      // Get analytics metrics from our tracking
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const metrics = await AnalyticsMetric.find({
        timestamp: { $gte: startDate }
      })
        .sort({ timestamp: 1 })
        .lean();

      // Process follower data by platform
      const followerData = {
        dates: [],
        tiktok: [],
        instagram: [],
        youtube: []
      };

      for (const metric of metrics) {
        if (metric.timestamp) {
          followerData.dates.push(metric.timestamp);
          followerData.tiktok.push(metric.tiktokFollowers || 0);
          followerData.instagram.push(metric.instagramFollowers || 0);
          followerData.youtube.push(metric.youtubeFollowers || 0);
        }
      }

      return followerData;

    } catch (error) {
      logger.error('Error fetching follower growth', {
        error: error.message
      });
      return { dates: [], tiktok: [], instagram: [], youtube: [] };
    }
  }

  /**
   * Get conversion data (app installs, etc.)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Conversion data
   */
  async getConversionData(options = {}) {
    const {
      days = 30
    } = options;

    try {
      logger.info('Fetching conversion data', { days });

      // This would connect to the actual conversion tracking
      // For now, return placeholder

      return {
        totalConversions: 0,
        byPlatform: {
          tiktok: 0,
          instagram: 0,
          youtube: 0
        },
        bySource: {
          bio_link: 0,
          direct: 0,
          other: 0
        },
        conversionRate: 0
      };

    } catch (error) {
      logger.error('Error fetching conversion data', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime
    };
  }
}

// Export singleton instance
const internalDataConnector = new InternalDataConnector();
export default internalDataConnector;
