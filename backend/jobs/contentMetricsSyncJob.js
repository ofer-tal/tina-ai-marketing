/**
 * Content Metrics Sync Job
 *
 * Syncs performance metrics for marketing posts from external platforms:
 * - TikTok video metrics (views, likes, comments, shares)
 * - Instagram post metrics
 * - YouTube Shorts metrics
 *
 * Runs every 3 hours to keep content performance data fresh
 */

import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import performanceMetricsService from '../services/performanceMetricsService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('content-metrics-sync', 'scheduler');

/**
 * Calculates aggregate metrics from all posted platforms
 * Uses SUM for views, likes, comments, shares, saved
 * Uses MAX for reach and weighted average for engagement rate
 *
 * @param {Object} platformStatus - The platformStatus object from a post
 * @returns {Object} Aggregate metrics
 */
function calculateAggregateMetrics(platformStatus) {
  if (!platformStatus) {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saved: 0,
      reach: 0,
      engagementRate: 0
    };
  }

  let aggregate = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saved: 0,
    reach: 0,
    engagementRate: 0
  };

  // Find all platforms that are actually posted
  const postedPlatforms = Object.entries(platformStatus)
    .filter(([_, data]) => data?.status === 'posted');

  if (postedPlatforms.length === 0) {
    return aggregate;
  }

  // Aggregate metrics from all posted platforms
  postedPlatforms.forEach(([_, data]) => {
    const pm = data.performanceMetrics || {};
    aggregate.views += pm.views || 0;
    aggregate.likes += pm.likes || 0;
    aggregate.comments += pm.comments || 0;
    aggregate.shares += pm.shares || 0;
    aggregate.saved += pm.saved || 0;
    aggregate.reach = Math.max(aggregate.reach, pm.reach || 0);
  });

  // Calculate weighted average engagement rate
  const totalEngagement = aggregate.likes + aggregate.comments + aggregate.shares;
  aggregate.engagementRate = aggregate.views > 0
    ? (totalEngagement / aggregate.views) * 100
    : 0;

  return aggregate;
}

/**
 * Content Metrics Sync Job Class
 */
class ContentMetricsSyncJob {
  constructor() {
    this.jobName = 'content-metrics-sync';
    this.isRunning = false;
    this.lastSyncStats = null;

    // Configuration from environment
    this.syncSchedule = process.env.CONTENT_METRICS_SYNC_SCHEDULE || '0 */3 * * *'; // Every 3 hours (reduced from every 2 hours)
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
      // Check rate limit status before fetching
      const rateLimitStatus = tiktokPostingService.getRateLimitStatus();
      if (rateLimitStatus.rateLimited) {
        logger.warn('TikTok API is currently rate limited, skipping metrics sync', {
          resetAt: rateLimitStatus.resetAt,
        });
        return result;
      }

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
      // CRITICAL FIX: Also check platform-specific status for partially posted posts
      const tiktokPosts = await MarketingPost.find({
        $or: [
          { platform: 'tiktok' },
          { platforms: 'tiktok' }
        ],
        $or: [
          { status: { $in: ['posted', 'scheduled', 'approved'] } }, // Legacy field check
          { 'platformStatus.tiktok.status': 'posted' } // Multi-platform posts with TikTok posted
        ],
        // Check for postedAt at EITHER top level OR platform-specific level
        $or: [
          { postedAt: { $exists: true } }, // Legacy field
          { 'platformStatus.tiktok.postedAt': { $exists: true } } // Platform-specific field
        ]
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
            // Calculate engagement rate for TikTok
            const engagementRate = video.view_count > 0
              ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
              : 0;

            // First, update TikTok-specific metrics
            const updatedPlatformStatus = {
              ...(post.platformStatus || {}),
              tiktok: {
                ...(post.platformStatus?.tiktok || {}),
                performanceMetrics: {
                  views: video.view_count || 0,
                  likes: video.like_count || 0,
                  comments: video.comment_count || 0,
                  shares: video.share_count || 0,
                  engagementRate: engagementRate,
                },
                lastFetchedAt: new Date(),
              }
            };

            // Calculate aggregate metrics from ALL posted platforms (not just TikTok)
            const aggregateMetrics = calculateAggregateMetrics(updatedPlatformStatus);

            // Now update both platform-specific AND aggregate metrics
            await MarketingPost.findByIdAndUpdate(post._id, {
              // Platform-specific TikTok metrics
              'platformStatus.tiktok.performanceMetrics.views': video.view_count || 0,
              'platformStatus.tiktok.performanceMetrics.likes': video.like_count || 0,
              'platformStatus.tiktok.performanceMetrics.comments': video.comment_count || 0,
              'platformStatus.tiktok.performanceMetrics.shares': video.share_count || 0,
              'platformStatus.tiktok.performanceMetrics.engagementRate': engagementRate,
              'platformStatus.tiktok.lastFetchedAt': new Date(),
              // Overall aggregate metrics (sum of ALL posted platforms)
              'performanceMetrics.views': aggregateMetrics.views,
              'performanceMetrics.likes': aggregateMetrics.likes,
              'performanceMetrics.comments': aggregateMetrics.comments,
              'performanceMetrics.shares': aggregateMetrics.shares,
              'performanceMetrics.saved': aggregateMetrics.saved,
              'performanceMetrics.reach': aggregateMetrics.reach,
              'performanceMetrics.engagementRate': aggregateMetrics.engagementRate,
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
      // Find all Instagram posts that are posted
      // CRITICAL FIX: Check both legacy status field AND platform-specific status for multi-platform posts
      // This ensures we sync metrics for partially posted posts (e.g., Instagram posted, TikTok failed)
      const instagramPosts = await MarketingPost.find({
        $or: [
          { platform: 'instagram' },
          { platforms: 'instagram' }
        ],
        $or: [
          { status: 'posted' }, // Legacy single-platform posts
          { 'platformStatus.instagram.status': 'posted' } // Multi-platform posts with Instagram posted
        ],
        // Check for postedAt at EITHER top level OR platform-specific level
        $or: [
          { postedAt: { $exists: true } }, // Legacy field
          { 'platformStatus.instagram.postedAt': { $exists: true } } // Platform-specific field
        ]
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
              // Calculate engagement rate
              const engagementRate = instaMetrics.views > 0
                ? ((instaMetrics.likes + instaMetrics.comments + instaMetrics.shares) / instaMetrics.views) * 100
                : 0;

              logger.info(`Updating Instagram metrics for post ${post._id}`, {
                views: instaMetrics.views,
                likes: instaMetrics.likes,
                comments: instaMetrics.comments,
                shares: instaMetrics.shares,
                engagementRate: engagementRate
              });

              // Build updated platformStatus with Instagram metrics
              const updatedPlatformStatus = {
                ...(post.platformStatus || {}),
                instagram: {
                  ...(post.platformStatus?.instagram || {}),
                  performanceMetrics: {
                    views: instaMetrics.views || 0,
                    likes: instaMetrics.likes || 0,
                    comments: instaMetrics.comments || 0,
                    shares: instaMetrics.shares || 0,
                    saved: instaMetrics.saved || 0,
                    reach: instaMetrics.reach || 0,
                    engagementRate: engagementRate,
                  },
                  lastFetchedAt: new Date(),
                }
              };

              // Calculate aggregate metrics from ALL posted platforms (not just Instagram)
              const aggregateMetrics = calculateAggregateMetrics(updatedPlatformStatus);

              // Update both platform-specific AND aggregate metrics
              const updateResult = await MarketingPost.findByIdAndUpdate(post._id, {
                // Platform-specific Instagram metrics
                'platformStatus.instagram.performanceMetrics.views': instaMetrics.views || 0,
                'platformStatus.instagram.performanceMetrics.likes': instaMetrics.likes || 0,
                'platformStatus.instagram.performanceMetrics.comments': instaMetrics.comments || 0,
                'platformStatus.instagram.performanceMetrics.shares': instaMetrics.shares || 0,
                'platformStatus.instagram.performanceMetrics.engagementRate': engagementRate,
                'platformStatus.instagram.performanceMetrics.saved': instaMetrics.saved || 0,
                'platformStatus.instagram.performanceMetrics.reach': instaMetrics.reach || 0,
                'platformStatus.instagram.lastFetchedAt': new Date(),
                // Overall aggregate metrics (sum of ALL posted platforms)
                'performanceMetrics.views': aggregateMetrics.views,
                'performanceMetrics.likes': aggregateMetrics.likes,
                'performanceMetrics.comments': aggregateMetrics.comments,
                'performanceMetrics.shares': aggregateMetrics.shares,
                'performanceMetrics.saved': aggregateMetrics.saved,
                'performanceMetrics.reach': aggregateMetrics.reach,
                'performanceMetrics.engagementRate': aggregateMetrics.engagementRate,
                metricsLastFetchedAt: new Date(),
              }, { new: true }); // Return the updated document

              if (updateResult) {
                logger.info(`After update - post ${post._id} platformStatus.instagram:`, {
                  performanceMetrics: updateResult.platformStatus?.instagram?.performanceMetrics,
                  views: updateResult.performanceMetrics?.views,
                  lastFetchedAt: updateResult.platformStatus?.instagram?.lastFetchedAt
                });
              }

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
      // CRITICAL FIX: Also check platform-specific status for partially posted posts
      const youtubePosts = await MarketingPost.find({
        $or: [
          { platform: 'youtube_shorts' },
          { platforms: 'youtube_shorts' }
        ],
        $or: [
          { status: 'posted' }, // Legacy single-platform posts
          { 'platformStatus.youtube_shorts.status': 'posted' } // Multi-platform posts with YouTube posted
        ],
        // Check for postedAt at EITHER top level OR platform-specific level
        $or: [
          { postedAt: { $exists: true } }, // Legacy field
          { 'platformStatus.youtube_shorts.postedAt': { $exists: true } } // Platform-specific field
        ]
      });

      if (youtubePosts.length === 0) {
        logger.info('No YouTube posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${youtubePosts.length} YouTube posts to sync metrics for`);

      // For each post, fetch metrics from YouTube API
      for (const post of youtubePosts) {
        try {
          // Get video ID from platform status or legacy field
          const platformStatus = post.platformStatus?.youtube_shorts;
          const videoId = platformStatus?.mediaId || post.youtubeVideoId;

          if (!videoId) {
            logger.debug(`Skipping YouTube post ${post._id} - no video ID found`);
            continue;
          }

          // Fetch metrics using performance metrics service
          const metricsResult = await performanceMetricsService.fetchYouTubeMetricsForPost({
            ...post.toObject(),
            youtubeVideoId: videoId,
          });

          if (metricsResult.success) {
            const metrics = metricsResult.data;

            // Calculate engagement rate for YouTube
            const engagementRate = metrics.views > 0
              ? ((metrics.likes + metrics.comments) / metrics.views) * 100
              : 0;

            logger.info(`Updating YouTube metrics for post ${post._id}`, {
              views: metrics.views,
              likes: metrics.likes,
              comments: metrics.comments,
              engagementRate: engagementRate
            });

            // Build updated platformStatus with YouTube metrics
            const updatedPlatformStatus = {
              ...(post.platformStatus || {}),
              youtube_shorts: {
                ...(post.platformStatus?.youtube_shorts || {}),
                performanceMetrics: {
                  views: metrics.views || 0,
                  likes: metrics.likes || 0,
                  comments: metrics.comments || 0,
                  shares: 0, // YouTube API doesn't provide shares
                  saved: 0, // YouTube API doesn't provide saves
                  reach: 0, // YouTube API doesn't provide reach
                  engagementRate: engagementRate,
                },
                lastFetchedAt: new Date(),
              }
            };

            // Calculate aggregate metrics from ALL posted platforms (not just YouTube)
            const aggregateMetrics = calculateAggregateMetrics(updatedPlatformStatus);

            // Update both platform-specific AND aggregate metrics
            const updateResult = await MarketingPost.findByIdAndUpdate(post._id, {
              // Platform-specific YouTube metrics
              'platformStatus.youtube_shorts.performanceMetrics.views': metrics.views || 0,
              'platformStatus.youtube_shorts.performanceMetrics.likes': metrics.likes || 0,
              'platformStatus.youtube_shorts.performanceMetrics.comments': metrics.comments || 0,
              'platformStatus.youtube_shorts.performanceMetrics.engagementRate': engagementRate,
              'platformStatus.youtube_shorts.lastFetchedAt': new Date(),
              // Overall aggregate metrics (sum of ALL posted platforms)
              'performanceMetrics.views': aggregateMetrics.views,
              'performanceMetrics.likes': aggregateMetrics.likes,
              'performanceMetrics.comments': aggregateMetrics.comments,
              'performanceMetrics.shares': aggregateMetrics.shares,
              'performanceMetrics.saved': aggregateMetrics.saved,
              'performanceMetrics.reach': aggregateMetrics.reach,
              'performanceMetrics.engagementRate': aggregateMetrics.engagementRate,
              metricsLastFetchedAt: new Date(),
            }, { new: true }); // Return the updated document

            if (updateResult) {
              logger.debug(`After update - post ${post._id} platformStatus.youtube_shorts:`, {
                performanceMetrics: updateResult.platformStatus?.youtube_shorts?.performanceMetrics,
                views: updateResult.performanceMetrics?.views,
                lastFetchedAt: updateResult.platformStatus?.youtube_shorts?.lastFetchedAt
              });
            }

            result.updated++;
          } else {
            logger.warn(`Failed to fetch YouTube metrics for post ${post._id}: ${metricsResult.error}`);
            result.failed++;
          }

        } catch (error) {
          logger.warn(`Failed to sync metrics for YouTube post ${post._id}: ${error.message}`);
          result.failed++;
        }
      }

    } catch (error) {
      logger.error('Error syncing YouTube metrics:', {
        error: error.message,
        stack: error.stack,
      });
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
