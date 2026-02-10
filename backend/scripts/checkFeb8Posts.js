/**
 * Check posts scheduled for Feb 8, 2026
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('marketing_posts');

  // Find posts scheduled for 2/8/2026
  const targetDate = new Date('2026-02-08T00:00:00.000Z');
  const nextDay = new Date('2026-02-09T00:00:00.000Z');

  const posts = await collection.find({
    scheduledAt: { $gte: targetDate, $lt: nextDay }
  }).toArray();

  console.log(`Found ${posts.length} posts scheduled for 2/8/2026:\n`);

  posts.forEach(p => {
    console.log(`ID: ${p._id}`);
    console.log(`  platforms: ${JSON.stringify(p.platforms)}`);
    console.log(`  platform (legacy): ${p.platform}`);
    console.log(`  status: ${p.status}`);
    console.log(`  scheduledAt: ${p.scheduledAt}`);
    console.log(`  content: ${p.content ? p.content.substring(0, 80) + '...' : 'N/A'}`);
    console.log(`  hashtags: ${JSON.stringify(p.hashtags)}`);
    console.log('---');
  });

  await mongoose.disconnect();
}

main();
