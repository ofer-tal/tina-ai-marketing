import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkStuck() {
  const client = new MongoClient(uri);
  await client.connect();

  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const posts = await collection.find({
    status: { $in: ['posting', 'failed'] },
    scheduledAt: { $lte: new Date() }
  }).toArray();

  console.log('Posts in posting/failed status with past scheduled times:');
  if (posts.length === 0) {
    console.log('  (none - all good!)');
  } else {
    posts.forEach(p => {
      const age = Math.round((Date.now() - new Date(p.scheduledAt)) / 60000);
      console.log('  -', p._id.toString(), '|', p.title, '|', p.status, '| scheduled:', age + 'min ago');
    });
  }

  await client.close();
}

checkStuck().catch(console.error);
