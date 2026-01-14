import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function main() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');
  const doc = await posts.findOne({status: 'draft'}, {sort: {createdAt: -1}});
  console.log('Found draft post:', doc?._id?.toString(), doc?.title);
  await client.close();
}

main().catch(console.error);
