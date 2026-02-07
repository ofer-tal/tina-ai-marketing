/**
 * Check scheduled jobs status
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

// Find approved posts that should have been posted
const now = new Date();
const approvedPosts = await MarketingPost.find({
  status: 'approved',
  scheduledAt: { $lte: now }
}).sort({ scheduledAt: 1 });

console.log('=== APPROVED POSTS THAT SHOULD HAVE BEEN POSTED ===');
console.log('Found:', approvedPosts.length);
console.log('Current time:', now.toISOString());
console.log('');

for (const post of approvedPosts) {
  console.log('---');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.storyName);
  console.log('Platform:', post.platform);
  console.log('Scheduled At:', post.scheduledAt.toISOString());
  console.log('Has Video:', !!post.videoPath);
  console.log('Video Path:', post.videoPath || 'None');
}

process.exit(0);
