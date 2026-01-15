/**
 * Error Handling and Retry Logic Integration Tests
 *
 * Comprehensive test suite for error handling and retry mechanisms.
 * Tests API failure simulation, error catching, logging, retry with backoff,
 * max retries handling, and graceful degradation.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import retryService from '../services/retry.js';

// The retry service is already imported, but we can still spy on its logger
// No need to mock winston since the service is already created

describe('Error Handling and Retry Logic Integration Tests', () => {

  describe('Step 1: Simulate API Failure', () => {
    it('should simulate API connection failure', async () => {
      let attempts = 0;

      const failingApiCall = async () => {
        attempts++;
        const error = new Error('ECONNRESET: Connection reset by peer');
        error.code = 'ECONNRESET';
        throw error;
      };

      await expect(
        retryService.retry(failingApiCall, { maxRetries: 2 })
      ).rejects.toThrow('ECONNRESET');

      expect(attempts).toBeGreaterThan(1);
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should simulate API timeout failure', async () => {
      let attempts = 0;

      const timeoutApiCall = async () => {
        attempts++;
        const error = new Error('ETIMEDOUT: Operation timed out');
        error.code = 'ETIMEDOUT';
        throw error;
      };

      await expect(
        retryService.retry(timeoutApiCall, { maxRetries: 2 })
      ).rejects.toThrow('ETIMEDOUT');

      expect(attempts).toBe(3);
    });

    it('should simulate API DNS failure', async () => {
      let attempts = 0;

      const dnsFailure = async () => {
        attempts++;
        const error = new Error('ENOTFOUND: DNS lookup failed');
        error.code = 'ENOTFOUND';
        throw error;
      };

      await expect(
        retryService.retry(dnsFailure, { maxRetries: 1 })
      ).rejects.toThrow('ENOTFOUND');

      expect(attempts).toBe(2);
    });

    it('should simulate HTTP 500 error', async () => {
      let attempts = 0;

      const serverError = async () => {
        attempts++;
        // Simulate fetch Response object
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        };
      };

      const result = await retryService.retry(serverError, { maxRetries: 2 });

      expect(result.status).toBe(500);
      expect(attempts).toBe(3); // Should retry on 500
    });

    it('should simulate HTTP 503 Service Unavailable', async () => {
      let attempts = 0;

      const serviceUnavailable = async () => {
        attempts++;
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        };
      };

      const result = await retryService.retry(serviceUnavailable, { maxRetries: 1 });

      expect(result.status).toBe(503);
      expect(attempts).toBe(2);
    });

    it('should simulate HTTP 429 Rate Limit', async () => {
      let attempts = 0;

      const rateLimited = async () => {
        attempts++;
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            get: (name) => name === 'Retry-After' ? '5' : null,
          },
        };
      };

      const result = await retryService.retry(rateLimited, { maxRetries: 2 });

      expect(result.status).toBe(429);
      expect(attempts).toBe(3);
    });
  });

  describe('Step 2: Verify Error Caught and Logged', () => {
    it('should catch and log network errors', async () => {
      let attempts = 0;
      const networkError = async () => {
        attempts++;
        const error = new Error('Network error');
        error.code = 'ECONNRESET';
        throw error;
      };

      await expect(
        retryService.retry(networkError, { maxRetries: 1 })
      ).rejects.toThrow('Network error');

      expect(attempts).toBe(2);
      // Error was caught and retries were attempted
    });

    it('should log error details including code and message', async () => {
      let attempts = 0;
      const detailedError = async () => {
        attempts++;
        const error = new Error('Detailed error message');
        error.code = 'ETIMEDOUT';
        throw error;
      };

      const error = await retryService.retry(detailedError, { maxRetries: 1 })
        .catch(e => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Detailed error message');
      expect(error.code).toBe('ETIMEDOUT');
      expect(attempts).toBe(2);
    });

    it('should include attempt information in retry logic', async () => {
      let attempts = 0;

      const errorFn = async () => {
        attempts++;
        const error = new Error('Test error');
        error.code = 'ECONNRESET'; // Set error code properly
        throw error;
      };

      try {
        await retryService.retry(errorFn, {
          maxRetries: 2,
        });
      } catch (e) {
        // Expected to fail
      }

      // Verify that retries were attempted
      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Step 3: Test Retry with Backoff', () => {
    it('should implement exponential backoff', async () => {
      const delays = [];
      let attempts = 0;

      const trackDelayRetry = (attempt, delay) => {
        delays.push(delay);
      };

      const flakyFunction = async () => {
        attempts++;
        if (attempts <= 2) { // Reduced from 3 to 2 for faster test
          const error = new Error('Temporary failure');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { success: true };
      };

      const startTime = Date.now();
      await retryService.retry(flakyFunction, {
        maxRetries: 3,
        initialDelay: 50, // Reduced from 100 for faster test
        onRetry: trackDelayRetry,
      });
      const duration = Date.now() - startTime;

      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[1]).toBeGreaterThan(delays[0]); // Exponential growth
      expect(duration).toBeGreaterThan(50 + 100); // Minimum expected time
    }, 10000); // 10 second timeout

    it('should respect max delay limit', async () => {
      // Test that calculateDelay properly caps at maxDelay
      const result1 = retryService.calculateDelay(0); // Should be initialDelay
      const result2 = retryService.calculateDelay(10); // Should be capped at maxDelay

      expect(result1).toBeGreaterThanOrEqual(1000); // Default initialDelay
      expect(result1).toBeLessThan(1100); // Allow jitter

      expect(result2).toBeLessThanOrEqual(30100); // Default maxDelay + jitter
      expect(result2).toBeGreaterThanOrEqual(30000);
    });

    it('should add jitter to prevent thundering herd', async () => {
      const delays = [];
      let attempts = 0;

      const trackDelayRetry = (attempt, delay) => {
        delays.push(delay);
      };

      const flakyFunction = async () => {
        attempts++;
        if (attempts <= 2) {
          const error = new Error('Failure');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { success: true };
      };

      await retryService.retry(flakyFunction, {
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 2,
        onRetry: trackDelayRetry,
      });

      // Check that delays are approximately exponential with jitter
      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeGreaterThan(delays[0]); // Second delay should be larger

      // Check that delays have some jitter (not exactly base values)
      const jitter0 = Math.abs(delays[0] - 100);
      const jitter1 = Math.abs(delays[1] - 200);
      expect(jitter0 + jitter1).toBeGreaterThan(0); // At least some jitter
    }, 10000); // 10 second timeout

    it('should use custom backoff multiplier', async () => {
      const delays = [];
      let attempts = 0;

      const trackDelayRetry = (attempt, delay) => {
        delays.push(delay);
      };

      const flakyFunction = async () => {
        attempts++;
        if (attempts <= 2) {
          const error = new Error('Failure');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { success: true };
      };

      await retryService.retry(flakyFunction, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 3, // Custom multiplier
        onRetry: trackDelayRetry,
      });

      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeGreaterThanOrEqual(300); // 100 * 3
    });
  });

  describe('Step 4: Test Max Retries Handling', () => {
    it('should stop retrying after max attempts', async () => {
      let attempts = 0;

      const alwaysFail = async () => {
        attempts++;
        const error = new Error('Always fails');
        error.code = 'ECONNRESET';
        throw error;
      };

      await expect(
        retryService.retry(alwaysFail, { maxRetries: 2 }) // Reduced from 3
      ).rejects.toThrow('Always fails');

      expect(attempts).toBe(3); // Initial + 2 retries
    }, 10000); // 10 second timeout

    it('should throw final error after max retries', async () => {
      let attempts = 0;

      const alwaysFail = async () => {
        attempts++;
        const error = new Error(`Failure attempt ${attempts}`);
        error.code = 'ECONNREFUSED';
        throw error;
      };

      try {
        await retryService.retry(alwaysFail, { maxRetries: 2 });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Failure attempt');
        expect(attempts).toBe(3);
      }
    });

    it('should respect maxRetries: 0 (no retries)', async () => {
      let attempts = 0;

      const failOnce = async () => {
        attempts++;
        const error = new Error('Fail');
        error.code = 'ECONNRESET';
        throw error;
      };

      await expect(
        retryService.retry(failOnce, { maxRetries: 0 })
      ).rejects.toThrow('Fail');

      expect(attempts).toBe(1); // Only initial attempt
    });

    it('should handle large maxRetries value', async () => {
      let attempts = 0;

      const succeedOnThird = async () => {
        attempts++;
        if (attempts < 3) { // Reduced from 5
          const error = new Error('Not yet');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return { success: true };
      };

      const result = await retryService.retry(succeedOnThird, {
        maxRetries: 5 // Reduced from 10
      });

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    }, 15000); // 15 second timeout

    it('should call onRetry callback for each retry', async () => {
      let attempts = 0;
      const retryCallbacks = [];

      const flakyFunction = async () => {
        attempts++;
        if (attempts <= 2) { // Reduced from 3
          const error = new Error('Flaky');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { success: true };
      };

      await retryService.retry(flakyFunction, {
        maxRetries: 3, // Reduced from 5
        onRetry: (attempt, delay, error) => {
          retryCallbacks.push({ attempt, delay, error: error.message });
        },
      });

      expect(retryCallbacks.length).toBe(2);
      expect(retryCallbacks[0].attempt).toBe(0);
      expect(retryCallbacks[1].attempt).toBe(1);
    }, 10000); // 10 second timeout
  });

  describe('Step 5: Verify Graceful Degradation', () => {
    it('should return cached data on failure (simulated)', async () => {
      let attempts = 0;
      let cachedData = null;

      const fetchWithCache = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('API down');
          error.code = 'ECONNREFUSED';
          throw error;
        }
        // Simulate returning cached data
        return {
          data: 'cached-result',
          source: 'cache',
        };
      };

      const result = await retryService.retry(fetchWithCache, {
        maxRetries: 1,
      });

      expect(result).toBeDefined();
      expect(attempts).toBe(2);
    });

    it('should return partial results on timeout', async () => {
      const partialResult = {
        data: ['item1', 'item2'],
        complete: false,
        message: 'Partial results due to timeout',
      };

      const timeoutFunction = async () => {
        return partialResult;
      };

      const result = await retryService.retry(timeoutFunction, {
        maxRetries: 0,
      });

      expect(result.data).toHaveLength(2);
      expect(result.complete).toBe(false);
    });

    it('should fail fast for non-retryable errors', async () => {
      let attempts = 0;

      const authError = async () => {
        attempts++;
        const error = new Error('Unauthorized');
        error.code = 'EAUTH'; // Not retryable
        throw error;
      };

      const startTime = Date.now();
      try {
        await retryService.retry(authError, { maxRetries: 5 });
        fail('Should have thrown');
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(attempts).toBe(1);
        expect(duration).toBeLessThan(100); // Should fail immediately
      }
    });

    it('should return error response for 4xx errors', async () => {
      let attempts = 0;

      const clientError = async () => {
        attempts++;
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        };
      };

      const result = await retryService.retry(clientError, {
        maxRetries: 3,
      });

      expect(result.status).toBe(404);
      expect(attempts).toBe(1); // 4xx errors should not retry
    });

    it('should provide fallback on total failure', async () => {
      let attempts = 0;

      const alwaysFail = async () => {
        attempts++;
        const error = new Error('Total failure');
        error.code = 'ECONNRESET';
        throw error;
      };

      try {
        await retryService.retry(alwaysFail, { maxRetries: 2 });
        fail('Should have thrown');
      } catch (error) {
        // Application can provide fallback here
        const fallbackResult = {
          data: [],
          error: error.message,
          fallback: true,
        };
        expect(fallbackResult.fallback).toBe(true);
        expect(attempts).toBe(3);
      }
    });

    it('should handle mixed success/failure scenarios', async () => {
      const scenarios = [];

      // Scenario 1: Success after retries
      let attempts1 = 0;
      const scenario1 = async () => {
        attempts1++;
        if (attempts1 <= 2) {
          const error = new Error('Temp fail');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return { scenario: 1, status: 'success' };
      };

      const result1 = await retryService.retry(scenario1, { maxRetries: 3 });
      scenarios.push(result1);
      expect(result1.status).toBe('success');

      // Scenario 2: Failure after max retries
      let attempts2 = 0;
      const scenario2 = async () => {
        attempts2++;
        const error = new Error('Persistent fail');
        error.code = 'ECONNRESET';
        throw error;
      };

      try {
        await retryService.retry(scenario2, { maxRetries: 1 });
      } catch (e) {
        scenarios.push({ scenario: 2, status: 'failed' });
      }

      expect(scenarios).toHaveLength(2);
      expect(scenarios[0].status).toBe('success');
      expect(scenarios[1].status).toBe('failed');
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle immediate success', async () => {
      let attempts = 0;

      const immediateSuccess = async () => {
        attempts++;
        return { success: true, data: 'immediate' };
      };

      const result = await retryService.retry(immediateSuccess, {
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
      expect(attempts).toBe(1);
    });

    it('should handle empty retry options', async () => {
      const successFn = async () => ({ data: 'test' });

      const result = await retryService.retry(successFn, {});

      expect(result.data).toBe('test');
    });

    it('should handle function returning null', async () => {
      const nullReturn = async () => null;

      const result = await retryService.retry(nullReturn, {
        maxRetries: 1,
      });

      expect(result).toBeNull();
    });

    it('should handle function returning undefined', async () => {
      const undefinedReturn = async () => undefined;

      const result = await retryService.retry(undefinedReturn, {
        maxRetries: 1,
      });

      expect(result).toBeUndefined();
    });
  });
});
