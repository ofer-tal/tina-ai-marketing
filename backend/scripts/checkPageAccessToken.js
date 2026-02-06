/**
 * Check if we need to use Page Access Token for Instagram posting
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

  const userAccessToken = token.accessToken;
  const pageId = token.metadata?.pageId;
  const igUserId = token.metadata?.instagramUserId;

  console.log('=== CURRENT SETUP ===');
  console.log('Token type: User Access Token (probably)');
  console.log('Page ID:', pageId);
  console.log('IG User ID:', igUserId);
  console.log('');

  // Try to get the Page Access Token
  console.log('=== GETTING PAGE ACCESS TOKEN ===');
  const accountsUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=access_token,name,id`;
  console.log('URL:', accountsUrl);

  const resp = await fetch(accountsUrl, {
    headers: { 'Authorization': `Bearer ${userAccessToken}` }
  });
  console.log('Status:', resp.status);
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (data.data && data.data.length > 0) {
    const page = data.data.find(p => p.id === pageId);
    if (page && page.access_token) {
      const pageAccessToken = page.access_token;

      console.log('=== FOUND PAGE ACCESS TOKEN ===');
      console.log('Page:', page.name);
      console.log('Page ID:', page.id);
      console.log('Token (first 50 chars):', pageAccessToken.substring(0, 50) + '...');
      console.log('');

      // Test container creation with Page Access Token
      console.log('=== TESTING CONTAINER CREATION WITH PAGE ACCESS TOKEN ===');
      const videoUrl = 'https://content.blush.v6v.one/marketing/videos/instagram-6984f0a359585ce5ff08a24f-retry-1770365169723.mp4';
      const params = new URLSearchParams({
        video_url: videoUrl,
        caption: 'Test with Page Access Token',
        media_type: 'REELS',
      });

      // Try with IG User ID + Page Access Token
      const testUrl = `https://graph.facebook.com/v18.0/${igUserId}/media?${params}`;
      console.log('URL:', testUrl);
      const testResp = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Using User Access Token...');
      console.log('Status:', testResp.status);
      const testText1 = await testResp.text();
      console.log('Response:', testText1.substring(0, 500));
      console.log('');

      // Now try with Page Access Token
      console.log('Now trying with Page Access Token...');
      const testResp2 = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Status:', testResp2.status);
      const testText2 = await testResp2.text();
      console.log('Response:', testText2.substring(0, 500));
    }
  }

  process.exit(0);
}

check().catch(console.error);
