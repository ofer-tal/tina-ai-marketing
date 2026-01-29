import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function cleanupInvalidPosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== CLEANING UP INVALID POSTS ===\n');

    // Count posts by type
    const allTiktokPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok'
    }).toArray();

    console.log(`Total posts with platform='tiktok': ${allTiktokPosts.length}\n`);

    // Categorize posts
    const realTiktokPosts = allTiktokPosts.filter(p =>
      p.tiktokVideoId &&
      p.tiktokVideoId.startsWith('759') && // TikTok video IDs start with 759
      p.tiktokShareUrl &&
      p.tiktokShareUrl.includes('tiktok.com')
    );

    const pinterestPosts = allTiktokPosts.filter(p =>
      p.tiktokShareUrl && p.tiktokShareUrl.includes('pinterest.com')
    );

    const pendingPosts = allTiktokPosts.filter(p =>
      p.tiktokVideoId === 'pending' ||
      !p.tiktokVideoId
    );

    console.log(`Real TikTok posts: ${realTiktokPosts.length}`);
    console.log(`Pinterest posts (incorrectly labeled): ${pinterestPosts.length}`);
    console.log(`Pending/invalid posts: ${pendingPosts.length}\n`);

    // Fix Pinterest posts - change platform or mark properly
    if (pinterestPosts.length > 0) {
      console.log('=== FIXING PINTEREST POSTS ===');
      for (const post of pinterestPosts) {
        await db.collection('marketing_posts').updateOne(
          { _id: post._id },
          {
            $set: {
              platform: 'pinterest',
              manualPostUrl: post.tiktokShareUrl,
              tiktokVideoId: null,
              tiktokShareUrl: null,
            }
          }
        );
        console.log(`✓ Fixed: ${post.tiktokShareUrl}`);
      }
      console.log();
    }

    // Remove pending posts that were never posted
    if (pendingPosts.length > 0) {
      console.log('=== REMOVING PENDING/INVALID POSTS ===');
      for (const post of pendingPosts) {
        await db.collection('marketing_posts').deleteOne({ _id: post._id });
        console.log(`✓ Deleted: ${post.tiktokVideoId || 'no video ID'}`);
      }
      console.log();
    }

    // Show final state
    const finalTiktokPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: { $exists: true, $ne: null }
    }).sort({ postedAt: -1 }).toArray();

    const finalPinterestPosts = await db.collection('marketing_posts').find({
      platform: 'pinterest'
    }).toArray();

    console.log('=== FINAL STATE ===');
    console.log(`Real TikTok posts: ${finalTiktokPosts.length}`);
    console.log(`Pinterest posts: ${finalPinterestPosts.length}\n`);

    console.log('=== ALL TIKTOK POSTS (most recent first) ===');
    finalTiktokPosts.forEach((p, i) => {
      const postedAt = new Date(p.postedAt).toLocaleDateString();
      console.log(`${i + 1}. ${p.tiktokShareUrl}`);
      console.log(`   Posted: ${postedAt}`);
      console.log(`   Caption: ${p.caption?.substring(0, 50) || 'N/A'}...`);
      console.log();
    });

    console.log('\n=== SUMMARY ===');
    console.log(`Total real TikTok posts in database: ${finalTiktokPosts.length}`);
    console.log(`User mentioned there should be 9 additional posts on TikTok.`);
    console.log(`Total expected: ${finalTiktokPosts.length + 9}`);
    console.log('\nTo import the missing 9 posts, please provide the TikTok URLs.');
    console.log('Visit https://www.tiktok.com/@blush.app to see all posts.');

  } finally {
    await client.close();
  }
}

cleanupInvalidPosts().catch(console.error);
