/**
 * Performance Metrics Service
 *
 * Fetches performance metrics from social platforms:
 * - TikTok video metrics (views, likes, comments, shares)
 * - Instagram post metrics
 * - YouTube Shorts metrics
 *
 * IMPORTANT 2025 UPDATE: Instagram API now uses unified "views" metric instead of
 * separate metrics (impressions, plays, video_views). See:
 * https://developers.facebook.com/blog/post/2025/12/03/instagram-api-updates/
 *
 * Runs every 2 hours to keep content performance data fresh
 */

import oauthManager from '../services/oauthManager.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('performance-metrics', 'services');

class PerformanceMetricsService {
  constructor() {
    // Platform API configurations
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
  }

  /**
   * Get platform-specific video ID from post
   */
  getPlatformVideoId(post, platform) {
    // If platform is specified, use it; otherwise use legacy post.platform
    const targetPlatform = platform || post.platform;

    switch (targetPlatform) {
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
   * Fetch metrics for a specific post
   */
  async fetchPostMetrics(postId) {
    logger.info(`[INSTAGRAM POST-METRICS] Fetching for postId=${postId}`);

    const post = await MarketingPost.findById(postId);
    if (!post) {
      logger.warn(`[INSTAGRAM POST-METRICS] Post not found: ${postId}`);
      return {
        success: false,
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      };
    }

    const platforms = post.platforms && Array.isArray(post.platforms) ? post.platforms : [post.platform].filter(Boolean);
    const results = {
      tiktok: null,
      instagram: null,
      youtube: null
    };

    // Fetch metrics for each platform
    for (const platform of platforms) {
      logger.info(`[INSTAGRAM POST-METRICS] Processing platform: ${platform}`);

      // Get the platform-specific video ID
      const videoId = this.getPlatformVideoId(post, platform);
      if (!videoId) {
        logger.warn(`[INSTAGRAM POST-METRICS] No video ID for platform ${platform}`);
        continue;
      }

      try {
        let metrics;

        switch (platform) {
          case 'tiktok':
            metrics = await this.fetchTikTokMetrics(videoId);
            break;

          case 'instagram':
            metrics = await this.fetchInstagramMetrics(videoId);
            break;

          case 'youtube_shorts':
            metrics = await this.fetchYouTubeMetrics(videoId);
            break;

          default:
            logger.warn(`[INSTAGRAM POST-METRICS] Unsupported platform: ${platform}`);
        }

        if (metrics.success) {
          results[platform] = metrics.data;
        } else {
          results[platform] = {
            success: false,
            error: metrics.error,
            code: metrics.code || 'PLATFORM_ERROR'
          };
        }
      } catch (error) {
        logger.error(`[INSTAGRAM POST-METRICS] Error fetching ${platform} metrics:`, {
          postId,
          platform,
          error: error.message,
          stack: error.stack
        });
        results[platform] = {
          success: false,
          error: error.message,
          code: 'FETCH_ERROR'
        };
      }
    }

    // Return combined results
    return {
      success: Object.values(results).every(r => r.success !== false),
      results: results
    };
  }

  /**
   * Fetch metrics from TikTok API
   * Uses matched videos from TikTok posting service to get view counts
   */
  async fetchTikTokMetrics(videoId) {
    logger.info(`[INSTAGRAM TIKTOK] Fetching for videoId=${videoId}`);

    try {
      // Fetch all videos from TikTok to find matching one
      const fetchResult = await tiktokPostingService.fetchUserVideos();

      if (!fetchResult.success) {
        return {
          success: false,
          error: fetchResult.error,
          data: null
        };
      }

      const videos = fetchResult.videos || [];
      logger.info(`[INSTAGRAM TIKTOK] Fetched ${videos.length} videos from TikTok API`);

      // Find the matching video
      const video = videos.find(v => v.id === videoId);

      if (!video) {
        return {
          success: false,
          error: 'Video not found on TikTok',
          data: null
        };
      }

      logger.info(`[INSTAGRAM TIKTOK] Found video: views=${video.view_count}, likes=${video.like_count}`);

      // Calculate engagement rate
      const engagementRate = video.view_count > 0
        ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
        : 0;

      return {
        success: true,
        data: {
          views: video.view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
          engagementRate: engagementRate
        }
      };

    } catch (error) {
      logger.error(`[INSTAGRAM TIKTOK] Failed to fetch TikTok metrics:`, {
        videoId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Fetch metrics from Instagram Graph API
   * 2025 UPDATE: Now uses unified "views" metric (not impressions/plays)
   * API: https://graph.facebook.com/v18.0/{media_id}/insights
   * Metrics requested: views,likes,comments,saved,reach
   *
   * IMPORTANT: Instagram Reels often have 0 views initially. The views metric
   * populates asynchronously, sometimes hours/days after posting. This is NORMAL behavior.
   */
  async fetchInstagramMetrics(mediaId) {
    logger.info(`[INSTAGRAM METRICS] Fetching for mediaId=${mediaId}`);

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

      logger.info(`[INSTAGRAM BASIC] Fetching basic media data for mediaId=${mediaId}`);

      // First, fetch basic media data (like_count, comments_count, media_type)
      // NOTE: media_type tells us if it's a CAROUSEL or REEL
      const mediaResponse = await oauthManager.fetch('instagram', `${this.platforms.instagram.baseURL}/${mediaId}?fields=like_count,comments_count,media_type`, {
        method: 'GET',
      });

      let likes = 0;
      let comments = 0;
      let mediaType = null;

      if (!mediaResponse.error && mediaResponse) {
        likes = mediaResponse.like_count || 0;
        comments = mediaResponse.comments_count || 0;
        mediaType = mediaResponse.media_type;
        logger.info(`[INSTAGRAM BASIC] Got basic media: likes=${likes}, comments=${comments}, type=${mediaType}`);
      } else {
        logger.error(`[INSTAGRAM BASIC] Fetch failed:`, mediaResponse.error);
      }

      // Then try to fetch insights for views and additional metrics
      let views = 0;
      let reach = 0;
      let shares = 0;
      let saved = 0;

      try {
        logger.info(`[INSTAGRAM INSIGHTS] Fetching insights for mediaId=${mediaId}`);

        // 2025 UPDATE: Use unified "views" metric - includes CAROUSEL and REEL views
        // Note: As of April 2025, Instagram uses "views" instead of separate impressions/plays/video_views metrics
        const insightsMetrics = mediaType === 'VIDEO'
          ? 'views,likes,comments,saved,reach'
          : 'engagement,impressions,reach'; // Fallback for non-VIDEO

        logger.info(`[INSTAGRAM INSIGHTS] Using metrics: ${insightsMetrics}`);

        const insightsResponse = await oauthManager.fetch('instagram', `${this.platforms.instagram.baseURL}/${mediaId}/insights?metric=${insightsMetrics}`, {
          method: 'GET',
        });

        // DEBUG: Log the entire insights response structure
        logger.info(`[INSTAGRAM DEBUG] Full insightsResponse:`, JSON.stringify(insightsResponse, null, 2));

        if (!insightsResponse.error && insightsResponse.data) {
          // Parse insights data - Instagram uses unified "views" metric (as of 2025)
          insightsResponse.data.forEach(metric => {
            const value = metric.values?.[0]?.value || 0;

            // DEBUG: Log each metric object structure
            logger.info(`[INSTAGRAM DEBUG] metric=${metric.name}, value=${value}, values_array=`, JSON.stringify(metric.values));

            // 2025 UPDATE: The "views" metric is the new unified metric
            if (metric.name === 'views') {
              views = value;
              logger.info(`[INSTAGRAM VIEWS] Found views metric: ${value}`);
            } else if (metric.name === 'impressions') {
              // impressions is now deprecated - use as fallback for views
              if (views === 0 && value > 0) {
                views = value;
                logger.info(`[INSTAGRAM FALLBACK] Using impressions for views: ${value}`);
              }
            } else if (metric.name === 'likes' || metric.name === 'comments' || metric.name === 'saved' || metric.name === 'reach' || metric.name === 'shares') {
              // These metric names are still valid
              // likes, comments, saved, reach, shares all exist in 2025 API
            } else if (metric.name === 'engagement' || metric.name === 'engagement_rate') {
              // Skip deprecated engagement metrics
              logger.debug(`[INSTAGRAM SKIP] Skipping deprecated metric: ${metric.name}`);
            } else if (metric.name === 'video_views') {
              // Deprecated video_views - skip
              logger.debug(`[INSTAGRAM SKIP] Skipping deprecated metric: video_views`);
            } else {
              logger.warn(`[INSTAGRAM UNKNOWN] Unexpected metric: ${metric.name}`);
            }
          });

          logger.info(`[INSTAGRAM FINAL] Parsed views=${views}, likes=${likes}, comments=${comments}, saved=${saved}, shares=${shares}, reach=${reach}`);
        } else {
          logger.error(`[INSTAGRAM INSIGHTS] Fetch failed:`, insightsResponse.error);
        }

        // After insights, use basic media data for anything missing
        // 2025 UPDATE: Check specifically for likes/comments since insights might be empty
        if (likes === 0 && mediaResponse.like_count > 0) {
          likes = mediaResponse.like_count;
          logger.info(`[INSTAGRAM FALLBACK] Using media likes: ${mediaResponse.like_count}`);
        }
        if (comments === 0 && mediaResponse.comments_count > 0) {
          comments = mediaResponse.comments_count;
          logger.info(`[INSTAGRAM FALLBACK] Using media comments: ${mediaResponse.comments_count}`);
        }

        logger.info(`[INSTAGRAM RESULT] mediaId=${mediaId}, type=${mediaType}, views=${views}, likes=${likes}, comments=${comments}, shares=${shares}, saved=${saved}, reach=${reach}`);

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
      };

    } catch (error) {
      logger.error(`[INSTAGRAM FETCH ERROR] mediaId=${mediaId}:`, {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Fetch metrics from YouTube Data API
   */
  async fetchYouTubeMetrics(videoId) {
    logger.info(`[INSTAGRAM YOUTUBE] Fetching for videoId=${videoId}`);

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

      const video = response.items?.[0];
      if (!video) {
        return {
          success: false,
          error: 'Video not found',
          data: null
        };
      }

      const statistics = video?.statistics || {};
      const views = statistics.viewCount || 0;
      const likes = statistics.likeCount || 0;
      const comments = statistics.commentCount || 0;
      const shares = 0; // YouTube doesn't have shares metric

      logger.info(`[INSTAGRAM YOUTUBE RESULT] views=${views}, likes=${likes}, comments=${comments}`);

      return {
        success: true,
        data: {
          views,
          likes,
          comments,
          shares: 0,
        }
      };

    } catch (error) {
      logger.error(`[INSTAGRAM YOUTUBE] Failed to fetch YouTube metrics:`, {
        videoId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        data: null
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
      reach: 0,
    };

    // Platform-specific patterns
    switch (platform) {
      case 'tiktok':
        baseMetrics.likes = Math.floor(baseMetrics.views * (0.05 + Math.random() * 0.10));
        baseMetrics.comments = Math.floor(baseMetrics.views * 0.02);
        baseMetrics.shares = Math.floor(baseMetrics.likes * 0.03);
        break;
      case 'instagram':
        baseMetrics.likes = Math.floor(baseMetrics.views * (0.10 + Math.random() * 0.05));
        baseMetrics.comments = Math.floor(baseMetrics.likes * 0.025);
        baseMetrics.shares = Math.floor(baseMetrics.likes * 0.04);
        break;
      case 'youtube':
        baseMetrics.likes = Math.floor(baseMetrics.views * (0.05 + Math.random() * 0.03));
        baseMetrics.comments = Math.floor(baseMetrics.views * 0.015);
        baseMetrics.shares = 0;
        break;
    }

    return {
      success: true,
      data: baseMetrics,
    };
  }
}

export default new PerformanceMetricsService();
