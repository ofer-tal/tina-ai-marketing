import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function tryV1Api() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    // Try v1 API endpoint
    const v1Url = 'https://open-api.tiktok.com/video/list/';
    const fields = ['id', 'title', 'video_description', 'create_time', 'share_url', 'like_count', 'comment_count', 'share_count', 'view_count'];

    const body = {
      access_token: token.accessToken,
      fields: fields,
      max_count: 20,
      cursor: 0
    };

    console.log('=== TRYING V1 API ===');
    console.log('URL:', v1Url);
    console.log('Body:', JSON.stringify(body, null, 2));

    const response = await fetch(v1Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('\nResponse:', JSON.stringify(result, null, 2));

    if (result.data?.video_list) {
      console.log(`\nVideos returned: ${result.data.video_list.length}`);
      console.log('Has more:', result.data.has_more);
      console.log('Cursor:', result.data.cursor);
    }

  } finally {
    await client.close();
  }
}

tryV1Api().catch(console.error);
