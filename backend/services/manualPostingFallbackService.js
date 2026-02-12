/**
 * Manual Posting Fallback Service
 *
 * When automated posting permanently fails (after max retries),
 * this service creates a manual posting todo with content export
 * and instructions for manual posting.
 */

import databaseService from './database.js';
import { getLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger('manual-posting-fallback', 'services');

class ManualPostingFallbackService {
  constructor() {
    this.exportDir = process.env.MANUAL_POSTING_EXPORT_DIR || './manual-posting-exports';
    this.instructions = {
      tiktok: this.getTikTokInstructions(),
      instagram: this.getInstagramInstructions(),
      youtube_shorts: this.getYouTubeInstructions(),
    };
  }

  /**
   * Step 1: Automated posting fails - Detect permanent failure
   * Called when a post exceeds max retries
   */
  async handlePermanentFailure(post) {
    try {
      logger.info('Handling permanent posting failure', {
        postId: post._id,
        platform: post.platform,
        title: post.title,
      });

      // Step 2: Detect failure - Detected by postingScheduler recoverStuckPosts() when platform retry count exceeded
      // Step 3: Create manual posting todo
      const todoResult = await this.createManualPostingTodo(post);

      // Step 4: Provide content export
      const exportResult = await this.exportContentForManualPosting(post);

      // Step 5: Include instructions
      await this.attachInstructionsToTodo(todoResult.todoId, exportResult);

      logger.info('Manual posting fallback created successfully', {
        postId: post._id,
        todoId: todoResult.todoId,
        exportPath: exportResult.exportPath,
      });

      return {
        success: true,
        todoId: todoResult.todoId,
        exportPath: exportResult.exportPath,
        instructions: exportResult.instructions,
      };

    } catch (error) {
      logger.error('Failed to create manual posting fallback', {
        postId: post._id,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Step 3: Create manual posting todo
   */
  async createManualPostingTodo(post) {
    try {
      const mongoose = await import('mongoose');

      // Create a descriptive todo title
      const platformDisplay = this.getPlatformDisplayName(post.platform);
      const title = `🔴 Manual Post Required: ${platformDisplay} - ${post.title.substring(0, 40)}...`;

      // Calculate urgency based on scheduled time
      const scheduledAt = post.scheduledAt || new Date();
      const isOverdue = new Date() > scheduledAt;
      const priority = isOverdue ? 'urgent' : 'high';
      const dueAt = isOverdue ? new Date(Date.now() + 2 * 60 * 60 * 1000) : scheduledAt;

      // Create the todo
      const todo = {
        title,
        description: this.generateTodoDescription(post),
        category: 'posting',
        priority,
        status: 'pending',
        scheduledAt: new Date(),
        dueAt,
        completedAt: null,
        resources: [],
        estimatedTime: 15, // 15 minutes to manually post
        actualTime: null,
        createdBy: 'system',
        relatedPostId: post._id.toString(),
        relatedStoryId: post.storyId?.toString() || null,
        metadata: {
          fallbackReason: 'permanent_failure',
          originalError: post.error || 'Unknown error',
          platform: post.platform,
          retryCount: post.retryCount || 0,
          failedAt: post.failedAt || post.updatedAt,
          exportPath: null, // Will be updated after export
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await mongoose.connection.collection('marketing_tasks').insertOne(todo);

      logger.info('Manual posting todo created', {
        todoId: result.insertedId,
        title: todo.title,
        priority,
      });

      return {
        success: true,
        todoId: result.insertedId,
        todo,
      };

    } catch (error) {
      logger.error('Failed to create manual posting todo', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Step 4: Provide content export
   */
  async exportContentForManualPosting(post) {
    try {
      // Ensure export directory exists
      await fs.mkdir(this.exportDir, { recursive: true });

      // Create export filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const platform = post.platform;
      const filename = `manual-post-${platform}-${post._id}-${timestamp}.json`;
      const exportPath = path.join(this.exportDir, filename);

      // Prepare export data
      const exportData = {
        exportDate: new Date().toISOString(),
        post: {
          id: post._id.toString(),
          title: post.title,
          platform: post.platform,
          caption: post.caption,
          hashtags: post.hashtags || [],
          scheduledAt: post.scheduledAt,
          failedAt: post.failedAt || post.updatedAt,
          error: post.error,
          retryCount: post.retryCount || 0,
        },
        content: {
          videoPath: post.videoPath,
          imagePath: post.imagePath,
          thumbnailPath: post.thumbnailPath,
        },
        story: {
          id: post.storyId?.toString() || null,
          title: post.storyId?.title || 'N/A',
          genre: post.storyId?.genre || 'N/A',
        },
        instructions: this.instructions[post.platform] || this.getGenericInstructions(),
      };

      // Write export file
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

      logger.info('Content exported for manual posting', {
        postId: post._id,
        exportPath,
      });

      return {
        success: true,
        exportPath,
        exportData,
        instructions: exportData.instructions,
      };

    } catch (error) {
      logger.error('Failed to export content for manual posting', {
        postId: post._id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Step 5: Include instructions
   * Attach instructions and export path to the todo
   */
  async attachInstructionsToTodo(todoId, exportResult) {
    try {
      const mongoose = await import('mongoose');

      // Update todo with export path and instructions summary
      await mongoose.connection.collection('marketing_tasks').updateOne(
        { _id: todoId },
        {
          $set: {
            'metadata.exportPath': exportResult.exportPath,
            'metadata.instructionsSummary': this.summarizeInstructions(exportResult.instructions),
            resources: [
              {
                type: 'file',
                url: exportResult.exportPath,
                description: 'Exported content package',
              },
              {
                type: 'link',
                url: `/posts/${exportResult.exportData.post.id}`,
                description: 'View original post',
              },
            ],
            updatedAt: new Date(),
          },
        }
      );

      logger.info('Instructions attached to todo', {
        todoId,
        exportPath: exportResult.exportPath,
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to attach instructions to todo', {
        todoId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate todo description
   */
  generateTodoDescription(post) {
    const platformDisplay = this.getPlatformDisplayName(post.platform);
    const error = post.error || 'Unknown error';

    return `
⚠️ AUTOMATED POSTING PERMANENTLY FAILED

The automated posting to ${platformDisplay} has failed after multiple retry attempts.
This content requires manual posting.

**Details:**
- Platform: ${platformDisplay}
- Title: ${post.title}
- Original Scheduled Time: ${post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'N/A'}
- Failed At: ${post.failedAt ? new Date(post.failedAt).toLocaleString() : 'N/A'}
- Retry Attempts: ${post.retryCount || 0}

**Error:**
${error}

**Action Required:**
1. Review the exported content package (attached as a resource)
2. Follow the platform-specific instructions
3. Manually post the content to ${platformDisplay}
4. Update the post status to "manually_posted"

**Why This Happened:**
Automated posting may fail due to:
- API authentication issues
- Platform API changes
- Network connectivity problems
- Rate limiting
- Content policy violations

After manual posting, mark this todo as complete.
`.trim();
  }

  /**
   * Get platform display name
   */
  getPlatformDisplayName(platform) {
    const displayNames = {
      tiktok: 'TikTok',
      instagram: 'Instagram',
      youtube_shorts: 'YouTube Shorts',
    };
    return displayNames[platform] || platform;
  }

  /**
   * Summarize instructions for todo metadata
   */
  summarizeInstructions(instructions) {
    return {
      steps: instructions.steps?.length || 0,
      hasVideoInstructions: !!instructions.videoUpload,
      hasCaptionInstructions: !!instructions.caption,
      hasTroubleshooting: !!instructions.troubleshooting,
    };
  }

  /**
   * TikTok manual posting instructions
   */
  getTikTokInstructions() {
    return {
      platform: 'TikTok',
      overview: 'Manually post video content to TikTok',
      prerequisites: [
        'TikTok mobile app installed',
        'Valid TikTok account',
        'Video file accessible',
      ],
      steps: [
        {
          step: 1,
          title: 'Open TikTok App',
          description: 'Launch the TikTok mobile app on your device',
        },
        {
          step: 2,
          title: 'Create New Post',
          description: 'Tap the "+" button at the bottom of the screen',
        },
        {
          step: 3,
          title: 'Upload Video',
          description: 'Select the video file from the exported content package',
          tips: [
            'Ensure video meets TikTok specs (9:16 aspect ratio, 15-60 seconds)',
            'File size should be under 287MB',
          ],
        },
        {
          step: 4,
          title: 'Add Caption',
          description: 'Copy and paste the caption from the export file',
          caption: true,
        },
        {
          step: 5,
          title: 'Add Hashtags',
          description: 'Include hashtags from the export in your caption or comments',
          hashtags: true,
        },
        {
          step: 6,
          title: 'Configure Post Settings',
          description: 'Set visibility, comments, duet, stitch options as needed',
        },
        {
          step: 7,
          title: 'Schedule or Post',
          description: 'Either post immediately or schedule for optimal time',
        },
        {
          step: 8,
          title: 'Record Post URL',
          description: 'After posting, copy the post URL for tracking',
        },
      ],
      videoUpload: {
        format: 'MP4 or WebM',
        aspectRatio: '9:16 (vertical)',
        duration: '15-60 seconds',
        fileSize: 'Max 287MB',
        resolution: '1080x1920 recommended',
      },
      caption: 'Use the caption from the exported content package',
      hashtags: 'Use hashtags from the exported content package',
      bestPractices: [
        'Post during peak hours (7-9 AM or 7-11 PM local time)',
        'Use trending sounds if appropriate',
        'Engage with comments quickly after posting',
        'Cross-promote on other platforms',
      ],
      troubleshooting: [
        {
          issue: 'Video won\'t upload',
          solution: 'Check file format and size. Ensure stable internet connection.',
        },
        {
          issue: 'Caption too long',
          solution: 'TikTok captions are limited to 2200 characters. Move some text to comments.',
        },
        {
          issue: 'Post not getting views',
          solution: 'Ensure hashtags are relevant. Post at different times. Engage with community.',
        },
      ],
    };
  }

  /**
   * Instagram manual posting instructions
   */
  getInstagramInstructions() {
    return {
      platform: 'Instagram',
      overview: 'Manually post video content to Instagram as a Reel',
      prerequisites: [
        'Instagram mobile app installed',
        'Valid Instagram account',
        'Video file accessible',
      ],
      steps: [
        {
          step: 1,
          title: 'Open Instagram App',
          description: 'Launch the Instagram mobile app on your device',
        },
        {
          step: 2,
          title: 'Create New Reel',
          description: 'Tap the "+" button and select "Reel"',
        },
        {
          step: 3,
          title: 'Upload Video',
          description: 'Select the video file from the exported content package',
          tips: [
            'Ensure video meets Reels specs (9:16 aspect ratio, max 90 seconds)',
            'File size should be under 4GB',
          ],
        },
        {
          step: 4,
          title: 'Edit Video',
          description: 'Trim, add effects, music, or text as needed',
        },
        {
          step: 5,
          title: 'Add Caption',
          description: 'Copy and paste the caption from the export file',
          caption: true,
        },
        {
          step: 6,
          title: 'Add Hashtags',
          description: 'Include hashtags from the export in your caption',
          hashtags: true,
        },
        {
          step: 7,
          title: 'Tag People',
          description: 'Tag any relevant accounts',
        },
        {
          step: 8,
          title: 'Configure Post Settings',
          description: 'Set visibility, comments, sharing options',
        },
        {
          step: 9,
          title: 'Share',
          description: 'Share as Reel, and optionally to Stories',
        },
        {
          step: 10,
          title: 'Record Post URL',
          description: 'After posting, copy the post URL for tracking',
        },
      ],
      videoUpload: {
        format: 'MP4 or MOV',
        aspectRatio: '9:16 (vertical)',
        duration: 'Max 90 seconds',
        fileSize: 'Max 4GB',
        resolution: '1080x1920 recommended',
      },
      caption: 'Use the caption from the exported content package',
      hashtags: 'Use hashtags from the exported content package (max 30)',
      bestPractices: [
        'Post during peak hours (11 AM-1 PM or 7-9 PM local time)',
        'Use trending audio',
        'Create an engaging hook in first 3 seconds',
        'Add interactive stickers (polls, questions)',
        'Share to Stories for additional reach',
      ],
      troubleshooting: [
        {
          issue: 'Video quality degraded',
          solution: 'Upload at 1080x1920 resolution. Use high bitrate encoding.',
        },
        {
          issue: 'Video cut off',
          solution: 'Ensure content fits within safe zones. Avoid critical text at edges.',
        },
        {
          issue: 'Reel not appearing',
          solution: 'Check if account is public. Review community guidelines compliance.',
        },
      ],
    };
  }

  /**
   * YouTube Shorts manual posting instructions
   */
  getYouTubeInstructions() {
    return {
      platform: 'YouTube Shorts',
      overview: 'Manually post video content to YouTube Shorts',
      prerequisites: [
        'YouTube mobile app or studio',
        'Valid YouTube channel',
        'Video file accessible',
      ],
      steps: [
        {
          step: 1,
          title: 'Open YouTube App/Studio',
          description: 'Launch the YouTube mobile app or YouTube Studio on desktop',
        },
        {
          step: 2,
          title: 'Create Short',
          description: 'Tap the "+" button and select "Short"',
        },
        {
          step: 3,
          title: 'Upload Video',
          description: 'Select the video file from the exported content package',
          tips: [
            'Ensure video is vertical (9:16 aspect ratio)',
            'Duration must be under 60 seconds',
          ],
        },
        {
          step: 4,
          title: 'Add Details',
          description: 'Add title, description, and thumbnail',
        },
        {
          step: 5,
          title: 'Add Caption to Description',
          description: 'Copy the caption to the video description',
          caption: true,
        },
        {
          step: 6,
          title: 'Add Hashtags',
          description: 'Include hashtags in the description or video title',
          hashtags: true,
        },
        {
          step: 7,
          title: 'Add Music (Optional)',
          description: 'Add background music from YouTube\'s library',
        },
        {
          step: 8,
          title: 'Configure Visibility',
          description: 'Set to Public, Unlisted, or Private',
        },
        {
          step: 9,
          title: 'Upload',
          description: 'Click "Upload Short" to publish',
        },
        {
          step: 10,
          title: 'Record Video URL',
          description: 'After uploading, copy the video URL for tracking',
        },
      ],
      videoUpload: {
        format: 'MP4, MOV, or WebM',
        aspectRatio: '9:16 (vertical)',
        duration: 'Max 60 seconds',
        fileSize: 'Max 256GB',
        resolution: '1080x1920 recommended',
      },
      caption: 'Use the caption from the exported content package in the description',
      hashtags: 'Add hashtags to description or title (max 15)',
      bestPractices: [
        'Post during weekdays 2-4 PM or evenings 7-10 PM',
        'Create a catchy title with hooks',
        'Use trending topics and sounds',
        'Add a clear call-to-action',
        'Engage with comments',
      ],
      troubleshooting: [
        {
          issue: 'Video rejected',
          solution: 'Check copyright issues. Ensure content meets community guidelines.',
        },
        {
          issue: 'Low views',
          solution: 'Use compelling thumbnails. Optimize titles and descriptions with keywords.',
        },
        {
          issue: 'Not appearing as Short',
          solution: 'Ensure video is vertical and under 60 seconds with correct aspect ratio.',
        },
      ],
    };
  }

  /**
   * Generic instructions for unknown platforms
   */
  getGenericInstructions() {
    return {
      platform: 'Generic',
      overview: 'Manually post content to the platform',
      prerequisites: [
        'Valid account on the platform',
        'Content files accessible',
      ],
      steps: [
        {
          step: 1,
          title: 'Open Platform',
          description: 'Launch the platform\'s app or website',
        },
        {
          step: 2,
          title: 'Create New Post',
          description: 'Navigate to the post creation interface',
        },
        {
          step: 3,
          title: 'Upload Content',
          description: 'Select and upload the media file from the export package',
        },
        {
          step: 4,
          title: 'Add Caption',
          description: 'Copy and paste the caption from the export file',
        },
        {
          step: 5,
          title: 'Add Hashtags',
          description: 'Include hashtags from the export',
        },
        {
          step: 6,
          title: 'Configure Settings',
          description: 'Set visibility, comments, and other options',
        },
        {
          step: 7,
          title: 'Post',
          description: 'Publish the content',
        },
        {
          step: 8,
          title: 'Record URL',
          description: 'Copy the post URL for tracking',
        },
      ],
      bestPractices: [
        'Follow platform-specific best practices',
        'Engage with your audience after posting',
        'Monitor performance metrics',
      ],
    };
  }

  /**
   * Get export directory path
   */
  getExportDirectory() {
    return this.exportDir;
  }

  /**
   * List all exported packages
   */
  async listExports() {
    try {
      const files = await fs.readdir(this.exportDir);
      const exports = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.exportDir, file);
          const stats = await fs.stat(filePath);
          const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

          exports.push({
            filename: file,
            path: filePath,
            createdAt: stats.birthtime,
            size: stats.size,
            platform: content.post?.platform,
            postId: content.post?.id,
          });
        }
      }

      // Sort by creation date, newest first
      exports.sort((a, b) => b.createdAt - a.createdAt);

      return exports;

    } catch (error) {
      logger.error('Failed to list exports', {
        error: error.message,
      });
      return [];
    }
  }
}

export default new ManualPostingFallbackService();
