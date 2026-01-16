/**
 * Test Error Monitoring Feature (#300)
 *
 * This test verifies all 5 steps of the error logging and monitoring feature:
 * 1. Catch error
 * 2. Log with context
 * 3. Include timestamp
 * 4. Include stack trace
 * 5. Aggregate for monitoring
 */

import * as errorMonitoring from '../services/errorMonitoringService.js';

async function testErrorMonitoring() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Testing Feature #300: Error logging and monitoring');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Clear previous error history
  errorMonitoring.clearErrorHistory();

  // Test 1: Catch error
  console.log('Test 1: Catch error');
  try {
    const testError = new Error('This is a test error');
    testError.name = 'TestError';

    const errorRecord = errorMonitoring.recordError(testError, {
      module: 'test-module',
      requestId: 'test-req-123',
      level: 'error'
    });

    if (errorRecord && errorRecord.type === 'TestError') {
      console.log('✅ PASS: Error caught successfully\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Error not caught properly\n');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    testsFailed++;
  }

  // Test 2: Log with context
  console.log('Test 2: Log with context');
  try {
    const contextError = new Error('Context test error');
    contextError.name = 'ContextError';

    errorMonitoring.recordError(contextError, {
      module: 'api/test',
      requestId: 'ctx-456',
      userId: 'user-789',
      level: 'error',
      meta: { customField: 'customValue' }
    });

    const recentErrors = errorMonitoring.getRecentErrors(1);
    const loggedError = recentErrors.errors[0];

    if (loggedError &&
        loggedError.module === 'api/test' &&
        loggedError.context &&
        loggedError.context.customField === 'customValue') {
      console.log('✅ PASS: Error logged with context\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Context not logged properly\n');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    testsFailed++;
  }

  // Test 3: Include timestamp
  console.log('Test 3: Include timestamp');
  try {
    const timestampError = new Error('Timestamp test error');
    timestampError.name = 'TimestampError';

    errorMonitoring.recordError(timestampError, {
      module: 'test',
      level: 'error'
    });

    const recentErrors = errorMonitoring.getRecentErrors(1);
    const loggedError = recentErrors.errors[0];

    if (loggedError && loggedError.timestamp) {
      const timestamp = new Date(loggedError.timestamp);
      if (!isNaN(timestamp.getTime())) {
        console.log(`✅ PASS: Timestamp included (${loggedError.timestamp})\n`);
        testsPassed++;
      } else {
        console.log('❌ FAIL: Invalid timestamp format\n');
        testsFailed++;
      }
    } else {
      console.log('❌ FAIL: Timestamp not included\n');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    testsFailed++;
  }

  // Test 4: Include stack trace
  console.log('Test 4: Include stack trace');
  try {
    const stackError = new Error('Stack trace test error');
    stackError.name = 'StackError';

    errorMonitoring.recordError(stackError, {
      module: 'test',
      level: 'error'
    });

    const recentErrors = errorMonitoring.getRecentErrors(1);
    const loggedError = recentErrors.errors[0];

    if (loggedError && loggedError.stack) {
      console.log('✅ PASS: Stack trace included');
      console.log(`   Stack preview: ${loggedError.stack.substring(0, 50)}...\n`);
      testsPassed++;
    } else {
      console.log('❌ FAIL: Stack trace not included\n');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    testsFailed++;
  }

  // Test 5: Aggregate for monitoring
  console.log('Test 5: Aggregate for monitoring');
  try {
    // Generate multiple errors for aggregation
    for (let i = 0; i < 5; i++) {
      const aggError = new Error(`Aggregation test error ${i}`);
      aggError.name = 'AggregationError';

      errorMonitoring.recordError(aggError, {
        module: `test-module-${i % 3}`, // Spread across 3 modules
        level: 'error'
      });
    }

    // Get aggregated stats
    const stats = errorMonitoring.getErrorStats();
    const summary = errorMonitoring.getErrorSummary();

    // Verify aggregation
    const hasTotalCount = stats.totalErrors > 0;
    const hasByType = stats.byType && Object.keys(stats.byType).length > 0;
    const hasByModule = stats.byModule && Object.keys(stats.byModule).length > 0;
    const hasTopTypes = summary.topErrorTypes && summary.topErrorTypes.length > 0;
    const hasTopModules = summary.topModules && summary.topModules.length > 0;

    if (hasTotalCount && hasByType && hasByModule && hasTopTypes && hasTopModules) {
      console.log('✅ PASS: Errors aggregated for monitoring');
      console.log(`   Total errors: ${stats.totalErrors}`);
      console.log(`   Error types: ${Object.keys(stats.byType).join(', ')}`);
      console.log(`   Modules: ${Object.keys(stats.byModule).join(', ')}`);
      console.log(`   Top error type: ${summary.topErrorTypes[0].type} (${summary.topErrorTypes[0].count} occurrences)`);
      console.log(`   Top module: ${summary.topModules[0].module} (${summary.topModules[0].count} errors)\n`);
      testsPassed++;
    } else {
      console.log('❌ FAIL: Aggregation incomplete');
      console.log(`   Total count: ${hasTotalCount}`);
      console.log(`   By type: ${hasByType}`);
      console.log(`   By module: ${hasByModule}`);
      console.log(`   Top types: ${hasTopTypes}`);
      console.log(`   Top modules: ${hasTopModules}\n`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    testsFailed++;
  }

  // Test 6: Health status
  console.log('Test 6: Error health status');
  try {
    const health = errorMonitoring.getErrorHealthStatus();

    if (health && health.status && health.message && typeof health.errorsPerMinute === 'number') {
      console.log('✅ PASS: Health status calculated');
      console.log(`   Status: ${health.status}`);
      console.log(`   Message: ${health.message}`);
      console.log(`   Errors/min: ${health.errorsPerMinute.toFixed(2)}\n`);
      testsPassed++;
    } else {
      console.log('❌ FAIL: Health status incomplete\n');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    testsFailed++;
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`TEST SUMMARY: ${testsPassed}/${testsPassed + testsFailed} tests passed`);
  console.log('═══════════════════════════════════════════════════════════════');

  return {
    passed: testsPassed,
    failed: testsFailed,
    total: testsPassed + testsFailed,
    success: testsFailed === 0
  };
}

// Run tests
testErrorMonitoring()
  .then(result => {
    if (result.success) {
      console.log('\n✅ All error monitoring tests passed!\n');
      process.exit(0);
    } else {
      console.log(`\n❌ ${result.failed} test(s) failed\n`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`\n❌ Test error: ${error.message}\n`);
    process.exit(1);
  });
