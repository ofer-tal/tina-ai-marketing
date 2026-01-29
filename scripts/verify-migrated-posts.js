import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function verifyMigratedPosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const posts = await db.collection('marketing_posts').find({}).sort({ postedAt: -1 }).toArray();

    console.log('=== VERIFIED MIGRATED POSTS ===\n');
    console.log(`Total posts: ${posts.length}\n`);

    // Group by platform
    const tiktokPosts = posts.filter(p => p.platform === 'tiktok' && p.tiktokVideoId);
    const otherPosts = posts.filter(p => p.platform !== 'tiktok' || !p.tiktokVideoId);

    console.log(`TikTok posts with videoId: ${tiktokPosts.length}`);
    console.log(`Other posts (Pinterest mapped): ${otherPosts.length}\n`);

    // Show TikTok posts with share URLs
    console.log('=== TIKTOK POSTS WITH REAL URLs ===');
    tiktokPosts.forEach((post, i) => {
      console.log(`\n${i + 1}. ${post.tiktokShareUrl}`);
      console.log(`   Video ID: ${post.tiktokVideoId}`);
      console.log(`   Posted: ${post.postedAt?.toISOString?.().split('T')[0] || 'N/A'}`);
      console.log(`   Caption: ${post.caption?.substring(0, 40) || 'N/A'}...`);
    });

    // Note about re-authentication
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Re-authenticate with TikTok via Settings page');
    console.log('2. Use TikTok API to pull fresh metrics for these posts');
    console.log('3. The old posts are preserved in marketing_posts_old for reference');

  } finally {
    await client.close();
  }
}

verifyMigratedPosts().catch(console.error);
