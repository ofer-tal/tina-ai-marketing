/**
 * Migration: Migrate to Per-Platform Metrics
 *
 * This script migrates existing aggregate performanceMetrics to per-platform
 * metrics stored in platformStatus. This enables tracking separate metrics
 * for each platform when a post is published to multiple platforms.
 */

import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('migrations', 'per-platform-metrics');

/**
 * Validate migration status
 */
export async function validate() {
  const collection = mongoose.connection.collection('marketing_posts');

  // Get posts with metrics but no per-platform metrics
  const postsWithAggregateMetricsOnly = await collection.find({
    performanceMetrics: { $exists: true },
    $or: [
      { 'performanceMetrics.views': { $gt: 0 } },
      { 'performanceMetrics.likes': { $gt: 0 } }
    ]
  }).toArray();

  // Count how many have per-platform metrics already
  let withPerPlatformMetrics = 0;
  for (const post of postsWithAggregateMetricsOnly) {
    if (post.platformStatus) {
      const hasPerPlatform = Object.values(post.platformStatus).some(
        p => p?.performanceMetrics && (p.performanceMetrics.views > 0 || p.performanceMetrics.likes > 0)
      );
      if (hasPerPlatform) withPerPlatformMetrics++;
    }
  }

  const needsMigration = postsWithAggregateMetricsOnly.length - withPerPlatformMetrics;

  return {
    valid: needsMigration === 0,
    needsMigration,
    withPerPlatformMetrics,
    totalPostsWithMetrics: postsWithAggregateMetricsOnly.length,
    percentage: postsWithAggregateMetricsOnly.length > 0
      ? Math.round((withPerPlatformMetrics / postsWithAggregateMetricsOnly.length) * 100)
      : 100
  };
}

/**
 * Migrate a single post to per-platform metrics
 */
async function migratePost(collection, post) {
  try {
    // Skip if already migrated (has platformStatus with performanceMetrics)
    const alreadyMigrated = post.platformStatus &&
      Object.values(post.platformStatus).some(p => p?.performanceMetrics);

    if (alreadyMigrated) {
      return { success: true, skipped: true, postId: post._id, reason: 'already migrated' };
    }

    // Determine which platform(s) this post targets
    const platforms = post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0
      ? post.platforms
      : post.platform ? [post.platform] : [];

    if (platforms.length === 0) {
      return { success: true, skipped: true, postId: post._id, reason: 'no platforms' };
    }

    // Get the aggregate metrics
    const aggregateMetrics = post.performanceMetrics || {};

    // If no metrics, skip
    if (!aggregateMetrics.views && !aggregateMetrics.likes) {
      return { success: true, skipped: true, postId: post._id, reason: 'no metrics' };
    }

    // Find which platforms have been posted (check platformStatus)
    const platformsToMigrate = [];
    for (const platform of platforms) {
      const platformData = post.platformStatus?.[platform];
      if (platformData && platformData.status === 'posted') {
        platformsToMigrate.push(platform);
      }
    }

    // If no platforms have platformStatus, use the legacy platform field
    if (platformsToMigrate.length === 0 && post.platform) {
      platformsToMigrate.push(post.platform);
    }

    // If still no platforms, skip
    if (platformsToMigrate.length === 0) {
      return { success: true, skipped: true, postId: post._id, reason: 'no posted platforms' };
    }

    // Assign metrics to the first posted platform
    // (we can't know which platform contributed to aggregate metrics historically)
    const targetPlatform = platformsToMigrate[0];

    const updates = {
      [`platformStatus.${targetPlatform}.performanceMetrics`]: {
        views: aggregateMetrics.views || 0,
        likes: aggregateMetrics.likes || 0,
        comments: aggregateMetrics.comments || 0,
        shares: aggregateMetrics.shares || 0,
        saved: aggregateMetrics.saved || 0,
        reach: aggregateMetrics.reach || 0,
        engagementRate: aggregateMetrics.engagementRate || 0
      }
    };

    if (post.metricsLastFetchedAt) {
      updates[`platformStatus.${targetPlatform}.lastFetchedAt`] = post.metricsLastFetchedAt;
    }

    // Update the post
    await collection.updateOne({ _id: post._id }, { $set: updates });

    return {
      success: true,
      migrated: true,
      postId: post._id,
      platform: targetPlatform,
      views: aggregateMetrics.views,
      likes: aggregateMetrics.likes
    };

  } catch (error) {
    logger.error(`Failed to migrate post ${post._id}`, { error: error.message });
    return { success: false, failed: true, postId: post._id, error: error.message };
  }
}

/**
 * Run the migration
 * @param {Object} options - Migration options
 * @param {boolean} options.dryRun - If true, don't actually update documents
 * @returns {Promise<Object>} Migration results
 */
export async function run(options = {}) {
  const { dryRun = false } = options;

  logger.info('Starting per-platform metrics migration', { dryRun });

  const collection = mongoose.connection.collection('marketing_posts');

  // Find all posts with performanceMetrics
  const postsWithMetrics = await collection.find({
    performanceMetrics: { $exists: true },
    $or: [
      { 'performanceMetrics.views': { $gt: 0 } },
      { 'performanceMetrics.likes': { $gt: 0 } }
    ]
  }).toArray();

  logger.info('Found posts with metrics', { count: postsWithMetrics.length });

  const results = {
    total: postsWithMetrics.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (const post of postsWithMetrics) {
    const result = await migratePost(collection, post);
    results.details.push(result);

    if (result.migrated) {
      results.success++;
      logger.info(`Migrated post ${post._id}`, {
        platform: result.platform,
        views: result.views,
        likes: result.likes
      });
    } else if (result.failed) {
      results.failed++;
    } else {
      results.skipped++;
    }
  }

  logger.info('Migration complete', results);

  return results;
}

export default { run, validate };
