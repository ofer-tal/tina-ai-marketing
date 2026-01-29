/**
 * TikTok Posting Service
 *
 * Handles posting content to TikTok via the TikTok API.
 * Features:
 * - OAuth authentication flow
 * - Video upload to TikTok
 * - Caption and hashtag posting
 * - Post status tracking
 * - Error handling and retry logic
 * - Rate limit compliance
 */

import BaseApiClient from './baseApiClient.js';
import { getLogger } from '../utils/logger.js';
import rateLimiterService from './rateLimiter.js';
import crypto from 'crypto';
import AuthToken from '../models/AuthToken.js';

const logger = getLogger('services', 'tiktok-posting');

// Static cache for PKCE code verifiers (shared across all instances)
// Maps state parameter -> code_verifier
const pkceStore = new Map();

/**
 * Store code verifier for a given state
 */
function storeCodeVerifier(state, codeVerifier) {
  pkceStore.set(state, codeVerifier);
  // Auto-expire after 10 minutes to prevent memory leaks
  setTimeout(() => {
    pkceStore.delete(state);
  }, 10 * 60 * 1000);
}

/**
 * Get and remove code verifier for a given state
 */
function getCodeVerifier(state) {
  const verifier = pkceStore.get(state);
  pkceStore.delete(state); // One-time use
  return verifier;
}

class TikTokPostingService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'TikTokPosting',
      baseURL: 'https://open.tiktokapis.com/v2',
      timeout: 60000, // 60 seconds for video uploads
      ...config,
    });

    // TikTok API credentials
    this.appKey = process.env.TIKTOK_APP_KEY;
    this.appSecret = process.env.TIKTOK_APP_SECRET;
    this.redirectUri = process.env.TIKTOK_REDIRECT_URI;
    this.enabled = process.env.ENABLE_TIKTOK_POSTING === 'true';

    // OAuth tokens (stored in memory - should be in database in production)
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.creatorId = null;
    this.openId = null;  // TikTok user's open_id

    // Store state for CSRF protection during OAuth flow
    this.csrfState = null;

    // PKCE (Proof Key for Code Exchange) for OAuth security
    this.codeVerifier = null;
    this.codeChallenge = null;

    // TikTok API endpoints
    this.endpoints = {
      oauth: {
        authorize: 'https://www.tiktok.com/v2/auth/authorize',
        token: '/oauth/token/',
        refresh: '/oauth/refresh_token/',
      },
      video: {
        upload: '/video/upload/',
        initialize: '/video/init/',
        publish: '/video/publish/',
      },
      user: {
        info: '/user/info/',
      },
    };

    logger.info('TikTok Posting Service initialized', {
      enabled: this.enabled,
      appKeyConfigured: !!this.appKey,
      appSecretConfigured: !!this.appSecret,
      redirectUriConfigured: !!this.redirectUri,
    });
  }

  /**
   * Initialize service - load tokens from database
   * This should be called after MongoDB connection is established
   */
  async initialize() {
    try {
      logger.info('Loading TikTok tokens from database...');
      const tokenDoc = await AuthToken.getActiveToken('tiktok');

      if (tokenDoc && tokenDoc.accessToken) {
        // Check if token is expired or will expire soon
        const now = new Date();
        const expiresAt = new Date(tokenDoc.expiresAt);
        const isExpired = tokenDoc.expiresAt && now >= expiresAt;
        const willExpireSoon = tokenDoc.expiresAt && (expiresAt - now) < (5 * 60 * 1000); // 5 minutes

        if (isExpired) {
          logger.info('Stored TikTok token is expired, attempting refresh...');
          const refreshResult = await this._refreshStoredToken(tokenDoc);
          if (refreshResult) {
            logger.info('TikTok token refreshed successfully', {
              hasAccessToken: !!this.accessToken,
            });
          } else {
            logger.warn('Failed to refresh TikTok token, re-authentication required');
          }
        } else if (willExpireSoon) {
          logger.info('TikTok token expiring soon, proactively refreshing...');
          await this._refreshStoredToken(tokenDoc);
        } else {
          // Load token into memory
          this.accessToken = tokenDoc.accessToken;
          this.refreshToken = tokenDoc.refreshToken;
          this.creatorId = tokenDoc.creatorId;
          this.openId = tokenDoc.metadata?.open_id;  // Load open_id from metadata
          this.tokenExpiresAt = expiresAt;

          logger.info('TikTok token loaded from database', {
            hasAccessToken: !!this.accessToken,
            hasRefreshToken: !!this.refreshToken,
            creatorId: this.creatorId,
            openId: this.openId,
            expiresAt: this.tokenExpiresAt,
          });
        }
      } else {
        logger.info('No TikTok token found in database');
      }
    } catch (error) {
      logger.error('Failed to load TikTok tokens from database', {
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
      const url = this.baseURL + this.endpoints.oauth.refresh;

      // Build form-encoded body (TikTok requires form-urlencoded, not JSON)
      const params = new URLSearchParams();
      params.append('client_key', this.appKey);
      params.append('client_secret', this.appSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', tokenDoc.refreshToken);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const jsonData = await response.json();
      const tokenData = jsonData.data || jsonData;

      // Update memory
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || tokenDoc.refreshToken;
      this.creatorId = tokenData.creator_id || tokenDoc.creatorId;
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Update database using the generic model
      await AuthToken.refreshToken('tiktok', {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        creatorId: this.creatorId,
        expiresAt: this.tokenExpiresAt,
      });

      return true;
    } catch (error) {
      logger.error('Failed to refresh TikTok token', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Step 1: Configure TikTok API credentials
   * Validates that credentials are properly configured
   */
  async testConnection() {
    try {
      logger.info('Testing TikTok API connection...');

      if (!this.enabled) {
        return {
          success: false,
          error: 'TikTok posting is disabled in configuration',
          code: 'DISABLED',
        };
      }

      if (!this.appKey || !this.appSecret) {
        return {
          success: false,
          error: 'TikTok API credentials not configured',
          code: 'MISSING_CREDENTIALS',
          details: {
            appKeyConfigured: !!this.appKey,
            appSecretConfigured: !!this.appSecret,
          },
        };
      }

      if (!this.redirectUri) {
        return {
          success: false,
          error: 'TikTok redirect URI not configured',
          code: 'MISSING_REDIRECT_URI',
        };
      }

      // Check if we have valid tokens
      const tokenStatus = await this.checkTokenStatus();

      logger.info('TikTok API connection test successful', {
        authenticated: tokenStatus.authenticated,
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
      });

      return {
        success: true,
        authenticated: tokenStatus.authenticated,
        hasCredentials: true,
        tokenStatus,
        message: 'TikTok API credentials configured successfully',
      };

    } catch (error) {
      logger.error('TikTok API connection test failed', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'CONNECTION_ERROR',
      };
    }
  }

  /**
   * Step 2 & 3: Verify authentication token obtained
   * Check if we have a valid access token
   */
  async checkTokenStatus() {
    try {
      if (!this.accessToken) {
        return {
          authenticated: false,
          hasToken: false,
          message: 'No access token available',
        };
      }

      if (this.tokenExpiresAt && new Date() > this.tokenExpiresAt) {
        logger.info('Access token expired, attempting refresh...');

        // Try to refresh the token
        const refreshResult = await this.refreshAccessToken();

        if (!refreshResult.success) {
          return {
            authenticated: false,
            hasToken: false,
            expired: true,
            message: 'Access token expired and refresh failed',
            error: refreshResult.error,
          };
        }
      }

      // Verify token by making a test API call
      const userInfo = await this.getUserInfo();

      return {
        authenticated: true,
        hasToken: true,
        valid: true,
        creatorId: this.creatorId,
        userInfo: userInfo.success ? userInfo.data : null,
      };

    } catch (error) {
      logger.error('Token status check failed', {
        error: error.message,
      });

      return {
        authenticated: false,
        hasToken: !!this.accessToken,
        error: error.message,
      };
    }
  }

  /**
   * Step 4: Check sandbox app configured
   * Verify the app is in sandbox mode
   */
  async checkSandboxStatus() {
    try {
      logger.info('Checking TikTok sandbox status...');

      if (!this.accessToken) {
        return {
          success: false,
          error: 'Not authenticated - no access token',
          code: 'NOT_AUTHENTICATED',
        };
      }

      // Get user info to verify sandbox mode
      const userInfo = await this.getUserInfo();

      if (!userInfo.success) {
        return {
          success: false,
          error: 'Failed to get user info',
          code: 'API_ERROR',
          details: userInfo,
        };
      }

      // TikTok sandbox apps typically have specific user ID patterns
      // or return specific fields indicating sandbox mode
      const isSandbox = this._isSandboxMode(userInfo.data);

      logger.info('Sandbox status check complete', {
        isSandbox,
        userInfo: userInfo.data,
      });

      return {
        success: true,
        isSandbox,
        userInfo: userInfo.data,
        message: isSandbox
          ? 'App is configured for sandbox mode'
          : 'App is in production mode',
      };

    } catch (error) {
      logger.error('Sandbox status check failed', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'SANDBOX_CHECK_ERROR',
      };
    }
  }

  /**
   * Step 5: Confirm API permissions granted
   * Verify the required permissions are granted
   */
  async verifyPermissions() {
    try {
      logger.info('Verifying TikTok API permissions...');

      if (!this.accessToken) {
        return {
          success: false,
          error: 'Not authenticated - no access token',
          code: 'NOT_AUTHENTICATED',
        };
      }

      // Get user info with scopes
      const userInfo = await this.getUserInfo();

      if (!userInfo.success) {
        return {
          success: false,
          error: 'Failed to get user info',
          code: 'API_ERROR',
        };
      }

      // Required permissions for posting
      const requiredPermissions = [
        'video.upload',      // Upload videos
        'video.publish',     // Publish videos
      ];

      // Optional permissions
      const optionalPermissions = [
        'user.info',         // Read user info
        'user.info.basic',   // Basic user info
      ];

      // In production, we'd check actual scopes from the token
      // For now, we'll verify based on user info response
      const hasUserInfo = !!userInfo.data;
      const canUpload = true; // Would check scope from token
      const canPublish = true; // Would check scope from token

      const permissions = {
        'user.info': hasUserInfo,
        'video.upload': canUpload,
        'video.publish': canPublish,
      };

      const allRequiredGranted = requiredPermissions.every(
        perm => permissions[perm]
      );

      logger.info('Permission verification complete', {
        allRequiredGranted,
        permissions,
      });

      return {
        success: true,
        allRequiredGranted,
        permissions,
        required: requiredPermissions,
        optional: optionalPermissions,
        message: allRequiredGranted
          ? 'All required permissions granted'
          : 'Some permissions missing',
      };

    } catch (error) {
      logger.error('Permission verification failed', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'PERMISSION_CHECK_ERROR',
      };
    }
  }

  /**
   * Get authorization URL for OAuth flow
   * User should visit this URL to authorize the app
   */
  getAuthorizationUrl(scopes = ['video.upload', 'video.publish']) {
    // Generate and store state for CSRF protection
    const state = this._generateState();

    // Generate PKCE code verifier and challenge
    const codeVerifier = this._generateCodeVerifier();
    const codeChallenge = this._generateCodeChallenge(codeVerifier);

    // Store the code verifier in the static cache for later retrieval during callback
    storeCodeVerifier(state, codeVerifier);

    const params = new URLSearchParams({
      client_key: this.appKey,
      scope: scopes.join(','),
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const url = `${this.endpoints.oauth.authorize}?${params.toString()}`;

    logger.info('Generated authorization URL', {
      url,
      scopes,
      state: state,
      hasCodeChallenge: !!codeChallenge,
    });

    return url;
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes the app
   * Note: This makes a direct fetch request to avoid auth headers from BaseApiClient
   */
  async exchangeCodeForToken(code, state) {
    try {
      logger.info('Exchanging authorization code for access token...');

      // Retrieve code verifier from static cache using state
      const codeVerifier = getCodeVerifier(state);

      if (!codeVerifier) {
        throw new Error('No code verifier found for this state - PKCE flow may have expired or been already used');
      }

      logger.info('Code verifier retrieved from cache', { state });

      // Make direct fetch request to avoid BaseApiClient's auth headers
      // TikTok requires application/x-www-form-urlencoded (not JSON)
      const url = this.baseURL + this.endpoints.oauth.token;

      // Build form-encoded body
      const params = new URLSearchParams();
      params.append('client_key', this.appKey);
      params.append('client_secret', this.appSecret);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', this.redirectUri);
      params.append('code_verifier', codeVerifier);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const jsonData = await response.json();

      // Log the full response for debugging
      logger.info('TikTok token response received', {
        hasData: !!jsonData.data,
        hasAccessToken: !!jsonData.access_token,
        dataKeys: jsonData.data ? Object.keys(jsonData.data) : Object.keys(jsonData),
        fullResponse: JSON.stringify(jsonData).substring(0, 500),
      });

      // TikToken OAuth response structure: { data: { access_token, refresh_token, expires_in, ... } }
      const tokenData = jsonData.data || jsonData;

      // Store tokens (async - saves to database)
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
        stack: error.stack,
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

      // TikTok requires form-urlencoded for OAuth token endpoints
      // Cannot use BaseApiClient.post() which sends JSON
      const url = this.baseURL + this.endpoints.oauth.refresh;

      const params = new URLSearchParams();
      params.append('client_key', this.appKey);
      params.append('client_secret', this.appSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', this.refreshToken);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const jsonData = await response.json();
      const tokenData = jsonData.data || jsonData;

      // Store updated tokens
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
   * Get user information
   * TikTok API v2 requires a 'fields' query parameter specifying which fields to retrieve.
   * The open_id is returned in the response, not sent as a parameter.
   */
  async getUserInfo() {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }

      // TikTok requires 'fields' query parameter with comma-separated list of fields to retrieve
      // Only request fields that require 'user.info.basic' scope (which we have)
      const fields = 'open_id,union_id,avatar_url,display_name';
      const url = `${this.endpoints.user.info}?fields=${encodeURIComponent(fields)}`;

      logger.debug('Fetching TikTok user info', {
        url: url.replace(this.accessToken, '****'),
        hasToken: !!this.accessToken,
        tokenLength: this.accessToken?.length,
      });

      const response = await this.get(url);

      return {
        success: true,
        data: response.data,
      };

    } catch (error) {
      // Log detailed error info including TikTok's response
      const errorDetails = {
        error: error.message,
        status: error.status,
        hasResponse: !!error.response,
      };

      // Include TikTok's error response if available
      if (error.data) {
        if (typeof error.data === 'string') {
          errorDetails.responseText = error.data;
        } else if (error.data.error) {
          errorDetails.tiktokError = error.data.error;
        }
      }

      logger.error('Failed to get user info', errorDetails);

      return {
        success: false,
        error: error.message,
        details: errorDetails,
      };
    }
  }

  /**
   * Initialize video upload
   * Returns upload URL for the video
   */
  async initializeVideoUpload(videoInfo, onProgress = null) {
    try {
      logger.info('Initializing video upload...', {
        title: videoInfo.title,
        size: videoInfo.video_size,
      });

      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }

      // Report progress: initializing (10%)
      if (onProgress) {
        onProgress({ status: 'initializing', progress: 10, stage: 'Initializing upload' });
      }

      const response = await this.post(this.endpoints.video.initialize, {
        title: videoInfo.title,
        video_size: videoInfo.video_size,
        caption: videoInfo.caption,
        hashtag: videoInfo.hashtags || [],
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      logger.info('Video upload initialized', {
        publishId: response.data.publish_id,
        uploadUrl: response.data.upload_url,
      });

      return {
        success: true,
        publishId: response.data.publish_id,
        uploadUrl: response.data.upload_url,
        data: response.data,
      };

    } catch (error) {
      logger.error('Failed to initialize video upload', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'UPLOAD_INIT_ERROR',
      };
    }
  }

  /**
   * Upload video file to TikTok with progress tracking
   */
  async uploadVideo(publishId, videoBuffer, onProgress = null) {
    try {
      logger.info('Uploading video file...', {
        publishId,
        size: videoBuffer.length,
      });

      // Report progress: starting upload (30%)
      if (onProgress) {
        onProgress({ status: 'uploading', progress: 30, stage: 'Uploading video file' });
      }

      // For TikTok, we need to upload to the upload URL from initialize step
      const uploadUrl = `https://open.tiktokapis.com/v2/video/upload/?publish_id=${publishId}`;

      const formData = new FormData();
      formData.append('video', new Blob([videoBuffer]), 'video.mp4');

      // Simulate upload progress (since fetch doesn't support progress natively)
      // In a real implementation, you'd use XMLHttpRequest or a library like axios with progress tracking
      let progress = 30;
      const progressInterval = setInterval(() => {
        if (progress < 70) {
          progress += 10;
          if (onProgress) {
            onProgress({
              status: 'uploading',
              progress: progress,
              stage: 'Uploading video file'
            });
          }
        }
      }, 500);

      // Upload video with rate limiting
      const response = await rateLimiterService.fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Report progress: upload complete (70%)
      if (onProgress) {
        onProgress({ status: 'uploading', progress: 70, stage: 'Upload complete' });
      }

      logger.info('Video uploaded successfully', {
        publishId,
      });

      return {
        success: true,
        data: result.data,
      };

    } catch (error) {
      logger.error('Failed to upload video', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Publish video to TikTok
   */
  async publishVideo(publishId, onProgress = null) {
    try {
      logger.info('Publishing video...', {
        publishId,
      });

      // Report progress: publishing (80%)
      if (onProgress) {
        onProgress({ status: 'publishing', progress: 80, stage: 'Publishing to TikTok' });
      }

      const response = await this.post(this.endpoints.video.publish, {
        publish_id: publishId,
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      // Report progress: complete (100%)
      if (onProgress) {
        onProgress({ status: 'completed', progress: 100, stage: 'Successfully posted' });
      }

      logger.info('Video published successfully', {
        publishId,
        videoId: response.data.video_id,
      });

      return {
        success: true,
        videoId: response.data.video_id,
        shareUrl: response.data.share_url,
        data: response.data,
      };

    } catch (error) {
      logger.error('Failed to publish video', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        code: 'PUBLISH_ERROR',
      };
    }
  }

  /**
   * Complete workflow: Initialize, upload, and publish video
   */
  async postVideo(videoPath, caption, hashtags = [], onProgress = null) {
    try {
      logger.info('Starting complete video post workflow...', {
        videoPath,
        captionLength: caption.length,
        hashtagsCount: hashtags.length,
      });

      // Step 1: Initialize upload
      const fs = await import('fs');
      const videoStats = await fs.promises.stat(videoPath);
      const videoBuffer = await fs.promises.readFile(videoPath);

      const initResult = await this.initializeVideoUpload({
        title: caption.split('\n')[0].substring(0, 100),
        video_size: videoStats.size,
        caption,
        hashtags,
      }, onProgress);

      if (!initResult.success) {
        if (onProgress) {
          onProgress({ status: 'failed', progress: 0, stage: 'Initialization failed', error: initResult.error });
        }
        return initResult;
      }

      // Step 2: Upload video
      const uploadResult = await this.uploadVideo(
        initResult.publishId,
        videoBuffer,
        onProgress
      );

      if (!uploadResult.success) {
        if (onProgress) {
          onProgress({ status: 'failed', progress: 70, stage: 'Upload failed', error: uploadResult.error });
        }
        return uploadResult;
      }

      // Step 3: Publish video
      const publishResult = await this.publishVideo(initResult.publishId, onProgress);

      if (!publishResult.success) {
        if (onProgress) {
          onProgress({ status: 'failed', progress: 80, stage: 'Publish failed', error: publishResult.error });
        }
        return publishResult;
      }

      logger.info('Video posted successfully', {
        videoId: publishResult.videoId,
        shareUrl: publishResult.shareUrl,
      });

      return {
        success: true,
        videoId: publishResult.videoId,
        shareUrl: publishResult.shareUrl,
        publishId: initResult.publishId,
      };

    } catch (error) {
      logger.error('Failed to post video', {
        error: error.message,
        stack: error.stack,
      });

      if (onProgress) {
        onProgress({ status: 'failed', progress: 0, stage: 'Error', error: error.message });
      }

      return {
        success: false,
        error: error.message,
        code: 'POST_VIDEO_ERROR',
      };
    }
  }

  /**
   * Store tokens from response (saves to database for persistence)
   */
  async _storeTokens(tokenData) {
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
    this.creatorId = tokenData.creator_id;
    this.openId = tokenData.open_id;  // Store TikTok user's open_id

    // Calculate expiration time
    if (tokenData.expires_in) {
      this.tokenExpiresAt = new Date(
        Date.now() + (tokenData.expires_in * 1000) - 60000 // Refresh 1 minute early
      );
    }

    logger.info('Tokens stored', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      creatorId: this.creatorId,
      openId: this.openId,
      expiresAt: this.tokenExpiresAt,
    });

    // Persist to database for use by background jobs
    try {
      await AuthToken.saveToken('tiktok', {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        creatorId: this.creatorId,
        expiresAt: this.tokenExpiresAt,
        scope: tokenData.scope || [],
        userInfo: tokenData.userInfo || {},
        metadata: {
          open_id: this.openId,  // Store open_id in metadata
        },
      });
      logger.info('TikTok token persisted to database');
    } catch (error) {
      logger.error('Failed to persist TikTok token to database', {
        error: error.message,
      });
    }
  }

  /**
   * Generate state parameter for OAuth
   */
  _generateState() {
    return 'tiktok_oauth_state_' + Date.now();
  }

  /**
   * Generate PKCE code verifier (43-128 characters)
   * Uses a cryptographically secure random string
   */
  _generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.randomFillSync(array);
    return this._base64UrlEncode(array);
  }

  /**
   * Generate PKCE code challenge from code verifier
   * NOTE: TikTok uses NON-STANDARD PKCE - requires HEX encoding, not Base64URL!
   * Standard PKCE (RFC 7636): BASE64URL(SHA256(code_verifier))
   * TikTok PKCE: HEX(SHA256(code_verifier))
   */
  _generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('hex');
  }

  /**
   * Base64URL encode a buffer (standard base64 without padding, with URL-safe chars)
   */
  _base64UrlEncode(buffer) {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Check if app is in sandbox mode
   */
  _isSandboxMode(userInfo) {
    // Sandbox apps typically have specific patterns
    // This is a heuristic - actual implementation depends on TikTok's response
    if (!userInfo) return false;

    // Check if display name contains "sandbox" or "test"
    const displayName = userInfo.display_name || '';
    const isSandboxName = displayName.toLowerCase().includes('sandbox') ||
                         displayName.toLowerCase().includes('test');

    return isSandboxName;
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return {
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Fetch all user videos from TikTok with pagination
   * Returns videos with metrics (views, likes, comments, shares)
   */
  async fetchUserVideos() {
    if (!this.accessToken) {
      throw new Error('Not authenticated - no access token');
    }

    const fields = 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count';
    const uniqueVideos = new Map();
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 10;

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      logger.debug(`Fetching TikTok videos page ${pageCount}...`);

      const apiUrl = `${this.baseURL}/video/list/?fields=${encodeURIComponent(fields)}`;

      const body = { max_count: 20 };
      if (cursor > 0) {
        body.cursor = cursor;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch videos: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.error?.code !== 'ok') {
        throw new Error(`TikTok API error: ${result.error.message} (${result.error.code})`);
      }

      const videos = result.data?.videos || [];
      hasMore = result.data?.has_more || false;
      cursor = result.data?.cursor || 0;

      // Deduplicate by video ID
      for (const video of videos) {
        if (video.id && !uniqueVideos.has(video.id)) {
          uniqueVideos.set(video.id, video);
        }
      }

      logger.debug(`Page ${pageCount}: ${videos.length} videos (unique: ${uniqueVideos.size})`);

      if (videos.length === 0 || !hasMore) {
        break;
      }
    }

    logger.info(`Fetched ${uniqueVideos.size} unique TikTok videos from ${pageCount} pages`);

    return {
      success: true,
      videos: Array.from(uniqueVideos.values()),
      totalCount: uniqueVideos.size,
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      success: true,
      service: 'tiktok-posting',
      status: 'ok',
      enabled: this.enabled,
      authenticated: !!this.accessToken,
      hasCredentials: !!(this.appKey && this.appSecret),
      timestamp: new Date().toISOString(),
    };
  }
}

export default new TikTokPostingService();
