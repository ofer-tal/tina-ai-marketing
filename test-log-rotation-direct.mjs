#!/usr/bin/env node

/**
 * Direct test of Log Rotation Job (without HTTP API)
 * Tests the job implementation directly
 */

import logRotationJob from './backend/jobs/logRotationJob.js';

const testsPassed = [];
const testsFailed = [];

function success(message) {
  console.log(`✓ ${message}`);
  testsPassed.push(message);
}

function error(message) {
  console.log(`✗ ${message}`);
  testsFailed.push(message);
}

function info(message) {
  console.log(`ℹ ${message}`);
}

function section(message) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(message);
  console.log('='.repeat(60));
}

async function runTests() {
  section('TESTING LOG ROTATION JOB FEATURE #249');

  try {
    // Test 1: Job initialization
    section('TEST 1: Job Initialization');
    const config = logRotationJob.getConfig();
    if (config.logDirectory) {
      success(`Log directory configured: ${config.logDirectory}`);
    } else {
      error('Log directory not configured');
    }
    if (config.rotationSchedule) {
      success(`Rotation schedule configured: ${config.rotationSchedule}`);
    } else {
      error('Rotation schedule not configured');
    }
    if (config.retentionDays) {
      success(`Retention days configured: ${config.retentionDays}`);
    } else {
      error('Retention days not configured');
    }

    // Test 2: Start job
    section('TEST 2: Start Job');
    logRotationJob.start();
    const stats = logRotationJob.getStats();
    if (stats.isRunning) {
      success('Log rotation job started successfully');
    } else {
      error('Log rotation job failed to start');
    }

    // Test 3: Execute log rotation
    section('TEST 3: Execute Log Rotation');
    info('Executing log rotation (this may take a moment)...');
    const results = await logRotationJob.execute();

    if (results.success) {
      success('Log rotation executed successfully');
      success(`Duration: ${results.duration}ms`);
    } else {
      error('Log rotation execution failed');
    }

    // Test 4: Check rotation results
    section('TEST 4: Rotation Results');
    if (results.rotation) {
      success(`Rotated ${results.rotation.count} log files`);
      info(`Rotated files: ${JSON.stringify(results.rotation.rotated, null, 2)}`);
    } else {
      error('No rotation results');
    }

    // Test 5: Check compression results
    section('TEST 5: Compression Results');
    if (results.compression) {
      success(`Compressed ${results.compression.count} log files`);
      info(`Compressed files: ${JSON.stringify(results.compression.compressed, null, 2)}`);
    } else {
      error('No compression results');
    }

    // Test 6: Check deletion results
    section('TEST 6: Deletion Results');
    if (results.deletion) {
      success(`Deleted ${results.deletion.count} expired log files`);
      info(`Deleted files: ${JSON.stringify(results.deletion.deleted, null, 2)}`);
    } else {
      error('No deletion results');
    }

    // Test 7: Check verification results
    section('TEST 7: Verification Results');
    if (results.verification) {
      success(`Verified ${results.verification.preserved} active logs preserved`);
      info(`Verified logs: ${JSON.stringify(results.verification.verified, null, 2)}`);
      if (results.verification.missing.length === 0) {
        success('No active logs missing');
      } else {
        info(`Missing logs recreated: ${JSON.stringify(results.verification.missing)}`);
      }
    } else {
      error('No verification results');
    }

    // Test 8: Check disk usage results
    section('TEST 8: Disk Usage Results');
    if (results.diskUsage) {
      success(`Disk usage monitoring completed`);
      success(`Total bytes: ${results.diskUsage.bytes}`);
      success(`Usage percent: ${results.diskUsage.percent}%`);
      success(`Status: ${results.diskUsage.status}`);
      success(`Number of files: ${results.diskUsage.files}`);
      info(`Max bytes: ${results.diskUsage.maxBytes}`);
      info(`Max percent: ${results.diskUsage.maxPercent}`);
    } else {
      error('No disk usage results');
    }

    // Test 9: List log files
    section('TEST 9: List Log Files');
    const logFiles = await logRotationJob.listLogFiles();
    if (Array.isArray(logFiles)) {
      success(`Retrieved ${logFiles.length} log files`);
      info(`Log files: ${JSON.stringify(logFiles.map(f => ({ name: f.name, size: f.size })), null, 2)}`);
    } else {
      error('Failed to list log files');
    }

    // Test 10: Get statistics
    section('TEST 10: Get Statistics');
    const finalStats = logRotationJob.getStats();
    if (finalStats.lastRun) {
      success(`Last run: ${finalStats.lastRun}`);
    }
    if (finalStats.totalRuns > 0) {
      success(`Total runs: ${finalStats.totalRuns}`);
    }
    if (finalStats.totalRotated > 0) {
      success(`Total rotated: ${finalStats.totalRotated}`);
    }
    if (finalStats.totalCompressed > 0) {
      success(`Total compressed: ${finalStats.totalCompressed}`);
    }
    if (finalStats.totalDeleted > 0) {
      success(`Total deleted: ${finalStats.totalDeleted}`);
    }

    // Stop job
    section('Cleanup');
    logRotationJob.stop();
    success('Log rotation job stopped');

    // Summary
    section('TEST SUMMARY');
    console.log(`Tests Passed: ${testsPassed.length}`);
    console.log(`Tests Failed: ${testsFailed.length}`);

    if (testsFailed.length === 0) {
      console.log('\n✓ All tests passed!');
    } else {
      console.log('\n✗ Some tests failed');
      testsFailed.forEach(test => console.log(`  - ${test}`));
    }

  } catch (err) {
    error(`Test suite failed: ${err.message}`);
    console.error(err.stack);
  }
}

// Run tests
runTests().then(() => {
  process.exit(testsFailed.length > 0 ? 1 : 0);
});
