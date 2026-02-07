/**
 * Check if the test post exists
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

// Check for the test post
const testPost = await MarketingPost.findById('69869434a3e02414895aab83');

if (testPost) {
  console.log('=== TEST POST FOUND ===');
  console.log('ID:', testPost._id.toString());
  console.log('Story:', testPost.storyName);
  console.log('Platform:', testPost.platform);
  console.log('Status:', testPost.status);
  console.log('Content Tier:', testPost.contentTier);
  console.log('Hashtags:', testPost.hashtags);
  console.log('Tier Parameters:', testPost.tierParameters);
} else {
  console.log('Test post NOT found!');
}

// Also check all tier_2 posts
const allTier2Posts = await MarketingPost.find({ contentTier: 'tier_2' });
console.log('\n=== ALL TIER_2 POSTS IN DATABASE ===');
console.log('Count:', allTier2Posts.length);
for (const p of allTier2Posts) {
  console.log('-', p._id.toString(), '|', p.storyName, '|', p.status);
}

process.exit(0);
