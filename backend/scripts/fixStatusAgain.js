import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function fix() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const postId = '69884d71a1eae8dba9e64d04';
  
  // Fix to 'approved' so it can be picked up by scheduler
  // Using 'approved' instead of 'posting' because the monitoring service keeps marking it 'failed'
  const update = {
    '$set': {
      'status': 'approved',
      'error': null,
      'failedAt': null
    }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  console.log('Updated:', result.modifiedCount, 'document(s)');
  
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\nPost now:');
  console.log('  Status:', post.status);
  console.log('  TikTok:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram:', post.platformStatus?.instagram?.status);
  
  // Verify it will be picked up by scheduler
  const now = new Date();
  const wouldMatch = 
    ['approved', 'posting', 'failed'].includes(post.status) &&
    post.scheduledAt <= now &&
    post.videoPath;
  console.log('\nWill be picked up by scheduler?', wouldMatch);
  
  await client.close();
  console.log('\n=== PLEASE RESTART BACKEND ===');
}

fix().catch(console.error);
