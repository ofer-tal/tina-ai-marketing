/**
 * YouTube API Routes
 *
 * REST API endpoints for YouTube Shorts posting integration.
 * Handles OAuth flow, video uploads, and status tracking.
 */

import express from 'express';
import YouTubePostingService from '../services/youtubePostingService.js';
import { getLogger } from '../utils/logger.js';
import MarketingPost from '../models/MarketingPost.js';

const router = express.Router();
const logger = getLogger('api', 'youtube');

// Initialize YouTube service
const youtubeService = new YouTubePostingService();

/**
 * GET /api/youtube/authorization-url
 *
 * Step 3 of YouTube API integration: Get OAuth authorization URL
 * Returns URL for user to authorize the app
 */
router.get('/authorization-url', async (req, res) => {
  try {
    logger.info('Getting YouTube OAuth authorization URL...');

    const result = await youtubeService.getAuthorizationUrl();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      success: true,
      data: {
        authorizationUrl: result.authUrl,
      },
    });
  } catch (error) {
    logger.error('Failed to get YouTube authorization URL', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
      details: error.message,
    });
  }
});

/**
 * POST /api/youtube/callback
 *
 * OAuth callback handler
 * Exchanges authorization code for access token
 */
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    logger.info('Processing YouTube OAuth callback...');

    const result = await youtubeService.exchangeCodeForToken(code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

    // Get user's channel
    const channelResult = await youtubeService.getUserChannel();

    res.json({
      success: true,
      message: 'YouTube authentication successful',
      data: {
        authenticated: true,
        channel: channelResult.channel,
      },
    });
  } catch (error) {
    logger.error('YouTube OAuth callback failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'OAuth callback failed',
      details: error.message,
    });
  }
});

/**
 * POST /api/youtube/test-connection
 *
 * Step 4 of YouTube API integration: Test API connection
 * Verifies credentials and authentication status
 */
router.post('/test-connection', async (req, res) => {
  try {
    logger.info('Testing YouTube API connection...');

    const result = await youtubeService.testConnection();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
        details: result.details,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        connectionStatus: 'ok',
        authenticated: !!youtubeService.accessToken,
        hasChannel: !!youtubeService.channelId,
      },
    });
  } catch (error) {
    logger.error('YouTube connection test failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/youtube/permissions
 *
 * Step 5 of YouTube API integration: Verify upload permissions
 * Checks if we have the necessary scopes to upload videos
 */
router.get('/permissions', async (req, res) => {
  try {
    logger.info('Verifying YouTube upload permissions...');

    const result = await youtubeService.verifyPermissions();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
        missingPermissions: result.missingPermissions,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        hasPermissions: true,
        permissions: result.permissions,
        channelId: result.channelId,
      },
    });
  } catch (error) {
    logger.error('YouTube permissions verification failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Permissions verification failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/youtube/channel
 *
 * Get the authenticated user's YouTube channel
 * Step 3 of YouTube API integration (obtain channel access)
 */
router.get('/channel', async (req, res) => {
  try {
    logger.info('Getting YouTube channel...');

    const result = await youtubeService.getUserChannel();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      success: true,
      data: {
        channel: result.channel,
      },
    });
  } catch (error) {
    logger.error('Failed to get YouTube channel', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get channel',
      details: error.message,
    });
  }
});

/**
 * POST /api/youtube/post/:postId
 *
 * Post a video to YouTube Shorts
 * Uploads the video with metadata (title, description, tags)
 */
router.post('/post/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    logger.info('Posting video to YouTube...', { postId });

    // Validate post exists and is approved
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    if (post.status !== 'approved' && post.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: 'Post must be approved or scheduled to post',
        currentStatus: post.status,
      });
    }

    if (post.platform !== 'youtube_shorts') {
      return res.status(400).json({
        success: false,
        error: 'Post is not a YouTube Shorts post',
        platform: post.platform,
      });
    }

    if (!post.videoPath) {
      return res.status(400).json({
        success: false,
        error: 'Post has no video to upload',
      });
    }

    // Set up SSE for progress updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Start the upload process
    sendProgress({
      step: 'starting',
      message: 'Starting YouTube upload...',
      progress: 0,
    });

    // Upload video to YouTube
    const uploadResult = await youtubeService.postVideo(
      post.videoPath,
      post.caption || post.title,
      post.caption || '',
      post.hashtags || [],
      (progress) => {
        sendProgress(progress);
      }
    );

    if (!uploadResult.success) {
      sendProgress({
        step: 'error',
        message: `Upload failed: ${uploadResult.error}`,
        progress: 0,
      });

      res.write('data: [DONE]\n\n');
      res.end();

      return;
    }

    // Update post status
    post.status = 'posted';
    post.postedAt = new Date();
    post.youtubeVideoId = uploadResult.videoId;
    post.youtubeVideoUrl = uploadResult.videoUrl;
    await post.save();

    sendProgress({
      step: 'completed',
      message: 'Successfully posted to YouTube!',
      progress: 100,
      videoId: uploadResult.videoId,
      videoUrl: uploadResult.videoUrl,
    });

    logger.info('YouTube upload completed successfully', {
      postId,
      videoId: uploadResult.videoId,
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('YouTube upload failed', {
      error: error.message,
      stack: error.stack,
      postId,
    });

    // Send error via SSE
    res.write(`data: ${JSON.stringify({
      step: 'error',
      message: `Upload failed: ${error.message}`,
      progress: 0,
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * GET /api/youtube/health
 *
 * Health check endpoint for YouTube service
 */
router.get('/health', async (req, res) => {
  try {
    const health = await youtubeService.healthCheck();

    res.json({
      service: 'youtube',
      ...health,
    });
  } catch (error) {
    res.status(500).json({
      service: 'youtube',
      status: 'error',
      error: error.message,
    });
  }
});

export default router;
