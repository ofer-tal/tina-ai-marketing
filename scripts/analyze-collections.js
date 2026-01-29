import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function analyzeCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // === marketing_posts ===
    console.log('\n=== marketing_posts ===');
    const posts = await db.collection('marketing_posts').find({}, {
      title: 1, platform: 1, status: 1, tiktokVideoId: 1,
      performanceMetrics: 1, postedAt: 1, createdAt: 1
    }).sort({ createdAt: -1 }).toArray();

    const byStatus = {};
    const byPlatform = {};
    let withMetrics = 0;
    let withTiktokId = 0;

    posts.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1;
      if (p.performanceMetrics && Object.keys(p.performanceMetrics).length > 0) withMetrics++;
      if (p.tiktokVideoId) withTiktokId++;
    });

    console.log('Total posts:', posts.length);
    console.log('By Status:', byStatus);
    console.log('By Platform:', byPlatform);
    console.log('With performanceMetrics:', withMetrics);
    console.log('With tiktokVideoId (REAL from TikTok sync):', withTiktokId);

    console.log('\n--- Posts WITH tiktokVideoId (REAL) ---');
    posts.filter(p => p.tiktokVideoId).slice(0, 5).forEach(p => {
      console.log(`  - ${p.title?.substring(0, 40)} | videoId: ${p.tiktokVideoId} | views: ${p.performanceMetrics?.views || 0}`);
    });

    console.log('\n--- Posts WITHOUT tiktokVideoId (likely FAKE/test) ---');
    const withoutTiktokId = posts.filter(p => !p.tiktokVideoId);
    console.log(`Count: ${withoutTiktokId.length}`);
    withoutTiktokId.slice(0, 10).forEach(p => {
      console.log(`  - ${p.title?.substring(0, 40)} | status: ${p.status} | views: ${p.performanceMetrics?.views || 0}`);
    });

    // === marketing_posts_old ===
    console.log('\n=== marketing_posts_old (backup) ===');
    const oldPosts = await db.collection('marketing_posts_old').countDocuments();
    console.log('Count:', oldPosts);

    // === marketing_auth_tokens ===
    console.log('\n=== marketing_auth_tokens ===');
    const tokens = await db.collection('marketing_auth_tokens').find({}, {
      platform: 1, createdAt: 1
    }).toArray();
    tokens.forEach(t => {
      console.log(`  Platform: ${t.platform} | Created: ${t.createdAt}`);
    });

    // === marketing_strategy ===
    console.log('\n=== marketing_strategy ===');
    const strategies = await db.collection('marketing_strategy').find({}, {
      title: 1, status: 1, createdAt: 1
    }).toArray();
    strategies.forEach(s => {
      console.log(`  - ${s.title} | Status: ${s.status}`);
    });

    // === marketing_aso_scores ===
    console.log('\n=== marketing_aso_scores ===');
    const asoScores = await db.collection('marketing_aso_scores').findOne({}, {
      overallScore: 1, calculatedAt: 1
    });
    if (asoScores) {
      console.log(`  Overall Score: ${asoScores.overallScore} | Calculated: ${asoScores.calculatedAt}`);
      console.log('  This appears to be CALCULATED/FAKE data - no real Apple Search Ads integration yet');
    }

  } finally {
    await client.close();
  }
}

analyzeCollections().catch(console.error);
