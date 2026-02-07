import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import instagramPostingService from '../services/instagramPostingService.js';
import s3VideoUploader from '../services/s3VideoUploader.js';
import googleSheetsService from '../services/googleSheetsService.js';
import sseService from '../services/sseService.js';
import { getLogger } from '../utils/logger.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = getLogger('posting-scheduler', 'scheduler');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get hashtags for a specific platform from a post
 * Handles both new platform-specific structure and legacy array format
 * @param {MarketingPost} post - The post
 * @param {string} platform - The platform key (tiktok, instagram, youtube_shorts)
 * @returns {Array<string>} Hashtags for the platform
 */
function getPlatformHashtags(post, platform) {
  if (!post.hashtags) return [];

  // New platform-specific structure
  if (typeof post.hashtags === 'object' && !Array.isArray(post.hashtags)) {
    return post.hashtags[platform] || post.hashtags.tiktok || [];
  }

  // Legacy array format - return as-is
  return post.hashtags || [];
}

/**
 * Convert URL path to file system path
 * Handles paths stored as /storage/... which need to be resolved relative to project root
 * @param {string} urlPath - The URL path (e.g., /storage/videos/tier1/final/video.mp4)
 * @returns {string} The absolute file system path
 */
function urlToFilePath(urlPath) {
  if (!urlPath) return urlPath;

  // If it starts with /storage/, it's a URL path that needs conversion
  if (urlPath.startsWith('/storage/')) {
    // Go up from backend/ directory to project root, then append the storage path
    return path.join(__dirname, '../../storage', urlPath.replace('/storage/', ''));
  }

  // If it's already an absolute path or doesn't match the pattern, return as-is
  return urlPath;
}

/**
 * Posting Scheduler Job
 *
 * Runs every 15 minutes to check for scheduled content that needs to be posted
 * - Finds content with status 'scheduled' and scheduledAt <= now
 * - Posts to the appropriate platform (TikTok, Instagram, YouTube)
 * - For TikTok: Uses S3 upload + Google Sheets trigger (Buffer/Zapier flow)
 * - Updates status to 'scheduled' (Buffer will post) or 'failed'
 */

class PostingSchedulerJob {
  constructor() {
    this.jobName = 'scheduled-content-poster';
    this.isRunning = false;
  }

  /**
   * Execute the posting job
   * Finds all scheduled content that should be posted now
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Posting scheduler already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Checking for scheduled content to post');

      // Find all approved posts that have reached their scheduled time
      // 'approved' means the post is ready to go, scheduledAt determines when
      const scheduledContent = await MarketingPost.find({
        status: 'approved',
        scheduledAt: { $lte: new Date() },
        videoPath: { $exists: true, $ne: null } // Must have video
      });

      logger.info(`Found ${scheduledContent.length} posts ready for posting`, {
        posts: scheduledContent.map(p => ({
          id: p._id.toString(),
          title: p.title,
          platform: p.platform,
          scheduledAt: p.scheduledAt
        }))
      });

      if (scheduledContent.length === 0) {
        return;
      }

      // GUARDRAIL: For TikTok, if multiple posts are ready in same cycle, only post the LATEST one
      // This prevents posting multiple delayed posts at once which could flag the account as spam
      const tiktokPosts = scheduledContent.filter(p => p.platform === 'tiktok');

      if (tiktokPosts.length > 1) {
        logger.warn(`Multiple TikTok posts ready in same cycle - only posting latest, marking others as failed`, {
          totalReady: tiktokPosts.length,
          platform: 'tiktok'
        });

        // Sort TikTok posts by scheduledAt DESC (most recent first)
        tiktokPosts.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

        const latestPost = tiktokPosts[0];
        const delayedPosts = tiktokPosts.slice(1);

        logger.info(`Latest TikTok post selected for posting: ${latestPost._id}`, {
          scheduledAt: latestPost.scheduledAt,
          title: latestPost.title
        });

        logger.warn(`Marking ${delayedPosts.length} delayed TikTok posts as failed`, {
          delayedPostIds: delayedPosts.map(p => p._id.toString()),
          latestScheduledAt: latestPost.scheduledAt,
          oldestScheduledAt: delayedPosts[delayedPosts.length - 1].scheduledAt
        });

        // Mark all delayed TikTok posts as failed
        for (const post of delayedPosts) {
          post.status = 'failed';
          post.error = 'Multiple posts ready in same cycle - skipped to prevent spam. Post was delayed beyond its scheduled time.';
          post.failedAt = new Date();
          post.failedReason = 'scheduler_guardrail_multiple_tiktok_posts';

          await post.save();

          logger.warn(`TikTok post marked as failed due to scheduler guardrail: ${post._id}`, {
            scheduledAt: post.scheduledAt,
            title: post.title
          });
        }

        // Replace scheduledContent with only the latest TikTok post + other platforms
        const otherPlatformPosts = scheduledContent.filter(p => p.platform !== 'tiktok');
        scheduledContent = [latestPost, ...otherPlatformPosts];

        logger.info(`Filtered posts to: ${scheduledContent.length} (1 TikTok + ${otherPlatformPosts.length} other platforms)`);
      }

      // GUARDRAIL: For Instagram, if multiple posts are ready in same cycle, only post the LATEST one
      // This prevents posting multiple delayed posts at once which could flag the account as spam
      const instagramPosts = scheduledContent.filter(p => p.platform === 'instagram');

      if (instagramPosts.length > 1) {
        logger.warn(`Multiple Instagram posts ready in same cycle - only posting latest, marking others as failed`, {
          totalReady: instagramPosts.length,
          platform: 'instagram'
        });

        // Sort Instagram posts by scheduledAt DESC (most recent first)
        instagramPosts.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

        const latestPost = instagramPosts[0];
        const delayedPosts = instagramPosts.slice(1);

        logger.info(`Latest Instagram post selected for posting: ${latestPost._id}`, {
          scheduledAt: latestPost.scheduledAt,
          title: latestPost.title
        });

        logger.warn(`Marking ${delayedPosts.length} delayed Instagram posts as failed`, {
          delayedPostIds: delayedPosts.map(p => p._id.toString()),
          latestScheduledAt: latestPost.scheduledAt,
          oldestScheduledAt: delayedPosts[delayedPosts.length - 1].scheduledAt
        });

        // Mark all delayed Instagram posts as failed
        for (const post of delayedPosts) {
          post.status = 'failed';
          post.error = 'Multiple posts ready in same cycle - skipped to prevent spam. Post was delayed beyond its scheduled time.';
          post.failedAt = new Date();
          post.failedReason = 'scheduler_guardrail_multiple_instagram_posts';

          await post.save();

          logger.warn(`Instagram post marked as failed due to scheduler guardrail: ${post._id}`, {
            scheduledAt: post.scheduledAt,
            title: post.title
          });
        }

        // Replace scheduledContent with only the latest Instagram post + other platforms (excluding Instagram)
        const otherPlatformPosts = scheduledContent.filter(p => p.platform !== 'instagram');
        scheduledContent = [latestPost, ...otherPlatformPosts];

        logger.info(`Filtered posts to: ${scheduledContent.length} (1 Instagram + ${otherPlatformPosts.length} other platforms)`);
      }

      // Process each scheduled post
      const results = await Promise.allSettled(
        scheduledContent.map(post => this.processScheduledPost(post))
      );

      // Count successes and failures
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Scheduled posting complete: ${succeeded} succeeded, ${failed} failed`, {
        duration: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error in posting scheduler job', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single scheduled post
   * @param {MarketingPost} post - The post to process
   */
  async processScheduledPost(post) {
    logger.info(`Processing scheduled post: ${post._id}`, {
      platform: post.platform,
      title: post.title
    });

    try {
      // Validate content has required assets
      if (!post.videoPath && !post.imagePath) {
        throw new Error('No video or image path found');
      }

      // Update status to indicate posting is in progress
      const oldStatus = post.status;
      post.status = 'ready';
      await post.save();

      // Broadcast SSE event for status change
      sseService.broadcastPostStatusChanged(post, oldStatus);

      // Post to the appropriate platform
      let result;
      switch (post.platform) {
        case 'tiktok':
          result = await this.postToTikTok(post);
          // TikTok posts via Buffer/Zapier - don't mark as posted yet
          // tiktokVideoMatcher will set status to 'posted' when video is live
          break;

        case 'instagram':
          result = await this.postToInstagram(post);
          // Direct posting - mark as posted immediately
          await post.markAsPosted();
          // Broadcast SSE event for status change to 'posted'
          sseService.broadcastPostStatusChanged(post, 'approved');
          break;

        case 'youtube_shorts':
          result = await this.postToYouTube(post);
          // TODO: Implement YouTube posting
          break;

        default:
          throw new Error(`Unknown platform: ${post.platform}`);
      }

      logger.info(`Successfully posted scheduled content: ${post._id}`, {
        platform: post.platform,
        postId: result.postId
      });

      return result;

    } catch (error) {
      logger.error(`Failed to post scheduled content: ${post._id}`, {
        error: error.message,
        platform: post.platform
      });

      // Calculate time since scheduled
      const timeSinceScheduled = Date.now() - new Date(post.scheduledAt).getTime();
      const RETRY_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
      const oldStatus = post.status;

      if (timeSinceScheduled < RETRY_WINDOW) {
        // Keep as 'approved' so it will be retried in the next scheduler run
        post.status = 'approved';
        post.error = error.message;
        post.retryCount = (post.retryCount || 0) + 1;
        post.lastRetriedAt = new Date();

        logger.info(`Keeping post as 'approved' for retry (${post.retryCount} attempts, ${Math.round(timeSinceScheduled / 60000)} min since scheduled)`, {
          postId: post._id,
          retryCount: post.retryCount
        });
      } else {
        // Mark as failed after 1 hour of attempts
        post.status = 'failed';
        post.error = error.message;
        post.failedAt = new Date();
        post.retryCount = (post.retryCount || 0) + 1;

        logger.warn(`Post marked as failed after ${post.retryCount} attempts over 1 hour`, {
          postId: post._id,
          totalAttempts: post.retryCount,
          timeSinceScheduled: Math.round(timeSinceScheduled / 60000) + ' minutes'
        });
      }

      await post.save();

      // Broadcast SSE event for status change
      sseService.broadcastPostStatusChanged(post, oldStatus);

      throw error;
    }
  }

  /**
   * Post to TikTok via Buffer/Zapier flow
   * 1. Upload video to S3
   * 2. Get public URL
   * 3. Append row to Google Sheets (triggers Zapier → Buffer → TikTok)
   * 4. Update post with tracking info
   * 5. Keep status = 'approved' (actual posting happens via Buffer, tiktokVideoMatcher will mark as 'posted')
   *
   * CRITICAL: This is the ONLY posting method. Direct TikTok API posting is NOT supported
   * as we don't have approval for direct posting.
   *
   * @param {MarketingPost} post - The post to publish
   */
  async postToTikTok(post) {
    logger.info(`========================================`);
    logger.info(`TikTok Auto-Posting: Starting for post ${post._id}`);
    logger.info(`Platform: ${post.platform}, Title: ${post.title}`);
    logger.info(`========================================`);

    // Check if TikTok posting is enabled
    const isEnabled = process.env.ENABLE_TIKTOK_POSTING === 'true';

    if (!isEnabled) {
      logger.error('TikTok posting is DISABLED - skipping post', {
        postId: post._id,
        reason: 'ENABLE_TIKTOK_POSTING environment variable is not set to "true"'
      });
      throw new Error('TikTok posting is disabled via ENABLE_TIKTOK_POSTING flag');
    }

    // Check if we have required services configured
    const s3Status = s3VideoUploader.getStatus();
    const s3Enabled = s3Status.enabled;

    // Check Google connection via oauthManager (before calling ensureConnected)
    const oauthManager = (await import('../services/oauthManager.js')).default;
    const googleConnected = await oauthManager.isAuthenticated('google');

    // Log service configuration status BEFORE throwing errors
    logger.info('Service configuration check', {
      s3Enabled,
      s3Bucket: s3Status.bucketName,
      googleConnected,
      spreadsheetId: googleSheetsService.spreadsheetId,
      devMode: googleSheetsService.devMode ? 'YES (using test sheet)' : 'NO (using production sheets)',
    });

    // Now call ensureConnected which will throw if not authenticated (giving a clearer error)
    await googleSheetsService.ensureConnected();

    if (!s3Enabled) {
      const error = 'S3 uploading is NOT configured. Cannot post to TikTok without S3. ' +
        'Please configure AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.';
      logger.error(`========================================`);
      logger.error(`TikTok Auto-Posting FAILED: ${error}`);
      logger.error(`========================================`);
      throw new Error(error);
    }

    if (!googleConnected) {
      const error = 'Google Sheets is NOT connected. Cannot post to TikTok without Google Sheets. ' +
        'Please complete Google OAuth via the Settings page.';
      logger.error(`========================================`);
      logger.error(`TikTok Auto-Posting FAILED: ${error}`);
      logger.error(`========================================`);
      throw new Error(error);
    }

    try {
      // Update publishing status
      post.publishingStatus = 'pending_upload';
      await post.save();

      // Step 1: Upload video to S3
      logger.info(`[Step 1/3] Uploading video to S3...`);
      logger.info(`  Source (URL path): ${post.videoPath}`);

      // Convert URL path to file system path
      const videoFilePath = urlToFilePath(post.videoPath);
      logger.info(`  Source (file path): ${videoFilePath}`);
      logger.info(`  Key: ${post._id.toString()}`);

      const uploadResult = await s3VideoUploader.uploadVideo(
        videoFilePath,
        `${post._id.toString()}.mp4`
      );

      if (!uploadResult.success) {
        throw new Error(`S3 upload failed: ${uploadResult.error}`);
      }

      // Update post with S3 info
      post.s3Key = uploadResult.s3Key;
      post.s3Url = uploadResult.publicUrl;
      post.publishingStatus = 'uploaded_to_s3';
      await post.save();

      logger.info(`  ✓ Uploaded to S3 successfully`);
      logger.info(`  S3 URL: ${uploadResult.publicUrl}`);

      // Step 2: Trigger Zapier flow via Google Sheets
      logger.info(`[Step 2/3] Triggering Zapier flow via Google Sheets...`);

      // Determine which sheet to use (test sheet in dev mode, random from production list otherwise)
      const targetSheet = googleSheetsService.devMode
        ? googleSheetsService.testTabName
        : googleSheetsService.sheetTabNames[Math.floor(Math.random() * googleSheetsService.sheetTabNames.length)];

      logger.info(`  Target sheet: ${targetSheet} ${googleSheetsService.devMode ? '(TEST MODE)' : '(PRODUCTION)'}`, {
        availableSheets: googleSheetsService.sheetTabNames,
        sheetCount: googleSheetsService.sheetTabNames.length,
        selectedIndex: googleSheetsService.sheetTabNames.indexOf(targetSheet),
      });

      const fullCaption = getPlatformHashtags(post, 'tiktok').length > 0
        ? `${post.caption}\n\n${getPlatformHashtags(post, 'tiktok').map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`
        : post.caption;

      logger.info(`  Caption length: ${fullCaption.length} chars`);
      logger.info(`  Video URL: ${uploadResult.publicUrl}`);

      const sheetsResult = await googleSheetsService.appendRow(
        targetSheet,
        [uploadResult.publicUrl, fullCaption]
      );

      if (!sheetsResult.success) {
        throw new Error(`Google Sheets append failed: ${sheetsResult.error}`);
      }

      // Update post with sheet tracking info
      post.sheetTabUsed = targetSheet;
      post.sheetTriggeredAt = new Date();
      post.publishingStatus = 'triggered_zapier';
      const oldStatus = post.status;
      post.status = 'posting'; // Prevent scheduler from picking it up again
      await post.save();

      // Broadcast SSE event for status change
      sseService.broadcastPostStatusChanged(post, oldStatus);

      logger.info(`  ✓ Row appended to Google Sheets`);
      logger.info(`  Sheet: ${targetSheet}`);
      logger.info(`[Step 3/3] Waiting for Zapier → Buffer → TikTok flow...`);
      logger.info(`========================================`);
      logger.info(`TikTok Auto-Posting SUCCESS: Post ${post._id} triggered`);
      logger.info(`The post will be published by Buffer/Zapier in ~5-30 minutes.`);
      logger.info(`The tikTokVideoMatcher job will mark it as 'posted' once live.`);
      logger.info(`========================================`);

      return {
        success: true,
        method: 'buffer_zapier',
        s3Url: uploadResult.publicUrl,
        sheetName: targetSheet,
        postId: post._id,
      };

    } catch (error) {
      logger.error(`========================================`);
      logger.error(`TikTok Auto-Posting FAILED for post ${post._id}`);
      logger.error(`Error: ${error.message}`);
      logger.error(`========================================`);

      // Calculate time since scheduled
      const timeSinceScheduled = Date.now() - new Date(post.scheduledAt).getTime();
      const RETRY_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

      if (timeSinceScheduled < RETRY_WINDOW) {
        // Keep as 'approved' so it will be retried in the next scheduler run
        post.status = 'approved';
        post.error = error.message;
        post.retryCount = (post.retryCount || 0) + 1;
        post.lastRetriedAt = new Date();

        logger.info(`Keeping post as 'approved' for retry (${post.retryCount} attempts, ${Math.round(timeSinceScheduled / 60000)} min since scheduled)`);
      } else {
        // Mark as failed after 1 hour of attempts
        post.status = 'failed';
        post.error = error.message;
        post.failedAt = new Date();
        post.retryCount = (post.retryCount || 0) + 1;

        logger.warn(`Post marked as failed after ${post.retryCount} attempts over 1 hour`);
      }

      await post.save();

      throw error;
    }
  }

  /**
   * Post to Instagram
   * @param {MarketingPost} post - The post to publish
   */
  async postToInstagram(post) {
    logger.info(`Posting scheduled content to Instagram: ${post._id}`);

    // Check if Instagram posting is enabled
    const isEnabled = process.env.ENABLE_INSTAGRAM_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('Instagram posting is disabled, skipping');
      return { success: false, skipped: true, reason: 'Instagram posting disabled' };
    }

    // Check if S3 URL already exists (for retry scenarios)
    let s3Url;
    if (post.s3Url) {
      // Use existing S3 URL (from previous upload or manual recovery)
      s3Url = post.s3Url;
      logger.info(`Using existing S3 URL for Instagram: ${s3Url}`);
    } else {
      // Upload to S3 first (Instagram requires public URL)
      const videoFilePath = urlToFilePath(post.videoPath);
      const s3Result = await s3VideoUploader.uploadVideo(
        videoFilePath,
        `instagram-${post._id.toString()}.mp4`
      );

      if (!s3Result.success) {
        throw new Error(`S3 upload failed: ${s3Result.error}`);
      }

      s3Url = s3Result.publicUrl;
      logger.info(`Uploaded video to S3 for Instagram: ${s3Url}`);
    }

    // Post the Reel with S3 URL and Instagram-specific hashtags
    // Pass post object to enable container ID persistence for retries
    const result = await instagramPostingService.postVideo(
      post.videoPath,
      post.caption,
      getPlatformHashtags(post, 'instagram'),
      (progress) => {
        logger.debug(`Instagram upload progress for ${post._id}: ${progress}%`);
      },
      s3Url, // Pass S3 URL (either newly uploaded or existing)
      post // Pass post object for container state persistence
    );

    if (!result.success) {
      throw new Error(result.error || 'Instagram posting failed');
    }

    // Update post with Instagram media ID
    if (result.mediaId) {
      post.instagramMediaId = result.mediaId;
    }
    if (result.permalink) {
      post.instagramPermalink = result.permalink;
    }
    await post.save();

    return result;
  }

  /**
   * Post to YouTube Shorts
   * @param {MarketingPost} post - The post to publish
   */
  async postToYouTube(post) {
    logger.info(`Posting scheduled content to YouTube: ${post._id}`);

    // Check if YouTube posting is enabled
    const isEnabled = process.env.ENABLE_YOUTUBE_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('YouTube posting is disabled, skipping');
      return { success: false, skipped: true, reason: 'YouTube posting disabled' };
    }

    // TODO: Implement YouTube posting service
    logger.warn('YouTube posting not yet implemented');

    return {
      success: false,
      skipped: true,
      reason: 'YouTube posting not implemented'
    };
  }

  /**
   * Start the scheduled posting job
   * Runs every 15 minutes
   */
  async start() {
    // getJob is async - must await it!
    const existingJob = await schedulerService.getJob(this.jobName);
    if (existingJob) {
      logger.warn('Scheduled posting job already exists');
      return;
    }

    logger.info('Starting scheduled posting job');

    // Schedule job to run every 15 minutes
    await schedulerService.schedule(
      this.jobName,
      '*/15 * * * *', // Every 15 minutes
      () => this.execute(),
      {
        timezone: 'UTC'
      }
    );

    logger.info('Scheduled posting job started');
  }

  /**
   * Stop the scheduled posting job
   */
  async stop() {
    // getJob is async - must await it!
    const existingJob = await schedulerService.getJob(this.jobName);
    if (!existingJob) {
      logger.warn('Scheduled posting job not found');
      return;
    }

    logger.info('Stopping scheduled posting job');

    schedulerService.unschedule(this.jobName);

    logger.info('Scheduled posting job stopped');
  }

  /**
   * Get job status
   */
  async getStatus() {
    // getJob is async - must await it!
    const job = await schedulerService.getJob(this.jobName);

    return {
      jobName: this.jobName,
      isRunning: this.isRunning,
      scheduled: !!job,
      stats: job ? job.stats : null
    };
  }

  /**
   * Manually trigger the job (for testing)
   */
  async trigger() {
    logger.info('Manually triggering scheduled posting job');
    await this.execute();
  }
}

// Create singleton instance
const postingSchedulerJob = new PostingSchedulerJob();

export default postingSchedulerJob;
