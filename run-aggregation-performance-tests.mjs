#!/usr/bin/env node

/**
 * Run Data Aggregation Performance Tests
 *
 * Automated test runner for data aggregation performance tests
 * with colored output and detailed reporting.
 */

import { execSync } from 'child_process';
import readline from 'readline';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Print colored text to console
 */
function print(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(text) {
  console.log('\n' + '='.repeat(80));
  print('cyan', text);
  console.log('='.repeat(80));
}

/**
 * Check if server is running
 */
function checkServerHealth() {
  try {
    const response = execSync('curl -s http://localhost:3001/api/health', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const health = JSON.parse(response);
    return health.status === 'ok';
  } catch (error) {
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  printHeader('🚀 DATA AGGREGATION PERFORMANCE TEST SUITE');

  // Check server health
  console.log('\n📡 Checking server health...');
  if (!checkServerHealth()) {
    print('red', '❌ Backend server is not running!');
    print('yellow', 'Please start the backend server first:');
    print('cyan', '  npm run dev:backend');
    process.exit(1);
  }
  print('green', '✅ Backend server is healthy\n');

  // Run tests
  printHeader('🧪 Running Performance Tests');

  const startTime = Date.now();

  try {
    execSync('npx vitest run backend/tests/data-aggregation-performance.test.js --reporter=verbose', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    const duration = Date.now() - startTime;

    printHeader('✅ Performance Tests Completed');
    print('green', `Total duration: ${(duration / 1000).toFixed(2)}s\n`);

  } catch (error) {
    const duration = Date.now() - startTime;

    printHeader('❌ Performance Tests Failed');
    print('red', `Some tests failed after ${(duration / 1000).toFixed(2)}s\n`);
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  print('red', `\n❌ Error running tests: ${error.message}`);
  process.exit(1);
});
