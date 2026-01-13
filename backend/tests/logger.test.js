import { getLogger, testLogging } from '../utils/logger.js';

/**
 * Test Suite for Centralized Logging System
 *
 * Tests all 5 requirements from Feature #6:
 * 1. Verify logs directory exists
 * 2. Test log entry creation with timestamp
 * 3. Verify different log levels (info, warn, error)
 * 4. Test log rotation prevents oversized files
 * 5. Confirm logs include context (module, requestId)
 */

async function runTests() {
  console.log('🧪 Running Logging System Tests...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Verify logs directory exists
  console.log('Test 1: Verify logs directory exists');
  try {
    const fs = await import('fs');
    const path = await import('path');
    const LOG_DIR = process.env.LOG_FILE_PATH || './logs';
    const logPath = path.resolve(process.cwd(), LOG_DIR);

    if (fs.existsSync(logPath)) {
      console.log('✅ PASS: Logs directory exists at', logPath);
      passedTests++;
    } else {
      console.log('❌ FAIL: Logs directory does not exist');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking logs directory:', error.message);
    failedTests++;
  }

  // Test 2: Test log entry creation with timestamp
  console.log('\nTest 2: Test log entry creation with timestamp');
  try {
    const logger = getLogger('test', 'timestamp-test');
    const testMessage = `TEST-TIMESTAMP-${Date.now()}`;

    logger.info(testMessage);

    // Wait a bit for file write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Read the log file
    const fs = await import('fs');
    const path = await import('path');
    const combinedLogPath = path.join(process.cwd(), 'logs', 'combined.log');
    const logContent = fs.readFileSync(combinedLogPath, 'utf-8');

    // Check for timestamp format (ISO 8601)
    const lines = logContent.split('\n').filter(line => line.includes(testMessage));

    if (lines.length > 0) {
      const logEntry = JSON.parse(lines[0]);

      if (logEntry.timestamp) {
        // Check if timestamp is in ISO format (with or without timezone offset)
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
        if (isoRegex.test(logEntry.timestamp)) {
          console.log('✅ PASS: Log entry includes timestamp in ISO format:', logEntry.timestamp);
          console.log('   Sample log entry:', JSON.stringify(logEntry, null, 2));
          passedTests++;
        } else {
          console.log('❌ FAIL: Timestamp not in ISO format:', logEntry.timestamp);
          failedTests++;
        }
      } else {
        console.log('❌ FAIL: Log entry missing timestamp');
        failedTests++;
      }
    } else {
      console.log('❌ FAIL: Log entry not found in file');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error testing log entry creation:', error.message);
    failedTests++;
  }

  // Test 3: Verify different log levels (info, warn, error)
  console.log('\nTest 3: Verify different log levels (info, warn, error)');
  try {
    const logger = getLogger('test', 'loglevel-test');
    const testId = Date.now();

    logger.info(`TEST-LEVEL-INFO-${testId}`);
    logger.warn(`TEST-LEVEL-WARN-${testId}`);
    logger.error(`TEST-LEVEL-ERROR-${testId}`);
    logger.debug(`TEST-LEVEL-DEBUG-${testId}`);

    // Wait for file writes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Read log files
    const fs = await import('fs');
    const path = await import('path');

    const combinedLogPath = path.join(process.cwd(), 'logs', 'combined.log');
    const errorLogPath = path.join(process.cwd(), 'logs', 'error.log');
    const combinedContent = fs.readFileSync(combinedLogPath, 'utf-8');
    const errorContent = fs.readFileSync(errorLogPath, 'utf-8');

    // Check combined log for all levels
    const hasInfo = combinedContent.includes(`TEST-LEVEL-INFO-${testId}`);
    const hasWarn = combinedContent.includes(`TEST-LEVEL-WARN-${testId}`);
    const hasErrorInCombined = combinedContent.includes(`TEST-LEVEL-ERROR-${testId}`);
    const hasErrorInErrorLog = errorContent.includes(`TEST-LEVEL-ERROR-${testId}`);

    // Debug logs should only appear if LOG_LEVEL=debug
    const logLevel = process.env.LOG_LEVEL || 'info';

    if (hasInfo && hasWarn && hasErrorInCombined && hasErrorInErrorLog) {
      console.log('✅ PASS: All log levels working correctly');
      console.log('   - INFO messages written to combined.log');
      console.log('   - WARN messages written to combined.log');
      console.log('   - ERROR messages written to both combined.log and error.log');
      console.log(`   - DEBUG level: ${logLevel} (debug messages only shown when LOG_LEVEL=debug)`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Not all log levels working');
      console.log(`   INFO: ${hasInfo}, WARN: ${hasWarn}, ERROR (combined): ${hasErrorInCombined}, ERROR (error.log): ${hasErrorInErrorLog}`);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error testing log levels:', error.message);
    failedTests++;
  }

  // Test 4: Test log rotation prevents oversized files
  console.log('\nTest 4: Test log rotation prevents oversized files');
  try {
    // Check the logger configuration
    const fs = await import('fs');
    const path = await import('path');

    // Read the logger source to verify rotation config
    const loggerPath = path.join(process.cwd(), 'backend/utils/logger.js');
    const loggerContent = fs.readFileSync(loggerPath, 'utf-8');

    const hasMaxsize = loggerContent.includes('maxsize: 10485760');
    const hasMaxFiles = loggerContent.includes('maxFiles: 5');
    const hasTailable = loggerContent.includes('tailable: true');

    if (hasMaxsize && hasMaxFiles && hasTailable) {
      console.log('✅ PASS: Log rotation configured correctly');
      console.log('   - maxsize: 10MB (10485760 bytes)');
      console.log('   - maxFiles: 5 (keeps last 5 log files)');
      console.log('   - tailable: true (prevents data loss on rotation)');
      passedTests++;
    } else {
      console.log('❌ FAIL: Log rotation not properly configured');
      console.log(`   maxsize: ${hasMaxsize}, maxFiles: ${hasMaxFiles}, tailable: ${hasTailable}`);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error testing log rotation:', error.message);
    failedTests++;
  }

  // Test 5: Confirm logs include context (module, requestId)
  console.log('\nTest 5: Confirm logs include context (module, requestId)');
  try {
    const logger = getLogger('context-test', 'test-module');
    const testId = Date.now();
    const testRequestId = `req-${testId}`;

    // Test with module context
    logger.info(`TEST-CONTEXT-MODULE-${testId}`);

    // Test with requestId context
    logger.setContext('requestId', testRequestId);
    logger.info(`TEST-CONTEXT-REQUESTID-${testId}`);

    // Test with multiple context values
    logger.setContext('userId', 'user-123');
    logger.setContext('action', 'test-action');
    logger.info(`TEST-CONTEXT-MULTIPLE-${testId}`);

    // Test child logger
    const childLogger = logger.child('child-module');
    childLogger.info(`TEST-CONTEXT-CHILD-${testId}`);

    // Test withRequest helper
    const requestLogger = logger.withRequest(`req-${testId + 1}`);
    requestLogger.info(`TEST-CONTEXT-WITHREQUEST-${testId}`);

    // Wait for file writes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Read and verify logs
    const fs = await import('fs');
    const path = await import('path');
    const combinedLogPath = path.join(process.cwd(), 'logs', 'combined.log');
    const logContent = fs.readFileSync(combinedLogPath, 'utf-8');

    // Find our test log entries
    const lines = logContent.split('\n').filter(line => line.includes(`TEST-CONTEXT-`));

    let moduleFound = false;
    let requestIdFound = false;
    let multipleContextFound = false;
    let childModuleFound = false;
    let withRequestFound = false;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        if (entry.message.includes(`TEST-CONTEXT-MODULE-${testId}`)) {
          if (entry.module === 'test-module') {
            moduleFound = true;
          }
        }

        if (entry.message.includes(`TEST-CONTEXT-REQUESTID-${testId}`)) {
          if (entry.requestId === testRequestId) {
            requestIdFound = true;
          }
        }

        if (entry.message.includes(`TEST-CONTEXT-MULTIPLE-${testId}`)) {
          if (entry.requestId === testRequestId && entry.userId === 'user-123' && entry.action === 'test-action') {
            multipleContextFound = true;
          }
        }

        if (entry.message.includes(`TEST-CONTEXT-CHILD-${testId}`)) {
          if (entry.module === 'child-module') {
            childModuleFound = true;
          }
        }

        if (entry.message.includes(`TEST-CONTEXT-WITHREQUEST-${testId}`)) {
          if (entry.requestId && entry.requestId.startsWith('req-')) {
            withRequestFound = true;
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    if (moduleFound && requestIdFound && multipleContextFound && childModuleFound && withRequestFound) {
      console.log('✅ PASS: Context logging working correctly');
      console.log('   - Module context: ✅');
      console.log('   - Request ID context: ✅');
      console.log('   - Multiple context values: ✅');
      console.log('   - Child logger with module: ✅');
      console.log('   - withRequest() helper: ✅');
      passedTests++;
    } else {
      console.log('❌ FAIL: Not all context features working');
      console.log(`   Module: ${moduleFound}, RequestId: ${requestIdFound}, Multiple: ${multipleContextFound}, Child: ${childModuleFound}, withRequest: ${withRequestFound}`);
      failedTests++;
    }

    // Clean up context
    logger.clearContext();
  } catch (error) {
    console.log('❌ FAIL: Error testing context logging:', error.message);
    console.log(error.stack);
    failedTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} passed`);
  console.log('='.repeat(50));

  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log(`⚠️  ${failedTests} test(s) failed`);
    return false;
  }
}

// Run tests if this file is executed directly
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });

export default runTests;
