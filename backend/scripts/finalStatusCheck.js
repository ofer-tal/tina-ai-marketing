import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkAndFix() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });
  
  console.log('Current post state:');
  console.log('  Status:', post.status);
  console.log('  TikTok:', post.platformStatus?.tiktok?.status);
  console.log('  Instagram:', post.platformStatus?.instagram?.status);
  console.log('  Error:', post.error || 'none');
  
  // Fix the status to 'posting' since it's partially posted
  const update = {
    '$set': {
      'status': 'posting',
      'error': null
    }
  };
  
  await collection.updateOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') }, update);
  console.log('\n✅ Fixed status to "posting"');
  
  await client.close();
  console.log('\n=== IMPORTANT ===');
  console.log('1. The backend server MUST be restarted for Instagram to retry posting.');
  console.log('2. The updated code includes:');
  console.log('   - Multi-platform sequential posting (no more parallel save errors)');
  console.log('   - Scheduler picks up "posting" status posts for retry');
  console.log('   - postMonitoringService uses postingStartedAt instead of createdAt');
  console.log('3. After restart, Instagram will post on the next scheduler run (every 15 min)');
}

checkAndFix().catch(console.error);
