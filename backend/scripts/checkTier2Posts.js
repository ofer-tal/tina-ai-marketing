import 'dotenv/config.js';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function checkPostStatus() {
  await client.connect();
  const db = client.db('blush');
  const collection = db.collection('marketing_posts');

  const postIds = [
    '69884d71a1eae8dba9e64d04',
    '69884d7ba1eae8dba9e64d14',
    '69883ae84b3b23c7bb7ebe23',
    '69883ae84b3b23c7bb7ebe20'
  ];

  console.log('Checking tier_2 posts status...\n');

  for (const id of postIds) {
    const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (post) {
      console.log('Post:', id);
      console.log('  Title:', post.title);
      console.log('  Status:', post.status);
      console.log('  platformStatus.tiktok:', JSON.stringify(post.platformStatus?.tiktok || null));
      console.log('  platformStatus.instagram:', JSON.stringify(post.platformStatus?.instagram || null));
      console.log('');
    } else {
      console.log('Post NOT found:', id, '\n');
    }
  }

  await client.close();
}

checkPostStatus().catch(console.error);
