#!/usr/bin/env node

/**
 * Test script for Log Rotation and Cleanup Feature (#249)
 *
 * Tests all 5 steps:
 * 1. Set up weekly log rotation
 * 2. Compress old logs
 * 3. Delete logs older than 30 days
 * 4. Verify active logs preserved
 * 5. Monitor log disk usage
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';
let testsPassed = 0;
let testsFailed = 0;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
  testsPassed++;
}

function error(message) {
  log(`✗ ${message}`, 'red');
  testsFailed++;
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'yellow');
  log(message, 'yellow');
  log('='.repeat(60), 'yellow');
}

// Helper function to make HTTP requests
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testStep1_SetupWeeklyLogRotation() {
  section('TEST 1: Set up weekly log rotation');

  try {
    // Start the log rotation job
    info('Starting log rotation job...');
    const startResponse = await request('POST', '/api/log-rotation/start');

    if (startResponse.status === 200 && startResponse.data.success) {
      success('Log rotation job started successfully');
      info(`Schedule: ${startResponse.data.config.rotationSchedule}`);
    } else {
      error('Failed to start log rotation job');
      return;
    }

    // Get configuration
    info('Getting configuration...');
    const configResponse = await request('GET', '/api/log-rotation/config');

    if (configResponse.status === 200 && configResponse.data.success) {
      success('Configuration retrieved successfully');
      const config = configResponse.data.config;

      // Verify configuration values
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

      if (config.compressionEnabled !== undefined) {
        success(`Compression enabled: ${config.compressionEnabled}`);
      } else {
        error('Compression setting not configured');
      }
    } else {
      error('Failed to get configuration');
    }

    // Get job status
    info('Getting job status...');
    const statusResponse = await request('GET', '/api/log-rotation/status');

    if (statusResponse.status === 200 && statusResponse.data.success) {
      const status = statusResponse.data.status;
      if (status.isRunning) {
        success('Log rotation job is running');
      } else {
        error('Log rotation job is not running');
      }
    } else {
      error('Failed to get job status');
    }

  } catch (err) {
    error(`Test failed with error: ${err.message}`);
  }
}

async function testStep2_CompressOldLogs() {
  section('TEST 2: Compress old logs');

  try {
    // First, trigger rotation to create logs to compress
    info('Triggering log rotation to create rotatable logs...');
    const triggerResponse = await request('POST', '/api/log-rotation/trigger');

    if (triggerResponse.status === 200 && triggerResponse.data.success) {
      success('Log rotation triggered');
      const results = triggerResponse.data.results;

      if (results.rotation) {
        success(`Rotated ${results.rotation.count} log files`);
        info(`Rotated files: ${JSON.stringify(results.rotation.rotated, null, 2)}`);
      }

      if (results.compression) {
        success(`Compressed ${results.compression.count} log files`);
        info(`Compression results: ${JSON.stringify(results.compression.compressed, null, 2)}`);
      }
    } else {
      error('Failed to trigger log rotation');
    }

    // Verify compression is enabled in config
    info('Verifying compression is enabled...');
    const configResponse = await request('GET', '/api/log-rotation/config');

    if (configResponse.status === 200 && configResponse.data.success) {
      const config = configResponse.data.config;
      if (config.compressionEnabled === true) {
        success('Compression is enabled in configuration');
      } else {
        error('Compression is not enabled');
      }
    }

  } catch (err) {
    error(`Test failed with error: ${err.message}`);
  }
}

async function testStep3_DeleteExpiredLogs() {
  section('TEST 3: Delete logs older than retention period');

  try {
    // Trigger log rotation which includes deletion
    info('Triggering log rotation (includes deletion)...');
    const triggerResponse = await request('POST', '/api/log-rotation/trigger');

    if (triggerResponse.status === 200 && triggerResponse.data.success) {
      success('Log rotation triggered');

      const results = triggerResponse.data.results;
      if (results.deletion) {
        success(`Deletion check completed`);
        success(`Deleted ${results.deletion.count} expired log files`);
        info(`Deleted files: ${JSON.stringify(results.deletion.deleted, null, 2)}`);
      }
    } else {
      error('Failed to trigger log rotation');
    }

    // Verify retention days configuration
    info('Verifying retention days configuration...');
    const configResponse = await request('GET', '/api/log-rotation/config');

    if (configResponse.status === 200 && configResponse.data.success) {
      const config = configResponse.data.config;
      if (config.retentionDays && config.retentionDays > 0) {
        success(`Retention period configured: ${config.retentionDays} days`);
      } else {
        error('Retention period not properly configured');
      }
    }

  } catch (err) {
    error(`Test failed with error: ${err.message}`);
  }
}

async function testStep4_VerifyActiveLogsPreserved() {
  section('TEST 4: Verify active logs preserved');

  try {
    // Trigger rotation and check verification
    info('Triggering log rotation (includes verification)...');
    const triggerResponse = await request('POST', '/api/log-rotation/trigger');

    if (triggerResponse.status === 200 && triggerResponse.data.success) {
      success('Log rotation triggered');

      const results = triggerResponse.data.results;
      if (results.verification) {
        success(`Verification check completed`);
        success(`${results.verification.preserved} active logs preserved`);

        if (results.verification.missing && results.verification.missing.length === 0) {
          success('No active logs missing');
        } else {
          info(`Missing logs recreated: ${JSON.stringify(results.verification.missing)}`);
        }

        info(`Verified logs: ${JSON.stringify(results.verification.verified, null, 2)}`);
      }
    } else {
      error('Failed to trigger log rotation');
    }

    // List current log files
    info('Listing current log files...');
    const logsResponse = await request('GET', '/api/log-rotation/logs');

    if (logsResponse.status === 200 && logsResponse.data.success) {
      success('Log files retrieved');
      const logs = logsResponse.data.logs;

      // Check for active logs
      const hasCombined = logs.some(log => log.name === 'combined.log');
      const hasError = logs.some(log => log.name === 'error.log');

      if (hasCombined) {
        success('Active log file combined.log exists');
      } else {
        error('Active log file combined.log missing');
      }

      if (hasError) {
        success('Active log file error.log exists');
      } else {
        error('Active log file error.log missing');
      }

      info(`Total log files: ${logs.length}`);
    } else {
      error('Failed to list log files');
    }

  } catch (err) {
    error(`Test failed with error: ${err.message}`);
  }
}

async function testStep5_MonitorLogDiskUsage() {
  section('TEST 5: Monitor log disk usage');

  try {
    // Trigger rotation to get disk usage stats
    info('Triggering log rotation (includes disk monitoring)...');
    const triggerResponse = await request('POST', '/api/log-rotation/trigger');

    if (triggerResponse.status === 200 && triggerResponse.data.success) {
      success('Log rotation triggered');

      const results = triggerResponse.data.results;
      if (results.diskUsage) {
        const diskUsage = results.diskUsage;

        success('Disk usage monitoring completed');
        success(`Total disk usage: ${diskUsage.bytes} bytes`);
        success(`Disk usage percentage: ${diskUsage.percent}%`);
        success(`Number of log files: ${diskUsage.files}`);
        success(`Status: ${diskUsage.status}`);

        if (diskUsage.maxBytes) {
          success(`Max disk usage: ${diskUsage.maxBytes} bytes`);
        }

        if (diskUsage.maxPercent) {
          success(`Max disk usage percent: ${diskUsage.maxPercent}%`);
        }
      }
    } else {
      error('Failed to trigger log rotation');
    }

    // Get stats which include disk usage
    info('Getting log rotation stats...');
    const statsResponse = await request('GET', '/api/log-rotation/stats');

    if (statsResponse.status === 200 && statsResponse.data.success) {
      success('Statistics retrieved');
      const stats = statsResponse.data.stats;

      if (stats.lastDiskUsageBytes !== undefined) {
        success(`Last recorded disk usage: ${stats.lastDiskUsageBytes} bytes`);
      }

      if (stats.lastDiskUsagePercent !== undefined) {
        success(`Last recorded disk usage percent: ${stats.lastDiskUsagePercent}%`);
      }
    } else {
      error('Failed to get statistics');
    }

  } catch (err) {
    error(`Test failed with error: ${err.message}`);
  }
}

async function runAllTests() {
  log('\n🔄 Starting Log Rotation Tests', 'blue');
  log('Testing Feature #249: Log rotation and cleanup', 'blue');

  try {
    await testStep1_SetupWeeklyLogRotation();
    await testStep2_CompressOldLogs();
    await testStep3_DeleteExpiredLogs();
    await testStep4_VerifyActiveLogsPreserved();
    await testStep5_MonitorLogDiskUsage();

    // Summary
    section('TEST SUMMARY');
    success(`Tests Passed: ${testsPassed}`);
    if (testsFailed > 0) {
      error(`Tests Failed: ${testsFailed}`);
    } else {
      success('All tests passed! ✓');
    }

    // Stop the job
    info('\nStopping log rotation job...');
    await request('POST', '/api/log-rotation/stop');
    success('Log rotation job stopped');

  } catch (err) {
    error(`Test suite failed: ${err.message}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().then(() => {
  process.exit(testsFailed > 0 ? 1 : 0);
});
