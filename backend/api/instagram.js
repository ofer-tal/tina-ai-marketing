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
 * GET /api/instagram/debug-token
 * Debug endpoint to inspect OAuth token and accessible resources
 * Shows: user info, accessible Pages, permissions, token details
 */
router.get('/debug-token', async (req, res) => {
  try {
    logger.info('Debugging Instagram OAuth token...');

    const oauthManager = (await import('../services/oauthManager.js')).default;
    const token = await oauthManager.getToken('instagram');

    if (!token || !token.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'No Instagram token found. Please authenticate first.',
      });
    }

    const debugInfo = {
      hasAccessToken: !!token.accessToken,
      tokenPreview: token.accessToken ? token.accessToken.substring(0, 20) + '...' : null,
      expiresAt: token.expiresAt?.toISOString(),
    };

    // First, debug the token itself to see what permissions it has
    const debugTokenUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${token.accessToken}`;
    const debugResponse = await fetch(debugTokenUrl);

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      debugInfo.tokenDebug = debugData.data;
    } else {
      debugInfo.tokenDebugError = await debugResponse.text();
    }

    // Get user info (who is this token for?)
    const meUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,accounts`;
    const meResponse = await fetch(meUrl, {
      headers: { 'Authorization': `Bearer ${token.accessToken}` }
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();
      debugInfo.user = meData;
    } else {
      debugInfo.userError = await meResponse.text();
    }

    // Get Pages accessible to this token
    const accountsUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category,instagram_business_account{id,username},tasks,access_token`;
    const accountsResponse = await fetch(accountsUrl, {
      headers: { 'Authorization': `Bearer ${token.accessToken}` }
    });

    debugInfo.accountsUrl = accountsUrl;
    debugInfo.accountsResponseStatus = accountsResponse.status;
    debugInfo.accountsResponseOk = accountsResponse.ok;

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      debugInfo.pages = accountsData;
      debugInfo.rawPagesResponse = JSON.stringify(accountsData);

      // Count pages with Instagram accounts
      if (accountsData.data) {
        const pagesWithInstagram = accountsData.data.filter(p => p.instagram_business_account);
        debugInfo.summary = {
          totalPages: accountsData.data.length,
          pagesWithInstagram: pagesWithInstagram.length,
          pageNames: accountsData.data.map(p => p.name),
          pagesWithInstagramDetails: pagesWithInstagram.map(p => ({
            id: p.id,
            name: p.name,
            instagramUsername: p.instagram_business_account?.username,
            instagramId: p.instagram_business_account?.id,
          })),
        };
      }
    } else {
      const errorText = await accountsResponse.text();
      debugInfo.pagesError = errorText;
      try {
        debugInfo.pagesErrorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON
      }
    }

    // Check token metadata from database
    const { default: AuthToken } = await import('../models/AuthToken.js');
    const storedToken = await AuthToken.getActiveToken('instagram');
    if (storedToken) {
      debugInfo.storedMetadata = storedToken.metadata || {};
    }

    // ANALYSIS: Check if Instagram Business Account is properly connected
    debugInfo.analysis = {
      hasPages: !!debugInfo.pages?.data && debugInfo.pages.data.length > 0,
      pagesWithInstagram: debugInfo.summary?.pagesWithInstagram || 0,
      instagramIdInScopes: debugInfo.debug?.granular_scopes?.find(s => s.scope === 'instagram_content_publish')?.target_ids?.[0] || null,
      issue: null,
      recommendation: null,
    };

    // Diagnose the issue
    if (debugInfo.analysis.hasPages) {
      if (debugInfo.analysis.pagesWithInstagram === 0) {
        debugInfo.analysis.issue = 'NO_INSTAGRAM_CONNECTED';
        debugInfo.analysis.recommendation = 'Your Facebook Page exists but has no Instagram Business Account connected. The Instagram account must be a Professional (Creator/Business) account and connected via Meta Business Suite.';
      } else {
        debugInfo.analysis.issue = 'OK';
        debugInfo.analysis.recommendation = 'Instagram Business Account is connected.';
      }
    } else {
      debugInfo.analysis.issue = 'NO_PAGES';
      debugInfo.analysis.recommendation = 'No Facebook Pages found. You need to create a Facebook Page and connect your Instagram Professional account to it.';
    }

    // If we have an Instagram ID from scopes but no connected account, the account is not properly set up
    if (debugInfo.analysis.instagramIdInScopes && debugInfo.analysis.pagesWithInstagram === 0) {
      debugInfo.analysis.issue = 'INSTAGRAM_NOT_PROFESSIONAL_OR_NOT_CONNECTED';
      debugInfo.analysis.recommendation = 'Your Instagram account (ID: ' + debugInfo.analysis.instagramIdInScopes + ') appears in OAuth permissions but is not connected to your Facebook Page as a Business/Creator account. Please ensure: 1) Instagram account is set to Professional (Creator or Business), 2) Connected to Facebook Page via Instagram Settings > Accounts Center > Linked Accounts.';
    }

    res.json({
      success: true,
      debug: debugInfo,
    });

  } catch (error) {
    logger.error('Instagram token debug failed', {
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
