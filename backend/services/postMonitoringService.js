import { getLogger } from "../utils/logger.js";
import MarketingPost from "../models/MarketingPost.js";
import mongoose from "mongoose";

const logger = getLogger("post-monitoring", "services");

/**
 * Post Monitoring Service
 *
 * Actively monitors posts that are in progress and detects failures:
 * - Monitors posts with status 'posting' or 'uploading'
 * - Detects stuck posts (no progress for too long)
 * - Detects failed uploads
 * - Sends alerts for failures
 * - Creates retry todos
 * - Provides real-time status updates
 */
class PostMonitoringService {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.checkInterval = 30000; // Check every 30 seconds
    this.stuckThreshold = 5 * 60 * 1000; // 5 minutes without progress = stuck
    this.failedThreshold = 600 * 60 * 1000; // 60 minutes in posting state = failed
  }

  /**
   * Start monitoring posts
   */
  start() {
    if (this.isMonitoring) {
      logger.warn("Post monitoring already running");
      return;
    }

    this.isMonitoring = true;
    logger.info("Starting post monitoring service");

    // Check immediately
    this.checkPosts();

    // Set up recurring checks
    this.monitoringInterval = setInterval(() => {
      this.checkPosts();
    }, this.checkInterval);

    logger.info(
      `Post monitoring started (checking every ${this.checkInterval / 1000}s)`,
    );
  }

  /**
   * Stop monitoring posts
   */
  stop() {
    if (!this.isMonitoring) {
      logger.warn("Post monitoring not running");
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info("Post monitoring stopped");
  }

  /**
   * Check all posts that are in progress
   */
  async checkPosts() {
    if (!this.isMonitoring) {
      return;
    }

    try {
      // Find all posts that are currently being posted
      const inProgressPosts = await MarketingPost.find({
        status: { $in: ["posting", "uploading"] },
      }).sort({ createdAt: -1 });

      if (inProgressPosts.length === 0) {
        logger.debug("No posts in progress");
        return;
      }

      logger.debug(`Checking ${inProgressPosts.length} posts in progress`);

      // Check each post
      for (const post of inProgressPosts) {
        await this.checkPost(post);
      }
    } catch (error) {
      logger.error("Error checking posts", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Check a single post for issues
   * @param {MarketingPost} post - The post to check
   */
  async checkPost(post) {
    try {
      const now = new Date();
      const lastUpdate = post.updatedAt || post.createdAt;
      const timeSinceUpdate = now - lastUpdate;

      // Check if post is stuck (no progress for too long)
      if (timeSinceUpdate > this.stuckThreshold) {
        await this.handleStuckPost(post, timeSinceUpdate);
        return;
      }

      // Check if post has been in posting state for too long
      // CRITICAL: Use postingStartedAt if available (set when post entered 'posting' state)
      // Otherwise fall back to sheetTriggeredAt, uploadProgress.startedAt, or updatedAt (NOT createdAt!)
      // Using createdAt is wrong because posts can be created hours/days before actually posting
      const postingStartedAt =
        post.postingStartedAt ||  // When the post actually entered 'posting' state
        post.sheetTriggeredAt ||
        post.uploadProgress?.startedAt ||
        post.updatedAt; // Fallback to last update, NOT createdAt
      const timeInPosting = now - postingStartedAt;

      logger.debug(
        `Post ${post._id} time in posting: ${Math.round(timeInPosting / 1000)}s failedThreshold: ${Math.round(this.failedThreshold / 1000)}s`,
      );
      if (timeInPosting > this.failedThreshold) {
        await this.handleFailedPost(
          post,
          "timeout",
          `Post has been in posting state for ${Math.round(timeInPosting / 1000)}s`,
        );
        return;
      }

      // Check if there was an error in uploadProgress
      if (post.uploadProgress?.errorMessage) {
        await this.handleFailedPost(
          post,
          "upload_error",
          post.uploadProgress.errorMessage,
        );
        return;
      }

      // Check if upload progress is stuck at a specific percentage
      if (
        post.uploadProgress?.status === "uploading" &&
        post.uploadProgress.progress > 0
      ) {
        const progressTime =
          now - (post.uploadProgress.startedAt || post.createdAt);
        if (progressTime > this.stuckThreshold) {
          await this.handleStuckPost(post, progressTime);
          return;
        }
      }

      logger.debug(`Post ${post._id} looks healthy`, {
        status: post.status,
        uploadStatus: post.uploadProgress?.status,
        progress: post.uploadProgress?.progress,
        timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + "s",
      });
    } catch (error) {
      logger.error(`Error checking post ${post._id}`, {
        error: error.message,
      });
    }
  }

  /**
   * Handle a stuck post
   * @param {MarketingPost} post - The stuck post
   * @param {number} timeSinceUpdate - Time since last update in ms
   */
  async handleStuckPost(post, timeSinceUpdate) {
    logger.warn(`Post ${post._id} appears stuck`, {
      platform: post.platform,
      title: post.title,
      timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + "s",
      currentStatus: post.status,
      uploadStatus: post.uploadProgress?.status,
      progress: post.uploadProgress?.progress,
    });

    // Don't auto-mark as failed yet, just log and alert
    // The posting service should handle the actual failure
    // We just alert the user that something might be wrong

    await this.sendStuckAlert(post, timeSinceUpdate);
  }

  /**
   * Handle a failed post
   * @param {MarketingPost} post - The failed post
   * @param {string} failureType - Type of failure (timeout, upload_error, api_error)
   * @param {string} errorMessage - Error message
   */
  async handleFailedPost(post, failureType, errorMessage) {
    logger.error(`Post ${post._id} failed`, {
      platform: post.platform,
      title: post.title,
      failureType,
      errorMessage,
    });

    // Step 3: Update post status to failed
    await this.markPostAsFailed(post, errorMessage);

    // Step 4: Send alert notification
    await this.sendFailureAlert(post, failureType, errorMessage);

    // Step 5: Create retry todo
    await this.createRetryTodo(post, failureType, errorMessage);
  }

  /**
   * Mark a post as failed
   * @param {MarketingPost} post - The post to mark as failed
   * @param {string} errorMessage - Error message
   */
  async markPostAsFailed(post, errorMessage) {
    try {
      post.status = "failed";
      post.error = errorMessage;
      post.failedAt = new Date();
      post.retryCount = 0;

      if (post.uploadProgress) {
        post.uploadProgress.status = "failed";
        post.uploadProgress.errorMessage = errorMessage;
        post.uploadProgress.completedAt = new Date();
      }

      await post.save();

      logger.info(`Post ${post._id} marked as failed`, {
        platform: post.platform,
        title: post.title,
        error: errorMessage,
      });
    } catch (error) {
      logger.error(`Error marking post ${post._id} as failed`, {
        error: error.message,
      });
    }
  }

  /**
   * Send alert for stuck post
   * @param {MarketingPost} post - The stuck post
   * @param {number} timeSinceUpdate - Time since last update in ms
   */
  async sendStuckAlert(post, timeSinceUpdate) {
    try {
      const alert = {
        type: "stuck_post",
        severity: "warning",
        timestamp: new Date(),
        post: {
          id: post._id,
          title: post.title,
          platform: post.platform,
          status: post.status,
          uploadStatus: post.uploadProgress?.status,
          progress: post.uploadProgress?.progress,
        },
        details: {
          timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + "s",
          message: `Post "${post.title}" on ${post.platform} appears stuck. No progress for ${Math.round(timeSinceUpdate / 1000)} seconds.`,
        },
      };

      // Log the alert (in production, this would send to notification service)
      logger.info("STUCK POST ALERT", {
        alert,
        userMessage: alert.details.message,
      });

      // Store alert in post's metadata (optional)
      if (!post.metadata) {
        post.metadata = {};
      }
      post.metadata.lastStuckAlert = alert.timestamp;
      await post.save();
    } catch (error) {
      logger.error("Error sending stuck alert", {
        error: error.message,
        postId: post._id,
      });
    }
  }

  /**
   * Send alert for failed post
   * @param {MarketingPost} post - The failed post
   * @param {string} failureType - Type of failure
   * @param {string} errorMessage - Error message
   */
  async sendFailureAlert(post, failureType, errorMessage) {
    try {
      const alert = {
        type: "post_failed",
        severity: "error",
        timestamp: new Date(),
        post: {
          id: post._id,
          title: post.title,
          platform: post.platform,
          storyId: post.storyId,
          storyName: post.storyName,
        },
        failure: {
          type: failureType,
          message: errorMessage,
        },
        details: {
          message: `Post "${post.title}" failed to publish to ${post.platform}. Error: ${errorMessage}`,
          action:
            "A retry todo has been created. Check the todo list to manually retry or investigate the issue.",
        },
      };

      // Log the alert (in production, this would send to notification service)
      logger.info("POST FAILED ALERT", {
        alert,
        userMessage: alert.details.message,
        userAction: alert.details.action,
      });

      // Store alert in post's metadata
      if (!post.metadata) {
        post.metadata = {};
      }
      post.metadata.failureAlerts = post.metadata.failureAlerts || [];
      post.metadata.failureAlerts.push(alert);
      await post.save();
    } catch (error) {
      logger.error("Error sending failure alert", {
        error: error.message,
        postId: post._id,
      });
    }
  }

  /**
   * Create a retry todo for a failed post
   * @param {MarketingPost} post - The failed post
   * @param {string} failureType - Type of failure
   * @param {string} errorMessage - Error message
   */
  async createRetryTodo(post, failureType, errorMessage) {
    try {
      // Check if a retry todo already exists for this post
      const existingTodo = await mongoose.connection
        .collection("marketing_tasks")
        .findOne({
          type: "retry_post",
          "metadata.postId": post._id.toString(),
          status: { $in: ["pending", "in_progress"] },
        });

      if (existingTodo) {
        logger.debug(
          `Retry todo already exists for post ${post._id}, skipping`,
        );
        return;
      }

      // Create retry todo
      const todo = {
        title: `Retry post: ${post.title} (${post.platform})`,
        description: `Post failed to publish to ${post.platform}. Error: ${errorMessage}\n\nPost details:\n- Title: ${post.title}\n- Platform: ${post.platform}\n- Story: ${post.storyName}\n- Scheduled: ${post.scheduledAt}\n- Failed at: ${post.failedAt}`,
        type: "retry_post",
        category: "posting",
        priority: "high",
        status: "pending",
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        createdAt: new Date(),
        createdBy: "system",
        metadata: {
          postId: post._id.toString(),
          platform: post.platform,
          failureType: failureType,
          errorMessage: errorMessage,
          storyId: post.storyId ? post.storyId.toString() : null,
          storyName: post.storyName,
          originalScheduledAt: post.scheduledAt,
        },
        actions: [
          {
            label: "View Post",
            type: "navigate",
            path: `/content/posts/${post._id}`,
          },
          {
            label: "Retry Now",
            type: "api",
            method: "POST",
            path: `/api/post-retry/${post._id}/retry`,
          },
        ],
      };

      await mongoose.connection.collection("marketing_tasks").insertOne(todo);

      logger.info(`Retry todo created for post ${post._id}`, {
        todoId: todo._id,
        title: todo.title,
        priority: todo.priority,
      });
    } catch (error) {
      logger.error("Error creating retry todo", {
        error: error.message,
        postId: post._id,
      });
    }
  }

  /**
   * Manually trigger a check (for testing)
   */
  async triggerCheck() {
    logger.info("Manually triggering post check");
    await this.checkPosts();
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.checkInterval,
      stuckThreshold: this.stuckThreshold,
      failedThreshold: this.failedThreshold,
    };
  }
}

// Create singleton instance
const postMonitoringService = new PostMonitoringService();

export default postMonitoringService;
