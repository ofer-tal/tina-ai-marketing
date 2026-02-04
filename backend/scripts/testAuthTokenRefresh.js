/**
 * Test AuthToken.refreshToken() - Proves the fix works
 *
 * This script directly tests the AuthToken.refreshToken() method to verify
 * that it properly updates token fields without the expiresAt=null bug.
 */

import { config } from 'dotenv';
config(); // Load .env first!

import AuthToken from '../models/AuthToken.js';
import databaseService from '../services/database.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('test-authtoken-refresh');

async function testAuthTokenRefresh() {
  console.log('\n========================================');
  console.log('AUTH TOKEN REFRESH TEST');
  console.log('Testing the fix for expiresAt=null bug');
  console.log('========================================\n');

  // Connect to database
  await databaseService.connect();

  // Step 1: Get current active token state
  console.log('STEP 1: Current Token State');
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

  // Step 2: Test AuthToken.refreshToken() with new data
  // This simulates what would happen after a successful Google token refresh
  console.log('\nSTEP 2: Testing AuthToken.refreshToken()');
  console.log('-------------------------------------------');

  const testExpiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour from now
  const testAccessToken = 'test_new_access_token_' + Date.now();

  console.log('Calling AuthToken.refreshToken() with test data...');
  console.log(`  New accessToken: ${testAccessToken.substring(0, 30)}...`);
  console.log(`  New expiresAt: ${testExpiresAt.toISOString()}`);

  try {
    const updatedToken = await AuthToken.refreshToken('google', {
      accessToken: testAccessToken,
      refreshToken: beforeToken.refreshToken, // Keep the same refresh token
      expiresAt: testExpiresAt,
    });

    if (!updatedToken) {
      console.log('❌ FAIL: AuthToken.refreshToken() returned null!');
      await databaseService.disconnect();
      return;
    }

    console.log('✓ AuthToken.refreshToken() succeeded!');
    console.log(`  Returned token ID: ${updatedToken._id}`);

  } catch (error) {
    console.log(`❌ FAIL: AuthToken.refreshToken() threw error: ${error.message}`);
    console.log(`  Stack: ${error.stack}`);
    await databaseService.disconnect();
    return;
  }

  // Step 3: Verify token state AFTER refresh
  console.log('\nSTEP 3: Token State (AFTER refresh)');
  console.log('-------------------------------------------');

  // Force a fresh read from database (not from cache)
  const freshToken = await AuthToken.getActiveToken('google');

  if (!freshToken) {
    console.log('❌ FAIL: No active token after refresh!');
    await databaseService.disconnect();
    return;
  }

  console.log('✓ Fresh token read from database:');
  console.log(`  ID: ${freshToken._id}`);
  console.log(`  accessToken: ${freshToken.accessToken}`);
  console.log(`  accessToken length: ${freshToken.accessToken?.length || 0}`);
  console.log(`  refreshToken (first 30 chars): ${freshToken.refreshToken?.substring(0, 30)}...`);
  console.log(`  refreshToken length: ${freshToken.refreshToken?.length || 0}`);
  console.log(`  expiresAt: ${freshToken.expiresAt?.toISOString() || 'NULL'}`);
  console.log(`  isActive: ${freshToken.isActive}`);
  console.log(`  lastRefreshedAt: ${freshToken.lastRefreshedAt?.toISOString()}`);

  // Step 4: Validation - THE KEY TESTS
  console.log('\nSTEP 4: Validation (THE FIX)');
  console.log('-------------------------------------------');

  const validation = {
    hasAccessToken: !!freshToken.accessToken && freshToken.accessToken.length > 0,
    hasRefreshToken: !!freshToken.refreshToken && freshToken.refreshToken.length > 0,
    hasValidExpiresAt: !!freshToken.expiresAt && freshToken.expiresAt instanceof Date,
    expiresAtIsNotNull: freshToken.expiresAt !== null,
    expiresAtIsNotUndefined: freshToken.expiresAt !== undefined,
    isActive: freshToken.isActive === true,
    expiresAfterNow: freshToken.expiresAt && freshToken.expiresAt > new Date(),
    accessTokenUpdated: freshToken.accessToken === testAccessToken,
    lastRefreshedAtUpdated: freshToken.lastRefreshedAt instanceof Date
  };

  console.log('Validation results:');
  console.log(`  ✓ Has access token: ${validation.hasAccessToken ? 'YES' : 'NO'}`);
  console.log(`  ✓ Has refresh token: ${validation.hasRefreshToken ? 'YES' : 'NO'}`);
  console.log(`  ✓ expiresAt is NOT null: ${validation.expiresAtIsNotNull ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  ✓ expiresAt is NOT undefined: ${validation.expiresAtIsNotUndefined ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  ✓ expiresAt is a valid Date: ${validation.hasValidExpiresAt ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  ✓ expiresAt is in the future: ${validation.expiresAfterNow ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  ✓ Token is active: ${validation.isActive ? 'YES' : 'NO'}`);
  console.log(`  ✓ accessToken was updated: ${validation.accessTokenUpdated ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  ✓ lastRefreshedAt was updated: ${validation.lastRefreshedAtUpdated ? 'YES' : 'NO'}`);

  // Step 5: Restore the original access token
  console.log('\nSTEP 5: Restoring original access token');
  console.log('-------------------------------------------');
  await AuthToken.refreshToken('google', {
    accessToken: beforeToken.accessToken,
    expiresAt: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour from now
  });
  console.log('✓ Original access token restored');

  // Final verdict
  console.log('\n========================================');
  if (validation.hasAccessToken &&
      validation.hasRefreshToken &&
      validation.expiresAtIsNotNull &&
      validation.expiresAtIsNotUndefined &&
      validation.hasValidExpiresAt &&
      validation.isActive &&
      validation.expiresAfterNow &&
      validation.accessTokenUpdated) {
    console.log('✅ SUCCESS: AuthToken.refreshToken() works correctly!');
    console.log('');
    console.log('THE FIX IS VALIDATED:');
    console.log('  • expiresAt is NOT null (was the bug)');
    console.log('  • expiresAt is a valid Date object');
    console.log('  • expiresAt is set to the future');
    console.log('  • accessToken is properly updated');
    console.log('  • refreshToken is preserved');
    console.log('  • Token remains active');
    console.log('');
    console.log('This proves the Object.assign() bug is FIXED.');
    console.log('========================================\n');
  } else {
    console.log('❌ FAIL: Token validation failed!');
    console.log('The bug is NOT fixed.');
    console.log('========================================\n');
  }

  await databaseService.disconnect();
}

testAuthTokenRefresh().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
