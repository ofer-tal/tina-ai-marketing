/**
 * Feature #70: Content library storage - Verification Test
 *
 * This test verifies that all generated content assets are stored in an organized library.
 *
 * Test Steps:
 * 1. Generate content post
 * 2. Verify post saved to marketing_posts collection
 * 3. Check video/image paths stored
 * 4. Confirm caption and hashtags saved
 * 5. Test retrieving post from library
 *
 * Prerequisites:
 * - MongoDB must be connected
 * - Content generation service must be available
 */

import mongoose from 'mongoose';
import winston from 'winston';
import MarketingPost from './backend/models/MarketingPost.js';
import Story from './backend/models/Story.js';
import contentBatchingService from './backend/services/contentBatchingService.js';

// Create test logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  total: 0
};

function recordTest(step, name, passed, details = '') {
  testResults.total++;
  const result = { step, name, passed, details };
  if (passed) {
    testResults.passed.push(result);
    logger.info(`✅ PASS: ${name}`, { details });
  } else {
    testResults.failed.push(result);
    logger.error(`❌ FAIL: ${name}`, { details });
  }
}

async function checkMongoDBConnection() {
  logger.info('Step 0: Checking MongoDB connection...');

  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const stateName = states[state];
    logger.info(`MongoDB state: ${stateName}`);

    if (state !== 1) {
      recordTest(0, 'MongoDB Connection', false, `State: ${stateName}`);
      return false;
    }

    recordTest(0, 'MongoDB Connection', true, 'Connected and ready');
    return true;
  } catch (error) {
    recordTest(0, 'MongoDB Connection', false, error.message);
    return false;
  }
}

async function step1_GenerateContentPost() {
  logger.info('\n========================================');
  logger.info('Step 1: Generate content post');
  logger.info('========================================');

  try {
    // Find a test story to use
    const story = await Story.findOne({
      userId: null,
      status: 'ready'
    }).lean();

    if (!story) {
      recordTest(1, 'Find story for content generation', false, 'No stories found in database');
      return null;
    }

    recordTest(1, 'Find story for content generation', true, `Story: ${story.title} (ID: ${story._id})`);

    // Generate content using the batching service
    logger.info('Generating content post...');

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1); // Schedule for tomorrow

    const post = await contentBatchingService.generatePostForStory({
      story,
      platform: 'tiktok',
      scheduledAt: scheduledDate,
      includeCTA: true,
      spicinessLevel: story.spiciness
    });

    if (!post) {
      recordTest(1, 'Generate content post', false, 'Content batching service returned null');
      return null;
    }

    recordTest(1, 'Generate content post', true, `Post created with ID: ${post._id}`);

    return post;
  } catch (error) {
    recordTest(1, 'Generate content post', false, error.message);
    logger.error('Error generating content post:', error);
    return null;
  }
}

async function step2_VerifyPostSaved(postId) {
  logger.info('\n========================================');
  logger.info('Step 2: Verify post saved to marketing_posts collection');
  logger.info('========================================');

  if (!postId) {
    recordTest(2, 'Verify post saved to database', false, 'No post ID provided (Step 1 failed)');
    return null;
  }

  try {
    // Query the database for the post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      recordTest(2, 'Verify post saved to database', false, `Post with ID ${postId} not found in marketing_posts collection`);
      return null;
    }

    recordTest(2, 'Verify post saved to database', true, `Post found: ${post.title}`);

    return post;
  } catch (error) {
    recordTest(2, 'Verify post saved to database', false, error.message);
    logger.error('Error verifying post:', error);
    return null;
  }
}

async function step3_CheckAssetPaths(post) {
  logger.info('\n========================================');
  logger.info('Step 3: Check video/image paths stored');
  logger.info('========================================');

  if (!post) {
    recordTest(3, 'Check asset paths stored', false, 'No post provided (Step 2 failed)');
    return;
  }

  try {
    // Check video path
    const hasVideoPath = post.videoPath !== undefined && post.videoPath !== null;
    recordTest(3, 'Video path field exists', hasVideoPath, hasVideoPath ? `Path: ${post.videoPath}` : 'Video path is null/undefined');

    // Check image path
    const hasImagePath = post.imagePath !== undefined && post.imagePath !== null;
    recordTest(3, 'Image path field exists', hasImagePath, hasImagePath ? `Path: ${post.imagePath}` : 'Image path is null/undefined');

    // Check content type
    const hasContentType = post.contentType !== undefined;
    recordTest(3, 'Content type field exists', hasContentType, post.contentType);

    logger.info('Asset paths:', {
      videoPath: post.videoPath,
      imagePath: post.imagePath,
      contentType: post.contentType
    });
  } catch (error) {
    recordTest(3, 'Check asset paths stored', false, error.message);
    logger.error('Error checking asset paths:', error);
  }
}

async function step4_ConfirmCaptionAndHashtags(post) {
  logger.info('\n========================================');
  logger.info('Step 4: Confirm caption and hashtags saved');
  logger.info('========================================');

  if (!post) {
    recordTest(4, 'Confirm caption and hashtags', false, 'No post provided (Step 2 failed)');
    return;
  }

  try {
    // Check caption
    const hasCaption = post.caption && post.caption.length > 0;
    recordTest(4, 'Caption saved', hasCaption, hasCaption ? `${post.caption.substring(0, 100)}...` : 'Caption is empty');

    // Check hashtags
    const hasHashtags = post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0;
    recordTest(4, 'Hashtags saved', hasHashtags, hasHashtags ? `${post.hashtags.length} hashtags: ${post.hashtags.join(', ')}` : 'No hashtags');

    // Check hook
    const hasHook = post.hook !== undefined;
    recordTest(4, 'Hook saved', hasHook, post.hook || 'No hook');

    logger.info('Text content:', {
      captionLength: post.caption ? post.caption.length : 0,
      hashtagCount: post.hashtags ? post.hashtags.length : 0,
      hasHook: post.hasHook
    });
  } catch (error) {
    recordTest(4, 'Confirm caption and hashtags', false, error.message);
    logger.error('Error confirming caption and hashtags:', error);
  }
}

async function step5_TestRetrievingFromLibrary(post) {
  logger.info('\n========================================');
  logger.info('Step 5: Test retrieving post from library');
  logger.info('========================================');

  if (!post) {
    recordTest(5, 'Retrieve post from library', false, 'No post provided (Step 2 failed)');
    return;
  }

  try {
    // Test 1: Get all posts
    const allPosts = await MarketingPost.find({});
    recordTest(5, 'Retrieve all posts from library', true, `Found ${allPosts.length} posts in library`);

    // Test 2: Get posts by platform
    const tiktokPosts = await MarketingPost.getByPlatformAndStatus(post.platform, post.status);
    const foundInPlatformQuery = tiktokPosts.some(p => p._id.toString() === post._id.toString());
    recordTest(5, 'Query posts by platform', foundInPlatformQuery, `Found ${tiktokPosts.length} ${post.platform} posts, test post included: ${foundInPlatformQuery}`);

    // Test 3: Get posts by status
    const draftPosts = await MarketingPost.find({ status: post.status });
    const foundInStatusQuery = draftPosts.some(p => p._id.toString() === post._id.toString());
    recordTest(5, 'Query posts by status', foundInStatusQuery, `Found ${draftPosts.length} ${post.status} posts, test post included: ${foundInStatusQuery}`);

    // Test 4: Populate story reference
    const postWithStory = await MarketingPost.findById(post._id).populate('storyId', 'title coverPath spiciness category');
    const hasStoryDetails = postWithStory.storyId !== null && postWithStory.storyId !== undefined;
    recordTest(5, 'Story reference populated', hasStoryDetails, hasStoryDetails ? `Story: ${postWithStory.storyId.title}` : 'Story not populated');

    logger.info('Library retrieval tests completed');
  } catch (error) {
    recordTest(5, 'Retrieve post from library', false, error.message);
    logger.error('Error retrieving from library:', error);
  }
}

async function cleanupTestPost(postId) {
  logger.info('\n========================================');
  logger.info('Cleanup: Removing test post');
  logger.info('========================================');

  if (!postId) {
    logger.info('No post to clean up');
    return;
  }

  try {
    await MarketingPost.findByIdAndDelete(postId);
    logger.info(`Test post ${postId} removed from database`);
  } catch (error) {
    logger.warn('Failed to clean up test post:', error.message);
  }
}

async function printResults() {
  logger.info('\n========================================');
  logger.info('TEST RESULTS SUMMARY');
  logger.info('========================================');

  logger.info(`Total Tests: ${testResults.total}`);
  logger.info(`Passed: ${testResults.passed.length} (${((testResults.passed.length / testResults.total) * 100).toFixed(1)}%)`);
  logger.info(`Failed: ${testResults.failed.length}`);

  if (testResults.failed.length > 0) {
    logger.info('\nFailed Tests:');
    testResults.failed.forEach(({ step, name, details }) => {
      logger.error(`  [Step ${step}] ${name}: ${details}`);
    });
  }

  logger.info('\n========================================');
}

async function main() {
  logger.info('========================================================');
  logger.info('Feature #70: Content Library Storage - Verification Test');
  logger.info('========================================================\n');

  let post = null;
  let postId = null;

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing', {
      serverSelectionTimeoutMS: 5000
    });

    // Step 0: Check MongoDB connection
    const mongoConnected = await checkMongoDBConnection();
    if (!mongoConnected) {
      logger.error('\n❌ MongoDB is not connected. Cannot proceed with tests.');
      logger.error('Please check your MongoDB connection string in the .env file.');
      await printResults();
      process.exit(1);
    }

    // Step 1: Generate content post
    post = await step1_GenerateContentPost();
    postId = post ? post._id : null;

    // Step 2: Verify post saved to database
    post = await step2_VerifyPostSaved(postId);

    // Step 3: Check asset paths
    await step3_CheckAssetPaths(post);

    // Step 4: Confirm caption and hashtags
    await step4_ConfirmCaptionAndHashtags(post);

    // Step 5: Test retrieving from library
    await step5_TestRetrievingFromLibrary(post);

    // Cleanup
    await cleanupTestPost(postId);

    // Print results
    await printResults();

    // Exit with appropriate code
    const exitCode = testResults.failed.length === 0 ? 0 : 1;
    process.exit(exitCode);

  } catch (error) {
    logger.error('\n❌ Test execution failed:', error);
    await cleanupTestPost(postId);
    await printResults();
    process.exit(1);
  }
}

// Run the test
main();
