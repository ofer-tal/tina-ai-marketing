import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function debug() {
  const client = new MongoClient(uri);
  await client.connect();

  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });

  console.log('=== POST DEBUG INFO ===');
  console.log('Title:', post.title);
  console.log('Status:', post.status);
  console.log('\nDates:');
  console.log('  createdAt:', post.createdAt, '→', new Date(post.createdAt).toISOString());
  console.log('  updatedAt:', post.updatedAt, '→', new Date(post.updatedAt).toISOString());
  console.log('  postingStartedAt:', post.postingStartedAt, '→', post.postingStartedAt ? new Date(post.postingStartedAt).toISOString() : 'null');
  console.log('  scheduledAt:', post.scheduledAt, '→', new Date(post.scheduledAt).toISOString());
  console.log('  failedAt:', post.failedAt, '→', post.failedAt ? new Date(post.failedAt).toISOString() : 'null');

  console.log('\n=== CALCULATING WHAT MONITORING SERVICE WOULD SEE ===');

  const now = new Date();

  // This is what the monitoring service calculates
  const postingStartedAt =
    post.postingStartedAt ||
    post.sheetTriggeredAt ||
    post.uploadProgress?.startedAt ||
    post.updatedAt;

  console.log('postingStartedAt used by monitoring:', postingStartedAt);
  console.log('  Value:', postingStartedAt ? new Date(postingStartedAt).toISOString() : 'null');

  if (postingStartedAt) {
    const timeInPosting = now - postingStartedAt;
    console.log('  timeInPosting (ms):', timeInPosting);
    console.log('  timeInPosting (seconds):', Math.round(timeInPosting / 1000) + 's');
    console.log('  timeInPosting (minutes):', Math.round(timeInPosting / 60000) + 'm');
    console.log('  timeInPosting (hours):', Math.round(timeInPosting / 3600000) + 'h');
  }

  // Check what createdAt would give us
  const timeFromCreatedAt = now - post.createdAt;
  console.log('\nIf using createdAt (OLD BUGGY CODE):');
  console.log('  Time from createdAt (seconds):', Math.round(timeFromCreatedAt / 1000) + 's');
  console.log('  Time from createdAt (hours):', Math.round(timeFromCreatedAt / 3600000) + 'h');

  // Check what updatedAt would give us
  const timeFromUpdatedAt = now - post.updatedAt;
  console.log('\nIf using updatedAt:');
  console.log('  Time from updatedAt (seconds):', Math.round(timeFromUpdatedAt / 1000) + 's');

  await client.close();
}

debug().catch(console.error);
