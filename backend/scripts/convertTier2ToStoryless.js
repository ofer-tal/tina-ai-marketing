import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function convertTier2Posts() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const updates = [
    { _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04'), title: 'Trope Talk (Abbey + ACOTAR)' },
    { _id: new mongoose.Types.ObjectId('69884d7ba1eae8dba9e64d14'), title: 'Emotional book (Abbey + It Ends With Us)' },
    { _id: new mongoose.Types.ObjectId('69883ae84b3b23c7bb7ebe23'), title: 'Spicy preference (Abbey + Haunting Adeline)' },
    { _id: new mongoose.Types.ObjectId('69883ae84b3b23c7bb7ebe20'), title: 'Spiciest book (Abbey + LORDS series)' }
  ];

  console.log('Converting tier_2 posts to story-less...\n');

  for (const update of updates) {
    console.log('Processing post', update._id.toString(), '...');
    const current = await collection.findOne({ _id: update._id });
    if (!current) {
      console.log('  ❌ Post not found\n');
      continue;
    }
    console.log('  Current title:', current.title);
    console.log('  Current story:', current.storyName || 'none');

    const result = await collection.updateOne(
      { _id: update._id },
      { 
        '$set': { 
          title: update.title,
          storyId: null,
          storyName: null,
          storyCategory: null,
          storySpiciness: null
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('  ✅ Updated to title:', update.title);
      console.log('  📝 Story fields cleared (story-less engagement video)\n');
    } else {
      console.log('  ⚠️ No changes made\n');
    }
  }

  await client.close();
  console.log('Done!');
}

convertTier2Posts().catch(console.error);
