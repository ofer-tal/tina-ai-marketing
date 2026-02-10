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

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });
  
  console.log('Post videoPath:', post.videoPath);
  console.log('videoPath exists?', !!post.videoPath);
  console.log('videoPath is null?', post.videoPath === null);
  
  // Also check what field actually contains the video path
  console.log('\nAll video-related fields:');
  console.log('  videoPath:', post.videoPath);
  console.log('  s3Url:', post.s3Url);
  console.log('  s3Key:', post.s3Key);
  console.log('  tierParameters.videoPath:', post.tierParameters?.videoPath);
  
  await client.close();
}

check().catch(console.error);
