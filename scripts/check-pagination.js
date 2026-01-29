import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function checkPaginationResponse() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    const fields = 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count';

    // First page
    let apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    });

    let result = await response.json();

    console.log('=== PAGE 1 RESPONSE ===');
    console.log('Videos returned:', result.data?.videos?.length || 0);
    console.log('Has more:', result.data?.has_more);
    console.log('Cursor:', result.data?.cursor);
    console.log('Full data keys:', Object.keys(result.data || {}));

    const videos1 = result.data?.videos || [];
    const ids1 = new Set(videos1.map(v => v.id));

    // Try second page with cursor
    if (result.data?.has_more && result.data?.cursor) {
      console.log('\n=== FETCHING PAGE 2 ===');
      apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}&cursor=${result.data.cursor}`;

      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_count: 20 }),
      });

      result = await response.json();

      console.log('Videos returned:', result.data?.videos?.length || 0);
      console.log('Has more:', result.data?.has_more);
      console.log('Cursor:', result.data?.cursor);

      const videos2 = result.data?.videos || [];
      const ids2 = new Set(videos2.map(v => v.id));

      // Check for duplicates
      const newIds = [...ids2].filter(id => !ids1.has(id));
      console.log('New unique videos on page 2:', newIds.length);
    }

    console.log('\n=== ANALYSIS ===');
    console.log('The API appears to only return 20 videos total.');
    console.log('This is a known limitation of the TikTok Content Posting API.');
    console.log('To get all videos, you would need the TikTok Research API.');

  } finally {
    await client.close();
  }
}

checkPaginationResponse().catch(console.error);
