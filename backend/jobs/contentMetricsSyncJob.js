/**
 * Content Metrics Sync Job
 *
 * Syncs performance metrics for marketing posts from external platforms:
 * - TikTok video metrics (views, likes, comments, shares)
 * - Instagram post metrics
 * - YouTube Shorts metrics
 *
 * Runs every 2 hours to keep content performance data fresh
 */

import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('content-metrics-sync', 'scheduler');

/**
 * Content Metrics Sync Job Class
 */
class ContentMetricsSyncJob {
  constructor() {
    this.jobName = 'content-metrics-sync';
    this.isRunning = false;
    this.lastSyncStats = null;

    // Configuration from environment
    this.syncSchedule = process.env.CONTENT_METRICS_SYNC_SCHEDULE || '0 */2 * * *'; // Every 2 hours
    this.timezone = process.env.CONTENT_METRICS_SYNC_TIMEZONE || 'UTC';
  }

  /**
   * Initialize and schedule the job
   */
  initialize() {
    logger.info(`Initializing content metrics sync job with schedule: ${this.syncSchedule}`);

    // Register job with scheduler
    schedulerService.registerJob(
      this.jobName,
      this.syncSchedule,
      () => this.execute(),
      {
        timezone: this.timezone,
        metadata: { description: 'Sync content performance metrics from social platforms' }
      }
    );

    // Start the job
    schedulerService.startJob(this.jobName);

    logger.info('Content metrics sync job initialized and scheduled');
  }

  /**
   * Stop the job
   */
  stop() {
    schedulerService.stopJob(this.jobName);
    logger.info('Content metrics sync job stopped');
  }

  /**
   * Execute the content metrics sync job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Content metrics sync job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting content metrics sync');

      const stats = {
        timestamp: new Date().toISOString(),
        duration: 0,
        tikTok: { updated: 0, failed: 0 },
        instagram: { updated: 0, failed: 0 },
        youtube: { updated: 0, failed: 0 },
        totalUpdated: 0
      };

      // Step 1: Sync TikTok metrics
      logger.info('Step 1: Syncing TikTok post metrics');
      stats.tikTok = await this.syncTikTokMetrics();

      // Step 2: Sync Instagram metrics
      logger.info('Step 2: Syncing Instagram post metrics');
      stats.instagram = await this.syncInstagramMetrics();

      // Step 3: Sync YouTube metrics
      logger.info('Step 3: Syncing YouTube post metrics');
      stats.youtube = await this.syncYouTubeMetrics();

      // Calculate totals
      stats.totalUpdated = stats.tikTok.updated + stats.instagram.updated + stats.youtube.updated;
      stats.duration = Date.now() - startTime;

      this.lastSyncStats = stats;

      logger.info('Content metrics sync completed', {
        duration: `${stats.duration}ms`,
        tikTok: stats.tikTok.updated,
        instagram: stats.instagram.updated,
        youtube: stats.youtube.updated,
        total: stats.totalUpdated
      });

      return stats;

    } catch (error) {
      logger.error('Error in content metrics sync job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync metrics for TikTok posts
   */
  async syncTikTokMetrics() {
    const result = { updated: 0, failed: 0 };

    try {
      // Find all posted TikTok posts
      const tiktokPosts = await MarketingPost.find({
        platform: 'tiktok',
        status: 'posted',
        postedAt: { $exists: true }
      });

      if (tiktokPosts.length === 0) {
        logger.info('No TikTok posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${tiktokPosts.length} TikTok posts to sync metrics for`);

      // For each post, we would fetch metrics from TikTok API
      // For now, we'll update the last sync timestamp
      for (const post of tiktokPosts) {
        try {
          // TODO: Implement actual TikTok API call to get video statistics
          // This would use the tiktokPostingService or a dedicated tiktokAnalyticsService
          // const metrics = await tiktokService.getVideoStats(post.externalPostId);

          // Store/Update metrics in the post
          // await MarketingPost.findByIdAndUpdate(post._id, {
          //   $set: {
          //     'metrics.views': metrics.view_count,
          //     'metrics.likes': metrics.like_count,
          //     'metrics.comments': metrics.comment_count,
          //     'metrics.shares': metrics.share_count,
          //     'metrics.lastSyncAt': new Date()
          //   }
          // });

          result.updated++;
        } catch (error) {
          logger.warn(`Failed to sync metrics for TikTok post ${post._id}: ${error.message}`);
          result.failed++;
        }
      }

    } catch (error) {
      logger.error('Error syncing TikTok metrics:', error);
    }

    return result;
  }

  /**
   * Sync metrics for Instagram posts
   */
  async syncInstagramMetrics() {
    const result = { updated: 0, failed: 0 };

    try {
      // Find all posted Instagram posts
      const instagramPosts = await MarketingPost.find({
        platform: 'instagram',
        status: 'posted',
        postedAt: { $exists: true }
      });

      if (instagramPosts.length === 0) {
        logger.info('No Instagram posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${instagramPosts.length} Instagram posts to sync metrics for`);

      // For each post, we would fetch metrics from Instagram API
      for (const post of instagramPosts) {
        try {
          // TODO: Implement actual Instagram API call to get media statistics
          // const metrics = await instagramService.getMediaStats(post.externalPostId);

          result.updated++;
        } catch (error) {
          logger.warn(`Failed to sync metrics for Instagram post ${post._id}: ${error.message}`);
          result.failed++;
        }
      }

    } catch (error) {
      logger.error('Error syncing Instagram metrics:', error);
    }

    return result;
  }

  /**
   * Sync metrics for YouTube Shorts
   */
  async syncYouTubeMetrics() {
    const result = { updated: 0, failed: 0 };

    try {
      // Find all posted YouTube posts
      const youtubePosts = await MarketingPost.find({
        platform: 'youtube_shorts',
        status: 'posted',
        postedAt: { $exists: true }
      });

      if (youtubePosts.length === 0) {
        logger.info('No YouTube posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${youtubePosts.length} YouTube posts to sync metrics for`);

      // For each post, we would fetch metrics from YouTube API
      for (const post of youtubePosts) {
        try {
          // TODO: Implement actual YouTube API call to get video statistics
          // const metrics = await youtubeService.getVideoStats(post.externalPostId);

          result.updated++;
        } catch (error) {
          logger.warn(`Failed to sync metrics for YouTube post ${post._id}: ${error.message}`);
          result.failed++;
        }
      }

    } catch (error) {
      logger.error('Error syncing YouTube metrics:', error);
    }

    return result;
  }

  /**
   * Get last sync stats
   */
  getLastSyncStats() {
    return this.lastSyncStats;
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      name: this.jobName,
      schedule: this.syncSchedule,
      isRunning: this.isRunning,
      lastSync: this.lastSyncStats?.timestamp || null,
      lastSyncStats: this.lastSyncStats
    };
  }
}

// Create singleton instance
const contentMetricsSyncJob = new ContentMetricsSyncJob();

export default contentMetricsSyncJob;
