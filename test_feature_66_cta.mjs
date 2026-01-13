#!/usr/bin/env node

/**
 * Test Feature #66: Call to Action inclusion in content
 *
 * This test verifies that:
 * 1. Generated content includes CTAs in captions
 * 2. CTAs include app link or handle
 * 3. CTAs vary by post type (platform)
 * 4. CTAs are placed correctly in captions
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/content';

// Test story data
const testStory = {
  _id: 'test_story_66_cta',
  title: 'The CEO\'s Secret Love',
  category: 'Billionaire Romance',
  spiciness: 2,
  tags: ['ceo', 'romance', 'secret', 'love']
};

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

function logStep(step) {
  console.log(`\n${colors.bold}${colors.blue}Step: ${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ${message}`, 'yellow');
}

// Expected CTA patterns for each platform
const expectedCTAs = {
  tiktok: {
    mustInclude: ['link in bio', '#blushapp'],
    mustNotInclude: ['subscribe'],
    description: 'TikTok CTA should include "link in bio" and brand hashtag'
  },
  instagram: {
    mustInclude: ['link in bio', '#blushapp'],
    mustNotInclude: ['subscribe'],
    description: 'Instagram CTA should include "link in bio" and brand hashtag'
  },
  youtube_shorts: {
    mustInclude: ['subscribe', '#blushapp'],
    mustNotInclude: [],
    description: 'YouTube Shorts CTA should include "subscribe" and brand hashtag'
  }
};

async function testCaptionGeneration(platform) {
  logStep(`Generate caption for ${platform}`);

  try {
    const response = await fetch(`${API_BASE}/caption/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story: testStory,
        platform,
        options: {
          includeCTA: true,
          includeEmojis: true
        }
      })
    });

    if (!response.ok) {
      logError(`Failed to generate caption for ${platform}`);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      logError(`API returned error for ${platform}: ${result.error}`);
      return null;
    }

    logSuccess(`Caption generated for ${platform}`);
    return result.data;

  } catch (error) {
    logError(`Exception during caption generation for ${platform}: ${error.message}`);
    return null;
  }
}

function verifyCTA(caption, platform) {
  const expectations = expectedCTAs[platform];
  const captionLower = caption.toLowerCase();
  const issues = [];
  const passes = [];

  // Check for required CTAs
  expectations.mustInclude.forEach(phrase => {
    if (captionLower.includes(phrase)) {
      passes.push(`✓ Includes required CTA: "${phrase}"`);
    } else {
      issues.push(`✗ Missing required CTA: "${phrase}"`);
    }
  });

  // Check for prohibited CTAs
  expectations.mustNotInclude.forEach(phrase => {
    if (!captionLower.includes(phrase)) {
      passes.push(`✓ Correctly excludes: "${phrase}"`);
    } else {
      issues.push(`✗ Should not include: "${phrase}"`);
    }
  });

  // Check CTA placement (should be at the end)
  const lines = caption.split('\n').filter(line => line.trim());
  const lastLine = lines[lines.length - 1] || '';

  const hasCTAInLastLine = expectations.mustInclude.some(phrase =>
    lastLine.toLowerCase().includes(phrase)
  );

  if (hasCTAInLastLine) {
    passes.push('✓ CTA placed at end of caption');
  } else {
    issues.push('✗ CTA not placed at end of caption');
  }

  // Check for brand hashtag
  if (captionLower.includes('#blushapp')) {
    passes.push('✓ Includes brand hashtag #blushapp');
  } else {
    issues.push('✗ Missing brand hashtag #blushapp');
  }

  // Check for app reference
  if (captionLower.includes('blush')) {
    passes.push('✓ References app name');
  } else {
    issues.push('✗ Does not reference app name');
  }

  return { issues, passes, expectations, lastLine };
}

async function runTests() {
  log('\n========================================');
  log('Feature #66: CTA Inclusion Test Suite', 'bold');
  log('========================================\n');

  const platforms = ['tiktok', 'instagram', 'youtube_shorts'];
  const results = {};

  // Test each platform
  for (const platform of platforms) {
    log(`\n${colors.bold}${colors.blue}Testing Platform: ${platform.toUpperCase()}${colors.reset}`);
    log(`Expected: ${expectedCTAs[platform].description}\n`);

    // Generate caption
    const data = await testCaptionGeneration(platform);

    if (!data) {
      logError(`Failed to generate caption for ${platform}`);
      results[platform] = { success: false, error: 'Generation failed' };
      continue;
    }

    const caption = data.caption;
    logInfo(`Caption length: ${caption.length} characters`);
    logInfo(`Caption preview:\n${caption.substring(0, 150)}...\n`);

    // Verify CTA
    const { issues, passes, expectations, lastLine } = verifyCTA(caption, platform);

    // Display verification results
    logInfo('Verification Results:');
    passes.forEach(msg => log(msg, 'green'));
    issues.forEach(msg => log(msg, 'red'));

    logInfo(`\nLast line of caption:\n"${lastLine}"`);

    // Store results
    results[platform] = {
      success: issues.length === 0,
      caption,
      issues,
      passes,
      hasCTA: data.metadata.hasCTA,
      emojiCount: data.metadata.emojiCount
    };

    if (issues.length === 0) {
      logSuccess(`All CTA checks passed for ${platform}`);
    } else {
      logError(`${issues.length} issue(s) found for ${platform}`);
    }
  }

  // Summary
  log('\n========================================');
  log('Test Summary', 'bold');
  log('========================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  Object.entries(results).forEach(([platform, result]) => {
    if (result.success) {
      logSuccess(`${platform.toUpperCase()}: PASSED`);
      totalPassed++;
    } else {
      logError(`${platform.toUpperCase()}: FAILED`);
      totalFailed++;
    }
  });

  log('\n========================================');
  log(`Total: ${totalPassed} passed, ${totalFailed} failed`, 'bold');
  log('========================================\n');

  // Show sample captions
  log('\n========================================');
  log('Sample Generated Captions', 'bold');
  log('========================================\n');

  Object.entries(results).forEach(([platform, result]) => {
    if (result.caption) {
      log(`${colors.bold}${platform.toUpperCase()}:${colors.reset}`);
      log(result.caption, 'yellow');
      log('\n');
    }
  });

  // Exit with appropriate code
  if (totalFailed > 0) {
    process.exit(1);
  } else {
    logSuccess('All CTA tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
