import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function examinePosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const posts = await db.collection('marketing_posts').find({}).toArray();

    console.log('=== MARKETING_POSTS ANALYSIS ===\n');
    console.log('Total posts:', posts.length);

    // Categorize posts
    const withPlatformId = posts.filter(p => p.platformPostId);
    const withShareUrl = posts.filter(p => p.shareUrl);
    const posted = posts.filter(p => p.status === 'posted');
    const notPosted = posts.filter(p => p.status !== 'posted');

    console.log('\nWith platformPostId:', withPlatformId.length);
    console.log('With shareUrl:', withShareUrl.length);
    console.log('Status "posted":', posted.length);
    console.log('Status NOT "posted":', notPosted.length);

    // Show details of posts that claim to be "posted"
    console.log('\n=== POSTS MARKED AS "POSTED" ===');
    posted.forEach(p => {
      console.log('\nID:', p._id?.toString?.() || p.id);
      console.log('  Platform:', p.platform);
      console.log('  platformPostId:', p.platformPostId || '(none)');
      console.log('  shareUrl:', p.shareUrl || '(none)');
      console.log('  postedAt:', p.postedAt);
      console.log('  caption:', p.caption?.substring(0, 50) + '...');
    });

    // Show posts without platformPostId or shareUrl
    console.log('\n=== POSTS WITHOUT PLATFORM POST ID (likely test data) ===');
    const noPostId = posts.filter(p => !p.platformPostId && !p.shareUrl);
    console.log('Count:', noPostId.length);
    noPostId.forEach(p => {
      console.log('\nID:', p._id?.toString?.() || p.id);
      console.log('  Platform:', p.platform);
      console.log('  Status:', p.status);
      console.log('  createdAt:', p.createdAt);
    });

    // Now check TikTok service for verifying posts
    console.log('\n=== TIKTOK API KEY STATUS ===');
    const tikTokKey = process.env.TIKTOK_APP_KEY;
    const tikTokSecret = process.env.TIKTOK_APP_SECRET;
    console.log('TIKTOK_APP_KEY:', tikTokKey ? 'configured' : 'missing');
    console.log('TIKTOK_APP_SECRET:', tikTokSecret ? 'configured' : 'missing');

  } finally {
    await client.close();
  }
}

examinePosts().catch(console.error);
