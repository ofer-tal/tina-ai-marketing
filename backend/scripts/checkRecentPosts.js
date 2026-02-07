/**
 * Check for posts created in the last hour
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;
await databaseService.connect();

const { default: MarketingPost } = await import('../models/MarketingPost.js');

// Search for posts from the last hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const recentPosts = await MarketingPost.find({
  createdAt: { $gte: oneHourAgo }
}).sort({ createdAt: -1 });

console.log('Posts created in the last hour:', recentPosts.length);
for (const post of recentPosts) {
  console.log('---');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.story?.title || post.storyId);
  console.log('Status:', post.status);
  console.log('Tier:', post.tier);
  console.log('Caption:', post.caption?.substring(0, 80) + '...');
}

process.exit(0);
