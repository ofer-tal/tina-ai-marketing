import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function checkPinterest() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');

  const pinterestPosts = await posts.find({ platform: 'pinterest' }).limit(3).toArray();
  console.log('📌 Pinterest posts:');
  pinterestPosts.forEach(p => {
    console.log(`\n- ID: ${p._id}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Created: ${p.createdAt}`);
  });

  await client.close();
}

checkPinterest().catch(console.error);
