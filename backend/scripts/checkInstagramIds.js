/**
 * Check Instagram IDs and permissions
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

  console.log('=== TOKEN INFO ===');
  console.log('Access token (first 50 chars):', token.accessToken.substring(0, 50) + '...');
  console.log('Token type:', token.tokenType);
  console.log('');

  console.log('=== METADATA ===');
  console.log(JSON.stringify(token.metadata, null, 2));
  console.log('');

  // Test with different ID endpoints
  const igUserId = token.metadata?.instagramUserId;
  const pageId = token.metadata?.pageId;

  console.log('=== TESTING API ENDPOINTS ===');
  console.log('Instagram User ID:', igUserId);
  console.log('Page ID:', pageId);
  console.log('');

  // Test 1: Get Instagram business account info
  if (igUserId) {
    console.log('Test 1: GET /' + igUserId + '?fields=username,account_type');
    const url1 = `https://graph.facebook.com/v18.0/${igUserId}?fields=username,account_type,media_count`;
    const resp1 = await fetch(url1, {
      headers: { 'Authorization': `Bearer ${token.accessToken}` }
    });
    console.log('Status:', resp1.status);
    const data1 = await resp1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('');
  }

  // Test 2: Try the Page's Instagram accounts endpoint
  if (pageId) {
    console.log('Test 2: GET /' + pageId + '?fields=instagram_business_account');
    const url2 = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account`;
    const resp2 = await fetch(url2, {
      headers: { 'Authorization': `Bearer ${token.accessToken}` }
    });
    console.log('Status:', resp2.status);
    const data2 = await resp2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));

    if (data2.instagram_business_account) {
      console.log('  Instagram Business Account ID:', data2.instagram_business_account.id);
      console.log('  Instagram Username:', data2.instagram_business_account.username);
    }
    console.log('');
  }

  // Test 3: Check what the me endpoint returns
  console.log('Test 3: GET /me?fields=id,name,accounts');
  const url3 = `https://graph.facebook.com/v18.0/me?fields=id,name,accounts{instagram_business_account}`;
  const resp3 = await fetch(url3, {
    headers: { 'Authorization': `Bearer ${token.accessToken}` }
  });
  console.log('Status:', resp3.status);
  const data3 = await resp3.json();
  console.log('Response:', JSON.stringify(data3, null, 2));
  console.log('');

  process.exit(0);
}

check().catch(console.error);
