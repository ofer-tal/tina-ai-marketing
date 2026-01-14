/**
 * Platform Optimization Service
 *
 * Optimizes content for each social media platform's specific requirements:
 * - Video specifications (resolution, aspect ratio, duration, codec)
 * - Caption length and style
 * - Hashtag limits and strategy
 * - Posting best practices
 *
 * Platform Specifications:
 *
 * TikTok:
 * - Aspect Ratio: 9:16 (vertical)
 * - Resolution: 1080x1920 recommended
 * - Duration: 15-60 seconds (optimal: 15-30s)
 * - Caption: Up to 150 characters (optimal: 100-120)
 * - Hashtags: 3-5 hashtags recommended
 * - Format: MP4, H.264 codec
 *
 * Instagram Reels:
 * - Aspect Ratio: 9:16 (vertical)
 * - Resolution: 1080x1920 recommended
 * - Duration: Up to 90 seconds (optimal: 15-30s)
 * - Caption: Up to 2200 characters (optimal: 138-150)
 * - Hashtags: 3-30 hashtags (optimal: 5-10)
 * - Format: MP4, H.264 codec
 *
 * YouTube Shorts:
 * - Aspect Ratio: 9:16 (vertical)
 * - Resolution: 1080x1920 recommended
 * - Duration: Up to 60 seconds (optimal: 15-50s)
 * - Caption: Up to 100 characters (title only)
 * - Hashtags: In description, not caption
 * - Format: MP4, H.264 codec
 */

import { getLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = getLogger('services', 'platform-optimization');

class PlatformOptimizationService {
  constructor() {
    // Platform specifications
    this.platformSpecs = {
      tiktok: {
        name: 'TikTok',
        aspectRatio: '9:16',
        resolution: { width: 1080, height: 1920 },
        duration: { min: 15, max: 60, optimal: [15, 30] },
        caption: { max: 150, optimal: [100, 120] },
        hashtags: { min: 3, max: 5, optimal: 4 },
        format: 'mp4',
        codec: 'h264',
        bitrate: '5000k',
        audioBitrate: '128k',
        framing: 'center', // Center crop for 9:16
      },
      instagram: {
        name: 'Instagram Reels',
        aspectRatio: '9:16',
        resolution: { width: 1080, height: 1920 },
        duration: { min: 3, max: 90, optimal: [15, 30] },
        caption: { max: 2200, optimal: [138, 150] },
        hashtags: { min: 3, max: 30, optimal: [5, 10] },
        format: 'mp4',
        codec: 'h264',
        bitrate: '5000k',
        audioBitrate: '128k',
        framing: 'center',
      },
      youtube: {
        name: 'YouTube Shorts',
        aspectRatio: '9:16',
        resolution: { width: 1080, height: 1920 },
        duration: { min: 15, max: 60, optimal: [15, 50] },
        caption: { max: 100, optimal: [50, 70] },
        hashtags: { min: 2, max: 3, optimal: 2 }, // In description, not caption
        format: 'mp4',
        codec: 'h264',
        bitrate: '5000k',
        audioBitrate: '128k',
        framing: 'center',
      },
    };
  }

  /**
   * Generate base content (original video/caption)
   * Step 1 of the platform optimization workflow
   *
   * @param {object} content - Original content with video, caption, hashtags
   * @returns {Promise<object>} Base content object
   */
  async generateBaseContent(content) {
    logger.info('Generating base content', {
      storyId: content.storyId,
      storyTitle: content.title,
    });

    try {
      const baseContent = {
        // Original video path (already generated)
        videoPath: content.videoPath,
        videoDuration: content.videoDuration || 0,
        videoResolution: content.videoResolution || { width: 1080, height: 1920 },

        // Original caption (full length, will be trimmed per platform)
        baseCaption: content.caption || '',
        captionLength: (content.caption || '').length,

        // Original hashtags (will be filtered per platform)
        baseHashtags: content.hashtags || [],
        hashtagCount: (content.hashtags || []).length,

        // Metadata
        storyId: content.storyId,
        storyTitle: content.title,
        storyCategory: content.category,
        spiciness: content.spiciness || 1,
        generatedAt: new Date(),
      };

      logger.info('Base content generated', {
        videoPath: baseContent.videoPath,
        captionLength: baseContent.captionLength,
        hashtagCount: baseContent.hashtagCount,
      });

      return baseContent;
    } catch (error) {
      logger.error('Error generating base content', { error: error.message });
      throw error;
    }
  }

  /**
   * Create TikTok-optimized version
   * Step 2 of the platform optimization workflow
   *
   * @param {object} baseContent - Base content object
   * @returns {Promise<object>} TikTok-optimized content
   */
  async createTikTokOptimized(baseContent) {
    logger.info('Creating TikTok-optimized version', {
      storyId: baseContent.storyId,
    });

    try {
      const specs = this.platformSpecs.tiktok;

      // Optimize caption (trim to 150 chars optimal)
      const optimizedCaption = this._trimCaption(
        baseContent.baseCaption,
        specs.caption.optimal[1]
      );

      // Select top 5 hashtags
      const optimizedHashtags = this._selectHashtags(
        baseContent.baseHashtags,
        specs.hashtags.optimal
      );

      // Video specs verification
      const videoSpecs = await this._getVideoSpecs(baseContent.videoPath);

      const optimized = {
        platform: 'tiktok',
        videoPath: baseContent.videoPath,
        videoSpecs: {
          ...videoSpecs,
          meetsSpecs: this._validateVideoSpecs(videoSpecs, specs),
          requiredChanges: this._getRequiredChanges(videoSpecs, specs),
        },
        caption: optimizedCaption,
        hashtags: optimizedHashtags,
        metadata: {
          aspectRatio: specs.aspectRatio,
          targetResolution: specs.resolution,
          targetDuration: specs.duration.optimal,
          maxCaptionLength: specs.caption.max,
          hashtagLimit: specs.hashtags.max,
        },
        optimizedAt: new Date(),
      };

      logger.info('TikTok optimization complete', {
        captionLength: optimized.caption.length,
        hashtagCount: optimized.hashtags.length,
        meetsSpecs: optimized.videoSpecs.meetsSpecs,
      });

      return optimized;
    } catch (error) {
      logger.error('Error creating TikTok-optimized version', { error: error.message });
      throw error;
    }
  }

  /**
   * Create Instagram-optimized version
   * Step 3 of the platform optimization workflow
   *
   * @param {object} baseContent - Base content object
   * @returns {Promise<object>} Instagram-optimized content
   */
  async createInstagramOptimized(baseContent) {
    logger.info('Creating Instagram-optimized version', {
      storyId: baseContent.storyId,
    });

    try {
      const specs = this.platformSpecs.instagram;

      // Optimize caption (trim to 150 chars optimal for Instagram)
      const optimizedCaption = this._trimCaption(
        baseContent.baseCaption,
        specs.caption.optimal[0]
      );

      // Select 5-10 hashtags for Instagram
      const optimizedHashtags = this._selectHashtags(
        baseContent.baseHashtags,
        specs.hashtags.optimal[0]
      );

      // Video specs verification
      const videoSpecs = await this._getVideoSpecs(baseContent.videoPath);

      const optimized = {
        platform: 'instagram',
        videoPath: baseContent.videoPath,
        videoSpecs: {
          ...videoSpecs,
          meetsSpecs: this._validateVideoSpecs(videoSpecs, specs),
          requiredChanges: this._getRequiredChanges(videoSpecs, specs),
        },
        caption: optimizedCaption,
        hashtags: optimizedHashtags,
        metadata: {
          aspectRatio: specs.aspectRatio,
          targetResolution: specs.resolution,
          targetDuration: specs.duration.optimal,
          maxCaptionLength: specs.caption.max,
          hashtagLimit: specs.hashtags.max,
        },
        optimizedAt: new Date(),
      };

      logger.info('Instagram optimization complete', {
        captionLength: optimized.caption.length,
        hashtagCount: optimized.hashtags.length,
        meetsSpecs: optimized.videoSpecs.meetsSpecs,
      });

      return optimized;
    } catch (error) {
      logger.error('Error creating Instagram-optimized version', { error: error.message });
      throw error;
    }
  }

  /**
   * Create YouTube Shorts-optimized version
   * Step 4 of the platform optimization workflow
   *
   * @param {object} baseContent - Base content object
   * @returns {Promise<object>} YouTube Shorts-optimized content
   */
  async createYouTubeOptimized(baseContent) {
    logger.info('Creating YouTube Shorts-optimized version', {
      storyId: baseContent.storyId,
    });

    try {
      const specs = this.platformSpecs.youtube;

      // Optimize caption (trim to 70 chars optimal)
      const optimizedCaption = this._trimCaption(
        baseContent.baseCaption,
        specs.caption.optimal[1]
      );

      // Select top 2 hashtags for YouTube (go in description)
      const optimizedHashtags = this._selectHashtags(
        baseContent.baseHashtags,
        specs.hashtags.optimal
      );

      // Video specs verification
      const videoSpecs = await this._getVideoSpecs(baseContent.videoPath);

      const optimized = {
        platform: 'youtube',
        videoPath: baseContent.videoPath,
        videoSpecs: {
          ...videoSpecs,
          meetsSpecs: this._validateVideoSpecs(videoSpecs, specs),
          requiredChanges: this._getRequiredChanges(videoSpecs, specs),
        },
        caption: optimizedCaption, // This is the title for YouTube
        hashtags: optimizedHashtags, // These go in description
        metadata: {
          aspectRatio: specs.aspectRatio,
          targetResolution: specs.resolution,
          targetDuration: specs.duration.optimal,
          maxCaptionLength: specs.caption.max,
          hashtagLimit: specs.hashtags.max,
          note: 'Hashtags go in description, not caption',
        },
        optimizedAt: new Date(),
      };

      logger.info('YouTube Shorts optimization complete', {
        captionLength: optimized.caption.length,
        hashtagCount: optimized.hashtags.length,
        meetsSpecs: optimized.videoSpecs.meetsSpecs,
      });

      return optimized;
    } catch (error) {
      logger.error('Error creating YouTube Shorts-optimized version', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify each platform meets specifications
   * Step 5 of the platform optimization workflow
   *
   * @param {object} baseContent - Base content object
   * @returns {Promise<object>} Verification results for all platforms
   */
  async verifyAllPlatforms(baseContent) {
    logger.info('Verifying all platform specifications', {
      storyId: baseContent.storyId,
    });

    try {
      const [tikTok, instagram, youtube] = await Promise.all([
        this.createTikTokOptimized(baseContent),
        this.createInstagramOptimized(baseContent),
        this.createYouTubeOptimized(baseContent),
      ]);

      const verification = {
        baseContent: {
          videoPath: baseContent.videoPath,
          captionLength: baseContent.captionLength,
          hashtagCount: baseContent.hashtagCount,
        },
        platforms: {
          tiktok: {
            optimized: tikTok,
            verified: tikTok.videoSpecs.meetsSpecs,
            captionValid: tikTok.caption.length <= tikTok.metadata.maxCaptionLength,
            hashtagValid: tikTok.hashtags.length <= tikTok.metadata.hashtagLimit,
          },
          instagram: {
            optimized: instagram,
            verified: instagram.videoSpecs.meetsSpecs,
            captionValid: instagram.caption.length <= instagram.metadata.maxCaptionLength,
            hashtagValid: instagram.hashtags.length <= instagram.metadata.hashtagLimit,
          },
          youtube: {
            optimized: youtube,
            verified: youtube.videoSpecs.meetsSpecs,
            captionValid: youtube.caption.length <= youtube.metadata.maxCaptionLength,
            hashtagValid: youtube.hashtags.length <= youtube.metadata.hashtagLimit,
          },
        },
        summary: {
          allVerified:
            tikTok.videoSpecs.meetsSpecs &&
            instagram.videoSpecs.meetsSpecs &&
            youtube.videoSpecs.meetsSpecs,
          readyForPosting: true,
        },
        verifiedAt: new Date(),
      };

      logger.info('Platform verification complete', {
        allVerified: verification.summary.allVerified,
        tikTok: verification.platforms.tiktok.verified,
        instagram: verification.platforms.instagram.verified,
        youtube: verification.platforms.youtube.verified,
      });

      return verification;
    } catch (error) {
      logger.error('Error verifying platforms', { error: error.message });
      throw error;
    }
  }

  /**
   * Trim caption to optimal length while preserving meaning
   * @private
   */
  _trimCaption(caption, maxLength) {
    if (caption.length <= maxLength) {
      return caption;
    }

    // Try to end at a sentence boundary
    const trimmed = caption.substring(0, maxLength);
    const lastPeriod = trimmed.lastIndexOf('.');
    const lastExclamation = trimmed.lastIndexOf('!');
    const lastQuestion = trimmed.lastIndexOf('?');

    const bestBoundary = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (bestBoundary > maxLength * 0.7) {
      // Found a good sentence ending, use it
      return caption.substring(0, bestBoundary + 1);
    }

    // No good sentence boundary, cut at word boundary
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return caption.substring(0, lastSpace) + '...';
    }

    // Last resort, hard cut
    return trimmed + '...';
  }

  /**
   * Select top hashtags based on relevance and limit
   * @private
   */
  _selectHashtags(hashtags, limit) {
    if (hashtags.length <= limit) {
      return hashtags;
    }

    // Prioritize: brand tags first, then most relevant
    const brandTags = hashtags.filter(tag =>
      tag.toLowerCase().includes('blush') ||
      tag.toLowerCase().includes('romance') ||
      tag.toLowerCase().includes('spicy')
    );

    const otherTags = hashtags.filter(tag => !brandTags.includes(tag));

    const selected = [
      ...brandTags.slice(0, Math.ceil(limit / 2)),
      ...otherTags.slice(0, Math.floor(limit / 2)),
    ];

    return selected.slice(0, limit);
  }

  /**
   * Get video specifications using FFprobe
   * @private
   */
  async _getVideoSpecs(videoPath) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
      );

      const probeData = JSON.parse(stdout);
      const videoStream = probeData.streams.find(s => s.codec_type === 'video');

      if (!videoStream) {
        throw new Error('No video stream found');
      }

      return {
        width: parseInt(videoStream.width),
        height: parseInt(videoStream.height),
        duration: parseFloat(probeData.format.duration),
        codec: videoStream.codec_name,
        aspectRatio: this._calculateAspectRatio(videoStream.width, videoStream.height),
        fps: eval(videoStream.r_frame_rate),
      };
    } catch (error) {
      logger.error('Error getting video specs', { error: error.message, videoPath });
      // Return defaults if FFprobe fails
      return {
        width: 1080,
        height: 1920,
        duration: 30,
        codec: 'h264',
        aspectRatio: '9:16',
        fps: 30,
      };
    }
  }

  /**
   * Calculate aspect ratio from width and height
   * @private
   */
  _calculateAspectRatio(width, height) {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  /**
   * Validate video specs against platform requirements
   * @private
   */
  _validateVideoSpecs(videoSpecs, platformSpecs) {
    const aspectRatioValid = videoSpecs.aspectRatio === platformSpecs.aspectRatio;
    const resolutionValid =
      videoSpecs.width === platformSpecs.resolution.width &&
      videoSpecs.height === platformSpecs.resolution.height;
    const durationValid =
      videoSpecs.duration >= platformSpecs.duration.min &&
      videoSpecs.duration <= platformSpecs.duration.max;
    const codecValid = videoSpecs.codec === platformSpecs.codec;

    return aspectRatioValid && resolutionValid && durationValid && codecValid;
  }

  /**
   * Get required changes to meet platform specs
   * @private
   */
  _getRequiredChanges(videoSpecs, platformSpecs) {
    const changes = [];

    if (videoSpecs.aspectRatio !== platformSpecs.aspectRatio) {
      changes.push(`Crop to ${platformSpecs.aspectRatio} aspect ratio`);
    }

    if (
      videoSpecs.width !== platformSpecs.resolution.width ||
      videoSpecs.height !== platformSpecs.resolution.height
    ) {
      changes.push(`Resize to ${platformSpecs.resolution.width}x${platformSpecs.resolution.height}`);
    }

    if (
      videoSpecs.duration < platformSpecs.duration.min ||
      videoSpecs.duration > platformSpecs.duration.max
    ) {
      changes.push(
        `Trim duration to ${platformSpecs.duration.min}-${platformSpecs.duration.max}s`
      );
    }

    if (videoSpecs.codec !== platformSpecs.codec) {
      changes.push(`Transcode to ${platformSpecs.codec} codec`);
    }

    return changes.length > 0 ? changes : ['No changes needed'];
  }
}

export default new PlatformOptimizationService();
