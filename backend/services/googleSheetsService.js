/**
 * Google Sheets Service
 *
 * Handles Google Sheets API operations using unified OAuth manager.
 * Features:
 * - OAuth authentication via oauthManager
 * - Automatic token refresh via OAuth2Fetch
 * - Spreadsheet metadata retrieval
 * - Sheet enumeration and data reading
 * - Row appending for Zapier/Buffer integration
 * - Error handling and retry logic
 *
 * Uses unified Google OAuth credentials shared across all Google services:
 * - GOOGLE_CLIENT_ID → Google OAuth client ID
 * - GOOGLE_CLIENT_SECRET → Google OAuth client secret
 * - GOOGLE_REDIRECT_URI → OAuth callback URL
 *
 * @see backend/services/oauthManager.js
 */

import AuthToken from '../models/AuthToken.js';
import { getLogger } from '../utils/logger.js';
import oauthManager from './oauthManager.js';

const logger = getLogger('services', 'google-sheets');

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

class GoogleSheetsService {
  constructor(config = {}) {
    // Google Sheets configuration
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    this.sheetTabNames = process.env.GOOGLE_SHEETS_TAB_NAMES
      ?.split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0) || [];
    this.testTabName = process.env.GOOGLE_SHEETS_TEST_TAB || 'tests';
    this.devMode = process.env.GOOGLE_SHEETS_DEV_MODE === 'true';

    // OAuth configuration (for reference)
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI;

    // Scopes for Google Sheets API
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
    ];

    logger.info('Google Sheets Service initialized', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasRedirectUri: !!this.redirectUri,
      spreadsheetId: this.spreadsheetId,
      sheetTabNames: this.sheetTabNames,
      testTabName: this.testTabName,
      devMode: this.devMode,
    });
  }

  /**
   * Initialize service - verify tokens exist
   */
  async initialize() {
    try {
      logger.info('Initializing Google Sheets service...');

      const isAuthenticated = await oauthManager.isAuthenticated('google');

      if (isAuthenticated) {
        logger.info('Google Sheets service initialized with existing token');
      } else {
        logger.info('Google Sheets service initialized - no token found, authentication required');
      }
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service', {
        error: error.message,
      });
    }
  }

  /**
   * Test connection to Google Sheets API
   */
  async testConnection() {
    try {
      logger.info('Testing Google Sheets connection...');

      // Check if authenticated
      const isAuthenticated = await oauthManager.isAuthenticated('google');
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Not authenticated - no access token. Please complete OAuth first.',
          code: 'NOT_AUTHENTICATED',
        };
      }

      // Try to get spreadsheet metadata
      const result = await this.getSpreadsheet();

      if (result.success) {
        logger.info('Google Sheets connection test successful', {
          spreadsheetId: this.spreadsheetId,
          sheetCount: result.data.sheets?.length || 0,
        });
      }

      return result;
    } catch (error) {
      logger.error('Google Sheets connection test failed', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'CONNECTION_ERROR',
      };
    }
  }

  /**
   * Get authorization URL for OAuth flow
   * @deprecated Use oauthManager.getAuthorizationUrl('google') directly
   */
  async getAuthorizationUrl() {
    // For backward compatibility, delegate to oauthManager
    const { authUrl } = await oauthManager.getAuthorizationUrl('google');
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   * @deprecated Use oauthManager.handleCallback('google', callbackUrl, state) directly
   */
  async exchangeCodeForToken(code, state) {
    // This is now handled by the unified callback handler
    // Kept for backward compatibility but should not be used
    logger.warn('exchangeCodeForToken is deprecated, use oauthManager.handleCallback instead');
    return {
      success: false,
      error: 'This method is deprecated. Use the unified OAuth callback handler.',
    };
  }

  /**
   * Refresh access token using refresh token
   * @deprecated Handled automatically by OAuth2Fetch
   */
  async refreshAccessToken() {
    // This is now handled automatically by OAuth2Fetch
    logger.warn('refreshAccessToken is deprecated, token refresh is automatic');
    return {
      success: false,
      error: 'Token refresh is now handled automatically by OAuth2Fetch',
    };
  }

  /**
   * Get valid access token (with auto-refresh via oauthManager)
   */
  async getAccessToken() {
    const token = await oauthManager.getToken('google');
    if (!token || !token.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }
    return token.accessToken;
  }

  /**
   * Get spreadsheet metadata
   * Uses oauthManager.fetch for automatic token handling
   */
  async getSpreadsheet() {
    try {
      const url = `${GOOGLE_SHEETS_API_BASE}/${this.spreadsheetId}`;

      const response = await oauthManager.fetch('google', url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get spreadsheet: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          spreadsheetId: data.spreadsheetId,
          title: data.properties?.title,
          sheets: data.sheets?.map(s => ({
            sheetId: s.properties?.sheetId,
            title: s.properties?.title,
            index: s.properties?.index,
          })) || [],
        },
      };
    } catch (error) {
      logger.error('Failed to get spreadsheet', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'SPREADSHEET_ERROR',
      };
    }
  }

  /**
   * Get list of all sheets/tabs in the spreadsheet
   */
  async getSheets() {
    try {
      const result = await this.getSpreadsheet();

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        sheets: result.data.sheets,
      };
    } catch (error) {
      logger.error('Failed to get sheets', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'SHEETS_ERROR',
      };
    }
  }

  /**
   * Read data from a sheet
   * @param {string} sheetName - Name of the sheet/tab to read
   * @param {string} range - Range to read (e.g., 'A1:Z100' or 'A1')
   */
  async readSheet(sheetName, range = 'A1:Z1000') {
    try {
      const token = await this.getAccessToken();
      const encodedRange = encodeURIComponent(`${sheetName}!${range}`);
      const url = `${GOOGLE_SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodedRange}`;

      const response = await oauthManager.fetch('google', url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to read sheet: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          range: data.range,
          majorDimension: data.majorDimension,
          values: data.values || [],
        },
      };
    } catch (error) {
      logger.error('Failed to read sheet', {
        error: error.message,
        sheetName,
      });

      return {
        success: false,
        error: error.message,
        code: 'READ_ERROR',
      };
    }
  }

  /**
   * Append a row to a sheet
   * @param {string} sheetName - Name of the sheet/tab to append to
   * @param {Array} values - Array of values to append (row data)
   */
  async appendRow(sheetName, values) {
    try {
      // In dev mode, always use test sheet
      const targetSheetName = this.devMode ? this.testTabName : sheetName;

      logger.info('Appending row to sheet', {
        sheetName: targetSheetName,
        valueCount: values.length,
        devMode: this.devMode,
      });

      const encodedRange = encodeURIComponent(`${targetSheetName}!A1:Z1`);
      const url = `${GOOGLE_SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      const response = await oauthManager.fetch('google', url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [values], // API expects array of rows
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to append row: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      logger.info('Row appended successfully', {
        updates: data.updates,
        sheetName: targetSheetName,
      });

      return {
        success: true,
        data: {
          updatedRange: data.updates?.updatedRange,
          updatedRows: data.updates?.updatedRows,
          sheetId: data.updates?.updatedSheet,
        },
        sheetName: targetSheetName,
      };
    } catch (error) {
      logger.error('Failed to append row to sheet', {
        error: error.message,
        sheetName,
      });

      return {
        success: false,
        error: error.message,
        code: 'APPEND_ERROR',
      };
    }
  }

  /**
   * Pick a random available sheet from configured tabs
   * Used for load balancing when posting to multiple sheets
   */
  pickRandomSheet() {
    if (this.sheetTabNames.length === 0) {
      return this.testTabName;
    }

    const randomIndex = Math.floor(Math.random() * this.sheetTabNames.length);
    const selectedSheet = this.sheetTabNames[randomIndex];

    logger.debug('Selected random sheet', {
      selectedSheet,
      availableSheets: this.sheetTabNames,
    });

    return selectedSheet;
  }

  /**
   * Trigger Zapier/Buffer flow by appending video URL and caption to a sheet
   * @param {string} videoUrl - Public URL of the video (S3)
   * @param {string} caption - Video caption
   * @param {Array} hashtags - Array of hashtags
   */
  async triggerZapierFlow(videoUrl, caption, hashtags = []) {
    try {
      // Build the full caption with hashtags
      const fullCaption = hashtags.length > 0
        ? `${caption}\n\n${hashtags.join(' ')}`
        : caption;

      // Pick a random sheet for load balancing
      const sheetName = this.pickRandomSheet();

      // Append row: [videoUrl, caption]
      // Zapier will parse this and send to Buffer
      const result = await this.appendRow(sheetName, [videoUrl, fullCaption]);

      if (!result.success) {
        throw new Error(result.error);
      }

      logger.info('Zapier flow triggered successfully', {
        sheetName: result.sheetName,
        videoUrl,
        captionLength: caption.length,
      });

      return {
        success: true,
        sheetName: result.sheetName,
        data: result.data,
      };
    } catch (error) {
      logger.error('Failed to trigger Zapier flow', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'ZAPIER_TRIGGER_ERROR',
      };
    }
  }

  /**
   * Ensure service has valid access token loaded
   * Now handled automatically by oauthManager
   */
  async ensureConnected() {
    const isAuthenticated = await oauthManager.isAuthenticated('google');
    if (!isAuthenticated) {
      throw new Error('No Google token found in database. Please complete Google OAuth first.');
    }
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      success: true,
      service: 'google-sheets',
      status: 'ok',
      spreadsheetId: this.spreadsheetId,
      devMode: this.devMode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get connection status
   */
  async getConnectionStatus() {
    const isAuthenticated = await oauthManager.isAuthenticated('google');

    return {
      connected: isAuthenticated,
      hasSpreadsheetId: !!this.spreadsheetId,
      spreadsheetId: this.spreadsheetId,
      availableSheets: this.sheetTabNames,
      testSheet: this.testTabName,
      devMode: this.devMode,
    };
  }
}

// Export singleton instance
export default new GoogleSheetsService();
