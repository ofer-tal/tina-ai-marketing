/**
 * Find the correct Instagram User ID for posting
 * The Business Account ID is different from the User ID needed for posting
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

async function find() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  const accessToken = token.accessToken;
  const businessAccountId = token.metadata?.instagramUserId; // This is actually the business account ID
  const pageId = token.metadata?.pageId;

  console.log('=== FINDING CORRECT INSTAGRAM USER ID ===');
  console.log('Business Account ID (what we have):', businessAccountId);
  console.log('Page ID:', pageId);
  console.log('');

  // According to Instagram docs, to get the User ID for posting,
  // we need to query the Instagram Business Account with fields=ig_id
  // The ig_id is the large number format ID used for posting
  console.log('Querying Business Account for ig_id...');

  const url = `https://graph.facebook.com/v18.0/${businessAccountId}?fields=ig_id,username,id`;
  console.log('URL:', url);
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  console.log('Status:', resp.status);
  const data = await resp.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log('');

  if (data.ig_id) {
    console.log('=== FOUND IG ID ===');
    console.log('ig_id:', data.ig_id);
    console.log('This is the ID to use for posting!');
    console.log('');

    // Test creating a container with the ig_id
    console.log('=== TESTING CONTAINER CREATION WITH ig_id ===');
    const videoUrl = 'https://content.blush.v6v.one/marketing/videos/instagram-6984f0a359585ce5ff08a24f-retry-1770365169723.mp4';
    const params = new URLSearchParams({
      video_url: videoUrl,
      caption: 'Test with ig_id',
      media_type: 'REELS',
    });
    const testUrl = `https://graph.facebook.com/v18.0/${data.ig_id}/media?${params}`;
    console.log('URL:', testUrl);
    const testResp = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Status:', testResp.status);
    const testText = await testResp.text();
    console.log('Response:', testText);
    console.log('');

    if (testResp.ok) {
      console.log('SUCCESS! We should update the metadata to use ig_id instead of business account ID');
      console.log('New instagramUserId should be:', data.ig_id);
    }
  }

  process.exit(0);
}

find().catch(console.error);
