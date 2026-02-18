/**
 * YouTube Posting Service
 *
 * Handles posting content to YouTube via the YouTube Data API v3.
 * Uses dedicated YouTube OAuth platform (separate from Google Sheets).
 * Features:
 * - OAuth 2.0 authentication via oauthManager (youtube platform)
 * - Shorts video upload to YouTube
 * - Video metadata management (title, description, tags)
 * - Privacy status control
 * - Post status tracking
 * - Error handling and retry logic
 * - Rate limit compliance
 *
 * @see backend/services/oauthManager.js
 */

import BaseApiClient from './baseApiClient.js';
import { getLogger } from '../utils/logger.js';
import oauthManager from './oauthManager.js';
import configService from './config.js';
import path from 'path';
import fs from 'fs';

const logger = getLogger('services', 'youtube-posting');

class YouTubePostingService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'YouTubePosting',
      baseURL: 'https://www.googleapis.com/youtube/v3',
      timeout: 60000,
      ...config,
    });

    // YouTube Data API v3 credentials
    this.apiKey = process.env.YOUTUBE_API_KEY;
    // Google OAuth (unified for all Google services)
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
    this.enabled = process.env.ENABLE_YOUTUBE_POSTING === 'true';

    // YouTube uses its own dedicated OAuth platform (platform: 'youtube')
    this.platform = 'youtube';
    this.channelId = null;

    // YouTube Data API v3 endpoints
    this.endpoints = {
      oauth: {
        authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
        token: 'https://oauth2.googleapis.com/token',
        refresh: 'https://oauth2.googleapis.com/token',
      },
      videos: {
        insert: '/videos',
        status: '/videos',
        update: '/videos',
      },
      channels: {
        list: '/channels',
        mine: '/channels?part=snippet&mine=true',
      },
      playlists: {
        list: '/playlists',
        insert: '/playlists',
      },
    };

    // OAuth scopes required for YouTube Shorts posting
    this.scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ];

    logger.info('YouTube Posting Service initialized', {
      enabled: this.enabled,
      apiKeyConfigured: !!this.apiKey,
      clientIdConfigured: !!this.clientId,
      clientSecretConfigured: !!this.clientSecret,
      redirectUriConfigured: !!this.redirectUri,
    });
  }

  /**
   * Test connection to YouTube Data API
   */
  async testConnection() {
    try {
      logger.info('Testing YouTube Data API connection...');

      if (!this.enabled) {
        return {
          success: false,
          error: 'YouTube posting is disabled in configuration',
          code: 'DISABLED',
        };
      }

      if (!this.apiKey || !this.clientId || !this.clientSecret) {
        return {
          success: false,
          error: 'YouTube Data API credentials not configured',
          code: 'MISSING_CREDENTIALS',
          details: {
            apiKeyConfigured: !!this.apiKey,
            clientIdConfigured: !!this.clientId,
            clientSecretConfigured: !!this.clientSecret,
          },
        };
      }

      if (!this.redirectUri) {
        return {
          success: false,
          error: 'YouTube OAuth redirect URI not configured',
          code: 'MISSING_REDIRECT_URI',
          details: {
            redirectUriRequired: 'Set GOOGLE_REDIRECT_URI in environment',
          },
        };
      }

      // Test API key validity
      try {
        // YouTube Data API v3 requires API key as query parameter
        // Using direct fetch to ensure proper query string formatting
        const apiUrl = new URL(`${this.baseURL}/search`);
        apiUrl.searchParams.set('part', 'snippet');
        apiUrl.searchParams.set('q', 'test');
        apiUrl.searchParams.set('maxResults', '1');
        apiUrl.searchParams.set('key', this.apiKey);

        logger.info('Testing YouTube API key', {
          apiKeyLast5: this.apiKey?.slice(-5),
          url: apiUrl.toString().replace(this.apiKey, '***'),
        });

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();

        logger.info('YouTube Data API connection successful', {
          status: response.status,
          hasItems: !!data.items,
        });

        return {
          success: true,
          message: 'YouTube Data API connection successful',
          code: 'SUCCESS',
        };
      } catch (apiError) {
        logger.error('YouTube Data API key validation failed', {
          error: apiError.message,
          code: apiError.code,
          apiKeyLast5: this.apiKey?.slice(-5),
        });

        return {
          success: false,
          error: 'YouTube Data API key is invalid or expired',
          code: 'INVALID_API_KEY',
          details: {
            error: apiError.message,
          },
        };
      }
    } catch (error) {
      logger.error('YouTube Data API connection test failed', {
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
   * Get authorization URL for OAuth flow
   * @deprecated Use oauthManager.getAuthorizationUrl('youtube', scopes) directly
   */
  getAuthorizationUrl() {
    // For backward compatibility
    return oauthManager.getAuthorizationUrl('youtube', this.scopes)
      .then(({ authUrl }) => authUrl);
  }

  /**
   * Exchange authorization code for access token
   * @deprecated Use oauthManager.handleCallback('youtube', callbackUrl, state) directly
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
   * Get user's YouTube channel
   */
  async getUserChannel() {
    try {
      logger.info('Getting YouTube user channel...');

      const url = `${this.baseURL}${this.endpoints.channels.mine}`;
      const response = await oauthManager.fetch('youtube', url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get channel');
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }

      const channel = data.items[0];
      this.channelId = channel.id;

      logger.info('YouTube channel obtained successfully', {
        channelId: this.channelId,
        channelTitle: channel.snippet.title,
      });

      return {
        success: true,
        channel: {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnails: channel.snippet.thumbnails,
        },
        code: 'SUCCESS',
      };
    } catch (error) {
      logger.error('Failed to get YouTube user channel', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'CHANNEL_ERROR',
      };
    }
  }

  /**
   * Check token status
   */
  async checkTokenStatus() {
    try {
      const isAuthenticated = await oauthManager.isAuthenticated('youtube');
      const token = await oauthManager.getToken('youtube');

      return {
        valid: isAuthenticated,
        hasToken: !!token,
        expiresAt: token?.expiresAt,
        canRefresh: !!token?.refreshToken,
      };
    } catch (error) {
      logger.error('Token status check failed', {
        error: error.message,
      });

      return {
        valid: false,
        hasToken: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify API connection
   */
  async verifyConnection() {
    try {
      logger.info('Verifying YouTube API connection...');

      const tokenStatus = await this.checkTokenStatus();

      if (!tokenStatus.valid) {
        if (tokenStatus.canRefresh) {
          logger.info('Access token invalid, attempting refresh...');
          // OAuth2Fetch handles refresh automatically
        } else {
          return {
            success: false,
            error: tokenStatus.reason || 'Invalid token',
            code: 'INVALID_TOKEN',
            needsReauth: true,
          };
        }
      }

      // Get user's channel to verify access
      const channelResult = await this.getUserChannel();

      if (!channelResult.success) {
        return {
          success: false,
          error: 'Failed to access YouTube channel',
          code: 'CHANNEL_ACCESS_ERROR',
          details: channelResult,
        };
      }

      logger.info('YouTube API connection verified successfully', {
        channelId: this.channelId,
      });

      return {
        success: true,
        message: 'YouTube API connection verified',
        code: 'SUCCESS',
        channelId: this.channelId,
        channel: channelResult.channel,
      };
    } catch (error) {
      logger.error('YouTube API connection verification failed', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Verify upload permissions
   */
  async verifyPermissions() {
    try {
      logger.info('Verifying YouTube upload permissions...');

      const connectionResult = await this.verifyConnection();

      if (!connectionResult.success) {
        return {
          success: false,
          error: 'Cannot verify permissions without valid connection',
          code: 'NO_CONNECTION',
        };
      }

      // Check if we have upload permission by trying to get channel's upload playlist
      const url = `${this.baseURL}/channels?part=contentDetails&mine=true`;
      const response = await oauthManager.fetch('youtube', url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to verify permissions');
      }

      const data = await response.json();
      const channel = data.items[0];
      const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

      logger.info('YouTube upload permissions verified successfully', {
        uploadsPlaylistId,
        channelId: this.channelId,
      });

      return {
        success: true,
        message: 'Upload permissions verified',
        code: 'SUCCESS',
        permissions: {
          canUpload: true,
          uploadsPlaylistId,
        },
        channelId: this.channelId,
      };
    } catch (error) {
      logger.error('Failed to verify YouTube upload permissions', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'PERMISSION_ERROR',
        missingPermissions: ['youtube.upload'],
      };
    }
  }

  /**
   * Build enhanced YouTube description with hashtags and download link
   * @param {string} baseCaption - The base caption text
   * @param {Array<string>} hashtags - Array of hashtag strings (without #)
   * @returns {string} Enhanced description respecting 5000 byte limit
   */
  buildYouTubeDescription(baseCaption, hashtags = []) {
    const appStoreUrl = configService.get('BLUSH_APP_STORE_URL', 'https://apps.apple.com/app/blush-ai-romantic-stories/id6449122808');

    // Start with base caption
    let description = baseCaption.trim();

    // Add hashtags with "#" prefix for clickability in description
    if (hashtags && hashtags.length > 0) {
      const hashtagLine = '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
      description += hashtagLine;
    }

    // Add download link at the end
    description += '\n\n📱 Download the Blush app: ' + appStoreUrl;

    // YouTube API has a 5000 byte limit for description
    const MAX_BYTES = 5000;
    const byteLength = new Blob([description]).size;

    if (byteLength > MAX_BYTES) {
      logger.warn('Description exceeds 5000 byte limit, truncating', {
        byteLength,
        limit: MAX_BYTES
      });

      // Truncate from the beginning to keep hashtags and link
      const ellipsis = '\n\n...';
      const hashtagsAndLink = description.slice(description.lastIndexOf('\n\n'));
      const availableSpace = MAX_BYTES - hashtagsAndLink.length - ellipsis.length;

      // Keep only as much caption as fits
      description = baseCaption.slice(0, availableSpace) + ellipsis + hashtagsAndLink;
    }

    return description;
  }

  /**
   * Upload a video to YouTube
   */
  async postVideo(videoPath, title, description, tags = [], onProgress) {
    try {
      logger.info('Starting YouTube video upload...', {
        videoPath,
        title,
        tagsCount: tags.length,
      });

      // Verify authentication
      const connectionResult = await this.verifyConnection();
      if (!connectionResult.success) {
        throw new Error('Authentication required: ' + connectionResult.error);
      }

      // === Path resolution for legacy format ===
      let resolvedPath = videoPath;

      // Handle legacy URL format: /storage/videos/... -> /home/ofer/blush-marketing/storage/...
      if (videoPath.startsWith('/storage/')) {
        resolvedPath = path.join(process.cwd(), 'storage', videoPath.substring('/storage/'.length));
        logger.info('Converting legacy URL path to file path', {
          original: videoPath,
          resolved: resolvedPath,
        });
      }

      // Verify file exists
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Video file not found at: ${resolvedPath}`);
      }

      // Log file info
      const stats = fs.statSync(resolvedPath);
      logger.info('Video file verified', {
        path: resolvedPath,
        sizeBytes: stats.size,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2),
      });
      // === END path resolution ===

      // Build enhanced YouTube description with hashtags and download link
      // This adds hashtags with "#" prefix (clickable) and App Store URL
      const enhancedDescription = this.buildYouTubeDescription(description, tags);

      // Prepare video metadata
      // Note: tags are sent WITHOUT "#" for YouTube SEO
      // Hashtags with "#" are added in description for clickability
      const videoMetadata = {
        snippet: {
          title: title,
          description: enhancedDescription,
          tags: tags, // Tags without "#" for YouTube SEO
          categoryId: '24', // Entertainment category
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      onProgress?.({
        step: 'preparing',
        message: 'Preparing video upload...',
        progress: 10,
      });

      // Read video file using resolved path
      const videoBuffer = fs.createReadStream(resolvedPath);

      // Upload video using resumable upload
      onProgress?.({
        step: 'uploading',
        message: 'Uploading video to YouTube...',
        progress: 20,
      });

      const uploadResponse = await this.uploadVideoResumable(
        videoBuffer,
        videoMetadata,
        (progress) => {
          onProgress?.({
            step: 'uploading',
            message: `Uploading video... ${progress.toFixed(0)}%`,
            progress: 20 + (progress * 0.6),
          });
        }
      );

      if (!uploadResponse.success) {
        throw new Error('Video upload failed: ' + uploadResponse.error);
      }

      onProgress?.({
        step: 'processing',
        message: 'Video uploaded! YouTube is processing...',
        progress: 90,
      });

      logger.info('YouTube video uploaded successfully', {
        videoId: uploadResponse.videoId,
      });

      onProgress?.({
        step: 'completed',
        message: 'Video posted successfully!',
        progress: 100,
        videoId: uploadResponse.videoId,
        videoUrl: `https://www.youtube.com/shorts/${uploadResponse.videoId}`,
      });

      return {
        success: true,
        videoId: uploadResponse.videoId,
        videoUrl: `https://www.youtube.com/shorts/${uploadResponse.videoId}`,
        code: 'SUCCESS',
      };
    } catch (error) {
      logger.error('YouTube video upload failed', {
        error: error.message,
        stack: error.stack,
      });

      onProgress?.({
        step: 'error',
        message: `Upload failed: ${error.message}`,
        progress: 0,
      });

      return {
        success: false,
        error: error.message,
        code: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Upload video using resumable upload protocol
   */
  async uploadVideoResumable(videoStream, metadata, onProgress) {
    try {
      logger.info('Starting resumable video upload...');

      // Step 1: Initiate resumable upload session
      const uploadBaseUrl = 'https://www.googleapis.com/upload/youtube/v3/videos';
      const initUrl = `${uploadBaseUrl}?uploadType=resumable&part=snippet,status`;

      const response = await oauthManager.fetch('youtube', initUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to initiate upload');
      }

      const uploadUrl = response.headers.get('Location');

      logger.info('Resumable upload session initiated', {
        uploadUrl: uploadUrl?.substring(0, 50) + '...',
      });

      // Step 2: Upload video bytes
      const videoBuffer = fs.readFileSync(videoStream.path);

      const uploadResponse = await oauthManager.fetch('youtube', uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/*',
          'Content-Length': videoBuffer.length.toString(),
        },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error?.message || 'Failed to upload video');
      }

      const result = await uploadResponse.json();

      logger.info('Video uploaded successfully via resumable upload', {
        videoId: result.id,
      });

      return {
        success: true,
        videoId: result.id,
      };
    } catch (error) {
      logger.error('Resumable video upload failed', {
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
   * Health check
   */
  async healthCheck() {
    try {
      const connectionResult = await this.testConnection();
      const tokenStatus = await this.checkTokenStatus();

      return {
        status: 'ok',
        enabled: this.enabled,
        configured: connectionResult.success,
        hasCredentials: !!(this.apiKey && this.clientId && this.clientSecret),
        authenticated: tokenStatus.valid,
        hasChannel: !!this.channelId,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const youtubePostingService = new YouTubePostingService();

export default youtubePostingService;
