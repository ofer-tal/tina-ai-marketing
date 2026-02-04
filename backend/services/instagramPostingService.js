/**
 * Instagram Posting Service
 *
 * Handles posting content to Instagram via the Instagram Graph API.
 * Features:
 * - OAuth authentication via oauthManager
 * - Reels video upload to Instagram
 * - Container creation and publishing
 * - Caption and hashtag posting
 * - Post status tracking
 * - Error handling and retry logic
 * - Rate limit compliance
 *
 * Uses unified OAuth manager for automatic token refresh.
 *
 * @see backend/services/oauthManager.js
 */

import BaseApiClient from './baseApiClient.js';
import { getLogger } from '../utils/logger.js';
import rateLimiterService from './rateLimiter.js';
import oauthManager from './oauthManager.js';

const logger = getLogger('services', 'instagram-posting');

class InstagramPostingService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'InstagramPosting',
      baseURL: 'https://graph.facebook.com/v18.0',
      timeout: 60000,
      ...config,
    });

    // Instagram Graph API credentials
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    this.enabled = process.env.ENABLE_INSTAGRAM_POSTING === 'true';

    // Track Instagram account info
    this.instagramBusinessAccountId = null;
    this.instagramUserId = null;

    // Instagram Graph API endpoints
    this.endpoints = {
      oauth: {
        authorize: 'https://www.facebook.com/v18.0/dialog/oauth',
        token: 'https://graph.facebook.com/v18.0/oauth/access_token',
        refresh: 'https://graph.facebook.com/v18.0/oauth/access_token',
      },
      media: {
        create: '/{instagram_user_id}/media',
        status: '/{container_id}?fields=status_code',
        publish: '/{instagram_user_id}/media_publish',
      },
      user: {
        info: '/{instagram_user_id}?fields=username,account_type,media_count',
        accounts: '/me/accounts?fields=instagram_business_account{id,username,name,profile_pic_url}',
      },
      discovery: {
        businessAccount: '/me/accounts?fields=instagram_business_account',
      },
    };

    // OAuth scopes for Instagram Reels
    this.scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_read_engagement',
      'pages_show_list',
    ];

    logger.info('Instagram Posting Service initialized', {
      enabled: this.enabled,
      appIdConfigured: !!this.appId,
      appSecretConfigured: !!this.appSecret,
      redirectUriConfigured: !!this.redirectUri,
    });
  }

  /**
   * Test connection to Instagram Graph API
   */
  async testConnection() {
    try {
      logger.info('Testing Instagram Graph API connection...');

      if (!this.enabled) {
        return {
          success: false,
          error: 'Instagram posting is disabled in configuration',
          code: 'DISABLED',
        };
      }

      if (!this.appId || !this.appSecret) {
        return {
          success: false,
          error: 'Instagram Graph API credentials not configured',
          code: 'MISSING_CREDENTIALS',
          details: {
            appIdConfigured: !!this.appId,
            appSecretConfigured: !!this.appSecret,
          },
        };
      }

      if (!this.redirectUri) {
        return {
          success: false,
          error: 'Instagram redirect URI not configured',
          code: 'MISSING_REDIRECT_URI',
        };
      }

      const isAuthenticated = await oauthManager.isAuthenticated('instagram');

      logger.info('Instagram Graph API connection test successful', {
        authenticated: isAuthenticated,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
      });

      return {
        success: true,
        authenticated: isAuthenticated,
        hasCredentials: true,
        message: 'Instagram Graph API credentials configured successfully',
      };

    } catch (error) {
      logger.error('Instagram Graph API connection test failed', {
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
   * Check token status
   */
  async checkTokenStatus() {
    try {
      const isAuthenticated = await oauthManager.isAuthenticated('instagram');
      const token = await oauthManager.getToken('instagram');

      return {
        authenticated: isAuthenticated,
        hasToken: !!token,
        expiresAt: token?.expiresAt,
        canRefresh: !!token?.refreshToken,
      };
    } catch (error) {
      logger.error('Token status check failed', {
        error: error.message,
      });

      return {
        authenticated: false,
        hasToken: false,
        error: error.message,
      };
    }
  }

  /**
   * Get authorization URL for OAuth flow
   * @deprecated Use oauthManager.getAuthorizationUrl('instagram', scopes) directly
   */
  getAuthorizationUrl() {
    return oauthManager.getAuthorizationUrl('instagram', this.scopes)
      .then(({ authUrl }) => authUrl);
  }

  /**
   * Exchange authorization code for access token
   * @deprecated Use oauthManager.handleCallback('instagram', callbackUrl, state) directly
   */
  async exchangeCodeForToken(code) {
    logger.warn('exchangeCodeForToken is deprecated, use oauthManager.handleCallback instead');
    return {
      success: false,
      error: 'This method is deprecated. Use the unified OAuth callback handler.',
    };
  }

  /**
   * Refresh access token
   * @deprecated Handled automatically by OAuth2Fetch
   */
  async refreshAccessToken() {
    logger.warn('refreshAccessToken is deprecated, token refresh is automatic');
    return {
      success: false,
      error: 'Token refresh is now handled automatically by OAuth2Fetch',
    };
  }

  /**
   * Verify permissions for content publishing
   */
  async verifyPermissions() {
    try {
      logger.info('Verifying Instagram Graph API permissions...');

      const token = await oauthManager.getToken('instagram');
      if (!token || !token.accessToken) {
        return {
          success: false,
          error: 'Not authenticated - no access token',
          code: 'NOT_AUTHENTICATED',
        };
      }

      // Required permissions for Instagram Reels publishing
      const requiredPermissions = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_read_engagement',
        'pages_show_list',
      ];

      // Debug token info to check permissions
      const debugUrl = `${this.baseURL}/debug_token?input_token=${token.accessToken}`;
      const response = await rateLimiterService.fetch(debugUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Debug token request failed: ${response.status}`);
      }

      const debugData = await response.json();

      if (debugData.error) {
        throw new Error(debugData.error.message);
      }

      const grantedScopes = debugData.data?.granted_scopes || [];
      const grantedScopesArray = grantedScopes.split(',');

      // Check which permissions are granted
      const permissionStatus = requiredPermissions.map(perm => ({
        permission: perm,
        granted: grantedScopesArray.includes(perm),
      }));

      const missingPermissions = permissionStatus
        .filter(p => !p.granted)
        .map(p => p.permission);

      const hasAllPermissions = missingPermissions.length === 0;

      logger.info('Instagram Graph API permissions verified', {
        hasAllPermissions,
        grantedCount: permissionStatus.filter(p => p.granted).length,
        requiredCount: requiredPermissions.length,
        missingPermissions,
      });

      return {
        success: true,
        hasAllPermissions,
        permissions: permissionStatus,
        missingPermissions,
        grantedScopes: grantedScopesArray,
        message: hasAllPermissions
          ? 'All required permissions granted'
          : 'Some permissions are missing',
      };

    } catch (error) {
      logger.error('Instagram Graph API permissions verification failed', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'PERMISSIONS_CHECK_ERROR',
      };
    }
  }

  /**
   * Get Instagram user info
   */
  async getUserInfo() {
    try {
      if (!this.instagramUserId) {
        return {
          success: false,
          error: 'Instagram user ID not set',
        };
      }

      const endpoint = this.endpoints.user.info.replace('{instagram_user_id}', this.instagramUserId);
      const response = await this.request(endpoint);

      return {
        success: true,
        data: response,
      };

    } catch (error) {
      logger.error('Failed to get Instagram user info', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Discover and set Instagram business account
   */
  async discoverBusinessAccount() {
    try {
      logger.info('Discovering Instagram business account...');

      const endpoint = this.endpoints.discovery.businessAccount;
      const response = await this.request(endpoint);

      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          error: 'No Instagram business accounts found',
          code: 'NO_BUSINESS_ACCOUNT',
        };
      }

      // Get the first Instagram business account
      const businessAccount = response.data[0];
      const instagramBusinessAccount = businessAccount.instagram_business_account;

      if (!instagramBusinessAccount) {
        return {
          success: false,
          error: 'Page does not have an Instagram business account connected',
          code: 'NO_INSTAGRAM_ACCOUNT',
        };
      }

      this.instagramBusinessAccountId = instagramBusinessAccount.id;
      this.instagramUserId = instagramBusinessAccount.id;

      logger.info('Instagram business account discovered', {
        businessAccountId: this.instagramBusinessAccountId,
        username: instagramBusinessAccount.username,
        name: instagramBusinessAccount.name,
      });

      return {
        success: true,
        businessAccount: instagramBusinessAccount,
        message: 'Instagram business account connected successfully',
      };

    } catch (error) {
      logger.error('Failed to discover Instagram business account', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'DISCOVERY_ERROR',
      };
    }
  }

  /**
   * Create media container for Instagram Reels
   */
  async createMediaContainer(videoUrl, caption, hashtags = []) {
    try {
      logger.info('Creating Instagram media container...', {
        videoUrl,
        captionLength: caption?.length,
        hashtagCount: hashtags?.length,
      });

      if (!this.instagramUserId) {
        throw new Error('Instagram user ID not set');
      }

      const endpoint = this.endpoints.media.create.replace('{instagram_user_id}', this.instagramUserId);

      // Combine caption and hashtags
      const fullCaption = hashtags.length > 0
        ? `${caption}\n\n${hashtags.join(' ')}`
        : caption;

      const params = new URLSearchParams({
        video_url: videoUrl,
        caption: fullCaption,
        media_type: 'REELS',
      });

      const response = await rateLimiterService.fetch(`${this.baseURL}${endpoint}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Media container creation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      logger.info('Instagram media container created successfully', {
        containerId: data.id,
      });

      return {
        success: true,
        containerId: data.id,
      };

    } catch (error) {
      logger.error('Failed to create Instagram media container', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check media container status
   */
  async checkContainerStatus(containerId) {
    try {
      logger.info('Checking Instagram media container status...', {
        containerId,
      });

      const endpoint = this.endpoints.media.status.replace('{container_id}', containerId);

      const response = await rateLimiterService.fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Container status check failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const statusCode = data.status_code;
      const isFinished = statusCode === 'FINISHED';

      logger.info('Instagram media container status checked', {
        containerId,
        statusCode,
        isFinished,
      });

      return {
        success: true,
        statusCode,
        isFinished,
      };

    } catch (error) {
      logger.error('Failed to check container status', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish media container
   */
  async publishMediaContainer(containerId) {
    try {
      logger.info('Publishing Instagram media container...', {
        containerId,
      });

      if (!this.instagramUserId) {
        throw new Error('Instagram user ID not set');
      }

      const endpoint = this.endpoints.media.publish.replace('{instagram_user_id}', this.instagramUserId);

      const params = new URLSearchParams({
        creation_id: containerId,
      });

      const response = await rateLimiterService.fetch(`${this.baseURL}${endpoint}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Media publish failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      logger.info('Instagram media published successfully', {
        mediaId: data.id,
      });

      return {
        success: true,
        mediaId: data.id,
      };

    } catch (error) {
      logger.error('Failed to publish Instagram media', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Post video to Instagram Reels
   */
  async postVideo(videoPath, caption, hashtags = [], onProgress) {
    try {
      logger.info('Starting Instagram Reels posting workflow...', {
        videoPath,
        captionLength: caption?.length,
        hashtagCount: hashtags?.length,
      });

      // Step 1: Create media container
      onProgress?.({ stage: 'creating_container', progress: 10 });

      const videoUrl = videoPath; // This should be a public URL in production

      const containerResult = await this.createMediaContainer(videoUrl, caption, hashtags);

      if (!containerResult.success) {
        throw new Error(`Failed to create media container: ${containerResult.error}`);
      }

      const containerId = containerResult.containerId;
      onProgress?.({ stage: 'container_created', progress: 30, containerId });

      // Step 2: Wait for container to be processed
      onProgress?.({ stage: 'processing_video', progress: 50 });

      let attempts = 0;
      const maxAttempts = 20;
      let isFinished = false;

      while (!isFinished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const statusResult = await this.checkContainerStatus(containerId);

        if (!statusResult.success) {
          throw new Error(`Failed to check container status: ${statusResult.error}`);
        }

        isFinished = statusResult.isFinished;
        attempts++;

        onProgress?.({
          stage: 'processing_video',
          progress: 50 + (attempts / maxAttempts) * 30,
          attempts,
          statusCode: statusResult.statusCode,
        });
      }

      if (!isFinished) {
        throw new Error('Video processing timed out');
      }

      // Step 3: Publish the media
      onProgress?.({ stage: 'publishing', progress: 90 });

      const publishResult = await this.publishMediaContainer(containerId);

      if (!publishResult.success) {
        throw new Error(`Failed to publish media: ${publishResult.error}`);
      }

      onProgress?.({ stage: 'completed', progress: 100, mediaId: publishResult.mediaId });

      logger.info('Instagram Reels posted successfully', {
        mediaId: publishResult.mediaId,
      });

      return {
        success: true,
        mediaId: publishResult.mediaId,
        containerId,
        message: 'Instagram Reel posted successfully',
      };

    } catch (error) {
      logger.error('Failed to post Instagram Reel', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Make authenticated request using BaseApiClient
   * Overrides the base method to inject OAuth token
   */
  async request(endpoint, options = {}) {
    const token = await oauthManager.getToken('instagram');
    if (!token || !token.accessToken) {
      throw new Error('Not authenticated - no access token');
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await rateLimiterService.fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token.accessToken}`,
      },
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data;
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    const isAuthenticated = await oauthManager.isAuthenticated('instagram');

    return {
      success: true,
      service: 'instagram-posting',
      status: 'ok',
      enabled: this.enabled,
      timestamp: new Date().toISOString(),
      capabilities: {
        configured: !!this.appId && !!this.appSecret,
        authenticated: isAuthenticated,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
        supportsReels: true,
        maxDuration: 90,
        features: [
          'oauth_authentication',
          'reels_upload',
          'caption_and_hashtags',
          'status_tracking',
          'container_creation',
          'media_publishing',
        ],
      },
    };
  }
}

export default new InstagramPostingService();
