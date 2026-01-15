#!/usr/bin/env node

/**
 * Test Runner for Budget Alert System Integration Tests (Feature #193)
 *
 * This script runs the budget alert integration tests and provides
 * detailed output with colored formatting.
 */

import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import { URL, fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
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

function logSection(title) {
  console.log('');
  log('═'.repeat(80), 'cyan');
  log(title, 'bright');
  log('═'.repeat(80), 'cyan');
}

async function checkServerHealth() {
  logSection('Checking Server Health');

  try {
    const response = await fetch('http://localhost:3001/api/health');

    if (!response.ok) {
      log('✗ Server health check failed', 'red');
      return false;
    }

    const data = await response.json();
    log('✓ Server is healthy', 'green');
    log(`  Status: ${data.status}`, 'dim');
    log(`  Environment: ${data.environment}`, 'dim');
    log(`  Uptime: ${data.uptimeHuman}`, 'dim');
    log(`  Database: ${data.database.connected ? 'Connected' : 'Disconnected'}`, 'dim');

    return true;
  } catch (error) {
    log('✗ Cannot connect to server at http://localhost:3001', 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function verifyBudgetEndpoints() {
  logSection('Verifying Budget Alert Endpoints');

  const endpoints = [
    { path: '/api/dashboard/budget-utilization', name: 'Budget Utilization' },
    { path: '/api/dashboard/alerts', name: 'Alert Notifications' }
  ];

  let allAvailable = true;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3001${endpoint.path}`);

      if (response.ok) {
        const data = await response.json();
        log(`✓ ${endpoint.name}`, 'green');
        log(`  ${endpoint.path}`, 'dim');

        // Show relevant data snippets
        if (endpoint.name === 'Budget Utilization') {
          log(`  Alert Level: ${data.alert.level || 'normal'}`, 'dim');
          log(`  Utilization: ${data.utilization.percent || 0}%`, 'dim');
          log(`  Thresholds: Warning at ${data.thresholds.warning}%, Critical at ${data.thresholds.critical}%`, 'dim');
        } else if (endpoint.name === 'Alert Notifications') {
          log(`  Total Alerts: ${data.summary.total}`, 'dim');
          log(`  Critical: ${data.summary.critical}, Warning: ${data.summary.warning}, Info: ${data.summary.info}`, 'dim');
        }
      } else {
        log(`✗ ${endpoint.name} - HTTP ${response.status}`, 'red');
        allAvailable = false;
      }
    } catch (error) {
      log(`✗ ${endpoint.name} - ${error.message}`, 'red');
      allAvailable = false;
    }
  }

  return allAvailable;
}

async function runTests() {
  logSection('Running Budget Alert System Integration Tests');

  return new Promise((resolve) => {
    const testFile = join(__dirname, 'backend', 'tests', 'budget-alert-integration.test.js');

    exec(`npx vitest run "${testFile}" --reporter=verbose`, (error, stdout, stderr) => {
      if (error) {
        log('Test execution failed', 'red');
        console.error(stderr);
        resolve(false);
        return;
      }

      // Parse and display test results
      const lines = stdout.split('\n');
      let inTestResults = false;

      for (const line of lines) {
        // Highlight test file
        if (line.includes('budget-alert-integration.test.js')) {
          log(line, 'cyan');
          inTestResults = true;
          continue;
        }

        // Highlight suite descriptions
        if (line.includes('Step 1:') || line.includes('Step 2:') ||
            line.includes('Step 3:') || line.includes('Step 4:') ||
            line.includes('Step 5:') ||
            line.includes('Edge Cases') || line.includes('Data Validation')) {
          log(line, 'bright');
          continue;
        }

        // Colorize test results
        if (line.includes('✓') || line.includes('PASS')) {
          log(line, 'green');
        } else if (line.includes('✗') || line.includes('FAIL')) {
          log(line, 'red');
        } else if (line.includes('›')) {
          log(line, 'dim');
        } else {
          console.log(line);
        }
      }

      resolve(true);
    });
  });
}

async function generateSummary() {
  logSection('Test Summary');

  try {
    const response = await fetch('http://localhost:3001/api/dashboard/budget-utilization');
    const budgetData = await response.json();

    const alertsResponse = await fetch('http://localhost:3001/api/dashboard/alerts');
    const alertsData = await alertsResponse.json();

    log('Budget Alert System Status:', 'bright');

    // Budget Utilization Summary
    log(`  Budget Utilization:`, 'cyan');
    log(`    Monthly Budget: $${budgetData.budget.monthly}`, 'dim');
    log(`    Spent: $${budgetData.budget.spent}`, 'dim');
    log(`    Remaining: $${budgetData.budget.remaining}`, 'dim');
    log(`    Utilization: ${budgetData.utilization.percent}%`, 'dim');
    log(`    Alert Level: ${budgetData.alert.level}`, budgetData.alert.level === 'critical' ? 'red' :
                              budgetData.alert.level === 'warning' ? 'yellow' : 'green');

    // Thresholds Summary
    log(`  Alert Thresholds:`, 'cyan');
    log(`    Warning: ${budgetData.thresholds.warning}%`, 'dim');
    log(`    Critical: ${budgetData.thresholds.critical}%`, 'dim');

    // Alerts Summary
    log(`  Active Alerts:`, 'cyan');
    log(`    Total: ${alertsData.summary.total}`, 'dim');
    log(`    Critical: ${alertsData.summary.critical}`, 'dim');
    log(`    Warning: ${alertsData.summary.warning}`, 'dim');
    log(`    Info: ${alertsData.summary.info}`, 'dim');

    // Budget-specific alerts
    const budgetAlerts = alertsData.alerts.filter(a => a.type === 'budget');
    if (budgetAlerts.length > 0) {
      log(`  Budget Alerts:`, 'yellow');
      budgetAlerts.forEach(alert => {
        log(`    [${alert.severity.toUpperCase()}] ${alert.title}`, 'dim');
        log(`      ${alert.message}`, 'dim');
      });
    } else {
      log(`  No active budget alerts`, 'green');
    }

  } catch (error) {
    log(`✗ Failed to generate summary: ${error.message}`, 'red');
  }
}

async function main() {
  console.clear();

  log('', 'reset');
  log('╔══════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          Budget Alert System Integration Test Suite (Feature #193)          ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  log('', 'reset');

  // Step 1: Check server health
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    log('', 'reset');
    log('✗ Server is not available. Please start the development server:', 'red');
    log('  npm run dev', 'dim');
    log('', 'reset');
    process.exit(1);
  }

  // Step 2: Verify budget endpoints
  const endpointsAvailable = await verifyBudgetEndpoints();
  if (!endpointsAvailable) {
    log('', 'reset');
    log('✗ Some endpoints are not available. Tests may fail.', 'yellow');
    log('', 'reset');
  }

  // Step 3: Run tests
  const testsPassed = await runTests();

  // Step 4: Generate summary
  await generateSummary();

  // Final summary
  logSection('Test Run Complete');

  if (testsPassed) {
    log('✓ All budget alert system tests completed successfully!', 'green');
    log('', 'reset');
    log('Test Coverage:', 'bright');
    log('  ✓ Step 1: Budget thresholds configured correctly', 'green');
    log('  ✓ Step 2: Warning alerts generated at 70%', 'green');
    log('  ✓ Step 3: Critical threshold at 90%', 'green');
    log('  ✓ Step 4: Auto-pause recommendations included', 'green');
    log('  ✓ Step 5: Alert notifications working', 'green');
    log('  ✓ Edge cases and error handling', 'green');
    log('  ✓ Data validation', 'green');
  } else {
    log('✗ Some tests failed. Please review the output above.', 'red');
  }

  log('', 'reset');
}

main().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
