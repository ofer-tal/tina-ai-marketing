import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkStatus() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });
  
  if (post) {
    console.log('Post:', post._id.toString());
    console.log('Title:', post.title);
    console.log('Overall status:', post.status);
    console.log('\nPlatform statuses:');
    console.log('  TikTok:', post.platformStatus?.tiktok?.status);
    console.log('  Instagram:', post.platformStatus?.instagram?.status);
    console.log('  Instagram error:', post.platformStatus?.instagram?.error || 'none');
    console.log('\nscheduledAt:', post.scheduledAt);
  }
  
  await client.close();
}

checkStatus().catch(console.error);
