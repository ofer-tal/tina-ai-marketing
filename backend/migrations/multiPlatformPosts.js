/**
 * Multi-Platform Posts Migration
 *
 * Migrates existing single-platform posts to the new multi-platform structure.
 *
 * Changes:
 * 1. Converts `platform` string to `platforms` array
 * 2. Copies existing status to `platformStatus[platform]`
 * 3. Adds `partial_posted` status enum value
 * 4. Preserves backward compatibility for old posts
 */

import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('migrations', 'multi-platform-posts');

/**
 * Run the migration
 * @param {Object} options - Migration options
 * @param {boolean} options.dryRun - If true, don't actually update documents
 * @returns {Promise<Object>} Migration results
 */
export async function run(options = {}) {
  const { dryRun = false } = options;

  logger.info('Starting multi-platform posts migration', { dryRun });

  // Check connection
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection not available');
  }

  const collection = mongoose.connection.collection('marketing_posts');

  // Get all posts that need migration
  // Posts that have `platform` but not `platforms`
  const postsToMigrate = await collection.find({
    platform: { $exists: true, $ne: null },
    platforms: { $exists: false }
  }).toArray();

  logger.info('Found posts to migrate', { count: postsToMigrate.length });

  const results = {
    total: postsToMigrate.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 5000]; // ms

  for (const post of postsToMigrate) {
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        const platform = post.platform;
        const status = post.status || 'draft';

        // Build platform status object
        const platformStatusKey = `platformStatus.${platform}`;
        const platformStatusValue = {
          status: 'pending',
          postedAt: post.postedAt || null,
          error: null,
          retryCount: post.retryCount || 0
        };

        // Set status based on post's overall status
        if (status === 'posted') {
          platformStatusValue.status = 'posted';
          platformStatusValue.postedAt = post.postedAt || post.approvedAt || new Date();
          platformStatusValue.mediaId = post.tiktokVideoId || post.instagramMediaId || null;
          if (platform === 'tiktok' && post.tiktokShareUrl) {
            platformStatusValue.shareUrl = post.tiktokShareUrl;
          }
          if (platform === 'instagram' && post.instagramPermalink) {
            platformStatusValue.permalink = post.instagramPermalink;
          }
        } else if (status === 'failed') {
          platformStatusValue.status = 'failed';
          platformStatusValue.error = post.postingError || 'Posting failed';
          platformStatusValue.retryCount = post.retryCount || 1;
          platformStatusValue.lastFailedAt = post.lastRetriedAt || new Date();
        } else if (status === 'posting') {
          platformStatusValue.status = 'posting';
        }

        // Build update document
        const updateDoc = {
          $set: {
            platforms: [platform],
            [platformStatusKey]: platformStatusValue
          }
        };

        // Execute update
        if (!dryRun) {
          await collection.updateOne(
            { _id: post._id },
            updateDoc
          );
        }

        results.success++;
        results.details.push({
          postId: post._id.toString(),
          platform,
          fromStatus: status,
          toPlatformStatus: platformStatusValue.status,
          success: true
        });

        success = true;

        logger.debug('Migrated post', {
          postId: post._id.toString(),
          platform,
          attempt: attempt + 1
        });

      } catch (error) {
        attempt++;
        logger.warn('Migration attempt failed for post', {
          postId: post._id.toString(),
          attempt,
          error: error.message
        });

        if (attempt < MAX_RETRIES) {
          // Wait before retrying
          const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          results.failed++;
          results.details.push({
            postId: post._id.toString(),
            error: error.message,
            success: false
          });
          logger.error('Failed to migrate post after retries', {
            postId: post._id.toString(),
            error: error.message
          });
        }
      }
    }
  }

  // Handle posts with `platforms` array but missing `platformStatus`
  const postsWithPlatformsOnly = await collection.find({
    platforms: { $exists: true, $ne: null },
    platformStatus: { $exists: false }
  }).toArray();

  logger.info('Found posts with platforms array but no platformStatus', {
    count: postsWithPlatformsOnly.length
  });

  for (const post of postsWithPlatformsOnly) {
    try {
      const platforms = post.platforms || [];
      const status = post.status || 'draft';

      const platformStatusUpdates = {};
      for (const platform of platforms) {
        const platformStatusValue = { status: 'pending' };

        if (status === 'posted') {
          platformStatusValue.status = 'posted';
          platformStatusValue.postedAt = post.postedAt || new Date();
        } else if (status === 'failed') {
          platformStatusValue.status = 'failed';
          platformStatusValue.error = post.postingError || 'Posting failed';
        }

        platformStatusUpdates[`platformStatus.${platform}`] = platformStatusValue;
      }

      if (!dryRun) {
        await collection.updateOne(
          { _id: post._id },
          { $set: platformStatusUpdates }
        );
      }

      results.success++;
      logger.debug('Added platformStatus to post', {
        postId: post._id.toString(),
        platforms
      });

    } catch (error) {
      results.failed++;
      logger.error('Failed to add platformStatus to post', {
        postId: post._id.toString(),
        error: error.message
      });
    }
  }

  logger.info('Migration complete', {
    dryRun,
    total: results.total,
    success: results.success,
    failed: results.failed,
    skipped: results.skipped
  });

  return results;
}

/**
 * Rollback the migration (reverts to single-platform structure)
 * @param {Object} options - Rollback options
 * @param {boolean} options.dryRun - If true, don't actually update documents
 * @returns {Promise<Object>} Rollback results
 */
export async function rollback(options = {}) {
  const { dryRun = false } = options;

  logger.info('Rolling back multi-platform posts migration', { dryRun });

  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection not available');
  }

  const collection = mongoose.connection.collection('marketing_posts');

  // Find all posts with platforms array
  const posts = await collection.find({
    platforms: { $exists: true }
  }).toArray();

  logger.info('Found posts to rollback', { count: posts.length });

  const results = {
    total: posts.length,
    success: 0,
    failed: 0,
    details: []
  };

  for (const post of posts) {
    try {
      // For posts with single platform, restore platform field
      // For posts with multiple platforms, keep the first one
      const platformToRestore = post.platforms?.[0] || post.platform;

      if (!platformToRestore) {
        results.failed++;
        results.details.push({
          postId: post._id.toString(),
          error: 'No platform to restore',
          success: false
        });
        continue;
      }

      const updateDoc = {
        $unset: {
          platforms: '',
          platformStatus: ''
        }
      };

      // Only restore platform if it was different
      if (post.platform !== platformToRestore) {
        updateDoc.$set = { platform: platformToRestore };
      }

      if (!dryRun) {
        await collection.updateOne(
          { _id: post._id },
          updateDoc
        );
      }

      results.success++;
      results.details.push({
        postId: post._id.toString(),
        restoredPlatform: platformToRestore,
        success: true
      });

      logger.debug('Rolled back post', {
        postId: post._id.toString(),
        platform: platformToRestore
      });

    } catch (error) {
      results.failed++;
      results.details.push({
        postId: post._id.toString(),
        error: error.message,
        success: false
      });
      logger.error('Failed to rollback post', {
        postId: post._id.toString(),
        error: error.message
      });
    }
  }

  logger.info('Rollback complete', {
    dryRun,
    total: results.total,
    success: results.success,
    failed: results.failed
  });

  return results;
}

/**
 * Validate migration status
 * Checks if all posts have been migrated successfully
 * @returns {Promise<Object>} Validation results
 */
export async function validate() {
  logger.info('Validating multi-platform posts migration');

  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection not available');
  }

  const collection = mongoose.connection.collection('marketing_posts');

  // Check for posts that still need migration
  const needsMigration = await collection.countDocuments({
    platform: { $exists: true, $ne: null },
    platforms: { $exists: false }
  });

  // Check for posts with platforms but no platformStatus
  const missingPlatformStatus = await collection.countDocuments({
    platforms: { $exists: true, $ne: null },
    platformStatus: { $exists: false }
  });

  // Check for multi-platform posts (more than one platform)
  const multiPlatformPosts = await collection.countDocuments({
    platforms: { $exists: true, $ne: null },
    platforms: { $size: 2 }
  });

  // Total post count
  const totalPosts = await collection.countDocuments();

  return {
    valid: needsMigration === 0 && missingPlatformStatus === 0,
    needsMigration,
    missingPlatformStatus,
    multiPlatformPosts,
    totalPosts,
    percentage: totalPosts > 0 ? ((totalPosts - needsMigration) / totalPosts * 100).toFixed(2) : 0
  };
}

export default {
  run,
  rollback,
  validate
};
