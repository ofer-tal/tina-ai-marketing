/**
 * Instagram Reels Matcher Job
 *
 * Matches Instagram Reels to database posts and syncs stats.
 * This is needed because Instagram posts are made via direct API,
 * but we still need to sync performance metrics over time.
 *
 * Runs every 30 minutes to:
 * 1. Fetch recent media from Instagram via API
 * 2. Match media to database posts by instagramMediaId
 * 3. Update performance metrics (views, likes, comments)
 * 4. Track metrics history over time
 *
 * Environment variables:
 * - INSTAGRAM_MATCHER_SCHEDULE: Cron schedule (default: every 30 minutes)
 * - INSTAGRAM_MATCHER_TIMEZONE: Timezone (default: 'UTC')
 */

import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import instagramPostingService from '../services/instagramPostingService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('instagram-reels-matcher', 'scheduler');

/**
 * Instagram Reels Matcher Job Class
 */
class InstagramReelsMatcherJob {
  constructor() {
    this.jobName = 'instagram-reels-matcher';
    this.isRunning = false;
    this.lastMatchStats = null;

    // Configuration from environment
    this.matchSchedule = process.env.INSTAGRAM_MATCHER_SCHEDULE || '*/30 * * * *'; // Every 30 minutes
    this.timezone = process.env.INSTAGRAM_MATCHER_TIMEZONE || 'UTC';
  }

  /**
   * Initialize and schedule the job
   */
  async initialize() {
    logger.info(`Initializing Instagram Reels matcher job with schedule: ${this.matchSchedule}`);

    try {
      await schedulerService.registerJob(
        this.jobName,
        this.matchSchedule,
        () => this.execute(),
        {
          timezone: this.timezone,
          metadata: { description: 'Match Instagram Reels to database posts and sync stats' },
          persist: true
        }
      );

      logger.info('Instagram Reels matcher job initialized and scheduled');
    } catch (error) {
      logger.error('Failed to initialize Instagram Reels matcher job', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Stop the job
   */
  stop() {
    schedulerService.stopJob(this.jobName);
    logger.info('Instagram Reels matcher job stopped');
  }

  /**
   * Execute the matching job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Instagram Reels matcher job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting Instagram Reels matching and stats sync');

      const stats = {
        timestamp: new Date().toISOString(),
        duration: 0,
        mediaFetched: 0,
        metricsUpdated: 0,
        errors: 0,
      };

      // Step 1: Find all posts with instagramMediaId
      const postsWithInstagramId = await MarketingPost.find({
        platform: 'instagram',
        instagramMediaId: { $exists: true, $ne: null },
      });

      logger.info(`Found ${postsWithInstagramId.length} Instagram posts with media IDs`);

      if (postsWithInstagramId.length === 0) {
        logger.info('No Instagram posts to sync stats for');
        this.lastMatchStats = stats;
        this.isRunning = false;
        return stats;
      }

      // Step 2: Fetch insights for each media ID
      for (const post of postsWithInstagramId) {
        try {
          await this._updatePostMetrics(post);
          stats.metricsUpdated++;
        } catch (error) {
          logger.warn(`Failed to update metrics for Instagram post ${post._id}`, {
            error: error.message,
            instagramMediaId: post.instagramMediaId
          });
          stats.errors++;
        }
      }

      stats.duration = Date.now() - startTime;
      stats.mediaFetched = postsWithInstagramId.length;
      this.lastMatchStats = stats;

      logger.info('Instagram Reels stats sync completed', {
        mediaFetched: stats.mediaFetched,
        metricsUpdated: stats.metricsUpdated,
        errors: stats.errors,
        duration: `${stats.duration}ms`,
      });

      return stats;

    } catch (error) {
      logger.error('Error in Instagram Reels matcher job', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update metrics for a single Instagram post
   * @param {MarketingPost} post - The post to update
   */
  async _updatePostMetrics(post) {
    try {
      if (!post.instagramMediaId) {
        logger.warn(`Post ${post._id} has no instagramMediaId`);
        return;
      }

      // Fetch insights from Instagram Graph API
      const insights = await this._fetchMediaInsights(post.instagramMediaId);

      if (!insights) {
        logger.debug(`No insights available for media ${post.instagramMediaId}`);
        return;
      }

      // Extract metrics from insights
      const metrics = this._extractMetrics(insights);

      // Update post with current metrics
      post.performanceMetrics = {
        views: metrics.views || post.performanceMetrics?.views || 0,
        likes: metrics.likes || post.performanceMetrics?.likes || 0,
        comments: metrics.comments || post.performanceMetrics?.comments || 0,
        shares: metrics.shares || post.performanceMetrics?.shares || 0,
        engagementRate: this._calculateEngagementRate(metrics),
      };

      post.metricsLastFetchedAt = new Date();

      // Add to metrics history
      post.metricsHistory = post.metricsHistory || [];
      post.metricsHistory.push({
        fetchedAt: new Date(),
        views: metrics.views || 0,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        engagementRate: post.performanceMetrics.engagementRate,
      });

      // Keep only last 90 days of history
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      post.metricsHistory = post.metricsHistory.filter(h => h.fetchedAt >= ninetyDaysAgo);

      await post.save();

      logger.debug(`Updated metrics for Instagram post ${post._id}`, {
        instagramMediaId: post.instagramMediaId,
        views: post.performanceMetrics.views,
        likes: post.performanceMetrics.likes,
        comments: post.performanceMetrics.comments,
      });

    } catch (error) {
      logger.error(`Failed to update metrics for Instagram post ${post._id}`, {
        error: error.message,
        instagramMediaId: post.instagramMediaId,
      });
      throw error;
    }
  }

  /**
   * Fetch insights for a media ID from Instagram Graph API
   * @param {string} mediaId - Instagram media ID
   * @returns {Object|null} Insights data or null if not available
   */
  async _fetchMediaInsights(mediaId) {
    try {
      // Get Instagram user ID from service
      const instagramUserId = instagramPostingService.instagramUserId;
      if (!instagramUserId) {
        // Try to discover business account
        const discoveryResult = await instagramPostingService.discoverBusinessAccount();
        if (!discoveryResult.success) {
          throw new Error('Could not discover Instagram business account');
        }
      }

      // Fetch media insights using the Instagram Graph API
      // Endpoint: GET /{instagram-media-id}/insights?metric=impressions,reach,engagement
      const token = await (await import('../services/oauthManager.js')).default.getToken('instagram');
      if (!token || !token.accessToken) {
        throw new Error('Not authenticated - no access token');
      }

      const baseUrl = 'https://graph.facebook.com/v18.0';
      const metrics = ['impressions', 'reach', 'engagement', 'likes', 'comments', 'shares'];
      const metricsParam = metrics.join(',');

      const url = `${baseUrl}/${mediaId}/insights?metric=${metricsParam}&access_token=${token.accessToken}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Insights fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Also fetch basic media data (like_count, comments_count)
      const mediaUrl = `${baseUrl}/${mediaId}?fields=like_count,comments_count,media_type&access_token=${token.accessToken}`;
      const mediaResponse = await fetch(mediaUrl);

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        if (!mediaData.error) {
          data.mediaData = mediaData;
        }
      }

      return data;

    } catch (error) {
      logger.error(`Failed to fetch insights for Instagram media ${mediaId}`, {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Extract metrics from Instagram insights response
   * @param {Object} insights - Insights response from Instagram API
   * @returns {Object} Extracted metrics
   */
  _extractMetrics(insights) {
    const metrics = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    // Extract from insights data
    if (insights.data && Array.isArray(insights.data)) {
      for (const item of insights.data) {
        const metricName = item.name;
        const values = item.values;

        if (values && values.length > 0) {
          const value = values[0].value || 0;

          switch (metricName) {
            case 'impressions':
              metrics.views = value;
              break;
            case 'likes':
              metrics.likes = value;
              break;
            case 'comments':
              metrics.comments = value;
              break;
            case 'shares':
              metrics.shares = value;
              break;
          }
        }
      }
    }

    // Also check mediaData for direct counts (more reliable for likes/comments)
    if (insights.mediaData) {
      if (insights.mediaData.like_count) {
        metrics.likes = insights.mediaData.like_count;
      }
      if (insights.mediaData.comments_count) {
        metrics.comments = insights.mediaData.comments_count;
      }
    }

    return metrics;
  }

  /**
   * Calculate engagement rate
   * @param {Object} metrics - Metrics object
   * @returns {number} Engagement rate as percentage
   */
  _calculateEngagementRate(metrics) {
    if (!metrics.views || metrics.views === 0) {
      return 0;
    }

    const totalEngagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    return (totalEngagement / metrics.views) * 100;
  }

  /**
   * Get last match stats
   */
  getLastMatchStats() {
    return this.lastMatchStats;
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      name: this.jobName,
      schedule: this.matchSchedule,
      isRunning: this.isRunning,
      lastMatch: this.lastMatchStats?.timestamp || null,
      lastMatchStats: this.lastMatchStats,
    };
  }

  /**
   * Manually trigger the job (for testing)
   */
  async trigger() {
    logger.info('Manually triggering Instagram Reels matcher job');
    await this.execute();
  }
}

// Create singleton instance
const instagramReelsMatcherJob = new InstagramReelsMatcherJob();

export default instagramReelsMatcherJob;
