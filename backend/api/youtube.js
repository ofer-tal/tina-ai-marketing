/**
 * YouTube API Routes
 *
 * REST API endpoints for YouTube Shorts posting integration.
 * Handles OAuth flow, video uploads, and status tracking.
 */

import express from 'express';
import youtubeService from '../services/youtubePostingService.js';
import { getLogger } from '../utils/logger.js';
import MarketingPost from '../models/MarketingPost.js';
import oauthManager from '../services/oauthManager.js';

const router = express.Router();
const logger = getLogger('api', 'youtube');

/**
 * GET /api/youtube/authorization-url
 *
 * Get OAuth authorization URL for YouTube
 * This will present brand account selection in the Google OAuth dialog
 */
router.get('/authorization-url', async (req, res) => {
  try {
    logger.info('Getting YouTube OAuth authorization URL...');

    // Get auth URL for the 'youtube' platform (not 'google')
    const { authUrl } = await oauthManager.getAuthorizationUrl('youtube');

    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        instructions: 'In the Google OAuth dialog, select the @BlushApp brand account when prompted',
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
 * GET /api/youtube/authorize-url
 *
 * Alias for /authorization-url (matches Google Sheets pattern)
 */
router.get('/authorize-url', async (req, res) => {
  try {
    logger.info('Getting YouTube OAuth authorize URL...');

    const { authUrl } = await oauthManager.getAuthorizationUrl('youtube');

    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        instructions: 'In the Google OAuth dialog, select the @BlushApp brand account when prompted',
      },
    });
  } catch (error) {
    logger.error('Failed to get YouTube authorize URL', {
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
 * OAuth callback handler for YouTube
 * Uses the 'youtube' platform (not 'google')
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    logger.info('Processing YouTube OAuth callback...');

    // Construct callback URL for oauthManager
    const callbackUrl = `${process.env.GOOGLE_REDIRECT_URI}?code=${code}&state=${state}`;

    // Handle callback for the 'youtube' platform
    const result = await oauthManager.handleCallback('youtube', callbackUrl, state);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Get the authenticated channel to verify it's the correct one
    const channelResult = await youtubeService.getUserChannel();

    res.json({
      success: true,
      message: 'YouTube authentication successful',
      data: {
        authenticated: true,
        channel: channelResult.channel,
        platform: 'youtube',
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
 * Test both OAuth connection and API key
 * - OAuth: Required for posting videos
 * - API Key: Required for fetching public metrics
 */
router.post('/test-connection', async (req, res) => {
  try {
    logger.info('Testing YouTube connection (OAuth + API Key)...');

    const results = {
      oauth: { success: false, message: '' },
      apiKey: { success: false, message: '' },
    };

    // Test OAuth connection (for posting videos)
    const oauthResult = await youtubeService.verifyConnection();
    results.oauth = {
      success: oauthResult.success,
      message: oauthResult.success ? 'OAuth connection verified' : oauthResult.error,
      code: oauthResult.code,
      channel: oauthResult.channel,
    };

    // Test API key (for fetching metrics)
    const apiKeyTest = await youtubeService.testConnection();
    results.apiKey = {
      success: apiKeyTest.success,
      message: apiKeyTest.success ? 'API key valid' : apiKeyTest.error,
      code: apiKeyTest.code,
    };

    // Overall success requires OAuth to work (API key is optional but recommended)
    const overallSuccess = oauthResult.success;
    const message = [];

    if (oauthResult.success) {
      message.push('✓ OAuth connected (can post videos)');
    } else {
      message.push(`✗ OAuth failed: ${oauthResult.error}`);
    }

    if (apiKeyTest.success) {
      message.push('✓ API key valid (can fetch metrics)');
    } else {
      message.push(`⚠ API key issue: ${apiKeyTest.error} (metrics won't work)`);
    }

    res.json({
      success: overallSuccess,
      message: message.join(' | '),
      data: {
        oauth: results.oauth,
        apiKey: results.apiKey,
        canPost: oauthResult.success,
        canFetchMetrics: apiKeyTest.success,
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
 * GET /api/youtube/test-connection
 *
 * GET endpoint for test-connection (convenience method)
 */
router.get('/test-connection', async (req, res) => {
  try {
    logger.info('Testing YouTube API connection...');

    const connectionResult = await youtubeService.verifyConnection();

    if (!connectionResult.success) {
      return res.status(400).json({
        success: false,
        error: connectionResult.error,
        code: connectionResult.code,
        details: connectionResult.details,
      });
    }

    res.json({
      success: true,
      message: connectionResult.message,
      code: connectionResult.code,
      channelId: connectionResult.channelId,
      channel: connectionResult.channel,
      authenticated: await oauthManager.isAuthenticated('youtube'),
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
    // Extract YouTube-specific hashtags from platform-specific hashtags object
    const youtubeHashtags = post.hashtags?.youtube_shorts || [];

    const uploadResult = await youtubeService.postVideo(
      post.videoPath,
      post.caption || post.title,
      post.caption || '',
      youtubeHashtags,
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
 * GET /api/youtube/test-channels
 *
 * Discovery test: See what channels the API returns when authenticated
 * This will tell us if the Blush brand account is accessible
 */
router.get('/test-channels', async (req, res) => {
  try {
    logger.info('Testing YouTube channel access...');

    // Test 1: Call channels.list with mine=true
    const url1 = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true';
    const response1 = await oauthManager.fetch('youtube', url1);

    if (!response1.ok) {
      const error = await response1.json();
      return res.status(500).json({
        success: false,
        error: error.error?.message || 'Failed to fetch channels',
        details: error,
      });
    }

    const data1 = await response1.json();

    logger.info('channels.list with mine=true returned:', {
      count: data1.items?.length || 0,
      channels: data1.items?.map(c => ({
        id: c.id,
        title: c.snippet?.title,
        customUrl: c.snippet?.customUrl,
      })),
    });

    // Test 2: Try listing all channels without mine parameter
    // (This might return channels the user manages)
    const url2 = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&managedByMe=true';
    const response2 = await oauthManager.fetch('youtube', url2);

    let data2 = null;
    if (response2.ok) {
      data2 = await response2.json();
      logger.info('channels.list with managedByMe=true returned:', {
        count: data2.items?.length || 0,
      });
    } else {
      logger.warn('managedByMe parameter failed (expected for non-CMS accounts)');
    }

    return res.json({
      success: true,
      results: {
        mine: {
          count: data1.items?.length || 0,
          channels: data1.items?.map(c => ({
            id: c.id,
            title: c.snippet?.title,
            customUrl: c.snippet?.customUrl,
            description: c.snippet?.description,
          })),
        },
        managedByMe: data2 ? {
          count: data2.items?.length || 0,
          channels: data2.items?.map(c => ({
            id: c.id,
            title: c.snippet?.title,
          })),
        } : null,
      },
      nextSteps: {
        ifMultipleChannels: 'If multiple channels returned, we can add channel selection',
        ifOneChannel: 'If only one channel, we need to explore other approaches',
        lookFor: 'Look for a channel titled "BlushApp" or similar',
      },
    });

  } catch (error) {
    logger.error('YouTube test-channels error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
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
