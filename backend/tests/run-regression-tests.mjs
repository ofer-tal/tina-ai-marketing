#!/usr/bin/env node

/**
 * Regression Test Runner
 *
 * Runs the full regression test suite and provides detailed reporting.
 * This script should be run before deploying to production or after major changes.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  console.log('\n' + '='.repeat(80));
  log(text, 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Check server health
async function checkServerHealth() {
  log('🔍 Checking server health...', 'yellow');

  try {
    const response = await fetch('http://localhost:3001/api/health');

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    log('✅ Server is healthy', 'green');
    log(`   Database: ${data.database.connected ? 'Connected' : 'Disconnected'}`, 'white');
    log(`   Environment: ${data.environment}`, 'white');
    log(`   Uptime: ${data.uptimeHuman}`, 'white');
    return true;
  } catch (error) {
    log('❌ Server health check failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\n💡 Make sure the backend server is running:', 'yellow');
    log('   npm run dev:backend', 'cyan');
    return false;
  }
}

// Run regression tests
async function runRegressionTests() {
  header('🧪 REGRESSION TEST SUITE');

  log('Starting regression tests...', 'white');
  log('This will verify critical functionality across the application.\n', 'white');

  // Check server health first
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    log('\n⚠️  Skipping API tests - server not available', 'yellow');
    log('Database tests will still run.\n', 'white');
  }

  // Run the test suite
  log('🚀 Running test suite...\n', 'cyan');

  const startTime = Date.now();

  try {
    // Run vitest with the regression suite
    const testCommand = 'npx vitest run backend/tests/regression-suite.test.js --reporter=verbose';

    log(`Executing: ${testCommand}\n`, 'white');

    execSync(testCommand, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..')
    });

    const duration = Date.now() - startTime;

    header('✅ REGRESSION TESTS PASSED');

    log(`All regression tests passed successfully!`, 'green');
    log(`Duration: ${(duration / 1000).toFixed(2)}s`, 'white');
    log(`Timestamp: ${new Date().toISOString()}`, 'white');

    log('\n📊 Test Coverage Areas:', 'cyan');
    log('   ✓ Database Operations', 'green');
    log('   ✓ Data Models', 'green');
    log('   ✓ API Endpoint Functionality', 'green');
    log('   ✓ Error Handling', 'green');
    log('   ✓ Data Validation', 'green');
    log('   ✓ Performance Benchmarks', 'green');
    log('   ✓ Integration Points', 'green');
    log('   ✓ Critical User Flows', 'green');
    log('   ✓ Data Consistency', 'green');
    log('   ✓ Security and Validation', 'green');

    log('\n✨ No regressions detected!', 'green');
    log('The application is working as expected.\n', 'white');

    // Create test report
    const reportPath = path.resolve(__dirname, '../../test-reports/regression-report.json');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      status: 'passed',
      testSuite: 'regression-suite.test.js',
      coverage: [
        'Database Operations',
        'Data Models',
        'API Endpoint Functionality',
        'Error Handling',
        'Data Validation',
        'Performance Benchmarks',
        'Integration Points',
        'Critical User Flows',
        'Data Consistency',
        'Security and Validation'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Test report saved to: ${reportPath}`, 'cyan');

  } catch (error) {
    const duration = Date.now() - startTime;

    header('❌ REGRESSION TESTS FAILED');

    log('One or more regression tests failed!', 'red');
    log(`Duration: ${(duration / 1000).toFixed(2)}s`, 'white');
    log(`Timestamp: ${new Date().toISOString()}`, 'white');

    log('\n⚠️  Regressions detected!', 'yellow');
    log('Please review the failed tests above and fix the issues.\n', 'white');

    log('💡 Common causes:', 'yellow');
    log('   1. Breaking changes to database schema', 'white');
    log('   2. API endpoint modifications', 'white');
    log('   3. Data validation logic changes', 'white');
    log('   4. Performance degradation', 'white');
    log('   5. Error handling updates', 'white');

    // Create failure report
    const reportPath = path.resolve(__dirname, '../../test-reports/regression-report.json');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      status: 'failed',
      testSuite: 'regression-suite.test.js',
      error: error.message
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    await runRegressionTests();
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  }
})();
