/**
 * Content Metrics Sync Job
 *
 * Syncs performance metrics for marketing posts from external platforms:
 * - TikTok video metrics (views, likes, comments, shares)
 * - Instagram post metrics
 * - YouTube Shorts metrics
 *
 * Uses tiered scheduling based on post age:
 * - Tier 1 (0-24h): every 30 minutes
 * - Tier 2 (24-72h): every 2 hours
 * - Tier 3 (72h-1 week): twice daily
 * - Tier 4 (>1 week): once daily
 */

import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import performanceMetricsService from '../services/performanceMetricsService.js';
import retryService from '../services/retry.js';
import sseService from '../services/sseService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('content-metrics-sync', 'scheduler');

/**
 * Metrics tier configuration based on post age
 * Each tier defines how frequently to refresh metrics for posts of that age
 */
const METRICS_TIERS = {
  TIER_1: {
    name: 'fresh',
    maxAgeHours: 24,
    updateIntervalMinutes: parseInt(process.env.CONTENT_METRICS_SYNC_TIER1_INTERVAL_MINUTES || '30', 10),
  },
  TIER_2: {
    name: 'recent',
    maxAgeHours: 72,
    updateIntervalMinutes: parseInt(process.env.CONTENT_METRICS_SYNC_TIER2_INTERVAL_MINUTES || '120', 10),
  },
  TIER_3: {
    name: 'established',
    maxAgeHours: 168, // 1 week
    updateIntervalMinutes: parseInt(process.env.CONTENT_METRICS_SYNC_TIER3_INTERVAL_MINUTES || '720', 10), // 12 hours
  },
  TIER_4: {
    name: 'archive',
    maxAgeHours: Infinity,
    updateIntervalMinutes: parseInt(process.env.CONTENT_METRICS_SYNC_TIER4_INTERVAL_MINUTES || '1440', 10), // 24 hours
  },
};

/**
 * Get the metrics tier for a post based on its age
 * @param {Date} postedAt - When the post was published
 * @returns {Object} The tier configuration
 */
function getPostTier(postedAt) {
  if (!postedAt) {
    return METRICS_TIERS.TIER_1; // Default to freshest tier if no postedAt
  }

  const ageMs = Date.now() - new Date(postedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < METRICS_TIERS.TIER_1.maxAgeHours) {
    return METRICS_TIERS.TIER_1;
  } else if (ageHours < METRICS_TIERS.TIER_2.maxAgeHours) {
    return METRICS_TIERS.TIER_2;
  } else if (ageHours < METRICS_TIERS.TIER_3.maxAgeHours) {
    return METRICS_TIERS.TIER_3;
  } else {
    return METRICS_TIERS.TIER_4;
  }
}

/**
 * Build a tier-aware MongoDB query for a specific platform
 * Returns posts that need metrics update based on their tier's update interval
 *
 * @param {string} platform - The platform to query ('tiktok', 'instagram', 'youtube_shorts')
 * @returns {Object} MongoDB query object
 */
function buildTierAwareQuery(platform) {
  const now = new Date();
  const cutoffDates = {};

  // Calculate cutoff date for each tier
  for (const [tierKey, tier] of Object.entries(METRICS_TIERS)) {
    const cutoffMs = tier.updateIntervalMinutes * 60 * 1000;
    cutoffDates[tierKey] = new Date(now.getTime() - cutoffMs);
  }

  // Build platform-specific query
  const platformField = platform === 'youtube_shorts' ? 'youtube_shorts' : platform;

  return {
    $or: [
      { platform: platform === 'youtube_shorts' ? 'youtube_shorts' : platform },
      { platforms: platform === 'youtube_shorts' ? 'youtube_shorts' : platform }
    ],
    'platformStatus': {
      $elemMatch: {
        [platformField]: {
          status: 'posted',
          postedAt: { $exists: true },
        }
      }
    },
    $or: [
      // Never fetched - include all these posts
      { [`platformStatus.${platformField}.lastFetchedAt`]: { $exists: false } },
      // Tier 1: fetched more than 30 min ago
      {
        $and: [
          { [`platformStatus.${platformField}.postedAt`]: { $gte: cutoffDates.TIER_1 } },
          { [`platformStatus.${platformField}.lastFetchedAt`]: { $lt: cutoffDates.TIER_1 } }
        ]
      },
      // Tier 2: posted 24-72h ago, fetched more than 2 hours ago
      {
        $and: [
          { [`platformStatus.${platformField}.postedAt`]: { $gte: cutoffDates.TIER_2 } },
          { [`platformStatus.${platformField}.postedAt`]: { $lt: cutoffDates.TIER_1 } },
          { [`platformStatus.${platformField}.lastFetchedAt`]: { $lt: cutoffDates.TIER_2 } }
        ]
      },
      // Tier 3: posted 72h-1w ago, fetched more than 12 hours ago
      {
        $and: [
          { [`platformStatus.${platformField}.postedAt`]: { $gte: cutoffDates.TIER_3 } },
          { [`platformStatus.${platformField}.postedAt`]: { $lt: cutoffDates.TIER_2 } },
          { [`platformStatus.${platformField}.lastFetchedAt`]: { $lt: cutoffDates.TIER_3 } }
        ]
      },
      // Tier 4: posted >1w ago, fetched more than 24 hours ago
      {
        $and: [
          { [`platformStatus.${platformField}.postedAt`]: { $lt: cutoffDates.TIER_3 } },
          { [`platformStatus.${platformField}.lastFetchedAt`]: { $lt: cutoffDates.TIER_4 } }
        ]
      }
    ]
  };
}

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
    // Changed to every 30 minutes - tier-aware queries will control which posts are actually updated
    this.syncSchedule = process.env.CONTENT_METRICS_SYNC_SCHEDULE || '*/30 * * * *';
    this.timezone = process.env.CONTENT_METRICS_SYNC_TIMEZONE || 'UTC';
  }

  /**
   * Check database health before running sync
   * @returns {Promise<boolean>} True if database is healthy
   */
  async checkDatabaseHealth() {
    try {
      await MarketingPost.findOne().select('_id').maxTimeMS(5000).exec();
      logger.info('Database health check passed');
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Sync metrics for a single YouTube post with retry logic
   * @param {Object} post - The post document
   * @returns {Promise<Object>} Result object with success status
   */
  async syncSingleYouTubePost(post) {
    const platformStatus = post.platformStatus?.youtube_shorts;
    const videoId = platformStatus?.mediaId || post.youtubeVideoId;

    if (!videoId) {
      logger.debug(`Skipping YouTube post ${post._id} - no video ID found`);
      return { success: false, skipped: true, reason: 'No video ID' };
    }

    // Fetch metrics using performance metrics service
    const metricsResult = await performanceMetricsService.fetchYouTubeMetricsForPost({
      ...post.toObject(),
      youtubeVideoId: videoId,
    });

    if (!metricsResult.success) {
      throw new Error(metricsResult.error || 'Failed to fetch YouTube metrics');
    }

    const metrics = metricsResult.data;

    // Calculate engagement rate for YouTube
    const engagementRate = metrics.views > 0
      ? ((metrics.likes + metrics.comments) / metrics.views) * 100
      : 0;

    logger.info(`Updating YouTube metrics for post ${post._id}`, {
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      engagementRate: engagementRate.toFixed(2)
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
    await MarketingPost.findByIdAndUpdate(post._id, {
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
    });

    // Broadcast SSE event for metrics update (non-blocking)
    try {
      sseService.broadcastPostMetricsUpdated(post._id.toString(), {
        platformStatus: {
          youtube_shorts: {
            performanceMetrics: {
              views: metrics.views || 0,
              likes: metrics.likes || 0,
              comments: metrics.comments || 0,
              engagementRate: engagementRate,
            }
          }
        },
        performanceMetrics: aggregateMetrics
      });
    } catch (sseError) {
      logger.warn('Failed to broadcast SSE metrics update', { postId: post._id, error: sseError.message });
    }

    return { success: true, updated: true };
  }

  /**
   * Sync metrics for a single TikTok post with retry logic
   * @param {Object} post - The post document
   * @returns {Promise<Object>} Result object with success status
   */
  async syncSingleTikTokPost(post) {
    const tiktokVideoId = post.tiktokVideoId || post.platformStatus?.tiktok?.videoId;

    if (!tiktokVideoId) {
      logger.debug(`Skipping TikTok post ${post._id} - no video ID found`);
      return { success: false, skipped: true, reason: 'No video ID' };
    }

    // Use tiktokPostingService to fetch user videos and find the matching one
    const videosResult = await tiktokPostingService.fetchUserVideos();

    if (!videosResult.success) {
      throw new Error(videosResult.error || 'Failed to fetch TikTok videos');
    }

    const video = videosResult.videos.find(v => v.id === tiktokVideoId);

    if (!video) {
      return { success: false, skipped: true, reason: 'Video not found in TikTok account' };
    }

    // Calculate engagement rate for TikTok
    const engagementRate = video.view_count > 0
      ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
      : 0;

    logger.info(`Updating TikTok metrics for post ${post._id}`, {
      views: video.view_count,
      likes: video.like_count,
      comments: video.comment_count,
      shares: video.share_count,
      engagementRate: engagementRate.toFixed(2)
    });

    // Build updated platformStatus with TikTok metrics
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

    // Update both platform-specific AND aggregate metrics
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

    // Broadcast SSE event for metrics update (non-blocking)
    try {
      sseService.broadcastPostMetricsUpdated(post._id.toString(), {
        platformStatus: {
          tiktok: {
            performanceMetrics: {
              views: video.view_count || 0,
              likes: video.like_count || 0,
              comments: video.comment_count || 0,
              shares: video.share_count || 0,
              engagementRate: engagementRate,
            }
          }
        },
        performanceMetrics: aggregateMetrics
      });
    } catch (sseError) {
      logger.warn('Failed to broadcast SSE metrics update', { postId: post._id, error: sseError.message });
    }

    return { success: true, updated: true };
  }

  /**
   * Sync metrics for a single Instagram post with retry logic
   * @param {Object} post - The post document
   * @returns {Promise<Object>} Result object with success status
   */
  async syncSingleInstagramPost(post) {
    const mediaId = post.platformStatus?.instagram?.mediaId || post.instagramMediaId;

    if (!mediaId) {
      logger.debug(`Skipping Instagram post ${post._id} - no media ID found`);
      return { success: false, skipped: true, reason: 'No media ID' };
    }

    // Use performanceMetricsService to fetch Instagram metrics
    const metricsResult = await performanceMetricsService.fetchPostMetrics(post._id);

    if (!metricsResult.success) {
      throw new Error(metricsResult.error || 'Failed to fetch Instagram metrics');
    }

    const instaMetrics = metricsResult.results?.instagram;

    if (!instaMetrics) {
      return { success: false, skipped: true, reason: 'No Instagram metrics returned' };
    }

    // Calculate engagement rate
    const engagementRate = instaMetrics.views > 0
      ? ((instaMetrics.likes + instaMetrics.comments + instaMetrics.shares) / instaMetrics.views) * 100
      : 0;

    logger.info(`Updating Instagram metrics for post ${post._id}`, {
      views: instaMetrics.views,
      likes: instaMetrics.likes,
      comments: instaMetrics.comments,
      shares: instaMetrics.shares,
      engagementRate: engagementRate.toFixed(2)
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
    await MarketingPost.findByIdAndUpdate(post._id, {
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
    });

    // Broadcast SSE event for metrics update (non-blocking)
    try {
      sseService.broadcastPostMetricsUpdated(post._id.toString(), {
        platformStatus: {
          instagram: {
            performanceMetrics: {
              views: instaMetrics.views || 0,
              likes: instaMetrics.likes || 0,
              comments: instaMetrics.comments || 0,
              shares: instaMetrics.shares || 0,
              saved: instaMetrics.saved || 0,
              reach: instaMetrics.reach || 0,
              engagementRate: engagementRate,
            }
          }
        },
        performanceMetrics: aggregateMetrics
      });
    } catch (sseError) {
      logger.warn('Failed to broadcast SSE metrics update', { postId: post._id, error: sseError.message });
    }

    return { success: true, updated: true };
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

      // Step 0: Check database health
      logger.info('Checking database health before sync');
      const isHealthy = await this.checkDatabaseHealth();
      if (!isHealthy) {
        logger.error('Database health check failed, aborting sync');
        throw new Error('Database health check failed');
      }

      const stats = {
        timestamp: new Date().toISOString(),
        duration: 0,
        tikTok: { updated: 0, failed: 0, skipped: 0, tierBreakdown: {} },
        instagram: { updated: 0, failed: 0, skipped: 0, tierBreakdown: {} },
        youtube: { updated: 0, failed: 0, skipped: 0, tierBreakdown: {} },
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
        total: stats.totalUpdated,
        tierBreakdown: {
          tikTok: stats.tikTok.tierBreakdown,
          instagram: stats.instagram.tierBreakdown,
          youtube: stats.youtube.tierBreakdown
        }
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
   * Uses tier-aware queries to find posts that need updating
   */
  async syncTikTokMetrics() {
    const result = { updated: 0, failed: 0, skipped: 0, tierBreakdown: {} };

    try {
      // Check rate limit status before fetching
      const rateLimitStatus = tiktokPostingService.getRateLimitStatus();
      if (rateLimitStatus.rateLimited) {
        logger.warn('TikTok API is currently rate limited, skipping metrics sync', {
          resetAt: rateLimitStatus.resetAt,
        });
        return result;
      }

      // Find all TikTok posts that are posted and need metrics update based on tier
      // Use tier-aware query to filter by lastFetchedAt and post age
      const now = new Date();
      // Interval cutoffs for lastFetchedAt comparison (based on updateIntervalMinutes)
      const tier1IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_1.updateIntervalMinutes * 60 * 1000);
      const tier2IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_2.updateIntervalMinutes * 60 * 1000);
      const tier3IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_3.updateIntervalMinutes * 60 * 1000);
      const tier4IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_4.updateIntervalMinutes * 60 * 1000);
      // Age cutoffs for postedAt comparison (based on maxAgeHours)
      const tier1AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_1.maxAgeHours * 60 * 60 * 1000);
      const tier2AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_2.maxAgeHours * 60 * 60 * 1000);
      const tier3AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_3.maxAgeHours * 60 * 60 * 1000);

      const tiktokPosts = await MarketingPost.find({
        $and: [
          // Platform filter
          {
            $or: [
              { platform: 'tiktok' },
              { platforms: 'tiktok' }
            ]
          },
          // Status filter
          { 'platformStatus.tiktok.status': 'posted' },
          // Check for postedAt at platform-specific level
          { 'platformStatus.tiktok.postedAt': { $exists: true } },
          // Tier-aware filter for lastFetchedAt
          {
            $or: [
              // Never fetched
              { 'platformStatus.tiktok.lastFetchedAt': { $exists: false } },
              // Tier 1: posted < 24h ago, fetched more than 30 min ago
              {
                $and: [
                  { 'platformStatus.tiktok.postedAt': { $gte: tier1AgeCutoff } },
                  { 'platformStatus.tiktok.lastFetchedAt': { $lt: tier1IntervalCutoff } }
                ]
              },
              // Tier 2: posted 24-72h ago, fetched more than 2 hours ago
              {
                $and: [
                  { 'platformStatus.tiktok.postedAt': { $gte: tier2AgeCutoff } },
                  { 'platformStatus.tiktok.postedAt': { $lt: tier1AgeCutoff } },
                  { 'platformStatus.tiktok.lastFetchedAt': { $lt: tier2IntervalCutoff } }
                ]
              },
              // Tier 3: posted 72h-1w ago, fetched more than 12 hours ago
              {
                $and: [
                  { 'platformStatus.tiktok.postedAt': { $gte: tier3AgeCutoff } },
                  { 'platformStatus.tiktok.postedAt': { $lt: tier2AgeCutoff } },
                  { 'platformStatus.tiktok.lastFetchedAt': { $lt: tier3IntervalCutoff } }
                ]
              },
              // Tier 4: posted >1w ago, fetched more than 24 hours ago
              {
                $and: [
                  { 'platformStatus.tiktok.postedAt': { $lt: tier3AgeCutoff } },
                  { 'platformStatus.tiktok.lastFetchedAt': { $lt: tier4IntervalCutoff } }
                ]
              }
            ]
          }
        ]
      });

      if (tiktokPosts.length === 0) {
        logger.info('No TikTok posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${tiktokPosts.length} TikTok posts to sync metrics for`);

      // Process each post with retry logic
      for (const post of tiktokPosts) {
        // Track tier for stats
        const tier = getPostTier(post.platformStatus?.tiktok?.postedAt || post.postedAt);
        if (!result.tierBreakdown[tier.name]) {
          result.tierBreakdown[tier.name] = 0;
        }

        try {
          // Use retry logic for individual post sync
          const syncResult = await retryService.retry(
            async () => this.syncSingleTikTokPost(post),
            { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
          );

          if (syncResult.success) {
            if (syncResult.updated) {
              result.updated++;
              result.tierBreakdown[tier.name]++;
            } else if (syncResult.skipped) {
              result.skipped++;
            }
          } else {
            result.failed++;
          }
        } catch (error) {
          logger.warn(`Failed to sync metrics for TikTok post ${post._id} after retries: ${error.message}`);
          result.failed++;
        }
      }

      logger.info('TikTok metrics sync completed', {
        updated: result.updated,
        failed: result.failed,
        skipped: result.skipped,
        tierBreakdown: result.tierBreakdown,
      });

    } catch (error) {
      logger.error('Error syncing TikTok metrics:', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Sync metrics for Instagram posts
   * Uses tier-aware queries to find posts that need updating
   */
  async syncInstagramMetrics() {
    const result = { updated: 0, failed: 0, skipped: 0, tierBreakdown: {} };

    try {
      // Find all Instagram posts that are posted and need metrics update based on tier
      // Use tier-aware query to filter by lastFetchedAt and post age
      const now = new Date();
      // Interval cutoffs for lastFetchedAt comparison (based on updateIntervalMinutes)
      const tier1IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_1.updateIntervalMinutes * 60 * 1000);
      const tier2IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_2.updateIntervalMinutes * 60 * 1000);
      const tier3IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_3.updateIntervalMinutes * 60 * 1000);
      const tier4IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_4.updateIntervalMinutes * 60 * 1000);
      // Age cutoffs for postedAt comparison (based on maxAgeHours)
      const tier1AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_1.maxAgeHours * 60 * 60 * 1000);
      const tier2AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_2.maxAgeHours * 60 * 60 * 1000);
      const tier3AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_3.maxAgeHours * 60 * 60 * 1000);

      const instagramPosts = await MarketingPost.find({
        $and: [
          // Platform filter
          {
            $or: [
              { platform: 'instagram' },
              { platforms: 'instagram' }
            ]
          },
          // Status filter
          { 'platformStatus.instagram.status': 'posted' },
          // Check for postedAt at platform-specific level
          { 'platformStatus.instagram.postedAt': { $exists: true } },
          // Tier-aware filter for lastFetchedAt
          {
            $or: [
              // Never fetched
              { 'platformStatus.instagram.lastFetchedAt': { $exists: false } },
              // Tier 1: posted < 24h ago, fetched more than 30 min ago
              {
                $and: [
                  { 'platformStatus.instagram.postedAt': { $gte: tier1AgeCutoff } },
                  { 'platformStatus.instagram.lastFetchedAt': { $lt: tier1IntervalCutoff } }
                ]
              },
              // Tier 2: posted 24-72h ago, fetched more than 2 hours ago
              {
                $and: [
                  { 'platformStatus.instagram.postedAt': { $gte: tier2AgeCutoff } },
                  { 'platformStatus.instagram.postedAt': { $lt: tier1AgeCutoff } },
                  { 'platformStatus.instagram.lastFetchedAt': { $lt: tier2IntervalCutoff } }
                ]
              },
              // Tier 3: posted 72h-1w ago, fetched more than 12 hours ago
              {
                $and: [
                  { 'platformStatus.instagram.postedAt': { $gte: tier3AgeCutoff } },
                  { 'platformStatus.instagram.postedAt': { $lt: tier2AgeCutoff } },
                  { 'platformStatus.instagram.lastFetchedAt': { $lt: tier3IntervalCutoff } }
                ]
              },
              // Tier 4: posted >1w ago, fetched more than 24 hours ago
              {
                $and: [
                  { 'platformStatus.instagram.postedAt': { $lt: tier3AgeCutoff } },
                  { 'platformStatus.instagram.lastFetchedAt': { $lt: tier4IntervalCutoff } }
                ]
              }
            ]
          }
        ]
      });

      if (instagramPosts.length === 0) {
        logger.info('No Instagram posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${instagramPosts.length} Instagram posts to sync metrics for`);

      // Process each post with retry logic
      for (const post of instagramPosts) {
        // Track tier for stats
        const tier = getPostTier(post.platformStatus?.instagram?.postedAt || post.postedAt);
        if (!result.tierBreakdown[tier.name]) {
          result.tierBreakdown[tier.name] = 0;
        }

        try {
          // Use retry logic for individual post sync
          const syncResult = await retryService.retry(
            async () => this.syncSingleInstagramPost(post),
            { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
          );

          if (syncResult.success) {
            if (syncResult.updated) {
              result.updated++;
              result.tierBreakdown[tier.name]++;
            } else if (syncResult.skipped) {
              result.skipped++;
            }
          } else {
            result.failed++;
          }
        } catch (error) {
          logger.warn(`Failed to sync metrics for Instagram post ${post._id} after retries: ${error.message}`);
          result.failed++;
        }
      }

      logger.info('Instagram metrics sync completed', {
        updated: result.updated,
        failed: result.failed,
        skipped: result.skipped,
        tierBreakdown: result.tierBreakdown,
      });

    } catch (error) {
      logger.error('Error syncing Instagram metrics:', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Sync metrics for YouTube Shorts
   * Uses tier-aware queries to find posts that need updating
   */
  async syncYouTubeMetrics() {
    const result = { updated: 0, failed: 0, skipped: 0, tierBreakdown: {} };

    try {
      // Find all YouTube posts that are posted and need metrics update based on tier
      // Use tier-aware query to filter by lastFetchedAt and post age
      const now = new Date();
      // Interval cutoffs for lastFetchedAt comparison (based on updateIntervalMinutes)
      const tier1IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_1.updateIntervalMinutes * 60 * 1000);
      const tier2IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_2.updateIntervalMinutes * 60 * 1000);
      const tier3IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_3.updateIntervalMinutes * 60 * 1000);
      const tier4IntervalCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_4.updateIntervalMinutes * 60 * 1000);
      // Age cutoffs for postedAt comparison (based on maxAgeHours)
      const tier1AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_1.maxAgeHours * 60 * 60 * 1000);
      const tier2AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_2.maxAgeHours * 60 * 60 * 1000);
      const tier3AgeCutoff = new Date(now.getTime() - METRICS_TIERS.TIER_3.maxAgeHours * 60 * 60 * 1000);

      const youtubePosts = await MarketingPost.find({
        $and: [
          // Platform filter
          {
            $or: [
              { platform: 'youtube_shorts' },
              { platforms: 'youtube_shorts' }
            ]
          },
          // Status filter
          { 'platformStatus.youtube_shorts.status': 'posted' },
          // Check for postedAt at platform-specific level
          { 'platformStatus.youtube_shorts.postedAt': { $exists: true } },
          // Tier-aware filter for lastFetchedAt
          {
            $or: [
              // Never fetched
              { 'platformStatus.youtube_shorts.lastFetchedAt': { $exists: false } },
              // Tier 1: posted < 24h ago, fetched more than 30 min ago
              {
                $and: [
                  { 'platformStatus.youtube_shorts.postedAt': { $gte: tier1AgeCutoff } },
                  { 'platformStatus.youtube_shorts.lastFetchedAt': { $lt: tier1IntervalCutoff } }
                ]
              },
              // Tier 2: posted 24-72h ago, fetched more than 2 hours ago
              {
                $and: [
                  { 'platformStatus.youtube_shorts.postedAt': { $gte: tier2AgeCutoff } },
                  { 'platformStatus.youtube_shorts.postedAt': { $lt: tier1AgeCutoff } },
                  { 'platformStatus.youtube_shorts.lastFetchedAt': { $lt: tier2IntervalCutoff } }
                ]
              },
              // Tier 3: posted 72h-1w ago, fetched more than 12 hours ago
              {
                $and: [
                  { 'platformStatus.youtube_shorts.postedAt': { $gte: tier3AgeCutoff } },
                  { 'platformStatus.youtube_shorts.postedAt': { $lt: tier2AgeCutoff } },
                  { 'platformStatus.youtube_shorts.lastFetchedAt': { $lt: tier3IntervalCutoff } }
                ]
              },
              // Tier 4: posted >1w ago, fetched more than 24 hours ago
              {
                $and: [
                  { 'platformStatus.youtube_shorts.postedAt': { $lt: tier3AgeCutoff } },
                  { 'platformStatus.youtube_shorts.lastFetchedAt': { $lt: tier4IntervalCutoff } }
                ]
              }
            ]
          }
        ]
      });

      if (youtubePosts.length === 0) {
        logger.info('No YouTube posts to sync metrics for');
        return result;
      }

      logger.info(`Found ${youtubePosts.length} YouTube posts to sync metrics for`);

      // Process each post with retry logic
      for (const post of youtubePosts) {
        // Track tier for stats
        const tier = getPostTier(post.platformStatus?.youtube_shorts?.postedAt || post.postedAt);
        if (!result.tierBreakdown[tier.name]) {
          result.tierBreakdown[tier.name] = 0;
        }

        try {
          // Use retry logic for individual post sync
          const syncResult = await retryService.retry(
            async () => this.syncSingleYouTubePost(post),
            { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
          );

          if (syncResult.success) {
            if (syncResult.updated) {
              result.updated++;
              result.tierBreakdown[tier.name]++;
            } else if (syncResult.skipped) {
              result.skipped++;
            }
          } else {
            result.failed++;
          }
        } catch (error) {
          logger.warn(`Failed to sync metrics for YouTube post ${post._id} after retries: ${error.message}`);
          result.failed++;
        }
      }

      logger.info('YouTube metrics sync completed', {
        updated: result.updated,
        failed: result.failed,
        skipped: result.skipped,
        tierBreakdown: result.tierBreakdown,
      });

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
