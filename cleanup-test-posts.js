import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority&authSource=admin&authMechanism=SCRAM-SHA-1';

async function cleanupTestPosts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('AdultStoriesCluster');

    // Delete from marketing_posts
    const result1 = await db.collection('marketing_posts').deleteMany({
      title: 'TEST_FEATURE_316_VERIFY_ME'
    });
    console.log(`Deleted ${result1.deletedCount} from marketing_posts`);

    // Delete from marketingposts
    const result2 = await db.collection('marketingposts').deleteMany({
      title: 'TEST_FEATURE_316_VERIFY_ME'
    });
    console.log(`Deleted ${result2.deletedCount} from marketingposts`);

    console.log(`Total deleted: ${result1.deletedCount + result2.deletedCount}`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    await client.close();
  }
}

cleanupTestPosts();
