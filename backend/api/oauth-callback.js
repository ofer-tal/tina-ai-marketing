/**
 * Unified OAuth Callback Handler
 *
 * Generic OAuth callback endpoint for all platforms.
 * Replaces individual callback handlers for Google, TikTok, YouTube, etc.
 *
 * Routes:
 * - GET /auth/:platform/callback - Handle OAuth callback
 *
 * Supported platforms: google, tiktok
 * Easy to add new platforms - just add to oauthManager.PLATFORM_CONFIGS
 *
 * @see backend/services/oauthManager.js
 */

import express from 'express';
import oauthManager from '../services/oauthManager.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api', 'oauth-callback');
const router = express.Router();

/**
 * GET /auth/:platform/callback
 *
 * Generic OAuth callback handler for all platforms.
 *
 * Query params expected:
 * - code: Authorization code from OAuth provider
 * - state: State parameter for CSRF protection
 * - error: Error code if authorization failed
 * - error_description: Error description if authorization failed
 *
 * @param {string} platform - Platform identifier (google, tiktok, etc.)
 */
router.get('/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error, error_description } = req.query;

  try {
    // Validate platform
    const configuredPlatforms = oauthManager.getConfiguredPlatforms();
    if (!configuredPlatforms.includes(platform)) {
      logger.error(`Unknown platform in OAuth callback`, { platform });
      return res.redirect(
        `/test-pages/oauth-callback.html?${platform}=error&error=${encodeURIComponent('Unknown platform')}`
      );
    }

    // Check if user denied authorization
    if (error) {
      logger.error(`${platform} OAuth authorization failed`, {
        error,
        error_description,
      });

      return res.redirect(
        `/test-pages/oauth-callback.html?${platform}=error&error=${encodeURIComponent(error_description || 'Authorization failed')}`
      );
    }

    // Check for authorization code
    if (!code) {
      logger.error(`${platform} OAuth callback missing authorization code`);
      return res.redirect(
        `/test-pages/oauth-callback.html?${platform}=error&error=${encodeURIComponent('No authorization code received')}`
      );
    }

    // Check for state parameter
    if (!state) {
      logger.error(`${platform} OAuth callback missing state parameter`);
      return res.redirect(
        `/test-pages/oauth-callback.html?${platform}=error&error=${encodeURIComponent('Missing state parameter')}`
      );
    }

    logger.info(`${platform} OAuth callback received`, {
      hasCode: !!code,
      state: state.substring(0, 8) + '...', // Log partial state for security
    });

    // Build full callback URL
    const protocol = req.protocol;
    const host = req.get('host');
    const originalUrl = req.originalUrl;
    const callbackUrl = `${protocol}://${host}${originalUrl}`;

    // Handle callback using unified manager
    const result = await oauthManager.handleCallback(platform, callbackUrl, state);

    if (result.success) {
      logger.info(`${platform} OAuth successful`, {
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        expiresAt: result.expiresAt?.toISOString(),
      });

      // Redirect to success page
      res.redirect(
        `/test-pages/oauth-callback.html?${platform}=success&message=${encodeURIComponent(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully!`)}`
      );
    } else {
      logger.error(`${platform} OAuth token exchange failed`, {
        error: result.error,
      });

      res.redirect(
        `/test-pages/oauth-callback.html?${platform}=error&error=${encodeURIComponent(result.error || 'Authentication failed')}`
      );
    }
  } catch (err) {
    logger.error(`${platform} OAuth callback error`, {
      error: err.message,
      stack: err.stack,
    });

    res.redirect(
      `/test-pages/oauth-callback.html?${platform}=error&error=${encodeURIComponent(err.message || 'An unexpected error occurred')}`
    );
  }
});

export default router;
