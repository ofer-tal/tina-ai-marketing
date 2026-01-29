import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function tryCursorInBody() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    const fields = 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count';

    // Try with cursor in body instead of query param
    const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

    const body = {
      max_count: 20,
      cursor: 1768238408337  // Use the cursor from first page
    };

    console.log('=== TRYING CURSOR IN BODY ===');
    console.log('Body:', JSON.stringify(body, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('\nResponse:', JSON.stringify(result, null, 2));

    const videos = result.data?.videos || [];
    console.log(`\nVideos returned: ${videos.length}`);

    if (videos.length > 0) {
      console.log('First video ID:', videos[0].id);
      console.log('Last video ID:', videos[videos.length - 1].id);
    }

  } finally {
    await client.close();
  }
}

tryCursorInBody().catch(console.error);
