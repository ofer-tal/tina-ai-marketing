import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function clearError() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');
  
  const postId = '69884d71a1eae8dba9e64d04';
  
  const update = {
    '$set': {
      'platformStatus.instagram.status': 'pending',
      'platformStatus.instagram.error': null,
      'platformStatus.instagram.lastFailedAt': null
    }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  
  console.log('Cleared Instagram error for post:', postId);
  console.log('Modified:', result.modifiedCount, 'document(s)');
  
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\nUpdated platform status:');
  console.log('  TikTok:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram:', post.platformStatus?.instagram?.status, '(error:', post.platformStatus?.instagram?.error || 'none', ')');
  
  await client.close();
  console.log('\nDone! Instagram is now pending and can be retried.');
}

clearError().catch(console.error);
