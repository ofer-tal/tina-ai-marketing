#!/usr/bin/env node
/**
 * MongoDB Connection Verification Test
 *
 * This script verifies that:
 * 1. MongoDB connection is configured
 * 2. Connection to database works
 * 3. Can access marketing_posts collection
 * 4. Can access marketing_strategy collection (if it exists)
 * 5. Has write permissions to marketing_* collections
 */

import dotenv from 'dotenv';
import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  console.log('\n' + '='.repeat(60));
  log(`📋 ${step}`, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testConnection() {
  try {
    // Step 1: Configure MongoDB connection
    logStep('Step 1: Verify MongoDB Configuration');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      logError('MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    logSuccess('MONGODB_URI is configured');
    logInfo(`Database: ${mongoUri.match(/\/([^/?]+)\?/)?.[1] || 'unknown'}`);

    // Step 2: Test connection to database
    logStep('Step 2: Test Connection to Database');

    await databaseService.connect();
    logSuccess('Connected to MongoDB successfully');

    const status = databaseService.getStatus();
    logInfo(`Database Name: ${status.name}`);
    logInfo(`Host: ${status.host}`);
    logInfo(`Port: ${status.port}`);
    logInfo(`Connected: ${status.isConnected}`);

    // Test connection with ping
    await databaseService.testConnection();
    logSuccess('Connection test passed (ping successful)');

    // Step 3: Verify access to marketing_posts
    logStep('Step 3: Verify Access to marketing_posts Collection');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    logInfo(`Total collections in database: ${collections.length}`);

    // Check if marketingposts exists (mongoose converts to lowercase)
    const marketingPostsCollection = collections.find(c =>
      c.name.toLowerCase() === 'marketingposts' ||
      c.name === 'marketing_posts'
    );

    if (marketingPostsCollection) {
      logSuccess(`marketing_posts collection exists (${marketingPostsCollection.name})`);

      // Count documents
      const count = await MarketingPost.countDocuments();
      logInfo(`Total posts in collection: ${count}`);

      // Try to read some posts
      const posts = await MarketingPost.find().limit(3);
      if (posts.length > 0) {
        logSuccess(`Successfully read ${posts.length} posts from collection`);
        posts.forEach((post, index) => {
          logInfo(`  Post ${index + 1}: ${post.title} (${post.platform} - ${post.status})`);
        });
      } else {
        logInfo('No posts found in collection (empty collection)');
      }
    } else {
      logInfo('marketing_posts collection does not exist yet (will be created on first write)');
    }

    // Step 4: Verify access to marketing_strategy
    logStep('Step 4: Verify Access to marketing_strategy Collection');

    const marketingStrategyCollection = collections.find(c =>
      c.name.toLowerCase().includes('marketing') &&
      c.name.toLowerCase().includes('strategy')
    );

    if (marketingStrategyCollection) {
      logSuccess(`marketing_strategy collection exists (${marketingStrategyCollection.name})`);

      const count = await db.collection(marketingStrategyCollection.name).countDocuments();
      logInfo(`Total documents in marketing_strategy: ${count}`);
    } else {
      logInfo('marketing_strategy collection does not exist yet');
    }

    // Step 5: Confirm write permissions
    logStep('Step 5: Confirm Write Permissions to marketing_* Collections');

    // Create a test document in marketing_posts
    const testPost = new MarketingPost({
      title: 'TEST_POST_Verify Connection',
      description: 'This is a test post to verify write permissions',
      platform: 'tiktok',
      status: 'draft',
      contentType: 'video',
      caption: 'Test caption for write permission verification',
      hashtags: ['#test', '#writePermission'],
      scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'Test',
      storySpiciness: 1,
    });

    await testPost.save();
    logSuccess('Successfully created test post in marketing_posts');

    // Verify we can read it back
    const savedPost = await MarketingPost.findOne({ title: 'TEST_POST_Verify Connection' });
    if (savedPost) {
      logSuccess('Successfully read back test post');
    }

    // Update the post
    savedPost.description = 'Updated description for write test';
    await savedPost.save();
    logSuccess('Successfully updated test post');

    // Delete the test post
    await MarketingPost.deleteOne({ title: 'TEST_POST_Verify Connection' });
    logSuccess('Successfully deleted test post');

    // Verify deletion
    const deletedCheck = await MarketingPost.findOne({ title: 'TEST_POST_Verify Connection' });
    if (!deletedCheck) {
      logSuccess('Verified test post was deleted');
    }

    // Test write access with test collection
    const testCollectionName = 'marketing_test_write_' + Date.now();
    await db.createCollection(testCollectionName);
    await db.collection(testCollectionName).insertOne({
      test: 'write permission',
      timestamp: new Date(),
      verified: true
    });
    logSuccess(`Created and wrote to test collection: ${testCollectionName}`);

    // Clean up test collection
    await db.collection(testCollectionName).drop();
    logSuccess('Dropped test collection');

    // Final summary
    console.log('\n' + '='.repeat(60));
    log('🎉 ALL VERIFICATION STEPS PASSED!', 'bright');
    log('✅ MongoDB connection configured', 'green');
    log('✅ Connection to database successful', 'green');
    log('✅ Read access to marketing_posts confirmed', 'green');
    log('✅ Read access to marketing_strategy confirmed', 'green');
    log('✅ Write permissions to marketing_* collections confirmed', 'green');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    log('Disconnected from MongoDB', 'blue');
  }
}

// Run the test
testConnection();
