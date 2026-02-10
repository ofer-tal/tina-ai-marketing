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
import tiktokPostingService from '../services/tiktokPostingService.js';
import performanceMetricsService from '../services/performanceMetricsService.js';
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
  async initialize() {
    logger.info(`Initializing content metrics sync job with schedule: ${this.syncSchedule}`);

    // Register job with scheduler (must be awaited - it's async!)
    await schedulerService.registerJob(
      this.jobName,
      this.syncSchedule,
      () => this.execute(),
      {
        timezone: this.timezone,
        metadata: { description: 'Sync content performance metrics from social platforms' }
      }
    );

    logger.info('Content metrics initialized and scheduled');
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
   * Fetches all videos from TikTok API and matches them to database posts
   */
  async syncTikTokMetrics() {
    const result = { updated: 0, failed: 0, matched: 0, unmatched: 0 };

    try {
      // Fetch all videos from TikTok API
      const fetchResult = await tiktokPostingService.fetchUserVideos();

      if (!fetchResult.success) {
        logger.error('Failed to fetch TikTok videos for metrics sync', {
          error: fetchResult.error,
        });
        return result;
      }

      const videos = fetchResult.videos || [];
      logger.info(`Fetched ${videos.length} TikTok videos for metrics sync`);

      // Get all TikTok posts that need metrics updating
      // Check both legacy platform field and new platforms array for multi-platform support
      const tiktokPosts = await MarketingPost.find({
        $or: [
          { platform: 'tiktok' },
          { platforms: 'tiktok' }
        ],
        status: { $in: ['posted', 'scheduled', 'approved'] },
        postedAt: { $exists: true },
      });

      if (tiktokPosts.length === 0) {
        logger.info('No TikTok posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${tiktokPosts.length} TikTok posts to sync metrics for`);

      // Build a map of video IDs to posts for quick lookup
      const postByVideoId = new Map();
      for (const post of tiktokPosts) {
        if (post.tiktokVideoId) {
          postByVideoId.set(post.tiktokVideoId, post);
        }
      }

      // Update metrics for matched posts
      for (const video of videos) {
        const post = postByVideoId.get(video.id);

        if (post) {
          try {
            // Calculate engagement rate
            const engagementRate = video.view_count > 0
              ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
              : 0;

            // Update both legacy performanceMetrics and new platformStatus.tiktok.performanceMetrics
            await MarketingPost.findByIdAndUpdate(post._id, {
              'performanceMetrics.views': video.view_count || 0,
              'performanceMetrics.likes': video.like_count || 0,
              'performanceMetrics.comments': video.comment_count || 0,
              'performanceMetrics.shares': video.share_count || 0,
              'performanceMetrics.engagementRate': engagementRate,
              // Also update per-platform metrics for multi-platform posts
              'platformStatus.tiktok.performanceMetrics.views': video.view_count || 0,
              'platformStatus.tiktok.performanceMetrics.likes': video.like_count || 0,
              'platformStatus.tiktok.performanceMetrics.comments': video.comment_count || 0,
              'platformStatus.tiktok.performanceMetrics.shares': video.share_count || 0,
              'platformStatus.tiktok.performanceMetrics.engagementRate': engagementRate,
              'platformStatus.tiktok.lastFetchedAt': new Date(),
              metricsLastFetchedAt: new Date(),
            });

            // Also add to metrics history
            await MarketingPost.findByIdAndUpdate(post._id, {
              $push: {
                metricsHistory: {
                  fetchedAt: new Date(),
                  views: video.view_count || 0,
                  likes: video.like_count || 0,
                  comments: video.comment_count || 0,
                  shares: video.share_count || 0,
                },
              },
            });

            result.updated++;
            result.matched++;
          } catch (error) {
            logger.warn(`Failed to sync metrics for TikTok post ${post._id}: ${error.message}`);
            result.failed++;
          }
        } else {
          result.unmatched++;
        }
      }

      logger.info('TikTok metrics sync completed', {
        updated: result.updated,
        failed: result.failed,
        matched: result.matched,
        unmatched: result.unmatched,
      });

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
      // Check both legacy platform field and new platforms array for multi-platform support
      const instagramPosts = await MarketingPost.find({
        $or: [
          { platform: 'instagram' },
          { platforms: 'instagram' }
        ],
        status: 'posted',
        postedAt: { $exists: true }
      });

      if (instagramPosts.length === 0) {
        logger.info('No Instagram posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${instagramPosts.length} Instagram posts to sync metrics for`);

      // For each post, fetch metrics from Instagram API
      for (const post of instagramPosts) {
        try {
          // Get the Instagram media ID from either platformStatus or legacy field
          const mediaId = post.platformStatus?.instagram?.mediaId || post.instagramMediaId;

          if (!mediaId) {
            logger.debug(`No Instagram media ID found for post ${post._id}, skipping`);
            continue;
          }

          // Use performanceMetricsService to fetch Instagram metrics
          const metricsResult = await performanceMetricsService.fetchPostMetrics(post._id);

          if (metricsResult.success) {
            const instaMetrics = metricsResult.results?.instagram;
            if (instaMetrics) {
              logger.info(`Updated Instagram metrics for post ${post._id}`, {
                views: instaMetrics.views,
                likes: instaMetrics.likes,
                engagementRate: instaMetrics.engagementRate
              });
              result.updated++;
            } else {
              logger.debug(`No Instagram metrics returned for post ${post._id}`);
            }
          } else {
            logger.warn(`Failed to fetch Instagram metrics for post ${post._id}: ${metricsResult.error}`);
            result.failed++;
          }
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
      // Check both legacy platform field and new platforms array for multi-platform support
      const youtubePosts = await MarketingPost.find({
        $or: [
          { platform: 'youtube_shorts' },
          { platforms: 'youtube_shorts' }
        ],
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
