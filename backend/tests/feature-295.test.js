import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import MarketingPost from '../models/MarketingPost.js';
import postMonitoringService from '../services/postMonitoringService.js';

describe('Feature #295: Post failure detection and alerting', () => {

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing');
    }
  });

  afterAll(async () => {
    await MarketingPost.deleteMany({
      title: { $regex: 'TEST_295_' }
    });
    await mongoose.connection.collection('marketing_tasks').deleteMany({
      title: { $regex: 'TEST_295_|Retry post: TEST_295_' }
    });
  });

  beforeEach(async () => {
    await MarketingPost.deleteMany({
      title: { $regex: 'TEST_295_' }
    });
    await mongoose.connection.collection('marketing_tasks').deleteMany({
      title: { $regex: 'TEST_295_|Retry post: TEST_295_' }
    });
  });

  it('Step 1: Post API call fails - should allow creating failed posts', async () => {
    const testPost = await MarketingPost.create({
      title: 'TEST_295_Failed Post',
      description: 'Test post that failed during API call',
      platform: 'tiktok',
      status: 'failed',
      contentType: 'video',
      caption: 'Test caption for failed post',
      hashtags: ['#test', '#failed'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'romance',
      storySpiciness: 1,
      error: 'API call failed: Connection timeout',
      failedAt: new Date(),
      retryCount: 0
    });

    expect(testPost.status).toBe('failed');
    expect(testPost.error).toBeTruthy();
    expect(testPost.failedAt).toBeTruthy();
    expect(testPost.retryCount).toBe(0);
  });

  it('Step 2: Detect failure in monitoring - should identify stuck posts', async () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    const stuckPost = await MarketingPost.create({
      title: 'TEST_295_Stuck Post',
      description: 'Test post that is stuck during upload',
      platform: 'instagram',
      status: 'posting',
      contentType: 'video',
      caption: 'Test caption for stuck post',
      hashtags: ['#test', '#stuck'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'romance',
      storySpiciness: 1,
      uploadProgress: {
        status: 'uploading',
        progress: 45,
        stage: 'Uploading video',
        startedAt: sixMinutesAgo
      },
      createdAt: sixMinutesAgo,
      updatedAt: sixMinutesAgo
    });

    await postMonitoringService.triggerCheck();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const postWithAlerts = await MarketingPost.findById(stuckPost._id);

    expect(stuckPost.status).toBe('posting');
    expect(stuckPost.uploadProgress.status).toBe('uploading');
  });

  it('Step 3: Update post status to failed - should mark timed-out posts as failed', async () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

    const timeoutPost = await MarketingPost.create({
      title: 'TEST_295_Timeout Post',
      description: 'Test post that timed out during posting',
      platform: 'youtube_shorts',
      status: 'posting',
      contentType: 'video',
      caption: 'Test caption for timeout post',
      hashtags: ['#test', '#timeout'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'romance',
      storySpiciness: 1,
      uploadProgress: {
        status: 'uploading',
        progress: 25,
        stage: 'Initializing upload',
        startedAt: elevenMinutesAgo
      },
      createdAt: elevenMinutesAgo,
      updatedAt: elevenMinutesAgo
    });

    await postMonitoringService.triggerCheck();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const failedPost = await MarketingPost.findById(timeoutPost._id);

    expect(failedPost.status).toBe('failed');
    expect(failedPost.error).toBeTruthy();
    expect(failedPost.failedAt).toBeTruthy();
    expect(failedPost.uploadProgress?.status).toBe('failed');
  });

  it('Step 4: Send alert notification - should log alerts with user-friendly messages', async () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

    const timeoutPost = await MarketingPost.create({
      title: 'TEST_295_Alert Post',
      description: 'Test post for alert verification',
      platform: 'tiktok',
      status: 'posting',
      contentType: 'video',
      caption: 'Test caption',
      hashtags: ['#test'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'romance',
      storySpiciness: 1,
      uploadProgress: {
        status: 'uploading',
        progress: 25,
        startedAt: elevenMinutesAgo
      },
      createdAt: elevenMinutesAgo,
      updatedAt: elevenMinutesAgo
    });

    await postMonitoringService.triggerCheck();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const postWithAlerts = await MarketingPost.findById(timeoutPost._id);

    expect(postWithAlerts.metadata?.failureAlerts).toBeTruthy();
    if (postWithAlerts.metadata?.failureAlerts?.length > 0) {
      const alert = postWithAlerts.metadata.failureAlerts[0];
      expect(alert.type).toBe('post_failed');
      expect(alert.severity).toBe('error');
      expect(alert.details.message).toBeTruthy();
      expect(alert.details.action).toBeTruthy();
    }
  });

  it('Step 5: Create retry todo - should create todo in marketing_tasks collection', async () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

    const timeoutPost = await MarketingPost.create({
      title: 'TEST_295_Todo Post',
      description: 'Test post for todo creation',
      platform: 'instagram',
      status: 'posting',
      contentType: 'video',
      caption: 'Test caption',
      hashtags: ['#test'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'romance',
      storySpiciness: 1,
      uploadProgress: {
        status: 'uploading',
        progress: 30,
        startedAt: elevenMinutesAgo
      },
      createdAt: elevenMinutesAgo,
      updatedAt: elevenMinutesAgo
    });

    await postMonitoringService.triggerCheck();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const retryTodo = await mongoose.connection.collection('marketing_tasks').findOne({
      type: 'retry_post',
      'metadata.postId': timeoutPost._id.toString()
    });

    expect(retryTodo).toBeTruthy();
    if (retryTodo) {
      expect(retryTodo.title).toContain('Retry post');
      expect(retryTodo.type).toBe('retry_post');
      expect(retryTodo.category).toBe('posting');
      expect(retryTodo.priority).toBe('high');
      expect(retryTodo.status).toBe('pending');
      expect(retryTodo.createdBy).toBe('system');
      expect(retryTodo.metadata?.postId).toBe(timeoutPost._id.toString());
      expect(retryTodo.metadata?.platform).toBeTruthy();
      expect(retryTodo.metadata?.failureType).toBeTruthy();
      expect(retryTodo.metadata?.errorMessage).toBeTruthy();
      expect(retryTodo.actions?.length).toBeGreaterThan(0);
    }
  });

  it('API: Should return monitoring status', () => {
    const status = postMonitoringService.getStatus();

    expect(status.isMonitoring).toBe(true);
    expect(status.checkInterval).toBe(30000);
    expect(status.stuckThreshold).toBe(5 * 60 * 1000);
    expect(status.failedThreshold).toBe(10 * 60 * 1000);
  });
});
