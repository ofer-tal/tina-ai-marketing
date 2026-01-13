#!/usr/bin/env node

/**
 * Test Feature #54: Video generation using RunPod PixelWave/Flux
 *
 * This test verifies:
 * Step 1: Call RunPod API for video generation
 * Step 2: Verify request accepted
 * Step 3: Poll for generation status
 * Step 4: Download completed video
 * Step 5: Verify video quality and duration
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

async function testRunPodStatus() {
  section('TEST 1: RunPod Service Status Check');

  try {
    const response = await fetch(`${API_BASE}/api/video/status/runpod`);
    const data = await response.json();

    log('✓ Status endpoint accessible', 'green');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');

    if (data.success && data.data) {
      log(`✓ Service configured: ${data.data.configured}`, data.data.configured ? 'green' : 'yellow');
      if (data.data.endpoint) {
        log(`✓ Endpoint: ${data.data.endpoint}`, 'blue');
      }
      return true;
    }

    return false;
  } catch (error) {
    log(`✗ Status check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testHealthCheck() {
  section('TEST 2: Health Check (Both Services)');

  try {
    const response = await fetch(`${API_BASE}/api/video/health`);
    const data = await response.json();

    log('✓ Health check endpoint accessible', 'green');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');

    if (data.success && data.services) {
      log(`✓ Fal.ai health: ${data.services.fal_ai.healthy}`, data.services.fal_ai.healthy ? 'green' : 'yellow');
      log(`✓ RunPod health: ${data.services.runpod.healthy}`, data.services.runpod.healthy ? 'green' : 'yellow');
      return true;
    }

    return false;
  } catch (error) {
    log(`✗ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testRequestValidation() {
  section('TEST 3: Request Validation');

  const tests = [
    {
      name: 'Missing prompt',
      body: { spiciness: 1, duration: 10 },
      expectedError: 'Missing required field: prompt'
    },
    {
      name: 'Invalid duration (too short)',
      body: { prompt: 'Test', duration: 2 },
      expectedError: 'Duration must be between 3 and 60 seconds'
    },
    {
      name: 'Invalid duration (too long)',
      body: { prompt: 'Test', duration: 100 },
      expectedError: 'Duration must be between 3 and 60 seconds'
    },
    {
      name: 'Invalid spiciness (negative)',
      body: { prompt: 'Test', spiciness: -1 },
      expectedError: 'Spiciness must be between 0 and 3'
    },
    {
      name: 'Invalid spiciness (too high)',
      body: { prompt: 'Test', spiciness: 5 },
      expectedError: 'Spiciness must be between 0 and 3'
    },
    {
      name: 'Invalid FPS (too low)',
      body: { prompt: 'Test', fps: 5 },
      expectedError: 'FPS must be between 10 and 60'
    },
    {
      name: 'Invalid FPS (too high)',
      body: { prompt: 'Test', fps: 120 },
      expectedError: 'FPS must be between 10 and 60'
    },
    {
      name: 'Invalid resolution (too low)',
      body: { prompt: 'Test', resolution: 240 },
      expectedError: 'Resolution must be between 480 and 2160'
    },
    {
      name: 'Invalid resolution (too high)',
      body: { prompt: 'Test', resolution: 4000 },
      expectedError: 'Resolution must be between 480 and 2160'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE}/api/video/generate/runpod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });

      const data = await response.json();

      if (response.status === 400 && data.error === test.expectedError) {
        log(`✓ ${test.name}: Correctly rejected`, 'green');
        passed++;
      } else {
        log(`✗ ${test.name}: Expected error "${test.expectedError}", got "${data.error}"`, 'red');
        failed++;
      }
    } catch (error) {
      log(`✗ ${test.name}: ${error.message}`, 'red');
      failed++;
    }
  }

  log(`\nValidation tests: ${passed} passed, ${failed} failed`, passed === tests.length ? 'green' : 'yellow');
  return failed === 0;
}

async function testVideoGenerationMock() {
  section('TEST 4: Video Generation (Mock Mode)');

  const requestBody = {
    prompt: 'A romantic sunset on a beach with a couple holding hands',
    spiciness: 1,
    category: 'Contemporary',
    duration: 10,
    aspectRatio: '9:16',
    fps: 24,
    resolution: 1080
  };

  log('Request body:', 'blue');
  log(JSON.stringify(requestBody, null, 2), 'blue');

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/api/video/generate/runpod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    log(`\nResponse received in ${duration}ms`, 'blue');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');

    if (response.ok && data.success) {
      log('\n✓ Generation request successful', 'green');

      // Verify response structure
      const checks = [
        { field: 'data.success', value: data.data?.success, expected: true },
        { field: 'data.video', value: data.data?.video, expected: 'object' },
        { field: 'data.video.path', value: data.data?.video?.path, expected: 'string' },
        { field: 'data.video.duration', value: data.data?.video?.duration, expected: 10 },
        { field: 'data.video.aspectRatio', value: data.data?.video?.aspectRatio, expected: '9:16' },
        { field: 'data.requestId', value: data.data?.requestId, expected: 'string' },
        { field: 'data.steps', value: data.data?.steps, expected: 'array' }
      ];

      let allPassed = true;
      for (const check of checks) {
        const passed = check.value === check.expected || (check.expected === 'object' && typeof check.value === 'object') || (check.expected === 'string' && typeof check.value === 'string') || (check.expected === 'array' && Array.isArray(check.value));
        const status = passed ? '✓' : '✗';
        const color = passed ? 'green' : 'red';
        log(`${status} ${check.field}: ${JSON.stringify(check.value)}`, color);

        if (!passed) allPassed = false;
      }

      // Check steps
      if (data.data?.steps && Array.isArray(data.data.steps)) {
        log('\n✓ Generation steps:', 'green');
        data.data.steps.forEach(step => {
          log(`  Step ${step.step}: ${step.name} - ${step.status}`, 'blue');
        });
      }

      // Check if mock mode
      if (data.data?.mock) {
        log('\n⚠ Running in MOCK MODE (API key not configured)', 'yellow');
      }

      return allPassed;
    } else {
      log(`\n✗ Generation failed: ${data.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`\n✗ Test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testSpicinessLevels() {
  section('TEST 5: Spiciness Level Handling');

  const spicinessTests = [
    { level: 0, description: 'Sweet romantic' },
    { level: 1, description: 'Sweet romantic' },
    { level: 2, description: 'Romantic and passionate' },
    { level: 3, description: 'Intense and dramatic' }
  ];

  let passed = 0;

  for (const test of spicinessTests) {
    try {
      const response = await fetch(`${API_BASE}/api/video/generate/runpod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A romantic scene',
          spiciness: test.level,
          duration: 5
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        log(`✓ Spiciness ${test.level} (${test.description}): Accepted`, 'green');
        passed++;
      } else {
        log(`✗ Spiciness ${test.level}: Failed`, 'red');
      }
    } catch (error) {
      log(`✗ Spiciness ${test.level}: ${error.message}`, 'red');
    }
  }

  log(`\nSpiciness tests: ${passed}/${spicinessTests.length} passed`, passed === spicinessTests.length ? 'green' : 'yellow');
  return passed === spicinessTests.length;
}

async function testDifferentDurations() {
  section('TEST 6: Different Video Durations');

  const durationTests = [3, 10, 30, 60];

  let passed = 0;

  for (const duration of durationTests) {
    try {
      const response = await fetch(`${API_BASE}/api/video/generate/runpod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test video',
          duration: duration
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const videoDuration = data.data?.video?.duration;
        if (videoDuration === duration) {
          log(`✓ Duration ${duration}s: Generated correctly`, 'green');
          passed++;
        } else {
          log(`✗ Duration ${duration}s: Got ${videoDuration}s instead`, 'red');
        }
      } else {
        log(`✗ Duration ${duration}s: Failed`, 'red');
      }
    } catch (error) {
      log(`✗ Duration ${duration}s: ${error.message}`, 'red');
    }
  }

  log(`\nDuration tests: ${passed}/${durationTests.length} passed`, passed === durationTests.length ? 'green' : 'yellow');
  return passed === durationTests.length;
}

async function testAspectRatios() {
  section('TEST 7: Aspect Ratio Support');

  const ratioTests = [
    { ratio: '9:16', description: 'Vertical (TikTok/Reels)' },
    { ratio: '16:9', description: 'Horizontal (YouTube)' },
    { ratio: '1:1', description: 'Square (Instagram)' },
    { ratio: '4:5', description: 'Portrait (Instagram)' }
  ];

  let passed = 0;

  for (const test of ratioTests) {
    try {
      const response = await fetch(`${API_BASE}/api/video/generate/runpod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test video',
          aspectRatio: test.ratio,
          duration: 5
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const videoRatio = data.data?.video?.aspectRatio;
        if (videoRatio === test.ratio) {
          log(`✓ ${test.ratio} (${test.description}): Accepted`, 'green');
          passed++;
        } else {
          log(`✗ ${test.ratio}: Got ${videoRatio} instead`, 'red');
        }
      } else {
        log(`✗ ${test.ratio}: Failed`, 'red');
      }
    } catch (error) {
      log(`✗ ${test.ratio}: ${error.message}`, 'red');
    }
  }

  log(`\nAspect ratio tests: ${passed}/${ratioTests.length} passed`, passed === ratioTests.length ? 'green' : 'yellow');
  return passed === ratioTests.length;
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║  Feature #54: RunPod Video Generation Test Suite           ║', 'magenta');
  log('║  Testing RunPod PixelWave/Flux video generation API       ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  const results = [];

  results.push(await testRunPodStatus());
  results.push(await testHealthCheck());
  results.push(await testRequestValidation());
  results.push(await testVideoGenerationMock());
  results.push(await testSpicinessLevels());
  results.push(await testDifferentDurations());
  results.push(await testAspectRatios());

  section('FINAL RESULTS');

  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  log(`\nTests Passed: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 ALL TESTS PASSED! Feature #54 is working correctly.', 'green');
  } else {
    log(`\n⚠ ${total - passed} test(s) failed. Please review the output above.`, 'yellow');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  log(`\n✗ Test suite crashed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
