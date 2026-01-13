/**
 * Test script for YouTube Shorts Optimization Service
 * This tests all 5 steps of Feature #62
 */

import youtubeOptimizationService from './backend/services/youtubeOptimizationService.js';

console.log('='.repeat(60));
console.log('Testing YouTube Shorts Optimization Service');
console.log('Feature #62: Platform-specific content optimization for YouTube');
console.log('='.repeat(60));
console.log();

let passedTests = 0;
let totalTests = 5;

// Test Step 1: Format video for YouTube specs
console.log('Step 1: Format video for YouTube specs');
console.log('-'.repeat(60));
try {
  const testVideo = {
    duration: 15,
    resolution: '1080x1920',
    aspectRatio: '9:16',
    format: 'mp4',
    fps: 30,
    fileSizeMB: 50
  };

  const validation = youtubeOptimizationService.validateVideoFormat(testVideo);

  if (validation.success && validation.isValid) {
    console.log('✅ PASS: Video format validated successfully');
    console.log(`   - Duration: ${testVideo.duration}s (recommended: 15s)`);
    console.log(`   - Resolution: ${testVideo.resolution}`);
    console.log(`   - Aspect Ratio: ${testVideo.aspectRatio}`);
    passedTests++;
  } else {
    console.log('❌ FAIL: Video validation failed');
    console.log('   Issues:', validation.issues);
  }
} catch (error) {
  console.log('❌ FAIL: Exception thrown:', error.message);
}
console.log();

// Test Step 2: Optimize title and description
console.log('Step 2: Optimize title and description');
console.log('-'.repeat(60));
try {
  const testStory = {
    title: 'Midnight Confessions',
    category: 'Contemporary Romance',
    spiciness: 2
  };

  const titleResult = youtubeOptimizationService.optimizeTitle({
    story: testStory,
    spiciness: 2
  });

  const descriptionResult = youtubeOptimizationService.optimizeDescription({
    story: testStory,
    spiciness: 2
  });

  if (titleResult.success && titleResult.title && descriptionResult.success && descriptionResult.description) {
    console.log('✅ PASS: Title and description optimized successfully');
    console.log(`   - Title: "${titleResult.title}"`);
    console.log(`   - Description length: ${descriptionResult.description.length} chars`);
    console.log(`   - Has CTA: ${descriptionResult.analysis.hasCTA ? 'Yes' : 'No'}`);
    passedTests++;
  } else {
    console.log('❌ FAIL: Title/description optimization failed');
  }
} catch (error) {
  console.log('❌ FAIL: Exception thrown:', error.message);
}
console.log();

// Test Step 3: Include YouTube-specific hashtags
console.log('Step 3: Include YouTube-specific hashtags');
console.log('-'.repeat(60));
try {
  const hashtags = youtubeOptimizationService.getYoutubeHashtags({
    category: 'Contemporary Romance',
    spiciness: 2,
    limit: 5
  });

  if (hashtags.success && hashtags.hashtags.length > 0) {
    console.log('✅ PASS: YouTube hashtags generated successfully');
    console.log(`   - Count: ${hashtags.count} hashtags`);
    console.log(`   - Hashtags: ${hashtags.hashtags.join(', ')}`);
    passedTests++;
  } else {
    console.log('❌ FAIL: Hashtag generation failed');
  }
} catch (error) {
  console.log('❌ FAIL: Exception thrown:', error.message);
}
console.log();

// Test Step 4: Verify Shorts-compatible format
console.log('Step 4: Verify Shorts-compatible format');
console.log('-'.repeat(60));
try {
  const aspectCheck = youtubeOptimizationService.verifyAspectRatio({
    width: 1080,
    height: 1920
  });

  if (aspectCheck.success && aspectCheck.isValid) {
    console.log('✅ PASS: Aspect ratio verified as Shorts-compatible');
    console.log(`   - Current ratio: ${aspectCheck.currentRatio}`);
    console.log(`   - Is vertical: ${aspectCheck.isVertical}`);
    console.log(`   - Valid for Shorts: ${aspectCheck.isValid}`);
    passedTests++;
  } else {
    console.log('❌ FAIL: Aspect ratio verification failed');
    console.log('   Adjustments needed:', aspectCheck.adjustments);
  }
} catch (error) {
  console.log('❌ FAIL: Exception thrown:', error.message);
}
console.log();

// Test Step 5: Check aspect ratio and duration (comprehensive)
console.log('Step 5: Check aspect ratio and duration (comprehensive optimization)');
console.log('-'.repeat(60));
try {
  const testContent = {
    video: {
      duration: 15,
      resolution: '1080x1920',
      aspectRatio: '9:16',
      format: 'mp4'
    },
    story: {
      title: 'Midnight Confessions',
      category: 'Contemporary Romance'
    },
    spiciness: 2
  };

  const optimization = youtubeOptimizationService.optimizeForYoutube(testContent);

  if (optimization.success && optimization.optimization.isReady) {
    console.log('✅ PASS: Comprehensive optimization successful');
    console.log(`   - Overall score: ${optimization.optimization.overallScore}/100`);
    console.log(`   - Video valid: ${optimization.optimization.video?.isValid || false}`);
    console.log(`   - Title optimized: ${optimization.optimization.title?.title ? 'Yes' : 'No'}`);
    console.log(`   - Description optimized: ${optimization.optimization.description?.description ? 'Yes' : 'No'}`);
    console.log(`   - Hashtags generated: ${optimization.optimization.hashtags?.hashtags?.length || 0}`);
    console.log(`   - Ready for posting: ${optimization.optimization.isReady}`);
    passedTests++;
  } else {
    console.log('❌ FAIL: Comprehensive optimization failed');
    console.log('   Score:', optimization.optimization?.overallScore || 0);
    console.log('   Recommendations:', optimization.optimization?.recommendations || []);
  }
} catch (error) {
  console.log('❌ FAIL: Exception thrown:', error.message);
}
console.log();

// Summary
console.log('='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log(`Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
console.log();

if (passedTests === totalTests) {
  console.log('🎉 All tests PASSED! Feature #62 is working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
