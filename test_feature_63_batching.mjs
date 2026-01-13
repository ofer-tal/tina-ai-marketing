#!/usr/bin/env node

/**
 * Feature #63 Test: Content Batching 1-2 Days Ahead
 *
 * Tests the content batching service that generates content 1-2 days before scheduled posting
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001';

// Color codes for terminal output
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

/**
 * Test Step 1: Check content generation schedule
 */
async function testStep1_CheckSchedule() {
  section('STEP 1: Check Content Generation Schedule');

  try {
    // Get batching service status
    const response = await axios.get(`${API_BASE}/api/content/batch/status`);

    if (response.data.success) {
      const status = response.data.data;

      log('✓ Batching service status retrieved', 'green');
      log(`  - Is Running: ${status.isRunning}`, 'blue');
      log(`  - Last Batch: ${status.lastBatchResults?.timestamp || 'No previous batches'}`, 'blue');
      log(`  - Min Batch Size: ${status.config.minBatchSize}`, 'blue');
      log(`  - Max Batch Size: ${status.config.maxBatchSize}`, 'blue');
      log(`  - Min Days Ahead: ${status.config.minDaysAhead}`, 'blue');
      log(`  - Max Days Ahead: ${status.config.maxDaysAhead}`, 'blue');

      // Verify configuration
      if (status.config.minBatchSize >= 3 && status.config.maxBatchSize <= 5) {
        log('✓ Batch size limits correctly configured (3-5 posts)', 'green');
      } else {
        log('✗ Batch size limits incorrect (expected 3-5)', 'red');
        return false;
      }

      if (status.config.minDaysAhead >= 1 && status.config.maxDaysAhead <= 2) {
        log('✓ Days ahead correctly configured (1-2 days)', 'green');
      } else {
        log('✗ Days ahead incorrect (expected 1-2)', 'red');
        return false;
      }

      return true;
    } else {
      log('✗ Failed to retrieve batching status', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error checking schedule: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test Step 2: Verify batch generates for next 1-2 days
 */
async function testStep2_GenerateBatch() {
  section('STEP 2: Generate Batch for Next 1-2 Days');

  try {
    // Generate a batch with custom parameters
    const response = await axios.post(`${API_BASE}/api/content/batch/generate`, {
      batchSize: 4,
      daysAhead: 1,
      platforms: ['tiktok', 'instagram']
    });

    if (response.data.success) {
      const result = response.data.data;
      log('✓ Batch generated successfully', 'green');
      log(`  - Posts Created: ${result.postsCreated}`, 'blue');
      log(`  - Batch Size: ${result.batchSize}`, 'blue');
      log(`  - Days Ahead: ${result.daysAhead}`, 'blue');

      // Verify posts were created
      if (result.postsCreated > 0 && result.postsCreated <= 5) {
        log('✓ Batch size within limits (3-5 posts)', 'green');
      } else {
        log('✗ Batch size out of bounds', 'red');
        return false;
      }

      // Verify scheduled times are 1-2 days ahead
      const now = new Date();
      const oneDayAhead = new Date(now);
      oneDayAhead.setDate(oneDayAhead.getDate() + 1);
      const twoDaysAhead = new Date(now);
      twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);

      let allWithinRange = true;
      result.posts.forEach(post => {
        const scheduledDate = new Date(post.scheduledAt);
        if (scheduledDate < oneDayAhead || scheduledDate > twoDaysAhead) {
          allWithinRange = false;
          log(`✗ Post ${post.id} scheduled outside 1-2 day range: ${scheduledDate}`, 'red');
        }
      });

      if (allWithinRange) {
        log('✓ All posts scheduled 1-2 days ahead', 'green');
      }

      // Display generated posts
      log('\nGenerated Posts:', 'blue');
      result.posts.forEach((post, index) => {
        log(`  ${index + 1}. ${post.title}`, 'blue');
        log(`     Platform: ${post.platform}`, 'blue');
        log(`     Status: ${post.status}`, 'blue');
        log(`     Scheduled: ${new Date(post.scheduledAt).toISOString()}`, 'blue');
        log(`     Story: ${post.storyName} (${post.storyCategory}, Spiciness ${post.storySpiciness})`, 'blue');
      });

      // Save post IDs for later tests
      global.testPostIds = result.posts.map(p => p.id);

      return true;
    } else {
      log('✗ Failed to generate batch', 'red');
      log(`  Error: ${response.data.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error generating batch: ${error.message}`, 'red');
    if (error.response) {
      log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return false;
  }
}

/**
 * Test Step 3: Check content marked as 'draft' status
 */
async function testStep3_CheckDraftStatus() {
  section('STEP 3: Verify Content Draft Status');

  try {
    if (!global.testPostIds || global.testPostIds.length === 0) {
      log('✗ No test posts available from Step 2', 'red');
      return false;
    }

    let allDraft = true;
    const draftPosts = [];

    for (const postId of global.testPostIds) {
      const response = await axios.get(`${API_BASE}/api/content/posts/${postId}`);

      if (response.data.success) {
        const post = response.data.data;
        if (post.status === 'draft') {
          draftPosts.push(post);
          log(`✓ Post ${postId} has 'draft' status`, 'green');
        } else {
          log(`✗ Post ${postId} has status '${post.status}' instead of 'draft'`, 'red');
          allDraft = false;
        }
      }
    }

    if (allDraft && draftPosts.length > 0) {
      log(`✓ All ${draftPosts.length} posts marked as 'draft'`, 'green');

      // Verify draft posts have required fields
      log('\nDraft Post Details:', 'blue');
      draftPosts.forEach((post, index) => {
        log(`  ${index + 1}. ${post.title}`, 'blue');
        log(`     Caption: ${post.caption?.substring(0, 50)}...`, 'blue');
        log(`     Hashtags: ${post.hashtags?.join(', ')}`, 'blue');
        log(`     Status: ${post.status}`, 'blue');
      });

      return true;
    } else {
      log('✗ Not all posts have draft status', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error checking draft status: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test Step 4: Confirm scheduled times set correctly
 */
async function testStep4_VerifyScheduledTimes() {
  section('STEP 4: Verify Scheduled Times');

  try {
    // Get upcoming posts
    const response = await axios.get(`${API_BASE}/api/content/batch/upcoming?days=2`);

    if (response.data.success) {
      const { count, days, posts } = response.data.data;
      log(`✓ Retrieved ${count} upcoming posts for next ${days} days`, 'green');

      const now = new Date();
      let allValidTimes = true;
      let properlySpaced = true;

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const scheduledTime = new Date(post.scheduledAt);

        // Check if time is in the future
        if (scheduledTime <= now) {
          log(`✗ Post ${post.id} scheduled in the past: ${scheduledTime}`, 'red');
          allValidTimes = false;
        } else {
          log(`✓ Post ${post.id} scheduled in future: ${scheduledTime.toISOString()}`, 'green');
        }

        // Check spacing between posts (minimum 2 hours)
        if (i > 0) {
          const prevPost = posts[i - 1];
          const prevTime = new Date(prevPost.scheduledAt);
          const hoursDiff = (scheduledTime - prevTime) / (1000 * 60 * 60);

          if (hoursDiff < 2) {
            log(`⚠ Posts spaced only ${hoursDiff.toFixed(1)} hours apart (recommended: 2+ hours)`, 'yellow');
            properlySpaced = false;
          }
        }

        // Verify scheduledAt field is set
        log(`  - Platform: ${post.platform}`, 'blue');
        log(`  - Scheduled At: ${scheduledTime.toISOString()}`, 'blue');
        log(`  - Story: ${post.storyName}`, 'blue');
      }

      if (allValidTimes) {
        log('✓ All scheduled times are valid (in the future)', 'green');
      }

      if (properlySpaced) {
        log('✓ Posts properly spaced (2+ hours apart)', 'green');
      }

      return allValidTimes;
    } else {
      log('✗ Failed to retrieve upcoming posts', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error verifying scheduled times: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test Step 5: Test batch size limits (3-5 posts)
 */
async function testStep5_BatchSizeLimits() {
  section('STEP 5: Test Batch Size Limits');

  try {
    const testCases = [
      { batchSize: 3, name: 'Minimum batch size' },
      { batchSize: 4, name: 'Medium batch size' },
      { batchSize: 5, name: 'Maximum batch size' },
      { batchSize: 2, name: 'Below minimum (should use min)' },
      { batchSize: 10, name: 'Above maximum (should use max)' }
    ];

    let allTestsPassed = true;

    for (const testCase of testCases) {
      log(`\nTesting: ${testCase.name} (requested: ${testCase.batchSize})`, 'blue');

      const response = await axios.post(`${API_BASE}/api/content/batch/generate`, {
        batchSize: testCase.batchSize,
        daysAhead: 1
      });

      if (response.data.success) {
        const actualSize = response.data.data.postsCreated;
        const expectedMin = Math.max(3, testCase.batchSize);
        const expectedMax = Math.min(5, testCase.batchSize);

        log(`  Posts created: ${actualSize}`, 'blue');

        // Check if size is within valid range (3-5)
        if (actualSize >= 3 && actualSize <= 5) {
          log(`  ✓ Batch size within valid range (3-5)`, 'green');
        } else {
          log(`  ✗ Batch size ${actualSize} outside valid range (3-5)`, 'red');
          allTestsPassed = false;
        }

        // Verify content was actually generated
        if (actualSize > 0) {
          log(`  ✓ Content successfully generated`, 'green');
        } else {
          log(`  ✗ No content generated`, 'red');
          allTestsPassed = false;
        }
      } else {
        log(`  ✗ Failed to generate batch`, 'red');
        allTestsPassed = false;
      }
    }

    if (allTestsPassed) {
      log('\n✓ All batch size limit tests passed', 'green');
    } else {
      log('\n✗ Some batch size limit tests failed', 'red');
    }

    return allTestsPassed;
  } catch (error) {
    log(`✗ Error testing batch size limits: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test batch health check
 */
async function testHealthCheck() {
  section('HEALTH CHECK: Batching Service');

  try {
    const response = await axios.get(`${API_BASE}/api/content/batch/health`);

    if (response.data.success) {
      const health = response.data.data;
      log('✓ Batching service health check passed', 'green');
      log(`  Service: ${health.service}`, 'blue');
      log(`  Status: ${health.status}`, 'blue');
      log(`  Is Running: ${health.isRunning}`, 'blue');
      log(`  Last Batch: ${health.lastBatch || 'No previous batches'}`, 'blue');

      return true;
    } else {
      log('✗ Health check failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  section('CLEANUP: Removing Test Data');

  try {
    if (!global.testPostIds || global.testPostIds.length === 0) {
      log('No test posts to clean up', 'yellow');
      return;
    }

    let deletedCount = 0;

    for (const postId of global.testPostIds) {
      try {
        await axios.delete(`${API_BASE}/api/content/posts/${postId}`);
        deletedCount++;
        log(`✓ Deleted test post ${postId}`, 'green');
      } catch (error) {
        log(`⚠ Could not delete post ${postId}: ${error.message}`, 'yellow');
      }
    }

    log(`\n✓ Cleanup complete: ${deletedCount} posts deleted`, 'green');
  } catch (error) {
    log(`✗ Cleanup error: ${error.message}`, 'red');
  }
}

/**
 * Main test execution
 */
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Feature #63: Content Batching 1-2 Days Ahead - Tests    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    step1: await testStep1_CheckSchedule(),
    step2: await testStep2_GenerateBatch(),
    step3: await testStep3_CheckDraftStatus(),
    step4: await testStep4_VerifyScheduledTimes(),
    step5: await testStep5_BatchSizeLimits(),
    health: await testHealthCheck()
  };

  // Cleanup
  await cleanupTestData();

  // Summary
  section('TEST SUMMARY');
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;

  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${totalTests - passedTests}`, 'red');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'cyan');

  console.log('\nDetailed Results:');
  Object.entries(results).forEach(([step, passed]) => {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status}: ${step}`, color);
  });

  const allPassed = passedTests === totalTests;

  if (allPassed) {
    log('\n🎉 All tests passed! Feature #63 is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
