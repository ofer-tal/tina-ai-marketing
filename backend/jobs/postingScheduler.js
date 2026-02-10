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
          platforms: p.platforms || [p.platform],
          scheduledAt: p.scheduledAt
        }))
      });

      if (scheduledContent.length === 0) {
        return;
      }

      // Flatten platforms from all posts into individual posting tasks
      // Each post may have multiple platforms to post to
      const postingTasks = [];

      for (const post of scheduledContent) {
        // Get platforms - handle both new platforms array and legacy platform field
        const platforms = post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0
          ? post.platforms
          : [post.platform];

        for (const platform of platforms) {
          // Check if this platform can be posted to (not already posted, not permanently failed)
          const platformStatus = post.platformStatus?.[platform];

          // Skip if already posted for this platform
          if (platformStatus?.status === 'posted') {
            logger.info(`Skipping already posted platform`, {
              postId: post._id,
              platform,
              platformStatus: platformStatus.status
            });
            continue;
          }

          // Skip if platform failed but retry count exceeded
          const MAX_RETRIES = 3;
          if (platformStatus?.status === 'failed' && platformStatus.retryCount >= MAX_RETRIES) {
            logger.info(`Skipping platform with exceeded retries`, {
              postId: post._id,
              platform,
              retryCount: platformStatus.retryCount
            });
            continue;
          }

          postingTasks.push({
            post,
            platform
          });
        }
      }

      logger.info(`Expanded to ${postingTasks.length} platform posting tasks`, {
        tasks: postingTasks.map(t => ({
          postId: t.post._id.toString(),
          platform: t.platform
        }))
      });

      if (postingTasks.length === 0) {
        logger.info('No platforms ready for posting');
        return;
      }

      // GUARDRAIL: For each platform, if multiple posts are ready in same cycle, only post the LATEST one
      // This prevents posting multiple delayed posts at once which could flag the account as spam
      const tasksByPlatform = {
        tiktok: postingTasks.filter(t => t.platform === 'tiktok'),
        instagram: postingTasks.filter(t => t.platform === 'instagram'),
        youtube_shorts: postingTasks.filter(t => t.platform === 'youtube_shorts')
      };

      const filteredTasks = [];

      for (const [platformName, tasks] of Object.entries(tasksByPlatform)) {
        if (!tasks || tasks.length === 0) continue;

        if (tasks.length > 1) {
          logger.warn(`Multiple ${platformName} posting tasks ready in same cycle - only posting latest`, {
            totalReady: tasks.length,
            platform: platformName
          });

          // Sort by scheduledAt DESC (most recent first)
          tasks.sort((a, b) => new Date(b.post.scheduledAt) - new Date(a.post.scheduledAt));

          const latestTask = tasks[0];
          const delayedTasks = tasks.slice(1);

          logger.info(`Latest ${platformName} task selected for posting: ${latestTask.post._id}`, {
            scheduledAt: latestTask.post.scheduledAt,
            title: latestTask.post.title
          });

          logger.warn(`Marking ${delayedTasks.length} delayed ${platformName} tasks as failed`, {
            delayedPostIds: delayedTasks.map(t => t.post._id.toString()),
            latestScheduledAt: latestTask.post.scheduledAt
          });

          // Mark all delayed tasks as failed for this platform
          for (const task of delayedTasks) {
            await task.post.setPlatformStatus(platformName, 'failed', {
              error: 'Multiple posts ready in same cycle - skipped to prevent spam',
              lastFailedAt: new Date()
            });

            // Update overall post status
            const overallStatus = task.post.getOverallStatus();
            task.post.status = overallStatus;
            await task.post.save();

            logger.warn(`${platformName} platform marked as failed due to scheduler guardrail`, {
              postId: task.post._id,
              scheduledAt: task.post.scheduledAt
            });
          }

          filteredTasks.push(latestTask);
        } else {
          filteredTasks.push(tasks[0]);
        }
      }

      logger.info(`Filtered to ${filteredTasks.length} platform posting tasks`, {
        tasks: filteredTasks.map(t => ({
          postId: t.post._id.toString(),
          platform: t.platform
        }))
      });

      // Process each platform posting task
      // CRITICAL: Group tasks by post to avoid parallel save() calls on the same document
      const tasksByPost = new Map();
      for (const task of filteredTasks) {
        const postId = task.post._id.toString();
        if (!tasksByPost.has(postId)) {
          tasksByPost.set(postId, []);
        }
        tasksByPost.get(postId).push(task);
      }

      logger.info(`Grouped ${filteredTasks.length} tasks into ${tasksByPost.size} posts`, {
        postsWithMultiplePlatforms: Array.from(tasksByPost.entries())
          .filter(([_, tasks]) => tasks.length > 1)
          .map(([postId, tasks]) => ({ postId, platformCount: tasks.length }))
      });

      // Process posts sequentially, platforms within a post sequentially, but posts in parallel
      const results = await Promise.allSettled(
        Array.from(tasksByPost.values()).map(tasks =>
          // Process platforms for the same post sequentially to avoid parallel save() errors
          (async () => {
            const postResults = [];
            for (const task of tasks) {
              try {
                const result = await this.processPlatformPosting(task.post, task.platform);
                postResults.push({ status: 'fulfilled', value: result, platform: task.platform });
              } catch (error) {
                postResults.push({ status: 'rejected', reason: error, platform: task.platform });
              }
            }
            return postResults;
          })()
        )
      );

      // Flatten results and count successes/failures
      const flatResults = results.flatMap(r =>
        r.status === 'fulfilled' ? r.value : [{ status: 'rejected', reason: r.reason }]
      );
      const succeeded = flatResults.filter(r => r.status === 'fulfilled').length;
      const failed = flatResults.filter(r => r.status === 'rejected').length;

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
   * Process a single scheduled post (legacy - for single-platform posts)
   * @param {MarketingPost} post - The post to process
   * @deprecated Use processPlatformPosting instead
   */
  async processScheduledPost(post) {
    const platform = post.platforms?.[0] || post.platform;
    return this.processPlatformPosting(post, platform);
  }

  /**
   * Process posting to a specific platform for a multi-platform post
   * @param {MarketingPost} post - The post to process
   * @param {string} platform - The platform to post to (tiktok, instagram, youtube_shorts)
   */
  async processPlatformPosting(post, platform) {
    logger.info(`Processing platform posting: ${post._id} -> ${platform}`, {
      postId: post._id,
      platform,
      title: post.title
    });

    try {
      // Validate content has required assets
      if (!post.videoPath && !post.imagePath) {
        throw new Error('No video or image path found');
      }

      // Set platform status to 'posting'
      await post.setPlatformStatus(platform, 'posting');
      const oldStatus = post.status;

      // Broadcast SSE event for status change
      sseService.broadcastPostStatusChanged(post, oldStatus);

      // Post to the appropriate platform
      let result;
      switch (platform) {
        case 'tiktok':
          result = await this.postToTikTok(post);
          // TikTok posts via Buffer/Zapier - don't mark as posted yet
          // tiktokVideoMatcher will set status to 'posted' when video is live
          break;

        case 'instagram':
          result = await this.postToInstagram(post);
          // Direct posting - mark as posted immediately for this platform
          await post.setPlatformStatus(platform, 'posted', {
            postedAt: new Date(),
            mediaId: result.mediaId,
            permalink: result.permalink
          });

          // Update overall status
          const overallStatus = post.getOverallStatus();
          post.status = overallStatus;
          await post.save();

          // Broadcast SSE event for status change
          sseService.broadcastPostStatusChanged(post, oldStatus);
          break;

        case 'youtube_shorts':
          result = await this.postToYouTube(post);
          // TODO: Implement YouTube posting
          break;

        default:
          throw new Error(`Unknown platform: ${platform}`);
      }

      logger.info(`Successfully posted scheduled content: ${post._id} -> ${platform}`, {
        platform,
        postId: result.postId
      });

      return result;

    } catch (error) {
      logger.error(`Failed to post scheduled content: ${post._id} -> ${platform}`, {
        error: error.message,
        platform
      });

      // Calculate time since scheduled
      const timeSinceScheduled = Date.now() - new Date(post.scheduledAt).getTime();
      const RETRY_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

      // Get current retry count for this platform
      const platformStatus = post.platformStatus?.[platform];
      const currentRetryCount = platformStatus?.retryCount || 0;

      if (timeSinceScheduled < RETRY_WINDOW) {
        // Set platform status back to pending for retry
        await post.setPlatformStatus(platform, 'pending', {
          error: error.message,
          lastFailedAt: new Date()
        });

        // Keep overall status as 'approved' so it will be retried
        post.status = 'approved';

        logger.info(`Keeping platform as 'pending' for retry (${currentRetryCount} attempts, ${Math.round(timeSinceScheduled / 60000)} min since scheduled)`, {
          postId: post._id,
          platform,
          retryCount: currentRetryCount
        });
      } else {
        // Mark platform as failed after 1 hour of attempts
        await post.setPlatformStatus(platform, 'failed', {
          error: error.message,
          lastFailedAt: new Date()
        });

        // Update overall status
        const overallStatus = post.getOverallStatus();
        post.status = overallStatus;
        await post.save();

        logger.warn(`Platform marked as failed after ${currentRetryCount} attempts over 1 hour`, {
          postId: post._id,
          platform,
          totalAttempts: currentRetryCount,
          timeSinceScheduled: Math.round(timeSinceScheduled / 60000) + ' minutes'
        });
      }

      // Broadcast SSE event for status change
      sseService.broadcastPostStatusChanged(post, post.status);

      throw error;
    }
  }

  /**
   * Post to TikTok via Buffer/Zapier flow
   * 1. Upload video to S3
   * 2. Get public URL
   * 3. Append row to Google Sheets (triggers Zapier → Buffer → TikTok)
   * 4. Update post with tracking info
   * 5. Keep platform status = 'posting' (actual posting happens via Buffer, tiktokVideoMatcher will mark as 'posted')
   *
   * CRITICAL: This is the ONLY posting method. Direct TikTok API posting is NOT supported
   * as we don't have approval for direct posting.
   *
   * @param {MarketingPost} post - The post to publish
   */
  async postToTikTok(post) {
    logger.info(`========================================`);
    logger.info(`TikTok Auto-Posting: Starting for post ${post._id}`);
    logger.info(`Platform: TikTok, Title: ${post.title}`);
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

      // Keep overall status as 'posting' to prevent scheduler from picking it up again
      // The tiktokVideoMatcher job will set it to 'posted' when the video is live
      // CRITICAL: Set postingStartedAt for accurate timeout detection by postMonitoringService
      if (!post.postingStartedAt) {
        post.postingStartedAt = new Date();
      }
      post.status = 'posting';

      await post.save();

      // Broadcast SSE event for status change
      sseService.broadcastPostStatusChanged(post, 'posting');

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

      // Set platform status to failed
      await post.setPlatformStatus('tiktok', 'failed', {
        error: error.message,
        lastFailedAt: new Date()
      });

      // Update overall status
      const overallStatus = post.getOverallStatus();
      post.status = overallStatus;
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

      // Mark platform as skipped
      await post.setPlatformStatus('instagram', 'skipped', {
        error: 'Instagram posting disabled'
      });

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

    // Update platform status with media ID and permalink
    // Note: The actual status update to 'posted' happens in processPlatformPosting
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
