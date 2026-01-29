import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function removePending() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const result = await db.collection('marketing_posts').deleteMany({
      platform: 'tiktok',
      tiktokVideoId: 'pending'
    });

    console.log('Deleted', result.deletedCount, 'pending posts');

    const count = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok'
    });

    console.log('Final TikTok post count:', count);

  } finally {
    await client.close();
  }
}

removePending().catch(console.error);
