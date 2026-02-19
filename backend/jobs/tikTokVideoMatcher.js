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
 * - TIKTOK_MATCHER_SCHEDULE: Cron schedule (default: '10,25,40,55 * * * *' - :10, :25, :40, :55 of each hour)
 * - TIKTOK_MATCHER_TIMEZONE: Timezone (default: 'UTC')
 */

import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import sseService from '../services/sseService.js';
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
    this.matchSchedule = process.env.TIKTOK_MATCHER_SCHEDULE || '10,25,40,55 * * * *'; // :10, :25, :40, :55 of each hour
    this.timezone = process.env.TIKTOK_MATCHER_TIMEZONE || 'UTC';

    // Matching parameters
    this.captionMatchLength = 300; // Compare first 300 characters of caption for better matching
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
   * Check for posts that have exceeded posting timeout and mark as failed
   * Prevents wasting resources matching posts that will never succeed
   */
  async _checkAndMarkTimeoutPosts() {
    const timeoutHours = parseInt(process.env.POSTING_TIMEOUT_HOURS || '2', 10);
    const timeoutMs = timeoutHours * 60 * 60 * 1000;

    logger.info(`[TIMEOUT CHECK] Starting timeout check for stuck TikTok posts`, {
      timeoutHours,
      timeoutMs: `${timeoutMs}ms (${Math.round(timeoutMs/60000)} minutes)`
    });

    // Find posts with:
    // - status: 'posting'
    // - platform: 'tiktok' OR platforms includes 'tiktok'
    // - sheetTriggeredAt exists
    // - platformStatus.tiktok.status is 'posting' (not already failed)
    const timeoutCandidates = await MarketingPost.find({
      $or: [
        { platform: 'tiktok' },
        { platforms: 'tiktok' }
      ],
      status: 'posting',
      sheetTriggeredAt: { $exists: true, $ne: null },
      'platformStatus.tiktok.status': 'posting'
    }).select('_id title sheetTriggeredAt platformStatus');

    if (timeoutCandidates.length === 0) {
      logger.debug(`[TIMEOUT CHECK] No timeout candidates found`);
      return { checked: 0, markedFailed: 0 };
    }

    let markedFailed = 0;

    for (const post of timeoutCandidates) {
      const timeSinceSheetTrigger = Date.now() - new Date(post.sheetTriggeredAt).getTime();

      if (timeSinceSheetTrigger > timeoutMs) {
        // Mark as failed - no further attempts should be made
        await post.setPlatformStatus('tiktok', 'failed', {
          error: `Post timed out - Google Sheets wrote successfully but video never appeared on TikTok (${Math.round(timeSinceSheetTrigger/60000)} minutes)`,
          lastFailedAt: new Date()
        });

        logger.warn(`[TIMEOUT CHECK] Marked post as failed due to timeout`, {
          postId: post._id,
          title: post.title,
          sheetTriggeredAt: post.sheetTriggeredAt,
          timeSinceSheetTrigger: Math.round(timeSinceSheetTrigger / 60000) + ' minutes'
        });

        // Broadcast SSE event for status change (non-blocking)
        try {
          sseService.broadcastPostStatusChanged(post, 'posting');
        } catch (sseError) {
          logger.warn('Failed to broadcast SSE status change', { error: sseError.message });
        }

        markedFailed++;
      } else {
        logger.debug(`[TIMEOUT CHECK] Post not yet timed out`, {
          postId: post._id,
          timeSinceSheetTrigger: Math.round(timeSinceSheetTrigger / 60000) + ' minutes',
          timeoutRemaining: Math.round((timeoutMs - timeSinceSheetTrigger) / 60000) + ' minutes'
        });
      }
    }

    logger.info(`[TIMEOUT CHECK] Completed`, {
      checked: timeoutCandidates.length,
      markedFailed
    });

    return { checked: timeoutCandidates.length, markedFailed };
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
      // Step 0: Check for timeout posts and mark as failed
      const timeoutStats = await this._checkAndMarkTimeoutPosts();

      logger.info('Starting TikTok video matching');

      const stats = {
        timestamp: new Date().toISOString(),
        duration: 0,
        videosFetched: 0,
        matched: 0,
        unmatched: 0,
        metricsUpdated: 0,
        errors: 0,
        timeoutChecked: timeoutStats.checked,
        timeoutMarkedFailed: timeoutStats.markedFailed
      };

      // Step 1: Check rate limit status before fetching
      logger.info('Step 1: Checking TikTok API rate limit status');
      const rateLimitStatus = tiktokPostingService.getRateLimitStatus();
      if (rateLimitStatus.rateLimited) {
        logger.warn('TikTok API is currently rate limited, skipping this run', {
          resetAt: rateLimitStatus.resetAt,
        });
        return {
          success: false,
          skipped: true,
          reason: 'rate_limited',
          resetAt: rateLimitStatus.resetAt,
        };
      }

      // Step 2: Fetch all videos from TikTok
      logger.info('Step 2: Fetching videos from TikTok API');
      const fetchResult = await tiktokPostingService.fetchUserVideos();

      if (!fetchResult.success) {
        throw new Error(`Failed to fetch TikTok videos: ${fetchResult.error}`);
      }

      const videos = fetchResult.videos || [];
      stats.videosFetched = videos.length;

      logger.info(`Fetched ${videos.length} videos from TikTok`);

      // Filter to only process videos from the last 14 days
      // Older videos have already been processed or are too old to match recent posts
      const fourteenDaysAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));
      const recentVideos = videos.filter(v => {
        const videoDate = new Date(v.create_time * 1000);
        return videoDate >= fourteenDaysAgo;
      });

      logger.info(`Filtered to ${recentVideos.length} videos from the last 14 days (skipped ${videos.length - recentVideos.length} older videos)`);

      // Step 2: Get all existing tiktokVideoIds from database
      // Check both legacy platform field and new platforms array for multi-platform support
      const existingVideoIds = new Set();
      const existingPosts = await MarketingPost.find({
        $or: [
          { platform: 'tiktok', tiktokVideoId: { $exists: true, $ne: null } },
          { platforms: 'tiktok', 'platformStatus.tiktok.mediaId': { $exists: true, $ne: null } }
        ],
      }).select('tiktokVideoId platformStatus');

      for (const post of existingPosts) {
        // Check both legacy field and new platformStatus
        const videoId = post.tiktokVideoId || post.platformStatus?.tiktok?.mediaId;
        if (videoId) {
          existingVideoIds.add(videoId);
        }
      }

      logger.info(`Found ${existingVideoIds.size} existing matched videos in database`);

      // Step 3: Process each recent video
      for (const video of recentVideos) {
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
            // Calculate engagement rate
            const engagementRate = video.view_count > 0
              ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
              : 0;

            // Update post with TikTok data
            // Update both legacy fields and new platformStatus for multi-platform posts
            await MarketingPost.findByIdAndUpdate(matchResult.postId, {
              // Legacy fields (for backward compatibility)
              tiktokVideoId: videoId,
              tiktokShareUrl: video.share_url,
              // New multi-platform fields
              'platformStatus.tiktok.status': 'posted',
              'platformStatus.tiktok.mediaId': videoId,
              'platformStatus.tiktok.shareUrl': video.share_url,
              'platformStatus.tiktok.postedAt': new Date(video.create_time * 1000),
              'platformStatus.tiktok.performanceMetrics.views': video.view_count || 0,
              'platformStatus.tiktok.performanceMetrics.likes': video.like_count || 0,
              'platformStatus.tiktok.performanceMetrics.comments': video.comment_count || 0,
              'platformStatus.tiktok.performanceMetrics.shares': video.share_count || 0,
              'platformStatus.tiktok.performanceMetrics.engagementRate': engagementRate,
              'platformStatus.tiktok.lastFetchedAt': new Date(),
              // Legacy overall performanceMetrics
              'performanceMetrics.views': video.view_count || 0,
              'performanceMetrics.likes': video.like_count || 0,
              'performanceMetrics.comments': video.comment_count || 0,
              'performanceMetrics.shares': video.share_count || 0,
              'performanceMetrics.engagementRate': engagementRate,
              postedAt: new Date(video.create_time * 1000),
              metricsLastFetchedAt: new Date(),
            });

            logger.info(`Matched TikTok video to post`, {
              videoId,
              postId: matchResult.postId,
              matchMethod: matchResult.method,
            });

            // Broadcast SSE event for status change (non-blocking)
            try {
              const updatedPost = await MarketingPost.findById(matchResult.postId);
              sseService.broadcastPostStatusChanged(updatedPost, 'posting');
            } catch (sseError) {
              logger.warn('Failed to broadcast SSE status change', { error: sseError.message });
            }

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
        timeoutChecked: stats.timeoutChecked,
        timeoutMarkedFailed: stats.timeoutMarkedFailed,
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

      // Calculate time window - use a very wide window for Buffer/Zapier flow
      // Videos can be posted up to 24 hours before or after the sheet trigger time
      // due to buffering, delays, or timing issues in the Zapier/Buffer pipeline
      const timeWindowStart = new Date(videoCreatedAt.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
      const timeWindowEnd = new Date(videoCreatedAt.getTime() + (24 * 60 * 60 * 1000)); // 24 hours after

      logger.info(`[TikTok Matcher] Time window`, {
        timeWindowStart: timeWindowStart.toISOString(),
        timeWindowEnd: timeWindowEnd.toISOString()
      });

      // Find posts within time window that need matching
      // Include: 'posting' status (triggered via Buffer/Zapier, waiting for video)
      // AND 'posted' posts that don't have tiktokVideoId yet (might have been missed)
      // AND 'failed' posts (may have timed out but video was actually posted successfully)
      // Match on either scheduledAt OR sheetTriggeredAt (for Buffer/Zapier flow)
      // Check both legacy platform field and new platforms array for multi-platform support
      const candidates = await MarketingPost.find({
        $or: [
          { platform: 'tiktok' },
          { platforms: 'tiktok' }
        ],
        $or: [
          { status: 'posting' },
          { status: 'posted' },  // Also check posted posts that might be missing tiktokVideoId
          { status: 'failed' }   // Also check failed posts (may have timed out but video was posted)
        ],
        $or: [
          { scheduledAt: { $gte: timeWindowStart, $lte: timeWindowEnd } },
          { sheetTriggeredAt: { $gte: timeWindowStart, $lte: timeWindowEnd } },
        ],
        // Only include posts that don't have tiktokVideoId yet (for posted status)
        $or: [
          { tiktokVideoId: { $exists: false } },
          { tiktokVideoId: null },
          { 'platformStatus.tiktok.mediaId': { $exists: false } },
          { 'platformStatus.tiktok.mediaId': null }
        ]
      }).select('_id caption scheduledAt sheetTriggeredAt status platformStatus');

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

      // Normalize caption by removing newlines, extra whitespace, and hashtags
      // TikTok strips newlines and appends hashtags when posting
      const normalizeCaption = (caption) => {
        if (!caption) return '';
        const normalized = caption.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        // Remove hashtags (they're appended when posting but stored separately in database)
        return normalized.replace(/#[\w]+/g, '').trim();
      };

      // First, find exact caption matches (using normalized captions)
      for (const post of candidates) {
        const postCaptionNormalized = normalizeCaption(post.caption.substring(0, this.captionMatchLength));
        const videoCaptionNormalized = normalizeCaption(videoCaption);

        if (postCaptionNormalized === videoCaptionNormalized && postCaptionNormalized.length > 0) {
          // Calculate time diff from sheetTriggeredAt (closest estimate to when posting started)
          // Falls back to scheduledAt if sheetTriggeredAt not set
          const referenceTime = post.sheetTriggeredAt || post.scheduledAt;
          const timeDiff = videoCreatedAt.getTime() - referenceTime.getTime();
          // Use absolute time difference since videos can be posted before OR after reference time
          const absTimeDiff = Math.abs(timeDiff);
          // Only match if within time window and closer than previous best match
          if (absTimeDiff < bestTimeDiff) {
            bestMatch = post;
            bestTimeDiff = absTimeDiff;
            bestMethod = 'caption_exact';
          }
        }
      }

      // If no exact match, try fuzzy caption match
      if (!bestMatch) {
        for (const post of candidates) {
          const postCaptionNormalized = normalizeCaption(post.caption).toLowerCase();
          const videoCaptionNormalized = normalizeCaption(videoCaption).toLowerCase();

          // Try both directions of inclusion
          let captionMatches = videoCaptionNormalized && postCaptionNormalized.includes(videoCaptionNormalized);
          if (!captionMatches && postCaptionNormalized) {
            captionMatches = videoCaptionNormalized.includes(postCaptionNormalized.substring(0, 50));
          }

          if (captionMatches) {
            // Calculate time diff from sheetTriggeredAt (closest estimate to when posting started)
            // Falls back to scheduledAt if sheetTriggeredAt not set
            const referenceTime = post.sheetTriggeredAt || post.scheduledAt;
            const timeDiff = videoCreatedAt.getTime() - referenceTime.getTime();
            // Use absolute time difference since videos can be posted before OR after reference time
            const absTimeDiff = Math.abs(timeDiff);
            if (absTimeDiff < bestTimeDiff) {
              bestMatch = post;
              bestTimeDiff = absTimeDiff;
              bestMethod = 'caption_contains';
            }
          }
        }
      }

      // Only match if video was posted within 24 hours (before or after) the reference time
      // Very generous window to accommodate Zapier/Buffer posting pipeline delays
      const maxTimeDiffMs = 24 * 60 * 60 * 1000;
      if (bestMatch && bestTimeDiff < maxTimeDiffMs) {
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
          maxAllowed: '24 hours'
        });
      } else {
        // Log helpful debug info about why no match occurred
        const normalizeCaption = (caption) => {
          if (!caption) return '';
          const normalized = caption.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
          // Remove hashtags (they're appended when posting but stored separately in database)
          return normalized.replace(/#[\w]+/g, '').trim();
        };
        logger.warn(`[TikTok Matcher] No caption match found`, {
          videoId: video.id,
          candidatesCount: candidates.length,
          videoCaptionRaw: videoCaption.substring(0, 60),
          videoCaptionNormalized: normalizeCaption(videoCaption.substring(0, 60)),
          samplePostCaption: candidates[0]?.caption.substring(0, 60) || 'none',
          samplePostCaptionNormalized: normalizeCaption(candidates[0]?.caption.substring(0, 60) || '')
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
      // Calculate engagement rate
      const engagementRate = video.view_count > 0
        ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
        : 0;

      // Find posts matching by either legacy or new field
      const post = await MarketingPost.findOne({
        $or: [
          { tiktokVideoId: video.id },
          { 'platformStatus.tiktok.mediaId': video.id }
        ]
      });

      if (!post) {
        logger.debug('No post found for video metrics update', { videoId: video.id });
        return;
      }

      // Update metrics in both legacy and new locations
      await MarketingPost.findOneAndUpdate(
        { _id: post._id },
        {
          // Legacy performanceMetrics
          'performanceMetrics.views': video.view_count || 0,
          'performanceMetrics.likes': video.like_count || 0,
          'performanceMetrics.comments': video.comment_count || 0,
          'performanceMetrics.shares': video.share_count || 0,
          'performanceMetrics.engagementRate': engagementRate,
          // New platform-specific metrics
          'platformStatus.tiktok.performanceMetrics.views': video.view_count || 0,
          'platformStatus.tiktok.performanceMetrics.likes': video.like_count || 0,
          'platformStatus.tiktok.performanceMetrics.comments': video.comment_count || 0,
          'platformStatus.tiktok.performanceMetrics.shares': video.share_count || 0,
          'platformStatus.tiktok.performanceMetrics.engagementRate': engagementRate,
          'platformStatus.tiktok.lastFetchedAt': new Date(),
          metricsLastFetchedAt: new Date(),
        }
      );

      // Also add to metrics history
      await MarketingPost.findOneAndUpdate(
        { _id: post._id },
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

      // Broadcast SSE event for metrics update (non-blocking)
      try {
        const views = video.view_count || 0;
        const likes = video.like_count || 0;
        const comments = video.comment_count || 0;
        const shares = video.share_count || 0;
        sseService.broadcastPostMetricsUpdated(post._id.toString(), {
          platformStatus: {
            tiktok: {
              performanceMetrics: {
                views,
                likes,
                comments,
                shares,
                engagementRate,
              }
            }
          },
          performanceMetrics: { views, likes, comments, shares, engagementRate }
        });
      } catch (sseError) {
        logger.warn('Failed to broadcast SSE metrics update', { error: sseError.message });
      }

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
