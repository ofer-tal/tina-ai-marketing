/**
 * Retry Test API Endpoint
 *
 * Demonstrates API failure detection and retry with exponential backoff.
 * This endpoint simulates various failure scenarios to test retry logic.
 */

import express from 'express';
import retryService from '../services/retry.js';

const router = express.Router();

// Track test state across requests
const testState = {
  attemptCount: 0,
  scenario: 'none',
  startTime: null,
  retryLog: []
};

/**
 * GET /api/retry-test/status
 * Get current test state
 */
router.get('/status', (req, res) => {
  res.json({
    scenario: testState.scenario,
    attemptCount: testState.attemptCount,
    duration: testState.startTime ? Date.now() - testState.startTime : null,
    retryLog: testState.retryLog
  });
});

/**
 * POST /api/retry-test/reset
 * Reset test state
 */
router.post('/reset', (req, res) => {
  testState.attemptCount = 0;
  testState.scenario = 'none';
  testState.startTime = null;
  testState.retryLog = [];

  res.json({
    success: true,
    message: 'Test state reset'
  });
});

/**
 * POST /api/retry-test/simulate-failure
 * Simulate API failure with retry
 *
 * Body: {
 *   scenario: 'connection-reset' | 'timeout' | 'server-error' | 'rate-limit',
 *   failCount: number (how many times to fail before succeeding, default: 3),
 *   maxRetries: number (default: 5)
 * }
 */
router.post('/simulate-failure', async (req, res) => {
  const { scenario = 'connection-reset', failCount = 3, maxRetries = 5 } = req.body;

  // Reset test state
  testState.attemptCount = 0;
  testState.scenario = scenario;
  testState.startTime = Date.now();
  testState.retryLog = [];

  try {
    // Create a function that fails N times then succeeds
    const flakyFunction = async () => {
      testState.attemptCount++;

      const attemptInfo = {
        attempt: testState.attemptCount,
        timestamp: new Date().toISOString(),
        timeFromStart: Date.now() - testState.startTime
      };

      // Still failing?
      if (testState.attemptCount <= failCount) {
        let error;

        switch (scenario) {
          case 'connection-reset':
            error = new Error('ECONNRESET: Connection reset by peer');
            error.code = 'ECONNRESET';
            break;

          case 'timeout':
            error = new Error('ETIMEDOUT: Operation timed out');
            error.code = 'ETIMEDOUT';
            break;

          case 'server-error':
            // Return a 500 error response
            attemptInfo.status = 500;
            attemptInfo.type = 'HTTP Error';
            testState.retryLog.push(attemptInfo);
            return {
              ok: false,
              status: 500,
              statusText: 'Internal Server Error'
            };

          case 'rate-limit':
            attemptInfo.status = 429;
            attemptInfo.type = 'HTTP Error';
            testState.retryLog.push(attemptInfo);
            return {
              ok: false,
              status: 429,
              statusText: 'Too Many Requests',
              headers: {
                get: (name) => name === 'Retry-After' ? '5' : null
              }
            };

          default:
            error = new Error('Unknown error');
            error.code = 'EUNKNOWN';
        }

        attemptInfo.type = 'Error';
        attemptInfo.errorCode = error.code;
        attemptInfo.errorMessage = error.message;
        testState.retryLog.push(attemptInfo);

        throw error;
      }

      // Success!
      attemptInfo.type = 'Success';
      testState.retryLog.push(attemptInfo);

      return {
        success: true,
        attempt: testState.attemptCount,
        message: 'Operation succeeded after retries',
        data: {
          timestamp: new Date().toISOString(),
          duration: Date.now() - testState.startTime
        }
      };
    };

    // Execute with retry logic
    const result = await retryService.retry(flakyFunction, {
      maxRetries,
      initialDelay: 1000, // 1 second
      backoffMultiplier: 2, // Double each time (1s, 2s, 4s, 8s, 16s)
      maxDelay: 30000, // Max 30 seconds
      onRetry: (attempt, delay, error) => {
        testState.retryLog[testState.retryLog.length - 1].retryScheduledIn = Math.round(delay);
        testState.retryLog[testState.retryLog.length - 1].willRetryAt = Date.now() + delay;
      }
    });

    // Calculate final statistics
    const duration = Date.now() - testState.startTime;
    const retryCount = testState.attemptCount - 1;

    res.json({
      success: true,
      result,
      statistics: {
        totalAttempts: testState.attemptCount,
        retryCount,
        duration: `${duration}ms`,
        durationSeconds: (duration / 1000).toFixed(2)
      },
      retryLog: testState.retryLog,
      message: `Operation succeeded after ${retryCount} retry(es) over ${(duration / 1000).toFixed(2)} seconds`
    });

  } catch (error) {
    // Failed even after all retries
    const duration = Date.now() - testState.startTime;

    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: error.code,
      statistics: {
        totalAttempts: testState.attemptCount,
        retryCount: testState.attemptCount - 1,
        duration: `${duration}ms`,
        durationSeconds: (duration / 1000).toFixed(2)
      },
      retryLog: testState.retryLog,
      message: `Operation failed after ${testState.attemptCount} attempt(s) over ${(duration / 1000).toFixed(2)} seconds`
    });
  }
});

/**
 * GET /api/retry-test/scenarios
 * List available failure scenarios
 */
router.get('/scenarios', (req, res) => {
  res.json({
    scenarios: [
      {
        id: 'connection-reset',
        name: 'Connection Reset',
        description: 'Simulates ECONNRESET error - connection was reset',
        retryable: true
      },
      {
        id: 'timeout',
        name: 'Timeout',
        description: 'Simulates ETIMEDOUT error - operation timed out',
        retryable: true
      },
      {
        id: 'server-error',
        name: 'HTTP 500 Server Error',
        description: 'Simulates HTTP 500 Internal Server Error response',
        retryable: true
      },
      {
        id: 'rate-limit',
        name: 'HTTP 429 Rate Limit',
        description: 'Simulates HTTP 429 Too Many Requests response',
        retryable: true
      }
    ],
    retryConfig: {
      initialDelay: '1000ms (1 second)',
      backoffMultiplier: 2,
      backoffStrategy: 'Exponential',
      delays: ['1s', '2s', '4s', '8s', '16s'],
      maxDelay: '30000ms (30 seconds)',
      defaultMaxRetries: 5
    }
  });
});

/**
 * GET /api/retry-test/docs
 * Get documentation about retry behavior
 */
router.get('/docs', (req, res) => {
  res.json({
    title: 'API Failure Detection and Retry with Exponential Backoff',
    description: 'This endpoint demonstrates the retry logic used throughout the application',
    features: [
      'Automatic detection of retryable errors (network failures, timeouts, 5xx errors)',
      'Exponential backoff strategy (1s, 2s, 4s, 8s, 16s...)',
      'Configurable maximum retries and delay limits',
      'Jitter added to prevent thundering herd problem',
      'Detailed logging of retry attempts',
      'Fast failure for non-retryable errors (4xx, auth errors)'
    ],
    retryableErrors: [
      'ECONNRESET - Connection reset by peer',
      'ECONNREFUSED - Connection refused',
      'ENOTFOUND - DNS lookup failed',
      'ETIMEDOUT - Operation timed out',
      'EAI_AGAIN - DNS temporary failure'
    ],
    retryableStatusCodes: [
      '408 - Request Timeout',
      '429 - Too Many Requests (Rate Limit)',
      '500 - Internal Server Error',
      '502 - Bad Gateway',
      '503 - Service Unavailable',
      '504 - Gateway Timeout'
    ],
    usageExample: {
      endpoint: 'POST /api/retry-test/simulate-failure',
      requestBody: {
        scenario: 'connection-reset',
        failCount: 3,
        maxRetries: 5
      },
      expectedBehavior: 'Will fail 3 times with exponential backoff (1s, 2s, 4s) then succeed on 4th attempt'
    }
  });
});

export default router;
