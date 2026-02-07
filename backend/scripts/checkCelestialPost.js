/**
 * Check for Celestial Tensions post and today's posts
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

// Look for any posts with Celestial in story
const celestialPosts = await MarketingPost.find({
  $or: [
    { 'story.title': /celestial/i },
    { caption: /celestial/i },
    { caption: /airplane/i },
    { caption: /30,000/i },
    { caption: /dominic/i },
    { caption: /ava/i }
  ]
}).sort({ createdAt: -1 }).limit(5);

console.log('Posts matching Celestial/airplane search:', celestialPosts.length);
for (const post of celestialPosts) {
  console.log('---');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.story?.title || post.storyId);
  console.log('Status:', post.status);
  console.log('Tier:', post.tier);
  console.log('Caption:', post.caption?.substring(0, 100));
}

// Also get all posts from today
const today = new Date();
today.setHours(0, 0, 0, 0);
const todaysPosts = await MarketingPost.find({
  createdAt: { $gte: today }
}).sort({ createdAt: -1 });

console.log('\nTotal posts created today:', todaysPosts.length);
for (const post of todaysPosts) {
  const storyTitle = post.story?.title || post.storyId || 'N/A';
  console.log(`- ${post._id.toString()} | Tier: ${post.tier} | Status: ${post.status} | Story: ${storyTitle}`);
}

process.exit(0);
