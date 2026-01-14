import dotenv from 'dotenv';
dotenv.config();

const mongoose = await (await import('mongoose')).default.connect(process.env.MONGODB_URI);
const MarketingPost = (await import('./backend/models/MarketingPost.js')).default;

// Find posted posts
const postedPosts = await MarketingPost.find({ status: 'posted' }).limit(5);
console.log(`Found ${postedPosts.length} posted posts\n`);

postedPosts.forEach((post, i) => {
  console.log(`Post ${i + 1}:`);
  console.log(`  ID: ${post._id}`);
  console.log(`  Platform: ${post.platform}`);
  console.log(`  Status: ${post.status}`);
  console.log(`  Posted At: ${post.postedAt}`);
  console.log(`  Has performanceMetrics: ${!!post.performanceMetrics}`);
  if (post.performanceMetrics) {
    console.log(`  Metrics:`, JSON.stringify(post.performanceMetrics, null, 2));
  }
  console.log('');
});

await mongoose.disconnect();
