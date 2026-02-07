/**
 * Check today's posts and their status
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

// Get posts from today
const today = new Date();
today.setHours(0, 0, 0, 0);
const todaysPosts = await MarketingPost.find({
  createdAt: { $gte: today }
}).sort({ createdAt: -1 });

console.log('=== POSTS CREATED TODAY ===');
console.log('Total:', todaysPosts.length);
console.log('');

for (const post of todaysPosts) {
  console.log('---');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.storyName || post.storyId);
  console.log('Platform:', post.platform);
  console.log('Status:', post.status);
  console.log('Content Tier:', post.contentTier);
  console.log('Scheduled At:', post.scheduledAt);
  console.log('Has Video:', !!post.videoPath);
  console.log('Video Generation Status:', post.videoGenerationProgress?.status || 'N/A');
  console.log('Posted At:', post.postedAt || 'N/A');
  console.log('Error:', post.error || 'None');
  console.log('Failed Reason:', post.failedReason || 'None');
}

process.exit(0);
