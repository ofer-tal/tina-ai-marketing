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
    // CRITICAL: OAuth2Client needs the FULL token endpoint URL for refresh to work
    // The library does NOT append the tokenEndpoint to server - it uses tokenEndpoint directly
    server: 'https://open.tiktokapis.com/v2',
    authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize',
    clientId: process.env.TIKTOK_APP_KEY,
    clientSecret: process.env.TIKTOK_APP_SECRET,
    redirectUri: process.env.TIKTOK_REDIRECT_URI,
    defaultScopes: ['video.upload', 'video.publish'],
    // TikTok REQUIRES PKCE
    usePkce: true,
    // CRITICAL: Must be FULL URL for OAuth2Client.refreshToken() to work
    tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
  },
  instagram: {
    server: 'https://graph.facebook.com/v18.0',
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.INSTAGRAM_APP_ID,
    clientSecret: process.env.INSTAGRAM_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
    // NOTE: instagram_basic was deprecated Dec 2024 with Instagram Basic Display API
    // However, it may still be required for Instagram Business Account connection
    // Only using approved permissions - pages_manage_posts and pages_read_user_content
    // require app review and are not available in development mode
    defaultScopes: [
      'instagram_basic',  // Required for Instagram Business Account connection
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_read_engagement',
      'pages_show_list',
    ],
    // Instagram/Facebook uses standard OAuth2
    usePkce: false,
    // Custom token endpoint for Facebook OAuth
    tokenEndpoint: '/oauth/access_token',
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
        const clientConfig = {
          server: config.server,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authorizationEndpoint: config.authorizationEndpoint,
        };

        // Add custom token endpoint if configured
        if (config.tokenEndpoint) {
          clientConfig.tokenEndpoint = config.tokenEndpoint;
        }

        const client = new OAuth2Client(clientConfig);

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
   *
   * CRITICAL FOR TIKTOK: TikTok uses non-standard parameter names (client_key vs client_id)
   * so we use a custom wrapper that handles manual token refresh
   */
  getFetchWrapper(platform) {
    if (this.fetchWrappers.has(platform)) {
      return this.fetchWrappers.get(platform);
    }

    const client = this.clients.get(platform);
    if (!client) {
      throw new Error(`OAuth client for ${platform} not configured`);
    }

    // TikTok needs custom wrapper due to non-standard parameter names
    if (platform === 'tiktok') {
      return this._getTikTokFetchWrapper();
    }

    const fetchWrapper = new OAuth2Fetch({
      client: client,

      // Get initial token from database
      getNewToken: async () => {
        const token = await AuthToken.getActiveToken(platform);
        if (token && token.accessToken) {
          logger.debug(`Retrieved stored token for ${platform}`, {
            hasRefreshToken: !!token.refreshToken,
            expiresAt: token.expiresAt?.toISOString(),
            isActive: token.isActive,
          });
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
        logger.info(`[OAUTH] Token refresh callback - storing new token for ${platform}`, {
          hasAccessToken: !!token.accessToken,
          hasRefreshToken: !!token.refreshToken,
          expiresAt: new Date(token.expiresAt).toISOString(),
        });

        // Use refreshToken method to UPDATE existing token (preserves isActive and metadata)
        const activeToken = await AuthToken.getActiveToken(platform);
        if (activeToken) {
          await AuthToken.refreshToken(platform, {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken || activeToken.refreshToken,
            expiresAt: new Date(token.expiresAt),
          });
        } else {
          // No active token exists, create new one (shouldn't happen during refresh)
          logger.warn(`[OAUTH] No active token found during refresh, creating new token for ${platform}`);
          await AuthToken.saveToken(platform, {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: new Date(token.expiresAt),
          });
        }
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
          errorName: error.name,
          isAuthError: error.message?.includes('access_token') || error.message?.includes('unauthorized'),
        });

        // If this is an auth error, invalidate the cached fetch wrapper
        // This forces a fresh token load on next request
        if (error.message?.includes('access_token') ||
            error.message?.includes('unauthorized') ||
            error.message?.includes('invalid') ||
            error.message?.includes('401')) {
          logger.warn(`[OAUTH] Auth error detected, invalidating fetch wrapper for ${platform}`);
          this.fetchWrappers.delete(platform);
        }
      },
    });

    this.fetchWrappers.set(platform, fetchWrapper);
    logger.debug(`OAuth2Fetch wrapper created for ${platform}`);
    return fetchWrapper;
  }

  /**
   * Custom fetch wrapper for TikTok that handles manual token refresh
   *
   * TikTok uses non-standard parameter names:
   * - client_key instead of client_id
   * - client_secret instead of client_secret (this one is standard)
   * - The OAuth2Client library can't handle this, so we implement custom refresh
   *
   * @returns {Object} Fetch wrapper with token refresh
   */
  _getTikTokFetchWrapper() {
    const config = PLATFORM_CONFIGS.tiktok;
    const self = this; // Capture `this` for use in async function

    const wrapper = {
      /**
       * Make authenticated fetch request with auto-refresh
       */
      fetch: async function(url, options = {}) {
        // Get current token
        let token = await AuthToken.getActiveToken('tiktok');
        if (!token) {
          throw new Error('No TikTok token found. Please re-authenticate.');
        }

        // Check if token needs refresh (expired or expires within 5 minutes)
        const now = new Date();
        const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
        const needsRefresh = !expiresAt || now >= new Date(expiresAt.getTime() - 5 * 60 * 1000);

        if (needsRefresh && token.refreshToken) {
          logger.info('[TIKTOK] Token expired or expiring soon, refreshing...', {
            expiresAt: expiresAt?.toISOString(),
            now: now.toISOString()
          });

          try {
            const newTokenData = await self._refreshTikTokToken(token.refreshToken);

            // Update the token in database
            token = await AuthToken.refreshToken('tiktok', {
              accessToken: newTokenData.accessToken,
              refreshToken: newTokenData.refreshToken || token.refreshToken,
              expiresAt: newTokenData.expiresAt,
            });

            logger.info('[TIKTOK] Token refresh successful', {
              newExpiresAt: newTokenData.expiresAt.toISOString(),
            });
          } catch (refreshError) {
            logger.error('[TIKTOK] Token refresh failed', {
              error: refreshError.message,
            });
            throw new Error(`TikTok token refresh failed: ${refreshError.message}. Please re-authenticate.`);
          }
        }

        // Add Bearer token to request
        const authOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token.accessToken}`,
          },
        };

        const response = await fetch(url, authOptions);

        // Handle 401 errors - token might have been revoked
        if (response.status === 401) {
          logger.warn('[TIKTOK] Got 401 response, attempting token refresh...');

          if (token.refreshToken) {
            try {
              const newTokenData = await self._refreshTikTokToken(token.refreshToken);
              token = await AuthToken.refreshToken('tiktok', {
                accessToken: newTokenData.accessToken,
                refreshToken: newTokenData.refreshToken || token.refreshToken,
                expiresAt: newTokenData.expiresAt,
              });

              // Retry the request with new token
              authOptions.headers['Authorization'] = `Bearer ${token.accessToken}`;
              return await fetch(url, authOptions);
            } catch (retryError) {
              logger.error('[TIKTOK] Retry after 401 also failed', {
                error: retryError.message,
              });
              throw new Error(`TikTok authentication failed. Please re-authenticate.`);
            }
          } else {
            throw new Error('TikTok authentication failed and no refresh token available. Please re-authenticate.');
          }
        }

        return response;
      },
    };

    this.fetchWrappers.set('tiktok', wrapper);
    return wrapper;
  }

  /**
   * Manually refresh TikTok token using correct parameter names
   *
   * TikTok requires:
   * - client_key (not client_id)
   * - client_secret
   * - grant_type=refresh_token
   * - refresh_token
   *
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresAt: Date}>}
   */
  async _refreshTikTokToken(refreshToken) {
    const config = PLATFORM_CONFIGS.tiktok;
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';

    const params = new URLSearchParams();
    params.append('client_key', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    logger.info('[TIKTOK] Manually refreshing token', {
      hasRefreshToken: !!refreshToken,
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
      logger.error('[TIKTOK] Token refresh failed', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`TikTok token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // TikTok returns data in a nested structure
    const accessToken = data.access_token || data.data?.access_token;
    const newRefreshToken = data.refresh_token || data.data?.refresh_token;
    const expiresInSeconds = data.expires_in || data.data?.expires_in;

    if (!accessToken) {
      logger.error('[TIKTOK] Token refresh response missing access_token', {
        responseKeys: Object.keys(data),
      });
      throw new Error('Token refresh response missing access_token');
    }

    const expiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

    logger.info('[TIKTOK] Token refreshed successfully', {
      expiresAt: expiresAt.toISOString(),
      hasNewRefreshToken: !!newRefreshToken,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken || refreshToken,
      expiresAt,
    };
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

      // Debug: log the full token object to see what we're working with
      logger.info(`[OAUTH] Token object received from OAuth2 client`, {
        platform,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        expiresAt: token.expiresAt,
        expiresAtType: typeof token.expiresAt,
        expiresAtIsDate: token.expiresAt instanceof Date,
        tokenKeys: Object.keys(token),
        // Facebook short-lived tokens last ~60 days, let's use that if expiresAt is missing
      });

      // Handle missing or invalid expiresAt (Facebook tokens often don't include this in response)
      // Default to 60 days for Facebook short-lived access tokens
      let expiresAt = token.expiresAt;
      if (!expiresAt || expiresAt === 0 || new Date(expiresAt).getFullYear() < 2025) {
        expiresAt = Date.now() + (60 * 24 * 60 * 60 * 1000); // 60 days from now
        logger.info(`[OAUTH] Invalid expiresAt detected, using default 60 days`, {
          originalExpiresAt: token.expiresAt,
          newExpiresAt: new Date(expiresAt).toISOString(),
        });
      }

      // Store token to database
      const savedToken = await AuthToken.saveToken(platform, {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: new Date(expiresAt),
      });

      // Clean up state
      await this.deleteOAuthState(platform, state);

      logger.info(`OAuth callback successful for ${platform}`, {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      // For Instagram: discover business account immediately after OAuth
      // This retrieves and stores the Instagram User ID needed for posting
      if (platform === 'instagram') {
        try {
          const { default: instagramPostingService } = await import('./instagramPostingService.js');
          const discoveryResult = await instagramPostingService.discoverBusinessAccount();

          if (discoveryResult.success && discoveryResult.businessAccount) {
            // Store Instagram User ID in token metadata for persistence
            savedToken.metadata = savedToken.metadata || {};
            savedToken.metadata.instagramUserId = discoveryResult.businessAccount.id;
            savedToken.metadata.instagramUsername = discoveryResult.businessAccount.username;
            savedToken.metadata.pageId = discoveryResult.pageId;
            await savedToken.save();

            logger.info('Instagram business account discovered and stored after OAuth', {
              instagramUserId: discoveryResult.businessAccount.id,
              username: discoveryResult.businessAccount.username,
            });
          } else {
            logger.warn('Instagram business account discovery failed after OAuth', {
              error: discoveryResult.error,
              code: discoveryResult.code,
            });
          }
        } catch (discoverError) {
          logger.error('Failed to discover Instagram business account after OAuth', {
            error: discoverError.message,
          });
        }
      }

      // Invalidate any cached fetch wrapper to force reload with new token
      this.fetchWrappers.delete(platform);

      return {
        success: true,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: new Date(expiresAt),
      };
    } catch (error) {
      // Enhanced error logging for Instagram/Facebook OAuth
      logger.error(`OAuth callback failed for ${platform}`, {
        error: error.message,
        errorMessage: String(error),
        errorName: error.name,
        errorCode: error.code,
        errorData: error.data,
        responseBody: error.response?.body,
        responseStatus: error.response?.status,
        stack: error.stack,
      });

      // Clean up state even on error
      await this.deleteOAuthState(platform, state);

      return {
        success: false,
        error: `${error.name}: ${error.message}${error.response?.body ? ' - ' + JSON.stringify(error.response.body) : ''}`,
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
      accessTokenLength: token?.accessToken?.length || 0,
    });

    if (!token) {
      logger.warn(`[OAUTH] ${platform} NOT authenticated - no token found in database`);
      return false;
    }

    if (!token.accessToken) {
      logger.warn(`[OAUTH] ${platform} NOT authenticated - token exists but no accessToken`);
      return false;
    }

    if (!token.isActive) {
      logger.warn(`[OAUTH] ${platform} NOT authenticated - token exists but isActive=false`);
      return false;
    }

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
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

      if (now >= expiresAt) {
        logger.error(`[OAUTH] ${platform} NOT authenticated - token expired and NO refresh token`, {
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          expiredSince: `${Math.abs(hoursUntilExpiry).toFixed(2)} hours`,
        });
        return false;
      }

      // Warn if token expires soon (less than 24 hours)
      if (hoursUntilExpiry < 24) {
        logger.warn(`[OAUTH] ${platform} token expiring soon`, {
          expiresAt: expiresAt.toISOString(),
          hoursRemaining: hoursUntilExpiry.toFixed(2),
          hasRefreshToken: false,
        });
      }
    }

    logger.info(`[OAUTH] ${platform} is authenticated (valid access token)`);
    return true;
  }

  /**
   * Get detailed token status for debugging
   * Returns comprehensive status of the platform's authentication
   */
  async getTokenStatus(platform) {
    const allTokens = await AuthToken.find({ platform }).sort({ createdAt: -1 });
    const activeToken = allTokens.find(t => t.isActive);

    const now = new Date();
    const isExpired = activeToken?.expiresAt ? new Date(activeToken.expiresAt) < now : false;
    const expiresInSeconds = activeToken?.expiresAt
      ? Math.floor((new Date(activeToken.expiresAt).getTime() - now.getTime()) / 1000)
      : null;

    return {
      platform,
      hasAnyTokens: allTokens.length > 0,
      totalTokens: allTokens.length,
      hasActiveToken: !!activeToken,
      activeToken: activeToken ? {
        id: activeToken._id.toString(),
        isActive: activeToken.isActive,
        hasAccessToken: !!activeToken.accessToken,
        accessTokenLength: activeToken.accessToken?.length || 0,
        hasRefreshToken: !!activeToken.refreshToken,
        refreshTokenLength: activeToken.refreshToken?.length || 0,
        expiresAt: activeToken.expiresAt?.toISOString(),
        isExpired,
        expiresInSeconds,
        expiresHuman: expiresInSeconds
          ? expiresInSeconds < 0
            ? `expired ${Math.abs(expiresInSeconds / 60).toFixed(0)} minutes ago`
            : expiresInSeconds < 3600
              ? `in ${Math.floor(expiresInSeconds / 60)} minutes`
              : `in ${Math.floor(expiresInSeconds / 3600)} hours`
          : 'unknown',
        lastRefreshedAt: activeToken.lastRefreshedAt?.toISOString(),
        createdAt: activeToken.createdAt?.toISOString(),
      } : null,
      inactiveTokens: allTokens.filter(t => !t.isActive).map(t => ({
        id: t._id.toString(),
        deactivatedAt: t.deactivatedAt?.toISOString(),
        expiresAt: t.expiresAt?.toISOString(),
      })),
    };
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
      state: state,
      fullKey: key,
      found: !!data,
      totalStatesStored: oauthStateStore.size,
      allKeys: Array.from(oauthStateStore.keys()),
    });

    if (!data) {
      logger.warn(`[OAUTH] State not found for ${platform}`, {
        state,
        lookingFor: key,
        availableKeys: Array.from(oauthStateStore.keys()),
        platform,
      });
      return null;
    }

    // Check if state is too old (more than 30 minutes)
    const age = Date.now() - data.timestamp;
    const ageSeconds = Math.floor(age / 1000);
    if (age > 30 * 60 * 1000) {
      oauthStateStore.delete(key);
      logger.warn(`[OAUTH] State expired for ${platform}`, { state, ageSeconds });
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
