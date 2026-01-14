import dotenv from 'dotenv';
dotenv.config();

const mongoose = await (await import('mongoose')).default.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// Check posted posts and their dates
const posts = await db.collection('marketing_posts')
  .find({ status: 'posted' })
  .project({ title: 1, platform: 1, postedAt: 1, performanceMetrics: 1 })
  .toArray();

console.log(`Total posted posts: ${posts.length}`);

// Count by date
const now = new Date();
const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

const last24h = posts.filter(p => p.postedAt && new Date(p.postedAt) >= oneDayAgo).length;
const last7d = posts.filter(p => p.postedAt && new Date(p.postedAt) >= sevenDaysAgo).length;
const last30d = posts.filter(p => p.postedAt && new Date(p.postedAt) >= thirtyDaysAgo).length;

console.log(`\nPosts by time period:`);
console.log(`  Last 24h: ${last24h}`);
console.log(`  Last 7d: ${last7d}`);
console.log(`  Last 30d: ${last30d}`);

// Show sample of posts with dates
console.log(`\nSample posts (first 5):`);
posts.slice(0, 5).forEach((post, i) => {
  console.log(`\n${i + 1}. ${post.title || 'No title'}`);
  console.log(`   Platform: ${post.platform}`);
  console.log(`   Posted At: ${post.postedAt}`);
  console.log(`   Has Metrics: ${post.performanceMetrics ? 'Yes' : 'No'}`);
  if (post.performanceMetrics) {
    console.log(`   Views: ${post.performanceMetrics.views || 0}`);
  }
});

await mongoose.disconnect();
