/**
 * Check for recent tier_2 posts
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

// Look for recent tier_2 posts
const tier2Posts = await MarketingPost.find({ tier: 2 }).sort({ createdAt: -1 }).limit(5);

console.log('Recent tier_2 posts:', tier2Posts.length);
for (const post of tier2Posts) {
  console.log('---');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.story?.title || post.storyId || 'N/A');
  console.log('Status:', post.status);
  console.log('Platform:', post.platform);
  console.log('CreatedAt:', post.createdAt);
  console.log('Caption:', post.caption?.substring(0, 80) + '...');
  console.log('Has scheduledVideoId:', !!post.scheduledVideoId);
}

process.exit(0);
