/**
 * Test Instagram container creation directly
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Load env vars first before importing services
const { default: AuthToken } = await import('../models/AuthToken.js');
const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;

async function test() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  console.log('Token found');
  console.log('Instagram User ID from metadata:', token.metadata?.instagramUserId);

  // Get Instagram User ID
  const igUserId = token.metadata?.instagramUserId;

  if (!igUserId) {
    console.log('No Instagram User ID in token metadata');
    process.exit(1);
  }

  const videoUrl = 'https://content.blush.v6v.one/marketing/videos/instagram-6984f0a359585ce5ff08a24f-retry-1770365169723.mp4';
  const caption = 'Test caption for debugging';
  const hashtags = ['#test', '#debug'];

  // Construct the API request
  const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
  const params = new URLSearchParams({
    video_url: videoUrl,
    caption: fullCaption,
    media_type: 'REELS',
  });

  const endpoint = `https://graph.facebook.com/v18.0/${igUserId}/media`;
  const url = `${endpoint}?${params}`;

  console.log('');
  console.log('=== INSTAGRAM API REQUEST ===');
  console.log('URL:', endpoint);
  console.log('Params:', {
    video_url: videoUrl,
    caption_length: fullCaption.length,
    media_type: 'REELS',
  });
  console.log('');
  console.log('Full request URL:', url);
  console.log('');

  console.log('=== MAKING REQUEST ===');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('Response status:', response.status);
  console.log('Response ok:', response.ok);
  console.log('');

  const responseText = await response.text();
  console.log('Response body:', responseText);
  console.log('');

  try {
    const responseJson = JSON.parse(responseText);
    console.log('Parsed JSON:', JSON.stringify(responseJson, null, 2));

    if (responseJson.error) {
      console.log('');
      console.log('=== ERROR DETAILS ===');
      console.log('Error message:', responseJson.error.message);
      console.log('Error type:', responseJson.error.type);
      console.log('Error code:', responseJson.error.code);

      // Common Instagram API errors
      const errorCodes = {
        200: 'Permissions error',
        100: 'Invalid parameter',
        190: 'Access token has expired',
        192: 'Post was not published because active story was posted more than 24 hours ago',
        368: 'Temporarily blocked for posting too much',
        4: 'Application request limit reached',
        2: 'Service temporarily unavailable',
      };

      if (responseJson.error.code) {
        console.log('');
        console.log(`Known error code ${responseJson.error.code}:`, errorCodes[responseJson.error.code] || 'Unknown code');
      }
    }
  } catch (e) {
    console.log('Response is not valid JSON');
  }

  process.exit(0);
}

test().catch(console.error);
