/**
 * OAuth API Routes
 *
 * Provides endpoints for OAuth flow initialization.
 * Replaces individual authorization URL endpoints for each platform.
 *
 * Routes:
 * - GET /api/oauth/:platform/authorize-url - Get authorization URL for a platform
 * - GET /api/oauth/status - Get OAuth status for all platforms
 * - GET /api/oauth/:platform/status - Get OAuth status for a specific platform
 *
 * @see backend/services/oauthManager.js
 */

import express from 'express';
import oauthManager from '../services/oauthManager.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api', 'oauth');
const router = express.Router();

/**
 * GET /api/oauth/:platform/authorize-url
 *
 * Generate OAuth authorization URL for any platform.
 *
 * Query params:
 * - scopes: Comma-separated list of scopes (optional, uses default if not provided)
 *
 * @param {string} platform - Platform identifier (google, tiktok, etc.)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     authorizationUrl: string,
 *     state: string
 *   }
 * }
 */
router.get('/:platform/authorize-url', async (req, res) => {
  try {
    const { platform } = req.params;
    const { scopes } = req.query;

    // Validate platform
    const configuredPlatforms = oauthManager.getConfiguredPlatforms();
    if (!configuredPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Unknown platform: ${platform}. Configured platforms: ${configuredPlatforms.join(', ')}`,
      });
    }

    // Parse scopes if provided
    const scopeArray = scopes ? scopes.split(',').map(s => s.trim()) : null;

    // Generate authorization URL
    const { authUrl, state } = await oauthManager.getAuthorizationUrl(platform, scopeArray);

    logger.info(`Generated authorization URL for ${platform}`, {
      state: state.substring(0, 8) + '...',
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        state,
        platform,
      },
    });
  } catch (error) {
    logger.error('Failed to generate authorization URL', {
      platform: req.params.platform,
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
 * GET /api/oauth/status
 *
 * Get OAuth status for all configured platforms.
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     google: { configured: true, authenticated: true },
 *     tiktok: { configured: true, authenticated: false },
 *     ...
 *   }
 * }
 */
router.get('/status', async (req, res) => {
  try {
    const platforms = await oauthManager.healthCheck();

    res.json({
      success: true,
      data: platforms,
    });
  } catch (error) {
    logger.error('Failed to get OAuth status', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/oauth/:platform/status
 *
 * Get OAuth status for a specific platform.
 *
 * @param {string} platform - Platform identifier
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     configured: true,
 *     authenticated: true,
 *     hasToken: true,
 *     tokenExpiresAt: Date
 *   }
 * }
 */
router.get('/:platform/status', async (req, res) => {
  try {
    const { platform } = req.params;

    const configured = await oauthManager.isConfigured(platform);
    if (!configured) {
      return res.status(400).json({
        success: false,
        error: `Platform ${platform} is not configured`,
      });
    }

    const authenticated = await oauthManager.isAuthenticated(platform);
    const token = await oauthManager.getToken(platform);

    res.json({
      success: true,
      data: {
        configured: true,
        authenticated,
        hasToken: !!token,
        tokenExpiresAt: token?.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Failed to get platform OAuth status', {
      platform: req.params.platform,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/oauth/:platform/refresh
 *
 * Manually trigger token refresh for a platform.
 *
 * @param {string} platform - Platform identifier
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     accessToken: string,
 *     refreshToken: string,
 *     expiresAt: Date
 *   }
 * }
 */
router.post('/:platform/refresh', async (req, res) => {
  try {
    const { platform } = req.params;

    // Check if platform is authenticated
    const authenticated = await oauthManager.isAuthenticated(platform);
    if (!authenticated) {
      return res.status(400).json({
        success: false,
        error: `Platform ${platform} is not authenticated`,
      });
    }

    // Get fetch wrapper which will handle refresh
    const fetchWrapper = oauthManager.getFetchWrapper(platform);
    const refreshedToken = await fetchWrapper.refreshToken();

    logger.info(`Manual token refresh successful for ${platform}`, {
      hasAccessToken: !!refreshedToken.accessToken,
      expiresAt: new Date(refreshedToken.expiresAt).toISOString(),
    });

    res.json({
      success: true,
      data: {
        accessToken: refreshedToken.accessToken,
        refreshToken: refreshedToken.refreshToken,
        expiresAt: new Date(refreshedToken.expiresAt),
      },
    });
  } catch (error) {
    logger.error('Failed to refresh token', {
      platform: req.params.platform,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
