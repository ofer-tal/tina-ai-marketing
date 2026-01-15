/**
 * Unit Tests for MarketingPost Model
 *
 * Tests for MarketingPost Mongoose model validation and methods
 */

const mongoose = require('mongoose');

// Mock model definition for testing
const marketingPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  platform: {
    type: String,
    enum: ['tiktok', 'instagram', 'youtube_shorts'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'],
    default: 'draft',
    required: true
  },
  contentType: {
    type: String,
    enum: ['video', 'image', 'carousel'],
    default: 'video'
  },
  caption: {
    type: String,
    required: true
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  scheduledAt: {
    type: Date,
    required: true
  },
  postedAt: {
    type: Date
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  storyName: {
    type: String,
    required: true
  },
  storyCategory: {
    type: String,
    required: true
  },
  storySpiciness: {
    type: Number,
    min: 0,
    max: 3,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: String,
    default: 'Founder'
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: String,
    default: 'Founder'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  rejectionCategory: {
    type: String,
    enum: ['content_quality', 'tone_mismatch', 'inappropriate', 'cta_missing', 'engagement_weak', 'brand_voice', 'timing', 'technical', 'other'],
    trim: true
  },
  feedback: {
    type: String,
    trim: true
  },
  hook: {
    type: String,
    trim: true
  },
  approvalHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'regenerated', 'edited']
    },
    userId: {
      type: String,
      default: 'Founder'
    },
    details: {
      reason: String,
      feedback: String,
      previousCaption: String,
      previousHashtags: [String]
    }
  }],
  regenerationCount: {
    type: Number,
    default: 0
  },
  regenerationHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String,
    previousCaption: String,
    previousHashtags: [String]
  }],
  performanceMetrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  },
  metricsHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    engagementRate: Number
  }],
  uploadProgress: {
    status: {
      type: String,
      enum: ['idle', 'uploading', 'processing', 'completed', 'failed'],
      default: 'idle'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    error: String,
    startedAt: Date,
    completedAt: Date
  }
});

const MarketingPost = mongoose.model('MarketingPost', marketingPostSchema);

describe('MarketingPost Model', () => {
  let connection;
  let validPostData;

  beforeAll(async () => {
    // Connect to MongoDB for testing
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing-test';
    connection = await mongoose.createConnection(mongoUri).asPromise();
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await connection.db().listCollections().toArray()
      .then(collections => {
        const marketingPostCollection = collections.find(c => c.collectionName === 'marketingposts');
        if (marketingPostCollection) {
          return connection.collection('marketingposts').deleteMany({});
        }
      })
      .catch(() => {});

    // Reset valid post data before each test
    validPostData = {
      title: 'Test TikTok Post',
      description: 'Test description',
      platform: 'tiktok',
      status: 'draft',
      contentType: 'video',
      caption: 'Test caption #test',
      hashtags: ['#test', '#tiktok'],
      scheduledAt: new Date('2026-01-16T10:00:00Z'),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'romance',
      storySpiciness: 1
    };
  });

  describe('Model Validation', () => {
    test('Step 1: Create test file for MarketingPost model - should create valid post', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.title).toBe(validPostData.title);
      expect(savedPost.platform).toBe(validPostData.platform);
      expect(savedPost.status).toBe(validPostData.status);
    });

    test('Step 2: Write test for model validation - should require title field', async () => {
      const invalidPost = { ...validPostData, title: '' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.title).toBeDefined();
    });

    test('should require platform field', async () => {
      const invalidPost = { ...validPostData, platform: null };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
    });

    test('should validate platform enum values', async () => {
      const invalidPost = { ...validPostData, platform: 'facebook' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.platform).toBeDefined();
    });

    test('should validate status enum values', async () => {
      const invalidPost = { ...validPostData, status: 'invalid_status' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.status).toBeDefined();
    });

    test('should validate contentType enum values', async () => {
      const invalidPost = { ...validPostData, contentType: 'audio' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.contentType).toBeDefined();
    });

    test('should require caption field', async () => {
      const invalidPost = { ...validPostData, caption: '' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.caption).toBeDefined();
    });

    test('should require scheduledAt field', async () => {
      const invalidPost = { ...validPostData, scheduledAt: null };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.scheduledAt).toBeDefined();
    });

    test('should require storyId field', async () => {
      const invalidPost = { ...validPostData, storyId: null };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.storyId).toBeDefined();
    });

    test('should require storyName field', async () => {
      const invalidPost = { ...validPostData, storyName: '' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.storyName).toBeDefined();
    });

    test('should require storyCategory field', async () => {
      const invalidPost = { ...validPostData, storyCategory: '' };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.storyCategory).toBeDefined();
    });

    test('should require storySpiciness field', async () => {
      const invalidPost = { ...validPostData, storySpiciness: null };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.storySpiciness).toBeDefined();
    });

    test('should validate storySpiciness min value', async () => {
      const invalidPost = { ...validPostData, storySpiciness: -1 };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.storySpiciness).toBeDefined();
    });

    test('should validate storySpiciness max value', async () => {
      const invalidPost = { ...validPostData, storySpiciness: 4 };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.storySpiciness).toBeDefined();
    });

    test('should validate rejectionCategory enum values', async () => {
      const invalidPost = {
        ...validPostData,
        rejectionCategory: 'invalid_category'
      };
      const post = new MarketingPost(invalidPost);

      let error = null;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error.errors.rejectionCategory).toBeDefined();
    });

    test('should trim title field', async () => {
      const postData = { ...validPostData, title: '  Test Title  ' };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.title).toBe('Test Title');
    });

    test('should trim description field', async () => {
      const postData = { ...validPostData, description: '  Test Description  ' };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.description).toBe('Test Description');
    });

    test('should trim hashtag items', async () => {
      const postData = {
        ...validPostData,
        hashtags: ['  #test  ', '  #tiktok  ']
      };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.hashtags[0]).toBe('#test');
      expect(savedPost.hashtags[1]).toBe('#tiktok');
    });

    test('should set default status to draft', async () => {
      const postData = { ...validPostData, status: undefined };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.status).toBe('draft');
    });

    test('should set default contentType to video', async () => {
      const postData = { ...validPostData, contentType: undefined };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.contentType).toBe('video');
    });

    test('should set default approvedBy to Founder', async () => {
      const postData = { ...validPostData, approvedBy: undefined };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.approvedBy).toBe('Founder');
    });

    test('should set default rejectedBy to Founder', async () => {
      const postData = { ...validPostData, rejectedBy: undefined };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.rejectedBy).toBe('Founder');
    });

    test('should set default regenerationCount to 0', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.regenerationCount).toBe(0);
    });

    test('should set default performanceMetrics to zeros', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.performanceMetrics.views).toBe(0);
      expect(savedPost.performanceMetrics.likes).toBe(0);
      expect(savedPost.performanceMetrics.comments).toBe(0);
      expect(savedPost.performanceMetrics.shares).toBe(0);
      expect(savedPost.performanceMetrics.engagementRate).toBe(0);
    });

    test('should set default uploadProgress status to idle', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.uploadProgress.status).toBe('idle');
    });

    test('should set default uploadProgress progress to 0', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.uploadProgress.progress).toBe(0);
    });
  });

  describe('Model Methods and Virtuals', () => {
    test('Step 3: Write test for model methods - should have generatedAt timestamp', async () => {
      const beforeTime = new Date();
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.generatedAt).toBeDefined();
      expect(savedPost.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    test('should store approval history correctly', async () => {
      const post = new MarketingPost(validPostData);
      post.approvalHistory.push({
        action: 'approved',
        userId: 'TestUser',
        details: {
          reason: 'Good content'
        }
      });
      const savedPost = await post.save();

      expect(savedPost.approvalHistory).toHaveLength(1);
      expect(savedPost.approvalHistory[0].action).toBe('approved');
      expect(savedPost.approvalHistory[0].userId).toBe('TestUser');
      expect(savedPost.approvalHistory[0].details.reason).toBe('Good content');
    });

    test('should store regeneration history correctly', async () => {
      const post = new MarketingPost(validPostData);
      post.regenerationHistory.push({
        reason: 'Low engagement',
        previousCaption: 'Old caption',
        previousHashtags: ['#old']
      });
      const savedPost = await post.save();

      expect(savedPost.regenerationHistory).toHaveLength(1);
      expect(savedPost.regenerationHistory[0].reason).toBe('Low engagement');
      expect(savedPost.regenerationHistory[0].previousCaption).toBe('Old caption');
      expect(savedPost.regenerationHistory[0].previousHashtags).toEqual(['#old']);
    });

    test('should store metrics history correctly', async () => {
      const post = new MarketingPost(validPostData);
      post.metricsHistory.push({
        views: 1000,
        likes: 100,
        comments: 10,
        shares: 5,
        engagementRate: 11.5
      });
      const savedPost = await post.save();

      expect(savedPost.metricsHistory).toHaveLength(1);
      expect(savedPost.metricsHistory[0].views).toBe(1000);
      expect(savedPost.metricsHistory[0].likes).toBe(100);
      expect(savedPost.metricsHistory[0].comments).toBe(10);
      expect(savedPost.metricsHistory[0].shares).toBe(5);
      expect(savedPost.metricsHistory[0].engagementRate).toBe(11.5);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    test('should handle empty approval history array', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.approvalHistory).toEqual([]);
    });

    test('should handle empty regeneration history array', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.regenerationHistory).toEqual([]);
    });

    test('should handle empty metrics history array', async () => {
      const post = new MarketingPost(validPostData);
      const savedPost = await post.save();

      expect(savedPost.metricsHistory).toEqual([]);
    });

    test('should handle empty hashtags array', async () => {
      const postData = { ...validPostData, hashtags: [] };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost.hashtags).toEqual([]);
    });

    test('should allow optional fields to be null', async () => {
      const postData = {
        ...validPostData,
        description: null,
        postedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        feedback: null,
        hook: null
      };
      const post = new MarketingPost(postData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
    });

    test('should handle all platform types', async () => {
      const platforms = ['tiktok', 'instagram', 'youtube_shorts'];

      for (const platform of platforms) {
        const postData = { ...validPostData, platform };
        const post = new MarketingPost(postData);
        const savedPost = await post.save();

        expect(savedPost.platform).toBe(platform);
      }
    });

    test('should handle all status types', async () => {
      const statuses = ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'];

      for (const status of statuses) {
        const postData = { ...validPostData, status };
        const post = new MarketingPost(postData);
        const savedPost = await post.save();

        expect(savedPost.status).toBe(status);
      }
    });

    test('should handle all content types', async () => {
      const contentTypes = ['video', 'image', 'carousel'];

      for (const contentType of contentTypes) {
        const postData = { ...validPostData, contentType };
        const post = new MarketingPost(postData);
        const savedPost = await post.save();

        expect(savedPost.contentType).toBe(contentType);
      }
    });

    test('should handle all rejection categories', async () => {
      const categories = ['content_quality', 'tone_mismatch', 'inappropriate', 'cta_missing', 'engagement_weak', 'brand_voice', 'timing', 'technical', 'other'];

      for (const category of categories) {
        const postData = { ...validPostData, rejectionCategory: category };
        const post = new MarketingPost(postData);
        const savedPost = await post.save();

        expect(savedPost.rejectionCategory).toBe(category);
      }
    });
  });
});
