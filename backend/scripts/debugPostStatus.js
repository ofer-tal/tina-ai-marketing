import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function debugStatus() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });
  
  if (post) {
    console.log('Post platforms array:', post.platforms);
    console.log('\nPlatformStatus keys:', Object.keys(post.platformStatus || {}));
    
    console.log('\nSimulating getOverallStatus():');
    const platformStatuses = post.platforms
      .map(p => post.platformStatus?.[p]?.status)
      .filter(s => s);
    console.log('  platformStatuses:', platformStatuses);
    
    console.log('\nChecks:');
    console.log('  All posted?', platformStatuses.every(s => s === 'posted'));
    console.log('  Some posting/pending?', platformStatuses.some(s => s === 'posting' || s === 'pending'));
    
    // The actual getOverallStatus logic
    if (platformStatuses.length === 0) {
      console.log('  Would return:', post.status || 'draft', '(empty platformStatuses)');
    } else if (platformStatuses.every(s => s === 'posted')) {
      console.log('  Would return: posted');
    } else if (platformStatuses.every(s => s === 'failed' || s === 'skipped')) {
      console.log('  Would return: failed');
    } else if (platformStatuses.some(s => s === 'posted') && platformStatuses.some(s => s === 'failed' || s === 'skipped')) {
      console.log('  Would return: partial_posted');
    } else if (platformStatuses.some(s => s === 'posting' || s === 'pending')) {
      console.log('  Would return: posting');
    } else {
      console.log('  Would return:', post.status, '(default)');
    }
  }
  
  await client.close();
}

debugStatus().catch(console.error);
