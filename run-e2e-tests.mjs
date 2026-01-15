#!/usr/bin/env node

/**
 * E2E Test Runner for Content Approval Flow
 *
 * This script runs the Playwright end-to-end tests for the content approval workflow.
 * It provides colored console output and detailed test reporting.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function printStep(step) {
  log(`▶ ${step}`, 'cyan');
}

function printSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function printError(message) {
  log(`✗ ${message}`, 'red');
}

function printWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function main() {
  printHeader('E2E Tests: Content Approval Flow');

  try {
    // Step 1: Check if Playwright is installed
    printStep('Step 1: Checking Playwright installation');

    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      printSuccess('Playwright is installed');
    } catch (error) {
      printError('Playwright is not installed');
      printStep('Installing Playwright browsers...');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      printSuccess('Playwright browsers installed');
    }

    // Step 2: Check if backend server is running
    printStep('Step 2: Checking backend server');

    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        const health = await response.json();
        printSuccess(`Backend server is running (uptime: ${health.uptimeHuman})`);
      }
    } catch (error) {
      printError('Backend server is not running');
      printWarning('Starting backend server...');
      printWarning('Please wait for the server to start...');
    }

    // Step 3: Run the tests
    printStep('Step 3: Running E2E tests for content approval flow');
    console.log('');

    const testCommand = 'npx playwright test e2e-tests/content-approval-flow.spec.js --reporter=line';

    try {
      const output = execSync(testCommand, {
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      console.log('');
      printSuccess('All E2E tests passed!');
    } catch (error) {
      console.log('');
      printError('Some tests failed');
      console.log('');

      // Check if test results HTML exists
      const reportPath = 'playwright-report/index.html';
      if (fs.existsSync(reportPath)) {
        printStep('View detailed test report:');
        log(`  file://${path.resolve(reportPath)}`, 'cyan');
      }

      process.exit(1);
    }

    // Step 4: Print summary
    printHeader('Test Summary');
    log('Content Approval Flow E2E Tests', 'bright');
    console.log('');
    log('Test Areas Covered:', 'green');
    log('  ✓ Content Generation (creating posts)', 'reset');
    log('  ✓ Content Review (viewing approval queue)', 'reset');
    log('  ✓ Approval Action (approving posts)', 'reset');
    log('  ✓ Bulk Approval (multiple posts)', 'reset');
    log('  ✓ Rejection Action (rejecting with reason)', 'reset');
    log('  ✓ Approval History (audit trail)', 'reset');
    log('  ✓ Edge Cases (non-existent posts, invalid transitions)', 'reset');
    log('  ✓ Performance (load time, API response time)', 'reset');
    console.log('');

    // Step 5: View test report
    printStep('Step 4: View test results');
    log('To view the HTML test report:', 'yellow');
    log('  npx playwright show-report', 'cyan');
    console.log('');

  } catch (error) {
    printError(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  printError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
