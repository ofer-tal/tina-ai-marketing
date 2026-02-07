/**
 * Verify the tier_2 post I created earlier
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

const post = await MarketingPost.findById('69869434a3e02414895aab83');

if (post) {
  console.log('=== TIER_2 POST VERIFIED ===');
  console.log('ID:', post._id.toString());
  console.log('Story:', post.storyName);
  console.log('Platform:', post.platform);
  console.log('Status:', post.status);
  console.log('Content Tier:', post.contentTier);
  console.log('Scheduled At:', post.scheduledAt);
  console.log('Caption:', post.caption?.substring(0, 100));
  console.log('\nThis post should be visible in your Content Library now.');
} else {
  console.log('Post not found!');
}

process.exit(0);
