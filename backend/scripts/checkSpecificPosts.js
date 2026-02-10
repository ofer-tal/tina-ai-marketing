import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // The specific post IDs from Tina
  const postIds = [
    '69884d71a1eae8dba9e64d04', // 11:00 AM
    '69884d7ba1eae8dba9e64d14', // 3:00 PM
    '69883ae84b3b23c7bb7ebe23', // 7:00 PM
    '69883ae84b3b23c7bb7ebe20'  // 8:30 PM
  ];

  console.log('\n=== Checking the 4 posts Tina created ===\n');

  for (const id of postIds) {
    const post = await db.collection('marketing_posts').findOne({ _id: id });
    if (post) {
      console.log(`ID: ${id}`);
      console.log(`  Title: ${post.title}`);
      console.log(`  Status: ${post.status}`);
      console.log(`  Content Tier: ${post.contentTier}`);
      console.log(`  Platforms: ${JSON.stringify(post.platforms || post.platform)}`);
      console.log(`  Scheduled: ${post.scheduledAt}`);
      console.log(`  Created: ${post.createdAt}`);
      console.log(`  Has video: ${!!post.videoPath}`);
      console.log('');
    } else {
      console.log(`ID: ${id} - NOT FOUND IN DATABASE\n`);
    }
  }

  // Also check all recent tier_2 posts
  const recentTier2 = await db.collection('marketing_posts')
    .find({ contentTier: 'tier_2' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log(`\n=== All tier_2 posts (last 10) ===`);
  console.log(`Total found: ${recentTier2.length}\n`);

  recentTier2.forEach(p => {
    const scheduledDate = p.scheduledAt ? new Date(p.scheduledAt).toISOString() : 'N/A';
    console.log(`${p._id} | ${p.title?.substring(0, 30)} | ${p.status} | ${JSON.stringify(p.platforms || p.platform)} | ${scheduledDate}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
