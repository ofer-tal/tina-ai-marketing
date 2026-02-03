/**
 * OAuth Token Management Helper
 *
 * Provides robust token refresh logic for all OAuth services.
 * Features:
 * - Automatic token refresh on expiry
 * - 401 error handling with retry
 * - Fallback when expiresAt is not set
 * - Database persistence via AuthToken model
 *
 * Usage:
 *   import { getValidToken, makeAuthenticatedRequest } from '../utils/oauthHelper.js';
 *
 *   const token = await getValidToken('google', () => refreshGoogleToken());
 *   const data = await makeAuthenticatedRequest(url, options, 'google', () => refreshGoogleToken());
 */

import AuthToken from '../models/AuthToken.js';
import { getLogger } from './logger.js';

const logger = getLogger('utils', 'oauth-helper');

// Token expiry defaults (in milliseconds)
const DEFAULT_TOKEN_LIFETIME = 3600000; // 1 hour
const REFRESH_THRESHOLD = 300000; // 5 minutes - refresh proactively
const TOKEN_STALE_THRESHOLD = 7200000; // 2 hours - if no expiresAt, consider token stale after this

/**
 * Get a valid access token for a platform.
 * Handles automatic refresh if token is expired or stale.
 *
 * @param {string} platform - Platform identifier ('google', 'tiktok', 'instagram', etc.)
 * @param {Function} refreshFn - Function to call for refreshing token (returns { accessToken, refreshToken?, expiresAt? })
 * @returns {Promise<string>} Valid access token
 */
export async function getValidToken(platform, refreshFn) {
  const now = Date.now();

  // Load token from database
  const tokenDoc = await AuthToken.getActiveToken(platform);

  if (!tokenDoc || !tokenDoc.accessToken) {
    throw new Error(`No access token found for platform: ${platform}. Please authenticate.`);
  }

  let accessToken = tokenDoc.accessToken;
  let needsRefresh = false;

  // Determine if token needs refresh
  if (tokenDoc.expiresAt) {
    const expiresAt = new Date(tokenDoc.expiresAt).getTime();
    // Refresh if expired or expiring soon
    if (now >= expiresAt - REFRESH_THRESHOLD) {
      logger.info(`Token for ${platform} is expiring or expired, refreshing...`, {
        expiresAt: new Date(tokenDoc.expiresAt).toISOString(),
        timeUntilExpiry: expiresAt - now
      });
      needsRefresh = true;
    }
  } else {
    // No expiresAt set - check if token is stale (created > 2 hours ago)
    const createdAt = new Date(tokenDoc.createdAt || tokenDoc.updatedAt).getTime();
    if (now - createdAt > TOKEN_STALE_THRESHOLD) {
      logger.info(`Token for ${platform} has no expiry and is stale, refreshing...`, {
        createdAt: new Date(createdAt).toISOString(),
        age: Math.round((now - createdAt) / 1000 / 60) + ' minutes'
      });
      needsRefresh = true;
    }
  }

  // Refresh if needed
  if (needsRefresh && refreshFn) {
    try {
      logger.info(`Refreshing token for ${platform}...`);
      const refreshResult = await refreshFn();

      if (!refreshResult.success || !refreshResult.accessToken) {
        throw new Error(refreshResult.error || 'Token refresh failed');
      }

      accessToken = refreshResult.accessToken;

      // Update database with new token
      const updateData = {
        accessToken,
        lastRefreshedAt: new Date(),
      };

      if (refreshResult.refreshToken) {
        updateData.refreshToken = refreshResult.refreshToken;
      }

      if (refreshResult.expiresAt) {
        updateData.expiresAt = refreshResult.expiresAt;
      } else {
        // Default to 1 hour from now if not provided
        updateData.expiresAt = new Date(now + DEFAULT_TOKEN_LIFETIME);
      }

      await AuthToken.refreshToken(platform, updateData);

      logger.info(`Token refreshed successfully for ${platform}`, {
        hasRefreshToken: !!refreshResult.refreshToken,
        expiresAt: updateData.expiresAt.toISOString()
      });
    } catch (error) {
      logger.error(`Failed to refresh token for ${platform}`, {
        error: error.message
      });
      throw new Error(`Failed to refresh ${platform} token: ${error.message}`);
    }
  }

  return accessToken;
}

/**
 * Make an authenticated API request with automatic token refresh on 401.
 *
 * @param {string} url - API URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {string} platform - Platform identifier
 * @param {Function} refreshFn - Function to call for refreshing token
 * @param {object} authHeaderOpts - Options for auth header (default: { header: 'Authorization', prefix: 'Bearer ' })
 * @returns {Promise<Response>} Fetch response
 */
export async function makeAuthenticatedRequest(
  url,
  options = {},
  platform,
  refreshFn,
  authHeaderOpts = {}
) {
  const authHeader = authHeaderOpts.header || 'Authorization';
  const authPrefix = authHeaderOpts.prefix || 'Bearer ';

  // Default options
  const requestOptions = {
    method: 'GET',
    ...options,
    headers: {
      ...options.headers,
    },
  };

  // Helper to make request with current token
  async function requestWithToken(attempt = 1) {
    const token = await getValidToken(platform, refreshFn);
    requestOptions.headers[authHeader] = `${authPrefix}${token}`;

    logger.debug(`Making ${requestOptions.method} request to ${url}`, {
      platform,
      attempt,
      hasAuth: !!requestOptions.headers[authHeader]
    });

    const response = await fetch(url, requestOptions);

    // Handle 401 Unauthorized - refresh and retry once
    if (response.status === 401 && attempt === 1) {
      logger.warn(`Received 401 from ${platform} API, invalidating token and retrying...`, {
        url
      });

      // Force refresh by clearing expiresAt
      await AuthToken.refreshToken(platform, {
        expiresAt: new Date(Date.now() - 1000) // Set to past to trigger refresh
      });

      // Retry with fresh token
      return requestWithToken(attempt + 1);
    }

    return response;
  }

  return requestWithToken();
}

/**
 * Store OAuth tokens to database with proper defaults.
 *
 * @param {string} platform - Platform identifier
 * @param {object} tokenData - Token data from OAuth exchange
 * @returns {Promise<void>}
 */
export async function storeOAuthTokens(platform, tokenData) {
  const now = Date.now();

  // Calculate expiresAt with fallback
  let expiresAt = tokenData.expiresAt;
  if (tokenData.expires_in) {
    expiresAt = new Date(now + (tokenData.expires_in * 1000) - REFRESH_THRESHOLD);
  } else if (!expiresAt) {
    expiresAt = new Date(now + DEFAULT_TOKEN_LIFETIME);
    logger.warn(`No expiry info for ${platform}, using default 1 hour`, {
      platform
    });
  }

  const tokenRecord = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    tokenType: tokenData.token_type || 'oauth',
    lastRefreshedAt: new Date(),
    isActive: true,
  };

  // Add platform-specific fields
  if (tokenData.creatorId) tokenRecord.creatorId = tokenData.creatorId;
  if (tokenData.open_id) tokenRecord.metadata = { open_id: tokenData.open_id };
  if (tokenData.scope) tokenRecord.scope = Array.isArray(tokenData.scope) ? tokenData.scope : tokenData.scope.split(' ');

  await AuthToken.saveToken(platform, tokenRecord);

  logger.info(`Stored OAuth token for ${platform}`, {
    hasAccessToken: !!tokenRecord.accessToken,
    hasRefreshToken: !!tokenRecord.refreshToken,
    expiresAt: tokenRecord.expiresAt.toISOString(),
  });
}

/**
 * Check if a platform's token is valid and not expired.
 *
 * @param {string} platform - Platform identifier
 * @returns {Promise<object>} Token status
 */
export async function getTokenStatus(platform) {
  const tokenDoc = await AuthToken.getActiveToken(platform);

  if (!tokenDoc || !tokenDoc.accessToken) {
    return {
      valid: false,
      hasToken: false,
      reason: 'No token found',
    };
  }

  const now = Date.now();

  if (tokenDoc.expiresAt) {
    const expiresAt = new Date(tokenDoc.expiresAt).getTime();
    if (now >= expiresAt) {
      return {
        valid: false,
        hasToken: true,
        expired: true,
        reason: 'Token expired',
        canRefresh: !!tokenDoc.refreshToken,
      };
    }

    const timeUntilExpiry = expiresAt - now;
    if (timeUntilExpiry < REFRESH_THRESHOLD) {
      return {
        valid: true,
        hasToken: true,
        expiringSoon: true,
        timeUntilExpiry,
        canRefresh: !!tokenDoc.refreshToken,
      };
    }
  } else {
    // No expiresAt - check if token is stale
    const createdAt = new Date(tokenDoc.createdAt || tokenDoc.updatedAt).getTime();
    if (now - createdAt > TOKEN_STALE_THRESHOLD) {
      return {
        valid: true,
        hasToken: true,
        stale: true,
        reason: 'Token has no expiry and is old',
        canRefresh: !!tokenDoc.refreshToken,
      };
    }
  }

  return {
    valid: true,
    hasToken: true,
    canRefresh: !!tokenDoc.refreshToken,
  };
}

export default {
  getValidToken,
  makeAuthenticatedRequest,
  storeOAuthTokens,
  getTokenStatus,
};
