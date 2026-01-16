import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import instagramPostingService from '../services/instagramPostingService.js';
import manualPostingFallbackService from '../services/manualPostingFallbackService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('post-retry-job', 'scheduler');

/**
 * Post Retry Job with Exponential Backoff
 *
 * Runs every hour to retry failed posts with exponential backoff:
 * - Retry 1: 1 hour after failure
 * - Retry 2: 2 hours after failure
 * - Retry 3: 4 hours after failure
 * - Retry 4: 8 hours after failure
 * - Retry 5: 16 hours after failure
 * - Max retries: 5
 * - After max retries, mark as permanently failed
 */

class PostRetryJob {
  constructor() {
    this.jobName = 'post-retry-with-backoff';
    this.isRunning = false;
    this.maxRetries = parseInt(process.env.MAX_POST_RETRIES || '5', 10);
    this.baseRetryInterval = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Execute the retry job
   * Finds all failed posts and retries them if within retry window
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Post retry job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Checking for failed posts to retry');

      // Find all failed posts that haven't exceeded max retries
      const failedPosts = await MarketingPost.find({
        status: 'failed',
        $or: [
          { retryCount: { $exists: false } },
          { retryCount: { $lt: this.maxRetries } }
        ]
      }).populate('storyId');

      logger.info(`Found ${failedPosts.length} failed posts eligible for retry`);

      if (failedPosts.length === 0) {
        return;
      }

      // Filter posts that are ready for retry based on backoff calculation
      const postsToRetry = failedPosts.filter(post => this.shouldRetryNow(post));

      logger.info(`Retrying ${postsToRetry.length} posts (filtered by backoff time)`);

      if (postsToRetry.length === 0) {
        return;
      }

      // Process each retry
      const results = await Promise.allSettled(
        postsToRetry.map(post => this.retryPost(post))
      );

      // Count successes and failures
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const permanentlyFailed = results.filter(r => r.status === 'fulfilled' && !r.value).length;

      logger.info(`Post retry complete: ${succeeded} succeeded, ${failed} failed, ${permanentlyFailed} permanently failed`, {
        duration: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error in post retry job', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Calculate if a post should be retried now based on exponential backoff
   * @param {MarketingPost} post - The failed post
   * @returns {boolean} - True if post should be retried now
   */
  shouldRetryNow(post) {
    const retryCount = post.retryCount || 0;
    const failedAt = post.failedAt || post.updatedAt;

    if (!failedAt) {
      logger.warn(`Post ${post._id} has no failedAt timestamp, skipping retry`);
      return false;
    }

    // Calculate backoff time: 2^retryCount hours
    const backoffHours = Math.pow(2, retryCount);
    const backoffMs = backoffHours * this.baseRetryInterval;

    // Calculate when this post should be retried
    const retryAt = new Date(failedAt.getTime() + backoffMs);
    const now = new Date();

    // Check if retry time has arrived
    const shouldRetry = now >= retryAt;

    if (shouldRetry) {
      logger.info(`Post ${post._id} ready for retry`, {
        retryCount,
        backoffHours,
        failedAt: failedAt.toISOString(),
        retryAt: retryAt.toISOString()
      });
    }

    return shouldRetry;
  }

  /**
   * Retry a failed post
   * @param {MarketingPost} post - The post to retry
   * @returns {Promise<boolean>} - True if post succeeded, false if permanently failed
   */
  async retryPost(post) {
    const retryCount = (post.retryCount || 0) + 1;

    logger.info(`Retrying post: ${post._id} (attempt ${retryCount}/${this.maxRetries})`, {
      platform: post.platform,
      title: post.title,
      previousError: post.error
    });

    try {
      // Check if max retries exceeded
      if (retryCount > this.maxRetries) {
        logger.warn(`Post ${post._id} exceeded max retries (${this.maxRetries}), marking as permanently failed`);

        post.status = 'failed';
        post.permanentlyFailed = true;
        post.permanentlyFailedAt = new Date();
        await post.save();

        return false; // Indicates permanently failed
      }

      // Update retry count
      post.retryCount = retryCount;
      post.lastRetriedAt = new Date();
      await post.save();

      // Validate content has required assets
      if (!post.videoPath && !post.imagePath) {
        throw new Error('No video or image path found');
      }

      // Post to the appropriate platform
      let result;
      switch (post.platform) {
        case 'tiktok':
          result = await this.postToTikTok(post);
          break;

        case 'instagram':
          result = await this.postToInstagram(post);
          break;

        case 'youtube_shorts':
          result = await this.postToYouTube(post);
          break;

        default:
          throw new Error(`Unknown platform: ${post.platform}`);
      }

      // Mark as posted on success
      await post.markAsPosted();

      // Clear error fields
      post.error = null;
      post.retryCount = 0; // Reset on success
      await post.save();

      logger.info(`Successfully retried post: ${post._id}`, {
        platform: post.platform,
        postId: result.postId,
        retryAttempt: retryCount
      });

      return true; // Indicates success

    } catch (error) {
      logger.error(`Failed to retry post: ${post._id} (attempt ${retryCount}/${this.maxRetries})`, {
        error: error.message,
        platform: post.platform
      });

      // Update error and keep failed status
      post.status = 'failed';
      post.error = error.message;
      post.retryCount = retryCount; // Keep the retry count
      await post.save();

      // Check if this was the last retry
      if (retryCount >= this.maxRetries) {
        logger.warn(`Post ${post._id} permanently failed after ${retryCount} attempts`);

        post.permanentlyFailed = true;
        post.permanentlyFailedAt = new Date();
        await post.save();

        // Trigger manual posting fallback
        logger.info(`Creating manual posting fallback for post ${post._id}`);
        const fallbackResult = await manualPostingFallbackService.handlePermanentFailure(post);

        if (fallbackResult.success) {
          logger.info(`Manual posting fallback created`, {
            postId: post._id,
            todoId: fallbackResult.todoId,
            exportPath: fallbackResult.exportPath,
          });

          // Update post with fallback reference
          post.manualPostingTodoId = fallbackResult.todoId;
          post.manualPostingExportPath = fallbackResult.exportPath;
          await post.save();
        } else {
          logger.error(`Failed to create manual posting fallback`, {
            postId: post._id,
            error: fallbackResult.error,
          });
        }

        return false; // Indicates permanently failed
      }

      throw error; // Indicates retryable failure
    }
  }

  /**
   * Post to TikTok
   * @param {MarketingPost} post - The post to publish
   */
  async postToTikTok(post) {
    logger.info(`Retrying TikTok post: ${post._id}`);

    // Check if TikTok posting is enabled
    const isEnabled = process.env.ENABLE_TIKTOK_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('TikTok posting is disabled, skipping retry');
      return { success: false, skipped: true, reason: 'TikTok posting disabled' };
    }

    // Post the video
    const result = await tiktokPostingService.postVideo(
      post.videoPath,
      post.caption,
      post.hashtags
    );

    if (!result.success) {
      throw new Error(result.error || 'TikTok posting failed');
    }

    // Update post with TikTok IDs
    if (result.data.publishId) {
      post.tiktokVideoId = result.data.publishId;
    }
    if (result.data.shareUrl) {
      post.tiktokShareUrl = result.data.shareUrl;
    }
    await post.save();

    return result;
  }

  /**
   * Post to Instagram
   * @param {MarketingPost} post - The post to publish
   */
  async postToInstagram(post) {
    logger.info(`Retrying Instagram post: ${post._id}`);

    // Check if Instagram posting is enabled
    const isEnabled = process.env.ENABLE_INSTAGRAM_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('Instagram posting is disabled, skipping retry');
      return { success: false, skipped: true, reason: 'Instagram posting disabled' };
    }

    // Post the video as a Reel
    const result = await instagramPostingService.postVideo(
      post.videoPath,
      post.caption,
      post.hashtags,
      (progress) => {
        logger.debug(`Instagram upload progress for ${post._id}: ${progress}%`);
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Instagram posting failed');
    }

    return result;
  }

  /**
   * Post to YouTube Shorts
   * @param {MarketingPost} post - The post to publish
   */
  async postToYouTube(post) {
    logger.info(`Retrying YouTube post: ${post._id}`);

    // Check if YouTube posting is enabled
    const isEnabled = process.env.ENABLE_YOUTUBE_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('YouTube posting is disabled, skipping retry');
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
   * Start the post retry job
   * Runs every hour
   */
  start() {
    if (schedulerService.getJob(this.jobName)) {
      logger.warn('Post retry job already exists');
      return;
    }

    logger.info('Starting post retry job with exponential backoff');

    // Schedule job to run every hour
    schedulerService.schedule(
      this.jobName,
      '0 * * * *', // Every hour at minute 0
      () => this.execute(),
      {
        timezone: 'UTC'
      }
    );

    logger.info('Post retry job started');
  }

  /**
   * Stop the post retry job
   */
  stop() {
    if (!schedulerService.getJob(this.jobName)) {
      logger.warn('Post retry job not found');
      return;
    }

    logger.info('Stopping post retry job');

    schedulerService.unschedule(this.jobName);

    logger.info('Post retry job stopped');
  }

  /**
   * Get job status
   */
  getStatus() {
    const job = schedulerService.getJob(this.jobName);

    return {
      jobName: this.jobName,
      isRunning: this.isRunning,
      scheduled: !!job,
      stats: job ? job.stats : null,
      maxRetries: this.maxRetries,
      baseRetryInterval: this.baseRetryInterval
    };
  }

  /**
   * Manually trigger the job (for testing)
   */
  async trigger() {
    logger.info('Manually triggering post retry job');
    await this.execute();
  }

  /**
   * Get retry statistics
   */
  async getRetryStats() {
    try {
      const totalFailed = await MarketingPost.countDocuments({ status: 'failed' });
      const permanentlyFailed = await MarketingPost.countDocuments({
        status: 'failed',
        permanentlyFailed: true
      });
      const retryable = totalFailed - permanentlyFailed;

      // Get retry distribution
      const retryDistribution = await MarketingPost.aggregate([
        { $match: { status: 'failed' } },
        {
          $group: {
            _id: '$retryCount',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        totalFailed,
        permanentlyFailed,
        retryable,
        retryDistribution: retryDistribution.map(r => ({
          retryCount: r._id || 0,
          count: r.count
        }))
      };
    } catch (error) {
      logger.error('Error getting retry stats', {
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const postRetryJob = new PostRetryJob();

export default postRetryJob;
