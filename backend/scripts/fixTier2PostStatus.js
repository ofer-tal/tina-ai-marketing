import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function fixPostStatus() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');
  
  const postId = '69884d71a1eae8dba9e64d04';
  
  console.log('Fixing post:', postId);
  
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  if (!post) {
    console.log('Post not found!');
    await client.close();
    return;
  }
  
  console.log('Current state:');
  console.log('  Status:', post.status);
  console.log('  TikTok status:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram status:', post.platformStatus?.instagram?.status);
  console.log('  Instagram error:', post.platformStatus?.instagram?.error);
  
  // Based on the logs:
  // 1. TikTok DID post successfully (log shows "TikTok Auto-Posting SUCCESS")
  // 2. Instagram failed with parallel save error (can be retried)
  
  const update = {
    '$set': {
      'status': 'posted',  // At least TikTok was posted
      'platformStatus.tiktok.status': 'posted',
      'platformStatus.tiktok.postedAt': new Date('2026-02-08T19:00:14Z'),  // From log timestamp
      'platformStatus.instagram.status': 'pending',
      'platformStatus.instagram.error': null,
      'platformStatus.instagram.lastFailedAt': null,
      'updatedAt': new Date()
    }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  
  console.log('\nUpdate result:', result.modifiedCount, 'document(s) modified');
  
  const updatedPost = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\nNew state:');
  console.log('  Status:', updatedPost.status);
  console.log('  TikTok status:', updatedPost.platformStatus?.tiktok?.status);
  console.log('  TikTok postedAt:', updatedPost.platformStatus?.tiktok?.postedAt);
  console.log('  Instagram status:', updatedPost.platformStatus?.instagram?.status);
  console.log('  Instagram error:', updatedPost.platformStatus?.instagram?.error);
  
  await client.close();
  console.log('\nDone!');
}

fixPostStatus().catch(console.error);
