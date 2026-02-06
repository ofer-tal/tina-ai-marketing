/**
 * Check scheduled post times
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import MarketingPost from '../models/MarketingPost.js';
import databaseService from '../services/database.js';

async function check() {
  await databaseService.connect();

  // Find posts with scheduledAt
  const posts = await MarketingPost.find({
    status: { $in: ['approved', 'scheduled', 'posting', 'posted', 'failed'] },
    scheduledAt: { $exists: true }
  }).sort({ scheduledAt: 1 });

  console.log('=== Scheduled Posts ===');
  console.log('Current UTC time:', new Date().toISOString());
  console.log('Current Pacific time (UTC-8):', new Date(Date.now() - 8 * 3600000).toISOString());
  console.log('');

  const now = new Date();

  posts.forEach(post => {
    const scheduled = new Date(post.scheduledAt);
    const diff = scheduled.getTime() - now.getTime();
    const minutes = Math.round(diff / 60000);

    console.log(`Post: ${post._id}`);
    console.log(`  Status: ${post.status}`);
    console.log(`  Platform: ${post.platform}`);
    console.log(`  Scheduled (UTC): ${scheduled.toISOString()}`);
    console.log(`  Scheduled (Local, approx): ${new Date(scheduled.getTime() - 8 * 3600000).toISOString()}`);
    console.log(`  Time from now: ${minutes} minutes (${minutes < 0 ? 'PAST DUE' : 'future'})`);
    console.log(`  Ready to post: ${scheduled <= now ? 'YES' : 'NO'}`);
    console.log('');
  });

  process.exit(0);
}

check().catch(console.error);
