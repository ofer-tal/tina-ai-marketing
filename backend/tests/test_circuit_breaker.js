/**
 * Circuit Breaker Service Unit Tests
 *
 * Tests all 5 workflow steps:
 * 1. Track API failure rate
 * 2. Open circuit on threshold
 * 3. Fail fast when open
 * 4. Attempt recovery after timeout
 * 5. Close circuit on recovery
 */

import { CircuitBreaker, CircuitBreakerOpenError, CircuitBreakerRegistry } from '../services/circuitBreakerService.js';

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {}
};

console.log('=== Circuit Breaker Service Unit Tests ===\n');

// Test 1: Track API failure rate
async function test_TrackAPIFailureRate() {
  console.log('Test 1: Track API failure rate');
  console.log('-----------------------------------');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 5000,
    logger: mockLogger
  });

  // Execute successful requests
  for (let i = 0; i < 10; i++) {
    await breaker.execute(async () => ({ success: true }));
  }

  const stats = breaker.getStatistics();

  console.log(`✓ Total requests: ${stats.totalRequests}`);
  console.log(`✓ Total successes: ${stats.totalSuccesses}`);
  console.log(`✓ Total failures: ${stats.totalFailures}`);
  console.log(`✓ Failure rate: ${stats.totalFailureRate}`);

  if (stats.totalRequests === 10 && stats.totalSuccesses === 10 && stats.totalFailures === 0) {
    console.log('✅ PASS: Successfully tracks successful requests\n');
    return true;
  } else {
    console.log('❌ FAIL: Incorrect tracking\n');
    return false;
  }
}

// Test 2: Open circuit on threshold
async function test_OpenCircuitOnThreshold() {
  console.log('Test 2: Open circuit on threshold');
  console.log('-----------------------------------');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 5000,
    logger: mockLogger
  });

  console.log(`Initial state: ${breaker.getStatus().state}`);

  // Execute failing requests up to threshold
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Expected to fail
    }
    console.log(`After failure ${i + 1}: state=${breaker.getStatus().state}, failures=${breaker.getStatus().failureCount}`);
  }

  const status = breaker.getStatus();

  console.log(`Final state: ${status.state}`);
  console.log(`Failure count: ${status.failureCount}`);
  console.log(`Next attempt time: ${status.nextAttemptTime}`);

  if (status.state === 'OPEN' && status.failureCount === 3 && status.nextAttemptTime) {
    console.log('✅ PASS: Circuit opened after reaching failure threshold\n');
    return true;
  } else {
    console.log('❌ FAIL: Circuit did not open correctly\n');
    return false;
  }
}

// Test 3: Fail fast when open
async function test_FailFastWhenOpen() {
  console.log('Test 3: Fail fast when open');
  console.log('-----------------------------------');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 2,
    successThreshold: 2,
    timeout: 10000,
    logger: mockLogger
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Expected
    }
  }

  console.log(`Circuit state: ${breaker.getStatus().state}`);

  // Try to execute request while circuit is open
  const startTime = Date.now();
  try {
    await breaker.execute(async () => {
      // This should not execute
      return { success: true };
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`Error type: ${error.name}`);
    console.log(`Error message: ${error.message}`);
    console.log(`Duration: ${duration}ms (should be fast, < 100ms)`);

    if (error instanceof CircuitBreakerOpenError && duration < 100) {
      console.log('✅ PASS: Failed fast without executing request\n');
      return true;
    } else {
      console.log('❌ FAIL: Did not fail fast correctly\n');
      return false;
    }
  }

  console.log('❌ FAIL: Should have thrown CircuitBreakerOpenError\n');
  return false;
}

// Test 4: Attempt recovery after timeout
async function test_AttemptRecoveryAfterTimeout() {
  console.log('Test 4: Attempt recovery after timeout');
  console.log('-----------------------------------');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 2,
    successThreshold: 2,
    timeout: 2000, // 2 second timeout
    logger: mockLogger
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Expected
    }
  }

  console.log(`Circuit state after failures: ${breaker.getStatus().state}`);

  // Wait for timeout to elapse
  console.log('Waiting for timeout to elapse...');
  await sleep(2100);

  // Try to execute request - should transition to HALF_OPEN
  try {
    await breaker.execute(async () => {
      return { success: true };
    });
  } catch (error) {
    // May fail, that's okay
  }

  const status = breaker.getStatus();
  console.log(`Circuit state after timeout: ${status.state}`);

  if (status.state === 'HALF_OPEN') {
    console.log('✅ PASS: Circuit transitioned to HALF_OPEN after timeout\n');
    return true;
  } else {
    console.log('❌ FAIL: Circuit did not transition to HALF_OPEN\n');
    return false;
  }
}

// Test 5: Close circuit on recovery
async function test_CloseCircuitOnRecovery() {
  console.log('Test 5: Close circuit on recovery');
  console.log('-----------------------------------');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 2,
    successThreshold: 2,
    timeout: 1000,
    logger: mockLogger
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Expected
    }
  }

  console.log(`Circuit state: ${breaker.getStatus().state}`);

  // Wait for timeout
  await sleep(1100);

  // Execute successful requests to close the circuit
  console.log('Executing successful requests to close circuit...');

  for (let i = 0; i < 2; i++) {
    await breaker.execute(async () => {
      return { success: true };
    });
    console.log(`After success ${i + 1}: state=${breaker.getStatus().state}, successes=${breaker.getStatus().successCount}`);
  }

  const status = breaker.getStatus();
  console.log(`Final state: ${status.state}`);
  console.log(`Failure count: ${status.failureCount}`);
  console.log(`Success count: ${status.successCount}`);

  if (status.state === 'CLOSED' && status.failureCount === 0) {
    console.log('✅ PASS: Circuit closed after successful recovery\n');
    return true;
  } else {
    console.log('❌ FAIL: Circuit did not close correctly\n');
    return false;
  }
}

// Test 6: HALF_OPEN failures trip back to OPEN
async function test_HalfOpenFailureTripsOpen() {
  console.log('Test 6: HALF_OPEN failures trip back to OPEN');
  console.log('-----------------------------------');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 2,
    successThreshold: 3,
    timeout: 1000,
    logger: mockLogger
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Expected
    }
  }

  // Wait for timeout
  await sleep(1100);

  // Execute one successful request (should be HALF_OPEN)
  await breaker.execute(async () => ({ success: true }));
  console.log(`After first success: state=${breaker.getStatus().state}`);

  // Now fail - should trip back to OPEN
  try {
    await breaker.execute(async () => {
      throw new Error('Simulated failure');
    });
  } catch (error) {
    // Expected
  }

  const status = breaker.getStatus();
  console.log(`After failure in HALF_OPEN: state=${status.state}`);

  if (status.state === 'OPEN') {
    console.log('✅ PASS: Circuit tripped back to OPEN on HALF_OPEN failure\n');
    return true;
  } else {
    console.log('❌ FAIL: Circuit did not trip back to OPEN\n');
    return false;
  }
}

// Test 7: Circuit breaker registry
async function test_Registry() {
  console.log('Test 7: Circuit breaker registry');
  console.log('-----------------------------------');

  const registry = new CircuitBreakerRegistry();

  // Get or create breakers
  const breaker1 = registry.get('service-1', { failureThreshold: 3 });
  const breaker2 = registry.get('service-2', { failureThreshold: 5 });
  const breaker1Again = registry.get('service-1');

  console.log(`Service 1 breaker instance same: ${breaker1 === breaker1Again}`);
  console.log(`Service 1 breaker: ${breaker1.serviceName}`);
  console.log(`Service 2 breaker: ${breaker2.serviceName}`);

  const statuses = registry.getAllStatuses();
  console.log(`Total breakers in registry: ${statuses.length}`);

  if (breaker1 === breaker1Again && statuses.length === 2) {
    console.log('✅ PASS: Registry manages circuit breakers correctly\n');
    return true;
  } else {
    console.log('❌ FAIL: Registry not working correctly\n');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const tests = [
    test_TrackAPIFailureRate,
    test_OpenCircuitOnThreshold,
    test_FailFastWhenOpen,
    test_AttemptRecoveryAfterTimeout,
    test_CloseCircuitOnRecovery,
    test_HalfOpenFailureTripsOpen,
    test_Registry
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
    } catch (error) {
      console.error(`Test error: ${error.message}`);
      results.push(false);
    }
  }

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${results.filter(r => r).length}`);
  console.log(`Failed: ${results.filter(r => !r).length}`);
  console.log(`Success rate: ${(results.filter(r => r).length / tests.length * 100).toFixed(1)}%`);

  if (results.every(r => r)) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
