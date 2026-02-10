import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function fixAndPost() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const postId = '69884d71a1eae8dba9e64d04';
  
  // First, let's see what the scheduler query would find
  console.log('Simulating scheduler query...\n');
  
  const now = new Date();
  console.log('Current time:', now.toISOString());
  
  // This is what the OLD scheduler code queries (before our fix):
  const oldQuery = {
    status: 'approved',
    scheduledAt: { $lte: now },
    videoPath: { $exists: true, $ne: null }
  };
  
  // This is what the NEW scheduler code should query (after our fix):
  const newQuery = {
    status: { $in: ['approved', 'posting'] },
    scheduledAt: { $lte: now },
    videoPath: { $exists: true, $ne: null }
  };
  
  const oldResults = await collection.find(oldQuery).toArray();
  const newResults = await collection.find(newQuery).toArray();
  
  console.log('OLD query (status: approved only):', oldResults.length, 'posts');
  console.log('NEW query (status: approved OR posting):', newResults.length, 'posts');
  
  if (newResults.length > 0) {
    console.log('\nPosts that would be found with NEW query:');
    newResults.forEach(p => {
      console.log('  -', p.title, '(status:', p.status, ')');
    });
  }
  
  // Now fix the post status
  console.log('\n=== FIXING POST STATUS ===');
  const update = {
    '$set': {
      'status': 'posting',
      'error': null  // Clear the error field
    }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  console.log('Updated', result.modifiedCount, 'document(s)');
  
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\nPost now:');
  console.log('  Status:', post.status);
  console.log('  TikTok:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram:', post.platformStatus?.instagram?.status);
  
  console.log('\n=== IMPORTANT ===');
  console.log('The scheduler code change to include "posting" status has NOT been deployed yet.');
  console.log('You need to RESTART the backend server for the fix to take effect.');
  console.log('Once restarted, Instagram will be posted on the next scheduler run (every 15 min).');
  
  await client.close();
}

fixAndPost().catch(console.error);
