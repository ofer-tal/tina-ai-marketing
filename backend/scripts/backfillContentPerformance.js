#!/usr/bin/env node

/**
 * Content Performance Back-fill Script
 *
 * Updates performance metrics for existing marketing posts by fetching
 * current metrics from social platform APIs
 *
 * Run: node backend/scripts/backfillContentPerformance.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

console.log(`Loading .env from: ${envPath}`);

// Dynamic imports after env is loaded
const { default: databaseService } = await import('../services/database.js');
const { default: MarketingPost } = await import('../models/MarketingPost.js');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`  ✓ ${message}`, 'green');
}

function error(message) {
  log(`  ✗ ${message}`, 'red');
}

function info(message) {
  log(`  → ${message}`, 'cyan');
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

/**
 * Main back-fill function
 */
async function runBackfill() {
  log('Content Performance Back-fill Script', 'bright');
  log('Updates performance metrics for posted content', 'cyan');

  try {
    // Connect to database
    section('Step 1: Connecting to Database');
    await databaseService.connect();
    success('Connected to database');

    // Find all posted content
    section('Step 2: Finding Posted Content');

    const allPosts = await MarketingPost.find({
      status: 'posted',
      postedAt: { $exists: true }
    });

    if (allPosts.length === 0) {
      log('No posted content found - nothing to back-fill', 'yellow');
      await databaseService.disconnect();
      return;
    }

    success(`Found ${allPosts.length} posted content items`);

    // Group by platform
    const byPlatform = {
      tiktok: allPosts.filter(p => p.platform === 'tiktok'),
      instagram: allPosts.filter(p => p.platform === 'instagram'),
      youtube_shorts: allPosts.filter(p => p.platform === 'youtube_shorts')
    };

    log('\n  Content by platform:', 'bright');
    log(`    TikTok: ${byPlatform.tiktok.length}`, 'cyan');
    log(`    Instagram: ${byPlatform.instagram.length}`, 'cyan');
    log(`    YouTube Shorts: ${byPlatform.youtube_shorts.length}`, 'cyan');

    // Update metrics for each platform
    const stats = {
      tiktok: { updated: 0, failed: 0 },
      instagram: { updated: 0, failed: 0 },
      youtube: { updated: 0, failed: 0 },
      total: 0
    };

    // TikTok metrics
    if (byPlatform.tiktok.length > 0) {
      section('Step 3: Updating TikTok Metrics');
      info('Note: TikTok API integration required for actual metrics');
      info('This script will set up the metrics structure');

      for (const post of byPlatform.tiktok) {
        try {
          // TODO: Implement actual TikTok API call
          // const metrics = await tiktokService.getVideoStats(post.externalPostId);

          // For now, just set up the metrics structure if it doesn't exist
          if (!post.metrics) {
            post.metrics = {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagementRate: 0,
              lastSyncAt: new Date()
            };
            await post.save();
          }

          stats.tiktok.updated++;
        } catch (err) {
          error(`Failed to update TikTok post ${post._id}: ${err.message}`);
          stats.tiktok.failed++;
        }
      }

      success(`Updated ${stats.tiktok.updated} TikTok posts`);
    }

    // Instagram metrics
    if (byPlatform.instagram.length > 0) {
      section('Step 4: Updating Instagram Metrics');
      info('Note: Instagram API integration required for actual metrics');

      for (const post of byPlatform.instagram) {
        try {
          // TODO: Implement actual Instagram API call
          if (!post.metrics) {
            post.metrics = {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagementRate: 0,
              lastSyncAt: new Date()
            };
            await post.save();
          }

          stats.instagram.updated++;
        } catch (err) {
          error(`Failed to update Instagram post ${post._id}: ${err.message}`);
          stats.instagram.failed++;
        }
      }

      success(`Updated ${stats.instagram.updated} Instagram posts`);
    }

    // YouTube metrics
    if (byPlatform.youtube_shorts.length > 0) {
      section('Step 5: Updating YouTube Metrics');
      info('Note: YouTube API integration required for actual metrics');

      for (const post of byPlatform.youtube_shorts) {
        try {
          // TODO: Implement actual YouTube API call
          if (!post.metrics) {
            post.metrics = {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagementRate: 0,
              lastSyncAt: new Date()
            };
            await post.save();
          }

          stats.youtube.updated++;
        } catch (err) {
          error(`Failed to update YouTube post ${post._id}: ${err.message}`);
          stats.youtube.failed++;
        }
      }

      success(`Updated ${stats.youtube.updated} YouTube posts`);
    }

    // Calculate totals
    stats.total = stats.tiktok.updated + stats.instagram.updated + stats.youtube.updated;

    // Print summary
    section('Back-fill Summary');
    log(`Total Posts Updated: ${stats.total}`, 'cyan');
    log(`TikTok: ${stats.tiktok.updated}`, 'cyan');
    log(`Instagram: ${stats.instagram.updated}`, 'cyan');
    log(`YouTube: ${stats.youtube.updated}`, 'cyan');

    if (stats.tiktok.failed > 0 || stats.instagram.failed > 0 || stats.youtube.failed > 0) {
      log(`Failed: ${stats.tiktok.failed + stats.instagram.failed + stats.youtube.failed}`, 'yellow');
    }

    // Top performing content
    section('Step 6: Top Performing Content');
    const topPosts = await MarketingPost.find({
      status: 'posted',
      'metrics.views': { $exists: true, $gt: 0 }
    }).sort({ 'metrics.views': -1 }).limit(5);

    if (topPosts.length > 0) {
      log('\n  Top 5 Posts by Views:', 'bright');
      topPosts.forEach((post, i) => {
        log(`    ${i + 1}. ${post.title} (${post.platform})`, 'cyan');
        log(`       Views: ${post.metrics?.views?.toLocaleString() || 0}`, 'dim');
      });
    } else {
      log('No posts with view metrics yet', 'yellow');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (err) {
    error(`Back-fill failed: ${err.message}`);
    console.error(err);
    await databaseService.disconnect();
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

// Run the back-fill
runBackfill().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
