/**
 * S3 Video Uploader Service
 *
 * Handles uploading videos to AWS S3 for public access.
 * Videos are uploaded to /marketing/videos/ path for access via CloudFront.
 *
 * Environment variables:
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_S3_BUCKET_NAME: S3 bucket name
 * - AWS_S3_REGION: AWS region (default: us-east-1)
 *
 * Public URL format: https://content.blush.v6v.one/marketing/videos/[key]
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getLogger } from '../utils/logger.js';
import crypto from 'crypto';
import { readFile } from 'fs/promises';

const logger = getLogger('services', 's3-video-uploader');

// S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN || 'content.blush.v6v.one';
const s3PathPrefix = 'marketing/videos';

class S3VideoUploader {
  constructor() {
    this.enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucketName);

    logger.info('S3 Video Uploader Service initialized', {
      enabled: this.enabled,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      bucketName,
      region: process.env.AWS_S3_REGION || 'us-east-1',
      cloudFrontDomain,
    });
  }

  /**
   * Upload a video to S3
   * @param {string} videoPath - Local path to the video file
   * @param {string} keyName - S3 key name (without prefix)
   * @param {Function} onProgress - Optional progress callback
   */
  async uploadVideo(videoPath, keyName, onProgress = null) {
    try {
      if (!this.enabled) {
        throw new Error('S3 uploading is disabled - missing AWS credentials');
      }

      logger.info('Uploading video to S3', {
        videoPath,
        keyName,
      });

      // Read video file
      if (onProgress) onProgress({ status: 'reading', progress: 10 });
      const videoBuffer = await readFile(videoPath);

      // Generate full S3 key
      const s3Key = `${s3PathPrefix}/${keyName}`;

      // Determine content type based on file extension
      const extension = keyName.split('.').pop().toLowerCase();
      const contentType = this._getContentType(extension);

      logger.info('Uploading to S3', {
        s3Key,
        bucketName,
        contentType,
        size: videoBuffer.length,
      });

      if (onProgress) onProgress({ status: 'uploading', progress: 20 });

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: videoBuffer,
        ContentType: contentType,
      });

      if (onProgress) onProgress({ status: 'uploading', progress: 50 });

      await s3Client.send(command);

      if (onProgress) onProgress({ status: 'uploading', progress: 100 });

      const publicUrl = this.getPublicUrl(keyName);

      logger.info('Video uploaded successfully', {
        s3Key,
        publicUrl,
        size: videoBuffer.length,
      });

      return {
        success: true,
        s3Key,
        publicUrl,
        size: videoBuffer.length,
      };

    } catch (error) {
      logger.error('Failed to upload video to S3', {
        error: error.message,
        videoPath,
        keyName,
      });

      return {
        success: false,
        error: error.message,
        code: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Get the public URL for an uploaded video
   * @param {string} keyName - S3 key name (without prefix)
   */
  getPublicUrl(keyName) {
    return `https://${cloudFrontDomain}/${s3PathPrefix}/${keyName}`;
  }

  /**
   * Delete a video from S3
   * @param {string} keyName - S3 key name (without prefix)
   */
  async deleteVideo(keyName) {
    try {
      if (!this.enabled) {
        throw new Error('S3 operations disabled');
      }

      const s3Key = `${s3PathPrefix}/${keyName}`;

      logger.info('Deleting video from S3', {
        s3Key,
      });

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(command);

      logger.info('Video deleted successfully', {
        s3Key,
      });

      return {
        success: true,
        s3Key,
      };

    } catch (error) {
      logger.error('Failed to delete video from S3', {
        error: error.message,
        keyName,
      });

      return {
        success: false,
        error: error.message,
        code: 'DELETE_ERROR',
      };
    }
  }

  /**
   * Check if a video exists in S3
   * @param {string} keyName - S3 key name (without prefix)
   */
  async videoExists(keyName) {
    try {
      if (!this.enabled) {
        return { success: false, exists: false, error: 'S3 disabled' };
      }

      const s3Key = `${s3PathPrefix}/${keyName}`;

      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(command);

      return {
        success: true,
        exists: true,
        s3Key,
      };

    } catch (error) {
      if (error.name === 'NotFound') {
        return {
          success: true,
          exists: false,
          s3Key: `${s3PathPrefix}/${keyName}`,
        };
      }

      return {
        success: false,
        exists: false,
        error: error.message,
      };
    }
  }

  /**
   * Test S3 connection
   */
  async testConnection() {
    try {
      if (!this.enabled) {
        return {
          success: false,
          error: 'S3 is disabled - missing AWS credentials',
          code: 'DISABLED',
        };
      }

      // Try to list objects (with max 1) to test access
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: 'test-connection-check', // This will 404 but proves we can reach S3
      });

      await s3Client.send(command);

      return {
        success: true,
        message: 'S3 connection successful',
        bucketName,
        cloudFrontDomain,
      };

    } catch (error) {
      // 404 is expected for the test key, but means connection works
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return {
          success: true,
          message: 'S3 connection successful',
          bucketName,
          cloudFrontDomain,
        };
      }

      logger.error('S3 connection test failed', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'CONNECTION_ERROR',
      };
    }
  }

  /**
   * Generate a unique S3 key name for a video
   * @param {string} postId - Database post ID
   * @param {string} originalFilename - Original video filename
   */
  generateKeyName(postId, originalFilename = 'video.mp4') {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const extension = originalFilename.split('.').pop() || 'mp4';

    return `${postId}_${timestamp}_${randomSuffix}.${extension}`;
  }

  /**
   * Get content type based on file extension
   */
  _getContentType(extension) {
    const contentTypes = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
      flv: 'video/x-flv',
    };

    return contentTypes[extension] || 'video/mp4';
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      success: true,
      service: 's3-video-uploader',
      status: 'ok',
      enabled: this.enabled,
      bucketName,
      cloudFrontDomain,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      bucketName,
      region: process.env.AWS_S3_REGION || 'us-east-1',
      cloudFrontDomain,
      pathPrefix: s3PathPrefix,
    };
  }
}

// Export singleton instance
export default new S3VideoUploader();
