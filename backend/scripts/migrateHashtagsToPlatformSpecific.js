/**
 * Migration Script: Platform-Specific Hashtags
 *
 * Migrates existing MarketingPost documents from a flat hashtags array
 * to a platform-specific object structure.
 *
 * Before:
 *   hashtags: ['#booktok', '#reading', ...]
 *
 * After:
 *   hashtags: {
 *     tiktok: ['#booktok', '#reading', ...],
 *     instagram: [],
 *     youtube_shorts: []
 *   }
 *
 * Usage:
 *   node backend/scripts/migrateHashtagsToPlatformSpecific.js
 */

import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';
import MarketingPost from '../models/MarketingPost.js';
import configService from '../services/config.js';

const logger = getLogger('migration', 'hashtags-migration');

/**
 * Check if a post has the old hashtags structure
 * @param {MarketingPost} post - The post to check
 * @returns {boolean} True if post has old structure
 */
function hasOldHashtagsStructure(post) {
  if (!post.hashtags) return false;

  // If hashtags is an array, it's the old structure
  return Array.isArray(post.hashtags);
}

/**
 * Migrate a single post to platform-specific hashtags
 * @param {MarketingPost} post - The post to migrate
 * @returns {boolean} True if migration was performed
 */
function migratePost(post) {
  if (!hasOldHashtagsStructure(post)) {
    return false;
  }

  const oldHashtags = post.hashtags;

  // Create new platform-specific structure
  // All existing posts are TikTok posts (historically)
  post.hashtags = {
    tiktok: oldHashtags,
    instagram: [],
    youtube_shorts: []
  };

  return true;
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('='.repeat(60));
  console.log('Starting Platform-Specific Hashtags Migration');
  console.log('='.repeat(60));

  try {
    // Validate config
    const configValidation = configService.validate();
    if (!configValidation.valid) {
      throw new Error('Invalid configuration. Please check environment variables.');
    }

    // Connect to MongoDB
    console.log('\n1. Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('   ✓ Connected to MongoDB');

    // Count total posts
    console.log('\n2. Counting total posts...');
    const totalCount = await MarketingPost.countDocuments();
    console.log(`   Found ${totalCount} total posts`);

    // Find posts with old hashtags structure
    console.log('\n3. Finding posts with old hashtags structure...');
    const postsToMigrate = await MarketingPost.find({});
    const postsNeedingMigration = postsToMigrate.filter(hasOldHashtagsStructure);
    console.log(`   Found ${postsNeedingMigration.length} posts needing migration`);

    if (postsNeedingMigration.length === 0) {
      console.log('\n✓ No posts need migration. All posts already have platform-specific hashtags.');
      await mongoose.disconnect();
      return;
    }

    // Perform migration
    console.log('\n4. Migrating posts...');
    let migratedCount = 0;
    let failedCount = 0;

    for (const post of postsNeedingMigration) {
      try {
        const wasMigrated = migratePost(post);

        if (wasMigrated) {
          await post.save();
          migratedCount++;

          if (migratedCount % 100 === 0) {
            console.log(`   Migrated ${migratedCount}/${postsNeedingMigration.length} posts...`);
          }
        }
      } catch (error) {
        failedCount++;
        logger.error(`Failed to migrate post ${post._id}`, {
          error: error.message,
        });
        console.error(`   ✗ Failed to migrate post ${post._id}: ${error.message}`);
      }
    }

    console.log(`\n   ✓ Migrated ${migratedCount} posts`);

    if (failedCount > 0) {
      console.log(`   ✗ ${failedCount} posts failed to migrate`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total posts:          ${totalCount}`);
    console.log(`Posts needing migration: ${postsNeedingMigration.length}`);
    console.log(`Successfully migrated:   ${migratedCount}`);
    console.log(`Failed migrations:      ${failedCount}`);
    console.log('='.repeat(60));

    if (failedCount === 0) {
      console.log('\n✓ Migration completed successfully!');
    } else {
      console.log('\n⚠ Migration completed with some failures. Check logs for details.');
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    logger.error('Migration failed', {
      error: error.message,
      stack: error.stack,
    });

    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration if called directly
// Cross-platform check that works on Windows, Linux, and macOS
const modulePath = import.meta.url;
// Normalize Windows paths and handle file:// protocol
const scriptPath = process.argv[1].replace(/\\/g, '/');
const isMainModule = modulePath.endsWith(scriptPath) ||
                     modulePath === `file:///${scriptPath.replace(/^\//, '')}` ||
                     modulePath.includes(scriptPath);

if (isMainModule) {
  runMigration()
    .then(() => {
      console.log('\nMigration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}

export { runMigration };
