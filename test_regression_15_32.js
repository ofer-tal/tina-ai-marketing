// Regression test for Features #15 (API client base class) and #32 (Manual data refresh)

async function runTests() {
  console.log('=== REGRESSION TEST: Features #15 and #32 ===\n');

  let passed = 0;
  let failed = 0;

  // Feature #15: API client base class
  console.log('Testing Feature #15: API client base class');
  console.log('Step 1: Verify BaseApiClient class exists');
  try {
    const { BaseApiClient } = await import('./backend/services/baseApiClient.js');
    console.log('✅ BaseApiClient class loaded');
    passed++;
  } catch (error) {
    console.log('❌ BaseApiClient class not found:', error.message);
    failed++;
  }

  console.log('\nStep 2-5: Verify inherited methods');
  try {
    const { BaseApiClient } = await import('./backend/services/baseApiClient.js');

    // Check for required methods
    const methods = ['authenticate', 'handleRequest', 'handleError', 'checkRateLimit', 'log'];
    const allPresent = methods.every(method => typeof BaseApiClient.prototype[method] === 'function');

    if (allPresent) {
      console.log('✅ All required methods present on BaseApiClient');
      passed++;
    } else {
      console.log('❌ Some methods missing from BaseApiClient');
      failed++;
    }
  } catch (error) {
    console.log('❌ Error checking BaseApiClient methods:', error.message);
    failed++;
  }

  // Feature #32: Manual data refresh option
  console.log('\nTesting Feature #32: Manual data refresh option');
  console.log('Step 1: Navigate to /dashboard (API check)');

  try {
    // Test dashboard endpoint exists
    const response = await fetch('http://localhost:4001/api/dashboard/tactical?period=24h');
    const data = await response.json();
    console.log('✅ Dashboard endpoint accessible');
    passed++;

    // Test that data includes timestamp
    if (data && data.timestamp) {
      console.log('✅ Dashboard data includes timestamp for refresh tracking');
      passed++;
    } else {
      console.log('⚠️  Dashboard data missing timestamp');
      failed++;
    }

    // Test refresh endpoint
    const refreshResponse = await fetch('http://localhost:4001/api/dashboard/refresh', { method: 'POST' });
    if (refreshResponse.status === 200) {
      console.log('✅ Manual refresh endpoint works');
      passed++;
    } else {
      console.log('❌ Manual refresh endpoint failed');
      failed++;
    }

  } catch (error) {
    console.log('❌ Dashboard/refresh test failed:', error.message);
    failed++;
  }

  console.log('\n=== REGRESSION TEST RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ All regression tests PASSED!');
    process.exit(0);
  } else {
    console.log('\n❌ Some regression tests FAILED!');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
