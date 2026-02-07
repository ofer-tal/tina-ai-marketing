/**
 * Check TikTok token status
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

console.log('=== Checking TikTok Tokens ===\n');

// Get all TikTok tokens (active and inactive)
const allTokens = await AuthToken.find({ platform: 'tiktok' }).sort({ createdAt: -1 });

console.log('Total TikTok tokens in database:', allTokens.length);
console.log('');

for (const token of allTokens) {
  console.log('---');
  console.log('Token ID:', token._id.toString());
  console.log('isActive:', token.isActive);
  console.log('hasAccessToken:', !!token.accessToken);
  console.log('accessTokenLength:', token.accessToken?.length || 0);
  console.log('hasRefreshToken:', !!token.refreshToken);
  console.log('refreshTokenLength:', token.refreshToken?.length || 0);
  console.log('expiresAt:', token.expiresAt?.toISOString());

  if (token.expiresAt) {
    const now = new Date();
    const isExpired = now >= token.expiresAt;
    const timeUntilExpiry = token.expiresAt.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

    console.log('isExpired:', isExpired);
    console.log('hoursUntilExpiry:', hoursUntilExpiry.toFixed(2));

    if (isExpired) {
      const hoursSinceExpiry = Math.abs(hoursUntilExpiry);
      console.log(`EXPIRED SINCE: ${hoursSinceExpiry.toFixed(2)} hours ago`);
    } else if (hoursUntilExpiry < 0) {
      console.log(`Expires soon: in ${Math.abs(hoursUntilExpiry).toFixed(2)} hours`);
    }
  }

  console.log('lastRefreshedAt:', token.lastRefreshedAt?.toISOString());
  console.log('deactivatedAt:', token.deactivatedAt?.toISOString());
  console.log('createdAt:', token.createdAt?.toISOString());
  console.log('creatorId:', token.creatorId);
  console.log('metadata:', JSON.stringify(token.metadata || {}, null, 2));
  console.log('');
}

// Get active token specifically
const activeToken = await AuthToken.getActiveToken('tiktok');
console.log('=== ACTIVE TOKEN (from getActiveToken) ===');
if (activeToken) {
  console.log('Active token found:', activeToken._id.toString());
  console.log('isActive:', activeToken.isActive);
  console.log('expiresAt:', activeToken.expiresAt?.toISOString());
  console.log('hasRefreshToken:', !!activeToken.refreshToken);
} else {
  console.log('NO ACTIVE TOKEN FOUND!');
}

process.exit(0);
