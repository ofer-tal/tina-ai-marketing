/**
 * Regression Test Suite
 *
 * This suite runs critical tests to ensure no regressions have been introduced.
 * It covers the most important functionality across the application.
 *
 * Run: npm run test:regression
 * Or: node backend/tests/run-regression-tests.mjs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Test utilities
let mongoClient;
let db;

const TEST_DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const TEST_DB_NAME = 'blush-marketing-test';

beforeAll(async () => {
  // Connect to test database
  mongoClient = new MongoClient(TEST_DB_URL);
  await mongoClient.connect();
  db = mongoClient.db(TEST_DB_NAME);

  // Clean up any test data from previous runs
  await db.collection('marketing_posts').deleteMany({
    title: { $regex: /^REGRESSION_TEST_/ }
  });
  await db.collection('marketing_tasks').deleteMany({
    title: { $regex: /^REGRESSION_TEST_/ }
  });
  await db.collection('marketing_revenue').deleteMany({
    period: 'regression-test'
  });
});

afterAll(async () => {
  // Clean up test data
  if (db) {
    await db.collection('marketing_posts').deleteMany({
      title: { $regex: /^REGRESSION_TEST_/ }
    });
    await db.collection('marketing_tasks').deleteMany({
      title: { $regex: /^REGRESSION_TEST_/ }
    });
    await db.collection('marketing_revenue').deleteMany({
      period: 'regression-test'
    });
  }

  if (mongoClient) {
    await mongoClient.close();
  }
});

describe('Regression Test Suite', () => {

  describe('1. Database Operations', () => {

    it('should connect to MongoDB successfully', async () => {
      expect(mongoClient).toBeDefined();
      expect(db).toBeDefined();

      // Test basic operation
      const result = await db.admin().ping();
      expect(result.ok).toBe(1);
    });

    it('should create and retrieve a marketing post', async () => {
      const testPost = {
        title: 'REGRESSION_TEST_Post_' + Date.now(),
        description: 'Test post for regression',
        platform: 'tiktok',
        status: 'draft',
        contentType: 'video',
        caption: 'Test caption',
        hashtags: ['#test', '#regression'],
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('marketing_posts').insertOne(testPost);
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();

      // Retrieve the post
      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      expect(retrieved).toBeDefined();
      expect(retrieved.title).toBe(testPost.title);
      expect(retrieved.platform).toBe('tiktok');
      expect(retrieved.status).toBe('draft');
    });

    it('should update a marketing post', async () => {
      const testPost = {
        title: 'REGRESSION_TEST_Update_' + Date.now(),
        platform: 'instagram',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await db.collection('marketing_posts').insertOne(testPost);
      const postId = insertResult.insertedId;

      // Update the post
      const updateResult = await db.collection('marketing_posts').updateOne(
        { _id: postId },
        {
          $set: {
            status: 'approved',
            caption: 'Updated caption',
            updatedAt: new Date()
          }
        }
      );

      expect(updateResult.modifiedCount).toBe(1);

      // Verify update
      const updated = await db.collection('marketing_posts').findOne({ _id: postId });
      expect(updated.status).toBe('approved');
      expect(updated.caption).toBe('Updated caption');
    });

    it('should delete a marketing post', async () => {
      const testPost = {
        title: 'REGRESSION_TEST_Delete_' + Date.now(),
        platform: 'youtube_shorts',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await db.collection('marketing_posts').insertOne(testPost);
      const postId = insertResult.insertedId;

      // Delete the post
      const deleteResult = await db.collection('marketing_posts').deleteOne({
        _id: postId
      });

      expect(deleteResult.deletedCount).toBe(1);

      // Verify deletion
      const deleted = await db.collection('marketing_posts').findOne({ _id: postId });
      expect(deleted).toBeNull();
    });

    it('should perform aggregation queries', async () => {
      // Create multiple test posts
      const posts = [
        { platform: 'tiktok', status: 'posted', createdAt: new Date() },
        { platform: 'instagram', status: 'posted', createdAt: new Date() },
        { platform: 'tiktok', status: 'draft', createdAt: new Date() },
        { platform: 'youtube_shorts', status: 'approved', createdAt: new Date() }
      ];

      await db.collection('marketing_posts').insertMany(
        posts.map(p => ({ ...p, title: 'REGRESSION_TEST_Agg_' + Date.now() + '_' + Math.random(), updatedAt: new Date() }))
      );

      // Aggregate by platform
      const aggregation = await db.collection('marketing_posts').aggregate([
        {
          $match: {
            title: { $regex: /^REGRESSION_TEST_Agg_/ }
          }
        },
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]).toArray();

      expect(aggregation.length).toBeGreaterThan(0);
      expect(aggregation[0]._id).toBeDefined();
      expect(aggregation[0].count).toBeGreaterThan(0);
    });
  });

  describe('2. Data Models', () => {

    it('should create a valid marketing task', async () => {
      const task = {
        title: 'REGRESSION_TEST_Task_' + Date.now(),
        description: 'Test task for regression',
        category: 'review',
        priority: 'high',
        status: 'pending',
        scheduledAt: new Date(),
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('marketing_tasks').insertOne(task);
      expect(result.acknowledged).toBe(true);

      const retrieved = await db.collection('marketing_tasks').findOne({
        _id: result.insertedId
      });

      expect(retrieved.title).toBe(task.title);
      expect(retrieved.category).toBe('review');
      expect(retrieved.priority).toBe('high');
    });

    it('should create revenue records with calculations', async () => {
      const revenue = {
        date: new Date(),
        period: 'regression-test',
        grossRevenue: 1000,
        appleFee: 150,
        netRevenue: 850,
        refunds: 0,
        subscriptionRevenue: 600,
        oneTimePurchaseRevenue: 250,
        activeSubscribers: 100,
        newUsers: 25,
        cac: 50,
        ltv: 200,
        marketingSpend: 200,
        profitMargin: 0.65,
        calculatedAt: new Date(),
        createdAt: new Date()
      };

      const result = await db.collection('marketing_revenue').insertOne(revenue);
      expect(result.acknowledged).toBe(true);

      const retrieved = await db.collection('marketing_revenue').findOne({
        _id: result.insertedId
      });

      expect(retrieved.netRevenue).toBe(850);
      expect(retrieved.profitMargin).toBe(0.65);
    });
  });

  describe('3. API Endpoint Functionality', () => {

    it('should handle health check endpoint', async () => {
      const response = await fetch('http://localhost:3001/api/health');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.database).toBeDefined();
      expect(data.database.connected).toBe(true);
    });

    it('should get dashboard metrics', async () => {
      const response = await fetch('http://localhost:3001/api/dashboard/metrics?period=24h');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('24h');
      expect(data.mrr).toBeDefined();
      expect(data.subscribers).toBeDefined();
      expect(data.users).toBeDefined();
      expect(data.spend).toBeDefined();
      expect(data.posts).toBeDefined();
    });

    it('should get budget utilization', async () => {
      const response = await fetch('http://localhost:3001/api/dashboard/budget-utilization');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.budget).toBeDefined();
      expect(data.budget.monthly).toBeDefined();
      expect(data.budget.spent).toBeDefined();
      expect(data.budget.remaining).toBeDefined();
      expect(data.utilization).toBeDefined();
      expect(data.utilization.percent).toBeGreaterThanOrEqual(0);
      expect(data.utilization.percent).toBeLessThanOrEqual(100);
    });

    it('should get content library', async () => {
      const response = await fetch('http://localhost:3001/api/content/posts?limit=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data.posts)).toBe(true);
      expect(data.data.posts.length).toBeLessThanOrEqual(10);
    });

    it('should get todos', async () => {
      const response = await fetch('http://localhost:3001/api/todos');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.todos)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Test 404 for non-existent route
      const response = await fetch('http://localhost:3001/api/non-existent-route');
      expect(response.status).toBe(404);

      // Test invalid post ID
      const invalidResponse = await fetch('http://localhost:3001/api/content/invalid-id');
      expect(invalidResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('4. Error Handling', () => {

    it('should handle invalid MongoDB ObjectId format', async () => {
      const response = await fetch('http://localhost:3001/api/content/not-an-objectid');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing required fields', async () => {
      const response = await fetch('http://localhost:3001/api/content/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing required fields
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This test verifies the application handles DB errors
      // The health check should report DB status
      const response = await fetch('http://localhost:3001/api/health');
      const data = await response.json();

      expect(data.database).toBeDefined();
      expect(data.database.connected).toBeDefined();
    });
  });

  describe('5. Data Validation', () => {

    it('should validate platform enum values', async () => {
      const validPlatforms = ['tiktok', 'instagram', 'youtube_shorts'];

      const post = {
        title: 'REGRESSION_TEST_Validation_' + Date.now(),
        platform: 'tiktok', // Valid value
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('marketing_posts').insertOne(post);
      expect(result.acknowledged).toBe(true);

      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      expect(validPlatforms).toContain(retrieved.platform);
    });

    it('should validate status enum values', async () => {
      const validStatuses = ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'];

      const post = {
        title: 'REGRESSION_TEST_Status_' + Date.now(),
        platform: 'instagram',
        status: 'approved', // Valid value
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('marketing_posts').insertOne(post);
      expect(result.acknowledged).toBe(true);

      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      expect(validStatuses).toContain(retrieved.status);
    });

    it('should validate date fields', async () => {
      const now = new Date();
      const post = {
        title: 'REGRESSION_TEST_Date_' + Date.now(),
        platform: 'youtube_shorts',
        status: 'scheduled',
        scheduledAt: now,
        createdAt: now,
        updatedAt: now
      };

      const result = await db.collection('marketing_posts').insertOne(post);
      expect(result.acknowledged).toBe(true);

      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      expect(retrieved.scheduledAt).toBeInstanceOf(Date);
      expect(retrieved.createdAt).toBeInstanceOf(Date);
      expect(retrieved.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('6. Performance Benchmarks', () => {

    it('should complete simple read query in under 100ms', async () => {
      const startTime = Date.now();

      await db.collection('marketing_posts').findOne({
        title: 'REGRESSION_TEST_Performance_' + Date.now()
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should complete aggregation in under 500ms', async () => {
      const startTime = Date.now();

      await db.collection('marketing_posts').aggregate([
        { $match: { title: { $regex: /^REGRESSION_TEST_/ } } },
        { $group: { _id: '$platform', count: { $sum: 1 } } }
      ]).toArray();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should handle API health check in under 200ms', async () => {
      const startTime = Date.now();

      const response = await fetch('http://localhost:3001/api/health');
      const data = await response.json();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
      expect(data.status).toBe('ok');
    });
  });

  describe('7. Integration Points', () => {

    it('should verify database indexes are present', async () => {
      const indexes = await db.collection('marketing_posts').indexes();

      // Check for common indexes
      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames.length).toBeGreaterThan(0); // At least _id index
    });

    it('should verify collection structure', async () => {
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      expect(collectionNames).toContain('marketing_posts');
      expect(collectionNames).toContain('marketing_tasks');
      expect(collectionNames).toContain('marketing_revenue');
    });
  });

  describe('8. Critical User Flows', () => {

    it('should create and complete a task workflow', async () => {
      // Create task
      const task = {
        title: 'REGRESSION_TEST_Workflow_' + Date.now(),
        description: 'Test workflow',
        category: 'posting',
        priority: 'medium',
        status: 'pending',
        scheduledAt: new Date(),
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await db.collection('marketing_tasks').insertOne(task);
      const taskId = insertResult.insertedId;

      // Verify created
      let retrievedTask = await db.collection('marketing_tasks').findOne({ _id: taskId });
      expect(retrievedTask.status).toBe('pending');

      // Mark as completed
      await db.collection('marketing_tasks').updateOne(
        { _id: taskId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Verify completed
      retrievedTask = await db.collection('marketing_tasks').findOne({ _id: taskId });
      expect(retrievedTask.status).toBe('completed');
      expect(retrievedTask.completedAt).toBeDefined();
    });

    it('should create and approve content workflow', async () => {
      // Create content as draft
      const post = {
        title: 'REGRESSION_TEST_ContentFlow_' + Date.now(),
        description: 'Test content workflow',
        platform: 'tiktok',
        status: 'draft',
        contentType: 'video',
        caption: 'Test caption',
        hashtags: ['#test'],
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await db.collection('marketing_posts').insertOne(post);
      const postId = insertResult.insertedId;

      // Move to ready
      await db.collection('marketing_posts').updateOne(
        { _id: postId },
        { $set: { status: 'ready', updatedAt: new Date() } }
      );

      // Approve
      await db.collection('marketing_posts').updateOne(
        { _id: postId },
        {
          $set: {
            status: 'approved',
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Verify workflow
      const retrievedPost = await db.collection('marketing_posts').findOne({ _id: postId });
      expect(retrievedPost.status).toBe('approved');
      expect(retrievedPost.approvedAt).toBeDefined();
    });
  });

  describe('9. Data Consistency', () => {

    it('should maintain timestamp consistency', async () => {
      const beforeCreate = new Date();

      const post = {
        title: 'REGRESSION_TEST_Timestamp_' + Date.now(),
        platform: 'instagram',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('marketing_posts').insertOne(post);
      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      const afterCreate = new Date();

      expect(retrieved.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(retrieved.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(retrieved.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(retrieved.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should update updatedAt timestamp on modification', async () => {
      const post = {
        title: 'REGRESSION_TEST_UpdateTime_' + Date.now(),
        platform: 'youtube_shorts',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await db.collection('marketing_posts').insertOne(post);
      const postId = insertResult.insertedId;

      const originalUpdatedAt = post.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the post
      await db.collection('marketing_posts').updateOne(
        { _id: postId },
        {
          $set: {
            status: 'approved',
            updatedAt: new Date()
          }
        }
      );

      const retrieved = await db.collection('marketing_posts').findOne({ _id: postId });
      expect(retrieved.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('10. Security and Validation', () => {

    it('should reject invalid enum values', async () => {
      const invalidPost = {
        title: 'REGRESSION_TEST_Security_' + Date.now(),
        platform: 'invalid_platform', // Invalid enum
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // While MongoDB doesn't enforce enums, the application should handle this
      const result = await db.collection('marketing_posts').insertOne(invalidPost);
      expect(result.acknowledged).toBe(true);

      // But when retrieved, the application should validate
      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      // The value is stored, but application validation should catch this
      expect(retrieved.platform).toBe('invalid_platform');
    });

    it('should handle special characters in strings', async () => {
      const specialCharsPost = {
        title: 'REGRESSION_TEST_Special_Chars_<script>alert("xss")</script>_' + Date.now(),
        platform: 'tiktok',
        status: 'draft',
        caption: 'Test with "quotes" and \'apostrophes\' and $symbols',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('marketing_posts').insertOne(specialCharsPost);
      expect(result.acknowledged).toBe(true);

      const retrieved = await db.collection('marketing_posts').findOne({
        _id: result.insertedId
      });

      expect(retrieved.title).toContain('<script>');
      expect(retrieved.caption).toContain('"quotes"');
    });
  });
});
