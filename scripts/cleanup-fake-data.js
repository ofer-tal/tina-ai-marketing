import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function cleanupFakeData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== CLEANING FAKE DATA ===\n');

    // 1. Delete 7 fake Pinterest posts (no tiktokVideoId)
    console.log('1. Deleting fake Pinterest posts from marketing_posts...');
    const fakePostsResult = await db.collection('marketing_posts').deleteMany({
      tiktokVideoId: { $exists: false }
    });
    console.log(`   Deleted ${fakePostsResult.deletedCount} fake posts`);
    console.log(`   Kept ${await db.collection('marketing_posts').countDocuments()} real TikTok posts\n`);

    // 2. Delete marketing_posts_old collection
    console.log('2. Deleting marketing_posts_old collection...');
    await db.collection('marketing_posts_old').drop().catch(() => console.log('   Collection already deleted'));
    console.log('   Dropped marketing_posts_old\n');

    // 3. Delete marketing_aso_scores
    console.log('3. Deleting fake ASO scores...');
    const asoDeleteResult = await db.collection('marketing_aso_scores').deleteMany({});
    console.log(`   Deleted ${asoDeleteResult.deletedCount} ASO score documents\n`);

    // 4. Delete API health check "strategies"
    console.log('4. Deleting API health check logs from marketing_strategy...');
    const strategyDeleteResult = await db.collection('marketing_strategy').deleteMany({
      title: { $regex: /^API Health Check/ }
    });
    console.log(`   Deleted ${strategyDeleteResult.deletedCount} strategy documents\n`);

    console.log('=== CLEANUP COMPLETE ===');
    console.log('\nRemaining collections status:');
    console.log(`  marketing_posts: ${await db.collection('marketing_posts').countDocuments()} (REAL TikTok posts)`);
    console.log(`  marketing_auth_tokens: ${await db.collection('marketing_auth_tokens').countDocuments()} (API tokens)`);
    console.log(`  marketing_strategy: ${await db.collection('marketing_strategy').countDocuments()}`);
    console.log(`  marketing_aso_scores: ${await db.collection('marketing_aso_scores').countDocuments()}`);

  } finally {
    await client.close();
  }
}

cleanupFakeData().catch(console.error);
