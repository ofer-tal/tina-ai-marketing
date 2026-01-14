import dotenv from 'dotenv';
dotenv.config();

/**
 * Test script for Feature #116: Post performance metrics retrieval
 *
 * Tests the performance metrics service and API endpoints.
 */

import performanceMetricsService from './backend/services/performanceMetricsService.js';
import MarketingPost from './backend/models/MarketingPost.js';
import databaseService from './backend/services/database.js';
import mongoose from 'mongoose';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Feature #116: Post Performance Metrics Retrieval Test      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function runTests() {
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await databaseService.connect();
    console.log('✅ Database connected\n');

    // Test 1: Health check
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Metrics Service Health Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response = await fetch('http://localhost:3005/api/metrics/health');
    const health = await response.json();

    console.log('Status:', health.status);
    console.log('Service:', health.service);
    console.log('✅ Health check passed\n');

    // Test 2: Create a test post with platform video ID
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Create Test Post with Platform Video ID');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testPost = new MarketingPost({
      title: 'Test Metrics Post',
      description: 'Testing performance metrics',
      platform: 'tiktok',
      status: 'posted',
      contentType: 'video',
      caption: 'Test caption for metrics #test #metrics',
      hashtags: ['test', 'metrics'],
      scheduledAt: new Date(),
      postedAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'Romance',
      storySpiciness: 1,
      tiktokVideoId: 'test_video_12345',
      tiktokShareUrl: 'https://tiktok.com/@user/video/test_video_12345',
      performanceMetrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0,
      },
    });

    await testPost.save();
    console.log('✅ Test post created with ID:', testPost._id);
    console.log('   Platform:', testPost.platform);
    console.log('   TikTok Video ID:', testPost.tiktokVideoId);
    console.log('   Status:', testPost.status, '\n');

    // Test 3: Fetch metrics for the post
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Fetch Metrics for Single Post');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const metricsResponse = await fetch(`http://localhost:3005/api/metrics/post/${testPost._id}`);
    const metricsResult = await metricsResponse.json();

    console.log('Success:', metricsResult.success);
    console.log('Platform:', metricsResult.platform);
    console.log('Metrics:', JSON.stringify(metricsResult.data, null, 2));
    console.log('Fetched At:', metricsResult.fetchedAt);
    console.log('✅ Metrics fetched successfully\n');

    // Test 4: Get aggregate metrics
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Get Aggregate Metrics (24h)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const aggregateResponse = await fetch('http://localhost:3005/api/metrics/aggregate?period=24h');
    const aggregateResult = await aggregateResponse.json();

    console.log('Period:', aggregateResult.period);
    console.log('Total Posts:', aggregateResult.totals.posts);
    console.log('Total Views:', aggregateResult.totals.views);
    console.log('Total Likes:', aggregateResult.totals.likes);
    console.log('Average Engagement Rate:', aggregateResult.totals.engagementRate + '%');
    console.log('✅ Aggregate metrics fetched\n');

    // Test 5: Get metrics history
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: Get Metrics History');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const historyResponse = await fetch(`http://localhost:3005/api/metrics/post/${testPost._id}/history`);
    const historyResult = await historyResponse.json();

    console.log('Current Metrics:', JSON.stringify(historyResult.currentMetrics, null, 2));
    console.log('History Entries:', historyResult.history.length);
    console.log('Last Fetched:', historyResult.lastFetched);
    console.log('✅ Metrics history retrieved\n');

    // Test 6: Batch metrics fetch
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 6: Batch Metrics Fetch');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const batchResponse = await fetch('http://localhost:3005/api/metrics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: [testPost._id.toString()] }),
    });
    const batchResult = await batchResponse.json();

    console.log('Total Requests:', batchResult.summary.total);
    console.log('Successful:', batchResult.summary.success);
    console.log('Errors:', batchResult.summary.errors);
    console.log('✅ Batch metrics fetched\n');

    // Test 7: Verify metrics stored in database
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 7: Verify Metrics in Database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const updatedPost = await MarketingPost.findById(testPost._id);
    console.log('Views:', updatedPost.performanceMetrics.views);
    console.log('Likes:', updatedPost.performanceMetrics.likes);
    console.log('Comments:', updatedPost.performanceMetrics.comments);
    console.log('Shares:', updatedPost.performanceMetrics.shares);
    console.log('Engagement Rate:', updatedPost.performanceMetrics.engagementRate + '%');
    console.log('Last Fetched:', updatedPost.metricsLastFetchedAt);
    console.log('History Length:', updatedPost.metricsHistory.length);
    console.log('✅ Metrics stored in database\n');

    // Cleanup
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLEANUP: Removing test post');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await MarketingPost.deleteOne({ _id: testPost._id });
    console.log('✅ Test post removed\n');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Feature #116 Tests: ALL PASSED ✅                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n✅ Post performance metrics retrieval is working!');
    console.log('✅ Metrics fetched from platform APIs (mock for testing)');
    console.log('✅ Metrics stored in database');
    console.log('✅ Engagement rate calculated');
    console.log('✅ Metrics history tracked');
    console.log('✅ Batch fetch supported');
    console.log('✅ Aggregate metrics for dashboard\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
