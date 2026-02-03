/**
 * YouTube/Google OAuth Callback Handler
 *
 * This route handles the OAuth callback from Google after user authorization.
 * It detects which service (YouTube or Google Sheets) based on the scopes requested
 * and exchanges the authorization code for an access token.
 *
 * Reuses YouTube OAuth credentials for Google Sheets:
 * - YOUTUBE_CLIENT_ID → Google OAuth client ID
 * - YOUTUBE_CLIENT_SECRET → Google OAuth client secret
 * - YOUTUBE_REDIRECT_URI → OAuth callback URL
 */

import express from 'express';
import googleSheetsService from '../services/googleSheetsService.js';
import youtubeService from '../services/youtubePostingService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api', 'youtube-callback');
const router = express.Router();

/**
 * GET /auth/youtube/callback
 * OAuth callback endpoint - receives authorization code from Google
 * Handles both YouTube and Google Sheets OAuth based on scopes
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
        '/test-pages/oauth-callback.html?youtube=error&google=error&error=' +
        encodeURIComponent(error_description || 'Authorization failed')
      );
    }

    // Check for authorization code
    if (!code) {
      logger.error('No authorization code received from Google');
      return res.redirect(
        '/test-pages/oauth-callback.html?youtube=error&google=error&error=' +
        encodeURIComponent('No authorization code received')
      );
    }

    logger.info('Received Google OAuth callback', {
      hasCode: !!code,
      hasState: !!state,
      scopes: scope,
    });

    // Detect which service based on scopes
    const scopes = scope ? scope.split(' ') : [];
    const hasYouTubeScopes = scopes.some(s => s.includes('youtube'));
    const hasSheetsScopes = scopes.some(s => s.includes('spreadsheets'));

    let youtubeResult = null;
    let sheetsResult = null;

    // Handle YouTube OAuth
    if (hasYouTubeScopes) {
      logger.info('Processing YouTube OAuth callback');
      try {
        youtubeResult = await youtubeService.exchangeCodeForToken(code);
        if (youtubeResult.success) {
          logger.info('YouTube authentication successful', {
            hasAccessToken: !!youtubeService.accessToken,
          });
        }
      } catch (err) {
        logger.error('YouTube OAuth exchange failed', { error: err.message });
      }
    }

    // Handle Google Sheets OAuth
    if (hasSheetsScopes) {
      logger.info('Processing Google Sheets OAuth callback');
      try {
        sheetsResult = await googleSheetsService.exchangeCodeForToken(code, state);
        if (sheetsResult.success) {
          logger.info('Google Sheets authentication successful', {
            hasAccessToken: !!googleSheetsService.accessToken,
          });
        }
      } catch (err) {
        logger.error('Google Sheets OAuth exchange failed', { error: err.message });
      }
    }

    // Build redirect URL to callback page
    const params = new URLSearchParams();

    if (hasYouTubeScopes) {
      if (youtubeResult && youtubeResult.success) {
        params.append('youtube', 'success');
        params.append('message', 'YouTube connected successfully!');
      } else {
        params.append('youtube', 'error');
        params.append('error', youtubeResult?.error || 'YouTube authentication failed');
      }
    }

    if (hasSheetsScopes) {
      if (sheetsResult && sheetsResult.success) {
        params.append('google', 'success');
        params.append('message', 'Google Sheets connected successfully!');
      } else {
        params.append('google', 'error');
        params.append('error', sheetsResult?.error || 'Google Sheets authentication failed');
      }
    }

    // If neither succeeded, show error
    if ((!youtubeResult || !youtubeResult.success) && (!sheetsResult || !sheetsResult.success)) {
      params.append('error', 'Authentication failed');
    }

    res.redirect(`/test-pages/oauth-callback.html?${params.toString()}`);

  } catch (err) {
    logger.error('Google OAuth callback error', {
      error: err.message,
      stack: err.stack,
    });

    res.redirect(
      '/test-pages/oauth-callback.html?youtube=error&google=error&error=' +
      encodeURIComponent(err.message || 'An unexpected error occurred')
    );
  }
});

export default router;
