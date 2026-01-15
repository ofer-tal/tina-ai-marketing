#!/usr/bin/env node

/**
 * Load Test Runner
 *
 * Runs load testing suite and provides detailed performance reporting.
 * Feature #197: Load tests for concurrent operations
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  log('\n' + '='.repeat(80), 'cyan');
  log(text, 'bright');
  log('='.repeat(80), 'cyan');
}

async function checkServerHealth() {
  log('\n🔍 Checking server health...', 'blue');

  try {
    const response = await fetch('http://localhost:3001/api/health');

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const health = await response.json();
    log('✅ Server is healthy', 'green');
    log(`   Environment: ${health.environment}`, 'cyan');
    log(`   Uptime: ${health.uptimeHuman}`, 'cyan');
    log(`   Database: ${health.database.connected ? 'Connected' : 'Disconnected'}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Server health check failed: ${error.message}`, 'red');
    log('\n💡 Make sure the backend server is running:', 'yellow');
    log('   npm run dev:backend', 'cyan');
    return false;
  }
}

async function runLoadTests() {
  header('LOAD TESTING SUITE - Feature #197');

  log('\n📊 Test Configuration:', 'blue');
  log('   Concurrent Users: 100', 'cyan');
  log('   Requests per User: 10', 'cyan');
  log('   Total Requests: 1000', 'cyan');
  log('   Max Response Time: 2000ms', 'cyan');
  log('   Max Error Rate: 5%', 'cyan');

  // Check server health
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }

  log('\n🚀 Starting load tests...', 'blue');
  log('   This may take 2-3 minutes to complete...\n', 'yellow');

  try {
    // Run the load tests
    const testOutput = execSync(
      'npx vitest run backend/tests/load-testing.test.js --reporter=verbose',
      {
        stdio: 'inherit',
        timeout: 180000 // 3 minutes
      }
    );

    log('\n✅ Load testing complete!', 'green');

    // Display summary
    header('LOAD TEST RESULTS');

    log('\n📊 Key Metrics:', 'blue');
    log('   View the test output above for detailed results', 'cyan');
    log('   including response times, error rates, and bottlenecks', 'cyan');

    log('\n✅ All load tests passed!', 'green');
    log('\n💡 Next steps:', 'yellow');
    log('   1. Review the bottleneck analysis in the test output', 'cyan');
    log('   2. Consider implementing the recommended optimizations', 'cyan');
    log('   3. Re-run tests after optimizations to verify improvements', 'cyan');

  } catch (error) {
    log('\n❌ Load testing failed!', 'red');
    log(`   Error: ${error.message}`, 'red');

    if (error.status) {
      log(`   Exit code: ${error.status}`, 'red');
    }

    log('\n💡 Troubleshooting:', 'yellow');
    log('   1. Ensure the backend server is running on port 3001', 'cyan');
    log('   2. Check that MongoDB is connected', 'cyan');
    log('   3. Verify environment variables are set', 'cyan');
    log('   4. Review the error output above for details', 'cyan');

    process.exit(1);
  }
}

// Run the tests
runLoadTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
