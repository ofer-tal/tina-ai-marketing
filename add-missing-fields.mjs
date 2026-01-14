import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';

const client = new MongoClient('mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority');

async function migrateMissingFields() {
  await client.connect();
  const posts = client.db().collection('marketing_posts');

  console.log('🔍 Finding posts missing required fields...');

  // Find posts missing storyId
  const missingStoryId = await posts.find({ storyId: { $exists: false } }).toArray();
  console.log(`\n📊 Posts missing storyId: ${missingStoryId.length}`);

  if (missingStoryId.length > 0) {
    // Generate a dummy ObjectId for storyId
    const dummyStoryId = new ObjectId();
    const result = await posts.updateMany(
      { storyId: { $exists: false } },
      { $set: { storyId: dummyStoryId } }
    );
    console.log(`  ✅ Added storyId to ${result.modifiedCount} posts`);
  }

  // Find posts missing storySpiciness
  const missingSpiciness = await posts.find({ storySpiciness: { $exists: false } }).toArray();
  console.log(`\n📊 Posts missing storySpiciness: ${missingSpiciness.length}`);

  if (missingSpiciness.length > 0) {
    // Default spiciness to 1 (mild)
    const result = await posts.updateMany(
      { storySpiciness: { $exists: false } },
      { $set: { storySpiciness: 1 } }
    );
    console.log(`  ✅ Added storySpiciness=1 to ${result.modifiedCount} posts`);
  }

  // Verify
  const stillMissing = await posts.find({
    $or: [
      { storyId: { $exists: false } },
      { storySpiciness: { $exists: false } }
    ]
  }).toArray();

  if (stillMissing.length === 0) {
    console.log('\n✅ All posts now have required fields!');
  } else {
    console.log(`\n⚠️  Still ${stillMissing.length} posts missing fields`);
  }

  await client.close();
}

migrateMissingFields().catch(console.error);
