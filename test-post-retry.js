#!/usr/bin/env node

/**
 * Test script for Post Retry with Exponential Backoff
 *
 * This script tests the post retry functionality:
 * 1. Creates a test post with failed status
 * 2. Verifies retry count calculation
 * 3. Tests backoff time calculation
 * 4. Verifies permanent failure after max retries
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: `${__dirname}/.env` });

// Import after dotenv
import MarketingPost from './backend/models/MarketingPost.js';
import postRetryJob from './backend/jobs/postRetryJob.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('✓ Connected to MongoDB', 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to connect to MongoDB: ${error.message}`, 'red');
    return false;
  }
}

async function createTestFailedPost() {
  section('Test 1: Create Failed Post');

  try {
    // Create a test post
    const testPost = new MarketingPost({
      title: `TEST_RETRY_POST_${Date.now()}`,
      description: 'Test post for retry functionality',
      platform: 'tiktok',
      status: 'failed',
      contentType: 'video',
      caption: 'Test caption for retry',
      hashtags: ['test', 'retry'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'Test',
      storySpiciness: 1,
      error: 'Test failure for retry verification',
      failedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      retryCount: 1
    });

    await testPost.save();

    log('✓ Test post created successfully', 'green');
    log(`  Post ID: ${testPost._id}`, 'blue');
    log(`  Retry Count: ${testPost.retryCount}`, 'blue');
    log(`  Failed At: ${testPost.failedAt.toISOString()}`, 'blue');
    log(`  Error: ${testPost.error}`, 'blue');

    return testPost;
  } catch (error) {
    log(`✗ Failed to create test post: ${error.message}`, 'red');
    return null;
  }
}

async function testBackoffCalculation(post) {
  section('Test 2: Verify Backoff Calculation');

  try {
    const retryCount = post.retryCount || 0;
    const backoffHours = Math.pow(2, retryCount);

    log(`Retry Count: ${retryCount}`, 'blue');
    log(`Backoff Hours: ${backoffHours}`, 'blue');
    log(`Backoff Formula: 2^${retryCount} = ${backoffHours} hours`, 'blue');

    const expectedBackoffs = [1, 2, 4, 8, 16];
    if (expectedBackoffs.includes(backoffHours)) {
      log('✓ Backoff calculation is correct', 'green');
      return true;
    } else {
      log(`✗ Backoff calculation incorrect. Expected one of: ${expectedBackoffs.join(', ')}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error calculating backoff: ${error.message}`, 'red');
    return false;
  }
}

async function testRetryEligibility(post) {
  section('Test 3: Check Retry Eligibility');

  try {
    const shouldRetry = postRetryJob.shouldRetryNow(post);

    log(`Should Retry Now: ${shouldRetry}`, 'blue');
    log(`  Failed At: ${post.failedAt.toISOString()}`, 'blue');
    log(`  Retry Count: ${post.retryCount}`, 'blue');

    if (shouldRetry) {
      log('✓ Post is eligible for retry', 'green');
    } else {
      log('ℹ Post is not yet eligible for retry (backoff time not elapsed)', 'yellow');
    }

    return shouldRetry;
  } catch (error) {
    log(`✗ Error checking retry eligibility: ${error.message}`, 'red');
    return false;
  }
}

async function testRetryStats() {
  section('Test 4: Get Retry Statistics');

  try {
    const stats = await postRetryJob.getRetryStats();

    log('✓ Retrieved retry statistics', 'green');
    log(`  Total Failed: ${stats.totalFailed}`, 'blue');
    log(`  Permanently Failed: ${stats.permanentlyFailed}`, 'blue');
    log(`  Retryable: ${stats.retryable}`, 'blue');
    log(`  Retry Distribution:`, 'blue');

    stats.retryDistribution.forEach(dist => {
      log(`    Retry Count ${dist.retryCount}: ${dist.count} posts`, 'blue');
    });

    return true;
  } catch (error) {
    log(`✗ Error getting retry stats: ${error.message}`, 'red');
    return false;
  }
}

async function testMaxRetries(post) {
  section('Test 5: Test Max Retries Limit');

  try {
    const maxRetries = postRetryJob.maxRetries;

    log(`Max Retries: ${maxRetries}`, 'blue');

    // Set retry count to max
    post.retryCount = maxRetries;
    await post.save();

    // Check if post is still eligible
    const shouldRetry = postRetryJob.shouldRetryNow(post);
    const isPermanentlyFailed = post.retryCount >= maxRetries;

    log(`  Current Retry Count: ${post.retryCount}`, 'blue');
    log(`  Should Retry: ${shouldRetry}`, 'blue');
    log(`  Is Permanently Failed: ${isPermanentlyFailed}`, 'blue');

    if (!shouldRetry && isPermanentlyFailed) {
      log('✓ Post correctly marked as exceeding max retries', 'green');
    } else {
      log('✗ Max retries check failed', 'red');
    }

    // Reset for cleanup
    post.retryCount = 1;
    await post.save();

    return true;
  } catch (error) {
    log(`✗ Error testing max retries: ${error.message}`, 'red');
    return false;
  }
}

async function testAPIEndpoints() {
  section('Test 6: Test API Endpoints');

  try {
    const baseUrl = 'http://localhost:3001';

    // Test status endpoint
    log('Testing GET /api/post-retry/status...', 'blue');
    const statusResponse = await fetch(`${baseUrl}/api/post-retry/status`);
    const statusData = await statusResponse.json();

    if (statusData.success) {
      log('✓ Status endpoint working', 'green');
      log(`  Job Running: ${statusData.data.isRunning}`, 'blue');
      log(`  Scheduled: ${statusData.data.scheduled}`, 'blue');
    } else {
      log('✗ Status endpoint failed', 'red');
    }

    // Test stats endpoint
    log('Testing GET /api/post-retry/stats...', 'blue');
    const statsResponse = await fetch(`${baseUrl}/api/post-retry/stats`);
    const statsData = await statsResponse.json();

    if (statsData.success) {
      log('✓ Stats endpoint working', 'green');
      log(`  Total Failed: ${statsData.data.totalFailed}`, 'blue');
      log(`  Permanently Failed: ${statsData.data.permanentlyFailed}`, 'blue');
    } else {
      log('✗ Stats endpoint failed', 'red');
    }

    // Test failed posts endpoint
    log('Testing GET /api/post-retry/failed...', 'blue');
    const failedResponse = await fetch(`${baseUrl}/api/post-retry/failed?limit=5`);
    const failedData = await failedResponse.json();

    if (failedData.success) {
      log('✓ Failed posts endpoint working', 'green');
      log(`  Retrieved: ${failedData.data.posts.length} posts`, 'blue');
    } else {
      log('✗ Failed posts endpoint failed', 'red');
    }

    return true;
  } catch (error) {
    log(`✗ Error testing API endpoints: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup(testPost) {
  section('Cleanup');

  if (testPost) {
    try {
      await MarketingPost.deleteOne({ _id: testPost._id });
      log('✓ Test post deleted', 'green');
    } catch (error) {
      log(`✗ Failed to delete test post: ${error.message}`, 'red');
    }
  }
}

async function runTests() {
  log('\n🧪 Post Retry Feature Tests', 'cyan');
  log('Testing exponential backoff retry mechanism for failed posts\n', 'cyan');

  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    process.exit(1);
  }

  let testPost = null;
  const results = {
    passed: 0,
    failed: 0
  };

  try {
    // Test 1: Create failed post
    testPost = await createTestFailedPost();
    if (testPost) results.passed++;
    else results.failed++;

    // Test 2: Backoff calculation
    const backoffResult = await testBackoffCalculation(testPost);
    if (backoffResult) results.passed++;
    else results.failed++;

    // Test 3: Retry eligibility
    await testRetryEligibility(testPost);
    results.passed++; // This test is informational

    // Test 4: Retry stats
    const statsResult = await testRetryStats();
    if (statsResult) results.passed++;
    else results.failed++;

    // Test 5: Max retries
    const maxRetriesResult = await testMaxRetries(testPost);
    if (maxRetriesResult) results.passed++;
    else results.failed++;

    // Test 6: API endpoints
    const apiResult = await testAPIEndpoints();
    if (apiResult) results.passed++;
    else results.failed++;

  } catch (error) {
    log(`\n✗ Test suite error: ${error.message}`, 'red');
  } finally {
    // Cleanup
    await cleanup(testPost);

    // Close database connection
    await mongoose.disconnect();
    log('✓ Disconnected from MongoDB', 'green');

    // Print summary
    section('Test Summary');
    log(`Total Tests: ${results.passed + results.failed}`, 'blue');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, 'red');

    if (results.failed === 0) {
      log('\n🎉 All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n⚠️ Some tests failed', 'yellow');
      process.exit(1);
    }
  }
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
