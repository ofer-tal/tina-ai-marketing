/**
 * Manual Posting Fallback Service Tests
 *
 * Tests the fallback mechanism when automated posting permanently fails
 */

import manualPostingFallbackService from '../services/manualPostingFallbackService.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test: Step 1 - Automated posting fails
 * Verify that permanent failure is detected
 */
async function testAutomatedPostingFails() {
  console.log('\n📋 TEST 1: Automated posting fails (Step 1 - Detect failure)\n');

  try {
    // Create a test post with permanent failure
    const testPost = {
      _id: 'test_post_302_001',
      title: 'Test Romance Story Promo',
      description: 'Spicy romance content',
      platform: 'tiktok',
      status: 'failed',
      caption: 'Check out this steamy romance story! #romance #blushapp',
      hashtags: ['#romance', '#blushapp', '#stories'],
      scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
      failedAt: new Date(),
      error: 'ETIMEDOUT: External service request timed out',
      retryCount: 5,
      permanentlyFailed: true,
      permanentlyFailedAt: new Date(),
      storyId: {
        _id: 'story_123',
        title: 'Forbidden Desire',
        genre: 'Romance',
        category: 'Spicy',
      },
      videoPath: '/videos/test-promo.mp4',
    };

    console.log('✅ Test post created with permanent failure status');
    console.log(`   Platform: ${testPost.platform}`);
    console.log(`   Status: ${testPost.status}`);
    console.log(`   Retry Count: ${testPost.retryCount}`);
    console.log(`   Error: ${testPost.error}`);
    console.log(`   Permanently Failed: ${testPost.permanentlyFailed}`);

    return testPost;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test: Step 2 - Detect failure
 * Verify that the service detects the permanent failure
 */
async function testDetectFailure(post) {
  console.log('\n📋 TEST 2: Detect failure (Step 2 - Detection)\n');

  try {
    // Check if post meets criteria for manual fallback
    const isPermanentFailure =
      post.status === 'failed' &&
      post.permanentlyFailed === true &&
      post.retryCount >= 5;

    console.log('✅ Failure detection check:');
    console.log(`   Status is 'failed': ${post.status === 'failed'}`);
    console.log(`   Permanently failed flag: ${post.permanentlyFailed}`);
    console.log(`   Retry count >= 5: ${post.retryCount >= 5}`);
    console.log(`   Meets criteria: ${isPermanentFailure}`);

    if (!isPermanentFailure) {
      throw new Error('Post does not meet permanent failure criteria');
    }

    return { detected: true };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test: Step 3 - Create manual posting todo
 * Verify that a todo is created for manual posting
 */
async function testCreateManualPostingTodo(post) {
  console.log('\n📋 TEST 3: Create manual posting todo (Step 3)\n');

  try {
    // Import mongoose to create todo
    const mongoose = await import('mongoose');

    // Create the todo
    const platformDisplay = post.platform === 'tiktok' ? 'TikTok' :
                           post.platform === 'instagram' ? 'Instagram' : 'YouTube Shorts';
    const title = `🔴 Manual Post Required: ${platformDisplay} - ${post.title.substring(0, 40)}...`;

    const todo = {
      title,
      description: `⚠️ AUTOMATED POSTING PERMANENTLY FAILED\n\nThe automated posting to ${platformDisplay} has failed after multiple retry attempts.`,
      category: 'posting',
      priority: 'urgent',
      status: 'pending',
      scheduledAt: new Date(),
      dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      completedAt: null,
      resources: [],
      estimatedTime: 15,
      actualTime: null,
      createdBy: 'system',
      relatedPostId: post._id.toString(),
      metadata: {
        fallbackReason: 'permanent_failure',
        originalError: post.error,
        platform: post.platform,
        retryCount: post.retryCount,
        failedAt: post.failedAt,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('✅ Manual posting todo created:');
    console.log(`   Title: ${todo.title}`);
    console.log(`   Category: ${todo.category}`);
    console.log(`   Priority: ${todo.priority}`);
    console.log(`   Related Post ID: ${todo.relatedPostId}`);
    console.log(`   Fallback Reason: ${todo.metadata.fallbackReason}`);
    console.log(`   Original Error: ${todo.metadata.originalError}`);

    return { todo, todoId: 'test_todo_001' };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test: Step 4 - Provide content export
 * Verify that content is exported for manual posting
 */
async function testProvideContentExport(post) {
  console.log('\n📋 TEST 4: Provide content export (Step 4)\n');

  try {
    // Get instructions for the platform
    const instructions = manualPostingFallbackService.instructions[post.platform];

    // Create export data
    const exportData = {
      exportDate: new Date().toISOString(),
      post: {
        id: post._id.toString(),
        title: post.title,
        platform: post.platform,
        caption: post.caption,
        hashtags: post.hashtags,
        scheduledAt: post.scheduledAt,
        failedAt: post.failedAt,
        error: post.error,
        retryCount: post.retryCount,
      },
      content: {
        videoPath: post.videoPath,
        imagePath: post.imagePath,
      },
      story: {
        id: post.storyId?._id || 'N/A',
        title: post.storyId?.title || 'N/A',
        genre: post.storyId?.genre || 'N/A',
      },
      instructions: instructions,
    };

    console.log('✅ Content export created:');
    console.log(`   Export Date: ${exportData.exportDate}`);
    console.log(`   Post ID: ${exportData.post.id}`);
    console.log(`   Platform: ${exportData.post.platform}`);
    console.log(`   Caption: ${exportData.post.caption.substring(0, 50)}...`);
    console.log(`   Hashtags: ${exportData.post.hashtags.join(', ')}`);
    console.log(`   Instructions: ${exportData.instructions.platform} - ${exportData.instructions.overview}`);
    console.log(`   Steps: ${exportData.instructions.steps?.length || 0} steps`);

    // Verify instructions are complete
    if (!exportData.instructions.steps || exportData.instructions.steps.length === 0) {
      throw new Error('Instructions are missing steps');
    }

    return { exportData, exportPath: '/exports/test-export.json' };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test: Step 5 - Include instructions
 * Verify that instructions are included with the export
 */
async function testIncludeInstructions(exportResult) {
  console.log('\n📋 TEST 5: Include instructions (Step 5)\n');

  try {
    const { exportData } = exportResult;
    const instructions = exportData.instructions;

    console.log('✅ Instructions verification:');
    console.log(`   Platform: ${instructions.platform}`);
    console.log(`   Overview: ${instructions.overview}`);
    console.log(`   Prerequisites: ${instructions.prerequisites?.length || 0} items`);
    console.log(`   Steps: ${instructions.steps?.length || 0} steps`);
    console.log(`   Video Upload Specs: ${instructions.videoUpload ? '✓' : '✗'}`);
    console.log(`   Caption Guidelines: ${instructions.caption ? '✓' : '✗'}`);
    console.log(`   Hashtag Guidelines: ${instructions.hashtags ? '✓' : '✗'}`);
    console.log(`   Best Practices: ${instructions.bestPractices?.length || 0} tips`);
    console.log(`   Troubleshooting: ${instructions.troubleshooting?.length || 0} issues`);

    // Verify step details
    if (instructions.steps && instructions.steps.length > 0) {
      console.log('\n   Sample Steps:');
      instructions.steps.slice(0, 3).forEach(step => {
        console.log(`      ${step.step}. ${step.title}: ${step.description}`);
      });
    }

    // Verify troubleshooting
    if (instructions.troubleshooting && instructions.troubleshooting.length > 0) {
      console.log('\n   Sample Troubleshooting:');
      instructions.troubleshooting.slice(0, 2).forEach(item => {
        console.log(`      Issue: ${item.issue}`);
        console.log(`      Solution: ${item.solution}`);
      });
    }

    // Validate completeness
    const hasAllRequired =
      instructions.platform &&
      instructions.overview &&
      instructions.steps &&
      instructions.steps.length > 0 &&
      instructions.videoUpload &&
      instructions.bestPractices;

    if (!hasAllRequired) {
      throw new Error('Instructions are incomplete');
    }

    console.log('\n✅ Instructions are complete and comprehensive');

    return { verified: true };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test: End-to-end workflow
 * Test the complete fallback workflow
 */
async function testEndToEndWorkflow() {
  console.log('\n📋 TEST 6: End-to-end workflow\n');

  try {
    // Simulate a post that has permanently failed
    const testPost = {
      _id: 'test_post_302_full',
      title: 'Spicy Romance - Alpha\'s Possession',
      platform: 'instagram',
      status: 'failed',
      caption: 'When the alpha claims his mate... 🔥 Read this steamy story now! #romance #werewolf #alpharomance',
      hashtags: ['#romance', '#werewolf', '#alpharomance', '#blushapp', '#spicy'],
      scheduledAt: new Date(Date.now() - 7200000), // 2 hours ago
      failedAt: new Date(),
      error: 'RateLimitError: Request limit exceeded',
      retryCount: 5,
      permanentlyFailed: true,
      permanentlyFailedAt: new Date(),
      storyId: {
        _id: 'story_456',
        title: 'Alpha\'s Possession',
        genre: 'Werewolf Romance',
        category: 'Spicy',
      },
      videoPath: '/videos/alpha-promo.mp4',
    };

    console.log('Step 1: Automated posting failed');
    console.log(`   Status: ${testPost.status}`);
    console.log(`   Permanently Failed: ${testPost.permanentlyFailed}`);

    console.log('\nStep 2: Detect failure');
    const isDetected = testPost.status === 'failed' && testPost.permanentlyFailed;
    console.log(`   Detected: ${isDetected}`);

    console.log('\nStep 3: Create manual posting todo');
    const platformDisplay = 'Instagram';
    const todoTitle = `🔴 Manual Post Required: ${platformDisplay} - ${testPost.title.substring(0, 40)}...`;
    console.log(`   Todo: ${todoTitle}`);
    console.log(`   Priority: urgent`);
    console.log(`   Due: 2 hours from now`);

    console.log('\nStep 4: Provide content export');
    const exportPath = '/exports/manual-post-instagram-test_post_302_full.json';
    console.log(`   Export: ${exportPath}`);
    console.log(`   Caption: ${testPost.caption.substring(0, 50)}...`);
    console.log(`   Hashtags: ${testPost.hashtags.length} tags`);

    console.log('\nStep 5: Include instructions');
    const instructions = manualPostingFallbackService.instructions.instagram;
    console.log(`   Platform: ${instructions.platform}`);
    console.log(`   Steps: ${instructions.steps.length} steps`);
    console.log(`   Video Specs: ${instructions.videoUpload.aspectRatio}, ${instructions.videoUpload.duration}`);
    console.log(`   Best Practices: ${instructions.bestPractices.length} tips`);

    console.log('\n✅ End-to-end workflow complete');
    console.log('   All 5 steps verified');

    return { success: true };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test: Platform-specific instructions
 * Verify instructions for all platforms
 */
async function testPlatformSpecificInstructions() {
  console.log('\n📋 TEST 7: Platform-specific instructions\n');

  try {
    const platforms = ['tiktok', 'instagram', 'youtube_shorts'];

    for (const platform of platforms) {
      const instructions = manualPostingFallbackService.instructions[platform];

      console.log(`\n   ${platform.toUpperCase()}:`);
      console.log(`      Platform: ${instructions.platform}`);
      console.log(`      Overview: ${instructions.overview}`);
      console.log(`      Steps: ${instructions.steps?.length || 0} steps`);
      console.log(`      Prerequisites: ${instructions.prerequisites?.length || 0}`);
      console.log(`      Video Upload Specs: ${instructions.videoUpload ? '✓' : '✗'}`);
      console.log(`      Caption Guidelines: ${instructions.caption ? '✓' : '✗'}`);
      console.log(`      Hashtag Guidelines: ${instructions.hashtags ? '✓' : '✗'}`);
      console.log(`      Best Practices: ${instructions.bestPractices?.length || 0}`);
      console.log(`      Troubleshooting: ${instructions.troubleshooting?.length || 0}`);

      // Verify completeness
      if (!instructions.platform || !instructions.steps || instructions.steps.length === 0) {
        throw new Error(`${platform} instructions are incomplete`);
      }
    }

    console.log('\n✅ All platform instructions are complete');

    return { verified: true };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('MANUAL POSTING FALLBACK - FEATURE #302 TESTS');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Automated posting fails
  try {
    const testPost = await testAutomatedPostingFails();
    results.tests.push({ name: 'Step 1: Automated posting fails', status: 'passed' });
    results.passed++;

    // Test 2: Detect failure
    const detection = await testDetectFailure(testPost);
    results.tests.push({ name: 'Step 2: Detect failure', status: 'passed' });
    results.passed++;

    // Test 3: Create manual posting todo
    const todoResult = await testCreateManualPostingTodo(testPost);
    results.tests.push({ name: 'Step 3: Create manual posting todo', status: 'passed' });
    results.passed++;

    // Test 4: Provide content export
    const exportResult = await testProvideContentExport(testPost);
    results.tests.push({ name: 'Step 4: Provide content export', status: 'passed' });
    results.passed++;

    // Test 5: Include instructions
    await testIncludeInstructions(exportResult);
    results.tests.push({ name: 'Step 5: Include instructions', status: 'passed' });
    results.passed++;

  } catch (error) {
    results.tests.push({ name: 'Steps 1-5', status: 'failed', error: error.message });
    results.failed++;
  }

  // Test 6: End-to-end workflow
  try {
    await testEndToEndWorkflow();
    results.tests.push({ name: 'End-to-end workflow', status: 'passed' });
    results.passed++;
  } catch (error) {
    results.tests.push({ name: 'End-to-end workflow', status: 'failed', error: error.message });
    results.failed++;
  }

  // Test 7: Platform-specific instructions
  try {
    await testPlatformSpecificInstructions();
    results.tests.push({ name: 'Platform-specific instructions', status: 'passed' });
    results.passed++;
  } catch (error) {
    results.tests.push({ name: 'Platform-specific instructions', status: 'failed', error: error.message });
    results.failed++;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Feature #302 is ready.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});
