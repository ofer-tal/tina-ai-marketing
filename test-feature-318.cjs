/**
 * Feature #318: Delete content and verify removal
 *
 * This test verifies that:
 * 1. Content posts can be created
 * 2. The post ID is properly captured
 * 3. Posts can be deleted via API
 * 4. Database queries confirm deletion
 * 5. Post no longer exists after deletion
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE = 'http://localhost:3001/api';
const MONGO_URI = process.env.MONGODB_URI;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(stepNum, description) {
  console.log('\n' + '='.repeat(60));
  log(`STEP ${stepNum}: ${description}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ${message}`, 'blue');
}

// Test state
let testPostId = null;
let testPostData = null;

async function connectToDatabase() {
  logInfo('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGO_URI);
    logSuccess('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    logError(`Failed to connect to MongoDB: ${error.message}`);
    return false;
  }
}

async function closeDatabaseConnection() {
  await mongoose.connection.close();
  logInfo('Database connection closed');
}

// STEP 1: Create content post
async function step1_createContentPost() {
  logStep(1, 'Create content post');

  try {
    const timestamp = Date.now();
    const response = await axios.post(`${API_BASE}/content/posts/create`, {
      platform: 'tiktok',
      contentType: 'image',
      storyId: new mongoose.Types.ObjectId(),
      storyName: `Test Story for Feature #318 - ${timestamp}`,
      storyCategory: 'Contemporary',
      caption: `Test caption for delete verification - ${timestamp}`,
      hashtags: ['#test318', '#deleteTest', '#feature318'],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });

    if (response.data && response.data.success && response.data.data) {
      testPostData = response.data.data;
      testPostId = testPostData._id;
      logSuccess(`Content post created successfully`);
      logInfo(`Post ID: ${testPostId}`);
      logInfo(`Title: ${testPostData.title}`);
      return true;
    } else {
      logError('Unexpected API response format');
      return false;
    }
  } catch (error) {
    logError(`Failed to create content post: ${error.message}`);
    if (error.response) {
      logInfo(`Response status: ${error.response.status}`);
      logInfo(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

// STEP 2: Record post _id
async function step2_recordPostId() {
  logStep(2, 'Record post _id');

  if (!testPostId) {
    logError('No post ID available from Step 1');
    return false;
  }

  logSuccess('Post ID recorded successfully');
  logInfo(`Post ID: ${testPostId}`);
  logInfo(`ID Type: ${typeof testPostId}`);
  logInfo(`ID Valid: ${mongoose.Types.ObjectId.isValid(testPostId)}`);

  // Also verify we can fetch the post
  try {
    const response = await axios.get(`${API_BASE}/content/posts/${testPostId}`);
    if (response.data && response.data.success && response.data.data) {
      logSuccess('Post fetchable via API (verification before deletion)');
      logInfo(`Fetched post title: ${response.data.data.title}`);
      return true;
    } else {
      logError('Failed to fetch post via API');
      return false;
    }
  } catch (error) {
    logError(`Failed to fetch post: ${error.message}`);
    return false;
  }
}

// STEP 3: Delete post
async function step3_deletePost() {
  logStep(3, 'Delete post');

  if (!testPostId) {
    logError('No post ID available for deletion');
    return false;
  }

  try {
    logInfo(`Sending DELETE request to ${API_BASE}/content/posts/${testPostId}`);
    const response = await axios.delete(`${API_BASE}/content/posts/${testPostId}`);

    if (response.data && response.data.success) {
      logSuccess('Delete API call successful');
      logInfo(`Response message: ${response.data.message || 'No message'}`);
      return true;
    } else {
      logError('Unexpected delete response format');
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to delete post: ${error.message}`);
    if (error.response) {
      logInfo(`Response status: ${error.response.status}`);
      logInfo(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// STEP 4: Query database for _id
async function step4_queryDatabase() {
  logStep(4, 'Query database for deleted post');

  if (!testPostId) {
    logError('No post ID to query');
    return false;
  }

  try {
    // Try both collection names (marketing_posts and marketingposts)
    const MarketingPost = mongoose.model('MarketingPost', new mongoose.Schema({}, { strict: false }), 'marketingposts');
    const query = { _id: new mongoose.Types.ObjectId(testPostId) };

    logInfo(`Querying marketingposts collection for _id: ${testPostId}`);
    const result = await MarketingPost.findOne(query);

    if (result) {
      logError('Post still exists in database (should be deleted!)');
      logInfo(`Found post: ${result.title}`);
      return false;
    } else {
      logSuccess('Post not found in database (correctly deleted)');
      return true;
    }
  } catch (error) {
    logError(`Database query failed: ${error.message}`);
    return false;
  }
}

// STEP 5: Verify post not found via API
async function step5_verifyNotInAPI() {
  logStep(5, 'Verify post not found via API');

  if (!testPostId) {
    logError('No post ID to verify');
    return false;
  }

  try {
    logInfo(`Attempting to fetch deleted post via API...`);
    const response = await axios.get(`${API_BASE}/content/posts/${testPostId}`);

    // If we get here, the post still exists (should have gotten 404)
    logError('Post still fetchable via API (should return 404!)');
    logInfo(`Response status: ${response.status}`);
    if (response.data && response.data.data) {
      logInfo(`Post title: ${response.data.data.title}`);
    }
    return false;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logSuccess('API correctly returns 404 for deleted post');
      return true;
    } else {
      logError(`Unexpected error when fetching deleted post: ${error.message}`);
      if (error.response) {
        logInfo(`Response status: ${error.response.status}`);
      }
      return false;
    }
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '█'.repeat(60));
  log('Feature #318: Delete content and verify removal', 'magenta');
  console.log('█'.repeat(60) + '\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    logError('Cannot proceed without database connection');
    process.exit(1);
  }

  const results = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false
  };

  try {
    // Run all steps
    results.step1 = await step1_createContentPost();
    if (results.step1) {
      results.step2 = await step2_recordPostId();
    }
    if (results.step2) {
      results.step3 = await step3_deletePost();
    }
    if (results.step3) {
      results.step4 = await step4_queryDatabase();
    }
    if (results.step4) {
      results.step5 = await step5_verifyNotInAPI();
    }
  } finally {
    await closeDatabaseConnection();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  log('TEST SUMMARY', 'yellow');
  console.log('='.repeat(60));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;

  Object.entries(results).forEach(([step, passed]) => {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    const stepNames = {
      step1: 'Create content post',
      step2: 'Record post _id',
      step3: 'Delete post',
      step4: 'Query database for _id',
      step5: 'Verify post not found'
    };
    log(`${status} - ${stepNames[step]}`, color);
  });

  console.log('='.repeat(60));
  log(`Total: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');

  if (passedTests === totalTests) {
    log('\n✓ ALL TESTS PASSED', 'green');
    log('Feature #318 is working correctly\n', 'green');
    process.exit(0);
  } else {
    log('\n✗ SOME TESTS FAILED', 'red');
    log('Feature #318 needs attention\n', 'red');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
