/**
 * Simulate the scheduler query at the exact time it ran
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import MarketingPost from '../models/MarketingPost.js';
import databaseService from '../services/database.js';

async function simulate() {
  await databaseService.connect();

  // Simulate the scheduler running at exactly 16:45:01 Pacific on Feb 5, 2026
  // Which is 2026-02-06T00:45:01.000Z UTC
  const schedulerRunTime = new Date('2026-02-06T00:45:01.000Z');

  console.log('=== SIMULATING SCHEDULER QUERY ===');
  console.log('');
  console.log(`Scheduler run time (ISO): ${schedulerRunTime.toISOString()}`);
  console.log(`Scheduler run time (local): ${schedulerRunTime.toString()}`);
  console.log('');

  // The EXACT query the scheduler runs
  const query = {
    status: 'approved',
    scheduledAt: { $lte: schedulerRunTime },
    videoPath: { $exists: true, $ne: null }
  };

  console.log('Query:', JSON.stringify(query, null, 2));
  console.log('');

  const results = await MarketingPost.find(query);
  console.log(`Results: Found ${results.length} posts`);
  console.log('');

  for (const post of results) {
    console.log(`Post: ${post._id}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Platform: ${post.platform}`);
    console.log(`  Status: ${post.status}`);
    console.log(`  scheduledAt: ${post.scheduledAt.toISOString()}`);
    console.log(`  Is ready (scheduledAt <= schedulerRunTime): ${new Date(post.scheduledAt) <= schedulerRunTime}`);
    console.log('');
  }

  // Also check ALL approved posts with video to see what the scheduler might have missed
  console.log('=== ALL APPROVED POSTS WITH VIDEO (for comparison) ===');
  const allApproved = await MarketingPost.find({
    status: 'approved',
    videoPath: { $exists: true, $ne: null }
  });

  console.log(`Found ${allApproved.length} approved posts with video`);
  console.log('');

  for (const post of allApproved) {
    const scheduledAt = new Date(post.scheduledAt);
    const isReady = scheduledAt <= schedulerRunTime;

    console.log(`Post: ${post._id}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Platform: ${post.platform}`);
    console.log(`  scheduledAt: ${scheduledAt.toISOString()}`);
    console.log(`  Is ready: ${isReady}`);
    console.log(`  Would be found: ${isReady ? 'YES' : 'NO (scheduled in future)'}`);
    console.log('');
  }

  process.exit(0);
}

simulate().catch(console.error);
