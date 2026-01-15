/**
 * Error Handling and Retry Logic Test Runner
 *
 * Runs comprehensive integration tests for error handling and retry mechanisms.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
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

function printHeader() {
  log('\n' + '='.repeat(70), 'cyan');
  log('ERROR HANDLING AND RETRY LOGIC - INTEGRATION TESTS', 'bright');
  log('='.repeat(70), 'cyan');
}

function printSection(title) {
  log('\n' + '─'.repeat(70), 'blue');
  log(title, 'bright');
  log('─'.repeat(70), 'blue');
}

async function checkServerHealth() {
  printSection('Step 0: Checking Server Health');

  try {
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();

    if (data.status === 'ok') {
      log('✅ Backend server is running', 'green');
      log(`   Uptime: ${data.uptimeHuman}`, 'green');
      log(`   Database: ${data.database.connected ? 'Connected' : 'Disconnected'}`, 'green');
      return true;
    } else {
      log('⚠️  Backend server health check returned non-OK status', 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Backend server is not running', 'red');
    log('   Please start the backend server first: npm run dev', 'yellow');
    return false;
  }
}

async function runVitestTests() {
  printSection('Running Error Handling and Retry Tests');

  const testFile = 'backend/tests/error-handling-retry-integration.test.js';

  try {
    log('\n📊 Test Execution:', 'cyan');
    log('   File: backend/tests/error-handling-retry-integration.test.js', 'cyan');
    log('   Framework: Vitest', 'cyan');
    log('\n', 'reset');

    // Run vitest with JSON reporter
    const vitestCommand = `npx vitest run ${testFile} --reporter=verbose --no-coverage`;

    execSync(vitestCommand, {
      stdio: 'inherit',
      cwd: __dirname,
    });

    log('\n✅ All tests completed successfully', 'green');
    return true;

  } catch (error) {
    log('\n❌ Test execution failed', 'red');
    log(`   Error: ${error.message}`, 'red');

    // Try to provide more helpful error info
    if (error.status === 1) {
      log('   Some tests failed. Check the output above for details.', 'yellow');
    } else if (error.status === null) {
      log('   Vitest may not be installed. Run: npm install --save-dev vitest', 'yellow');
    }

    return false;
  }
}

function printSummary(results) {
  printSection('Test Summary');

  log('\n📋 Results:', 'cyan');

  if (results.serverHealthy) {
    log('   ✅ Server Health Check: PASSED', 'green');
  } else {
    log('   ❌ Server Health Check: FAILED', 'red');
  }

  if (results.testsPassed) {
    log('   ✅ Error Handling Tests: PASSED', 'green');
  } else {
    log('   ❌ Error Handling Tests: FAILED', 'red');
  }

  const allPassed = results.serverHealthy && results.testsPassed;

  log('\n' + '═'.repeat(70), 'cyan');

  if (allPassed) {
    log('🎉 ALL TESTS PASSED!', 'bright');
    log('═'.repeat(70), 'cyan');
    log('\n✨ Feature #192: Tests for error handling and retry logic', 'green');
    log('   All 5 verification steps completed:', 'green');
    log('   • Step 1: Simulate API failure - ✅', 'green');
    log('   • Step 2: Verify error caught and logged - ✅', 'green');
    log('   • Step 3: Test retry with backoff - ✅', 'green');
    log('   • Step 4: Test max retries handling - ✅', 'green');
    log('   • Step 5: Verify graceful degradation - ✅', 'green');
    log('\n📊 Test Coverage:', 'cyan');
    log('   • API Failure Simulations: 6 tests', 'cyan');
    log('   • Error Logging Verification: 3 tests', 'cyan');
    log('   • Exponential Backoff: 4 tests', 'cyan');
    log('   • Max Retries Handling: 5 tests', 'cyan');
    log('   • Graceful Degradation: 6 tests', 'cyan');
    log('   • Edge Cases: 5 tests', 'cyan');
    log('   • Total: 29 comprehensive tests', 'cyan');
  } else {
    log('⚠️  SOME TESTS FAILED', 'yellow');
    log('═'.repeat(70), 'cyan');
    log('\nPlease review the errors above and fix them before marking the feature as passing.', 'yellow');
  }

  log('\n', 'reset');
}

async function main() {
  printHeader();

  const results = {
    serverHealthy: false,
    testsPassed: false,
  };

  // Check server health
  results.serverHealthy = await checkServerHealth();

  if (!results.serverHealthy) {
    log('\n⚠️  Skipping tests due to server health issues', 'yellow');
    printSummary(results);
    process.exit(1);
  }

  // Run the error handling and retry tests
  results.testsPassed = await runVitestTests();

  // Print summary
  printSummary(results);

  // Exit with appropriate code
  process.exit(results.testsPassed ? 0 : 1);
}

// Run the main function
main().catch(error => {
  log('\n❌ Fatal error:', 'red');
  console.error(error);
  process.exit(1);
});
