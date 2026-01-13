#!/usr/bin/env node

/**
 * Feature #61: Platform-specific content optimization for Instagram
 *
 * Test script for Instagram Reels optimization service
 *
 * Tests all 5 feature steps:
 * 1. Format video for Instagram specs
 * 2. Optimize caption for Instagram audience
 * 3. Include Instagram-specific hashtags
 * 4. Verify Reels-compatible format
 * 5. Check video duration under 90 seconds
 */

import instagramOptimizationService from './backend/services/instagramOptimizationService.js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  console.log('\n' + '='.repeat(70) + '\n');
}

// Test data
const sampleStory = {
  title: "The Billionaire's Secret",
  category: 'romance',
  spiciness: 2
};

const sampleVideo = {
  duration: 30,
  resolution: '1080x1920',
  aspectRatio: '9:16',
  format: 'mp4',
  fps: 30,
  fileSizeMB: 45
};

const sampleCaption = 'This book absolutely destroyed me in the best way possible. The chemistry between the characters was off the charts!';

// Test counter
let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName, testFn) {
  try {
    log(`\n▶ Running: ${testName}`, 'blue');
    await testFn();
    testsPassed++;
    log(`✅ PASSED: ${testName}`, 'green');
  } catch (error) {
    testsFailed++;
    log(`❌ FAILED: ${testName}`, 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

// ========================================
// TESTS
// ========================================

async function test1_GetTrendingAudio() {
  log('\n📱 Test 1: Get Instagram trending audio', 'yellow');

  const result = instagramOptimizationService.getTrendingAudio({
    limit: 5,
    category: 'all'
  });

  if (!result.success) {
    throw new Error('Failed to get trending audio');
  }

  if (!result.trending || result.trending.length === 0) {
    throw new Error('No trending audio returned');
  }

  if (result.trending.length !== 5) {
    throw new Error(`Expected 5 tracks, got ${result.trending.length}`);
  }

  log(`   ✓ Retrieved ${result.trending.length} trending tracks`, 'green');
  log(`   ✓ Top track: ${result.trending[0].title}`, 'green');
  log(`   ✓ Popularity: ${result.trending[0].popularity}`, 'green');

  // Verify all tracks have required fields
  result.trending.forEach(track => {
    if (!track.id || !track.title || typeof track.popularity !== 'number') {
      throw new Error('Track missing required fields');
    }
  });

  log('   ✓ All tracks have required fields (id, title, popularity)', 'green');
}

async function test2_ValidateVideoFormat() {
  log('\n🎬 Test 2: Validate video format for Instagram specs', 'yellow');

  const result = instagramOptimizationService.validateVideoFormat(sampleVideo);

  if (!result.success) {
    throw new Error('Validation failed');
  }

  if (!result.isValid) {
    throw new Error('Valid video marked as invalid');
  }

  log(`   ✓ Video validation passed`, 'green');
  log(`   ✓ Duration: ${sampleVideo.duration}s (valid)`, 'green');
  log(`   ✓ Resolution: ${sampleVideo.resolution} (valid)`, 'green');
  log(`   ✓ Format: ${sampleVideo.format} (valid)`, 'green');

  // Test invalid video
  const invalidVideo = {
    duration: 120, // Too long (max 90s)
    resolution: '640x480', // Wrong aspect ratio
    format: 'avi'
  };

  const invalidResult = instagramOptimizationService.validateVideoFormat(invalidVideo);

  if (invalidResult.isValid) {
    throw new Error('Invalid video marked as valid');
  }

  if (invalidResult.issues.length === 0) {
    throw new Error('No issues found for invalid video');
  }

  log(`   ✓ Invalid video correctly rejected`, 'green');
  log(`   ✓ Issues found: ${invalidResult.issues.length}`, 'green');
  invalidResult.issues.forEach(issue => {
    log(`     - ${issue}`, 'yellow');
  });
}

async function test3_OptimizeCaption() {
  log('\n✍️ Test 3: Optimize caption for Instagram audience', 'yellow');

  const result = instagramOptimizationService.optimizeCaption({
    caption: sampleCaption,
    story: sampleStory,
    spiciness: 2
  });

  if (!result.success) {
    throw new Error('Caption optimization failed');
  }

  log(`   ✓ Caption optimized successfully`, 'green');
  log(`   ✓ Original length: ${result.analysis.originalLength}`, 'green');
  log(`   ✓ Optimized length: ${result.caption.length}`, 'green');

  // Check for hooks
  if (!result.suggestedHooks || result.suggestedHooks.length === 0) {
    throw new Error('No suggested hooks provided');
  }

  log(`   ✓ Suggested hooks: ${result.suggestedHooks.length}`, 'green');
  result.suggestedHooks.forEach(hook => {
    log(`     - "${hook}"`, 'yellow');
  });

  // Check for CTAs
  if (!result.suggestedCTAs || result.suggestedCTAs.length === 0) {
    throw new Error('No suggested CTAs provided');
  }

  log(`   ✓ Suggested CTAs: ${result.suggestedCTAs.length}`, 'green');
  result.suggestedCTAs.forEach(cta => {
    log(`     - "${cta}"`, 'yellow');
  });

  // Check for best posting times
  if (!result.bestPostingTimes) {
    throw new Error('No best posting times provided');
  }

  log(`   ✓ Best posting times provided`, 'green');
  log(`     - Best: ${result.bestPostingTimes.best.join(', ')}`, 'yellow');
}

async function test4_GetInstagramHashtags() {
  log('\n#️⃣ Test 4: Get Instagram-specific hashtags', 'yellow');

  const result = instagramOptimizationService.getInstagramHashtags({
    count: 10,
    category: 'romance',
    spiciness: 2
  });

  if (!result.success) {
    throw new Error('Failed to generate hashtags');
  }

  if (!result.hashtags || result.hashtags.length === 0) {
    throw new Error('No hashtags generated');
  }

  if (result.hashtags.length !== 10) {
    throw new Error(`Expected 10 hashtags, got ${result.hashtags.length}`);
  }

  log(`   ✓ Generated ${result.hashtags.length} hashtags`, 'green');

  // Verify all hashtags start with #
  const invalidHashtags = result.hashtags.filter(tag => !tag.startsWith('#'));
  if (invalidHashtags.length > 0) {
    throw new Error(`Found hashtags without #: ${invalidHashtags.join(', ')}`);
  }

  log(`   ✓ All hashtags start with #`, 'green');

  // Show some example hashtags
  log(`   ✓ Sample hashtags:`, 'green');
  result.hashtags.slice(0, 5).forEach(tag => {
    log(`     - ${tag}`, 'yellow');
  });

  // Check recommended and optimal counts
  if (typeof result.recommended !== 'number') {
    throw new Error('Missing recommended count');
  }

  if (typeof result.optimal !== 'number') {
    throw new Error('Missing optimal count');
  }

  log(`   ✓ Recommended: ${result.recommended} hashtags`, 'green');
  log(`   ✓ Optimal: ${result.optimal} hashtags`, 'green');
  log(`   ✓ Max allowed: ${result.max} hashtags`, 'green');

  // Verify no duplicates
  const uniqueHashtags = new Set(result.hashtags);
  if (uniqueHashtags.size !== result.hashtags.length) {
    throw new Error('Found duplicate hashtags');
  }

  log(`   ✓ No duplicate hashtags`, 'green');
}

async function test5_VerifyAspectRatio() {
  log('\n📐 Test 5: Verify 9:16 aspect ratio for Reels', 'yellow');

  const validVideo = {
    width: 1080,
    height: 1920
  };

  const result = instagramOptimizationService.verifyAspectRatio(validVideo);

  if (!result.success) {
    throw new Error('Aspect ratio verification failed');
  }

  if (!result.isValid) {
    throw new Error('Valid 9:16 aspect ratio marked as invalid');
  }

  log(`   ✓ Valid 9:16 aspect ratio verified`, 'green');
  log(`   ✓ Calculated ratio: ${result.calculatedRatio}`, 'green');
  log(`   ✓ Expected ratio: ${result.expectedDecimal}`, 'green');
  log(`   ✓ Difference: ${result.difference}`, 'green');
  log(`   ✓ Is vertical: ${result.isVertical}`, 'green');
  log(`   ✓ Is exact: ${result.isExact}`, 'green');

  // Test invalid aspect ratio
  const invalidVideo = {
    width: 1920,
    height: 1080 // 16:9 horizontal
  };

  const invalidResult = instagramOptimizationService.verifyAspectRatio(invalidVideo);

  if (invalidResult.isValid) {
    throw new Error('Invalid aspect ratio marked as valid');
  }

  if (invalidResult.isVertical) {
    throw new Error('Horizontal video not detected (isVertical should be false)');
  }

  log(`   ✓ Invalid aspect ratio correctly rejected`, 'green');
  log(`   ✓ Horizontal video detected (isVertical: ${invalidResult.isVertical})`, 'green');
  log(`   ✓ Message: ${invalidResult.message}`, 'yellow');
}

async function test6_VerifyDuration() {
  log('\n⏱️ Test 6: Verify video duration under 90 seconds', 'yellow');

  const validVideo = {
    duration: 30
  };

  const result = instagramOptimizationService.verifyDuration(validVideo);

  if (!result.success) {
    throw new Error('Duration verification failed');
  }

  if (!result.isValid) {
    throw new Error('Valid duration marked as invalid');
  }

  log(`   ✓ Valid duration verified`, 'green');
  log(`   ✓ Duration: ${result.duration}s`, 'green');
  log(`   ✓ Min: ${result.minDuration}s`, 'green');
  log(`   ✓ Max: ${result.maxDuration}s`, 'green');
  log(`   ✓ Recommended: ${result.recommendedDuration}s`, 'green');

  // Test duration too long (Instagram Reels max is 90s)
  const tooLongVideo = {
    duration: 120 // 2 minutes - too long
  };

  const tooLongResult = instagramOptimizationService.verifyDuration(tooLongVideo);

  if (tooLongResult.isValid) {
    throw new Error('Duration > 90s marked as valid');
  }

  if (tooLongResult.issues.length === 0) {
    throw new Error('No issues found for video > 90s');
  }

  log(`   ✓ Duration > 90s correctly rejected`, 'green');
  log(`   ✓ Issue: ${tooLongResult.issues[0]}`, 'yellow');

  // Test duration too short
  const tooShortVideo = {
    duration: 1 // Too short
  };

  const tooShortResult = instagramOptimizationService.verifyDuration(tooShortVideo);

  if (tooShortResult.isValid) {
    throw new Error('Duration < 3s marked as valid');
  }

  log(`   ✓ Duration < 3s correctly rejected`, 'green');
}

async function test7_ComprehensiveOptimization() {
  log('\n🚀 Test 7: Comprehensive Instagram optimization', 'yellow');

  const content = {
    video: sampleVideo,
    caption: sampleCaption,
    story: sampleStory,
    spiciness: 2
  };

  const result = instagramOptimizationService.optimizeForInstagram(content);

  if (!result.success) {
    throw new Error('Comprehensive optimization failed');
  }

  log(`   ✓ Comprehensive optimization completed`, 'green');
  log(`   ✓ Steps completed: ${result.summary.stepsCompleted}`, 'green');
  log(`   ✓ Is valid: ${result.summary.isValid}`, 'green');

  // Check all optimization steps
  const steps = ['trendingAudio', 'videoFormat', 'caption', 'hashtags', 'aspectRatio', 'duration'];
  steps.forEach(step => {
    if (!result.optimizations[step]) {
      throw new Error(`Missing optimization step: ${step}`);
    }
    log(`   ✓ ${step}: completed`, 'green');
  });

  // Check recommendations
  if (!result.summary.recommendations) {
    throw new Error('No recommendations provided');
  }

  if (result.summary.recommendations.length > 0) {
    log(`   ✓ Recommendations: ${result.summary.recommendations.length}`, 'green');
    result.summary.recommendations.forEach(rec => {
      log(`     - [${rec.priority}] ${rec.message}`, 'yellow');
    });
  }
}

async function test8_HealthCheck() {
  log('\n💚 Test 8: Health check', 'yellow');

  const health = instagramOptimizationService.healthCheck();

  if (!health.success) {
    throw new Error('Health check failed');
  }

  if (health.status !== 'ok') {
    throw new Error('Service not healthy');
  }

  log(`   ✓ Service is healthy`, 'green');
  log(`   ✓ Service: ${health.service}`, 'green');
  log(`   ✓ Status: ${health.status}`, 'green');

  // Check capabilities
  if (!health.capabilities) {
    throw new Error('No capabilities reported');
  }

  log(`   ✓ Trending audio tracks: ${health.capabilities.trendingAudioTracks}`, 'green');
  log(`   ✓ Supported categories: ${health.capabilities.supportedCategories.join(', ')}`, 'green');
  log(`   ✓ Spiciness levels: ${health.capabilities.spicinessLevels.join(', ')}`, 'green');
  log(`   ✓ Max duration: ${health.capabilities.maxDuration}s`, 'green');
  log(`   ✓ Optimizations: ${health.capabilities.optimizations.length}`, 'green');
}

// ========================================
// MAIN
// ========================================

async function main() {
  separator();
  log('🌸 Feature #61: Instagram Optimization Test Suite', 'bold');
  log('Platform-specific content optimization for Instagram Reels', 'blue');
  separator();

  const tests = [
    ['Step 1: Get trending audio', test1_GetTrendingAudio],
    ['Step 2: Validate video format', test2_ValidateVideoFormat],
    ['Step 3: Optimize caption', test3_OptimizeCaption],
    ['Step 4: Get Instagram hashtags', test4_GetInstagramHashtags],
    ['Step 4: Verify 9:16 aspect ratio', test5_VerifyAspectRatio],
    ['Step 5: Verify duration < 90s', test6_VerifyDuration],
    ['Comprehensive optimization', test7_ComprehensiveOptimization],
    ['Health check', test8_HealthCheck],
  ];

  for (const [name, testFn] of tests) {
    await runTest(name, testFn);
  }

  separator();
  log('📊 Test Summary', 'bold');
  log(`✅ Passed: ${testsPassed}`, 'green');
  log(`❌ Failed: ${testsFailed}`, 'red');
  log(`📈 Total: ${testsPassed + testsFailed}`, 'blue');
  separator();

  if (testsFailed === 0) {
    log('🎉 All tests passed! Feature #61 is working correctly.', 'green');
    process.exit(0);
  } else {
    log('⚠️ Some tests failed. Please review the errors above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
