#!/usr/bin/env node

/**
 * Content Moderation Integration Test Runner
 *
 * Runs comprehensive tests for content moderation functionality
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator(char = '=', length = 80) {
  console.log(char.repeat(length));
}

async function checkServerHealth() {
  log('\n🔍 Checking server health...', 'cyan');

  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      log('✅ Server is running and healthy', 'green');
      return true;
    }
  } catch (error) {
    log('❌ Server is not running', 'red');
    log('   Please start the server with: npm run dev', 'yellow');
    return false;
  }
}

async function runTests() {
  separator('=');
  log('CONTENT MODERATION INTEGRATION TESTS', 'bright');
  log('Feature #194: Tests for content moderation', 'cyan');
  separator('=');

  // Check server health
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }

  log('\n🧪 Running content moderation tests...', 'cyan');
  separator('-');

  const startTime = Date.now();

  try {
    // Run vitest with the content moderation test file
    const testCommand = 'npx vitest run backend/tests/content-moderation-integration.test.js --reporter=verbose';

    log('\n📋 Test Execution:', 'cyan');
    separator('-');

    execSync(testCommand, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    separator('-');
    log(`\n✅ All content moderation tests passed!`, 'green');
    log(`⏱️  Duration: ${duration}s`, 'cyan');

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    separator('-');
    log(`\n❌ Some tests failed`, 'red');
    log(`⏱️  Duration: ${duration}s`, 'cyan');

    log('\n📊 Test Summary:', 'yellow');
    log('   - Please review the failed tests above', 'red');
    log('   - Check that content moderation service is working correctly', 'yellow');
    log('   - Verify flag detection and recommendation generation', 'yellow');

    process.exit(1);
  }

  separator('=');
  log('\n✨ Content moderation testing complete!\n', 'green');
}

// Main execution
(async () => {
  try {
    await runTests();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
})();
