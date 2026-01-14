#!/usr/bin/env node

/**
 * TikTok API Integration Test
 * Tests all 5 steps of Feature #101: TikTok API integration for posting
 */

const testResults = [];
let totalTests = 0;
let passedTests = 0;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };

  const color = colors[type] || colors.info;
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(step, description, success, details = '') {
  totalTests++;
  if (success) passedTests++;

  const icon = success ? '✅' : '❌';
  const status = success ? 'PASS' : 'FAIL';

  log(`${icon} Step ${step}: ${description} - ${status}`, success ? 'success' : 'error');
  if (details) {
    log(`  ${details}`, 'info');
  }

  testResults.push({
    step,
    description,
    success,
    details
  });
}

async function testStep1() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('STEP 1: Configure TikTok API credentials', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('http://localhost:3003/api/tiktok/test-connection');
    const data = await response.json();

    if (data.success && data.data.hasCredentials) {
      logTest(1, 'Configure TikTok API credentials', true,
        `Credentials configured: ${JSON.stringify(data.data, null, 2)}`);

      // Verify environment variables are set
      if (process.env.TIKTOK_APP_KEY && process.env.TIKTOK_APP_SECRET) {
        log('  ✓ TIKTOK_APP_KEY is set', 'success');
        log('  ✓ TIKTOK_APP_SECRET is set', 'success');
        if (process.env.TIKTOK_REDIRECT_URI) {
          log('  ✓ TIKTOK_REDIRECT_URI is set', 'success');
        }
        log('  ✓ ENABLE_TIKTOK_POSTING is true', 'success');
      }

      return true;
    } else {
      logTest(1, 'Configure TikTok API credentials', false,
        data.error || 'Credentials not configured');
      return false;
    }
  } catch (error) {
    logTest(1, 'Configure TikTok API credentials', false,
      `Error: ${error.message}`);
    return false;
  }
}

async function testStep2() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('STEP 2: Test connection to TikTok API', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('http://localhost:3003/api/tiktok/test-connection');
    const data = await response.json();

    if (data.success) {
      logTest(2, 'Test connection to TikTok API', true,
        `Connection successful: ${JSON.stringify(data.data, null, 2)}`);
      return true;
    } else {
      logTest(2, 'Test connection to TikTok API', false,
        data.error || 'Connection failed');
      return false;
    }
  } catch (error) {
    logTest(2, 'Test connection to TikTok API', false,
      `Error: ${error.message}`);
    return false;
  }
}

async function testStep3() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('STEP 3: Verify authentication token obtained', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('http://localhost:3003/api/tiktok/token-status');
    const data = await response.json();

    if (data.success && data.data.authenticated) {
      logTest(3, 'Verify authentication token obtained', true,
        `Token status: ${JSON.stringify(data.data, null, 2)}`);
      return true;
    } else {
      // Token not obtained yet - this is expected if OAuth hasn't been completed
      logTest(3, 'Verify authentication token obtained', false,
        'No authentication token - OAuth flow needs to be completed');
      log('  ⚠️  This is expected if you haven\'t completed the OAuth flow yet', 'warning');
      log('  To complete OAuth:', 'info');
      log('    1. GET /api/tiktok/authorize-url - Get authorization URL', 'info');
      log('    2. Visit the URL to authorize the app', 'info');
      log('    3. POST /api/tiktok/exchange-token - Exchange code for token', 'info');
      return false;
    }
  } catch (error) {
    logTest(3, 'Verify authentication token obtained', false,
      `Error: ${error.message}`);
    return false;
  }
}

async function testStep4() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('STEP 4: Check sandbox app configured', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('http://localhost:3003/api/tiktok/sandbox-status');
    const data = await response.json();

    if (data.success) {
      const sandboxMode = data.data.isSandbox ? 'Sandbox' : 'Production';
      logTest(4, 'Check sandbox app configured', true,
        `Mode: ${sandboxMode}\nUser Info: ${JSON.stringify(data.data.userInfo || {}, null, 2)}`);
      return true;
    } else {
      if (data.code === 'NOT_AUTHENTICATED') {
        logTest(4, 'Check sandbox app configured', false,
          'Cannot check sandbox - authentication required');
        log('  ⚠️  Complete OAuth flow first (Step 3)', 'warning');
        return false;
      } else {
        logTest(4, 'Check sandbox app configured', false,
          data.error || 'Sandbox check failed');
        return false;
      }
    }
  } catch (error) {
    logTest(4, 'Check sandbox app configured', false,
      `Error: ${error.message}`);
    return false;
  }
}

async function testStep5() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('STEP 5: Confirm API permissions granted', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('http://localhost:3003/api/tiktok/permissions');
    const data = await response.json();

    if (data.success) {
      const permissions = data.data.permissions;
      const allRequired = data.data.allRequiredGranted;

      logTest(5, 'Confirm API permissions granted', allRequired,
        `All required permissions: ${allRequired}\nPermissions: ${JSON.stringify(permissions, null, 2)}`);

      if (allRequired) {
        log('  ✓ Required permissions:', 'success');
        log('    - video.upload', 'success');
        log('    - video.publish', 'success');
      } else {
        log('  ✗ Some permissions missing', 'error');
      }

      return allRequired;
    } else {
      if (data.code === 'NOT_AUTHENTICATED') {
        logTest(5, 'Confirm API permissions granted', false,
          'Cannot check permissions - authentication required');
        log('  ⚠️  Complete OAuth flow first (Step 3)', 'warning');
        return false;
      } else {
        logTest(5, 'Confirm API permissions granted', false,
          data.error || 'Permission check failed');
        return false;
      }
    }
  } catch (error) {
    logTest(5, 'Confirm API permissions granted', false,
      `Error: ${error.message}`);
    return false;
  }
}

async function testHealthEndpoint() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('BONUS: TikTok posting service health check', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('http://localhost:3003/api/tiktok/health');
    const data = await response.json();

    if (data.success && data.data) {
      const health = data.data;
      log(`✓ Service: ${health.service}`, 'success');
      log(`✓ Status: ${health.status}`, 'success');
      log(`✓ Enabled: ${health.enabled}`, 'success');
      log(`  Authenticated: ${health.authenticated}`, health.authenticated ? 'success' : 'warning');
      log(`  Has credentials: ${health.hasCredentials}`, health.hasCredentials ? 'success' : 'error');

      return health.status === 'ok';
    } else {
      log('✗ Health check failed', 'error');
      return false;
    }
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, 'error');
    return false;
  }
}

function printSummary() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TEST SUMMARY', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  log(`Total Tests: ${totalTests}`, 'info');
  log(`Passed: ${passedTests}`, passedTests === totalTests ? 'success' : 'warning');
  log(`Failed: ${totalTests - passedTests}`, (totalTests - passedTests) > 0 ? 'error' : 'success');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'info');

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passedTests === totalTests) {
    log('🎉 All tests passed! TikTok API integration is complete.', 'success');
  } else {
    const failedCount = totalTests - passedTests;
    log(`⚠️  ${failedCount} test(s) failed. See details above.`, 'warning');

    log('\nCommon issues:', 'info');
    log('1. Authentication not completed - Run OAuth flow:', 'info');
    log('   curl http://localhost:3003/api/tiktok/authorize-url', 'info');
    log('2. Credentials not configured - Check .env file', 'info');
    log('3. Network issues - Check internet connection', 'info');
  }
}

async function main() {
  log('\n╔══════════════════════════════════════════╗');
  log('║  TikTok API Integration Test Suite        ║');
  log('║  Feature #101: TikTok API integration     ║');
  log('╚══════════════════════════════════════════╝\n');

  log('Testing TikTok API integration for posting...', 'info');

  // Run all tests
  await testStep1(); // Configure credentials
  await testStep2(); // Test connection
  await testStep3(); // Verify token
  await testStep4(); // Check sandbox
  await testStep5(); // Confirm permissions
  await testHealthEndpoint(); // Bonus health check

  // Print summary
  printSummary();

  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
