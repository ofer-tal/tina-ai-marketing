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
        accessToken: null,
      },
      instagram: {
        baseURL: 'https://graph.facebook.com/v18.0',
        enabled: process.env.ENABLE_INSTAGRAM_POSTING === 'true',
        accessToken: null,
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
   */
  setPlatformToken(platform, token) {
    if (this.platforms[platform]) {
      this.platforms[platform].accessToken = token;
      logger.info(`Access token set for ${platform}`);
    }
  }

  /**
   * Fetch metrics for a single post from platform API
   * Returns results by platform for multi-platform posts
   */
  async fetchPostMetrics(postId) {
    try {
      logger.info(`Fetching metrics for post ${postId}...`);

      // Get post from database
      const post = await MarketingPost.findById(postId);
      if (!post) {
        return {
          success: false,
          error: `Post ${postId} not found`,
          code: 'POST_NOT_FOUND',
        };
      }

      // For multi-platform posts, fetch metrics for all platforms
      const results = {};
      const platforms = post.platforms || [post.platform].filter(Boolean);

      for (const platform of platforms) {
        if (platform === 'tiktok') {
          const tiktokResult = await this.fetchTikTokMetricsForPost(post);
          if (tiktokResult.success) {
            results.tiktok = tiktokResult.data;
          }
        } else if (platform === 'instagram') {
          const instaResult = await this.fetchInstagramMetricsForPost(post);
          if (instaResult.success) {
            results.instagram = instaResult.data;
          }
        } else if (platform === 'youtube_shorts') {
          const ytResult = await this.fetchYouTubeMetricsForPost(post);
          if (ytResult.success) {
            results.youtube_shorts = ytResult.data;
          }
        }
      }

      return {
        success: true,
        results,
        fetchedAt: new Date(),
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
   * Fetch TikTok metrics for a post
   */
  async fetchTikTokMetricsForPost(post) {
    try {
      const tiktokVideoId = post.tiktokVideoId || post.platformStatus?.tiktok?.videoId;

      if (!tiktokVideoId) {
        return {
          success: false,
          error: 'No TikTok video ID found',
          code: 'MISSING_VIDEO_ID',
        };
      }

      logger.info(`Fetching TikTok metrics for video ${tiktokVideoId}...`);

      // Use tiktokPostingService to fetch user videos and find the matching one
      const { default: tiktokPostingService } = await import('./tiktokPostingService.js');
      const videosResult = await tiktokPostingService.fetchUserVideos();

      if (!videosResult.success) {
        return {
          success: false,
          error: videosResult.error,
          code: 'FETCH_FAILED',
        };
      }

      const video = videosResult.videos.find(v => v.id === tiktokVideoId);

      if (!video) {
        return {
          success: false,
          error: 'Video not found in TikTok account',
          code: 'VIDEO_NOT_FOUND',
        };
      }

      return {
        success: true,
        data: {
          views: video.view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch TikTok metrics', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch Instagram metrics for a post
   * CRITICAL FIX: Use the correct media ID and API endpoint for insights
   */
  async fetchInstagramMetricsForPost(post) {
    try {
      // Get media ID from platformStatus (this is the CORRECT ID for insights)
      const mediaId = post.platformStatus?.instagram?.mediaId || post.instagramMediaId;

      if (!mediaId) {
        return {
          success: false,
          error: 'No Instagram media ID found',
          code: 'MISSING_MEDIA_ID',
        };
      }

      logger.info(`Fetching Instagram metrics for media ${mediaId}...`);

      // Ensure we have Page Access Token (required for insights)
      const { default: instagramPostingService } = await import('./instagramPostingService.js');
      const pageTokenResult = await instagramPostingService.ensurePageAccessToken();

      if (!pageTokenResult.success) {
        return {
          success: false,
          error: pageTokenResult.error,
          code: 'NO_PAGE_TOKEN',
        };
      }

      const pageAccessToken = pageTokenResult.pageAccessToken;
      const instagramUserId = instagramPostingService.instagramUserId;

      if (!pageAccessToken) {
        return {
          success: false,
          error: 'Page Access Token not available',
          code: 'NO_PAGE_TOKEN',
        };
      }

      // Instagram Media Insights API
      // CRITICAL: Use media ID from platformStatus.instagram.mediaId
      // The insights endpoint is: /{media_id}/insights?metric=...
      const baseURL = 'https://graph.facebook.com/v18.0';

      // CRITICAL FIX: First get media product type to determine which metrics to request
      // Different media types (REELS, STORY, FEED) support different metrics
      // Reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights
      logger.info(`Fetching media product type for ${mediaId}...`);

      const mediaInfoResponse = await fetch(`${baseURL}/${mediaId}?fields=media_product_type,media_type`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pageAccessToken}`,
        },
      });

      if (!mediaInfoResponse.ok) {
        const errorText = await mediaInfoResponse.text();
        throw new Error(`Instagram media info API error ${mediaInfoResponse.status}: ${errorText}`);
      }

      const mediaInfo = await mediaInfoResponse.json();

      if (mediaInfo.error) {
        throw new Error(`Instagram media info API error: ${mediaInfo.error.message} (${mediaInfo.error.code})`);
      }

      const mediaProductType = mediaInfo.media_product_type; // 'FEED', 'STORY', 'REELS', or 'AD'

      logger.info(`Media product type: ${mediaProductType}`, {
        mediaId,
        mediaProductType,
        mediaType: mediaInfo.media_type,
      });

      // Select metrics based on media product type
      // IMPORTANT: Different media types support different metrics
      // - REELS: views (new), reach, saved, shares, likes, comments, total_interactions
      // - STORY: impressions (for stories created before July 2, 2024), reach, saved, replies, navigation
      // - FEED: impressions, reach, saved, shares
      let metricsToRequest;
      if (mediaProductType === 'REELS') {
        // REELS-specific metrics (impressions and video_views NOT available)
        // 'views' replaced 'video_views' (deprecated)
        metricsToRequest = 'views,reach,saved,likes,comments,shares';
      } else if (mediaProductType === 'STORY') {
        // STORY metrics (includes impressions for stories created before July 2, 2024)
        metricsToRequest = 'impressions,reach,saved,replies,navigation';
      } else {
        // FEED posts (or default)
        metricsToRequest = 'impressions,reach,saved,shares';
      }

      const insightsEndpoint = `/${mediaId}/insights`;
      const params = new URLSearchParams({
        metric: metricsToRequest,
      });

      logger.info(`Fetching Instagram insights for media ${mediaId}`, {
        endpoint: `${baseURL}${insightsEndpoint}?${params}`,
        mediaProductType,
        metricsToRequest,
      });

      const response = await fetch(`${baseURL}${insightsEndpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pageAccessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Instagram API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Instagram API error: ${data.error.message} (${data.error.code})`);
      }

      // Parse insights response
      // Instagram returns data as: { data: [{ metrics: { ... }, values: [...] }] }
      const insightsData = data.data || [];

      logger.info('Instagram insights response', {
        mediaId,
        insightsCount: insightsData.length,
        rawData: JSON.stringify(insightsData).substring(0, 500),
      });

      // Extract metrics from insights data
      // Structure: each metric has { name, values: [{ value }] }
      const getMetricValue = (metricName) => {
        const metric = insightsData.find(m => m.name === metricName);
        if (metric && metric.values && metric.values.length > 0) {
          return metric.values[0].value || 0;
        }
        return 0;
      };

      // Get metrics based on what was requested
      // For REELS: views is the primary view metric (replaces deprecated video_views)
      // For FEED/STORY: may still get impressions
      const views = getMetricValue('views') || getMetricValue('impressions') || 0;
      const reach = getMetricValue('reach');
      const saved = getMetricValue('saved');

      // Engagement is a composite metric - we need individual metrics
      // Fetch media object to get likes, comments, shares separately
      let likes = 0;
      let comments = 0;
      let shares = 0;

      try {
        const mediaEndpoint = `/${mediaId}?fields=like_count,comments_count,share_count`;
        const mediaResponse = await fetch(`${baseURL}${mediaEndpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pageAccessToken}`,
          },
        });

        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          likes = mediaData.like_count || 0;
          comments = mediaData.comments_count || 0;
          shares = mediaData.share_count || 0;
        }
      } catch (mediaError) {
        logger.warn('Could not fetch individual engagement metrics', {
          error: mediaError.message,
        });
      }

      logger.info(`Instagram metrics fetched for media ${mediaId}`, {
        views,
        likes,
        comments,
        shares,
        saved,
        reach,
      });

      return {
        success: true,
        data: {
          views,
          likes,
          comments,
          shares,
          saved,
          reach,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch Instagram metrics', {
        postId: post?._id,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch YouTube metrics for a post
   * Uses YouTube Data API v3 videos.list endpoint with statistics part
   */
  async fetchYouTubeMetricsForPost(post) {
    try {
      const videoId = post.platformStatus?.youtube_shorts?.mediaId ||
                      post.youtubeVideoId;

      if (!videoId) {
        return {
          success: false,
          error: 'No YouTube video ID found',
          code: 'MISSING_VIDEO_ID',
        };
      }

      logger.info(`Fetching YouTube metrics for video ${videoId}...`);

      // YouTube Data API v3 - videos.list endpoint
      // NOTE: Statistics are public, no OAuth required - just API key
      const apiKey = this.platforms.youtube.apiKey;

      if (!apiKey) {
        return {
          success: false,
          error: 'YouTube API key not configured',
          code: 'MISSING_API_KEY',
        };
      }

      const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics&key=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch video statistics');
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return {
          success: false,
          error: 'Video not found or statistics not available',
          code: 'VIDEO_NOT_FOUND',
        };
      }

      const stats = data.items[0].statistics;

      logger.info(`YouTube metrics fetched for video ${videoId}`, {
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
      });

      return {
        success: true,
        data: {
          views: parseInt(stats.viewCount) || 0,
          likes: parseInt(stats.likeCount) || 0,
          comments: parseInt(stats.commentCount) || 0,
          shares: 0, // YouTube API doesn't provide shares
        },
      };

    } catch (error) {
      logger.error('Failed to fetch YouTube metrics', {
        postId: post?._id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate engagement rate
   * Formula: (likes + comments + shares) / views * 100
   */
  calculateEngagementRate(metrics) {
    const { views = 0, likes = 0, comments = 0, shares = 0, saved = 0 } = metrics;

    if (views === 0) {
      return 0;
    }

    // Include saved in engagement calculation
    const engagement = likes + comments + shares + saved;
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

      logger.info('Batch fetch complete', {
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
   * Delay helper for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const performanceMetricsService = new PerformanceMetricsService();

export default performanceMetricsService;
