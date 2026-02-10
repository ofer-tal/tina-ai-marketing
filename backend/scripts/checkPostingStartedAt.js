import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function check() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') }, {
    projection: {
      title: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      postingStartedAt: 1,
      sheetTriggeredAt: 1,
      platformStatus: 1
    }
  });
  
  console.log('Post fields relevant to timeout calculation:');
  console.log('  createdAt:', post.createdAt);
  console.log('  updatedAt:', post.updatedAt);
  console.log('  postingStartedAt:', post.postingStartedAt);
  console.log('  sheetTriggeredAt:', post.sheetTriggeredAt);
  console.log('\nAt 12:00:21, the monitoring service would calculate:');
  console.log('  Using postingStartedAt:', post.postingStartedAt || 'not set');
  
  if (!post.postingStartedAt) {
    console.log('  ❌ postingStartedAt is NOT SET!');
    console.log('  This means the Mongoose model method that sets it is NOT being called!');
  }
  
  await client.close();
}

check().catch(console.error);
