import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

async function removeInvalidTikTokPosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Remove the invalid posts
    const result = await db.collection('marketing_posts').deleteMany({
      platform: 'tiktok',
      tiktokVideoId: { $in: ['pending-day2-tiktok', 'pending-day2-pinterest'] }
    });

    console.log('Deleted', result.deletedCount, 'invalid posts');

    // Get final counts
    const tiktokCount = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok'
    });

    const realTiktokCount = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok',
      tiktokVideoId: { $regex: '^759' }
    });

    console.log('\n=== FINAL STATE ===');
    console.log('All TikTok posts in database:', tiktokCount);
    console.log('Real TikTok posts (with valid video IDs):', realTiktokCount);

    // List all real TikTok posts
    const posts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: { $regex: '^759' }
    }).sort({ postedAt: -1 }).toArray();

    console.log('\n=== ALL REAL TIKTOK POSTS ===');
    posts.forEach((p, i) => {
      const postedAt = new Date(p.postedAt).toLocaleDateString();
      console.log(`${i + 1}. ${p.tiktokShareUrl}`);
      console.log(`   Posted: ${postedAt} | ${p.caption?.substring(0, 40) || 'N/A'}...`);
    });

  } finally {
    await client.close();
  }
}

removeInvalidTikTokPosts().catch(console.error);
