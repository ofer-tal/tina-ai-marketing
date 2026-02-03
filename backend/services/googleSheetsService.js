/**
 * Google Sheets Service
 *
 * Handles Google OAuth authentication and Google Sheets API operations.
 * Features:
 * - OAuth 2.0 authentication flow (unified Google credentials for all Google services)
 * - Token management with robust auto-refresh capability
 * - Spreadsheet metadata retrieval
 * - Sheet enumeration and data reading
 * - Row appending for Zapier/Buffer integration
 * - Error handling and retry logic
 *
 * Uses unified Google OAuth credentials shared across all Google services:
 * - GOOGLE_CLIENT_ID → Google OAuth client ID
 * - GOOGLE_CLIENT_SECRET → Google OAuth client secret
 * - GOOGLE_REDIRECT_URI → OAuth callback URL
 */

import crypto from 'crypto';
import AuthToken from '../models/AuthToken.js';
import { getLogger } from '../utils/logger.js';
import { getValidToken, makeAuthenticatedRequest, storeOAuthTokens, getTokenStatus } from '../utils/oauthHelper.js';

const logger = getLogger('services', 'google-sheets');

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Static cache for OAuth state parameters (shared across all instances)
// Maps state parameter -> code_verifier (for PKCE if needed)
const oauthStateStore = new Map();

/**
 * Store state parameter for CSRF protection
 */
function storeOAuthState(state, additionalData = {}) {
  oauthStateStore.set(state, {
    timestamp: Date.now(),
    ...additionalData
  });
  // Auto-expire after 10 minutes
  setTimeout(() => {
    oauthStateStore.delete(state);
  }, 10 * 60 * 1000);
}

/**
 * Get and remove state parameter
 */
function getOAuthState(state) {
  const data = oauthStateStore.get(state);
  oauthStateStore.delete(state); // One-time use
  return data;
}

class GoogleSheetsService {
  constructor(config = {}) {
    // Google OAuth credentials (unified for all Google services)
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI;

    // Google Sheets configuration
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    this.sheetTabNames = process.env.GOOGLE_SHEETS_TAB_NAMES?.split(',') || [];
    this.testTabName = process.env.GOOGLE_SHEETS_TEST_TAB || 'tests';
    this.devMode = process.env.GOOGLE_SHEETS_DEV_MODE === 'true';

    // OAuth tokens
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;

    // Scopes for Google Sheets API
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets', // Read/write access
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
   * Initialize service - load tokens from database
   */
  async initialize() {
    try {
      logger.info('Loading Google tokens from database...');

      // Get 'google' platform tokens (unified Google OAuth for all services)
      const tokenDoc = await AuthToken.getActiveToken('google');

      if (tokenDoc && tokenDoc.accessToken) {
        const now = new Date();
        const expiresAt = tokenDoc.expiresAt ? new Date(tokenDoc.expiresAt) : null;
        const isExpired = expiresAt && now >= expiresAt;
        const willExpireSoon = expiresAt && (expiresAt - now) < (5 * 60 * 1000);

        if (isExpired) {
          logger.info('Stored Google token is expired, attempting refresh...');
          const refreshResult = await this._refreshStoredToken(tokenDoc);
          if (refreshResult) {
            logger.info('Google token refreshed successfully');
          } else {
            logger.warn('Failed to refresh Google token, re-authentication required');
          }
        } else if (willExpireSoon) {
          logger.info('Google token expiring soon, proactively refreshing...');
          await this._refreshStoredToken(tokenDoc);
        } else {
          this.accessToken = tokenDoc.accessToken;
          this.refreshToken = tokenDoc.refreshToken;
          this.tokenExpiresAt = expiresAt;

          logger.info('Google token loaded from database', {
            hasAccessToken: !!this.accessToken,
            hasRefreshToken: !!this.refreshToken,
            expiresAt: this.tokenExpiresAt,
          });
        }
      } else {
        logger.info('No Google token found in database');
      }
    } catch (error) {
      logger.error('Failed to load Google tokens from database', {
        error: error.message,
      });
    }
  }

  /**
   * Refresh a stored token from database
   */
  async _refreshStoredToken(tokenDoc) {
    if (!tokenDoc.refreshToken) {
      return null;
    }

    try {
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('refresh_token', tokenDoc.refreshToken);
      params.append('grant_type', 'refresh_token');

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();

      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || tokenDoc.refreshToken;
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      await AuthToken.refreshToken('google', {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.tokenExpiresAt,
      });

      return true;
    } catch (error) {
      logger.error('Failed to refresh Google token', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Test connection to Google Sheets API
   */
  async testConnection() {
    try {
      logger.info('Testing Google Sheets connection...');

      // If no in-memory token, try to reload from database
      if (!this.accessToken) {
        logger.info('No in-memory token, reloading from database...');
        const tokenDoc = await AuthToken.getActiveToken('google');

        if (tokenDoc && tokenDoc.accessToken) {
          this.accessToken = tokenDoc.accessToken;
          this.refreshToken = tokenDoc.refreshToken;
          this.tokenExpiresAt = tokenDoc.expiresAt ? new Date(tokenDoc.expiresAt) : null;

          logger.info('Loaded Google token from database for connection test', {
            hasAccessToken: !!this.accessToken,
            hasRefreshToken: !!this.refreshToken,
          });
        }
      }

      if (!this.accessToken) {
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
   */
  getAuthorizationUrl() {
    const state = this._generateState();

    // Store state for CSRF protection
    storeOAuthState(state);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state: state,
      access_type: 'offline', // Allow refresh token
      prompt: 'consent', // Force consent to get refresh token
    });

    const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    logger.info('Generated Google authorization URL', {
      state,
      scopes: this.scopes,
    });

    return url;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, state) {
    try {
      logger.info('Exchanging authorization code for access token...');

      // Verify state parameter
      const storedState = getOAuthState(state);
      if (!storedState) {
        throw new Error('Invalid or expired state parameter');
      }

      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', this.redirectUri);

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();

      await this._storeTokens(tokenData);

      logger.info('Successfully exchanged code for access token', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        expiresIn: tokenData.expires_in,
      });

      return {
        success: true,
        authenticated: true,
        data: tokenData,
      };

    } catch (error) {
      logger.error('Failed to exchange code for token', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'TOKEN_EXCHANGE_ERROR',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      logger.info('Refreshing access token...');

      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('refresh_token', this.refreshToken);
      params.append('grant_type', 'refresh_token');

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();

      await this._storeTokens(tokenData);

      logger.info('Successfully refreshed access token', {
        hasAccessToken: !!this.accessToken,
        expiresIn: tokenData.expires_in,
      });

      return {
        success: true,
        data: tokenData,
      };

    } catch (error) {
      logger.error('Failed to refresh access token', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'TOKEN_REFRESH_ERROR',
      };
    }
  }

  /**
   * Get valid access token (with auto-refresh using oauthHelper)
   */
  async getAccessToken() {
    return await getValidToken('google', async () => {
      return await this.refreshAccessToken();
    });
  }

  /**
   * Store tokens from response (saves to database for persistence)
   */
  async _storeTokens(tokenData) {
    // Update in-memory cache for quick access
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token || this.refreshToken;

    // Calculate expiration time
    if (tokenData.expires_in) {
      this.tokenExpiresAt = new Date(
        Date.now() + (tokenData.expires_in * 1000) - 60000 // Refresh 1 minute early
      );
    }

    logger.info('Tokens stored (in-memory)', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      expiresAt: this.tokenExpiresAt,
    });

    // Persist to database using oauthHelper for proper defaults
    try {
      await storeOAuthTokens('google', tokenData);
      logger.info('Google token persisted to database via oauthHelper');
    } catch (error) {
      logger.error('Failed to persist Google token to database', {
        error: error.message,
      });
    }
  }

  /**
   * Get spreadsheet metadata (with 401 retry)
   */
  async getSpreadsheet() {
    try {
      const url = `${GOOGLE_SHEETS_API_BASE}/${this.spreadsheetId}`;

      const response = await makeAuthenticatedRequest(
        url,
        {
          method: 'GET',
        },
        'google',
        async () => {
          const result = await this.refreshAccessToken();
          return {
            success: true,
            accessToken: result.accessToken || this.accessToken,
            expiresAt: result.expiresIn ? new Date(Date.now() + (result.expiresIn * 1000)) : this.tokenExpiresAt,
          };
        }
      );

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

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

      const response = await makeAuthenticatedRequest(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [values], // API expects array of rows
          }),
        },
        'google',
        async () => {
          const result = await this.refreshAccessToken();
          return {
            success: true,
            accessToken: result.accessToken || this.accessToken,
            expiresAt: result.expiresIn ? new Date(Date.now() + (result.expiresIn * 1000)) : this.tokenExpiresAt,
          };
        }
      );

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
   * Loads from database if not already in memory
   */
  async ensureConnected() {
    if (this.accessToken) {
      return; // Already connected
    }

    logger.info('ensureConnected: No in-memory token, loading from database...');

    const tokenDoc = await AuthToken.getActiveToken('google');

    if (tokenDoc && tokenDoc.accessToken) {
      // Load into memory
      this.accessToken = tokenDoc.accessToken;
      this.refreshToken = tokenDoc.refreshToken;
      this.tokenExpiresAt = tokenDoc.expiresAt ? new Date(tokenDoc.expiresAt) : null;

      logger.info('ensureConnected: Token loaded from database', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        expiresAt: this.tokenExpiresAt,
      });
    } else {
      throw new Error('No Google token found in database. Please complete Google OAuth first.');
    }
  }

  /**
   * Generate state parameter for OAuth
   */
  _generateState() {
    return 'google_oauth_state_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      success: true,
      service: 'google-sheets',
      status: 'ok',
      authenticated: !!this.accessToken,
      hasCredentials: !!(this.clientId && this.clientSecret),
      spreadsheetId: this.spreadsheetId,
      devMode: this.devMode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get connection status
   * Loads from database if no in-memory token exists
   */
  async getConnectionStatus() {
    // If no in-memory token, try to reload from database
    if (!this.accessToken) {
      try {
        const tokenDoc = await AuthToken.getActiveToken('google');

        if (tokenDoc && tokenDoc.accessToken) {
          this.accessToken = tokenDoc.accessToken;
          this.refreshToken = tokenDoc.refreshToken;
          this.tokenExpiresAt = tokenDoc.expiresAt ? new Date(tokenDoc.expiresAt) : null;

          logger.info('Loaded Google token from database for status check');
        }
      } catch (error) {
        logger.error('Failed to load Google token from database for status', {
          error: error.message,
        });
      }
    }

    return {
      connected: !!this.accessToken,
      hasSpreadsheetId: !!this.spreadsheetId,
      spreadsheetId: this.spreadsheetId,
      availableSheets: this.sheetTabNames,
      testSheet: this.testTabName,
      devMode: this.devMode,
      tokenExpiresAt: this.tokenExpiresAt,
      isExpired: this.tokenExpiresAt ? new Date() >= this.tokenExpiresAt : null,
    };
  }
}

// Export singleton instance
export default new GoogleSheetsService();
