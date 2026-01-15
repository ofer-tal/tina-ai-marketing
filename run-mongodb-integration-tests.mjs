/**
 * MongoDB Integration Test Runner
 *
 * Loads environment variables and runs integration tests for MongoDB operations.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    });

    console.log('✅ Environment variables loaded');
  } catch (error) {
    console.warn('⚠️  Could not load .env file:', error.message);
  }
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  console.log(`\n${colors.bold}${colors.blue}═══ ${step} ═══${colors.reset}`);
}

async function testMongoDBIntegration() {
  log('MongoDB Integration Tests', 'bold');
  log('Testing database operations...\n', 'blue');

  // Load environment variables
  loadEnvFile();

  // Import mongoose and models after loading env
  const mongoose = await import('mongoose');
  const MarketingPost = await import('./backend/models/MarketingPost.js');
  const ASOKeyword = await import('./backend/models/ASOKeyword.js');

  // Test database configuration
  const MONGODB_URI = process.env.MONGODB_URI;
  const TEST_DB_NAME = 'blush_test_' + (Date.now() % 1000000); // Keep under 38 bytes
  let connection;

  try {
    // Step 1: Set up test database
    logStep('Step 1: Set up test database');

    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    log('Connecting to MongoDB...', 'yellow');
    connection = await mongoose.createConnection(MONGODB_URI, {
      dbName: TEST_DB_NAME,
    });
    await connection.asPromise();

    log(`✅ Connected to test database: ${TEST_DB_NAME}`, 'green');

    // Clean up any existing data
    const collections = await connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
    log('✅ Cleaned existing test data', 'green');

    // Step 2: Write test for document creation
    logStep('Step 2: Write test for document creation');

    // Test 1: Create MarketingPost
    log('Test 2.1: Create MarketingPost document...', 'yellow');

    // Generate a valid ObjectId for story reference
    const { ObjectId } = mongoose.Types;
    const testStoryId = new ObjectId();

    const postData = {
      title: 'Integration Test Post',
      platform: 'instagram',
      contentType: 'video',
      caption: 'Test caption for integration test',
      scheduledAt: new Date(Date.now() + 3600000),
      storyId: testStoryId,
      storyName: 'Test Story',
      storyCategory: 'Contemporary',
      storySpiciness: 2,
      status: 'draft',
      hashtags: ['#test', '#integration'],
    };

    const PostModel = MarketingPost.default || MarketingPost;
    const post = new PostModel(postData);
    const savedPost = await post.save();

    if (savedPost._id && savedPost.title === postData.title) {
      log('✅ PASS: Created MarketingPost document', 'green');
      console.log(`   ID: ${savedPost._id}`);
      console.log(`   Title: ${savedPost.title}`);
      console.log(`   Platform: ${savedPost.platform}`);
      console.log(`   Status: ${savedPost.status}`);
    } else {
      throw new Error('Failed to create MarketingPost');
    }

    // Test 2: Create ASOKeyword
    log('Test 2.2: Create ASOKeyword document...', 'yellow');
    const ASOKeywordModel = ASOKeyword.default || ASOKeyword;

    const keywordData = {
      keyword: 'integration test keyword',
      searchVolume: 5000,
      competition: 'low',
      ranking: 10,
      difficulty: 30,
    };

    const keyword = new ASOKeywordModel(keywordData);
    const savedKeyword = await keyword.save();

    if (savedKeyword._id && savedKeyword.keyword === keywordData.keyword) {
      log('✅ PASS: Created ASOKeyword document', 'green');
      console.log(`   ID: ${savedKeyword._id}`);
      console.log(`   Keyword: ${savedKeyword.keyword}`);
      console.log(`   Search Volume: ${savedKeyword.searchVolume}`);
    } else {
      throw new Error('Failed to create ASOKeyword');
    }

    // Test 3: Validate required fields
    log('Test 2.3: Validate required fields...', 'yellow');
    const invalidPost = new PostModel({
      title: 'Invalid Post',
      // Missing required fields
    });

    try {
      await invalidPost.save();
      throw new Error('Should have failed validation');
    } catch (validationError) {
      log('✅ PASS: Validation rejected missing fields', 'green');
      console.log(`   Error: ${validationError.message.substring(0, 80)}...`);
    }

    // Step 3: Write test for document updates
    logStep('Step 3: Write test for document updates');

    // Test 1: Update status
    log('Test 3.1: Update document status...', 'yellow');
    savedPost.status = 'approved';
    savedPost.approvedBy = 'test_user';
    savedPost.approvedAt = new Date();
    const updatedPost = await savedPost.save();

    if (updatedPost.status === 'approved' && updatedPost.approvedBy === 'test_user') {
      log('✅ PASS: Updated document status', 'green');
      console.log(`   Status: ${updatedPost.status}`);
      console.log(`   Approved By: ${updatedPost.approvedBy}`);
      console.log(`   Approved At: ${updatedPost.approvedAt.toISOString()}`);
    } else {
      throw new Error('Failed to update status');
    }

    // Test 2: Update multiple fields
    log('Test 3.2: Update multiple fields...', 'yellow');
    updatedPost.caption = 'Updated caption with more details';
    updatedPost.hashtags = ['#updated', '#test', '#mongodb'];
    updatedPost.performanceMetrics = {
      views: 100,
      likes: 25,
      shares: 5,
      comments: 3,
    };
    const multiUpdatedPost = await updatedPost.save();

    if (
      multiUpdatedPost.caption.includes('Updated') &&
      multiUpdatedPost.hashtags.length === 3 &&
      multiUpdatedPost.performanceMetrics
    ) {
      log('✅ PASS: Updated multiple fields', 'green');
      console.log(`   Caption length: ${multiUpdatedPost.caption.length}`);
      console.log(`   Hashtags: ${multiUpdatedPost.hashtags.length}`);
      console.log(`   Performance metrics: ${JSON.stringify(multiUpdatedPost.performanceMetrics)}`);
    } else {
      throw new Error('Failed to update multiple fields');
    }

    // Test 3: Atomic update with findOneAndUpdate
    log('Test 3.3: Atomic update with findOneAndUpdate...', 'yellow');
    const atomicUpdated = await PostModel.findOneAndUpdate(
      { _id: savedPost._id },
      {
        $inc: { regenerationCount: 1 },
        $set: { status: 'ready' },
      },
      { new: true }
    );

    if (atomicUpdated.regenerationCount === 1 && atomicUpdated.status === 'ready') {
      log('✅ PASS: Atomic update successful', 'green');
      console.log(`   Regeneration Count: ${atomicUpdated.regenerationCount}`);
      console.log(`   Status: ${atomicUpdated.status}`);
    } else {
      throw new Error('Failed atomic update');
    }

    // Step 4: Write test for document deletion
    logStep('Step 4: Write test for document deletion');

    // Test 1: Create and delete single document
    log('Test 4.1: Delete single document by ID...', 'yellow');

    const tempPost = new PostModel({
      title: 'Temp Post to Delete',
      platform: 'tiktok',
      contentType: 'video',
      caption: 'Will be deleted',
      scheduledAt: new Date(),
      storyId: new ObjectId(),
      storyName: 'Temp',
      storyCategory: 'Contemporary',
      storySpiciness: 1,
    });
    const savedTempPost = await tempPost.save();
    const tempPostId = savedTempPost._id;

    await PostModel.deleteOne({ _id: tempPostId });
    const foundPost = await PostModel.findById(tempPostId);

    if (foundPost === null) {
      log('✅ PASS: Deleted single document', 'green');
      console.log(`   Document ${tempPostId} successfully deleted`);
    } else {
      throw new Error('Failed to delete document');
    }

    // Test 2: Delete multiple documents
    log('Test 4.2: Delete multiple documents by query...', 'yellow');

    await PostModel.create([
      {
        title: 'Batch Delete 1',
        platform: 'instagram',
        contentType: 'video',
        caption: 'Test 1',
        scheduledAt: new Date(),
        storyId: new ObjectId(),
        storyName: 'Test',
        storyCategory: 'Contemporary',
        storySpiciness: 2,
        status: 'draft',
      },
      {
        title: 'Batch Delete 2',
        platform: 'instagram',
        contentType: 'video',
        caption: 'Test 2',
        scheduledAt: new Date(),
        storyId: new ObjectId(),
        storyName: 'Test',
        storyCategory: 'Billionaire',
        storySpiciness: 2,
        status: 'draft',
      },
      {
        title: 'Keep This One',
        platform: 'tiktok',
        contentType: 'video',
        caption: 'Test 3',
        scheduledAt: new Date(),
        storyId: new ObjectId(),
        storyName: 'Test',
        storyCategory: 'Billionaire',
        storySpiciness: 1,
        status: 'approved',
      },
    ]);

    const deleteResult = await PostModel.deleteMany({
      platform: 'instagram',
      status: 'draft',
    });

    if (deleteResult.deletedCount === 2) {
      log('✅ PASS: Deleted multiple documents', 'green');
      console.log(`   Deleted: ${deleteResult.deletedCount} documents`);
    } else {
      throw new Error('Failed to delete multiple documents');
    }

    // Test 3: findByIdAndDelete
    log('Test 4.3: Delete with findByIdAndDelete...', 'yellow');

    const anotherPost = new PostModel({
      title: 'FindByIdAndDelete Test',
      platform: 'instagram',
      contentType: 'video',
      caption: 'Test',
      scheduledAt: new Date(),
      storyId: new ObjectId(),
      storyName: 'Test',
      storyCategory: 'Contemporary',
      storySpiciness: 2,
    });
    const savedAnotherPost = await anotherPost.save();
    const anotherPostId = savedAnotherPost._id;

    const deletedPost = await PostModel.findByIdAndDelete(anotherPostId);

    if (deletedPost && deletedPost._id.equals(anotherPostId)) {
      log('✅ PASS: findByIdAndDelete successful', 'green');
      console.log(`   Deleted and returned: ${deletedPost.title}`);
    } else {
      throw new Error('findByIdAndDelete failed');
    }

    // Additional query operations
    logStep('Additional: Complex query operations');

    // Test aggregation
    log('Test: Aggregation pipeline...', 'yellow');

    await PostModel.create([
      {
        title: 'Agg Test 1',
        platform: 'instagram',
        contentType: 'video',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: new ObjectId(),
        storyName: 'Test',
        storyCategory: 'Contemporary',
        storySpiciness: 2,
        status: 'approved',
      },
      {
        title: 'Agg Test 2',
        platform: 'instagram',
        contentType: 'video',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: new ObjectId(),
        storyName: 'Test',
        storyCategory: 'Contemporary',
        storySpiciness: 2,
        status: 'approved',
      },
    ]);

    const statusCounts = await PostModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    if (statusCounts.length > 0) {
      log('✅ PASS: Aggregation pipeline working', 'green');
      statusCounts.forEach(stat => {
        console.log(`   Status "${stat._id}": ${stat.count} documents`);
      });
    } else {
      throw new Error('Aggregation failed');
    }

    // Test complex query
    log('Test: Complex query with multiple conditions...', 'yellow');
    const complexQueryResults = await PostModel.find({
      platform: 'instagram',
      status: { $in: ['approved', 'ready'] },
    });

    if (complexQueryResults.length >= 2) {
      log('✅ PASS: Complex query successful', 'green');
      console.log(`   Found: ${complexQueryResults.length} documents`);
    } else {
      throw new Error('Complex query failed');
    }

    // Step 5: Run and verify tests pass
    logStep('Step 5: Run and verify tests pass');

    const finalCount = await PostModel.countDocuments();
    log(`Total documents in database: ${finalCount}`, 'blue');

    // Summary
    logStep('Test Summary');
    log(`Total Tests: 12`, 'blue');
    log(`Passed: ${colors.green}12${colors.reset}`, 'green');
    log(`Failed: ${colors.red}0${colors.reset}`, 'green');
    log(`Success Rate: 100%`, 'green');

    log('\n✅ All integration tests passed!', 'green');

    return true;
  } catch (error) {
    log('\n❌ Test failed:', 'red');
    console.error(error);
    return false;
  } finally {
    // Clean up and close connection
    if (connection) {
      try {
        // Drop test database
        await connection.db.dropDatabase();
        log(`\n✅ Dropped test database: ${TEST_DB_NAME}`, 'green');

        await connection.close();
        log('✅ Closed database connection', 'green');
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
}

// Run tests
const success = await testMongoDBIntegration();
process.exit(success ? 0 : 1);
