/**
 * Health Check Endpoint Tests
 *
 * Tests for /api/health endpoint
 */

import http from 'http';

const HOST = 'localhost';
const PORT = 3001;

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

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n=================================');
  console.log('Health Check Endpoint Tests');
  console.log('=================================\n');
  console.log(`Target: http://${HOST}:${PORT}/api/health\n`);

  // Test 1: Call GET /api/health
  console.log('--- Test 1: Call GET /api/health ---');
  try {
    const response = await makeRequest('/api/health');

    const hasStatus200 = response.status === 200;
    const hasJsonBody = typeof response.data === 'object';

    logResult(
      'Step 1: Call GET /api/health',
      hasStatus200 && hasJsonBody,
      `Status: ${response.status}, JSON response: ${hasJsonBody}`
    );

    if (!hasStatus200 || !hasJsonBody) {
      console.log('   Full response:', JSON.stringify(response, null, 2));
      // Early exit if basic request failed
      process.exit(1);
    }

    const healthData = response.data;

    // Test 2: Verify response includes status: 'ok'
    console.log('\n--- Test 2: Verify response includes status: \'ok\' ---');
    const hasStatusOk = healthData.status === 'ok';
    logResult(
      'Step 2: Verify response includes status: \'ok\'',
      hasStatusOk,
      `Status field: "${healthData.status}"`
    );

    // Test 3: Check response includes database connection status
    console.log('\n--- Test 3: Check response includes database connection status ---');
    const hasDatabase = healthData.database !== undefined;
    const hasConnectedField = healthData.database && healthData.database.connected !== undefined;
    const hasReadyState = healthData.database && healthData.database.readyState !== undefined;

    logResult(
      'Step 3: Check response includes database connection status',
      hasDatabase && hasConnectedField && hasReadyState,
      `Database present: ${hasDatabase}, connected: ${healthData?.database?.connected}, readyState: ${healthData?.database?.readyState}`
    );

    // Test 4: Verify response includes uptime
    console.log('\n--- Test 4: Verify response includes uptime ---');
    const hasUptime = healthData.uptime !== undefined;
    const hasUptimeHuman = healthData.uptimeHuman !== undefined;
    const uptimeIsNumber = typeof healthData.uptime === 'number';
    const uptimeGreaterThanZero = healthData.uptime > 0;

    logResult(
      'Step 4: Verify response includes uptime',
      hasUptime && hasUptimeHuman && uptimeIsNumber && uptimeGreaterThanZero,
      `Uptime: ${healthData.uptime}s (${healthData.uptimeHuman})`
    );

    // Test 5: Confirm external API connection status
    console.log('\n--- Test 5: Confirm external API connection status ---');
    const hasExternalApis = healthData.externalApis !== undefined;
    const hasTotalApis = healthData.externalApis && typeof healthData.externalApis.total === 'number';
    const hasConfiguredCount = healthData.externalApis && typeof healthData.externalApis.configured === 'number';
    const hasApisDetail = healthData.externalApis && typeof healthData.externalApis.apis === 'object';

    let apiDetailString = '';
    if (hasApisDetail) {
      const apiNames = Object.keys(healthData.externalApis.apis);
      apiDetailString = `APIs tracked: ${apiNames.join(', ')}`;
    }

    logResult(
      'Step 5: Confirm external API connection status',
      hasExternalApis && hasTotalApis && hasConfiguredCount && hasApisDetail,
      `${hasExternalApis ? `Total: ${healthData.externalApis.total}, Configured: ${healthData.externalApis.configured}` : 'Missing'} | ${apiDetailString}`
    );

    // Additional tests
    console.log('\n--- Additional Tests ---');

    const hasTimestamp = healthData.timestamp !== undefined;
    const hasEnvironment = healthData.environment !== undefined;
    const hasVersion = healthData.version !== undefined;

    logResult(
      'Additional fields present (timestamp, environment, version)',
      hasTimestamp && hasEnvironment && hasVersion,
      `Timestamp: ${healthData.timestamp?.substring(0, 19)}..., Env: ${healthData.environment}, Version: ${healthData.version}`
    );

  } catch (error) {
    logResult(
      'Step 1: Call GET /api/health',
      false,
      `Request failed: ${error.message}`
    );
    console.log('\n⚠️  Server may not be running. Please start the backend server:');
    console.log('   npm run dev');
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
