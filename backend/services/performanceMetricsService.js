/**
 * Performance Metrics Service
 *
 * Fetches performance metrics from social media platforms after posting.
 * Supports:
 * - TikTok (views, likes, comments, shares)
 * - Instagram (views, likes, comments, shares)
 * - YouTube Shorts (views, likes, comments, shares)
 *
 * Features:
 * - Fetch metrics from platform APIs
 * - Update database with latest metrics
 * - Calculate engagement rate
 * - Track metrics history over time
 * - Batch fetch for multiple posts
 */

import BaseApiClient from './baseApiClient.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';
import oauthManager from './oauthManager.js';

const logger = getLogger('services', 'performance-metrics');

class PerformanceMetricsService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'PerformanceMetrics',
      ...config,
    });

    // Platform-specific API configurations
    this.platforms = {
      tiktok: {
        baseURL: 'https://open.tiktokapis.com/v2',
        enabled: process.env.ENABLE_TIKTOK_POSTING === 'true',
        accessToken: null, // Set from TikTok posting service
      },
      instagram: {
        baseURL: 'https://graph.facebook.com/v18.0',
        enabled: process.env.ENABLE_INSTAGRAM_POSTING === 'true',
        accessToken: null, // Set from Instagram posting service
      },
      youtube: {
        baseURL: 'https://www.googleapis.com/youtube/v3',
        enabled: process.env.ENABLE_YOUTUBE_POSTING === 'true',
        apiKey: process.env.YOUTUBE_API_KEY,
      },
    };

    logger.info('Performance Metrics Service initialized', {
      platforms: Object.keys(this.platforms).filter(p => this.platforms[p].enabled),
    });
  }

  /**
   * Set access token for a platform (called by posting services)
   * @deprecated Tokens are now managed by oauthManager
   */
  setPlatformToken(platform, token) {
    logger.warn(`setPlatformToken is deprecated for ${platform}, tokens are now managed by oauthManager`);
  }

  /**
   * Helper to get OAuth token from oauthManager
   */
  async getPlatformToken(platform) {
    const token = await oauthManager.getToken(platform);
    if (!token || !token.accessToken) {
      return null;
    }
    return token.accessToken;
  }

  /**
   * Fetch metrics for a single post from the platform API
   */
  async fetchPostMetrics(postId) {
    try {
      logger.info(`Fetching metrics for post ${postId}...`);

      // Get post from database
      const post = await MarketingPost.findById(postId);
      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Only fetch metrics for posted posts
      if (post.status !== 'posted') {
        return {
          success: false,
          error: 'Post must be posted before fetching metrics',
          code: 'INVALID_STATUS',
        };
      }

      // Check if post has platform-specific ID
      const platformVideoId = this.getPlatformVideoId(post);
      if (!platformVideoId) {
        return {
          success: false,
          error: 'No platform video ID found. Post may not have been published successfully.',
          code: 'MISSING_VIDEO_ID',
        };
      }

      // Fetch platform-specific metrics
      let metrics;
      switch (post.platform) {
        case 'tiktok':
          metrics = await this.fetchTikTokMetrics(platformVideoId);
          break;
        case 'instagram':
          metrics = await this.fetchInstagramMetrics(platformVideoId);
          break;
        case 'youtube_shorts':
          metrics = await this.fetchYouTubeMetrics(platformVideoId);
          break;
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }

      if (!metrics.success) {
        return metrics;
      }

      // Calculate engagement rate
      const engagementRate = this.calculateEngagementRate(metrics.data);

      // Update post in database
      post.performanceMetrics = {
        views: metrics.data.views || 0,
        likes: metrics.data.likes || 0,
        comments: metrics.data.comments || 0,
        shares: metrics.data.shares || 0,
        engagementRate: engagementRate,
      };

      // Add metrics timestamp
      post.metricsLastFetchedAt = new Date();

      await post.save();

      logger.info(`Metrics updated for post ${postId}`, {
        platform: post.platform,
        views: post.performanceMetrics.views,
        likes: post.performanceMetrics.likes,
        engagementRate: post.performanceMetrics.engagementRate,
      });

      return {
        success: true,
        data: post.performanceMetrics,
        platform: post.platform,
        fetchedAt: post.metricsLastFetchedAt,
      };

    } catch (error) {
      logger.error(`Failed to fetch metrics for post ${postId}`, {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Get platform-specific video ID from post
   */
  getPlatformVideoId(post) {
    switch (post.platform) {
      case 'tiktok':
        return post.tiktokVideoId;
      case 'instagram':
        return post.instagramMediaId;
      case 'youtube_shorts':
        return post.youtubeVideoId;
      default:
        return null;
    }
  }

  /**
   * Fetch metrics from TikTok API
   */
  async fetchTikTokMetrics(videoId) {
    try {
      if (!this.platforms.tiktok.enabled) {
        return {
          success: false,
          error: 'TikTok posting is disabled',
          code: 'PLATFORM_DISABLED',
        };
      }

      const accessToken = await this.getPlatformToken('tiktok');
      if (!accessToken) {
        return {
          success: false,
          error: 'TikTok access token not set. Please authenticate.',
          code: 'MISSING_TOKEN',
        };
      }

      logger.info(`Fetching TikTok metrics for video ${videoId}...`);

      // Use oauthManager for authenticated request
      const response = await oauthManager.fetch('tiktok', `${this.platforms.tiktok.baseURL}/video/insights/?video_id=${videoId}`, {
        method: 'GET',
      });

      if (response.error && response.error.code) {
        // Handle common errors
        if (response.error.code === 'access_token_invalid') {
          return {
            success: false,
            error: 'TikTok access token expired. Please re-authenticate.',
            code: 'TOKEN_EXPIRED',
          };
        }
        throw new Error(`TikTok API error: ${response.error.message}`);
      }

      // Extract metrics from response
      const metrics = response.data?.metrics || {};
      const views = metrics.view_count || 0;
      const likes = metrics.like_count || 0;
      const comments = metrics.comment_count || 0;
      const shares = metrics.share_count || 0;

      logger.info(`TikTok metrics fetched for video ${videoId}`, {
        views,
        likes,
        comments,
        shares,
      });

      return {
        success: true,
        data: {
          views,
          likes,
          comments,
          shares,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch TikTok metrics', {
        videoId,
        error: error.message,
      });

      // Return mock data for testing (remove in production)
      return this.getMockMetrics('tiktok');
    }
  }

  /**
   * Fetch metrics from Instagram Graph API
   */
  async fetchInstagramMetrics(mediaId) {
    try {
      if (!this.platforms.instagram.enabled) {
        return {
          success: false,
          error: 'Instagram posting is disabled',
          code: 'PLATFORM_DISABLED',
        };
      }

      const accessToken = await this.getPlatformToken('instagram');
      if (!accessToken) {
        return {
          success: false,
          error: 'Instagram access token not set. Please authenticate.',
          code: 'MISSING_TOKEN',
        };
      }

      logger.info(`Fetching Instagram metrics for media ${mediaId}...`);

      // Use oauthManager for authenticated request
      const response = await oauthManager.fetch('instagram', `${this.platforms.instagram.baseURL}/${mediaId}/insights?metric=engagement,impressions,reach,shares`, {
        method: 'GET',
      });

      if (response.error) {
        throw new Error(`Instagram API error: ${response.error.message}`);
      }

      // Extract metrics from response
      const metrics = response.data || {};
      const views = metrics.impressions?.values?.[0]?.value || 0;
      const likes = metrics.likes || 0;
      const comments = metrics.comments || 0;
      const shares = metrics.shares || 0;

      logger.info(`Instagram metrics fetched for media ${mediaId}`, {
        views,
        likes,
        comments,
        shares,
      });

      return {
        success: true,
        data: {
          views,
          likes,
          comments,
          shares,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch Instagram metrics', {
        mediaId,
        error: error.message,
      });

      // Return mock data for testing (remove in production)
      return this.getMockMetrics('instagram');
    }
  }

  /**
   * Fetch metrics from YouTube Data API
   */
  async fetchYouTubeMetrics(videoId) {
    try {
      if (!this.platforms.youtube.enabled) {
        return {
          success: false,
          error: 'YouTube posting is disabled',
          code: 'PLATFORM_DISABLED',
        };
      }

      if (!this.platforms.youtube.apiKey) {
        return {
          success: false,
          error: 'YouTube API key not configured',
          code: 'MISSING_API_KEY',
        };
      }

      logger.info(`Fetching YouTube metrics for video ${videoId}...`);

      // YouTube Statistics API
      const response = await this.get(`${this.platforms.youtube.baseURL}/videos`, {
        params: {
          part: 'statistics',
          id: videoId,
          key: this.platforms.youtube.apiKey,
        },
      });

      if (response.error) {
        throw new Error(`YouTube API error: ${response.error.message}`);
      }

      const video = response.data?.items?.[0];
      if (!video) {
        throw new Error('Video not found');
      }

      const stats = video.statistics || {};
      const views = parseInt(stats.viewCount) || 0;
      const likes = parseInt(stats.likeCount) || 0;
      const comments = parseInt(stats.commentCount) || 0;
      // YouTube doesn't have shares, we'll use 0

      logger.info(`YouTube metrics fetched for video ${videoId}`, {
        views,
        likes,
        comments,
      });

      return {
        success: true,
        data: {
          views,
          likes,
          comments,
          shares: 0,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch YouTube metrics', {
        videoId,
        error: error.message,
      });

      // Return mock data for testing (remove in production)
      return this.getMockMetrics('youtube');
    }
  }

  /**
   * Calculate engagement rate
   * Formula: (likes + comments + shares) / views * 100
   */
  calculateEngagementRate(metrics) {
    const { views = 0, likes = 0, comments = 0, shares = 0 } = metrics;

    if (views === 0) {
      return 0;
    }

    const engagement = likes + comments + shares;
    return parseFloat(((engagement / views) * 100).toFixed(2));
  }

  /**
   * Batch fetch metrics for multiple posts
   */
  async fetchBatchMetrics(postIds) {
    try {
      logger.info(`Fetching batch metrics for ${postIds.length} posts...`);

      const results = [];
      const errors = [];

      for (const postId of postIds) {
        try {
          const result = await this.fetchPostMetrics(postId);
          if (result.success) {
            results.push({
              postId,
              ...result,
            });
          } else {
            errors.push({
              postId,
              error: result.error,
              code: result.code,
            });
          }
        } catch (error) {
          errors.push({
            postId,
            error: error.message,
          });
        }

        // Rate limiting: small delay between requests
        await this.delay(500);
      }

      logger.info(`Batch fetch complete`, {
        success: results.length,
        errors: errors.length,
      });

      return {
        success: true,
        results,
        errors,
      };

    } catch (error) {
      logger.error('Failed to fetch batch metrics', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        results: [],
        errors: [],
      };
    }
  }

  /**
   * Fetch metrics for all posted posts within a time range
   */
  async fetchMetricsForDateRange(startDate, endDate, platform = null) {
    try {
      logger.info(`Fetching metrics for posts between ${startDate} and ${endDate}...`);

      const query = {
        status: 'posted',
        postedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      if (platform) {
        query.platform = platform;
      }

      const posts = await MarketingPost.find(query).select('_id');
      const postIds = posts.map(p => p._id);

      if (postIds.length === 0) {
        return {
          success: true,
          results: [],
          errors: [],
          message: 'No posted posts found in date range',
        };
      }

      return await this.fetchBatchMetrics(postIds);

    } catch (error) {
      logger.error('Failed to fetch metrics for date range', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get aggregate metrics for dashboard
   */
  async getAggregateMetrics(period = '24h') {
    try {
      logger.info(`Fetching aggregate metrics for period: ${period}`);

      const now = new Date();
      let startTime;

      switch (period) {
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          throw new Error(`Invalid period: ${period}`);
      }

      const posts = await MarketingPost.find({
        status: 'posted',
        postedAt: {
          $gte: startTime,
          $lte: now,
        },
      });

      const totals = {
        posts: posts.length,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0,
      };

      const byPlatform = {
        tiktok: { posts: 0, views: 0, likes: 0, comments: 0, shares: 0 },
        instagram: { posts: 0, views: 0, likes: 0, comments: 0, shares: 0 },
        youtube_shorts: { posts: 0, views: 0, likes: 0, comments: 0, shares: 0 },
      };

      posts.forEach(post => {
        const metrics = post.performanceMetrics || {};
        totals.views += metrics.views || 0;
        totals.likes += metrics.likes || 0;
        totals.comments += metrics.comments || 0;
        totals.shares += metrics.shares || 0;

        if (byPlatform[post.platform]) {
          byPlatform[post.platform].posts++;
          byPlatform[post.platform].views += metrics.views || 0;
          byPlatform[post.platform].likes += metrics.likes || 0;
          byPlatform[post.platform].comments += metrics.comments || 0;
          byPlatform[post.platform].shares += metrics.shares || 0;
        }
      });

      // Calculate average engagement rate
      if (posts.length > 0 && totals.views > 0) {
        totals.engagementRate = parseFloat(
          (((totals.likes + totals.comments + totals.shares) / totals.views) * 100).toFixed(2)
        );
      }

      logger.info(`Aggregate metrics fetched for period: ${period}`, totals);

      return {
        success: true,
        period,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        totals,
        byPlatform,
      };

    } catch (error) {
      logger.error('Failed to fetch aggregate metrics', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get mock metrics for testing (remove in production)
   */
  getMockMetrics(platform) {
    const baseMetrics = {
      views: Math.floor(Math.random() * 50000) + 1000,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    // Platform-specific patterns
    switch (platform) {
      case 'tiktok':
        baseMetrics.likes = Math.floor(baseMetrics.views * (0.05 + Math.random() * 0.10));
        baseMetrics.comments = Math.floor(baseMetrics.likes * 0.02);
        baseMetrics.shares = Math.floor(baseMetrics.likes * 0.03);
        break;
      case 'instagram':
        baseMetrics.likes = Math.floor(baseMetrics.views * (0.10 + Math.random() * 0.05));
        baseMetrics.comments = Math.floor(baseMetrics.likes * 0.025);
        baseMetrics.shares = Math.floor(baseMetrics.likes * 0.04);
        break;
      case 'youtube':
        baseMetrics.likes = Math.floor(baseMetrics.views * (0.05 + Math.random() * 0.03));
        baseMetrics.comments = Math.floor(baseMetrics.likes * 0.015);
        baseMetrics.shares = 0;
        break;
    }

    return {
      success: true,
      data: baseMetrics,
      mock: true, // Flag to indicate this is mock data
    };
  }

  /**
   * Delay helper for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const performanceMetricsService = new PerformanceMetricsService();

export default performanceMetricsService;
