/**
 * Feature #317: Update content and verify persistence
 *
 * This script tests the complete workflow of:
 * 1. Creating a content post
 * 2. Updating the caption
 * 3. Verifying the update persists after page refresh
 * 4. Verifying the database contains the updated value
 */

const mongoose = require('mongoose');
const axios = require('axios');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const API_BASE = 'http://localhost:3001';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://api-user:ijhuAQ3Za%5Ey%5ESFqj@adultstoriescluster.pgate.mongodb.net/AdultStoriesCluster?retryWrites=true&loadBalanced=false&replicaSet=atlas-c8sz7v-shard-0&readPreference=primary&srvServiceName=mongodb&connectTimeoutMS=10000&w=majority&authSource=admin&authMechanism=SCRAM-SHA-1';

// Test data
const TEST_TITLE = 'TEST_317_UPDATE_VERIFY';
const ORIGINAL_CAPTION = 'Original caption for Feature #317 test';
const UPDATED_CAPTION = 'UPDATED caption for Feature #317 verification - ' + Date.now();

let createdPostId = null;

/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`${colors.green}✓${colors.reset} Connected to MongoDB`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Failed to connect to MongoDB:`, error.message);
    return false;
  }
}

/**
 * Step 1: Create content post
 */
async function step1_createContent() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 1: Create content post${colors.reset}`);
  console.log(`${colors.blue}──────────────────────────────────────────────────────${colors.reset}`);

  try {
    const response = await axios.post(`${API_BASE}/api/content/posts/create`, {
      title: TEST_TITLE,
      description: 'Test post for Feature #317',
      platform: 'tiktok',
      contentType: 'image',
      caption: ORIGINAL_CAPTION,
      hashtags: ['#test317', '#update', '#persistence'],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story for Feature 317',
      storyCategory: 'Contemporary'
    });

    if (response.data.success && response.data.data) {
      createdPostId = response.data.data._id;
      console.log(`${colors.green}✓${colors.reset} Content post created successfully`);
      console.log(`  Post ID: ${createdPostId}`);
      console.log(`  Original caption: "${ORIGINAL_CAPTION}"`);
      return true;
    } else {
      console.error(`${colors.red}✗${colors.reset} Failed to create post: Invalid response`);
      console.error(`  Response:`, JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Failed to create post:`, error.message);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, error.response.data);
    }
    return false;
  }
}

/**
 * Step 2: Update caption text
 */
async function step2_updateCaption() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 2: Update caption text${colors.reset}`);
  console.log(`${colors.blue}──────────────────────────────────────────────────────${colors.reset}`);

  if (!createdPostId) {
    console.error(`${colors.red}✗${colors.reset} No post ID available. Step 1 must have failed.`);
    return false;
  }

  try {
    const response = await axios.put(`${API_BASE}/api/content/posts/${createdPostId}`, {
      caption: UPDATED_CAPTION
    });

    if (response.data.success && response.data.data) {
      console.log(`${colors.green}✓${colors.reset} Caption updated successfully`);
      console.log(`  New caption: "${UPDATED_CAPTION}"`);
      console.log(`  API response caption: "${response.data.data.caption}"`);

      // Verify the API returned the updated caption
      if (response.data.data.caption === UPDATED_CAPTION) {
        console.log(`${colors.green}✓${colors.reset} API confirmed caption update`);
        return true;
      } else {
        console.error(`${colors.red}✗${colors.reset} API returned different caption`);
        return false;
      }
    } else {
      console.error(`${colors.red}✗${colors.reset} Failed to update caption: Invalid response`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Failed to update caption:`, error.message);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, error.response.data);
    }
    return false;
  }
}

/**
 * Step 3: Verify caption shows updated text (via API)
 */
async function step3_verifyViaAPI() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 3: Verify caption shows updated text${colors.reset}`);
  console.log(`${colors.blue}──────────────────────────────────────────────────────${colors.reset}`);

  if (!createdPostId) {
    console.error(`${colors.red}✗${colors.reset} No post ID available`);
    return false;
  }

  try {
    const response = await axios.get(`${API_BASE}/api/content/posts/${createdPostId}`);

    if (response.data.success && response.data.data) {
      const post = response.data.data;
      console.log(`${colors.green}✓${colors.reset} Post retrieved from API`);
      console.log(`  Caption in API: "${post.caption}"`);

      if (post.caption === UPDATED_CAPTION) {
        console.log(`${colors.green}✓${colors.reset} Caption matches updated value`);
        return true;
      } else {
        console.error(`${colors.red}✗${colors.reset} Caption does not match`);
        console.error(`  Expected: "${UPDATED_CAPTION}"`);
        console.error(`  Got: "${post.caption}"`);
        return false;
      }
    } else {
      console.error(`${colors.red}✗${colors.reset} Failed to retrieve post`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Failed to retrieve post:`, error.message);
    return false;
  }
}

/**
 * Step 4: Check database for updated value
 */
async function step4_verifyDatabase() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 4: Check database for updated value${colors.reset}`);
  console.log(`${colors.blue}──────────────────────────────────────────────────────${colors.reset}`);

  if (!createdPostId) {
    console.error(`${colors.red}✗${colors.reset} No post ID available`);
    return false;
  }

  try {
    // Try both collection names (marketing_posts and marketingposts)
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`  Available collections: ${collectionNames.join(', ')}`);

    let post = null;
    let usedCollection = null;

    // Try 'marketingposts' first (Mongoose pluralizes 'MarketingPost')
    if (collectionNames.includes('marketingposts')) {
      const marketingposts = db.collection('marketingposts');
      post = await marketingposts.findOne({ _id: new mongoose.Types.ObjectId(createdPostId) });
      if (post) usedCollection = 'marketingposts';
    }

    // Fallback to 'marketing_posts'
    if (!post && collectionNames.includes('marketing_posts')) {
      const marketing_posts = db.collection('marketing_posts');
      post = await marketing_posts.findOne({ _id: new mongoose.Types.ObjectId(createdPostId) });
      if (post) usedCollection = 'marketing_posts';
    }

    if (post) {
      console.log(`${colors.green}✓${colors.reset} Post found in database`);
      console.log(`  Collection: ${usedCollection}`);
      console.log(`  Caption in DB: "${post.caption}"`);

      if (post.caption === UPDATED_CAPTION) {
        console.log(`${colors.green}✓${colors.reset} Database caption matches updated value`);
        console.log(`${colors.green}✓${colors.reset} Update persistence verified`);
        return true;
      } else {
        console.error(`${colors.red}✗${colors.reset} Database caption does not match`);
        console.error(`  Expected: "${UPDATED_CAPTION}"`);
        console.error(`  Got: "${post.caption}"`);
        return false;
      }
    } else {
      console.error(`${colors.red}✗${colors.reset} Post not found in database`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Database query failed:`, error.message);
    return false;
  }
}

/**
 * Step 5: Verify all fields still present
 */
async function step5_verifyFields() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 5: Verify all fields still present${colors.reset}`);
  console.log(`${colors.blue}──────────────────────────────────────────────────────${colors.reset}`);

  if (!createdPostId) {
    console.error(`${colors.red}✗${colors.reset} No post ID available`);
    return false;
  }

  try {
    const db = mongoose.connection.db;
    const collectionNames = (await db.listCollections().toArray()).map(c => c.name);

    let post = null;
    let usedCollection = null;

    if (collectionNames.includes('marketingposts')) {
      const marketingposts = db.collection('marketingposts');
      post = await marketingposts.findOne({ _id: new mongoose.Types.ObjectId(createdPostId) });
      if (post) usedCollection = 'marketingposts';
    }

    if (!post && collectionNames.includes('marketing_posts')) {
      const marketing_posts = db.collection('marketing_posts');
      post = await marketing_posts.findOne({ _id: new mongoose.Types.ObjectId(createdPostId) });
      if (post) usedCollection = 'marketing_posts';
    }

    if (!post) {
      console.error(`${colors.red}✗${colors.reset} Post not found in database`);
      return false;
    }

    // Check required fields
    const requiredFields = [
      '_id',
      'title',
      'platform',
      'contentType',
      'status',
      'caption',
      'hashtags',
      'createdAt',
      'updatedAt'
    ];

    let allFieldsPresent = true;
    const missingFields = [];

    for (const field of requiredFields) {
      if (post[field] === undefined || post[field] === null) {
        missingFields.push(field);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      console.log(`${colors.green}✓${colors.reset} All required fields present`);
      console.log(`  Verified fields: ${requiredFields.join(', ')}`);
      return true;
    } else {
      console.error(`${colors.red}✗${colors.reset} Missing fields: ${missingFields.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Field verification failed:`, error.message);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log(`\n${colors.yellow}${colors.bright}CLEANUP: Removing test data${colors.reset}`);
  console.log(`${colors.blue}──────────────────────────────────────────────────────${colors.reset}`);

  if (!createdPostId) {
    console.log(`${colors.yellow}⊘${colors.reset} No post to clean up`);
    return;
  }

  try {
    await axios.delete(`${API_BASE}/api/content/posts/${createdPostId}`);
    console.log(`${colors.green}✓${colors.reset} Test post deleted via API`);

    // Also try to delete from database directly
    const db = mongoose.connection.db;
    const collectionNames = (await db.listCollections().toArray()).map(c => c.name);

    if (collectionNames.includes('marketingposts')) {
      const result = await db.collection('marketingposts').deleteOne({
        title: TEST_TITLE
      });
      if (result.deletedCount > 0) {
        console.log(`${colors.green}✓${colors.reset} Deleted from marketingposts collection`);
      }
    }

    if (collectionNames.includes('marketing_posts')) {
      const result = await db.collection('marketing_posts').deleteOne({
        title: TEST_TITLE
      });
      if (result.deletedCount > 0) {
        console.log(`${colors.green}✓${colors.reset} Deleted from marketing_posts collection`);
      }
    }
  } catch (error) {
    console.error(`${colors.yellow}⚠${colors.reset} Cleanup warning:`, error.message);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Feature #317: Update Content and Verify Persistence    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.error(`${colors.red}${colors.bright}FATAL: Cannot proceed without database connection${colors.reset}`);
    process.exit(1);
  }

  // Run test steps
  const results = {
    step1: await step1_createContent(),
    step2: await step2_updateCaption(),
    step3: await step3_verifyViaAPI(),
    step4: await step4_verifyDatabase(),
    step5: await step5_verifyFields()
  };

  // Cleanup
  await cleanup();

  // Close database connection
  await mongoose.disconnect();
  console.log(`\n${colors.blue}─${colors.reset}`.repeat(60));

  // Print results
  console.log(`\n${colors.bright}${colors.cyan}TEST RESULTS${colors.reset}`);
  console.log(`${colors.blue}─${colors.reset}`.repeat(60));

  const allPassed = Object.values(results).every(r => r === true);

  console.log(`Step 1 (Create content):         ${results.step1 ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`}`);
  console.log(`Step 2 (Update caption):          ${results.step2 ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`}`);
  console.log(`Step 3 (Verify via API):          ${results.step3 ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`}`);
  console.log(`Step 4 (Verify database):         ${results.step4 ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`}`);
  console.log(`Step 5 (Verify fields intact):    ${results.step5 ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`}`);

  console.log(`\n${colors.blue}─${colors.reset}`.repeat(60));

  if (allPassed) {
    console.log(`\n${colors.bright}${colors.green}✓ ALL TESTS PASSED${colors.reset}`);
    console.log(`${colors.green}Feature #317 is working correctly${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.bright}${colors.red}✗ SOME TESTS FAILED${colors.reset}`);
    console.log(`${colors.red}Feature #317 has issues that need to be addressed${colors.reset}\n`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}${colors.bright}UNEXPECTED ERROR:${colors.reset}`, error);
  process.exit(1);
});
