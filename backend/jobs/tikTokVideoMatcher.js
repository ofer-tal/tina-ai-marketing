/**
 * TikTok Video Matcher Job
 *
 * Matches newly posted TikTok videos to database posts.
 * This is needed because the Buffer/Zapier flow means we don't get
 * immediate feedback when a video is actually posted to TikTok.
 *
 * Runs every 30 minutes to:
 * 1. Fetch ALL videos from TikTok via API
 * 2. Match videos to database posts by timestamp and caption
 * 3. Update posts with tiktokVideoId, tiktokShareUrl, status = 'posted'
 * 4. Update metrics for already-matched posts
 *
 * Environment variables:
 * - TIKTOK_MATCHER_SCHEDULE: Cron schedule (default: every 30 minutes)
 * - TIKTOK_MATCHER_TIMEZONE: Timezone (default: 'UTC')
 */

import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('tiktok-video-matcher', 'scheduler');

/**
 * TikTok Video Matcher Job Class
 */
class TikTokVideoMatcherJob {
  constructor() {
    this.jobName = 'tiktok-video-matcher';
    this.isRunning = false;
    this.lastMatchStats = null;

    // Configuration from environment
    this.matchSchedule = process.env.TIKTOK_MATCHER_SCHEDULE || '*/30 * * * *'; // Every 30 minutes
    this.timezone = process.env.TIKTOK_MATCHER_TIMEZONE || 'UTC';

    // Matching parameters
    this.captionMatchLength = 100; // Compare first 100 characters of caption
    this.timeWindowMinutes = 60; // Match videos within 1 hour of scheduled time
  }

  /**
   * Initialize and schedule the job
   * Note: schedulerService.registerJob() auto-starts the job if scheduler is running
   */
  async initialize() {
    logger.info(`Initializing TikTok video matcher job with schedule: ${this.matchSchedule}`);

    try {
      // Register job with scheduler (must be awaited - it's async!)
      // Note: The scheduler will automatically start the job if it's running
      await schedulerService.registerJob(
        this.jobName,
        this.matchSchedule,
        () => this.execute(),
        {
          timezone: this.timezone,
          metadata: { description: 'Match TikTok videos to database posts' },
          persist: true  // Explicitly request persistence
        }
      );

      logger.info('TikTok video matcher job initialized and scheduled');
    } catch (error) {
      logger.error('Failed to initialize TikTok video matcher job', {
        error: error.message,
        stack: error.stack
      });
      // Don't throw - let the server continue even if this job fails
    }
  }

  /**
   * Stop the job
   */
  stop() {
    schedulerService.stopJob(this.jobName);
    logger.info('TikTok video matcher job stopped');
  }

  /**
   * Execute the matching job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('TikTok video matcher job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting TikTok video matching');

      const stats = {
        timestamp: new Date().toISOString(),
        duration: 0,
        videosFetched: 0,
        matched: 0,
        unmatched: 0,
        metricsUpdated: 0,
        errors: 0,
      };

      // Step 1: Fetch all videos from TikTok
      logger.info('Step 1: Fetching videos from TikTok API');
      const fetchResult = await tiktokPostingService.fetchUserVideos();

      if (!fetchResult.success) {
        throw new Error(`Failed to fetch TikTok videos: ${fetchResult.error}`);
      }

      const videos = fetchResult.videos || [];
      stats.videosFetched = videos.length;

      logger.info(`Fetched ${videos.length} videos from TikTok`);

      // Step 2: Get all existing tiktokVideoIds from database
      const existingVideoIds = new Set();
      const existingPosts = await MarketingPost.find({
        platform: 'tiktok',
        tiktokVideoId: { $exists: true, $ne: null },
      }).select('tiktokVideoId');

      for (const post of existingPosts) {
        if (post.tiktokVideoId) {
          existingVideoIds.add(post.tiktokVideoId);
        }
      }

      logger.info(`Found ${existingVideoIds.size} existing matched videos in database`);

      // Step 3: Process each video
      for (const video of videos) {
        try {
          const videoId = video.id;

          // Skip if already matched
          if (existingVideoIds.has(videoId)) {
            // Update metrics for existing match
            await this._updateVideoMetrics(video);
            stats.metricsUpdated++;
            continue;
          }

          // Try to find a matching post
          const matchResult = await this._findMatchingPost(video);

          if (matchResult.matched) {
            // Update post with TikTok data
            await MarketingPost.findByIdAndUpdate(matchResult.postId, {
              tiktokVideoId: videoId,
              tiktokShareUrl: video.share_url,
              status: 'posted',
              postedAt: new Date(video.create_time * 1000), // Convert to milliseconds
              'performanceMetrics.views': video.view_count || 0,
              'performanceMetrics.likes': video.like_count || 0,
              'performanceMetrics.comments': video.comment_count || 0,
              'performanceMetrics.shares': video.share_count || 0,
            });

            logger.info(`Matched TikTok video to post`, {
              videoId,
              postId: matchResult.postId,
              matchMethod: matchResult.method,
            });

            stats.matched++;
            existingVideoIds.add(videoId);
          } else {
            logger.debug('Unmatched TikTok video', {
              videoId,
              createTime: new Date(video.create_time * 1000),
            });
            stats.unmatched++;
          }

        } catch (error) {
          logger.warn(`Error processing video ${video.id}: ${error.message}`);
          stats.errors++;
        }
      }

      stats.duration = Date.now() - startTime;
      this.lastMatchStats = stats;

      logger.info('TikTok video matching completed', {
        videosFetched: stats.videosFetched,
        matched: stats.matched,
        unmatched: stats.unmatched,
        metricsUpdated: stats.metricsUpdated,
        errors: stats.errors,
        duration: `${stats.duration}ms`,
      });

      return stats;

    } catch (error) {
      logger.error('Error in TikTok video matcher job', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Find a matching database post for a TikTok video
   */
  async _findMatchingPost(video) {
    try {
      const videoCreatedAt = new Date(video.create_time * 1000);
      const videoCaption = (video.video_description || '').substring(0, this.captionMatchLength);

      logger.info(`[TikTok Matcher] Trying to match video ${video.id}`, {
        videoCreatedAt: videoCreatedAt.toISOString(),
        videoCaption: videoCaption.substring(0, 50),
        captionFullLength: (video.video_description || '').length
      });

      // Calculate time window - use a larger window for Buffer/Zapier flow
      const timeWindowStart = new Date(videoCreatedAt.getTime() - (4 * 60 * 60 * 1000)); // 4 hours before
      const timeWindowEnd = new Date(videoCreatedAt.getTime() + (30 * 60 * 1000)); // 30 min after

      logger.info(`[TikTok Matcher] Time window`, {
        timeWindowStart: timeWindowStart.toISOString(),
        timeWindowEnd: timeWindowEnd.toISOString()
      });

      // Find posts within time window that need matching
      // Include: 'posting' status (triggered via Buffer/Zapier, waiting for video)
      // Match on either scheduledAt OR sheetTriggeredAt (for Buffer/Zapier flow)
      const candidates = await MarketingPost.find({
        platform: 'tiktok',
        status: 'posting',
        $or: [
          { scheduledAt: { $gte: timeWindowStart, $lte: timeWindowEnd } },
          { sheetTriggeredAt: { $gte: timeWindowStart, $lte: timeWindowEnd } },
        ],
      }).select('_id caption scheduledAt sheetTriggeredAt status');

      if (candidates.length === 0) {
        logger.warn(`[TikTok Matcher] No candidate posts found in time window for video ${video.id}`);
        return { matched: false, reason: 'no_candidates', timeWindowStart, timeWindowEnd };
      }

      logger.info(`[TikTok Matcher] Found ${candidates.length} candidate posts for video ${video.id}`, {
        candidates: candidates.map(c => ({
          id: c._id,
          caption: c.caption.substring(0, 50),
          scheduledAt: c.scheduledAt?.toISOString(),
          sheetTriggeredAt: c.sheetTriggeredAt?.toISOString()
        }))
      });

      // Find best match by caption + time proximity
      // Prefer video posted SOONEST after sheetTriggeredAt (not before)
      let bestMatch = null;
      let bestTimeDiff = Infinity;
      let bestMethod = null;

      // First, find exact caption matches
      for (const post of candidates) {
        const postCaption = post.caption.substring(0, this.captionMatchLength);
        if (postCaption === videoCaption) {
          // Calculate time diff from sheetTriggeredAt (or scheduledAt if no sheetTriggeredAt)
          const referenceTime = post.sheetTriggeredAt || post.scheduledAt;
          const timeDiff = videoCreatedAt.getTime() - referenceTime.getTime();
          // Only match if video was posted AFTER the reference time
          if (timeDiff > 0 && timeDiff < bestTimeDiff) {
            bestMatch = post;
            bestTimeDiff = timeDiff;
            bestMethod = 'caption_exact';
          }
        }
      }

      // If no exact match, try fuzzy caption match
      if (!bestMatch) {
        for (const post of candidates) {
          const postCaption = post.caption.toLowerCase();
          const videoCaptionLower = videoCaption.toLowerCase();

          const captionMatches = videoCaptionLower && postCaption.includes(videoCaptionLower);
          if (!captionMatches && postCaption) {
            captionMatches = videoCaptionLower.includes(postCaption.substring(0, 50));
          }

          if (captionMatches) {
            const referenceTime = post.sheetTriggeredAt || post.scheduledAt;
            const timeDiff = videoCreatedAt.getTime() - referenceTime.getTime();
            if (timeDiff > 0 && timeDiff < bestTimeDiff) {
              bestMatch = post;
              bestTimeDiff = timeDiff;
              bestMethod = 'caption_contains';
            }
          }
        }
      }

      // Only match if video was posted within 60 minutes after trigger
      if (bestMatch && bestTimeDiff < (60 * 60 * 1000)) {
        logger.info(`[TikTok Matcher] Match found!`, {
          videoId: video.id,
          postId: bestMatch._id,
          method: bestMethod,
          timeDiff: `${Math.round(bestTimeDiff / 1000)}s`,
          timeDiffMinutes: Math.round(bestTimeDiff / (60 * 1000))
        });
        return { matched: true, postId: bestMatch._id, method: bestMethod, timeDiff: bestTimeDiff };
      }

      // Log why no match occurred
      if (bestMatch) {
        logger.warn(`[TikTok Matcher] Found best match but timeDiff too large`, {
          videoId: video.id,
          postId: bestMatch._id,
          timeDiff: `${Math.round(bestTimeDiff / 1000)}s`,
          timeDiffMinutes: Math.round(bestTimeDiff / (60 * 1000)),
          maxAllowed: '60 minutes'
        });
      } else {
        logger.warn(`[TikTok Matcher] No caption match found`, {
          videoId: video.id,
          candidatesCount: candidates.length,
          videoCaption: videoCaption.substring(0, 50)
        });
      }

      return { matched: false, reason: 'no_match', candidates: candidates.length };

    } catch (error) {
      logger.error('Error finding matching post', {
        error: error.message,
        videoId: video.id,
      });
      return { matched: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Update metrics for an already-matched video
   */
  async _updateVideoMetrics(video) {
    try {
      await MarketingPost.findOneAndUpdate(
        { tiktokVideoId: video.id },
        {
          'performanceMetrics.views': video.view_count || 0,
          'performanceMetrics.likes': video.like_count || 0,
          'performanceMetrics.comments': video.comment_count || 0,
          'performanceMetrics.shares': video.share_count || 0,
          metricsLastFetchedAt: new Date(),
        }
      );

      // Also add to metrics history
      await MarketingPost.findOneAndUpdate(
        { tiktokVideoId: video.id },
        {
          $push: {
            metricsHistory: {
              fetchedAt: new Date(),
              views: video.view_count || 0,
              likes: video.like_count || 0,
              comments: video.comment_count || 0,
              shares: video.share_count || 0,
            },
          },
        }
      );

    } catch (error) {
      logger.warn('Failed to update video metrics', {
        error: error.message,
        videoId: video.id,
      });
    }
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
    logger.info('Manually triggering TikTok video matcher job');
    await this.execute();
  }
}

// Create singleton instance
const tikTokVideoMatcherJob = new TikTokVideoMatcherJob();

export default tikTokVideoMatcherJob;
