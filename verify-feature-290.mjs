#!/usr/bin/env node

/**
 * Feature #290 Verification Script
 * API failure detection and retry with exponential backoff
 */

import http from 'http';

function postData(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/retry-test/simulate-failure',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function verifyFeature290() {
  console.log('==========================================');
  console.log('Feature #290 Verification');
  console.log('API Failure Detection & Retry with Exponential Backoff');
  console.log('==========================================');
  console.log('');

  // Step 1: Simulate API failure
  console.log('Step 1: Simulate API failure');
  console.log('Testing scenario: connection-reset with 3 failures before success');
  console.log('');

  try {
    const response = await postData({
      scenario: 'connection-reset',
      failCount: 3,
      maxRetries: 5
    });

    console.log('Response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    // Verify error was caught
    const attempts = response.statistics.totalAttempts;
    const retryCount = response.statistics.retryCount;
    const duration = response.statistics.duration;

    console.log('Step 2: Verify error caught');
    console.log('✅ Errors were detected and logged');
    console.log(`   Total attempts: ${attempts}`);
    console.log(`   Retry count: ${retryCount}`);
    console.log('');

    // Verify exponential backoff delays
    const delay1 = response.retryLog[0].retryScheduledIn;
    const delay2 = response.retryLog[1].retryScheduledIn;
    const delay3 = response.retryLog[2].retryScheduledIn;

    console.log('Step 3: Retry after 1 second (first retry)');
    console.log(`✅ First retry scheduled after: ${delay1}ms (~1 second)`);
    console.log('');

    console.log('Step 4: Retry after 2 seconds (second retry)');
    console.log(`✅ Second retry scheduled after: ${delay2}ms (~2 seconds)`);
    console.log('');

    console.log('Step 5: Retry after 4 seconds (third retry)');
    console.log(`✅ Third retry scheduled after: ${delay3}ms (~4 seconds)`);
    console.log('');

    console.log('==========================================');
    console.log('Verification Summary');
    console.log('==========================================');

    let allPassed = true;

    // Check if delays follow exponential pattern (1s, 2s, 4s)
    if (delay1 >= 900 && delay1 <= 1100) {
      console.log('✅ Step 3 PASSED: First retry ~1 second');
    } else {
      console.log(`❌ Step 3 FAILED: First retry not ~1 second (was ${delay1}ms)`);
      allPassed = false;
    }

    if (delay2 >= 1900 && delay2 <= 2100) {
      console.log('✅ Step 4 PASSED: Second retry ~2 seconds');
    } else {
      console.log(`❌ Step 4 FAILED: Second retry not ~2 seconds (was ${delay2}ms)`);
      allPassed = false;
    }

    if (delay3 >= 3900 && delay3 <= 4100) {
      console.log('✅ Step 5 PASSED: Third retry ~4 seconds');
    } else {
      console.log(`❌ Step 5 FAILED: Third retry not ~4 seconds (was ${delay3}ms)`);
      allPassed = false;
    }

    if (attempts === 4 && retryCount === 3) {
      console.log('✅ Steps 1-2 PASSED: API failure detected and 3 retries attempted');
    } else {
      console.log(`❌ Steps 1-2 FAILED: Expected 4 attempts with 3 retries, got ${attempts} attempts with ${retryCount} retries`);
      allPassed = false;
    }

    console.log('');

    if (response.success && allPassed) {
      console.log('✅ All steps VERIFIED: Feature #290 is working correctly!');
      console.log(`   Total duration: ${duration}`);
      console.log('');
      console.log('🎉 Feature #290 MARKED AS PASSING');
      process.exit(0);
    } else {
      console.log('❌ Feature verification FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error during verification:', error.message);
    process.exit(1);
  }
}

verifyFeature290();
