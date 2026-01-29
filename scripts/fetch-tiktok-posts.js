import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

dotenv.config();

async function getTikTokAccessToken() {
  // Check if we have a stored auth token
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    if (token) {
      console.log('Found stored TikTok auth token');
      return token.accessToken;
    }

    console.log('No stored TikTok auth token found');
    return null;
  } finally {
    await client.close();
  }
}

async function fetchTikTokUserPosts() {
  const accessToken = await getTikTokAccessToken();

  if (!accessToken) {
    console.log('ERROR: No TikTok access token available');
    console.log('You need to authenticate with TikTok first via /auth/tiktok/login');
    return [];
  }

  console.log('Using access token:', accessToken.substring(0, 20) + '...');

  // TikTok API endpoint to get user posts
  // Note: This requires the authenticated user to have granted the necessary scopes
  const url = 'https://open.tiktokapis.com/v2/video/list/';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        max_count: 20
      })
    });

    const result = await response.json();
    console.log('\n=== TIKTOK API RESPONSE ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.data?.videos) {
      return result.data.videos;
    }

    return [];
  } catch (error) {
    console.error('Error fetching TikTok posts:', error.message);
    return [];
  }
}

async function listRealTikTokPosts() {
  const posts = await fetchTikTokUserPosts();

  if (posts.length === 0) {
    console.log('\nNo posts found on TikTok account, or authentication is incomplete.');
    console.log('\nTo authenticate, visit: http://localhost:3001/auth/tiktok/login');
  } else {
    console.log(`\n=== FOUND ${posts.length} REAL TIKTOK POSTS ===`);
    posts.forEach((post, i) => {
      console.log(`\nPost ${i + 1}:`);
      console.log('  ID:', post.id);
      console.log('  Share URL:', post.share_url || '(none)');
      console.log('  Created:', post.create_time);
      console.log('  Title:', post.title || '(none)');
    });
  }
}

listRealTikTokPosts().catch(console.error);
