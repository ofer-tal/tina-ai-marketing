import dotenv from 'dotenv';
dotenv.config();

const mongoose = await (await import('mongoose')).default.connect(process.env.MONGODB_URI);
const MarketingPost = (await import('./backend/models/MarketingPost.js')).default;

// Test the same query as the API
const days = 7;
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);

console.log('Testing query for period: 7d');
console.log('Start date:', startDate.toISOString());
console.log('Start date (local):', startDate.toString());

const posts = await MarketingPost.find({
  status: 'posted',
  postedAt: { $gte: startDate }
});

console.log('\nMongoose query result:', posts.length, 'posts');

// Also test without date filter
const allPosted = await MarketingPost.find({ status: 'posted' });
console.log('Total posted posts (no date filter):', allPosted.length);

allPosted.slice(0, 5).forEach(p => {
  console.log(`  - ${p._id} | ${p.platform} | postedAt: ${p.postedAt}`);
});

await mongoose.disconnect();
