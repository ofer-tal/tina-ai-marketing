/**
 * Content Performance Service
 *
 * Aggregates and analyzes performance metrics across all content types:
 * - Blog Posts
 * - Press Releases
 * - Social Media Posts (Marketing Posts)
 *
 * Feature #271: Content performance tracking
 */

import winston from 'winston';
import BlogPost from '../models/BlogPost.js';
import MarketingPressRelease from '../models/MarketingPressRelease.js';
import MarketingPost from '../models/MarketingPost.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-performance' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-performance-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-performance.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * Content Performance Service Class
 */
class ContentPerformanceService {
  constructor() {
    logger.info('Content Performance Service initialized');
  }

  /**
   * Get overall performance summary across all content types
   */
  async getOverallSummary(dateRange = {}) {
    try {
      const { startDate, endDate } = this._parseDateRange(dateRange);

      const [blogStats, pressStats, socialStats] = await Promise.all([
        this._getBlogPostStats(startDate, endDate),
        this._getPressReleaseStats(startDate, endDate),
        this._getSocialMediaStats(startDate, endDate),
      ]);

      return {
        success: true,
        data: {
          dateRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
          blogPosts: blogStats,
          pressReleases: pressStats,
          socialMedia: socialStats,
          totals: {
            totalContent: blogStats.totalPosts + pressStats.totalReleases + socialStats.totalPosts,
            totalViews: blogStats.totalViews + pressStats.totalImpressions + socialStats.totalViews,
            totalEngagements: blogStats.totalEngagements + pressStats.totalEngagements + socialStats.totalEngagements,
            avgEngagementRate: this._calculateAverage([
              blogStats.avgEngagementRate,
              pressStats.avgEngagementRate,
              socialStats.avgEngagementRate,
            ]),
          },
        },
      };
    } catch (error) {
      logger.error('Error getting overall summary', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance by content type
   */
  async getPerformanceByContentType(contentType, dateRange = {}) {
    try {
      const { startDate, endDate } = this._parseDateRange(dateRange);

      switch (contentType) {
        case 'blog':
          return await this._getDetailedBlogStats(startDate, endDate);
        case 'press':
          return await this._getDetailedPressStats(startDate, endDate);
        case 'social':
          return await this._getDetailedSocialStats(startDate, endDate);
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }
    } catch (error) {
      logger.error('Error getting performance by content type', { contentType, error: error.message });
      throw error;
    }
  }

  /**
   * Get top performing content across all types
   */
  async getTopPerformingContent(limit = 10, dateRange = {}) {
    try {
      const { startDate, endDate } = this._parseDateRange(dateRange);

      const [topBlogs, topPress, topSocial] = await Promise.all([
        BlogPost.find({
          status: 'published',
          publishedAt: { $gte: startDate, $lte: endDate },
        })
          .sort({ views: -1 })
          .limit(limit)
          .lean(),

        MarketingPressRelease.find({
          status: 'distributed',
          distributedAt: { $gte: startDate, $lte: endDate },
        })
          .sort({ 'performanceMetrics.impressions': -1 })
          .limit(limit)
          .lean(),

        MarketingPost.find({
          status: 'posted',
          postedAt: { $gte: startDate, $lte: endDate },
        })
          .sort({ 'performanceMetrics.views': -1 })
          .limit(limit)
          .lean(),
      ]);

      // Normalize and combine all content
      const allContent = [
        ...topBlogs.map(blog => ({
          type: 'blog',
          title: blog.title,
          publishedAt: blog.publishedAt,
          views: blog.views,
          engagements: blog.shares + blog.likes + blog.comments,
          engagementRate: blog.views > 0 ? ((blog.shares + blog.likes + blog.comments) / blog.views * 100).toFixed(2) : 0,
          url: `/content/blog/${blog._id}`,
        })),
        ...topPress.map(press => ({
          type: 'press',
          title: press.headline,
          publishedAt: press.distributedAt,
          views: press.performanceMetrics?.impressions || 0,
          engagements: (press.performanceMetrics?.pickups || 0) + (press.performanceMetrics?.socialShares || 0) + (press.performanceMetrics?.mentions || 0),
          engagementRate: press.performanceMetrics?.engagementRate || 0,
          url: `/content/press-release/${press._id}`,
        })),
        ...topSocial.map(post => ({
          type: 'social',
          title: post.title,
          publishedAt: post.postedAt,
          views: post.performanceMetrics?.views || 0,
          engagements: (post.performanceMetrics?.likes || 0) + (post.performanceMetrics?.comments || 0) + (post.performanceMetrics?.shares || 0),
          engagementRate: post.performanceMetrics?.engagementRate || 0,
          url: `/content/library/${post._id}`,
        })),
      ];

      // Sort by engagements and limit
      allContent.sort((a, b) => b.engagements - a.engagements);

      return {
        success: true,
        data: {
          topContent: allContent.slice(0, limit),
          dateRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        },
      };
    } catch (error) {
      logger.error('Error getting top performing content', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // Get daily data points
      const dailyData = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const [blogViews, pressImpressions, socialViews] = await Promise.all([
          BlogPost.aggregate([
            {
              $match: {
                status: 'published',
                publishedAt: { $gte: dayStart, $lte: dayEnd },
              },
            },
            {
              $group: {
                _id: null,
                totalViews: { $sum: '$views' },
                totalEngagements: { $sum: { $add: ['$views', '$shares', '$likes', '$comments'] } },
              },
            },
          ]),

          MarketingPressRelease.aggregate([
            {
              $match: {
                status: 'distributed',
                distributedAt: { $gte: dayStart, $lte: dayEnd },
              },
            },
            {
              $group: {
                _id: null,
                totalImpressions: { $sum: '$performanceMetrics.impressions' },
                totalEngagements: { $sum: { $add: ['$performanceMetrics.pickups', '$performanceMetrics.socialShares', '$performanceMetrics.mentions'] } },
              },
            },
          ]),

          MarketingPost.aggregate([
            {
              $match: {
                status: 'posted',
                postedAt: { $gte: dayStart, $lte: dayEnd },
              },
            },
            {
              $group: {
                _id: null,
                totalViews: { $sum: '$performanceMetrics.views' },
                totalEngagements: { $sum: { $add: ['$performanceMetrics.views', '$performanceMetrics.likes', '$performanceMetrics.comments', '$performanceMetrics.shares'] } },
              },
            },
          ]),
        ]);

        dailyData.push({
          date: dayStart.toISOString().split('T')[0],
          blogViews: blogViews[0]?.totalViews || 0,
          blogEngagements: blogViews[0]?.totalEngagements || 0,
          pressImpressions: pressImpressions[0]?.totalImpressions || 0,
          pressEngagements: pressImpressions[0]?.totalEngagements || 0,
          socialViews: socialViews[0]?.totalViews || 0,
          socialEngagements: socialViews[0]?.totalEngagements || 0,
          totalViews: (blogViews[0]?.totalViews || 0) + (pressImpressions[0]?.totalImpressions || 0) + (socialViews[0]?.totalViews || 0),
          totalEngagements: (blogViews[0]?.totalEngagements || 0) + (pressImpressions[0]?.totalEngagements || 0) + (socialViews[0]?.totalEngagements || 0),
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        success: true,
        data: {
          dateRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
          dailyTrends: dailyData,
        },
      };
    } catch (error) {
      logger.error('Error getting performance trends', { error: error.message });
      throw error;
    }
  }

  /**
   * Get content type breakdown
   */
  async getContentTypeBreakdown(dateRange = {}) {
    try {
      const { startDate, endDate } = this._parseDateRange(dateRange);

      const [blogBreakdown, pressBreakdown, socialBreakdown] = await Promise.all([
        this._getBlogPostBreakdown(startDate, endDate),
        this._getPressReleaseBreakdown(startDate, endDate),
        this._getSocialMediaBreakdown(startDate, endDate),
      ]);

      return {
        success: true,
        data: {
          dateRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
          breakdown: {
            blog: blogBreakdown,
            press: pressBreakdown,
            social: socialBreakdown,
          },
        },
      };
    } catch (error) {
      logger.error('Error getting content type breakdown', { error: error.message });
      throw error;
    }
  }

  // ============ PRIVATE HELPER METHODS ============

  _parseDateRange(dateRange = {}) {
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }

  _calculateAverage(numbers) {
    const validNumbers = numbers.filter(n => !isNaN(n) && n !== null && n !== undefined);
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
  }

  async _getBlogPostStats(startDate, endDate) {
    const posts = await BlogPost.find({
      status: 'published',
      publishedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalEngagements = totalShares + totalLikes + totalComments;
    const avgEngagementRate = totalViews > 0 ? (totalEngagements / totalViews * 100).toFixed(2) : 0;

    return {
      totalPosts,
      totalViews,
      totalShares,
      totalLikes,
      totalComments,
      totalEngagements,
      avgEngagementRate: parseFloat(avgEngagementRate),
    };
  }

  async _getPressReleaseStats(startDate, endDate) {
    const releases = await MarketingPressRelease.find({
      status: 'distributed',
      distributedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const totalReleases = releases.length;
    const totalImpressions = releases.reduce((sum, r) => sum + (r.performanceMetrics?.impressions || 0), 0);
    const totalPickups = releases.reduce((sum, r) => sum + (r.performanceMetrics?.pickups || 0), 0);
    const totalClicks = releases.reduce((sum, r) => sum + (r.performanceMetrics?.clicks || 0), 0);
    const totalSocialShares = releases.reduce((sum, r) => sum + (r.performanceMetrics?.socialShares || 0), 0);
    const totalMentions = releases.reduce((sum, r) => sum + (r.performanceMetrics?.mentions || 0), 0);
    const totalEngagements = totalPickups + totalSocialShares + totalMentions;
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions * 100).toFixed(2) : 0;

    return {
      totalReleases,
      totalImpressions,
      totalPickups,
      totalClicks,
      totalSocialShares,
      totalMentions,
      totalEngagements,
      avgEngagementRate: parseFloat(avgEngagementRate),
    };
  }

  async _getSocialMediaStats(startDate, endDate) {
    const posts = await MarketingPost.find({
      status: 'posted',
      postedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + (p.performanceMetrics?.views || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.performanceMetrics?.likes || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.performanceMetrics?.comments || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.performanceMetrics?.shares || 0), 0);
    const totalEngagements = totalLikes + totalComments + totalShares;
    const avgEngagementRate = totalViews > 0 ? (totalEngagements / totalViews * 100).toFixed(2) : 0;

    return {
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalEngagements,
      avgEngagementRate: parseFloat(avgEngagementRate),
    };
  }

  async _getDetailedBlogStats(startDate, endDate) {
    const posts = await BlogPost.find({
      status: 'published',
      publishedAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ publishedAt: -1 })
      .lean();

    const byCategory = {};
    posts.forEach(post => {
      const category = post.category || 'uncategorized';
      if (!byCategory[category]) {
        byCategory[category] = {
          count: 0,
          totalViews: 0,
          totalEngagements: 0,
        };
      }
      byCategory[category].count++;
      byCategory[category].totalViews += post.views || 0;
      byCategory[category].totalEngagements += (post.shares || 0) + (post.likes || 0) + (post.comments || 0);
    });

    return {
      success: true,
      data: {
        contentType: 'blog',
        posts: posts.map(p => ({
          id: p._id,
          title: p.title,
          category: p.category,
          publishedAt: p.publishedAt,
          views: p.views,
          shares: p.shares,
          likes: p.likes,
          comments: p.comments,
          engagements: (p.shares || 0) + (p.likes || 0) + (p.comments || 0),
          engagementRate: p.views > 0 ? (((p.shares || 0) + (p.likes || 0) + (p.comments || 0)) / p.views * 100).toFixed(2) : 0,
        })),
        byCategory,
        summary: await this._getBlogPostStats(startDate, endDate),
      },
    };
  }

  async _getDetailedPressStats(startDate, endDate) {
    const releases = await MarketingPressRelease.find({
      status: 'distributed',
      distributedAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ distributedAt: -1 })
      .lean();

    return {
      success: true,
      data: {
        contentType: 'press',
        releases: releases.map(r => ({
          id: r._id,
          headline: r.headline,
          distributedAt: r.distributedAt,
          impressions: r.performanceMetrics?.impressions || 0,
          pickups: r.performanceMetrics?.pickups || 0,
          clicks: r.performanceMetrics?.clicks || 0,
          socialShares: r.performanceMetrics?.socialShares || 0,
          mentions: r.performanceMetrics?.mentions || 0,
          engagements: (r.performanceMetrics?.pickups || 0) + (r.performanceMetrics?.socialShares || 0) + (r.performanceMetrics?.mentions || 0),
          engagementRate: r.performanceMetrics?.engagementRate || 0,
        })),
        summary: await this._getPressReleaseStats(startDate, endDate),
      },
    };
  }

  async _getDetailedSocialStats(startDate, endDate) {
    const posts = await MarketingPost.find({
      status: 'posted',
      postedAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ postedAt: -1 })
      .lean();

    const byPlatform = {};
    posts.forEach(post => {
      const platform = post.platform || 'unknown';
      if (!byPlatform[platform]) {
        byPlatform[platform] = {
          count: 0,
          totalViews: 0,
          totalEngagements: 0,
        };
      }
      byPlatform[platform].count++;
      byPlatform[platform].totalViews += post.performanceMetrics?.views || 0;
      byPlatform[platform].totalEngagements += (post.performanceMetrics?.likes || 0) + (post.performanceMetrics?.comments || 0) + (post.performanceMetrics?.shares || 0);
    });

    return {
      success: true,
      data: {
        contentType: 'social',
        posts: posts.map(p => ({
          id: p._id,
          title: p.title,
          platform: p.platform,
          contentType: p.contentType,
          postedAt: p.postedAt,
          views: p.performanceMetrics?.views || 0,
          likes: p.performanceMetrics?.likes || 0,
          comments: p.performanceMetrics?.comments || 0,
          shares: p.performanceMetrics?.shares || 0,
          engagements: (p.performanceMetrics?.likes || 0) + (p.performanceMetrics?.comments || 0) + (p.performanceMetrics?.shares || 0),
          engagementRate: p.performanceMetrics?.engagementRate || 0,
        })),
        byPlatform,
        summary: await this._getSocialMediaStats(startDate, endDate),
      },
    };
  }

  async _getBlogPostBreakdown(startDate, endDate) {
    const posts = await BlogPost.find({
      status: 'published',
      publishedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const byCategory = {};
    posts.forEach(post => {
      const category = post.category || 'uncategorized';
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, views: 0, engagements: 0 };
      }
      byCategory[category].count++;
      byCategory[category].views += post.views || 0;
      byCategory[category].engagements += (post.shares || 0) + (post.likes || 0) + (post.comments || 0);
    });

    return byCategory;
  }

  async _getPressReleaseBreakdown(startDate, endDate) {
    const releases = await MarketingPressRelease.find({
      status: 'distributed',
      distributedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const byChannel = {};
    releases.forEach(release => {
      release.distributionChannels?.forEach(channel => {
        if (!byChannel[channel]) {
          byChannel[channel] = { count: 0, impressions: 0, engagements: 0 };
        }
        byChannel[channel].count++;
        byChannel[channel].impressions += release.performanceMetrics?.impressions || 0;
        byChannel[channel].engagements += (release.performanceMetrics?.pickups || 0) + (release.performanceMetrics?.socialShares || 0);
      });
    });

    return byChannel;
  }

  async _getSocialMediaBreakdown(startDate, endDate) {
    const posts = await MarketingPost.find({
      status: 'posted',
      postedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const byPlatform = {};
    const byContentType = {};

    posts.forEach(post => {
      const platform = post.platform || 'unknown';
      if (!byPlatform[platform]) {
        byPlatform[platform] = { count: 0, views: 0, engagements: 0 };
      }
      byPlatform[platform].count++;
      byPlatform[platform].views += post.performanceMetrics?.views || 0;
      byPlatform[platform].engagements += (post.performanceMetrics?.likes || 0) + (post.performanceMetrics?.comments || 0) + (post.performanceMetrics?.shares || 0);

      const contentType = post.contentType || 'unknown';
      if (!byContentType[contentType]) {
        byContentType[contentType] = { count: 0, views: 0, engagements: 0 };
      }
      byContentType[contentType].count++;
      byContentType[contentType].views += post.performanceMetrics?.views || 0;
      byContentType[contentType].engagements += (post.performanceMetrics?.likes || 0) + (post.performanceMetrics?.comments || 0) + (post.performanceMetrics?.shares || 0);
    });

    return { byPlatform, byContentType };
  }
}

export default new ContentPerformanceService();
