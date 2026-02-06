/**
 * Diagnose Scheduler Query
 *
 * This script simulates exactly what the posting scheduler does:
 * 1. Runs the same MongoDB query
 * 2. Shows what new Date() returns at execution time
 * 3. Shows the comparison between scheduledAt and current time
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import MarketingPost from '../models/MarketingPost.js';
import databaseService from '../services/database.js';

async function diagnose() {
  await databaseService.connect();

  const now = new Date();
  const nowUtc = now.toISOString();
  const nowTimestamp = now.getTime();

  console.log('=== SCHEDULER QUERY DIAGNOSIS ===');
  console.log('');
  console.log('Current time when query runs:');
  console.log(`  new Date() = ${now}`);
  console.log(`  new Date().toISOString() = ${nowUtc}`);
  console.log(`  new Date().getTime() = ${nowTimestamp}`);
  console.log(`  new Date().toString() = ${now.toString()}`);
  console.log(`  new Date().toLocaleString() = ${now.toLocaleString()}`);
  console.log('');

  // Run the EXACT same query as the scheduler
  console.log('=== RUNNING SCHEDULER QUERY ===');
  console.log('Query:', JSON.stringify({
    status: 'approved',
    scheduledAt: { $lte: now },
    videoPath: { $exists: true, $ne: null }
  }, null, 2));
  console.log('');

  const scheduledContent = await MarketingPost.find({
    status: 'approved',
    scheduledAt: { $lte: now },
    videoPath: { $exists: true, $ne: null }
  }); // Skip populate to avoid Story model issue

  console.log(`Results: Found ${scheduledContent.length} posts`);
  console.log('');

  // Now let's check ALL approved posts regardless of scheduledAt
  const allApproved = await MarketingPost.find({
    status: 'approved',
    videoPath: { $exists: true, $ne: null }
  });

  console.log(`=== ALL APPROVED POSTS (${allApproved.length} total) ===`);
  for (const post of allApproved) {
    const scheduledAt = new Date(post.scheduledAt);
    const scheduledTimestamp = scheduledAt.getTime();
    const diff = nowTimestamp - scheduledTimestamp;
    const isReady = scheduledTimestamp <= nowTimestamp;

    console.log(`\nPost: ${post._id}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Platform: ${post.platform}`);
    console.log(`  scheduledAt (raw): ${post.scheduledAt}`);
    console.log(`  scheduledAt (Date): ${scheduledAt}`);
    console.log(`  scheduledAt (ISO): ${scheduledAt.toISOString()}`);
    console.log(`  scheduledAt timestamp: ${scheduledTimestamp}`);
    console.log(`  current timestamp: ${nowTimestamp}`);
    console.log(`  diff (current - scheduled): ${diff}ms (${Math.round(diff / 60000)} minutes)`);
    console.log(`  $lte comparison: ${scheduledTimestamp} <= ${nowTimestamp} = ${isReady}`);
    console.log(`  Should be found by query: ${isReady ? 'YES' : 'NO'}`);

    if (!isReady) {
      const minutesUntilReady = Math.ceil((scheduledTimestamp - nowTimestamp) / 60000);
      console.log(`  Will be ready in: ${minutesUntilReady} minutes`);
    }

    // Check videoPath
    console.log(`  Has videoPath: ${post.videoPath ? 'YES' : 'NO'}`);
    console.log(`  videoPath: ${post.videoPath}`);
  }

  // Let's also check what posts WOULD be found if we remove the scheduledAt condition
  console.log('\n=== QUERY WITHOUT scheduledAt CONDITION ===');
  const withoutScheduledAt = await MarketingPost.find({
    status: 'approved',
    videoPath: { $exists: true, $ne: null }
  });
  console.log(`Found ${withoutScheduledAt.length} approved posts with video`);

  // Check for any posts that might have null/undefined videoPath
  console.log('\n=== CHECKING videoPath FIELD ===');
  const approvedWithoutVideoPath = await MarketingPost.find({
    status: 'approved',
    $or: [
      { videoPath: { $exists: false } },
      { videoPath: null },
      { videoPath: '' }
    ]
  });
  console.log(`Found ${approvedWithoutVideoPath.length} approved posts WITHOUT valid videoPath`);
  for (const post of approvedWithoutVideoPath) {
    console.log(`  - ${post._id}: videoPath = ${post.videoPath}`);
  }

  process.exit(0);
}

diagnose().catch(console.error);
