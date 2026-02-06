/**
 * Check Instagram Business Account setup and permissions
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { default: AuthToken } = await import('../models/AuthToken.js');
const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;

async function check() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  const accessToken = token.accessToken;
  const businessAccountId = token.metadata?.instagramUserId;

  console.log('=== CHECKING INSTAGRAM BUSINESS ACCOUNT ===');
  console.log('Business Account ID:', businessAccountId);
  console.log('');

  // Check the business account details
  const fields = 'id,username,profile_picture_url,biography,website,followers_count,media_count,follows_count,ig_id';
  const url = `https://graph.facebook.com/v18.0/${businessAccountId}?fields=${fields}`;
  console.log('URL:', url);

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('Status:', resp.status);
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  // Check what content publishing features are available
  console.log('=== CHECKING CONTENT PUBLISHING STATUS ===');

  // Try the media publish endpoint requirements
  console.log('According to Instagram docs, for content publishing you need:');
  console.log('1. Instagram Professional or Creator account');
  console.log('2. instagram_content_publish permission (we have this)');
  console.log('3. App added to the Instagram account\'s "Testers" or in Developer Mode');
  console.log('');

  // Check if we can get the account type
  const typeUrl = `https://graph.facebook.com/v18.0/${businessAccountId}?fields=id,username,account_type`;
  const typeResp = await fetch(typeUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const typeData = await typeResp.json();
  console.log('Account info:', JSON.stringify(typeData, null, 2));
  console.log('');

  // Check account_type specifically
  if (typeData.account_type) {
    console.log('Account Type:', typeData.account_type);
    console.log('  - MEDIA_CREATOR: OK for posting');
    console.log('  - BUSINESS: OK for posting');
    console.log('  - PERSONAL: NOT OK - must convert to Professional/Creator');
    console.log('');
  }

  // The issue might be that the app needs to be in Developer Mode for the account
  console.log('=== COMMON ISSUES ===');
  console.log('1. App not in "Testers" for the Instagram account');
  console.log('   - Go to IG Business Settings -> Developers -> App Testing');
  console.log('   - Add your app as a Tester');
  console.log('');
  console.log('2. Instagram account not in "Developer Mode" for the app');
  console.log('   - Go to IG Business Settings -> Developers -> App Requirements');
  console.log('   - Enable "Developer Mode" or switch to "Sandbox Mode"');
  console.log('');

  process.exit(0);
}

check().catch(console.error);
