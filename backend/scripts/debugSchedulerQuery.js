import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function debugQuery() {
  const client = new MongoClient(uri);
  await client.connect();
  
  const dbUrl = new URL(uri);
  const dbName = dbUrl.pathname.slice(1);
  const db = client.db(dbName);
  const collection = db.collection('marketing_posts');

  const now = new Date();
  console.log('=== SCHEDULER QUERY DEBUG ===');
  console.log('Current time:', now.toISOString());
  console.log('');
  
  // This is what the NEW scheduler queries
  const query = {
    status: { $in: ['approved', 'posting'] },
    scheduledAt: { $lte: now },
    videoPath: { $exists: true, $ne: null }
  };
  
  console.log('Query:', JSON.stringify(query, null, 2));
  console.log('');
  
  // Get ALL posts first to see what we have
  const allPosts = await collection.find({}).sort({ scheduledAt: -1 }).limit(5).toArray();
  console.log('All posts (top 5 by scheduledAt):');
  allPosts.forEach(p => {
    console.log(`  ${p._id.toString()}`);
    console.log(`    Title: ${p.title}`);
    console.log(`    Status: ${p.status}`);
    console.log(`    scheduledAt: ${p.scheduledAt}`);
    console.log(`    videoPath exists: ${!!p.videoPath}`);
    console.log(`    platforms: ${JSON.stringify(p.platforms || [])}`);
    console.log('');
  });
  
  // Now run the actual query
  const results = await collection.find(query).toArray();
  console.log(`Query results: ${results.length} posts found`);
  results.forEach(p => {
    console.log(`  - ${p.title} (${p.status})`);
  });
  
  // Specific check for our post
  const postId = '69884d71a1eae8dba9e64d04';
  const ourPost = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });
  console.log('\n=== OUR POST ===');
  console.log('ID:', postId);
  console.log('Title:', ourPost.title);
  console.log('Status:', ourPost.status);
  console.log('scheduledAt:', ourPost.scheduledAt);
  console.log('scheduledAt <= now?', ourPost.scheduledAt <= now);
  console.log('videoPath exists?', !!ourPost.videoPath);
  console.log('Status in ["approved", "posting"]?', ['approved', 'posting'].includes(ourPost.status));
  console.log('\nWould match query?', 
    ['approved', 'posting'].includes(ourPost.status) &&
    ourPost.scheduledAt <= now &&
    ourPost.videoPath
  );
  
  await client.close();
}

debugQuery().catch(console.error);
