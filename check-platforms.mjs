import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function checkPlatforms() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');

  console.log('📊 Posts by platform:');
  const platforms = await posts.aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  platforms.forEach(p => {
    console.log(`  ${p._id}: ${p.count}`);
  });

  console.log('\n📊 TikTok posts:');
  const tiktokPosts = await posts.find({ platform: 'tiktok' }).limit(5).toArray();
  tiktokPosts.forEach(p => {
    console.log(`- ${p._id} | "${p.title}" | ${p.status}`);
  });

  await client.close();
}

checkPlatforms().catch(console.error);
