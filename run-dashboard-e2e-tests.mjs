#!/usr/bin/env node

/**
 * Dashboard E2E Test Runner
 * Runs Playwright end-to-end tests for dashboard functionality
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, duration) {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  const durationStr = duration ? ` (${duration}ms)` : '';
  log(`  ${icon} ${testName}${durationStr}`, color);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

async function checkServers() {
  logSection('Checking Servers');

  // Check backend server
  try {
    const backendResponse = await fetch('http://localhost:3001/api/health');
    if (backendResponse.ok) {
      log('✓ Backend server running on http://localhost:3001', 'green');
    } else {
      log('✗ Backend server not responding correctly', 'red');
      return false;
    }
  } catch (error) {
    log('✗ Backend server not accessible', 'red');
    log('  Please start the backend server: node backend/server.js', 'yellow');
    return false;
  }

  // Check frontend server
  try {
    const frontendResponse = await fetch('http://localhost:5173');
    // Frontend might return HTML, so just check if we get a response
    log('✓ Frontend server running on http://localhost:5173', 'green');
  } catch (error) {
    log('⚠ Frontend server not accessible', 'yellow');
    log('  Please start the frontend server: npm run dev (in frontend directory)', 'yellow');
    log('  Tests will proceed but may fail if frontend is required', 'yellow');
  }

  return true;
}

async function setupTestData() {
  logSection('Setting Up Test Data');

  try {
    // Create test metrics
    log('Creating test metrics...', 'blue');
    const metricsResponse = await fetch('http://localhost:3001/api/dashboard/test/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overwriteExisting: false })
    });

    if (metricsResponse.ok) {
      const metricsData = await metricsResponse.json();
      log(`✓ Created ${metricsData.message}`, 'green');
    } else {
      log('⚠ Failed to create test metrics (will use existing data)', 'yellow');
    }

    // Create test posts
    log('Creating test posts...', 'blue');
    const posts = [];
    for (let i = 0; i < 5; i++) {
      const postResponse = await fetch('http://localhost:3001/api/content/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `E2E Test Post ${i}`,
          description: `Test post ${i} for dashboard E2E tests`,
          platform: 'tiktok',
          status: 'posted',
          contentType: 'video',
          caption: `Test caption ${i}`,
          hashtags: ['#test', '#e2e'],
          scheduledAt: new Date().toISOString(),
          postedAt: new Date().toISOString(),
          storyId: '507f1f77bcf86cd799439011',
          storyName: 'Test Story',
          storyCategory: 'Contemporary',
          performanceMetrics: {
            views: Math.floor(Math.random() * 10000) + 1000,
            likes: Math.floor(Math.random() * 500) + 50,
            comments: Math.floor(Math.random() * 50) + 5,
            shares: Math.floor(Math.random() * 30) + 3,
            engagementRate: (Math.random() * 10 + 2).toFixed(2)
          }
        })
      });

      if (postResponse.ok) {
        const postData = await postResponse.json();
        posts.push(postData.post);
      }
    }

    log(`✓ Created ${posts.length} test posts`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to setup test data: ${error.message}`, 'red');
    return false;
  }
}

async function cleanupTestData() {
  logSection('Cleaning Up Test Data');

  try {
    const cleanupResponse = await fetch('http://localhost:3001/api/dashboard/test/cleanup', {
      method: 'POST'
    });

    if (cleanupResponse.ok) {
      const cleanupData = await cleanupResponse.json();
      log(`✓ Deleted ${cleanupData.deletedPosts} test posts`, 'green');
    } else {
      log('⚠ Cleanup request failed', 'yellow');
    }
  } catch (error) {
    log(`⚠ Cleanup failed: ${error.message}`, 'yellow');
  }
}

async function runPlaywrightTests() {
  logSection('Running Dashboard E2E Tests');

  const startTime = Date.now();

  try {
    // Create results directory if it doesn't exist
    const resultsDir = path.join(__dirname, 'e2e-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Run Playwright tests
    const playwrightCmd = 'npx playwright test e2e-tests/dashboard-loading.spec.js --reporter=line';

    log('Executing Playwright tests...', 'blue');
    const { stdout, stderr } = await execAsync(playwrightCmd, {
      cwd: __dirname,
      env: {
        ...process.env,
        BASE_URL: 'http://localhost:5173',
        API_BASE_URL: 'http://localhost:3001'
      }
    });

    const duration = Date.now() - startTime;

    // Parse output for test results
    const output = stdout + stderr;
    const lines = output.split('\n');

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const line of lines) {
      if (line.includes('passed')) {
        const match = line.match(/(\d+)\s+passed/);
        if (match) passed = parseInt(match[1]);
      }
      if (line.includes('failed')) {
        const match = line.match(/(\d+)\s+failed/);
        if (match) failed = parseInt(match[1]);
      }
      if (line.includes('skipped')) {
        const match = line.match(/(\d+)\s+skipped/);
        if (match) skipped = parseInt(match[1]);
      }
    }

    log('\nTest Results:', 'bright');
    logTest('Total Tests Run', passed + failed, duration);
    logTest('Passed', passed);
    if (failed > 0) logTest('Failed', failed);
    if (skipped > 0) logTest('Skipped', skipped);

    // Show screenshots location
    log('\nScreenshots saved to: e2e-results/', 'cyan');

    return failed === 0;
  } catch (error) {
    log(`\n✗ Test execution failed: ${error.message}`, 'red');
    if (error.stdout) {
      log('\nTest Output:', 'yellow');
      console.log(error.stdout);
    }
    if (error.stderr) {
      log('\nTest Errors:', 'red');
      console.error(error.stderr);
    }
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Dashboard E2E Test Runner                             ║', 'cyan');
  log('║     End-to-end testing for dashboard functionality        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Check servers
    const serversOk = await checkServers();
    if (!serversOk) {
      log('\n✗ Cannot proceed without backend server', 'red');
      process.exit(1);
    }

    // Setup test data
    const dataSetupOk = await setupTestData();
    if (!dataSetupOk) {
      log('\n⚠ Proceeding with test setup issues', 'yellow');
    }

    // Run tests
    const testsPassed = await runPlaywrightTests();

    // Cleanup
    await cleanupTestData();

    const totalDuration = Date.now() - startTime;

    logSection('Summary');
    if (testsPassed) {
      log('✓ All dashboard E2E tests passed!', 'green');
      log(`Total duration: ${(totalDuration / 1000).toFixed(2)}s`, 'blue');
      process.exit(0);
    } else {
      log('✗ Some tests failed. Check output above for details.', 'red');
      log(`Total duration: ${(totalDuration / 1000).toFixed(2)}s`, 'blue');
      process.exit(1);
    }
  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
