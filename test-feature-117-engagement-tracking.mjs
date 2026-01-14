/**
 * Test Feature #117: Engagement Tracking
 *
 * Verifies that engagement metrics are tracked and displayed correctly
 * using REAL data from MongoDB (no mock data)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MarketingPost from './backend/models/MarketingPost.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🧪 Feature #117 Test: Engagement Tracking\n');
console.log('=' .repeat(60));

// Test helper functions
function printStep(stepNum, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP ${stepNum}: ${description}`);
  console.log(`${'='.repeat(60)}`);
}

function printPass(testName) {
  console.log(`  ✅ PASS: ${testName}`);
}

function printFail(testName, reason) {
  console.log(`  ❌ FAIL: ${testName}`);
  console.log(`     Reason: ${reason}`);
}

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // ========================================================================
    // Step 1: Verify retrieve metrics from platform API
    // ========================================================================
    printStep(1, 'Verify metrics can be retrieved from platform API');

    // Find a post with platform video ID (simulates API retrieval)
    const postedPost = await MarketingPost.findOne({
      status: 'posted',
      platform: 'tiktok',
      'performanceMetrics.views': { $gt: 0 }
    });

    if (postedPost) {
      printPass('Found posted post with metrics');
      console.log(`     Post ID: ${postedPost._id}`);
      console.log(`     Platform: ${postedPost.platform}`);
      console.log(`     TikTok Video ID: ${postedPost.tiktokVideoId || 'N/A'}`);
      console.log(`     Views: ${postedPost.performanceMetrics?.views || 0}`);
    } else {
      printFail('No posted post with metrics found', 'Need to create test data');
    }

    // ========================================================================
    // Step 2: Verify parse views, likes, comments, shares
    // ========================================================================
    printStep(2, 'Verify metrics are parsed and stored correctly');

    const postsWithMetrics = await MarketingPost.find({
      'performanceMetrics.views': { $exists: true }
    }).limit(5);

    if (postsWithMetrics.length > 0) {
      printPass(`Found ${postsWithMetrics.length} posts with performance metrics`);

      postsWithMetrics.forEach(post => {
        const metrics = post.performanceMetrics || {};
        console.log(`     Post ${post._id}:`);
        console.log(`       - Views: ${metrics.views || 0}`);
        console.log(`       - Likes: ${metrics.likes || 0}`);
        console.log(`       - Comments: ${metrics.comments || 0}`);
        console.log(`       - Shares: ${metrics.shares || 0}`);
      });
    } else {
      printFail('No posts with performance metrics found', 'Metrics not stored');
    }

    // ========================================================================
    // Step 3: Verify store in marketing_posts collection
    // ========================================================================
    printStep(3, 'Verify metrics are stored in marketing_posts collection');

    // Check collection exists and has metrics
    const collectionStats = await mongoose.connection.db.collection('marketing_posts').aggregate([
      {
        $match: {
          'performanceMetrics.views': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$performanceMetrics.views' },
          totalLikes: { $sum: '$performanceMetrics.likes' },
          totalComments: { $sum: '$performanceMetrics.comments' },
          totalShares: { $sum: '$performanceMetrics.shares' }
        }
      }
    ]).toArray();

    if (collectionStats.length > 0) {
      const stats = collectionStats[0];
      printPass('Metrics stored in marketing_posts collection');
      console.log(`     Total Posts with Metrics: ${stats.totalPosts}`);
      console.log(`     Total Views: ${stats.totalViews}`);
      console.log(`     Total Likes: ${stats.totalLikes}`);
      console.log(`     Total Comments: ${stats.totalComments}`);
      console.log(`     Total Shares: ${stats.totalShares}`);
    } else {
      printFail('No metrics found in collection', 'No data stored');
    }

    // ========================================================================
    // Step 4: Verify calculate engagement rate
    // ========================================================================
    printStep(4, 'Verify engagement rate is calculated correctly');

    const postWithEngagement = await MarketingPost.findOne({
      'performanceMetrics.engagementRate': { $exists: true, $ne: null }
    });

    if (postWithEngagement) {
      const metrics = postWithEngagement.performanceMetrics || {};
      const expectedRate = metrics.views > 0
        ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.views) * 100
        : 0;
      const actualRate = metrics.engagementRate || 0;

      // Allow small floating point differences
      if (Math.abs(expectedRate - actualRate) < 0.01) {
        printPass('Engagement rate calculated correctly');
        console.log(`     Post ID: ${postWithEngagement._id}`);
        console.log(`     Expected Rate: ${expectedRate.toFixed(2)}%`);
        console.log(`     Actual Rate: ${actualRate.toFixed(2)}%`);
      } else {
        printFail('Engagement rate mismatch', `Expected ${expectedRate.toFixed(2)}%, got ${actualRate.toFixed(2)}%`);
      }
    } else {
      printFail('No post with engagement rate found', 'Engagement rate not calculated');
    }

    // ========================================================================
    // Step 5: Verify display in dashboard and library
    // ========================================================================
    printStep(5, 'Verify engagement data is available via API endpoints');

    // Test /api/dashboard/engagement endpoint
    const engagementResponse = await fetch('http://localhost:3006/api/dashboard/engagement?period=24h');
    const engagementData = await engagementResponse.json();

    if (engagementData && engagementData.aggregate) {
      printPass('Dashboard engagement API returns real data');

      // Check if data looks like real data (not mock patterns)
      const hasRealPosts = engagementData.aggregate.totalPosts > 0;
      const hasRealMetrics = engagementData.aggregate.totalViews > 0;

      // Mock data would have perfect round numbers or specific patterns
      const views = engagementData.aggregate.totalViews;
      const likes = engagementData.aggregate.totalLikes;
      const isSuspicious = views % 10000 === 0 && likes % 1000 === 0; // Mock data often uses round numbers

      if (hasRealPosts && hasRealMetrics) {
        console.log(`     Total Posts: ${engagementData.aggregate.totalPosts}`);
        console.log(`     Total Views: ${engagementData.aggregate.totalViews}`);
        console.log(`     Total Likes: ${engagementData.aggregate.totalLikes}`);
        console.log(`     Total Comments: ${engagementData.aggregate.totalComments}`);
        console.log(`     Total Shares: ${engagementData.aggregate.totalShares}`);
        console.log(`     Avg Engagement Rate: ${engagementData.aggregate.avgEngagementRate}%`);

        // Check platform breakdown
        if (engagementData.platforms && engagementData.platforms.length > 0) {
          console.log(`\n     Platform Breakdown:`);
          engagementData.platforms.forEach(platform => {
            console.log(`       - ${platform.name}: ${platform.metrics.posts} posts, ${platform.metrics.views} views`);
          });
        }

        if (isSuspicious) {
          console.log(`     ⚠️  Warning: Data looks like it could be mock (round numbers)`);
        } else {
          console.log(`     ✅ Data appears to be real (not obviously mock)`);
        }
      } else {
        printFail('No engagement data found', 'Need to post content first');
      }
    } else {
      printFail('Dashboard engagement API failed', 'Invalid response');
    }

    // ========================================================================
    // Test for Mock Data (CRITICAL)
    // ========================================================================
    printStep(6, 'Verify NO MOCK DATA is being used');

    console.log('\n  Checking for mock data patterns...');

    // 1. Check if all views are multiples of 1000 or 10000 (common in mock data)
    const allPosts = await MarketingPost.find({ status: 'posted' }).limit(20);
    let roundNumberCount = 0;

    allPosts.forEach(post => {
      const views = post.performanceMetrics?.views || 0;
      if (views > 0 && (views % 1000 === 0 || views % 10000 === 0)) {
        roundNumberCount++;
      }
    });

    const roundNumberRatio = allPosts.length > 0 ? roundNumberCount / allPosts.length : 0;

    if (roundNumberRatio > 0.8) {
      printFail('Suspicious: Many posts have round-number view counts', `${roundNumberCount}/${allPosts.length} posts have round numbers`);
    } else {
      printPass('View counts appear natural (not all round numbers)');
      console.log(`     Round number ratio: ${(roundNumberRatio * 100).toFixed(1)}%`);
    }

    // 2. Check if engagement rates are all identical (mock data pattern)
    const engagementRates = allPosts
      .map(p => p.performanceMetrics?.engagementRate || 0)
      .filter(rate => rate > 0);

    if (engagementRates.length > 0) {
      const uniqueRates = new Set(engagementRates.map(r => r.toFixed(2)));
      const uniqueRatio = uniqueRates.size / engagementRates.length;

      if (uniqueRatio < 0.3) {
        printFail('Suspicious: Low variety in engagement rates', `Only ${uniqueRates.size} unique rates for ${engagementRates.length} posts`);
      } else {
        printPass('Engagement rates have natural variety');
        console.log(`     Unique rates: ${uniqueRates.size} / ${engagementRates.length} (${(uniqueRatio * 100).toFixed(1)}%)`);
      }
    }

    // 3. Check if all posts were created at the same time (batch mock data)
    const timestamps = allPosts.map(p => p.postedAt).filter(t => t);
    if (timestamps.length > 1) {
      const timeSpans = timestamps.map((t, i) => {
        if (i === 0) return 0;
        return Math.abs(new Date(t) - new Date(timestamps[i - 1]));
      }).filter(s => s > 0);

      if (timeSpans.length > 0) {
        const avgTimeSpan = timeSpans.reduce((a, b) => a + b, 0) / timeSpans.length;
        console.log(`     Avg time between posts: ${(avgTimeSpan / 1000 / 60).toFixed(1)} minutes`);

        if (avgTimeSpan < 1000) { // Less than 1 second
          printFail('Suspicious: Posts created too close together', 'Likely batch-generated mock data');
        } else {
          printPass('Posts have natural time distribution');
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Feature #117 Test Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    testsFailed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from database');
  }
}

// Run tests
runTests().catch(console.error);
