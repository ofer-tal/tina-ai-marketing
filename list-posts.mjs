import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function main() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');
  const all = await posts.find({}).limit(5).toArray();
  console.log('Total posts:', await posts.countDocuments());
  console.log('Sample posts:');
  all.forEach(p => {
    console.log(`- ${p._id} | ${p.title} | ${p.status} | ${p.platform}`);
  });
  await client.close();
}

main().catch(console.error);
