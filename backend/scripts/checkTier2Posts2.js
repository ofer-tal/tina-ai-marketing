import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkPosts() {
  const client = new MongoClient(uri);
  await client.connect();
  
  // Get database name from URI
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1) || 'blush';
  console.log('Database:', dbName);
  
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  
  console.log('\nCollections:');
  const marketingCols = collections.filter(c => c.name.includes('marketing') || c.name.includes('post'));
  for (const col of marketingCols) {
    console.log('  -', col.name);
  }
  
  // Find the marketing_posts collection
  const collection = db.collection('marketing_posts');
  
  // Count all posts
  const totalCount = await collection.countDocuments();
  console.log('\nTotal posts:', totalCount);
  
  // Find tier_2 posts
  const tier2Posts = await collection.find({ contentTier: 'tier_2' }).toArray();
  console.log('Tier 2 posts found:', tier2Posts.length);
  
  // Find posts by the IDs we're looking for
  const postIds = [
    '69884d71a1eae8dba9e64d04',
    '69884d7ba1eae8dba9e64d14',
    '69883ae84b3b23c7bb7ebe23',
    '69883ae84b3b23c7bb7ebe20'
  ];
  
  for (const id of postIds) {
    const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (post) {
      console.log('\nPost:', id);
      console.log('  Title:', post.title);
      console.log('  Status:', post.status);
      console.log('  contentTier:', post.contentTier);
      console.log('  platformStatus:', JSON.stringify(post.platformStatus, null, 2));
    } else {
      console.log('\nPost NOT found:', id);
    }
  }
  
  await client.close();
}

checkPosts().catch(console.error);
