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
  
  // Set to posted since both platforms are now posted
  // Also update the Instagram platform status
  const update = {
    '$set': {
      'status': 'posted',
      'error': null,
      'failedAt': null,
      'platformStatus.instagram.postedAt': new Date('2026-02-08T20:00:44.000Z'), // From log
      'platformStatus.instagram.mediaId': '18093037919063083', // From log
      'platformStatus.instagram.permalink': 'https://www.instagram.com/reel/DUgnH6Ij9fh/' // From log
    },
    '$unset': { 'retryCount': '', 'error': '' }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  console.log('Updated:', result.modifiedCount, 'document(s)');
  
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\nFinal state:');
  console.log('  Status:', post.status);
  console.log('  TikTok:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram:', post.platformStatus?.instagram?.status);
  console.log('  Instagram mediaId:', post.platformStatus?.instagram?.mediaId);
  
  await client.close();
}

fix().catch(console.error);
