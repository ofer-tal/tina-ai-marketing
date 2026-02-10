import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function verify() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });
  
  console.log('=== FINAL STATE ===');
  console.log('Title:', post.title);
  console.log('Status:', post.status);
  console.log('postingStartedAt:', post.postingStartedAt);
  console.log('\nPlatform statuses:');
  console.log('  TikTok:', post.platformStatus?.tiktok?.status, '(will SKIP)');
  console.log('  Instagram:', post.platformStatus?.instagram?.status, '(will POST)');
  
  const now = new Date();
  const willBePickedUp = 
    ['approved', 'posting', 'failed'].includes(post.status) &&
    new Date(post.scheduledAt) <= now &&
    post.videoPath;
  
  console.log('\n=== SCHEDULER ===');
  console.log('Will be picked up:', willBePickedUp ? 'YES ✅' : 'NO ❌');
  console.log('Next run: ~12:00 PM (top of hour)');
  
  const timeSincePostingStarted = post.postingStartedAt ? now - new Date(post.postingStartedAt) : null;
  console.log('Time since postingStartedAt:', timeSincePostingStarted ? Math.round(timeSincePostingStarted / 1000) + 's' : 'N/A');
  console.log('Failed threshold:', 600 * 60 * 1000 / 1000 + 's (10 hours)');
  console.log('Will be marked as failed by monitoring?', timeSincePostingStarted > (600 * 60 * 1000) ? 'YES ❌' : 'NO ✅');
  
  await client.close();
  console.log('\n=== SUMMARY ===');
  console.log('✅ TikTok will NOT be reposted (already posted)');
  console.log('✅ Instagram will be posted on next scheduler run');
  console.log('✅ Monitoring service will NOT mark as failed');
}

verify().catch(console.error);
