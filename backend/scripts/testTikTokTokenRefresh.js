import databaseService from '../services/database.js';
import AuthToken from '../models/AuthToken.js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');
config({ path: path.join(projectRoot, '.env') });

async function testTikTokTokenRefresh() {
  console.log('Connecting to database...');
  await databaseService.connect();
  console.log('Testing TikTok token status and refresh logic...\n');

  // Get active TikTok token
  const tokenDoc = await AuthToken.getActiveToken('tiktok');

  if (!tokenDoc) {
    console.log('NO ACTIVE TIKTOK TOKEN FOUND!');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(tokenDoc.expiresAt);
  const isExpired = tokenDoc.expiresAt && now >= expiresAt;
  const willExpireSoon = tokenDoc.expiresAt && (expiresAt - now) < (5 * 60 * 1000);

  console.log('Active TikTok Token:');
  console.log(`  ID: ${tokenDoc._id}`);
  console.log(`  isActive: ${tokenDoc.isActive}`);
  console.log(`  expiresAt: ${tokenDoc.expiresAt}`);
  console.log(`  refreshToken exists: ${!!tokenDoc.refreshToken}`);
  console.log(`  Current time: ${now.toISOString()}`);
  console.log(`  Is expired: ${isExpired}`);
  console.log(`  Will expire soon: ${willExpireSoon}`);

  if (isExpired) {
    console.log('\n❌ Token is EXPIRED!');
    console.log('   The ensureValidToken() method should catch this and refresh.');
    console.log(`   Time since expiration: ${Math.round((now - expiresAt) / 1000 / 60)} minutes`);
  } else if (willExpireSoon) {
    console.log('\n⚠️  Token will expire soon!');
    console.log('   The ensureValidToken() method should proactively refresh.');
  } else {
    console.log('\n✅ Token is valid');
    console.log(`   Time until expiration: ${Math.round((expiresAt - now) / 1000 / 60)} minutes`);
  }
}

testTikTokTokenRefresh().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
