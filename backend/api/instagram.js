/**
 * Instagram API Routes
 *
 * API endpoints for Instagram Graph API integration
 * - OAuth authentication
 * - Business account setup
 * - Reels posting
 * - Connection testing
 * - Permission verification
 */

import express from 'express';
import instagramPostingService from '../services/instagramPostingService.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'instagram');

/**
 * GET /api/instagram/authorization-url
 * Get the authorization URL for OAuth flow
 */
router.get('/authorization-url', (req, res) => {
  try {
    logger.info('Getting Instagram authorization URL...');

    const authUrl = instagramPostingService.getAuthorizationUrl();

    res.json({
      success: true,
      authorizationUrl: authUrl,
      message: 'Use this URL to authorize the application',
    });

  } catch (error) {
    logger.error('Failed to get authorization URL', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/instagram/callback
 * OAuth callback endpoint
 * Exchange authorization code for access token
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

    logger.info('Processing Instagram OAuth callback...');

    const result = await instagramPostingService.exchangeCodeForToken(code);

    if (result.success) {
      res.json({
        success: true,
        message: 'Instagram authentication successful',
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }

  } catch (error) {
    logger.error('Instagram OAuth callback failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/instagram/test-connection
 * Test Instagram Graph API connection and credentials
 */
router.post('/test-connection', async (req, res) => {
  try {
    logger.info('Testing Instagram Graph API connection...');

    const result = await instagramPostingService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        authenticated: result.authenticated,
        hasCredentials: result.hasCredentials,
        tokenStatus: result.tokenStatus,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
        details: result.details,
      });
    }

  } catch (error) {
    logger.error('Instagram connection test failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/instagram/permissions
 * Verify Instagram Graph API permissions for content publishing
 */
router.get('/permissions', async (req, res) => {
  try {
    logger.info('Verifying Instagram Graph API permissions...');

    const result = await instagramPostingService.verifyPermissions();

    if (result.success) {
      res.json({
        success: true,
        hasAllPermissions: result.hasAllPermissions,
        permissions: result.permissions,
        missingPermissions: result.missingPermissions,
        grantedScopes: result.grantedScopes,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

  } catch (error) {
    logger.error('Instagram permissions verification failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/instagram/business-account
 * Discover and get Instagram business account info
 */
router.get('/business-account', async (req, res) => {
  try {
    logger.info('Getting Instagram business account info...');

    const result = await instagramPostingService.discoverBusinessAccount();

    if (result.success) {
      res.json({
        success: true,
        businessAccount: result.businessAccount,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

  } catch (error) {
    logger.error('Failed to get Instagram business account', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/instagram/post/:postId
 * Post a marketing post to Instagram Reels
 */
router.post('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info('Starting Instagram Reels posting...', { postId });

    // Get the post from database
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if post is approved
    if (post.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Post must be approved before posting to Instagram',
        currentStatus: post.status,
      });
    }

    // Check if post is for Instagram
    if (post.platform !== 'instagram') {
      return res.status(400).json({
        success: false,
        error: 'Post is not for Instagram platform',
        platform: post.platform,
      });
    }

    // Update post status to posting
    post.status = 'posting';
    await post.save();

    // Get caption and hashtags
    const caption = post.caption || '';
    const hashtags = post.hashtags || [];

    // Get video path
    const videoPath = post.generatedContent?.videoPath;

    if (!videoPath) {
      post.status = 'failed';
      post.error = 'Video path not found';
      await post.save();

      return res.status(400).json({
        success: false,
        error: 'Video path not found',
      });
    }

    // Setup SSE for progress updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send progress updates
    const onProgress = (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    };

    // Post to Instagram
    const result = await instagramPostingService.postVideo(
      videoPath,
      caption,
      hashtags,
      onProgress
    );

    // Update post status
    if (result.success) {
      post.status = 'posted';
      post.postedAt = new Date();
      post.instagramPostId = result.mediaId;
      await post.save();

      res.write(`data: ${JSON.stringify({ stage: 'completed', mediaId: result.mediaId })}\n\n`);
    } else {
      post.status = 'failed';
      post.error = result.error;
      await post.save();

      res.write(`data: ${JSON.stringify({ stage: 'failed', error: result.error })}\n\n`);
    }

    res.end();

    logger.info('Instagram posting completed', {
      postId,
      success: result.success,
      mediaId: result.mediaId,
    });

  } catch (error) {
    logger.error('Instagram posting failed', {
      error: error.message,
      stack: error.stack,
      postId: req.params.postId,
    });

    // Update post status to failed
    try {
      const post = await MarketingPost.findById(req.params.postId);
      if (post) {
        post.status = 'failed';
        post.error = error.message;
        await post.save();
      }
    } catch (saveError) {
      logger.error('Failed to update post status', {
        error: saveError.message,
      });
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    } else {
      res.write(`data: ${JSON.stringify({ stage: 'failed', error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/instagram/health
 * Health check endpoint for Instagram service
 */
router.get('/health', (req, res) => {
  try {
    const health = instagramPostingService.healthCheck();

    res.json({
      success: true,
      service: health.service,
      status: health.status,
      enabled: health.enabled,
      capabilities: health.capabilities,
      timestamp: health.timestamp,
    });

  } catch (error) {
    logger.error('Instagram health check failed', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
