/**
 * Base API Client Tests
 *
 * Tests for BaseApiClient common functionality
 */

import BaseApiClient from '../services/baseApiClient.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('test', 'base-api-client-test');

// Test results tracker
const results = {
  passed: [],
  failed: []
};

function logResult(testName, passed, details = '') {
  const result = { test: testName, passed, details, timestamp: new Date().toISOString() };
  if (passed) {
    results.passed.push(result);
    console.log(`✅ PASS: ${testName}`);
    if (details) console.log(`   ${details}`);
  } else {
    results.failed.push(result);
    console.log(`❌ FAIL: ${testName}`);
    if (details) console.log(`   ${details}`);
  }
}

// Mock API server
class MockAPIClient extends BaseApiClient {
  constructor(config) {
    super({ name: 'MockAPI', ...config });
    this.authToken = config.authToken || 'test-token';
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
    };
  }
}

async function runTests() {
  console.log('\n=================================');
  console.log('Base API Client Tests');
  console.log('=================================\n');

  // Test 1: Verify BaseApiClient class exists
  console.log('--- Test 1: Verify BaseApiClient class exists ---');
  try {
    const classExists = typeof BaseApiClient === 'function';
    const hasConstructor = BaseApiClient.prototype.constructor;

    // Create instance to verify it works
    const client = new BaseApiClient({ name: 'TestClient', baseURL: 'https://api.test.com' });

    const hasName = client.name === 'TestClient';
    const hasBaseURL = client.baseURL === 'https://api.test.com';
    const hasLogger = client.logger !== undefined;
    const hasRateLimiter = client.rateLimiter !== undefined;

    logResult(
      'Step 1: Verify BaseApiClient class exists',
      classExists && hasConstructor && hasName && hasBaseURL && hasLogger && hasRateLimiter,
      `Class exists: ${classExists}, instance created with name, baseURL, logger, rateLimiter`
    );
  } catch (error) {
    logResult(
      'Step 1: Verify BaseApiClient class exists',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 2: Test authentication method inherited by all clients
  console.log('\n--- Test 2: Test authentication method inherited by all clients ---');
  try {
    const client = new MockAPIClient({
      name: 'TestAPI',
      baseURL: 'https://api.test.com',
      authToken: 'secret-token-123',
    });

    const hasGetAuthHeaders = typeof client.getAuthHeaders === 'function';
    const authHeaders = hasGetAuthHeaders ? await client.getAuthHeaders() : null;
    const hasAuthHeader = authHeaders && authHeaders.Authorization === 'Bearer secret-token-123';

    logResult(
      'Step 2: Test authentication method inherited by all clients',
      hasGetAuthHeaders && hasAuthHeader,
      `getAuthHeaders method: ${hasGetAuthHeaders}, returns correct Authorization: ${hasAuthHeader}`
    );
  } catch (error) {
    logResult(
      'Step 2: Test authentication method inherited by all clients',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 3: Verify error handling inherited by all clients
  console.log('\n--- Test 3: Verify error handling inherited by all clients ---');
  try {
    const client = new BaseApiClient({ name: 'TestClient', baseURL: 'https://httpbin.org' });

    const hasHandleError = typeof client._handleError === 'function';
    const hasHandleRequestError = typeof client._handleRequestError === 'function';
    const hasIsRetryableError = typeof client._isRetryableError === 'function';

    // Test _isRetryableError logic
    const error429 = new Error('Rate limited');
    error429.status = 429;
    const is429Retryable = client._isRetryableError(error429);

    const error500 = new Error('Server error');
    error500.status = 500;
    const is500Retryable = client._isRetryableError(error500);

    const error404 = new Error('Not found');
    error404.status = 404;
    const is404Retryable = client._isRetryableError(error404);

    logResult(
      'Step 3: Verify error handling inherited by all clients',
      hasHandleError && hasHandleRequestError && hasIsRetryableError &&
      is429Retryable && is500Retryable && !is404Retryable,
      `Error methods: ${hasHandleError && hasHandleRequestError && hasIsRetryableError}, ` +
      `429 retryable: ${is429Retryable}, 500 retryable: ${is500Retryable}, 404 retryable: ${is404Retryable}`
    );
  } catch (error) {
    logResult(
      'Step 3: Verify error handling inherited by all clients',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 4: Test rate limiting inherited by all clients
  console.log('\n--- Test 4: Test rate limiting inherited by all clients ---');
  try {
    const client = new BaseApiClient({ name: 'TestClient' });
    const hasRateLimiter = client.rateLimiter !== undefined;
    const rateLimiterHasFetch = typeof client.rateLimiter.fetch === 'function';

    logResult(
      'Step 4: Test rate limiting inherited by all clients',
      hasRateLimiter && rateLimiterHasFetch,
      `Rate limiter present: ${hasRateLimiter}, has fetch method: ${rateLimiterHasFetch}`
    );
  } catch (error) {
    logResult(
      'Step 4: Test rate limiting inherited by all clients',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 5: Confirm logging inherited by all clients
  console.log('\n--- Test 5: Confirm logging inherited by all clients ---');
  try {
    const client1 = new BaseApiClient({ name: 'Client1' });
    const client2 = new BaseApiClient({ name: 'Client2' });

    const hasLogger1 = client1.logger !== undefined;
    const hasLogger2 = client2.logger !== undefined;
    const loggersDifferent = client1.logger !== client2.logger;

    const hasDebugMethod = typeof client1.logger.debug === 'function';
    const hasErrorMethod = typeof client1.logger.error === 'function';

    logResult(
      'Step 5: Confirm logging inherited by all clients',
      hasLogger1 && hasLogger2 && loggersDifferent && hasDebugMethod && hasErrorMethod,
      `Each client has unique logger: ${loggersDifferent}, has debug/error methods: ${hasDebugMethod && hasErrorMethod}`
    );
  } catch (error) {
    logResult(
      'Step 5: Confirm logging inherited by all clients',
      false,
      `Error: ${error.message}`
    );
  }

  // Additional tests
  console.log('\n--- Additional Tests ---');

  // Test HTTP methods
  try {
    const client = new BaseApiClient({ name: 'TestClient', baseURL: 'https://api.test.com' });

    const hasGet = typeof client.get === 'function';
    const hasPost = typeof client.post === 'function';
    const hasPut = typeof client.put === 'function';
    const hasDelete = typeof client.delete === 'function';

    logResult(
      'HTTP methods available (get, post, put, delete)',
      hasGet && hasPost && hasPut && hasDelete,
      `get: ${hasGet}, post: ${hasPost}, put: ${hasPut}, delete: ${hasDelete}`
    );
  } catch (error) {
    logResult(
      'HTTP methods available (get, post, put, delete)',
      false,
      `Error: ${error.message}`
    );
  }

  // Test header sanitization
  try {
    const client = new BaseApiClient({ name: 'TestClient' });
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer secret-token',
      'X-API-Key': 'my-api-key',
      'Accept': 'application/json',
    };

    const sanitized = client._sanitizeHeaders(headers);

    const contentTypePreserved = sanitized['Content-Type'] === 'application/json';
    const authSanitized = sanitized['Authorization'] === '****';
    const apiKeySanitized = sanitized['X-API-Key'] === '****';
    const acceptPreserved = sanitized['Accept'] === 'application/json';

    logResult(
      'Header sanitization works correctly',
      contentTypePreserved && authSanitized && apiKeySanitized && acceptPreserved,
      `Sensitive headers sanitized, non-sensitive preserved`
    );
  } catch (error) {
    logResult(
      'Header sanitization works correctly',
      false,
      `Error: ${error.message}`
    );
  }

  // Print summary
  console.log('\n=================================');
  console.log('Test Summary');
  console.log('=================================\n');
  console.log(`Total tests: ${results.passed.length + results.failed.length}`);
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(f => {
      console.log(`  - ${f.test}: ${f.details}`);
    });
  }

  return results.failed.length === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
