import express from 'express';
import postRetryJob from '../jobs/postRetryJob.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('post-retry-api', 'api');

/**
 * POST /api/post-retry/start
 * Start the post retry scheduler
 */
router.post('/start', async (req, res) => {
  try {
    postRetryJob.start();
    res.json({
      success: true,
      message: 'Post retry scheduler started',
      status: postRetryJob.getStatus()
    });
  } catch (error) {
    logger.error('Failed to start post retry scheduler', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/post-retry/stop
 * Stop the post retry scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    postRetryJob.stop();
    res.json({
      success: true,
      message: 'Post retry scheduler stopped',
      status: postRetryJob.getStatus()
    });
  } catch (error) {
    logger.error('Failed to stop post retry scheduler', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/post-retry/trigger
 * Manually trigger the post retry job
 */
router.post('/trigger', async (req, res) => {
  try {
    await postRetryJob.trigger();
    res.json({
      success: true,
      message: 'Post retry job triggered successfully'
    });
  } catch (error) {
    logger.error('Failed to trigger post retry job', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-retry/status
 * Get the current status of the post retry scheduler
 */
router.get('/status', async (req, res) => {
  try {
    const status = postRetryJob.getStatus();
    const stats = await postRetryJob.getRetryStats();

    res.json({
      success: true,
      data: {
        ...status,
        stats
      }
    });
  } catch (error) {
    logger.error('Failed to get post retry status', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-retry/failed
 * Get all failed posts with their retry information
 */
router.get('/failed', async (req, res) => {
  try {
    const { limit = 50, skip = 0, platform } = req.query;

    const query = { status: 'failed' };
    if (platform) {
      query.platform = platform;
    }

    const failedPosts = await MarketingPost.find(query)
      .select('title platform status error failedAt retryCount lastRetriedAt permanentlyFailed permanentlyFailedAt scheduledAt createdAt')
      .sort({ failedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await MarketingPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts: failedPosts,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(limit) + parseInt(skip)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get failed posts', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/post-retry/:id/retry
 * Manually retry a specific failed post
 */
router.post('/:id/retry', async (req, res) => {
  try {
    const post = await MarketingPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (post.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Post is not in failed status'
      });
    }

    // Reset retry count to allow immediate retry
    post.retryCount = 0;
    post.lastRetriedAt = new Date();
    await post.save();

    // Trigger the retry job
    await postRetryJob.trigger();

    res.json({
      success: true,
      message: 'Post queued for retry',
      data: {
        postId: post._id,
        title: post.title,
        platform: post.platform
      }
    });
  } catch (error) {
    logger.error('Failed to retry post', {
      error: error.message,
      postId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/post-retry/:id/reset
 * Reset retry count for a failed post (allow it to be retried)
 */
router.post('/:id/reset', async (req, res) => {
  try {
    const post = await MarketingPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Reset retry-related fields
    post.retryCount = 0;
    post.lastRetriedAt = null;
    post.permanentlyFailed = false;
    post.permanentlyFailedAt = null;
    await post.save();

    res.json({
      success: true,
      message: 'Post retry count reset',
      data: {
        postId: post._id,
        title: post.title,
        retryCount: 0
      }
    });
  } catch (error) {
    logger.error('Failed to reset post retry count', {
      error: error.message,
      postId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/post-retry/stats
 * Get retry statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await postRetryJob.getRetryStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get retry stats', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
