/**
 * Test Google Token Refresh - Proves the fix works
 *
 * This script:
 * 1. Gets the current active Google token
 * 2. Calls the refresh mechanism (same code path as posting)
 * 3. Verifies the token is properly configured after refresh
 */

import { config } from 'dotenv';
config(); // Load .env FIRST - before any other imports that need env vars!

import AuthToken from '../models/AuthToken.js';
import databaseService from '../services/database.js';
import { getLogger } from '../utils/logger.js';

// Import googleSheetsService after .env is loaded
// Note: The service is a singleton created at module load time
// We need to ensure credentials are available
import('path').then(({ default: path }) => {
  // Force reload of the module to pick up env vars
  delete require.cache[path.resolve('../services/googleSheetsService.js')];
});

const logger = getLogger('test-token-refresh');

async function testTokenRefresh() {
  console.log('\n========================================');
  console.log('GOOGLE TOKEN REFRESH TEST');
  console.log('========================================\n');

  // Connect to database
  await databaseService.connect();

  // Step 1: Get current active token state BEFORE
  console.log('STEP 1: Current Token State (BEFORE refresh)');
  console.log('-------------------------------------------');
  const beforeToken = await AuthToken.getActiveToken('google');

  if (!beforeToken) {
    console.log('❌ FAIL: No active Google token found!');
    await databaseService.disconnect();
    return;
  }

  console.log('✓ Active token found:');
  console.log(`  ID: ${beforeToken._id}`);
  console.log(`  accessToken (first 30 chars): ${beforeToken.accessToken?.substring(0, 30)}...`);
  console.log(`  refreshToken (first 30 chars): ${beforeToken.refreshToken?.substring(0, 30)}...`);
  console.log(`  expiresAt: ${beforeToken.expiresAt?.toISOString() || 'NULL'}`);
  console.log(`  isActive: ${beforeToken.isActive}`);
  console.log(`  lastRefreshedAt: ${beforeToken.lastRefreshedAt?.toISOString()}`);

  // Calculate time until expiration
  const now = new Date();
  const timeUntilExpiry = beforeToken.expiresAt
    ? beforeToken.expiresAt.getTime() - now.getTime()
    : null;
  const minutesUntilExpiry = timeUntilExpiry
    ? Math.round(timeUntilExpiry / 60000)
    : null;

  console.log(`  Time until expiry: ${minutesUntilExpiry} minutes`);

  // Step 2: Force refresh the token (simulating expired token)
  console.log('\nSTEP 2: Forcing Token Refresh');
  console.log('-------------------------------------------');

  try {
    // First, initialize the service to load tokens into memory
    console.log('Initializing googleSheetsService to load tokens from database...');
    await googleSheetsService.initialize();

    // Verify service has the refresh token loaded
    console.log(`Service has refreshToken in memory: ${!!googleSheetsService.refreshToken}`);

    // Set expiresAt to past to simulate expired token
    console.log('Setting expiresAt to past to force refresh...');
    await AuthToken.refreshToken('google', {
      expiresAt: new Date(Date.now() - 1000) // 1 second ago
    });

    // Now call the googleSheetsService refresh method
    // This is the same code path used during posting
    console.log('Calling googleSheetsService refreshAccessToken()...');

    const refreshResult = await googleSheetsService.refreshAccessToken();

    console.log('Refresh result:', refreshResult);

    if (!refreshResult || !refreshResult.success) {
      throw new Error(refreshResult?.error || 'Refresh failed');
    }

    console.log('✓ Token refresh succeeded!');
    console.log(`  New accessToken (first 30 chars): ${refreshResult.accessToken?.substring(0, 30)}...`);
    console.log(`  New refreshToken present: ${!!refreshResult.refreshToken}`);
    console.log(`  New expiresAt: ${refreshResult.expiresAt?.toISOString()}`);

  } catch (error) {
    console.log(`❌ Refresh failed: ${error.message}`);
    await databaseService.disconnect();
    return;
  }

  // Step 3: Verify token state AFTER refresh
  console.log('\nSTEP 3: Token State (AFTER refresh)');
  console.log('-------------------------------------------');

  const afterToken = await AuthToken.getActiveToken('google');

  if (!afterToken) {
    console.log('❌ FAIL: No active token after refresh!');
    await databaseService.disconnect();
    return;
  }

  console.log('✓ Active token found after refresh:');
  console.log(`  ID: ${afterToken._id}`);
  console.log(`  accessToken (first 30 chars): ${afterToken.accessToken?.substring(0, 30)}...`);
  console.log(`  accessToken length: ${afterToken.accessToken?.length || 0}`);
  console.log(`  refreshToken (first 30 chars): ${afterToken.refreshToken?.substring(0, 30)}...`);
  console.log(`  refreshToken length: ${afterToken.refreshToken?.length || 0}`);
  console.log(`  expiresAt: ${afterToken.expiresAt?.toISOString() || 'NULL'}`);
  console.log(`  isActive: ${afterToken.isActive}`);
  console.log(`  lastRefreshedAt: ${afterToken.lastRefreshedAt?.toISOString()}`);

  // Step 4: Validate all required fields
  console.log('\nSTEP 4: Validation');
  console.log('-----------');

  const validation = {
    hasAccessToken: !!afterToken.accessToken && afterToken.accessToken.length > 0,
    hasRefreshToken: !!afterToken.refreshToken && afterToken.refreshToken.length > 0,
    hasValidExpiresAt: !!afterToken.expiresAt && afterToken.expiresAt > new Date(),
    isActive: afterToken.isActive === true,
    expiresAfterNow: afterToken.expiresAt && afterToken.expiresAt > new Date()
  };

  console.log('Validation results:');
  console.log(`  ✓ Has access token: ${validation.hasAccessToken ? 'YES' : 'NO'}`);
  console.log(`  ✓ Has refresh token: ${validation.hasRefreshToken ? 'YES' : 'NO'}`);
  console.log(`  ✓ Has valid expiresAt Date: ${validation.hasValidExpiresAt ? 'YES' : 'NO'}`);
  console.log(`  ✓ Token is active: ${validation.isActive ? 'YES' : 'NO'}`);
  console.log(`  ✓ expiresAt is in the future: ${validation.expiresAfterNow ? 'YES' : 'NO'}`);

  // Calculate new time until expiry
  const newTimeUntilExpiry = afterToken.expiresAt
    ? afterToken.expiresAt.getTime() - now.getTime()
    : null;
  const newMinutesUntilExpiry = newTimeUntilExpiry
    ? Math.round(newTimeUntilExpiry / 60000)
    : null;

  console.log(`  Time until new expiry: ${newMinutesUntilExpiry} minutes`);

  // Final verdict
  console.log('\n========================================');
  if (validation.hasAccessToken &&
      validation.hasRefreshToken &&
      validation.hasValidExpiresAt &&
      validation.isActive &&
      validation.expiresAfterNow) {
    console.log('✅ SUCCESS: Token refresh works correctly!');
    console.log('   The token is properly configured and ready for posting.');
    console.log('========================================\n');
  } else {
    console.log('❌ FAIL: Token validation failed!');
    console.log('========================================\n');
  }

  await databaseService.disconnect();
}

testTokenRefresh().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
