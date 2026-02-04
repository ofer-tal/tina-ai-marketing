/**
 * Unified OAuth Manager
 *
 * Centralized OAuth2 client management using @badgateway/oauth2-client library.
 * Features:
 * - Unified configuration for all OAuth platforms
 * - OAuth2Fetch wrapper for automatic token injection and refresh
 * - PKCE support (required for TikTok)
 * - Token storage integration with AuthToken model
 * - State parameter management for CSRF protection
 *
 * Platforms supported:
 * - google (Google Sheets, YouTube, Google Analytics)
 * - tiktok
 * - instagram (Instagram Graph API via Facebook OAuth)
 *
 * Easy to add new platforms - just add to PLATFORM_CONFIGS.
 *
 * @see https://github.com/badgateway/oauth2-client
 */

import { OAuth2Client, OAuth2Fetch, generateCodeVerifier } from '@badgateway/oauth2-client';
import crypto from 'crypto';
import AuthToken from '../models/AuthToken.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'oauth-manager');

// Platform-specific OAuth configurations
const PLATFORM_CONFIGS = {
  google: {
    server: 'https://oauth2.googleapis.com/token',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI,
    defaultScopes: ['https://www.googleapis.com/auth/spreadsheets'],
    // Google uses standard OAuth2 (no PKCE needed but supported)
    usePkce: false,
  },
  tiktok: {
    // Library will append /token to this, so we use the base API URL
    server: 'https://open.tiktokapis.com/v2',
    authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize',
    clientId: process.env.TIKTOK_APP_KEY,
    clientSecret: process.env.TIKTOK_APP_SECRET,
    redirectUri: process.env.TIKTOK_REDIRECT_URI,
    defaultScopes: ['video.upload', 'video.publish'],
    // TikTok REQUIRES PKCE
    usePkce: true,
    // Custom token endpoint (TikTok uses /oauth/token/ not /token)
    tokenEndpoint: '/oauth/token/',
  },
  instagram: {
    server: 'https://graph.facebook.com/v18.0/oauth/access_token',
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.INSTAGRAM_APP_ID,
    clientSecret: process.env.INSTAGRAM_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
    defaultScopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement', 'pages_show_list'],
    // Instagram/Facebook uses standard OAuth2
    usePkce: false,
  },
};

// In-memory state store for OAuth flow (CSRF protection)
// Maps state parameter -> { codeVerifier?, timestamp, platform }
// In production, consider using Redis for distributed systems
const oauthStateStore = new Map();

/**
 * OAuth Manager Class
 *
 * Manages OAuth2 clients and fetch wrappers for all platforms.
 * Provides unified interface for:
 * - Authorization URL generation
 * - Token exchange from authorization codes
 * - Authenticated requests with automatic token refresh
 */
class OAuthManager {
  constructor() {
    this.clients = new Map();
    this.fetchWrappers = new Map();
    this.initializeClients();
  }

  /**
   * Initialize OAuth2 clients for all configured platforms
   */
  initializeClients() {
    for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
      if (!config.clientId) {
        logger.warn(`OAuth client for ${platform} not configured (missing clientId)`);
        continue;
      }

      try {
        const client = new OAuth2Client({
          server: config.server,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authorizationEndpoint: config.authorizationEndpoint,
        });

        this.clients.set(platform, client);
        logger.info(`OAuth2 client initialized for ${platform}`);
      } catch (error) {
        logger.error(`Failed to initialize OAuth2 client for ${platform}`, {
          error: error.message,
        });
      }
    }

    // Initialize fetch wrappers lazily when first accessed
    // This ensures database connection is established
  }

  /**
   * Get or create OAuth2Fetch wrapper for a platform
   * The wrapper handles automatic token injection and refresh
   */
  getFetchWrapper(platform) {
    if (this.fetchWrappers.has(platform)) {
      return this.fetchWrappers.get(platform);
    }

    const client = this.clients.get(platform);
    if (!client) {
      throw new Error(`OAuth client for ${platform} not configured`);
    }

    const fetchWrapper = new OAuth2Fetch({
      client: client,

      // Get initial token from database
      getNewToken: async () => {
        const token = await AuthToken.getActiveToken(platform);
        if (token && token.accessToken) {
          logger.debug(`Retrieved stored token for ${platform}`);
          return {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt?.getTime(),
          };
        }
        logger.warn(`No stored token found for ${platform}`);
        return null;
      },

      // Store updated token to database (after refresh)
      storeToken: async (token) => {
        await AuthToken.saveToken(platform, {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: new Date(token.expiresAt),
        });
        logger.info(`Token stored for ${platform}`, {
          hasRefreshToken: !!token.refreshToken,
          expiresAt: new Date(token.expiresAt).toISOString(),
        });
      },

      // Get stored token for wrapper internal use
      getStoredToken: async () => {
        const token = await AuthToken.getActiveToken(platform);
        if (token) {
          return {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt?.getTime(),
          };
        }
        return null;
      },

      // Handle authentication errors
      onError: (error) => {
        logger.error(`OAuth error for ${platform}`, {
          error: error.message,
        });
      },
    });

    this.fetchWrappers.set(platform, fetchWrapper);
    logger.debug(`OAuth2Fetch wrapper created for ${platform}`);
    return fetchWrapper;
  }

  /**
   * Get OAuth2Client for a platform
   */
  getClient(platform) {
    return this.clients.get(platform);
  }

  /**
   * Generate authorization URL with PKCE (if required)
   *
   * @param {string} platform - Platform identifier
   * @param {string[]} scopes - OAuth scopes (uses default if not provided)
   * @returns {Promise<{authUrl: string, state: string}>}
   */
  async getAuthorizationUrl(platform, scopes = null) {
    logger.info(`[OAUTH] getAuthorizationUrl called for platform: ${platform}`, {
      scopes: scopes || 'using defaults',
      hasEnvVars: !!PLATFORM_CONFIGS[platform]?.clientId,
    });

    const config = PLATFORM_CONFIGS[platform];

    if (!config) {
      logger.error(`[OAUTH] No config found for platform: ${platform}`);
      throw new Error(`No configuration found for platform: ${platform}`);
    }

    logger.info(`[OAUTH] Config check for ${platform}`, {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      hasRedirectUri: !!config.redirectUri,
      usePkce: config.usePkce,
    });

    const client = this.getClient(platform);

    if (!client) {
      logger.error(`[OAUTH] OAuth client not initialized for ${platform}`, {
        clientId: config.clientId?.substring(0, 8) + '...',
      });
      throw new Error(`OAuth client for ${platform} not configured - missing credentials`);
    }

    logger.info(`[OAUTH] Client retrieved for ${platform}`);

    const state = this.generateState();
    const scope = scopes || config.defaultScopes;

    logger.info(`[OAUTH] Generated state for ${platform}`, {
      state: state.substring(0, 8) + '...',
      scopes: scope,
    });

    // Build authorization params
    const authParams = {
      redirectUri: config.redirectUri,
      scope: scope,  // Pass as array - library will join it
      state: state,
    };

    // TikTok requires response_type=code (explicit, not implied)
    if (platform === 'tiktok') {
      authParams.responseType = 'code';
    }

    // Google requires access_type=offline to get a refresh token
    // and prompt=consent to ensure the consent screen is shown
    if (platform === 'google') {
      authParams.extraParams = {
        access_type: 'offline',
        prompt: 'consent',
      };
      logger.info(`[OAUTH] Added Google offline access params`);
    }

    logger.info(`[OAUTH] Built auth params for ${platform}`, {
      redirectUri: authParams.redirectUri,
      scopeCount: Array.isArray(scope) ? scope.length : 1,
    });

    // Add PKCE for platforms that require it
    let codeVerifier = null;
    if (config.usePkce) {
      // All platforms use standard Base64URL encoding for code_verifier
      // TikTok's quirk is only in code_challenge encoding (HEX instead of Base64URL)
      codeVerifier = await generateCodeVerifier();
      authParams.codeVerifier = codeVerifier;

      logger.info(`[OAUTH] Generated PKCE code_verifier for ${platform}`, {
        encoding: 'base64url',
        length: codeVerifier.length,
        verifierPreview: codeVerifier.substring(0, 8) + '...',
      });

      // Store code verifier for callback validation
      await this.storeOAuthState(platform, state, {
        codeVerifier,
        pkceEncoding: platform === 'tiktok' ? 'hex' : 'base64url',
      });
    } else {
      // Store state without code verifier for non-PKCE flows
      await this.storeOAuthState(platform, state, {});
    }

    logger.info(`[OAUTH] Calling getAuthorizeUri for ${platform}...`);

    // Generate authorization URL
    let authUrl = await client.authorizationCode.getAuthorizeUri(authParams);

    logger.info(`[OAUTH] Generated auth URL for ${platform}`, {
      urlLength: authUrl.length,
      urlPreview: authUrl.substring(0, 100) + '...',
    });

    // TikTok-specific: TikTok has non-standard OAuth requirements
    if (platform === 'tiktok') {
      logger.info(`[OAUTH] Applying TikTok-specific conversions...`);

      // Replace client_id with client_key (TikTok uses non-standard param name)
      authUrl = authUrl.replace('client_id=', 'client_key=');
      logger.info(`[OAUTH] Converted client_id to client_key`);

      // Replace space-separated scopes with comma-separated (TikTok requirement)
      // The library encodes spaces as '+' which TikTok doesn't accept
      const beforeScope = authUrl.match(/scope=([^&]+)/)?.[1];
      authUrl = authUrl.replace(/scope=([^&]+)/, (match, scopeValue) => {
        // Replace URL-encoded spaces (%20 or +) with commas
        return 'scope=' + scopeValue.replace(/(%20|\+)/g, ',');
      });
      const afterScope = authUrl.match(/scope=([^&]+)/)?.[1];
      logger.info(`[OAUTH] Converted scopes from space to comma separated`, {
        before: beforeScope,
        after: afterScope,
      });

      // The code_challenge needs to be HEX-encoded instead of Base64URL
      // TikTok expects: HEX(SHA256(code_verifier))
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(codeVerifier).digest('hex');
      const oldChallenge = authUrl.match(/code_challenge=([^&]+)/)?.[1];
      authUrl = authUrl.replace(
        /code_challenge=[^&]+/,
        `code_challenge=${hash}`
      );
      logger.info(`[OAUTH] Converted code_challenge from Base64URL to HEX`, {
        oldLength: oldChallenge?.length,
        newLength: hash.length,
        oldPreview: oldChallenge?.substring(0, 20) + '...',
        newPreview: hash.substring(0, 20) + '...',
      });
    }

    logger.info(`[OAUTH] Final auth URL for ${platform}`, {
      state,
      urlPreview: authUrl.substring(0, 150) + '...',
    });

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for token
   *
   * @param {string} platform - Platform identifier
   * @param {string} callbackUrl - Full callback URL with query params
   * @param {string} state - State parameter from callback
   * @returns {Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date, error?: string}>}
   */
  async handleCallback(platform, callbackUrl, state) {
    const client = this.getClient(platform);
    const config = PLATFORM_CONFIGS[platform];

    if (!client) {
      throw new Error(`OAuth client for ${platform} not configured`);
    }

    // Get stored state data
    const stateData = await this.getOAuthState(platform, state);
    if (!stateData) {
      throw new Error('Invalid or expired state parameter');
    }

    try {
      // TikTok has a non-standard token endpoint path (/oauth/token/ instead of /token)
      // We need to handle it manually
      if (platform === 'tiktok') {
        logger.info(`[OAUTH] Using manual token exchange for TikTok`);

        // Parse the callback URL to get the authorization code
        const callbackUrlObj = new URL(callbackUrl);
        const code = callbackUrlObj.searchParams.get('code');

        if (!code) {
          throw new Error('No authorization code in callback');
        }

        // Build form-encoded request body for TikTok
        const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
        const params = new URLSearchParams();
        params.append('client_key', config.clientId);
        params.append('client_secret', config.clientSecret);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', config.redirectUri);
        params.append('code_verifier', stateData.codeVerifier);

        logger.info(`[OAUTH] Exchanging TikTok authorization code`, {
          hasCode: !!code,
          hasVerifier: !!stateData.codeVerifier,
        });

        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TikTok token exchange failed: ${response.status} ${errorText}`);
        }

        const token = await response.json();

        logger.info(`[OAUTH] TikTok token response received`, {
          responseType: typeof token,
          hasAccessToken: !!token.access_token,
          hasData: !!token.data,
          hasDataAccessToken: !!token.data?.access_token,
          fullKeys: Object.keys(token),
          dataKeys: token.data ? Object.keys(token.data) : [],
        });

        // TikTok returns data in a different format
        const accessToken = token.access_token || token.data?.access_token;
        const refreshToken = token.refresh_token || token.data?.refresh_token;
        const expiresInSeconds = token.expires_in || token.data?.expires_in;
        const expiresAt = expiresInSeconds
          ? new Date(Date.now() + expiresInSeconds * 1000)
          : new Date(Date.now() + 8640000); // 24 hours default

        logger.info(`[OAUTH] Extracted TikTok token data`, {
          hasAccessToken: !!accessToken,
          accessTokenLength: accessToken?.length,
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length,
          expiresInSeconds,
          expiresAt: expiresAt.toISOString(),
        });

        await AuthToken.saveToken(platform, {
          accessToken,
          refreshToken,
          expiresAt,
        });

        // Clean up state
        await this.deleteOAuthState(platform, state);

        logger.info(`TikTok OAuth callback successful`, {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          expiresAt: expiresAt.toISOString(),
        });

        // Invalidate any cached fetch wrapper to force reload with new token
        this.fetchWrappers.delete(platform);

        return {
          success: true,
          accessToken,
          refreshToken,
          expiresAt,
        };
      }

      // Standard OAuth flow for other platforms
      // Build token exchange params
      const tokenParams = {
        redirectUri: config.redirectUri,
        state: state,
      };

      // Add code verifier if using PKCE
      if (stateData.codeVerifier) {
        tokenParams.codeVerifier = stateData.codeVerifier;
      }

      // Exchange code for token
      const token = await client.authorizationCode.getTokenFromCodeRedirect(
        callbackUrl,
        tokenParams
      );

      // Store token to database
      await AuthToken.saveToken(platform, {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: new Date(token.expiresAt),
      });

      // Clean up state
      await this.deleteOAuthState(platform, state);

      logger.info(`OAuth callback successful for ${platform}`, {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        expiresAt: new Date(token.expiresAt).toISOString(),
      });

      // Invalidate any cached fetch wrapper to force reload with new token
      this.fetchWrappers.delete(platform);

      return {
        success: true,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: new Date(token.expiresAt),
      };
    } catch (error) {
      logger.error(`OAuth callback failed for ${platform}`, {
        error: error.message,
        stack: error.stack,
      });

      // Clean up state even on error
      await this.deleteOAuthState(platform, state);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Make authenticated request with automatic token refresh
   * Uses OAuth2Fetch wrapper which handles:
   * - Bearer token injection
   * - Automatic token refresh on expiry
   * - Retry on 401 responses
   *
   * @param {string} platform - Platform identifier
   * @param {string} url - API URL
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  async fetch(platform, url, options = {}) {
    const fetchWrapper = this.getFetchWrapper(platform);
    return fetchWrapper.fetch(url, options);
  }

  /**
   * Get current token for a platform
   * @returns {Promise<{accessToken?: string, refreshToken?: string, expiresAt?: Date}|null>}
   */
  async getToken(platform) {
    const token = await AuthToken.getActiveToken(platform);
    if (!token) return null;

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  }

  /**
   * Check if platform is configured and has a valid token
   */
  async isConfigured(platform) {
    return this.clients.has(platform);
  }

  /**
   * Check if platform has an active token
   * Returns true if there's a token with refresh capability (OAuth2Fetch will handle auto-refresh)
   */
  async isAuthenticated(platform) {
    const token = await AuthToken.getActiveToken(platform);

    logger.info(`[OAUTH] isAuthenticated check for ${platform}`, {
      hasToken: !!token,
      hasAccessToken: !!token?.accessToken,
      hasRefreshToken: !!token?.refreshToken,
      expiresAt: token?.expiresAt?.toISOString(),
      isActive: token?.isActive,
    });

    if (!token || !token.accessToken) return false;

    // If we have a refresh token, consider authenticated even if access token is expired
    // OAuth2Fetch will automatically refresh it when making an API call
    if (token.refreshToken) {
      logger.info(`[OAUTH] ${platform} is authenticated (has refresh token for auto-refresh)`);
      return true;
    }

    // Check if token is expired (only matters if no refresh token)
    if (token.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(token.expiresAt);
      if (now >= expiresAt) {
        logger.warn(`[OAUTH] Token expired for ${platform} and NO refresh token available`, {
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
        return false;
      }
    }

    logger.info(`[OAUTH] ${platform} is authenticated`);
    return true;
  }

  /**
   * Generate cryptographically secure state parameter
   */
  generateState() {
    const state = crypto.randomBytes(16).toString('hex');
    logger.info(`[OAUTH] Generated new state parameter`, {
      state: state.substring(0, 8) + '...',
    });
    return state;
  }

  /**
   * Store OAuth state data (for CSRF protection and PKCE)
   * Auto-expires after 30 minutes (increased from 10)
   */
  async storeOAuthState(platform, state, data = {}) {
    const key = `oauth_state_${platform}_${state}`;
    const stateData = {
      ...data,
      timestamp: Date.now(),
      platform,
    };

    oauthStateStore.set(key, stateData);

    // Auto-expire after 30 minutes (increased to handle slow user interactions)
    setTimeout(() => {
      oauthStateStore.delete(key);
      logger.debug(`OAuth state auto-expired for ${platform}`, { state: state.substring(0, 8) + '...' });
    }, 30 * 60 * 1000);

    logger.info(`[OAUTH] Stored OAuth state for ${platform}`, {
      state: state.substring(0, 8) + '...',
      fullKey: key,
      hasCodeVerifier: !!data.codeVerifier,
      dataSize: Object.keys(data).length,
      totalStatesStored: oauthStateStore.size,
    });
  }

  /**
   * Get and remove OAuth state data
   */
  async getOAuthState(platform, state) {
    const key = `oauth_state_${platform}_${state}`;
    const data = oauthStateStore.get(key);

    logger.info(`[OAUTH] Looking up OAuth state for ${platform}`, {
      state: state.substring(0, 8) + '...',
      fullKey: key,
      found: !!data,
      totalStatesStored: oauthStateStore.size,
      allKeys: Array.from(oauthStateStore.keys()).map(k => k.substring(0, 40) + '...'),
    });

    if (!data) {
      logger.warn(`[OAUTH] State not found for ${platform}`, { state: state.substring(0, 8) + '...' });
      return null;
    }

    // Check if state is too old (more than 30 minutes)
    const age = Date.now() - data.timestamp;
    const ageSeconds = Math.floor(age / 1000);
    if (age > 30 * 60 * 1000) {
      oauthStateStore.delete(key);
      logger.warn(`[OAUTH] State expired for ${platform}`, { state: state.substring(0, 8) + '...', ageSeconds });
      return null;
    }

    logger.info(`[OAUTH] State found for ${platform}`, { ageSeconds, hasCodeVerifier: !!data.codeVerifier });
    return data;
  }

  /**
   * Delete OAuth state data
   */
  async deleteOAuthState(platform, state) {
    const key = `oauth_state_${platform}_${state}`;
    oauthStateStore.delete(key);
    logger.debug(`Deleted OAuth state for ${platform}`, { state });
  }

  /**
   * Get configuration for a platform
   */
  getConfig(platform) {
    return PLATFORM_CONFIGS[platform];
  }

  /**
   * Get all configured platforms
   */
  getConfiguredPlatforms() {
    return Array.from(this.clients.keys());
  }

  /**
   * Health check for all platforms
   */
  async healthCheck() {
    const platforms = {};
    for (const platform of this.getConfiguredPlatforms()) {
      platforms[platform] = {
        configured: true,
        authenticated: await this.isAuthenticated(platform),
        hasClient: this.clients.has(platform),
      };
    }
    return platforms;
  }
}

// Export singleton instance
export default new OAuthManager();

// Export helper functions for convenience
export { generateCodeVerifier };
