import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function findMissingFields() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');

  const tiktokPost = await posts.findOne({ platform: 'tiktok' });
  console.log('📄 Sample TikTok post structure:');
  console.log(JSON.stringify(tiktokPost, null, 2));

  const requiredFields = [
    'title',
    'caption',
    'scheduledAt',
    'storyId',
    'storyName',
    'storyCategory',
    'storySpiciness'
  ];

  console.log('\n✅ Required fields check:');
  requiredFields.forEach(field => {
    const exists = tiktokPost.hasOwnProperty(field);
    const hasValue = tiktokPost[field] !== undefined && tiktokPost[field] !== null && tiktokPost[field] !== '';
    console.log(`  ${field}: exists=${exists}, hasValue=${hasValue}, value=${JSON.stringify(tiktokPost[field])}`);
  });

  await client.close();
}

findMissingFields().catch(console.error);
