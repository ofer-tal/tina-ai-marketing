import dotenv from 'dotenv';
dotenv.config();

const mongoose = await (await import('mongoose')).default.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const total = await db.collection('marketing_posts').countDocuments();
const posted = await db.collection('marketing_posts').countDocuments({ status: 'posted' });
const withMetrics = await db.collection('marketing_posts').countDocuments({ 'performanceMetrics.views': { $gt: 0 } });

console.log('Marketing Posts Collection Stats:');
console.log(`  Total posts: ${total}`);
console.log(`  Posted posts: ${posted}`);
console.log(`  Posts with metrics: ${withMetrics}`);

// Sample a few posts
const sample = await db.collection('marketing_posts').find({}).limit(5).toArray();
console.log('\nSample posts:');
sample.forEach((post, i) => {
  console.log(`\nPost ${i + 1}:`);
  console.log(`  _id: ${post._id}`);
  console.log(`  title: ${post.title}`);
  console.log(`  status: ${post.status}`);
  console.log(`  platform: ${post.platform}`);
  console.log(`  postedAt: ${post.postedAt}`);
  console.log(`  performanceMetrics: ${post.performanceMetrics ? JSON.stringify(post.performanceMetrics) : 'none'}`);
});

await mongoose.disconnect();
