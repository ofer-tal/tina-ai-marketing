import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function checkStoryIdType() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');

  const tiktokPost = await posts.findOne({ platform: 'tiktok' });

  console.log('storyId value:', tiktokPost.storyId);
  console.log('storyId type:', typeof tiktokPost.storyId);
  console.log('storyId is ObjectId:', tiktokPost.storyId instanceof ObjectId);
  console.log('storyId constructor:', tiktokPost.storyId?.constructor?.name);

  await client.close();
}

checkStoryIdType().catch(console.error);
