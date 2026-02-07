/**
 * Check for the tier_2 post Tina claimed to create
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

// Search for recent posts with "Crimson Court" or tier_2
const recentPosts = await MarketingPost.find({
  $or: [
    { storyName: /crimson/i },
    { storyName: /court/i },
    { contentTier: 'tier_2' },
    { contentTier: 2 }
  ]
}).sort({ createdAt: -1 }).limit(10);

console.log('=== Posts matching Crimson Court or tier_2 ===');
console.log('Found:', recentPosts.length);
console.log('');

for (const post of recentPosts) {
  console.log('---');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.storyName);
  console.log('Platform:', post.platform);
  console.log('Status:', post.status);
  console.log('Content Tier:', post.contentTier);
  console.log('Tier (from metadata):', post.generationMetadata?.tier);
  console.log('CreatedAt:', post.createdAt);
  console.log('ScheduledAt:', post.scheduledAt);
  console.log('Caption:', post.caption?.substring(0, 80) || 'None');
}

// Also check for ANY posts created in the last 30 minutes
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
const veryRecentPosts = await MarketingPost.find({
  createdAt: { $gte: thirtyMinutesAgo }
}).sort({ createdAt: -1 });

console.log('\n=== Posts created in last 30 minutes ===');
console.log('Found:', veryRecentPosts.length);
console.log('');

for (const post of veryRecentPosts) {
  console.log('-', post._id.toString(), '| Story:', post.storyName, '| Platform:', post.platform, '| Status:', post.status, '| Tier:', post.contentTier);
}

process.exit(0);
