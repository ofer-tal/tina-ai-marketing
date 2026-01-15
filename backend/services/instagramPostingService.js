/**
 * Instagram Posting Service
 *
 * Handles posting content to Instagram via the Instagram Graph API.
 * Features:
 * - OAuth authentication flow
 * - Reels video upload to Instagram
 * - Container creation and publishing
 * - Caption and hashtag posting
 * - Post status tracking
 * - Error handling and retry logic
 * - Rate limit compliance
 */

import BaseApiClient from './baseApiClient.js';
import { getLogger } from '../utils/logger.js';
import rateLimiterService from './rateLimiter.js';

const logger = getLogger('services', 'instagram-posting');

class InstagramPostingService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'InstagramPosting',
      baseURL: 'https://graph.facebook.com/v18.0', // Instagram Graph API uses Facebook's Graph API
      timeout: 60000, // 60 seconds for video uploads
      ...config,
    });

    // Instagram Graph API credentials
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    this.enabled = process.env.ENABLE_INSTAGRAM_POSTING === 'true';

    // OAuth tokens (stored in memory - should be in database in production)
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
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
        create: '/{instagram_user_id}/media', // POST - Create media container
        status: '/{container_id}?fields=status_code', // GET - Check container status
        publish: '/{instagram_user_id}/media_publish', // POST - Publish media
      },
      user: {
        info: '/{instagram_user_id}?fields=username,account_type,media_count',
        accounts: '/me/accounts?fields=instagram_business_account{id,username,name,profile_pic_url}',
      },
      discovery: {
        businessAccount: '/me/accounts?fields=instagram_business_account',
      },
    };

    logger.info('Instagram Posting Service initialized', {
      enabled: this.enabled,
      appIdConfigured: !!this.appId,
      appSecretConfigured: !!this.appSecret,
      redirectUriConfigured: !!this.redirectUri,
    });
  }

  /**
   * Step 1: Configure Instagram Graph API
   * Validates that credentials are properly configured
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

      // Check if we have valid tokens
      const tokenStatus = await this.checkTokenStatus();

      logger.info('Instagram Graph API connection test successful', {
        authenticated: tokenStatus.authenticated,
        hasAccessToken: !!this.accessToken,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
      });

      return {
        success: true,
        authenticated: tokenStatus.authenticated,
        hasCredentials: true,
        tokenStatus,
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
   * Step 2 & 3: Set up Instagram Business account and verify access token
   * Check if we have a valid access token and business account
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

      // Verify token by making a test API call to get user info
      const userInfo = await this.getUserInfo();

      return {
        authenticated: true,
        hasToken: true,
        valid: true,
        instagramUserId: this.instagramUserId,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
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
   * Step 4: Verify permissions for content publishing
   * Check if the access token has the required permissions
   */
  async verifyPermissions() {
    try {
      logger.info('Verifying Instagram Graph API permissions...');

      if (!this.accessToken) {
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
      const debugUrl = `${this.baseURL}/debug_token?input_token=${this.accessToken}`;
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

      if (!this.accessToken) {
        return {
          success: false,
          error: 'Not authenticated - no access token',
          code: 'NOT_AUTHENTICATED',
        };
      }

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
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      logger.info('Refreshing Instagram access token...');

      if (!this.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
        };
      }

      const url = `${this.endpoints.oauth.refresh}?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${this.refreshToken}`;

      const response = await rateLimiterService.fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));

      logger.info('Instagram access token refreshed successfully', {
        expiresIn: data.expires_in,
      });

      return {
        success: true,
        expiresIn: data.expires_in,
      };

    } catch (error) {
      logger.error('Failed to refresh Instagram access token', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list',
      response_type: 'code',
    });

    return `${this.endpoints.oauth.authorize}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      logger.info('Exchanging authorization code for access token...');

      const params = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        code: code,
        redirect_uri: this.redirectUri,
      });

      const response = await rateLimiterService.fetch(`${this.endpoints.oauth.token}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));

      logger.info('Access token obtained successfully', {
        expiresIn: data.expires_in,
      });

      // Discover Instagram business account
      await this.discoverBusinessAccount();

      return {
        success: true,
        accessToken: this.accessToken,
        expiresIn: data.expires_in,
      };

    } catch (error) {
      logger.error('Failed to exchange code for token', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create media container for Instagram Reels
   * This is step 1 of posting - create the container first
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
   * Wait for Instagram to finish processing the video
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
   * This is step 2 of posting - publish the created container
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
   * Complete workflow: create container → wait for processing → publish
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

      // For Instagram, we need a publicly accessible video URL
      // In production, this would be uploaded to a cloud storage service first
      // For now, we'll use a placeholder URL
      const videoUrl = videoPath; // This should be a public URL in production

      const containerResult = await this.createMediaContainer(videoUrl, caption, hashtags);

      if (!containerResult.success) {
        throw new Error(`Failed to create media container: ${containerResult.error}`);
      }

      const containerId = containerResult.containerId;
      onProgress?.({ stage: 'container_created', progress: 30, containerId });

      // Step 2: Wait for container to be processed (poll status)
      onProgress?.({ stage: 'processing_video', progress: 50 });

      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 3 seconds = 60 seconds max wait
      let isFinished = false;

      while (!isFinished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

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
   * Get authentication headers for API requests
   */
  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Health check for the service
   */
  healthCheck() {
    return {
      success: true,
      service: 'instagram-posting',
      status: 'ok',
      enabled: this.enabled,
      timestamp: new Date().toISOString(),
      capabilities: {
        configured: !!this.appId && !!this.appSecret,
        authenticated: !!this.accessToken,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
        supportsReels: true,
        maxDuration: 90, // Instagram Reels allows 90 seconds
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
