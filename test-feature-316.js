/**
 * Feature #316: Create content post and verify in database
 *
 * This test verifies that content posts are correctly stored in MongoDB
 * and all fields are properly populated.
 */

import fetch from 'node-fetch';
import { MongoClient, ObjectId } from 'mongodb';

const API_BASE = 'http://localhost:3001';
// Read from .env file
const MONGODB_URI = 'mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&w=majority&authSource=admin&authMechanism=SCRAM-SHA-1';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bold}${colors.blue}⟳ ${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ℹ ${message}`, 'yellow');
}

/**
 * Step 1: Generate content via API
 */
async function generateContent() {
  logStep('Step 1: Generate content via API');

  const testPostData = {
    title: 'TEST_FEATURE_316_VERIFY_ME',
    description: 'This is a test post for Feature #316 verification',
    platform: 'tiktok',
    contentType: 'image',
    status: 'draft',
    caption: 'Test caption for feature 316 verification #test #verification',
    hashtags: ['test', 'feature316', 'verification'],
    storyId: new ObjectId().toString(),
    storyName: 'Test Story for Feature 316',
    storyCategory: 'Contemporary',
    storySpiciness: 1,
    generationSource: 'feature_316_test'
  };

  try {
    const response = await fetch(`${API_BASE}/api/content/posts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPostData)
    });

    const result = await response.json();

    if (!result.success) {
      logError(`API returned error: ${result.error}`);
      return null;
    }

    logSuccess(`Content generated via API`);
    logInfo(`Post ID: ${result.data._id}`);
    logInfo(`Title: ${result.data.title}`);

    return result.data;
  } catch (error) {
    logError(`Failed to generate content: ${error.message}`);
    return null;
  }
}

/**
 * Step 2: Query marketing_posts collection
 */
async function queryMarketingPosts(postId) {
  logStep('Step 2: Query marketing_posts collection');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    logSuccess('Connected to MongoDB');

    // Get database name from connection string
    const dbName = MONGODB_URI.includes('/AdultStoriesCluster') ? 'AdultStoriesCluster' :
                   MONGODB_URI.includes('/blush-marketing') ? 'blush-marketing' : 'test';

    const db = client.db(dbName);
    logInfo(`Using database: ${dbName}`);

    // Try marketing_posts first
    let collection = db.collection('marketing_posts');
    let post = await collection.findOne({ _id: new ObjectId(postId) });

    // If not found, try marketingposts (Mongoose default)
    if (!post) {
      logInfo('Not found in marketing_posts, trying marketingposts collection');
      collection = db.collection('marketingposts');
      post = await collection.findOne({ _id: new ObjectId(postId) });
    }

    if (!post) {
      logError(`Post not found in either marketing_posts or marketingposts collection`);
      // List available collections for debugging
      const collections = await db.listCollections().toArray();
      logInfo(`Available collections: ${collections.map(c => c.name).join(', ')}`);
      return null;
    }

    logSuccess(`Post found in collection: ${collection.collectionName}`);
    logInfo(`Document ID: ${post._id}`);

    await client.close();
    return post;
  } catch (error) {
    logError(`Failed to query marketing_posts: ${error.message}`);
    await client.close();
    return null;
  }
}

/**
 * Step 3: Verify post exists with matching _id
 */
async function verifyPostId(apiPost, dbPost) {
  logStep('Step 3: Verify post exists with matching _id');

  if (!apiPost || !dbPost) {
    logError('Cannot verify - missing post data');
    return false;
  }

  const apiId = apiPost._id.toString();
  const dbId = dbPost._id.toString();

  if (apiId === dbId) {
    logSuccess(`Post _id matches: ${dbId}`);
    return true;
  } else {
    logError(`Post _id mismatch: API=${apiId}, DB=${dbId}`);
    return false;
  }
}

/**
 * Step 4: Verify all fields populated
 */
async function verifyFields(dbPost) {
  logStep('Step 4: Verify all fields populated');

  if (!dbPost) {
    logError('Cannot verify fields - missing post data');
    return false;
  }

  const requiredFields = [
    '_id',
    'title',
    'platform',
    'contentType',
    'status',
    'caption',
    'hashtags',
    'scheduledAt',
    'storyId',
    'storyName',
    'storyCategory',
    'createdAt',
    'updatedAt'
  ];

  let allFieldsPresent = true;

  for (const field of requiredFields) {
    const value = dbPost[field];

    if (value === undefined || value === null || value === '') {
      logError(`Field '${field}' is missing or empty: ${JSON.stringify(value)}`);
      allFieldsPresent = false;
    } else {
      logSuccess(`Field '${field}' is populated: ${JSON.stringify(value).substring(0, 50)}`);
    }
  }

  // Additional field type verification
  if (dbPost.createdAt instanceof Date) {
    logSuccess('createdAt is a valid Date');
  } else {
    logError('createdAt is not a valid Date');
    allFieldsPresent = false;
  }

  if (dbPost.updatedAt instanceof Date) {
    logSuccess('updatedAt is a valid Date');
  } else {
    logError('updatedAt is not a valid Date');
    allFieldsPresent = false;
  }

  if (Array.isArray(dbPost.hashtags)) {
    logSuccess(`hashtags is an array with ${dbPost.hashtags.length} items`);
  } else {
    logError('hashtags is not an array');
    allFieldsPresent = false;
  }

  return allFieldsPresent;
}

/**
 * Step 5: Delete test post
 */
async function deleteTestPost(postId) {
  logStep('Step 5: Delete test post');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    logSuccess('Connected to MongoDB');

    const dbName = MONGODB_URI.includes('/AdultStoriesCluster') ? 'AdultStoriesCluster' :
                   MONGODB_URI.includes('/blush-marketing') ? 'blush-marketing' : 'test';

    const db = client.db(dbName);

    // Try both collections
    let collection = db.collection('marketing_posts');
    let result = await collection.deleteOne({
      title: 'TEST_FEATURE_316_VERIFY_ME'
    });

    if (result.deletedCount === 0) {
      // Try marketingposts collection
      collection = db.collection('marketingposts');
      result = await collection.deleteOne({
        title: 'TEST_FEATURE_316_VERIFY_ME'
      });
    }

    if (result.deletedCount === 0) {
      logError('No post deleted (post may have already been deleted)');
      await client.close();
      return false;
    }

    logSuccess(`Test post deleted: ${result.deletedCount} document(s)`);

    // Verify deletion from both collections
    const remaining1 = await db.collection('marketing_posts').countDocuments({
      title: 'TEST_FEATURE_316_VERIFY_ME'
    });
    const remaining2 = await db.collection('marketingposts').countDocuments({
      title: 'TEST_FEATURE_316_VERIFY_ME'
    });
    const totalRemaining = remaining1 + remaining2;

    if (totalRemaining === 0) {
      logSuccess('Verified: No test posts remain in database');
    } else {
      logError(`Warning: ${totalRemaining} test post(s) still exist`);
    }

    await client.close();
    return true;
  } catch (error) {
    logError(`Failed to delete test post: ${error.message}`);
    await client.close();
    return false;
  }
}

/**
 * Main test execution
 */
async function runTest() {
  log('\n' + '='.repeat(60));
  log('Feature #316: Create content post and verify in database', 'bold');
  log('='.repeat(60));

  let apiPost = null;
  let dbPost = null;
  let allStepsPassed = true;

  // Step 1: Generate content
  apiPost = await generateContent();
  if (!apiPost) {
    logError('Step 1 failed - cannot continue');
    allStepsPassed = false;
  }

  // Step 2: Query database
  if (apiPost) {
    dbPost = await queryMarketingPosts(apiPost._id);
    if (!dbPost) {
      logError('Step 2 failed - cannot continue');
      allStepsPassed = false;
    }
  }

  // Step 3: Verify ID match
  if (apiPost && dbPost) {
    const idMatch = await verifyPostId(apiPost, dbPost);
    if (!idMatch) {
      allStepsPassed = false;
    }
  }

  // Step 4: Verify fields
  if (dbPost) {
    const fieldsValid = await verifyFields(dbPost);
    if (!fieldsValid) {
      allStepsPassed = false;
    }
  }

  // Step 5: Delete test post
  if (apiPost) {
    const deleted = await deleteTestPost(apiPost._id);
    if (!deleted) {
      allStepsPassed = false;
    }
  }

  // Final result
  log('\n' + '='.repeat(60));
  if (allStepsPassed) {
    log('✓ ALL TESTS PASSED', 'green');
    log('Feature #316 is working correctly', 'green');
  } else {
    log('✗ SOME TESTS FAILED', 'red');
    log('Feature #316 has issues that need to be addressed', 'red');
  }
  log('='.repeat(60) + '\n');

  process.exit(allStepsPassed ? 0 : 1);
}

// Run the test
runTest().catch(error => {
  logError(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
