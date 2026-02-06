/**
 * Update Instagram post for retry by resetting status and using new S3 key pattern
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { default: MarketingPost } = await import('../models/MarketingPost.js');
const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;

async function fixPost() {
  await databaseService.connect();

  const post = await MarketingPost.findById('6984f0a359585ce5ff08a24f');

  if (!post) {
    console.log('Post not found');
    process.exit(1);
  }

  console.log('=== FIXING POST FOR RETRY ===');
  console.log(`Current status: ${post.status}`);
  console.log(`Current error: ${post.error}`);
  console.log('');

  // The new S3 URL from recovery script
  const newS3Url = 'https://content.blush.v6v.one/marketing/videos/instagram-6984f0a359585ce5ff08a24f-retry-1770365169723.mp4';

  // Store the new S3 URL in a temporary field that the scheduler can use
  post.s3Url = newS3Url;

  // Reset status to approved
  post.status = 'approved';
  post.error = undefined;

  await post.save();

  console.log('Post updated:');
  console.log(`  status: approved`);
  console.log(`  s3Url: ${newS3Url}`);
  console.log('');
  console.log('The scheduler will now use this S3 URL instead of uploading again.');
  console.log('The scheduler runs every 15 minutes, or you can trigger manually from the Content Library.');

  process.exit(0);
}

fixPost().catch(console.error);
