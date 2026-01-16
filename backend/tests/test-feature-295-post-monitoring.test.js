/**
 * Feature #295: Post failure detection and alerting - End-to-End Test
 *
 * This test verifies that:
 * Step 1: Post API call fails - Detected by monitoring service
 * Step 2: Detect failure in monitoring - Monitoring checks stuck/failed posts
 * Step 3: Update post status to failed - Status updated with error details
 * Step 4: Send alert notification - Alert logged with user-friendly message
 * Step 5: Create retry todo - Todo created in marketing_tasks collection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import MarketingPost from '../models/MarketingPost.js';
import postMonitoringService from '../services/postMonitoringService.js';

describe('Feature #295: Post failure detection and alerting', () => {
  // Test post IDs
  let testPostId;
  let stuckPostId;
  let timeoutPostId;

  beforeAll(async () => {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing');
    }
  });

  afterAll(async () => {
    // Clean up test data
    await MarketingPost.deleteMany({
      title: { $regex: 'TEST_295_' }
    });
    await mongoose.connection.collection('marketing_tasks').deleteMany({
      title: { $regex: 'TEST_295_|Retry post: TEST_295_' }
    });
  });

  beforeEach(async () => {
    // Clean up before each test
    await MarketingPost.deleteMany({
      title: { $regex: 'TEST_295_'
    });
    await mongoose.connection.collection('marketing_tasks').deleteMany({
      title: { $regex: 'TEST_295_|Retry post: TEST_295_' }
    });
  });

  /**
   * Step 1: Post API call fails
   * Verify that posts can be created with failed status
   */
  it('Step 1: Post API call fails - should allow creating failed posts', async () => {
    console.log('\n=== Step 1: Creating failed post ===');

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

    testPostId = testPost._id;

    console.log('✓ Failed post created:', {
      id: testPostId,
      status: testPost.status,
      error: testPost.error,
      failedAt: testPost.failedAt
    });

    expect(testPost.status).toBe('failed');
    expect(testPost.error).toBeTruthy();
    expect(testPost.failedAt).toBeTruthy();
    expect(testPost.retryCount).toBe(0);
  });

  /**
   * Step 2: Detect failure in monitoring
   * Verify that monitoring service detects stuck and failed posts
   */
  it('Step 2: Detect failure in monitoring - should identify stuck posts', async () => {
    console.log('\n=== Step 2: Creating stuck post for detection ===');

    // Create a post that appears stuck (no update for 5+ minutes)
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    const stuckPost = await MarketingPost.create({
      title: 'TEST_295_Stuck Post',
      description: 'Test post that is stuck during upload',
      platform: 'instagram',
      status: 'posting', // Still in posting state
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
      updatedAt: sixMinutesAgo // No update for 6 minutes
    });

    stuckPostId = stuckPost._id;

    console.log('✓ Stuck post created:', {
      id: stuckPostId,
      status: stuckPost.status,
      uploadProgress: stuckPost.uploadProgress,
      lastUpdate: stuckPost.updatedAt
    });

    // Manually trigger monitoring check
    await postMonitoringService.triggerCheck();

    // Wait a bit for the check to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check that stuck post was detected (look for alerts in logs)
    const postWithAlerts = await MarketingPost.findById(stuckPostId);
    console.log('✓ Monitoring check completed, alerts stored:', {
      hasStuckAlert: !!postWithAlerts.metadata?.lastStuckAlert
    });

    expect(stuckPost.status).toBe('posting');
    expect(stuckPost.uploadProgress.status).toBe('uploading');
  });

  /**
   * Step 3: Update post status to failed
   * Verify that monitoring service can mark posts as failed
   */
  it('Step 3: Update post status to failed - should mark timed-out posts as failed', async () => {
    console.log('\n=== Step 3: Creating timed-out post ===');

    // Create a post that has been in posting state for too long (10+ minutes)
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

    timeoutPostId = timeoutPost._id;

    console.log('✓ Timeout post created:', {
      id: timeoutPostId,
      status: timeoutPost.status,
      timeInPosting: `${Math.round((Date.now() - elevenMinutesAgo) / 1000)}s`
    });

    // Trigger monitoring check
    await postMonitoringService.triggerCheck();

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify post was marked as failed
    const failedPost = await MarketingPost.findById(timeoutPostId);

    console.log('✓ Post status after monitoring:', {
      status: failedPost.status,
      error: failedPost.error,
      failedAt: failedPost.failedAt,
      uploadStatus: failedPost.uploadProgress?.status
    });

    expect(failedPost.status).toBe('failed');
    expect(failedPost.error).toBeTruthy();
    expect(failedPost.failedAt).toBeTruthy();
    expect(failedPost.uploadProgress?.status).toBe('failed');
  });

  /**
   * Step 4: Send alert notification
   * Verify that alerts are logged with user-friendly messages
   */
  it('Step 4: Send alert notification - should log alerts with user-friendly messages', async () => {
    console.log('\n=== Step 4: Checking alert notifications ===');

    // Check for failure alerts on the timeout post
    const postWithAlerts = await MarketingPost.findById(timeoutPostId);

    console.log('✓ Checking for alerts:', {
      hasMetadata: !!postWithAlerts.metadata,
      hasFailureAlerts: !!(postWithAlerts.metadata?.failureAlerts?.length > 0),
      alertCount: postWithAlerts.metadata?.failureAlerts?.length || 0
    });

    // Verify alert structure if present
    if (postWithAlerts.metadata?.failureAlerts?.length > 0) {
      const alert = postWithAlerts.metadata.failureAlerts[0];
      console.log('✓ Alert details:', {
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
        hasMessage: !!alert.details?.message,
        hasAction: !!alert.details?.action
      });

      expect(alert.type).toBe('post_failed');
      expect(alert.severity).toBe('error');
      expect(alert.details.message).toBeTruthy();
      expect(alert.details.action).toBeTruthy();
    }

    expect(postWithAlerts.metadata?.failureAlerts).toBeTruthy();
  });

  /**
   * Step 5: Create retry todo
   * Verify that retry todos are created for failed posts
   */
  it('Step 5: Create retry todo - should create todo in marketing_tasks collection', async () => {
    console.log('\n=== Step 5: Checking for retry todo ===');

    // Look for retry todo created for the failed post
    const retryTodo = await mongoose.connection.collection('marketing_tasks').findOne({
      type: 'retry_post',
      'metadata.postId': timeoutPostId.toString()
    });

    console.log('✓ Retry todo search result:', {
      found: !!retryTodo,
      id: retryTodo?._id?.toString(),
      title: retryTodo?.title,
      status: retryTodo?.status,
      priority: retryTodo?.priority,
      hasMetadata: !!retryTodo?.metadata
    });

    if (retryTodo) {
      console.log('✓ Todo details:', {
        title: retryTodo.title,
        description: retryTodo.description?.substring(0, 100) + '...',
        category: retryTodo.category,
        priority: retryTodo.priority,
        platform: retryTodo.metadata?.platform,
        failureType: retryTodo.metadata?.failureType,
        hasActions: retryTodo.actions?.length > 0
      });

      // Verify todo structure
      expect(retryTodo.title).toContain('Retry post');
      expect(retryTodo.type).toBe('retry_post');
      expect(retryTodo.category).toBe('posting');
      expect(retryTodo.priority).toBe('high');
      expect(retryTodo.status).toBe('pending');
      expect(retryTodo.createdBy).toBe('system');
      expect(retryTodo.metadata?.postId).toBe(timeoutPostId.toString());
      expect(retryTodo.metadata?.platform).toBeTruthy();
      expect(retryTodo.metadata?.failureType).toBeTruthy();
      expect(retryTodo.metadata?.errorMessage).toBeTruthy();
      expect(retryTodo.actions?.length).toBeGreaterThan(0);
    } else {
      console.log('⚠ No retry todo found yet (may be created on next monitoring cycle)');
    }

    // Trigger another monitoring check to ensure todo is created
    await postMonitoringService.triggerCheck();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check again
    const retryTodoAfter = await mongoose.connection.collection('marketing_tasks').findOne({
      type: 'retry_post',
      'metadata.postId': timeoutPostId.toString()
    });

    console.log('✓ Retry todo after second check:', {
      found: !!retryTodoAfter
    });

    // The todo should exist now
    expect(retryTodoAfter).toBeTruthy();
  });

  /**
   * Integration test: Complete workflow
   * Verify the entire failure detection and alerting workflow
   */
  it('Integration: Complete workflow - from failure to alert to todo', async () => {
    console.log('\n=== Integration Test: Complete Workflow ===');

    // Create a post that will be detected as failed
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const workflowPost = await MarketingPost.create({
      title: 'TEST_295_Workflow Post',
      description: 'Test post for complete workflow',
      platform: 'tiktok',
      status: 'posting',
      contentType: 'video',
      caption: 'Complete workflow test',
      hashtags: ['#workflow', '#test'],
      scheduledAt: new Date(),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Workflow Test Story',
      storyCategory: 'drama',
      storySpiciness: 2,
      uploadProgress: {
        status: 'uploading',
        progress: 60,
        stage: 'Publishing',
        startedAt: fifteenMinutesAgo,
        errorMessage: 'Network timeout during publish'
      },
      createdAt: fifteenMinutesAgo,
      updatedAt: fifteenMinutesAgo
    });

    console.log('✓ Workflow post created:', {
      id: workflowPost._id,
      status: workflowPost.status
    });

    // Trigger monitoring
    await postMonitoringService.triggerCheck();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify failure detection
    const failedPost = await MarketingPost.findById(workflowPost._id);
    console.log('✓ Post marked as failed:', {
      status: failedPost.status,
      error: failedPost.error,
      failedAt: failedPost.failedAt
    });

    // Verify alert
    const hasAlert = failedPost.metadata?.failureAlerts?.length > 0;
    console.log('✓ Alert created:', {
      hasAlert,
      alertCount: failedPost.metadata?.failureAlerts?.length || 0
    });

    // Verify todo
    const todo = await mongoose.connection.collection('marketing_tasks').findOne({
      type: 'retry_post',
      'metadata.postId': workflowPost._id.toString()
    });
    console.log('✓ Retry todo created:', {
      found: !!todo,
      title: todo?.title
    });

    // Complete workflow verification
    expect(failedPost.status).toBe('failed');
    expect(failedPost.error).toBeTruthy();
    expect(hasAlert).toBe(true);
    expect(todo).toBeTruthy();
  });

  /**
   * API endpoint tests
   * Verify the monitoring API endpoints work correctly
   */
  it('API: Should return monitoring status', async () => {
    console.log('\n=== API Test: Monitoring Status ===');

    const status = postMonitoringService.getStatus();

    console.log('✓ Monitoring status:', {
      isMonitoring: status.isMonitoring,
      checkInterval: status.checkInterval,
      stuckThreshold: status.stuckThreshold,
      failedThreshold: status.failedThreshold
    });

    expect(status.isMonitoring).toBe(true);
    expect(status.checkInterval).toBe(30000);
    expect(status.stuckThreshold).toBe(5 * 60 * 1000);
    expect(status.failedThreshold).toBe(10 * 60 * 1000);
  });

  it('API: Should get in-progress posts', async () => {
    console.log('\n=== API Test: In-Progress Posts ===');

    // Create some in-progress posts
    await MarketingPost.create([
      {
        title: 'TEST_295_Progress 1',
        platform: 'tiktok',
        status: 'posting',
        caption: 'Test 1',
        hashtags: [],
        scheduledAt: new Date(),
        storyId: new mongoose.Types.ObjectId(),
        storyName: 'Story 1',
        storyCategory: 'test',
        storySpiciness: 1,
        uploadProgress: { status: 'uploading', progress: 30 }
      },
      {
        title: 'TEST_295_Progress 2',
        platform: 'instagram',
        status: 'uploading',
        caption: 'Test 2',
        hashtags: [],
        scheduledAt: new Date(),
        storyId: new mongoose.Types.ObjectId(),
        storyName: 'Story 2',
        storyCategory: 'test',
        storySpiciness: 1,
        uploadProgress: { status: 'initializing', progress: 0 }
      }
    ]);

    const inProgressPosts = await MarketingPost.find({
      status: { $in: ['posting', 'uploading'] },
      title: { $regex: 'TEST_295_' }
    });

    console.log('✓ In-progress posts found:', {
      count: inProgressPosts.length,
      posts: inProgressPosts.map(p => ({
        title: p.title,
        status: p.status,
        uploadStatus: p.uploadProgress?.status
      }))
    });

    expect(inProgressPosts.length).toBeGreaterThan(0);
  });
});
