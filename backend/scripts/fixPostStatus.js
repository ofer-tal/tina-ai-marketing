import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function fixStatus() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const postId = '69884d71a1eae8dba9e64d04';
  
  // The correct status should be 'posting' since:
  // - TikTok: posted
  // - Instagram: pending
  // getOverallStatus() returns 'posting' when some platforms are pending/posting
  
  const update = {
    '$set': {
      'status': 'posting'
    }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  
  console.log('Fixed post status to "posting"');
  console.log('Modified:', result.modifiedCount, 'document(s)');
  
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\nUpdated post:');
  console.log('  Title:', post.title);
  console.log('  Status:', post.status);
  console.log('  TikTok:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram:', post.platformStatus?.instagram?.status);
  
  await client.close();
}

fixStatus().catch(console.error);
