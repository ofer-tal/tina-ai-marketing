/**
 * TikTok OAuth Callback Handler
 *
 * This route handles the OAuth callback from TikTok after user authorization
 * It exchanges the authorization code for an access token
 */

import express from 'express';
import tiktokPostingService from '../services/tiktokPostingService.js';

const router = express.Router();

/**
 * GET /auth/tiktok/callback
 * OAuth callback endpoint - receives authorization code from TikTok
 *
 * Query params:
 * - code: Authorization code from TikTok
 * - state: State parameter for CSRF protection
 * - error: Error code if authorization failed
 * - error_description: Error description if authorization failed
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check if user denied authorization
    if (error) {
      console.error('TikTok authorization failed', {
        error,
        error_description,
      });

      return res.redirect(
        '/test-pages/oauth-callback.html?tiktok=error&error=' +
        encodeURIComponent(error_description || 'Authorization failed')
      );
    }

    // Check for authorization code
    if (!code) {
      console.error('No authorization code received from TikTok');
      return res.redirect(
        '/test-pages/oauth-callback.html?tiktok=error&error=' +
        encodeURIComponent('No authorization code received')
      );
    }

    console.log('Received TikTok OAuth callback', {
      hasCode: !!code,
      hasState: !!state,
    });

    // Exchange authorization code for access token
    const result = await tiktokPostingService.exchangeCodeForToken(code, state);

    if (result.success) {
      console.log('TikTok authentication successful', {
        hasAccessToken: !!tiktokPostingService.accessToken,
        hasRefreshToken: !!tiktokPostingService.refreshToken,
        creatorId: tiktokPostingService.creatorId,
      });

      // Redirect to the callback page (will close popup)
      res.redirect(
        '/test-pages/oauth-callback.html?tiktok=success&message=' +
        encodeURIComponent('Authentication successful! You can now post to TikTok.')
      );
    } else {
      console.error('Token exchange failed', {
        error: result.error,
        code: result.code,
      });

      res.redirect(
        '/test-pages/oauth-callback.html?tiktok=error&error=' +
        encodeURIComponent(result.error || 'Authentication failed')
      );
    }

  } catch (error) {
    console.error('TikTok OAuth callback error', {
      error: error.message,
      stack: error.stack,
    });

    res.redirect(
      '/test-pages/oauth-callback.html?tiktok=error&error=' +
      encodeURIComponent(error.message || 'An unexpected error occurred')
    );
  }
});

export default router;
