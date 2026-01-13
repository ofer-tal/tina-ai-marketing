/**
 * Feature #58: Caption generation with brand voice
 * Test script to verify caption generation functionality
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001';

// Color codes for console output
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

// Test stories with different spiciness levels
const testStories = {
  mild: {
    title: 'Whispers in the Wind',
    category: 'Small Town Romance',
    spiciness: 1,
    tags: ['sweet', 'wholesome', 'heartwarming']
  },
  medium: {
    title: 'Forbidden Touch',
    category: 'Professor Romance',
    spiciness: 2,
    tags: ['passionate', 'chemistry', 'tension']
  },
  spicy: {
    title: 'Midnight Desires',
    category: 'Dark Romance',
    spiciness: 3,
    tags: ['intense', 'forbidden', 'seductive']
  }
};

async function testHealthCheck() {
  section('TEST 1: Caption Service Health Check');

  try {
    const response = await fetch(`${API_BASE}/api/content/caption/health`);
    const data = await response.json();

    if (data.success && data.data.status === 'ok') {
      log('✅ Health check passed', 'green');
      log(`   Mock Mode: ${data.data.mockMode}`, 'blue');
      log(`   Timestamp: ${data.data.timestamp}`, 'blue');
      return true;
    } else {
      log('❌ Health check failed', 'red');
      log(`   Response: ${JSON.stringify(data)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Health check error:', 'red');
    log(`   ${error.message}`, 'yellow');
    return false;
  }
}

async function testCaptionGeneration(story, platform, testName) {
  section(testName);

  try {
    const response = await fetch(`${API_BASE}/api/content/caption/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story,
        platform,
        options: {
          maxLength: platform === 'tiktok' ? 150 : 2200,
          includeCTA: true,
          includeEmojis: true
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      log('❌ API request failed', 'red');
      log(`   Error: ${data.error}`, 'yellow');
      return false;
    }

    if (!data.success) {
      log('❌ Caption generation failed', 'red');
      log(`   Error: ${data.error}`, 'yellow');
      return false;
    }

    const { caption, metadata } = data.data;

    log('✅ Caption generated successfully', 'green');
    console.log('\n📝 Generated Caption:');
    console.log('─'.repeat(60));
    log(caption, 'blue');
    console.log('─'.repeat(60));

    // Verify metadata
    console.log('\n📊 Metadata:');
    log(`   Platform: ${metadata.platform}`, 'blue');
    log(`   Spiciness: ${metadata.spiciness}`, 'blue');
    log(`   Category: ${metadata.category}`, 'blue');
    log(`   Character Count: ${metadata.characterCount}`, 'blue');
    log(`   Emoji Count: ${metadata.emojiCount}`, 'blue');
    log(`   Has CTA: ${metadata.hasCTA}`, 'blue');
    log(`   Tone: ${metadata.tone}`, 'blue');

    // Validate caption properties
    const validations = [];

    // Check 1: Caption is not empty
    if (caption && caption.length > 0) {
      validations.push({ name: 'Caption not empty', passed: true });
    } else {
      validations.push({ name: 'Caption not empty', passed: false });
    }

    // Check 2: Caption has emojis
    if (metadata.emojiCount > 0) {
      validations.push({ name: 'Contains emojis', passed: true });
    } else {
      validations.push({ name: 'Contains emojis', passed: false });
    }

    // Check 3: Caption length is appropriate for platform
    const maxLength = platform === 'tiktok' ? 150 : 2200;
    if (metadata.characterCount <= maxLength) {
      validations.push({ name: 'Length appropriate for platform', passed: true });
    } else {
      validations.push({ name: 'Length appropriate for platform', passed: false });
    }

    // Check 4: Caption has CTA
    if (metadata.hasCTA) {
      validations.push({ name: 'Includes CTA', passed: true });
    } else {
      validations.push({ name: 'Includes CTA', passed: false });
    }

    // Check 5: Tone is appropriate for spiciness
    const expectedTones = {
      1: 'sweet romantic',
      2: 'romantic sexy',
      3: 'suggestive romantic'
    };
    if (metadata.tone === expectedTones[story.spiciness]) {
      validations.push({ name: 'Tone matches spiciness', passed: true });
    } else {
      validations.push({ name: 'Tone matches spiciness', passed: false });
    }

    // Display validation results
    console.log('\n✓ Validations:');
    let allPassed = true;
    validations.forEach(v => {
      const status = v.passed ? '✅' : '❌';
      const color = v.passed ? 'green' : 'red';
      log(`   ${status} ${v.name}`, color);
      if (!v.passed) allPassed = false;
    });

    return allPassed;

  } catch (error) {
    log('❌ Test error:', 'red');
    log(`   ${error.message}`, 'yellow');
    return false;
  }
}

async function testValidationErrors() {
  section('TEST 5: Validation Error Handling');

  const tests = [
    {
      name: 'Missing story object',
      payload: { platform: 'tiktok' },
      expectedError: 'story object is required'
    },
    {
      name: 'Missing story title',
      payload: {
        story: { category: 'Romance', spiciness: 1 },
        platform: 'tiktok'
      },
      expectedError: 'story.title is required'
    },
    {
      name: 'Invalid spiciness (too high)',
      payload: {
        story: {
          title: 'Test Story',
          category: 'Romance',
          spiciness: 5
        },
        platform: 'tiktok'
      },
      expectedError: 'story.spiciness must be between 0 and 3'
    },
    {
      name: 'Invalid platform',
      payload: {
        story: {
          title: 'Test Story',
          category: 'Romance',
          spiciness: 1
        },
        platform: 'facebook'
      },
      expectedError: 'platform must be one of'
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE}/api/content/caption/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.payload)
      });

      const data = await response.json();

      if (!response.ok && data.error && data.error.includes(test.expectedError.substring(0, 10))) {
        log(`✅ ${test.name}`, 'green');
      } else {
        log(`❌ ${test.name}`, 'red');
        log(`   Expected error containing: "${test.expectedError}"`, 'yellow');
        log(`   Got: "${data.error || 'No error'}"`, 'yellow');
        allPassed = false;
      }
    } catch (error) {
      log(`❌ ${test.name} - Request failed`, 'red');
      log(`   ${error.message}`, 'yellow');
      allPassed = false;
    }
  }

  return allPassed;
}

async function testBatchGeneration() {
  section('TEST 6: Batch Caption Generation');

  try {
    const stories = [
      testStories.mild,
      testStories.medium,
      testStories.spicy
    ];

    const response = await fetch(`${API_BASE}/api/content/caption/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stories,
        platform: 'instagram'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      log('❌ Batch request failed', 'red');
      log(`   Error: ${data.error}`, 'yellow');
      return false;
    }

    if (!data.success) {
      log('❌ Batch generation failed', 'red');
      log(`   Error: ${data.error}`, 'yellow');
      return false;
    }

    log('✅ Batch caption generation successful', 'green');
    log(`   Generated ${data.data.count} captions`, 'blue');

    if (data.data.count !== stories.length) {
      log(`❌ Expected ${stories.length} captions, got ${data.data.count}`, 'red');
      return false;
    }

    // Display all captions
    console.log('\n📝 Generated Captions:');
    data.data.captions.forEach((result, index) => {
      console.log(`\n${index + 1}. ${stories[index].title} (Spiciness ${stories[index].spiciness}):`);
      console.log('─'.repeat(60));
      log(result.caption, 'blue');
      console.log(`   Length: ${result.metadata.characterCount} chars | Emojis: ${result.metadata.emojiCount}`);
    });

    return true;

  } catch (error) {
    log('❌ Batch test error:', 'red');
    log(`   ${error.message}`, 'yellow');
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   Feature #58: Caption Generation with Brand Voice Tests      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const results = [];

  // Test 1: Health check
  results.push(await testHealthCheck());

  // Test 2: Mild story - TikTok
  results.push(await testCaptionGeneration(
    testStories.mild,
    'tiktok',
    'TEST 2: Mild Story (Spiciness 1) - TikTok'
  ));

  // Test 3: Medium story - Instagram
  results.push(await testCaptionGeneration(
    testStories.medium,
    'instagram',
    'TEST 3: Medium Story (Spiciness 2) - Instagram'
  ));

  // Test 4: Spicy story - YouTube Shorts
  results.push(await testCaptionGeneration(
    testStories.spicy,
    'youtube_shorts',
    'TEST 4: Spicy Story (Spiciness 3) - YouTube Shorts'
  ));

  // Test 5: Validation errors
  results.push(await testValidationErrors());

  // Test 6: Batch generation
  results.push(await testBatchGeneration());

  // Summary
  section('TEST SUMMARY');
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  log(`Passed: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All tests passed! Feature #58 is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }

  console.log('\n');
}

// Run tests
main().catch(error => {
  log('Fatal error:', 'red');
  log(error.message, 'yellow');
  console.error(error);
  process.exit(1);
});
