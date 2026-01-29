import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function compareDbVsApi() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    // Fetch from API
    const fields = 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count';
    const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    });

    const result = await response.json();
    const apiVideos = result.data?.videos || [];

    console.log(`=== COMPARISON ===`);
    console.log(`API returned: ${apiVideos.length} videos\n`);

    // Get all DB posts
    const dbPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Database has: ${dbPosts.length} posts\n`);

    const apiVideoIds = new Set(apiVideos.map(v => v.id));

    // Find posts in DB but not in API
    const inDbNotApi = dbPosts.filter(p => !apiVideoIds.has(p.tiktokVideoId));

    // Find posts in API but not in DB
    const dbVideoIds = new Set(dbPosts.map(p => p.tiktokVideoId));
    const inApiNotDb = apiVideos.filter(v => !dbVideoIds.has(v.id));

    console.log('=== VIDEOS IN DATABASE BUT NOT IN API ===');
    console.log(`Count: ${inDbNotApi.length}`);
    inDbNotApi.forEach((p, i) => {
      const postedAt = new Date(p.postedAt).toLocaleDateString();
      console.log(`  ${i + 1}. ${postedAt} | ${p.tiktokVideoId} | ${p.tiktokShareUrl}`);
    });

    console.log('\n=== VIDEOS IN API BUT NOT IN DATABASE ===');
    console.log(`Count: ${inApiNotDb.length}`);
    inApiNotDb.forEach((v, i) => {
      const postedAt = new Date(parseInt(v.create_time) * 1000).toLocaleDateString();
      console.log(`  ${i + 1}. ${postedAt} | ${v.id} | ${v.view_count} views`);
    });

    console.log('\n=== SUMMARY ===');
    console.log(`TikTok API says you have ${apiVideos.length} videos`);
    console.log(`Database has ${dbPosts.length} TikTok posts`);
    console.log(`Posts in DB but not returned by API: ${inDbNotApi.length}`);
    console.log(`Videos on TikTok but not in DB: ${inApiNotDb.length}`);

    if (inDbNotApi.length > 0) {
      console.log('\nNOTE: Posts in DB but not in API are likely:');
      console.log('- Older videos (API returns only 20 most recent)');
      console.log('- Deleted/private videos');
      console.log('- Videos from a different account');
    }

  } finally {
    await client.close();
  }
}

compareDbVsApi().catch(console.error);
