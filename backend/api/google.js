/**
 * Google API Routes
 *
 * Provides endpoints for Google Sheets integration:
 * - Authorization URL generation
 * - Connection status
 * - Sheet enumeration
 * - Test connection
 */

import express from 'express';
import googleSheetsService from '../services/googleSheetsService.js';
import s3VideoUploader from '../services/s3VideoUploader.js';

const router = express.Router();

/**
 * GET /api/google/authorize-url
 * Get the Google OAuth authorization URL
 * @deprecated Use GET /api/oauth/google/authorize-url instead
 */
router.get('/authorize-url', async (req, res) => {
  try {
    const oauthManager = await import('../services/oauthManager.js');
    const { authUrl } = await oauthManager.default.getAuthorizationUrl('google');

    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/connection-status
 * Get the current Google Sheets connection status
 */
router.get('/connection-status', async (req, res) => {
  try {
    const status = await googleSheetsService.getConnectionStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/test-connection
 * Test the Google Sheets API connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const result = await googleSheetsService.testConnection();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/sheets
 * Get list of all sheets/tabs in the spreadsheet
 */
router.get('/sheets', async (req, res) => {
  try {
    const result = await googleSheetsService.getSheets();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/spreadsheet
 * Get spreadsheet metadata
 */
router.get('/spreadsheet', async (req, res) => {
  try {
    const result = await googleSheetsService.getSpreadsheet();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/read/:sheetName
 * Read data from a sheet
 */
router.get('/read/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const range = req.query.range || 'A1:Z1000';

    const result = await googleSheetsService.readSheet(sheetName, range);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/google/append/:sheetName
 * Append a row to a sheet
 * Body: { values: string[] }
 */
router.post('/append/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { values } = req.body;

    if (!Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        error: 'values must be an array',
      });
    }

    const result = await googleSheetsService.appendRow(sheetName, values);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/health
 * Health check endpoint for both Google Sheets and S3
 */
router.get('/health', (req, res) => {
  res.json({
    googleSheets: googleSheetsService.healthCheck(),
    s3Uploader: s3VideoUploader.healthCheck(),
  });
});

/**
 * GET /api/google/s3-status
 * Get S3 uploader status
 */
router.get('/s3-status', (req, res) => {
  try {
    const status = s3VideoUploader.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/test-s3
 * Test S3 connection
 */
router.get('/test-s3', async (req, res) => {
  try {
    const result = await s3VideoUploader.testConnection();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/google/revoke
 * Revoke/deactivate the current Google token
 * Use this before re-authorizing to ensure a fresh token with refresh token
 */
router.delete('/revoke', async (req, res) => {
  try {
    const { getLogger } = await import('../utils/logger.js');
    const logger = getLogger('api', 'google-revoke');
    const AuthToken = await import('../models/AuthToken.js');

    logger.info('Token revocation requested');

    const existingToken = await AuthToken.default.getActiveToken('google');

    if (!existingToken) {
      return res.status(404).json({
        success: false,
        error: 'No Google token found.'
      });
    }

    // Deactivate the token
    await AuthToken.default.updateOne(
      { _id: existingToken._id },
      { isActive: false, revokedAt: new Date() }
    );

    logger.info('Token revoked successfully', { tokenId: existingToken._id.toString() });

    return res.json({
      success: true,
      message: 'Token revoked successfully. You can now re-authorize to get a fresh token with refresh capabilities.',
    });

  } catch (error) {
    const { getLogger } = await import('../utils/logger.js');
    const logger = getLogger('api', 'google-revoke');

    logger.error('Token revocation failed', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/google/test-refresh
 * Test endpoint to manually trigger OAuth token refresh
 * Uses the unified oauthManager to refresh tokens
 */
router.post('/test-refresh', async (req, res) => {
  try {
    const { getLogger } = await import('../utils/logger.js');
    const logger = getLogger('api', 'google-test-refresh');

    logger.info('Manual token refresh requested');

    const oauthManager = await import('../services/oauthManager.js');
    const AuthToken = await import('../models/AuthToken.js');

    // Check if we have a token to refresh
    const existingToken = await AuthToken.default.getActiveToken('google');

    if (!existingToken) {
      return res.status(404).json({
        success: false,
        error: 'No Google token found. Please authenticate first.'
      });
    }

    const oldExpiresAt = existingToken.expiresAt;
    const oldAccessToken = existingToken.accessToken;
    const hadRefreshToken = !!existingToken.refreshToken;

    if (!hadRefreshToken) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token available. This usually means the token was obtained without offline access permission.',
        data: {
          hasAccessToken: !!existingToken.accessToken,
          expiresAt: oldExpiresAt,
          actionRequired: 'Please re-authorize Google to get a refresh token. Click the "Authorize with Google" button again and grant permission.'
        }
      });
    }

    // Get the fetch wrapper and trigger a manual refresh
    const fetchWrapper = oauthManager.default.getFetchWrapper('google');
    const refreshedToken = await fetchWrapper.refreshToken();

    // Get the updated token from database
    const updatedToken = await AuthToken.default.getActiveToken('google');

    logger.info('Token refresh test completed', {
      hadOldToken: !!oldAccessToken,
      hasNewToken: !!refreshedToken.accessToken,
      oldExpiresAt,
      newExpiresAt: updatedToken?.expiresAt
    });

    return res.json({
      success: true,
      message: 'Token refreshed successfully! New access token received.',
      data: {
        hadOldToken: !!oldAccessToken,
        hasNewToken: !!refreshedToken.accessToken,
        oldExpiresAt: oldExpiresAt?.toISOString() || null,
        newExpiresAt: updatedToken?.expiresAt?.toISOString() || null,
        expiresIn: updatedToken?.expiresAt
          ? Math.floor((new Date(updatedToken.expiresAt).getTime() - Date.now()) / 1000)
          : null,
        tokenChanged: oldAccessToken !== refreshedToken.accessToken
      }
    });

  } catch (error) {
    const { getLogger } = await import('../utils/logger.js');
    const logger = getLogger('api', 'google-test-refresh');

    logger.error('Token refresh test failed', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

export default router;
