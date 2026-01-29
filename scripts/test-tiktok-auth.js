import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function testTikTokAuth() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Get the TikTok auth token
    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    if (!token) {
      console.log('ERROR: No TikTok auth token found. Please re-authenticate.');
      return;
    }

    console.log('=== TIKTOK AUTH TOKEN FOUND ===');
    console.log('Access Token:', token.accessToken.substring(0, 30) + '...');
    console.log('Refresh Token:', token.refreshToken ? 'Present' : 'Missing');
    console.log('Creator ID:', token.creatorId || 'Not set');
    console.log('Open ID:', token.metadata?.open_id || 'Not set');
    console.log('Expires At:', token.expiresAt);
    console.log('Is Expired:', new Date() > new Date(token.expiresAt));

    // Test the token by calling user info API
    console.log('\n=== TESTING TIKTOK API CONNECTION ===');

    const userInfoUrl = `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent('open_id,union_id,avatar_url,display_name')}`;

    const response = await fetch(userInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
      },
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.error) {
      console.log('\nERROR: Token is invalid or expired');
      return;
    }

    if (result.data?.user) {
      console.log('\n=== SUCCESS! USER INFO ===');
      console.log('Display Name:', result.data.user.display_name);
      console.log('Open ID:', result.data.user.open_id);
      console.log('Avatar:', result.data.user.avatar_url);

      // Now try to get user's videos
      console.log('\n=== FETCHING USER VIDEOS ===');

      const videosUrl = 'https://open.tiktokapis.com/v2/video/list/';
      const videosResponse = await fetch(videosUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_count: 50
        }),
      });

      const videosResult = await videosResponse.json();
      console.log('Videos Response:', JSON.stringify(videosResult, null, 2));

      if (videosResult.data?.videos) {
        console.log(`\n=== FOUND ${videosResult.data.videos.length} VIDEOS ===`);
        videosResult.data.videos.forEach((v, i) => {
          console.log(`\n${i + 1}. ${v.share_url || 'No URL'}`);
          console.log(`   Video ID: ${v.video_id || v.id}`);
          console.log(`   Created: ${v.create_time}`);
          console.log(`   Title: ${v.title || 'No title'}`);
        });
      } else if (videosResult.error) {
        console.log('\nERROR fetching videos:', videosResult.error.message);
      }
    }

  } finally {
    await client.close();
  }
}

testTikTokAuth().catch(console.error);
