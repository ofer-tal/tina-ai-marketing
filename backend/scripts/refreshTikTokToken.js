import databaseService from '../services/database.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');
config({ path: path.join(projectRoot, '.env') });

async function testTikTokTokenRefresh() {
  console.log('=== Testing TikTok Token Refresh ===\n');

  // Connect to database
  await databaseService.connect();
  console.log('Connected to database\n');

  // Initialize service (loads tokens from database)
  await tiktokPostingService.initialize();

  console.log('Before ensureValidToken():');
  console.log(`  Has access token: ${!!tiktokPostingService.accessToken}`);
  console.log(`  Expires at: ${tiktokPostingService.tokenExpiresAt}`);
  console.log(`  Is expired: ${tiktokPostingService.tokenExpiresAt && new Date() >= tiktokPostingService.tokenExpiresAt}`);

  console.log('\nCalling ensureValidToken()...\n');

  try {
    const token = await tiktokPostingService.ensureValidToken();

    console.log('After ensureValidToken():');
    console.log(`  ✅ Got valid token: ${token.substring(0, 20)}...`);
    console.log(`  Expires at: ${tiktokPostingService.tokenExpiresAt}`);
    console.log(`  Time until expiry: ${tiktokPostingService.tokenExpiresAt ? Math.round((tiktokPostingService.tokenExpiresAt - new Date()) / 1000 / 60) + ' minutes' : 'unknown'}`);

  } catch (error) {
    console.error('❌ ensureValidToken() failed:', error.message);
    console.error('   Stack:', error.stack);
  }

  process.exit(0);
}

testTikTokTokenRefresh().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
