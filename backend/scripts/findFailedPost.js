import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

async function findFailedPosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('AdultStoriesCluster');
  const coll = db.collection('marketing_posts');

  const failed = await coll.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log('FAILED POSTS:');
  console.log('----------------------------------------');
  failed.forEach((p, i) => {
    console.log(`${i + 1}. ID: ${p._id}`);
    console.log(`   Title: ${p.title || 'No title'}`);
    console.log(`   Scheduled: ${p.scheduledFor}`);
    console.log(`   Platform: ${p.platform}`);
    console.log(`   Story ID: ${p.storyId || 'N/A'}`);
    console.log('');
  });

  await client.close();
}

findFailedPosts();
