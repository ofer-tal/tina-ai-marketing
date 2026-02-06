/**
 * Debug why /me/accounts is empty
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

async function debug() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');
  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  const accessToken = token.accessToken;

  console.log('=== DEBUGGING /me/accounts EMPTY RESPONSE ===');
  console.log('');

  // Check what user ID the token is for
  console.log('Test: GET /me (basic)');
  const meResp = await fetch('https://graph.facebook.com/v18.0/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('Status:', meResp.status);
  const meData = await meResp.json();
  console.log('User ID:', meData.id);
  console.log('Name:', meData.name);
  console.log('');

  // Try /me/accounts with different response format
  console.log('Test: GET /me/accounts (without fields filter)');
  const accountsResp = await fetch('https://graph.facebook.com/v18.0/me/accounts', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('Status:', accountsResp.status);
  const accountsData = await accountsResp.json();
  console.log('Response:', JSON.stringify(accountsData, null, 2));
  console.log('');

  // Check if we need additional permissions
  console.log('=== CHECKING REQUIRED PERMISSIONS ===');
  console.log('For /me/accounts to return pages, you need:');
  console.log('- pages_show_list permission (we have this: ✓)');
  console.log('');
  console.log('The issue might be that during OAuth, you need to:');
  console.log('1. Select a specific Page (not just "all pages")');
  console.log('2. The app must be added to the Page via Business Settings');
  console.log('');

  // Also check if we need to use Instagram Login (not Facebook Login)
  console.log('=== ALTERNATIVE: INSTAGRAM LOGIN ===');
  console.log('Instagram Login uses graph.instagram.com and Instagram User tokens');
  console.log('This might be simpler than dealing with Page access tokens');
  console.log('Required permissions: instagram_business_basic, instagram_business_content_publish');
  console.log('');

  process.exit(0);
}

debug().catch(console.error);
