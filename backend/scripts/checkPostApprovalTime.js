/**
 * Check when the Instagram post was approved
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

  const postId = '6984f0a359585ce5ff08a24f';
  const post = await MarketingPost.findById(postId);

  if (!post) {
    console.log('Post not found');
    process.exit(1);
  }

  console.log('=== POST DETAILS ===');
  console.log(`ID: ${post._id}`);
  console.log(`Title: ${post.title}`);
  console.log(`Platform: ${post.platform}`);
  console.log(`Status: ${post.status}`);
  console.log('');

  console.log('=== TIMESTAMP FIELDS ===');
  console.log(`createdAt: ${post.createdAt}`);
  console.log(`createdAt (ISO): ${post.createdAt.toISOString()}`);
  console.log(`createdAt (local): ${post.createdAt.toString()}`);
  console.log('');

  console.log(`updatedAt: ${post.updatedAt}`);
  console.log(`updatedAt (ISO): ${post.updatedAt.toISOString()}`);
  console.log(`updatedAt (local): ${post.updatedAt.toString()}`);
  console.log('');

  console.log(`scheduledAt: ${post.scheduledAt}`);
  console.log(`scheduledAt (ISO): ${post.scheduledAt.toISOString()}`);
  console.log(`scheduledAt (local): ${post.scheduledAt.toString()}`);
  console.log('');

  console.log(`approvedAt: ${post.approvedAt}`);
  console.log(`approvedAt (ISO): ${post.approvedAt?.toISOString()}`);
  console.log(`approvedAt (local): ${post.approvedAt?.toString()}`);
  console.log('');

  console.log('=== TIME ANALYSIS ===');
  const now = new Date();
  const scheduledAt = new Date(post.scheduledAt);
  const approvedAt = post.approvedAt ? new Date(post.approvedAt) : null;

  console.log(`Current time (ISO): ${now.toISOString()}`);
  console.log(`Current time (local): ${now.toString()}`);
  console.log('');

  if (approvedAt) {
    const timeBetweenApprovalAndSchedule = scheduledAt.getTime() - approvedAt.getTime();
    const timeBetweenApprovalAndNow = now.getTime() - approvedAt.getTime();
    const timeBetweenScheduleAndNow = now.getTime() - scheduledAt.getTime();

    console.log(`Time between approval and scheduled time: ${Math.round(timeBetweenApprovalAndSchedule / 1000)} seconds (${Math.round(timeBetweenApprovalAndSchedule / 60000)} minutes)`);
    console.log(`Time between approval and now: ${Math.round(timeBetweenApprovalAndNow / 1000)} seconds (${Math.round(timeBetweenApprovalAndNow / 60000)} minutes)`);
    console.log(`Time between scheduled and now: ${Math.round(timeBetweenScheduleAndNow / 1000)} seconds (${Math.round(timeBetweenScheduleAndNow / 60000)} minutes)`);
    console.log('');

    if (approvedAt > scheduledAt) {
      console.log('*** POST WAS APPROVED AFTER THE SCHEDULED TIME ***');
      console.log(`The post was approved ${Math.round((approvedAt.getTime() - scheduledAt.getTime()) / 1000)} seconds AFTER it was scheduled to post.`);
    } else {
      console.log('Post was approved before the scheduled time (good)');
    }
  } else {
    console.log('No approvedAt timestamp found');
  }

  console.log('');
  console.log('=== VIDEO PATH ===');
  console.log(`Has videoPath: ${post.videoPath ? 'YES' : 'NO'}`);
  console.log(`videoPath: ${post.videoPath}`);

  process.exit(0);
}

check().catch(console.error);
