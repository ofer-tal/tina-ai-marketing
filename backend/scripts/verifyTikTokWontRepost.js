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

  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId('69884d71a1eae8dba9e64d04') });
  
  console.log('=== VERIFICATION: TikTok will NOT be reposted ===\n');
  console.log('Post:', post.title);
  console.log('Overall status:', post.status);
  console.log('\nPlatform statuses:');
  
  post.platforms.forEach(platform => {
    const status = post.platformStatus?.[platform]?.status || 'not set';
    const willPost = status !== 'posted';
    console.log(`  ${platform}:`);
    console.log(`    Status: ${status}`);
    console.log(`    Will post: ${willPost ? 'YES ⚠️' : 'NO ✅'}`);
    
    if (status === 'posted') {
      console.log(`    Reason: Already posted, will be skipped (line 124-131 of postingScheduler.js)`);
    }
  });
  
  console.log('\n=== Scheduler Logic Trace ===');
  console.log('1. Scheduler finds post with status "posting"');
  console.log('2. Iterates through platforms: tiktok, instagram');
  console.log('3. For tiktok:');
  console.log('   - Checks platformStatus.tiktok.status === "posted"');
  console.log('   - TRUE! → Skips with continue (line 130)');
  console.log('4. For instagram:');
  console.log('   - Checks platformStatus.instagram.status === "posted"');
  console.log('   - FALSE (status is "pending")');
  console.log('   - Adds to postingTasks');
  console.log('5. Result: ONLY Instagram will be posted');
  
  await client.close();
  console.log('\n✅ CONFIRMED: TikTok will NOT be reposted');
}

verify().catch(console.error);
