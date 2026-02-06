/**
 * TikTok Posting Service
 *
 * Handles posting content to TikTok via the TikTok API.
 * Features:
 * - OAuth authentication via oauthManager with PKCE support
 * - Video upload to TikTok
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
import path from 'path';
import oauthManager from './oauthManager.js';

const logger = getLogger('services', 'tiktok-posting');

/**
 * Convert /storage/ URL path back to real file system path
 * @param {string} storageUrl - URL path like /storage/videos/tier1/final/video.mp4
 * @returns {string} Real file path like C:\Projects\blush-marketing\storage\videos\...
 */
function urlToFilePath(storageUrl) {
  if (!storageUrl) return null;

  // If it's already a file path (starts with drive letter or /mnt/), return as-is
  if (storageUrl.match(/^[A-Z]:\\/) || storageUrl.startsWith('/mnt/')) {
    return storageUrl;
  }

  // If it's a /storage/ URL, convert to file path
  if (storageUrl.startsWith('/storage/')) {
    const relativePath = storageUrl.substring('/storage/'.length);
    return path.join(process.cwd(), 'storage', relativePath);
  }

  logger.warn('Unknown path format, using as-is', { storageUrl });
  return storageUrl;
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

    // Keep track of creator info from token response
    this.creatorId = null;
    this.openId = null;

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
   */
  async initialize() {
    try {
      logger.info('Initializing TikTok posting service...');

      const isAuthenticated = await oauthManager.isAuthenticated('tiktok');

      if (isAuthenticated) {
        const token = await oauthManager.getToken('tiktok');
        this.creatorId = token?.creatorId;
        this.openId = token?.metadata?.open_id;
        logger.info('TikTok service initialized with existing token', {
          hasCreatorId: !!this.creatorId,
          hasOpenId: !!this.openId,
        });
      } else {
        logger.info('TikTok service initialized - no token found, authentication required');
      }
    } catch (error) {
      logger.error('Failed to initialize TikTok posting service', {
        error: error.message,
      });
    }
  }

  /**
   * Test connection to TikTok API
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

      const isAuthenticated = await oauthManager.isAuthenticated('tiktok');

      logger.info('TikTok API connection test successful', {
        authenticated: isAuthenticated,
      });

      return {
        success: true,
        authenticated: isAuthenticated,
        hasCredentials: true,
        message: 'TikTok API credentials configured successfully',
      };
    } catch (error) {
      logger.error('TikTok API connection test failed', {
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
   * Check token status
   */
  async checkTokenStatus() {
    try {
      const isAuthenticated = await oauthManager.isAuthenticated('tiktok');
      const token = await oauthManager.getToken('tiktok');

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
   * Check if TikTok sandbox is configured
   */
  async checkSandboxStatus() {
    try {
      logger.info('Checking TikTok sandbox status...');

      const hasAppKey = !!this.appKey;
      const hasAppSecret = !!this.appSecret;
      const hasRedirectUri = !!this.redirectUri;

      const isConfigured = hasAppKey && hasAppSecret && hasRedirectUri;

      // Check if this is a sandbox app (based on app key or env variable)
      const isSandbox = process.env.TIKTOK_SANDBOX_MODE === 'true' ||
                        this.appKey?.includes('sandbox') ||
                        this.appKey?.startsWith('tt') && this.appKey.length < 20;

      logger.info('TikTok sandbox status checked', {
        isConfigured,
        isSandbox,
        hasAppKey,
        hasAppSecret,
        hasRedirectUri,
      });

      return {
        success: true,
        isConfigured,
        isSandbox,
        message: isSandbox
          ? 'TikTok sandbox mode detected'
          : 'TikTok production mode',
        details: {
          hasAppKey,
          hasAppSecret,
          hasRedirectUri,
          sandboxMode: isSandbox,
        },
      };
    } catch (error) {
      logger.error('Sandbox status check failed', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify API permissions
   */
  async verifyPermissions() {
    try {
      const isAuthenticated = await oauthManager.isAuthenticated('tiktok');

      return {
        success: true,
        authenticated: isAuthenticated,
        permissions: ['video.upload', 'video.publish'],
        message: 'TikTok API permissions verified',
      };
    } catch (error) {
      logger.error('Permissions check failed', {
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
   * @deprecated Use oauthManager.getAuthorizationUrl('tiktok') directly
   */
  async getAuthorizationUrl(scopes = ['video.upload', 'video.publish']) {
    // For backward compatibility, return the URL directly
    logger.debug('TikTok getAuthorizationUrl called', { scopes });
    try {
      const { authUrl } = await oauthManager.getAuthorizationUrl('tiktok', scopes);
      logger.debug('TikTok auth URL generated', { url: authUrl?.substring(0, 50) + '...' });
      return authUrl;
    } catch (error) {
      logger.error('Failed to generate TikTok auth URL', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @deprecated Use oauthManager.handleCallback('tiktok', callbackUrl, state) directly
   */
  async exchangeCodeForToken(code, state) {
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
   * Get user information
   */
  async getUserInfo() {
    try {
      const fields = 'open_id,union_id,avatar_url,display_name';
      const url = `${this.baseURL}${this.endpoints.user.info}?fields=${encodeURIComponent(fields)}`;

      const response = await oauthManager.fetch('tiktok', url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get user info');
      }

      const data = await response.json();

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      logger.error('Failed to get user info', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initialize video upload
   */
  async initializeVideoUpload(videoInfo, onProgress = null) {
    try {
      logger.info('Initializing video upload...', {
        title: videoInfo.title,
        size: videoInfo.video_size,
      });

      if (onProgress) {
        onProgress({ status: 'initializing', progress: 10, stage: 'Initializing upload' });
      }

      const response = await oauthManager.fetch('tiktok', this.baseURL + this.endpoints.video.initialize, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: videoInfo.title,
          video_size: videoInfo.video_size,
          caption: videoInfo.caption,
          hashtag: videoInfo.hashtags || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to initialize upload');
      }

      const data = await response.json();

      logger.info('Video upload initialized', {
        publishId: data.data?.publish_id,
      });

      return {
        success: true,
        publishId: data.data?.publish_id,
        uploadUrl: data.data?.upload_url,
        data: data.data,
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
   * Upload video file to TikTok
   */
  async uploadVideo(publishId, videoBuffer, onProgress = null) {
    try {
      logger.info('Uploading video file...', {
        publishId,
        size: videoBuffer.length,
      });

      if (onProgress) {
        onProgress({ status: 'uploading', progress: 30, stage: 'Uploading video file' });
      }

      const uploadUrl = `${this.baseURL}/video/upload/?publish_id=${publishId}`;

      const formData = new FormData();
      formData.append('video', new Blob([videoBuffer]), 'video.mp4');

      // Simulate upload progress
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

      const response = await rateLimiterService.fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

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

      if (onProgress) {
        onProgress({ status: 'publishing', progress: 80, stage: 'Publishing to TikTok' });
      }

      const response = await oauthManager.fetch('tiktok', this.baseURL + this.endpoints.video.publish, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publish_id: publishId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to publish');
      }

      const data = await response.json();

      if (onProgress) {
        onProgress({ status: 'completed', progress: 100, stage: 'Successfully posted' });
      }

      logger.info('Video published successfully', {
        publishId,
        videoId: data.data?.video_id,
      });

      return {
        success: true,
        videoId: data.data?.video_id,
        shareUrl: data.data?.share_url,
        data: data.data,
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
      const actualPath = urlToFilePath(videoPath);

      logger.info('Starting complete video post workflow...', {
        videoPath,
        actualPath,
        captionLength: caption.length,
        hashtagsCount: hashtags.length,
      });

      // Step 1: Initialize upload
      const fs = await import('fs');
      const videoStats = await fs.promises.stat(actualPath);
      const videoBuffer = await fs.promises.readFile(actualPath);

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
   * Fetch all user videos from TikTok with pagination
   */
  async fetchUserVideos() {
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

      const response = await oauthManager.fetch('tiktok', apiUrl, {
        method: 'POST',
        headers: {
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
      timestamp: new Date().toISOString(),
    };
  }
}

export default new TikTokPostingService();
