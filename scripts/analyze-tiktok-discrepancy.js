import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function analyzeTikTokDiscrepancy() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Get all TikTok posts from database
    const dbPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: { $exists: true, $ne: null }
    }).sort({ postedAt: -1 }).toArray();

    console.log('=== TIKTOK POSTS IN DATABASE ===');
    console.log(`Total: ${dbPosts.length}\n`);

    // Group by posted date to see pattern
    const byDate = {};
    dbPosts.forEach(p => {
      const date = new Date(p.postedAt).toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(p);
    });

    console.log('Posts by date:');
    Object.keys(byDate).sort().reverse().forEach(date => {
      console.log(`  ${date}: ${byDate[date].length} posts`);
    });

    console.log('\n=== ALL POSTS FROM DATABASE ===');
    dbPosts.forEach((p, i) => {
      const postedAt = new Date(p.postedAt).toLocaleDateString();
      const metrics = p.performanceMetrics || {};
      const inApi = metrics.views !== undefined && metrics.metricsLastFetchedAt;
      console.log(`${i + 1}. ${postedAt} | ${inApi ? '✓' : '✗'} API | ${metrics.views || '?'} views | ${p.tiktokVideoId}`);
    });

    // Check metrics
    console.log('\n=== METRICS SUMMARY ===');
    let totalViews = 0;
    let totalLikes = 0;
    let withMetrics = 0;

    dbPosts.forEach(p => {
      if (p.performanceMetrics?.metricsLastFetchedAt) {
        totalViews += p.performanceMetrics.views || 0;
        totalLikes += p.performanceMetrics.likes || 0;
        withMetrics++;
      }
    });

    console.log(`Posts with fresh metrics: ${withMetrics}/${dbPosts.length}`);
    console.log(`Total views: ${totalViews.toLocaleString()}`);
    console.log(`Total likes: ${totalLikes.toLocaleString()}`);

    console.log('\n=== ANALYSIS ===');
    console.log(`- Database has ${dbPosts.length} TikTok posts`);
    console.log(`- API returns 20 most recent videos`);
    console.log(`- ${dbPosts.length - 20} older posts are in database but not returned by API`);
    console.log(`\nThe TikTok API likely only returns the 20 most recent videos.`);
    console.log(`Older posts remain in the database but can't be updated via API.`);

  } finally {
    await client.close();
  }
}

analyzeTikTokDiscrepancy().catch(console.error);
