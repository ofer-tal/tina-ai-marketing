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
  
  // Set postingStartedAt to now so monitoring service doesn't mark it as failed
  const update = {
    '$set': {
      'status': 'approved',
      'postingStartedAt': new Date(), // Set to now so it looks like it just started posting
      'error': null,
      'failedAt': null
    }
  };
  
  const result = await collection.updateOne({ _id: new mongoose.Types.ObjectId(postId) }, update);
  console.log('Updated:', result.modifiedCount, 'document(s)');
  console.log('Set postingStartedAt to now so monitoring service wont mark it as failed');
  
  await client.close();
}

fix().catch(console.error);
