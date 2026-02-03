/**
 * Google OAuth Callback Handler
 *
 * This route handles the OAuth callback from Google after user authorization.
 * It exchanges the authorization code for an access token and stores it under platform='google'.
 *
 * This unified Google OAuth is used for:
 * - Google Sheets (for Zapier/Buffer integration)
 * - YouTube Data API
 * - Any future Google services
 *
 * Environment variables (use GOOGLE_* prefix):
 * - GOOGLE_CLIENT_ID → Google OAuth client ID
 * - GOOGLE_CLIENT_SECRET → Google OAuth client secret
 * - GOOGLE_REDIRECT_URI → OAuth callback URL
 */

import express from 'express';
import googleSheetsService from '../services/googleSheetsService.js';
import youtubeService from '../services/youtubePostingService.js';
import AuthToken from '../models/AuthToken.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api', 'google-callback');
const router = express.Router();

/**
 * GET /auth/google/callback
 * OAuth callback endpoint - receives authorization code from Google
 *
 * Query params:
 * - code: Authorization code from Google
 * - state: State parameter for CSRF protection
 * - error: Error code if authorization failed
 * - error_description: Error description if authorization failed
 * - scope: Space-separated list of scopes granted
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description, scope } = req.query;

    // Check if user denied authorization
    if (error) {
      logger.error('Google authorization failed', {
        error,
        error_description,
      });

      return res.redirect(
        '/test-pages/oauth-callback.html?google=error&error=' +
        encodeURIComponent(error_description || 'Authorization failed')
      );
    }

    // Check for authorization code
    if (!code) {
      logger.error('No authorization code received from Google');
      return res.redirect(
        '/test-pages/oauth-callback.html?google=error&error=' +
        encodeURIComponent('No authorization code received')
      );
    }

    logger.info('Received Google OAuth callback', {
      hasCode: !!code,
      hasState: !!state,
      scopes: scope,
    });

    // Detect which services based on scopes
    const scopes = scope ? scope.split(' ') : [];
    const hasYouTubeScopes = scopes.some(s => s.includes('youtube'));
    const hasSheetsScopes = scopes.some(s => s.includes('spreadsheets'));

    // Exchange code for token using the appropriate service
    let accessToken = null;
    let refreshToken = null;
    let expiresIn = null;

    if (hasSheetsScopes) {
      // Use googleSheetsService to exchange code
      logger.info('Exchanging code for token via Google Sheets service');
      const result = await googleSheetsService.exchangeCodeForToken(code, state);
      if (result.success) {
        accessToken = googleSheetsService.accessToken;
        refreshToken = googleSheetsService.refreshToken;
        logger.info('Google Sheets token obtained successfully');
      }
    } else if (hasYouTubeScopes) {
      // Use youtubeService to exchange code
      logger.info('Exchanging code for token via YouTube service');
      const result = await youtubeService.exchangeCodeForToken(code);
      if (result.success) {
        accessToken = youtubeService.accessToken;
        refreshToken = youtubeService.refreshToken;
        expiresIn = youtubeService.tokenExpiresAt;
        logger.info('YouTube token obtained successfully');
      }
    } else {
      // Default to Google Sheets for general Google OAuth
      logger.warn('No specific scopes detected, using Google Sheets service');
      const result = await googleSheetsService.exchangeCodeForToken(code, state);
      if (result.success) {
        accessToken = googleSheetsService.accessToken;
        refreshToken = googleSheetsService.refreshToken;
        logger.info('Google token obtained successfully (defaulted to Sheets service)');
      }
    }

    if (!accessToken) {
      throw new Error('Failed to obtain access token from Google');
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    // Save token to database as 'google' platform
    await AuthToken.saveToken('google', {
      accessToken,
      refreshToken,
      expiresAt,
      metadata: {
        scopes,
        hasYouTubeScopes,
        hasSheetsScopes,
        hasYouTubeApi: hasYouTubeScopes,
        hasSheetsApi: hasSheetsScopes,
      }
    });

    logger.info('Google OAuth token saved to database', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresAt,
      scopes,
    });

    // Build redirect URL to callback page
    const params = new URLSearchParams();
    params.append('google', 'success');
    params.append('message', 'Google connected successfully!');

    res.redirect(`/test-pages/oauth-callback.html?${params.toString()}`);

  } catch (err) {
    logger.error('Google OAuth callback error', {
      error: err.message,
      stack: err.stack,
    });

    res.redirect(
      '/test-pages/oauth-callback.html?google=error&error=' +
      encodeURIComponent(err.message || 'An unexpected error occurred')
    );
  }
});

export default router;
