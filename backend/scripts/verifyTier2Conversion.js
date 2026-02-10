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

  const postIds = [
    '69884d71a1eae8dba9e64d04',
    '69884d7ba1eae8dba9e64d14', 
    '69883ae84b3b23c7bb7ebe23',
    '69883ae84b3b23c7bb7ebe20'
  ];

  console.log('Final verification of tier_2 posts:\n');

  for (const id of postIds) {
    const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (post) {
      console.log('Post:', id);
      console.log('  Title:', post.title);
      console.log('  Status:', post.status);
      console.log('  Story ID:', post.storyId || '(none - story-less!)');
      console.log('  Story Name:', post.storyName || '(none - story-less!)');
      console.log('  TikTok status:', post.platformStatus?.tiktok?.status || 'N/A');
      console.log('  Instagram status:', post.platformStatus?.instagram?.status || 'N/A');
      console.log('');
    }
  }

  await client.close();
}

verify().catch(console.error);
