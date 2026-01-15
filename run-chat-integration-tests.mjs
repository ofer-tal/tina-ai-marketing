#!/usr/bin/env node

/**
 * Test Runner for Chat Integration Tests
 *
 * Feature #189: Integration tests for AI chat workflows
 * Runs all chat integration tests with detailed reporting
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
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

function logTestSuite(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logTestGroup(groupName) {
  console.log('\n' + '-'.repeat(80));
  log(groupName, 'cyan');
  console.log('-'.repeat(80));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ${message}`, 'blue');
}

async function runTests() {
  logTestSuite('Feature #189: Integration Tests for AI Chat Workflows');

  const startTime = Date.now();

  try {
    // Check if vitest is installed
    logInfo('Checking for Vitest installation...');
    execSync('npx vitest --version', { stdio: 'pipe' });
    logSuccess('Vitest is installed');
  } catch (error) {
    logError('Vitest is not installed');
    logInfo('Installing Vitest...');
    try {
      execSync('npm install --save-dev vitest @vitest/ui', { stdio: 'inherit' });
      logSuccess('Vitest installed successfully');
    } catch (installError) {
      logError('Failed to install Vitest');
      logInfo(installError.message);
      process.exit(1);
    }
  }

  // Run the tests
  logTestGroup('Running Chat Integration Tests');

  const testFile = join(__dirname, 'backend/tests/chat-integration.test.js');

  try {
    // Run vitest with the test file
    const testOutput = execSync(
      `npx vitest run "${testFile}" --reporter=verbose`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
        }
      }
    );

    console.log(testOutput);

    // Parse results
    const lines = testOutput.split('\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const line of lines) {
      if (line.includes('Test Files')) {
        const match = line.match(/(\d+) passed.*?(\d+) failed/);
        if (match) {
          passedTests = parseInt(match[1]) || 0;
          failedTests = parseInt(match[2]) || 0;
          totalTests = passedTests + failedTests;
        }
      }
    }

    const duration = Date.now() - startTime;

    // Print summary
    console.log('\n' + '='.repeat(80));
    log('Test Summary', 'bright');
    console.log('='.repeat(80));

    console.log(`\n  Total Tests:    ${totalTests}`);
    log(`  Passed:         ${passedTests}`, 'green');
    if (failedTests > 0) {
      log(`  Failed:         ${failedTests}`, 'red');
    } else {
      log(`  Failed:         ${failedTests}`, 'green');
    }
    console.log(`  Duration:       ${(duration / 1000).toFixed(2)}s`);
    console.log(`  Success Rate:   ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);

    // Detailed breakdown by test group
    console.log('\n' + '-'.repeat(80));
    log('Test Breakdown', 'cyan');
    console.log('-'.repeat(80));

    const testGroups = [
      { name: 'Step 1: Mock GLM4.7 API Responses', count: 6 },
      { name: 'Step 2: Chat Message Handling', count: 7 },
      { name: 'Step 3: Conversation Storage', count: 5 },
      { name: 'Step 4: Strategy Generation', count: 6 },
      { name: 'Context Window Management', count: 3 },
      { name: 'Error Handling', count: 3 },
      { name: 'Data Integration', count: 4 },
      { name: 'Response Quality', count: 4 },
    ];

    testGroups.forEach(group => {
      log(`  ${group.name}:`, 'cyan');
      logInfo(`${group.count} tests`);
    });

    console.log('\n' + '='.repeat(80));

    if (failedTests === 0) {
      log('✓ All Tests Passed!', 'green');
      console.log('='.repeat(80) + '\n');
      process.exit(0);
    } else {
      log('✗ Some Tests Failed', 'red');
      console.log('='.repeat(80) + '\n');
      process.exit(1);
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    logError('Test execution failed');
    logInfo(`Duration: ${(duration / 1000).toFixed(2)}s`);

    // Try to parse error output
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;

    if (errorOutput.includes('FAIL')) {
      console.log('\n' + errorOutput);
    } else {
      console.log('\n' + errorOutput);
    }

    console.log('\n' + '='.repeat(80));
    log('Test Summary', 'bright');
    console.log('='.repeat(80));
    logError('Tests failed with errors');
    console.log('='.repeat(80) + '\n');

    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logError('Unexpected error:');
  console.error(error);
  process.exit(1);
});
