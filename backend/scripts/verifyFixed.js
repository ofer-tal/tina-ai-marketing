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
  
  const now = new Date();
  const wouldMatch = 
    ['approved', 'posting', 'failed'].includes(post.status) &&
    new Date(post.scheduledAt) <= now &&
    post.videoPath;
  
  console.log('Post Status:', post.status);
  console.log('Will be picked up by scheduler?', wouldMatch ? 'YES ✅' : 'NO ❌');
  
  await client.close();
}

verify().catch(console.error);
