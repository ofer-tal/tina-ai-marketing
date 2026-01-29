import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function checkPendingPosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Find posts with "pending" as tiktokVideoId
    const pendingPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: 'pending'
    }).toArray();

    console.log('Posts with tiktokVideoId="pending":', pendingPosts.length);
    pendingPosts.forEach(p => {
      console.log('  _id:', p._id);
      console.log('  tiktokVideoId:', p.tiktokVideoId);
      console.log('  tiktokShareUrl:', p.tiktokShareUrl);
    });

    // Also find any posts that don't have a proper TikTok video ID
    const invalidPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      $or: [
        { tiktokVideoId: { $regex: '^pending' } },
        { tiktokVideoId: { $not: /^759/ } }
      ]
    }).toArray();

    console.log('\nPosts with invalid TikTok video IDs:', invalidPosts.length);
    invalidPosts.forEach(p => {
      console.log('  _id:', p._id);
      console.log('  tiktokVideoId:', p.tiktokVideoId);
      console.log('  tiktokShareUrl:', p.tiktokShareUrl);
    });

  } finally {
    await client.close();
  }
}

checkPendingPosts().catch(console.error);
