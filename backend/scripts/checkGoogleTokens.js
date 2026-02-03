import path from 'path';
import { fileURLToPath } from 'url';
import configService from '../services/config.js';
import databaseService from '../services/database.js';
import AuthToken from '../models/AuthToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.MONGODB_URI = configService.get('MONGODB_URI');

async function checkGoogleTokens() {
  try {
    await databaseService.connect();

    const googleToken = await AuthToken.findOne({ platform: 'google', isActive: true }).sort({ createdAt: -1 });

    if (!googleToken) {
      console.log('\n❌ No Google token found in database');
      await databaseService.disconnect();
      return;
    }

    console.log('\n=== Google OAuth Token in Database ===');
    console.log('Platform:', googleToken.platform);
    console.log('Active:', googleToken.isActive);
    console.log('Has Access Token:', !!googleToken.accessToken);
    console.log('Has REFRESH Token:', !!googleToken.refreshToken);
    console.log('Expires At:', googleToken.expiresAt ? googleToken.expiresAt.toISOString() : 'NOT SET');
    console.log('Last Refreshed:', googleToken.lastRefreshedAt ? googleToken.lastRefreshedAt.toISOString() : 'NEVER');
    console.log('Created At:', googleToken.createdAt.toISOString());
    console.log('Token Type:', googleToken.tokenType);
    console.log('\nIs Expired?', googleToken.expiresAt && new Date() >= googleToken.expiresAt ? 'YES ⚠️' : 'NO');
    console.log('Time Until Expiry:', googleToken.expiresAt ? Math.round((googleToken.expiresAt - new Date()) / 1000 / 60) + ' minutes' : 'N/A');

    if (!googleToken.refreshToken) {
      console.log('\n⚠️  CRITICAL: No refresh token stored!');
      console.log('This means the initial OAuth flow did not return a refresh token.');
      console.log('You need to re-authenticate with prompt=consent to get a refresh token.');
    } else {
      console.log('\n✅ Refresh token exists - token refresh should work');
    }

    await databaseService.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGoogleTokens();
