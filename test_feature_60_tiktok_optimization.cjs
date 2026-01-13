#!/usr/bin/env node

/**
 * Test Suite for Feature #60: Platform-specific content optimization for TikTok
 *
 * This test suite verifies all 5 steps of the feature:
 * 1. Check TikTok trending audio
 * 2. Adjust video format for TikTok specs
 * 3. Optimize caption for TikTok audience
 * 4. Include TikTok-specific hashtags
 * 5. Verify vertical 9:16 aspect ratio
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let testsPassed = 0;
let testsFailed = 0;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testStep1_TrendingAudio() {
  log('\n=== STEP 1: Check TikTok Trending Audio ===', 'blue');

  try {
    const response = await makeRequest('GET', '/api/content/tiktok/trending-audio?limit=5');

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.success) {
      log('❌ FAILED: Response success is false', 'red');
      testsFailed++;
      return false;
    }

    const trending = response.data.data.trending;
    if (!Array.isArray(trending) || trending.length === 0) {
      log('❌ FAILED: No trending audio returned', 'red');
      testsFailed++;
      return false;
    }

    // Verify structure
    const firstTrack = trending[0];
    if (!firstTrack.id || !firstTrack.title || !firstTrack.duration || !firstTrack.popularity) {
      log('❌ FAILED: Trending audio missing required fields', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Trending audio retrieved successfully', 'green');
    log(`   Found ${trending.length} trending tracks`, 'yellow');
    log(`   Top track: "${firstTrack.title}" (Popularity: ${firstTrack.popularity})`, 'yellow');
    testsPassed++;
    return true;

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }
}

async function testStep2_VideoFormatValidation() {
  log('\n=== STEP 2: Adjust Video Format for TikTok Specs ===', 'blue');

  // Test valid TikTok video
  log('Testing valid TikTok video format...', 'yellow');
  try {
    const validVideo = {
      duration: 15,
      resolution: '1080x1920',
      aspectRatio: '9:16',
      format: 'mp4',
      fps: 30,
      fileSizeMB: 50
    };

    const response = await makeRequest('POST', '/api/content/tiktok/validate-video', {
      video: validVideo
    });

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.isValid) {
      log('❌ FAILED: Valid video marked as invalid', 'red');
      log(`   Issues: ${JSON.stringify(response.data.data.issues)}`, 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Valid video format accepted', 'green');

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }

  // Test invalid video (wrong aspect ratio)
  log('Testing invalid aspect ratio...', 'yellow');
  try {
    const invalidVideo = {
      duration: 15,
      resolution: '1920x1080',
      aspectRatio: '16:9',
      format: 'mp4'
    };

    const response = await makeRequest('POST', '/api/content/tiktok/validate-video', {
      video: invalidVideo
    });

    if (response.data.data.isValid) {
      log('❌ FAILED: Invalid video (16:9) marked as valid', 'red');
      testsFailed++;
      return false;
    }

    const hasAspectRatioIssue = response.data.data.issues.some(
      issue => issue.includes('aspect ratio')
    );

    if (!hasAspectRatioIssue) {
      log('❌ FAILED: Expected aspect ratio issue not found', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Invalid aspect ratio detected', 'green');

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }

  // Test duration validation
  log('Testing duration validation...', 'yellow');
  try {
    const tooLongVideo = {
      duration: 120, // Too long (max 60s)
      resolution: '1080x1920',
      aspectRatio: '9:16',
      format: 'mp4'
    };

    const response = await makeRequest('POST', '/api/content/tiktok/validate-video', {
      video: tooLongVideo
    });

    if (response.data.data.isValid) {
      log('❌ FAILED: Video exceeding max duration marked as valid', 'red');
      testsFailed++;
      return false;
    }

    const hasDurationIssue = response.data.data.issues.some(
      issue => issue.includes('too long')
    );

    if (!hasDurationIssue) {
      log('❌ FAILED: Expected duration issue not found', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Duration validation working', 'green');

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }

  testsPassed++;
  return true;
}

async function testStep3_CaptionOptimization() {
  log('\n=== STEP 3: Optimize Caption for TikTok Audience ===', 'blue');

  try {
    const caption = 'This amazing romance story will keep you up all night! You won\'t believe what happens next.';

    const response = await makeRequest('POST', '/api/content/tiktok/optimize-caption', {
      caption: caption,
      story: {
        title: 'Midnight Desire',
        category: 'romance'
      },
      spiciness: 2
    });

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.success) {
      log('❌ FAILED: Caption optimization failed', 'red');
      testsFailed++;
      return false;
    }

    const result = response.data.data;

    // Verify caption is returned
    if (!result.caption) {
      log('❌ FAILED: No optimized caption returned', 'red');
      testsFailed++;
      return false;
    }

    // Verify analysis
    if (!result.analysis) {
      log('❌ FAILED: No analysis returned', 'red');
      testsFailed++;
      return false;
    }

    // Verify suggested hooks
    if (!result.suggestedHooks || !Array.isArray(result.suggestedHooks)) {
      log('❌ FAILED: No suggested hooks returned', 'red');
      testsFailed++;
      return false;
    }

    // Verify suggested CTAs
    if (!result.suggestedCTAs || !Array.isArray(result.suggestedCTAs)) {
      log('❌ FAILED: No suggested CTAs returned', 'red');
      testsFailed++;
      return false;
    }

    // Verify best posting times
    if (!result.bestPostingTimes) {
      log('❌ FAILED: No best posting times returned', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Caption optimization completed', 'green');
    log(`   Original length: ${result.analysis.originalLength} chars`, 'yellow');
    log(`   Hooks suggested: ${result.suggestedHooks.length}`, 'yellow');
    log(`   CTAs suggested: ${result.suggestedCTAs.length}`, 'yellow');
    log(`   Best times: ${result.bestPostingTimes.best.join(', ')}`, 'yellow');

    testsPassed++;
    return true;

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }
}

async function testStep4_TiktokHashtags() {
  log('\n=== STEP 4: Include TikTok-Specific Hashtags ===', 'blue');

  try {
    const response = await makeRequest('GET', '/api/content/tiktok/hashtags?count=8&category=romance&spiciness=2');

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.success) {
      log('❌ FAILED: Hashtag generation failed', 'red');
      testsFailed++;
      return false;
    }

    const result = response.data.data;

    // Verify hashtags are returned
    if (!result.hashtags || !Array.isArray(result.hashtags)) {
      log('❌ FAILED: No hashtags returned', 'red');
      testsFailed++;
      return false;
    }

    if (result.hashtags.length === 0) {
      log('❌ FAILED: Empty hashtags array', 'red');
      testsFailed++;
      return false;
    }

    // Verify all hashtags start with #
    const allValid = result.hashtags.every(tag => tag.startsWith('#'));
    if (!allValid) {
      log('❌ FAILED: Some hashtags don\'t start with #', 'red');
      testsFailed++;
      return false;
    }

    // Verify TikTok-specific hashtags
    const hasTiktokSpecific = result.hashtags.some(tag =>
      tag.toLowerCase().includes('fyp') ||
      tag.toLowerCase().includes('foryou') ||
      tag.toLowerCase().includes('booktok')
    );

    if (!hasTiktokSpecific) {
      log('❌ FAILED: No TikTok-specific hashtags found', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: TikTok hashtags generated', 'green');
    log(`   Generated ${result.count} hashtags`, 'yellow');
    log(`   Hashtags: ${result.hashtags.slice(0, 5).join(' ')}...`, 'yellow');
    log(`   Recommended: ${result.recommended} hashtags`, 'yellow');
    log(`   Optimal: ${result.optimal} hashtags`, 'yellow');

    testsPassed++;
    return true;

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }
}

async function testStep5_AspectRatioVerification() {
  log('\n=== STEP 5: Verify Vertical 9:16 Aspect Ratio ===', 'blue');

  // Test valid 9:16 ratio
  log('Testing valid 9:16 aspect ratio...', 'yellow');
  try {
    const validRatio = {
      width: 1080,
      height: 1920
    };

    const response = await makeRequest('POST', '/api/content/tiktok/verify-aspect-ratio', {
      video: validRatio
    });

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.isValid) {
      log('❌ FAILED: Valid 9:16 ratio marked as invalid', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.isVertical) {
      log('❌ FAILED: Valid ratio not detected as vertical', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Valid 9:16 ratio verified', 'green');
    log(`   Calculated ratio: ${response.data.data.calculatedRatio}`, 'yellow');
    log(`   Expected: ${response.data.data.expectedRatio}`, 'yellow');

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }

  // Test invalid ratio
  log('Testing invalid aspect ratio...', 'yellow');
  try {
    const invalidRatio = {
      width: 1920,
      height: 1080
    };

    const response = await makeRequest('POST', '/api/content/tiktok/verify-aspect-ratio', {
      video: invalidRatio
    });

    if (response.data.data.isValid) {
      log('❌ FAILED: Invalid ratio (16:9) marked as valid', 'red');
      testsFailed++;
      return false;
    }

    if (response.data.data.isVertical) {
      log('❌ FAILED: Horizontal video detected as vertical', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Invalid aspect ratio detected', 'green');
    log(`   Message: ${response.data.data.message}`, 'yellow');

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }

  // Test with aspectRatio string
  log('Testing with aspectRatio string...', 'yellow');
  try {
    const ratioString = {
      aspectRatio: '9:16'
    };

    const response = await makeRequest('POST', '/api/content/tiktok/verify-aspect-ratio', {
      video: ratioString
    });

    if (!response.data.data.isValid) {
      log('❌ FAILED: Valid aspectRatio string rejected', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: aspectRatio string format works', 'green');

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }

  testsPassed++;
  return true;
}

async function testComprehensiveOptimization() {
  log('\n=== BONUS: Comprehensive TikTok Optimization ===', 'magenta');

  try {
    const content = {
      caption: 'This spicy romance will have you hooked from page one!',
      story: {
        title: 'Forbidden Desire',
        category: 'romance',
        spiciness: 2
      },
      spiciness: 2,
      video: {
        duration: 15,
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        resolution: '1080x1920',
        format: 'mp4',
        fps: 30
      }
    };

    const response = await makeRequest('POST', '/api/content/tiktok/optimize', {
      content: content
    });

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.success) {
      log('❌ FAILED: Comprehensive optimization failed', 'red');
      testsFailed++;
      return false;
    }

    const result = response.data.data;

    // Verify all optimization steps are present
    const requiredSteps = ['trendingAudio', 'videoFormat', 'caption', 'hashtags', 'aspectRatio'];
    const missingSteps = requiredSteps.filter(step => !result.optimizations[step]);

    if (missingSteps.length > 0) {
      log(`❌ FAILED: Missing optimization steps: ${missingSteps.join(', ')}`, 'red');
      testsFailed++;
      return false;
    }

    // Verify summary
    if (!result.summary) {
      log('❌ FAILED: No optimization summary', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Comprehensive optimization completed', 'green');
    log(`   Steps completed: ${result.summary.stepsCompleted}/5`, 'yellow');
    log(`   Valid: ${result.summary.isValid}`, 'yellow');
    log(`   Recommendations: ${result.summary.recommendations.length}`, 'yellow');

    testsPassed++;
    return true;

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }
}

async function testHealthCheck() {
  log('\n=== HEALTH CHECK: TikTok Optimization Service ===', 'blue');

  try {
    const response = await makeRequest('GET', '/api/content/tiktok/health');

    if (response.status !== 200) {
      log('❌ FAILED: Expected status 200', 'red');
      testsFailed++;
      return false;
    }

    if (!response.data.data.success) {
      log('❌ FAILED: Health check failed', 'red');
      testsFailed++;
      return false;
    }

    const health = response.data.data;

    // Verify capabilities
    if (!health.capabilities) {
      log('❌ FAILED: No capabilities in health check', 'red');
      testsFailed++;
      return false;
    }

    log('✅ PASSED: Service is healthy', 'green');
    log(`   Service: ${health.service}`, 'yellow');
    log(`   Status: ${health.status}`, 'yellow');
    log(`   Trending audio tracks: ${health.capabilities.trendingAudioTracks}`, 'yellow');
    log(`   Video specs: ${health.capabilities.videoSpecs}`, 'yellow');
    log(`   Optimizations: ${health.capabilities.optimizations.join(', ')}`, 'yellow');

    testsPassed++;
    return true;

  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'magenta');
  log('║  Feature #60: TikTok Platform Content Optimization     ║', 'magenta');
  log('║  Test Suite                                             ║', 'magenta');
  log('╚════════════════════════════════════════════════════════╝', 'magenta');

  const startTime = Date.now();

  // Run all tests
  await testStep1_TrendingAudio();
  await testStep2_VideoFormatValidation();
  await testStep3_CaptionOptimization();
  await testStep4_TiktokHashtags();
  await testStep5_AspectRatioVerification();
  await testComprehensiveOptimization();
  await testHealthCheck();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  log('\n╔════════════════════════════════════════════════════════╗', 'magenta');
  log('║  Test Summary                                           ║', 'magenta');
  log('╚════════════════════════════════════════════════════════╝', 'magenta');

  log(`\nTotal Tests: ${testsPassed + testsFailed}`, 'blue');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, 'red');
  log(`Duration: ${duration}s`, 'blue');
  log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`, 'yellow');

  if (testsFailed === 0) {
    log('\n🎉 ALL TESTS PASSED! 🎉', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${testsFailed} test(s) failed`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 FATAL ERROR: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
