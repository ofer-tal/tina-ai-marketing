/**
 * Test TikTok token refresh
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;
await databaseService.connect();

const { default: AuthToken } = await import('../models/AuthToken.js');
const oauthManager = (await import('../services/oauthManager.js')).default;

console.log('=== Testing TikTok Token Refresh ===\n');

// Get the active token
const activeToken = await AuthToken.getActiveToken('tiktok');

if (!activeToken) {
  console.log('ERROR: No active TikTok token found!');
  process.exit(1);
}

console.log('Current Token:');
console.log('  ID:', activeToken._id.toString());
console.log('  isActive:', activeToken.isActive);
console.log('  expiresAt:', activeToken.expiresAt?.toISOString());
console.log('  hasRefreshToken:', !!activeToken.refreshToken);
console.log('  refreshTokenLength:', activeToken.refreshToken?.length || 0);
console.log('');

// Check if token is expired
const now = new Date();
const isExpired = activeToken.expiresAt && now >= activeToken.expiresAt;

if (isExpired) {
  console.log('Token is EXPIRED - testing refresh...\n');
} else {
  console.log('Token is not yet expired - will test refresh anyway...\n');
}

// Test the manual refresh method
console.log('Calling oauthManager._refreshTikTokToken()...');

try {
  const newTokenData = await oauthManager._refreshTikTokToken(activeToken.refreshToken);

  console.log('\nRefresh SUCCESS!');
  console.log('  New accessToken:', newTokenData.accessToken.substring(0, 20) + '...');
  console.log('  New expiresAt:', newTokenData.expiresAt.toISOString());
  console.log('  Has new refresh token:', !!newTokenData.refreshToken);
  console.log('');

  // Update the token in database
  console.log('Updating token in database...');
  const updatedToken = await AuthToken.refreshToken('tiktok', {
    accessToken: newTokenData.accessToken,
    refreshToken: newTokenData.refreshToken || activeToken.refreshToken,
    expiresAt: newTokenData.expiresAt,
  });

  console.log('Token updated in database:');
  console.log('  ID:', updatedToken._id.toString());
  console.log('  isActive:', updatedToken.isActive);
  console.log('  New expiresAt:', updatedToken.expiresAt.toISOString());
  console.log('');

} catch (error) {
  console.error('\nRefresh FAILED:', error.message);
  console.error('\nThis likely means:');
  console.error('1. The refresh token has expired (TikTok refresh tokens expire after 365 days)');
  console.error('2. The refresh token has been revoked');
  console.error('3. The app credentials (TIKTOK_APP_KEY/SECRET) are incorrect');
  console.error('\nYou will need to re-authenticate with TikTok.');
  process.exit(1);
}

console.log('=== SUCCESS ===');
console.log('TikTok token has been refreshed and is now valid.');

process.exit(0);
