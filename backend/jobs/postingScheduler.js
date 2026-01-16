import schedulerService from '../services/scheduler.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import instagramPostingService from '../services/instagramPostingService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('posting-scheduler', 'scheduler');

/**
 * Posting Scheduler Job
 *
 * Runs every 15 minutes to check for scheduled content that needs to be posted
 * - Finds content with status 'scheduled' and scheduledAt <= now
 * - Posts to the appropriate platform (TikTok, Instagram, YouTube)
 * - Updates status to 'posted' or 'failed'
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

      // Find all content that should be posted now
      const scheduledContent = await MarketingPost.find({
        status: 'scheduled',
        scheduledAt: { $lte: new Date() }
      }).populate('storyId');

      logger.info(`Found ${scheduledContent.length} posts ready for scheduling`);

      if (scheduledContent.length === 0) {
        return;
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
      post.status = 'ready';
      await post.save();

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

      // Mark as posted
      await post.markAsPosted();

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

      // Mark as failed
      post.status = 'failed';
      post.error = error.message;
      post.failedAt = new Date();
      await post.save();

      throw error;
    }
  }

  /**
   * Post to TikTok
   * @param {MarketingPost} post - The post to publish
   */
  async postToTikTok(post) {
    logger.info(`Posting scheduled content to TikTok: ${post._id}`);

    // Check if TikTok posting is enabled
    const isEnabled = process.env.ENABLE_TIKTOK_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('TikTok posting is disabled, skipping');
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
    logger.info(`Posting scheduled content to Instagram: ${post._id}`);

    // Check if Instagram posting is enabled
    const isEnabled = process.env.ENABLE_INSTAGRAM_POSTING === 'true';

    if (!isEnabled) {
      logger.warn('Instagram posting is disabled, skipping');
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
   * Runs every minute
   */
  start() {
    if (schedulerService.getJob(this.jobName)) {
      logger.warn('Scheduled posting job already exists');
      return;
    }

    logger.info('Starting scheduled posting job');

    // Schedule job to run every 15 minutes
    schedulerService.schedule(
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
  stop() {
    if (!schedulerService.getJob(this.jobName)) {
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
  getStatus() {
    const job = schedulerService.getJob(this.jobName);

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
