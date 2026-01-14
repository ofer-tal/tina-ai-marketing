import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function checkSchemaMismatch() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');

  const sample = await posts.findOne({ platform: 'tiktok' });
  console.log('📄 Sample TikTok post:');
  console.log(JSON.stringify(sample, null, 2));

  const requiredFields = ['title', 'caption', 'scheduledAt', 'storyId', 'storyName', 'storyCategory', 'storySpiciness'];
  console.log('\n✅ Required fields check:');
  requiredFields.forEach(field => {
    const hasField = sample.hasOwnProperty(field) && sample[field] !== undefined && sample[field] !== null && sample[field] !== '';
    console.log(`  ${field}: ${hasField ? '✅' : '❌ Missing'} ${hasField ? JSON.stringify(sample[field]) : ''}`);
  });

  await client.close();
}

checkSchemaMismatch().catch(console.error);
