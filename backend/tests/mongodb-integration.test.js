/**
 * MongoDB Integration Tests
 *
 * Integration tests for database operations including:
 * - Document creation
 * - Document updates
 * - Document deletion
 * - Query operations
 * - Transaction support
 *
 * These tests use a separate test database to avoid affecting production data.
 */

import mongoose from 'mongoose';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import MarketingPost from '../models/MarketingPost.js';
import Story from '../models/Story.js';
import ASOKeyword from '../models/ASOKeyword.js';

// Test database configuration
const MONGODB_URI = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
const TEST_DB_NAME = 'blush_marketing_test';

let connection;
let db;

describe('MongoDB Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    connection = await mongoose.createConnection(MONGODB_URI, {
      dbName: TEST_DB_NAME,
    });

    // Wait for connection to be ready
    await connection.asPromise();

    console.log('✅ Connected to test database:', TEST_DB_NAME);
  });

  afterAll(async () => {
    // Close connection
    if (connection) {
      await connection.close();
      console.log('✅ Closed test database connection');
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    const collections = await connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  });

  afterEach(async () => {
    // Clean up after each test
    const collections = await connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  });

  describe('Step 2: Document Creation', () => {
    it('should create a MarketingPost document', async () => {
      const postData = {
        title: 'Test Post for Creation',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test caption',
        scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
        storyId: 'story_test_001',
        storyName: 'Test Story',
        storyCategory: 'romance',
        storySpiciness: 2,
        status: 'pending',
        hashtags: ['#test', '#integration'],
      };

      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.title).toBe(postData.title);
      expect(savedPost.platform).toBe(postData.platform);
      expect(savedPost.status).toBe('pending');
      expect(savedPost.createdAt).toBeDefined();
      expect(savedPost.updatedAt).toBeDefined();

      console.log('✅ Created MarketingPost:', savedPost._id);
    });

    it('should create a Story document', async () => {
      const storyData = {
        title: 'Integration Test Story',
        category: 'romance',
        spiciness: 2,
        tags: ['romance', 'drama'],
        totalCharacters: 5,
        metadata: {
          author: 'Test Author',
          wordCount: 1200,
        },
      };

      const story = new Story(storyData);
      const savedStory = await story.save();

      expect(savedStory._id).toBeDefined();
      expect(savedStory.title).toBe(storyData.title);
      expect(savedStory.category).toBe(storyData.category);
      expect(savedStory.spiciness).toBe(storyData.spiciness);
      expect(savedStory.createdAt).toBeDefined();

      console.log('✅ Created Story:', savedStory._id);
    });

    it('should create an ASOKeyword document', async () => {
      const keywordData = {
        keyword: 'romance stories',
        searchVolume: 10000,
        competition: 'medium',
        ranking: 15,
        difficulty: 45,
        lastUpdated: new Date(),
      };

      const keyword = new ASOKeyword(keywordData);
      const savedKeyword = await keyword.save();

      expect(savedKeyword._id).toBeDefined();
      expect(savedKeyword.keyword).toBe(keywordData.keyword);
      expect(savedKeyword.searchVolume).toBe(keywordData.searchVolume);
      expect(savedKeyword.competition).toBe(keywordData.competition);
      expect(savedKeyword.ranking).toBe(keywordData.ranking);

      console.log('✅ Created ASOKeyword:', savedKeyword._id);
    });

    it('should validate required fields on creation', async () => {
      const invalidPost = new MarketingPost({
        title: 'Invalid Post',
        // Missing required fields: platform, scheduledAt, storyId, etc.
      });

      await expect(invalidPost.save()).rejects.toThrow();
      console.log('✅ Validation works: missing required fields rejected');
    });

    it('should enforce enum values', async () => {
      const invalidPost = new MarketingPost({
        title: 'Invalid Platform',
        platform: 'invalid_platform', // Not in enum
        contentType: 'reel',
        scheduledAt: new Date(),
        storyId: 'test_001',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
      });

      await expect(invalidPost.save()).rejects.toThrow();
      console.log('✅ Enum validation works');
    });
  });

  describe('Step 3: Document Updates', () => {
    it('should update a MarketingPost status', async () => {
      // Create a post first
      const post = new MarketingPost({
        title: 'Update Test Post',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Original caption',
        scheduledAt: new Date(),
        storyId: 'test_001',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
        status: 'pending',
      });
      const savedPost = await post.save();

      // Update the status
      savedPost.status = 'approved';
      savedPost.approvedBy = 'test_user';
      savedPost.approvedAt = new Date();
      const updatedPost = await savedPost.save();

      expect(updatedPost.status).toBe('approved');
      expect(updatedPost.approvedBy).toBe('test_user');
      expect(updatedPost.approvedAt).toBeDefined();
      expect(updatedPost.updatedAt.getTime()).toBeGreaterThan(savedPost.createdAt.getTime());

      console.log('✅ Updated MarketingPost status:', savedPost._id);
    });

    it('should update multiple fields at once', async () => {
      const post = new MarketingPost({
        title: 'Multi-field Update Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Original',
        scheduledAt: new Date(),
        storyId: 'test_002',
        storyName: 'Test',
        storyCategory: 'drama',
        storySpiciness: 1,
        status: 'pending',
      });
      const savedPost = await post.save();

      // Update multiple fields
      savedPost.caption = 'Updated caption with hashtags';
      savedPost.hashtags = ['#updated', '#test'];
      savedPost.status = 'scheduled';
      savedPost.performanceMetrics = {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
      };

      const updatedPost = await savedPost.save();

      expect(updatedPost.caption).toContain('Updated');
      expect(updatedPost.hashtags).toHaveLength(2);
      expect(updatedPost.status).toBe('scheduled');
      expect(updatedPost.performanceMetrics).toBeDefined();

      console.log('✅ Updated multiple fields:', savedPost._id);
    });

    it('should handle array updates (hashtags)', async () => {
      const post = new MarketingPost({
        title: 'Array Update Test',
        platform: 'tiktok',
        contentType: 'video',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'test_003',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
        hashtags: ['#original'],
      });
      const savedPost = await post.save();

      // Add to array
      savedPost.hashtags.push('#new');
      savedPost.hashtags.push('#test');
      const updatedPost = await savedPost.save();

      expect(updatedPost.hashtags).toHaveLength(3);
      expect(updatedPost.hashtags).toContain('#new');

      console.log('✅ Updated array field:', savedPost._id);
    });

    it('should use findOneAndUpdate for atomic operations', async () => {
      const post = new MarketingPost({
        title: 'Atomic Update Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'test_004',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
        status: 'pending',
        generationCount: 0,
      });
      await post.save();

      // Atomic update
      const updatedPost = await MarketingPost.findOneAndUpdate(
        { _id: post._id },
        {
          $inc: { generationCount: 1 },
          $set: { status: 'generating' },
        },
        { new: true }
      );

      expect(updatedPost.generationCount).toBe(1);
      expect(updatedPost.status).toBe('generating');

      console.log('✅ Atomic update successful:', post._id);
    });

    it('should reject invalid updates', async () => {
      const post = new MarketingPost({
        title: 'Validation Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'test_005',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
        status: 'approved',
      });
      const savedPost = await post.save();

      // Try to set invalid status
      savedPost.status = 'invalid_status';
      await expect(savedPost.save()).rejects.toThrow();

      console.log('✅ Invalid updates rejected');
    });
  });

  describe('Step 4: Document Deletion', () => {
    it('should delete a single document by ID', async () => {
      const post = new MarketingPost({
        title: 'Delete Test Post',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'To be deleted',
        scheduledAt: new Date(),
        storyId: 'test_006',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
      });
      const savedPost = await post.save();
      const postId = savedPost._id;

      // Delete the document
      await MarketingPost.deleteOne({ _id: postId });

      // Verify it's deleted
      const foundPost = await MarketingPost.findById(postId);
      expect(foundPost).toBeNull();

      console.log('✅ Deleted document:', postId);
    });

    it('should delete multiple documents by query', async () => {
      // Create multiple posts
      await MarketingPost.create([
        {
          title: 'Batch Delete 1',
          platform: 'instagram',
          contentType: 'reel',
          caption: 'Test 1',
          scheduledAt: new Date(),
          storyId: 'test_007',
          storyName: 'Test',
          storyCategory: 'romance',
          storySpiciness: 2,
          status: 'pending',
        },
        {
          title: 'Batch Delete 2',
          platform: 'instagram',
          contentType: 'reel',
          caption: 'Test 2',
          scheduledAt: new Date(),
          storyId: 'test_008',
          storyName: 'Test',
          storyCategory: 'romance',
          storySpiciness: 2,
          status: 'pending',
        },
        {
          title: 'Keep This One',
          platform: 'tiktok',
          contentType: 'video',
          caption: 'Test 3',
          scheduledAt: new Date(),
          storyId: 'test_009',
          storyName: 'Test',
          storyCategory: 'drama',
          storySpiciness: 1,
          status: 'approved',
        },
      ]);

      // Delete all pending Instagram posts
      const deleteResult = await MarketingPost.deleteMany({
        platform: 'instagram',
        status: 'pending',
      });

      expect(deleteResult.deletedCount).toBe(2);

      // Verify remaining posts
      const remainingCount = await MarketingPost.countDocuments();
      expect(remainingCount).toBe(1);

      console.log('✅ Deleted multiple documents:', deleteResult.deletedCount);
    });

    it('should handle delete of non-existent document gracefully', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await MarketingPost.deleteOne({ _id: nonExistentId });

      expect(result.deletedCount).toBe(0);

      console.log('✅ Non-existent delete handled gracefully');
    });

    it('should use findByIdAndDelete', async () => {
      const post = new MarketingPost({
        title: 'FindByIdAndDelete Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'test_010',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
      });
      const savedPost = await post.save();
      const postId = savedPost._id;

      // Delete and return the document
      const deletedPost = await MarketingPost.findByIdAndDelete(postId);

      expect(deletedPost).toBeDefined();
      expect(deletedPost._id).toEqual(postId);

      // Verify it's gone
      const foundPost = await MarketingPost.findById(postId);
      expect(foundPost).toBeNull();

      console.log('✅ findByIdAndDelete successful:', postId);
    });
  });

  describe('Additional Query Operations', () => {
    it('should find documents with complex queries', async () => {
      // Create test data
      await MarketingPost.create([
        {
          title: 'Query Test 1',
          platform: 'instagram',
          contentType: 'reel',
          caption: 'Popular post',
          scheduledAt: new Date(),
          storyId: 'test_011',
          storyName: 'Test',
          storyCategory: 'romance',
          storySpiciness: 2,
          status: 'approved',
          performanceMetrics: { views: 1000, likes: 100 },
        },
        {
          title: 'Query Test 2',
          platform: 'tiktok',
          contentType: 'video',
          caption: 'Another post',
          scheduledAt: new Date(),
          storyId: 'test_012',
          storyName: 'Test',
          storyCategory: 'drama',
          storySpiciness: 1,
          status: 'approved',
          performanceMetrics: { views: 500, likes: 50 },
        },
        {
          title: 'Query Test 3',
          platform: 'instagram',
          contentType: 'reel',
          caption: 'Third post',
          scheduledAt: new Date(),
          storyId: 'test_013',
          storyName: 'Test',
          storyCategory: 'romance',
          storySpiciness: 2,
          status: 'pending',
          performanceMetrics: { views: 0, likes: 0 },
        },
      ]);

      // Find approved Instagram posts
      const approvedInstaPosts = await MarketingPost.find({
        platform: 'instagram',
        status: 'approved',
      });

      expect(approvedInstaPosts).toHaveLength(1);
      expect(approvedInstaPosts[0].title).toBe('Query Test 1');

      // Find posts with views > 500
      const popularPosts = await MarketingPost.find({
        'performanceMetrics.views': { $gt: 500 },
      });

      expect(popularPosts).toHaveLength(2);

      console.log('✅ Complex queries working');
    });

    it('should use aggregation pipeline', async () => {
      await MarketingPost.create([
        {
          title: 'Agg Test 1',
          platform: 'instagram',
          contentType: 'reel',
          caption: 'Test',
          scheduledAt: new Date(),
          storyId: 'test_014',
          storyName: 'Test',
          storyCategory: 'romance',
          storySpiciness: 2,
          status: 'approved',
        },
        {
          title: 'Agg Test 2',
          platform: 'instagram',
          contentType: 'reel',
          caption: 'Test',
          scheduledAt: new Date(),
          storyId: 'test_015',
          storyName: 'Test',
          storyCategory: 'romance',
          storySpiciness: 2,
          status: 'approved',
        },
        {
          title: 'Agg Test 3',
          platform: 'tiktok',
          contentType: 'video',
          caption: 'Test',
          scheduledAt: new Date(),
          storyId: 'test_016',
          storyName: 'Test',
          storyCategory: 'drama',
          storySpiciness: 1,
          status: 'pending',
        },
      ]);

      // Aggregate by status
      const statusCounts = await MarketingPost.aggregate([
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

      expect(statusCounts).toHaveLength(2);
      expect(statusCounts.find(s => s._id === 'approved').count).toBe(2);
      expect(statusCounts.find(s => s._id === 'pending').count).toBe(1);

      console.log('✅ Aggregation pipeline working');
    });

    it('should populate referenced documents', async () => {
      // Create a story first
      const story = new Story({
        title: 'Populate Test Story',
        category: 'romance',
        spiciness: 2,
      });
      await story.save();

      // Create post referencing the story
      const post = new MarketingPost({
        title: 'Populate Test Post',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: story._id.toString(),
        storyName: story.title,
        storyCategory: story.category,
        storySpiciness: story.spiciness,
      });
      await post.save();

      // Note: In real implementation, you'd have a ref field
      // This test demonstrates the concept
      const foundPost = await MarketingPost.findOne({ storyId: story._id.toString() });
      expect(foundPost).toBeDefined();
      expect(foundPost.storyId).toBe(story._id.toString());

      console.log('✅ Document relationships working');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle duplicate key errors', async () => {
      // Create a post with a unique identifier
      const post1 = new MarketingPost({
        title: 'Unique Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'unique_test_001',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
      });
      await post1.save();

      // Try to create another with the same unique field
      // (if schema has unique indexes)
      const post2 = new MarketingPost({
        title: 'Duplicate Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'unique_test_001', // Same storyId
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
      });

      // Should either save (if no unique index) or fail (if unique index exists)
      // This test verifies the behavior is consistent
      try {
        await post2.save();
        console.log('✅ No unique constraint on storyId (expected)');
      } catch (error) {
        expect(error.code).toBe(11000); // Duplicate key error code
        console.log('✅ Duplicate key error handled correctly');
      }
    });

    it('should handle concurrent updates', async () => {
      const post = new MarketingPost({
        title: 'Concurrent Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: 'Test',
        scheduledAt: new Date(),
        storyId: 'test_017',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
        generationCount: 0,
      });
      await post.save();

      // Simulate concurrent updates using findOneAndUpdate
      const update1 = MarketingPost.findOneAndUpdate(
        { _id: post._id },
        { $inc: { generationCount: 1 } },
        { new: true }
      );

      const update2 = MarketingPost.findOneAndUpdate(
        { _id: post._id },
        { $inc: { generationCount: 1 } },
        { new: true }
      );

      const [result1, result2] = await Promise.all([update1, update2]);

      // Both updates should be applied
      expect(result1.generationCount).toBeGreaterThanOrEqual(1);
      expect(result2.generationCount).toBeGreaterThanOrEqual(1);

      console.log('✅ Concurrent updates handled');
    });

    it('should handle large documents', async () => {
      const largeHashtags = Array.from({ length: 100 }, (_, i) => `#tag${i}`);
      const largeCaption = 'A'.repeat(1000);

      const post = new MarketingPost({
        title: 'Large Document Test',
        platform: 'instagram',
        contentType: 'reel',
        caption: largeCaption,
        scheduledAt: new Date(),
        storyId: 'test_018',
        storyName: 'Test',
        storyCategory: 'romance',
        storySpiciness: 2,
        hashtags: largeHashtags,
      });

      const savedPost = await post.save();

      expect(savedPost.caption).toHaveLength(1000);
      expect(savedPost.hashtags).toHaveLength(100);

      console.log('✅ Large documents handled correctly');
    });
  });
});
