/**
 * Debug platformStatus
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  console.log('Debugging platformStatus...');

  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('marketing_posts');

  // Find posts with platforms but no platformStatus (using the same query as validation)
  const posts = await collection.find({
    platforms: { $exists: true, $ne: null },
    platformStatus: { $exists: false }
  }).toArray();

  console.log(`Found ${posts.length} posts with platforms but no platformStatus`);

  for (const post of posts) {
    console.log(`\nPost: ${post._id}`);
    console.log(`  platforms: ${JSON.stringify(post.platforms)}`);
    console.log(`  platformStatus: ${JSON.stringify(post.platformStatus)}`);
    console.log(`  platform: ${post.platform}`);
    console.log(`  status: ${post.status}`);
  }

  // Also check if platformStatus exists but is null/empty
  const nullStatusPosts = await collection.find({
    platforms: { $exists: true, $ne: null },
    platformStatus: null
  }).toArray();

  console.log(`\n\nFound ${nullStatusPosts.length} posts with platforms but null platformStatus`);

  for (const post of nullStatusPosts) {
    console.log(`\nPost: ${post._id}`);
    console.log(`  platforms: ${JSON.stringify(post.platforms)}`);
    console.log(`  platformStatus: ${JSON.stringify(post.platformStatus)}`);
  }

  await mongoose.disconnect();
}

main();
