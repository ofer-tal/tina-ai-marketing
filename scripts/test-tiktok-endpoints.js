import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function testTikTokEndpoints() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    if (!token) {
      console.log('ERROR: No TikTok auth token found');
      return;
    }

    const accessToken = token.accessToken;
    const openId = token.metadata?.open_id;

    console.log('=== TESTING TIKTOK API ENDPOINTS ===\n');
    console.log('Open ID:', openId);
    console.log('Access Token:', accessToken.substring(0, 30) + '...\n');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
    };

    // Test various endpoints
    const endpoints = [
      {
        name: 'Video Query (with sample video_id)',
        url: `https://open.tiktokapis.com/v2/video/query/?fields=video_id,title,share_url,like_count,comment_count&view_count&video_ids=7591349759852449079`
      },
      {
        name: 'User Videos (alternate path)',
        url: `https://open.tiktokapis.com/v2/user/videos/?fields=video_id,title,share_url,create_time`
      },
      {
        name: 'Video List with username',
        url: `https://open.tiktokapis.com/v2/video/list/?fields=video_id,title,share_url,create_time&username=blush.app`
      },
    ];

    for (const endpoint of endpoints) {
      console.log(`\nTesting: ${endpoint.name}`);
      console.log('URL:', endpoint.url);

      try {
        const response = await fetch(endpoint.url, { headers });
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text.substring(0, 300));
      } catch (error) {
        console.log('Error:', error.message);
      }
    }

    // Also try getting video details from our existing posts
    console.log('\n\n=== TESTING VIDEO QUERY WITH EXISTING VIDEO IDs ===');

    const existingPosts = await db.collection('marketing_posts')
      .find({ platform: 'tiktok', tiktokVideoId: { $exists: true } })
      .limit(5)
      .toArray();

    if (existingPosts.length > 0) {
      const videoIds = existingPosts.map(p => p.tiktokVideoId).join(',');
      console.log('Testing with video IDs:', videoIds);

      const queryUrl = `https://open.tiktokapis.com/v2/video/query/?fields=video_id,title,share_url,like_count,comment_count,share_count,view_count,create_time&video_ids=${videoIds}`;

      try {
        const response = await fetch(queryUrl, { headers });
        const text = await response.text();
        console.log('\nStatus:', response.status);
        console.log('Response:', text.substring(0, 500));

        if (response.ok) {
          try {
            const json = JSON.parse(text);
            console.log('\nParsed JSON:');
            console.log(JSON.stringify(json, null, 2));
          } catch (e) {
            console.log('Could not parse as JSON');
          }
        }
      } catch (error) {
        console.log('Error:', error.message);
      }
    }

  } finally {
    await client.close();
  }
}

testTikTokEndpoints().catch(console.error);
