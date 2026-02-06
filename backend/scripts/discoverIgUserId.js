/**
 * Discover correct Instagram User ID for posting
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

async function discover() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  const pageId = token.metadata?.pageId;
  const accessToken = token.accessToken;

  console.log('=== DISCOVERING INSTAGRAM USER ID FOR POSTING ===');
  console.log('Page ID:', pageId);
  console.log('');

  // Method 1: Get Instagram Business Account from Page
  console.log('Method 1: Page -> Instagram Business Account');
  const url1 = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account{id,username,media_count}`;
  const resp1 = await fetch(url1, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data1 = await resp1.json();
  console.log(JSON.stringify(data1, null, 2));
  console.log('');

  // Method 2: Get all accounts and find Instagram
  console.log('Method 2: /me/accounts with Instagram Business Account info');
  const url2 = `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{id,username,media_count,ig_id}`;
  const resp2 = await fetch(url2, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data2 = await resp2.json();
  console.log(JSON.stringify(data2, null, 2));
  console.log('');

  // Method 3: Try using the Page ID directly for media creation (with PAGE access token)
  console.log('Method 3: Try Page ID for media container creation');
  const videoUrl = 'https://content.blush.v6v.one/marketing/videos/instagram-6984f0a359585ce5ff08a24f-retry-1770365169723.mp4';
  const params = new URLSearchParams({
    video_url: videoUrl,
    caption: 'Test with Page ID',
    media_type: 'REELS',
  });
  const url3 = `https://graph.facebook.com/v18.0/${pageId}/media?${params}`;
  console.log('URL:', url3);
  const resp3 = await fetch(url3, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('Status:', resp3.status);
  const text3 = await resp3.text();
  console.log('Response:', text3);
  console.log('');

  // Method 4: Use Instagram Business Account ID with ig_id instead
  if (data1.instagram_business_account) {
    const igAccountId = data1.instagram_business_account.id;
    console.log('Method 4: Use IG Business Account ID directly');
    console.log('IG Account ID:', igAccountId);

    const params4 = new URLSearchParams({
      video_url: videoUrl,
      caption: 'Test with IG Business Account ID',
      media_type: 'REELS',
    });
    const url4 = `https://graph.facebook.com/v18.0/${igAccountId}/media?${params4}`;
    console.log('URL:', url4);
    const resp4 = await fetch(url4, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Status:', resp4.status);
    const text4 = await resp4.text();
    console.log('Response:', text4);
    console.log('');
  }

  process.exit(0);
}

discover().catch(console.error);
