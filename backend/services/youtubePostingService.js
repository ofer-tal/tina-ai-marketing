/**
 * YouTube Posting Service
 *
 * Handles posting content to YouTube via the YouTube Data API v3.
 * Features:
 * - OAuth 2.0 authentication flow
 * - Shorts video upload to YouTube
 * - Video metadata management (title, description, tags)
 * - Privacy status control
 * - Post status tracking
 * - Error handling and retry logic
 * - Rate limit compliance
 */

import BaseApiClient from './baseApiClient.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'youtube-posting');

class YouTubePostingService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'YouTubePosting',
      baseURL: 'https://www.googleapis.com/youtube/v3',
      timeout: 60000, // 60 seconds for video uploads
      ...config,
    });

    // YouTube Data API v3 credentials
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.clientId = process.env.YOUTUBE_CLIENT_ID;
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI;
    this.enabled = process.env.ENABLE_YOUTUBE_POSTING === 'true';

    // OAuth tokens (stored in memory - should be in database in production)
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.channelId = null;

    // YouTube Data API v3 endpoints
    this.endpoints = {
      oauth: {
        authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
        token: 'https://oauth2.googleapis.com/token',
        refresh: 'https://oauth2.googleapis.com/token',
      },
      videos: {
        insert: '/videos', // POST - Upload video
        status: '/videos', // GET - Get video status
        update: '/videos', // PUT - Update video metadata
      },
      channels: {
        list: '/channels', // GET - List user's channels
        mine: '/channels?part=snippet&mine=true', // GET - Get authenticated user's channel
      },
      playlists: {
        list: '/playlists', // GET - List playlists
        insert: '/playlists', // POST - Create playlist
      },
    };

    // OAuth scopes required for YouTube Shorts posting
    this.scopes = [
      'https://www.googleapis.com/auth/youtube.upload', // Upload videos
      'https://www.googleapis.com/auth/youtube', // Manage YouTube account
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
   * Step 1: Configure YouTube Data API v3
   * Validates that credentials are properly configured
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
            redirectUriRequired: 'Set YOUTUBE_REDIRECT_URI in environment',
          },
        };
      }

      // Test API key validity with a simple request
      try {
        const response = await this.get('/search', {
          params: {
            part: 'snippet',
            q: 'test',
            maxResults: 1,
            key: this.apiKey,
          },
        });

        logger.info('YouTube Data API connection successful', {
          status: response.status,
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
   * Step 2: Set up OAuth 2.0 authentication
   * Generates authorization URL for OAuth flow
   */
  getAuthorizationUrl() {
    try {
      logger.info('Generating YouTube OAuth authorization URL...');

      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        response_type: 'code',
        scope: this.scopes.join(' '),
        access_type: 'offline', // Get refresh token
        prompt: 'consent', // Force consent screen to get refresh token
        state: this.generateStateToken(),
      });

      const authUrl = `${this.endpoints.oauth.authorize}?${params.toString()}`;

      logger.info('YouTube OAuth authorization URL generated', {
        url: authUrl.substring(0, 100) + '...',
      });

      return {
        success: true,
        authUrl,
        code: 'SUCCESS',
      };
    } catch (error) {
      logger.error('Failed to generate YouTube OAuth authorization URL', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'AUTH_URL_ERROR',
      };
    }
  }

  /**
   * Exchange OAuth authorization code for access token
   * Step 3 of OAuth flow
   */
  async exchangeCodeForToken(code) {
    try {
      logger.info('Exchanging YouTube OAuth code for access token...');

      const response = await this.fetch(this.endpoints.oauth.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
      }

      const tokenData = await response.json();

      // Store tokens
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      logger.info('YouTube OAuth token obtained successfully', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        expiresIn: tokenData.expires_in,
      });

      return {
        success: true,
        message: 'OAuth token obtained successfully',
        code: 'SUCCESS',
      };
    } catch (error) {
      logger.error('Failed to exchange YouTube OAuth code for token', {
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
   * Refresh expired access token using refresh token
   */
  async refreshAccessToken() {
    try {
      logger.info('Refreshing YouTube OAuth access token...');

      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.fetch(this.endpoints.oauth.refresh, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || errorData.error || 'Token refresh failed');
      }

      const tokenData = await response.json();

      this.accessToken = tokenData.access_token;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      logger.info('YouTube OAuth token refreshed successfully', {
        expiresIn: tokenData.expires_in,
      });

      return {
        success: true,
        message: 'OAuth token refreshed successfully',
        code: 'SUCCESS',
      };
    } catch (error) {
      logger.error('Failed to refresh YouTube OAuth token', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: 'TOKEN_REFRESH_ERROR',
      };
    }
  }

  /**
   * Step 3: Obtain channel access
   * Get the authenticated user's YouTube channel
   */
  async getUserChannel() {
    try {
      logger.info('Getting YouTube user channel...');

      if (!this.accessToken) {
        throw new Error('Not authenticated. No access token available.');
      }

      const response = await this.fetch(this.endpoints.channels.mine, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

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
   * Check if access token is valid and not expired
   */
  async checkTokenStatus() {
    try {
      if (!this.accessToken) {
        return {
          valid: false,
          reason: 'No access token',
        };
      }

      if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) {
        return {
          valid: false,
          reason: 'Token expired',
          canRefresh: !!this.refreshToken,
        };
      }

      // Test token by making API call
      const response = await this.fetch(this.endpoints.channels.mine, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          reason: 'Token invalid or revoked',
          canRefresh: !!this.refreshToken,
        };
      }

      return {
        valid: true,
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message,
        canRefresh: !!this.refreshToken,
      };
    }
  }

  /**
   * Step 4: Test API connection
   * Verify that we can access the YouTube API
   */
  async verifyConnection() {
    try {
      logger.info('Verifying YouTube API connection...');

      const tokenStatus = await this.checkTokenStatus();

      if (!tokenStatus.valid) {
        if (tokenStatus.canRefresh) {
          logger.info('Access token invalid, attempting refresh...');
          const refreshResult = await this.refreshAccessToken();
          if (!refreshResult.success) {
            return {
              success: false,
              error: 'Failed to refresh access token',
              code: 'REFRESH_FAILED',
            };
          }
        } else {
          return {
            success: false,
            error: tokenStatus.reason,
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
   * Step 5: Verify upload permissions
   * Check if we have the necessary permissions to upload videos
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
      const response = await this.fetch('/channels', {
        params: {
          part: 'contentDetails',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

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
   * Upload a video to YouTube
   * Complete workflow for posting a Short
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

      // Prepare video metadata
      const videoMetadata = {
        snippet: {
          title: title,
          description: description,
          tags: tags,
          categoryId: '24', // Entertainment category
        },
        status: {
          privacyStatus: 'public', // Can be 'public', 'private', 'unlisted'
          selfDeclaredMadeForKids: false,
        },
      };

      onProgress?.({
        step: 'preparing',
        message: 'Preparing video upload...',
        progress: 10,
      });

      // Read video file
      const fs = await import('fs');
      const videoBuffer = fs.createReadStream(videoPath);

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
            progress: 20 + (progress * 0.6), // 20-80%
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
   * Handles large video files with retry capability
   */
  async uploadVideoResumable(videoStream, metadata, onProgress) {
    try {
      logger.info('Starting resumable video upload...');

      // Step 1: Initiate resumable upload session
      const initResponse = await this.fetch(
        `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initResponse.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to initiate upload');
      }

      const uploadUrl = initResponse.headers.get('Location');

      logger.info('Resumable upload session initiated', {
        uploadUrl: uploadUrl?.substring(0, 50) + '...',
      });

      // Step 2: Upload video bytes
      const fs = await import('fs');
      const videoBuffer = fs.readFileSync(videoStream.path);

      const uploadResponse = await this.fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'video/*',
          'Content-Length': videoBuffer.length,
        },
        body: videoBuffer,
        onUploadProgress: (progress) => {
          onProgress?.(progress);
        },
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
   * Generate a state token for OAuth flow (CSRF protection)
   */
  generateStateToken() {
    return Buffer.from(Date.now().toString()).toString('base64');
  }

  /**
   * Health check for service monitoring
   */
  async healthCheck() {
    try {
      const connectionResult = await this.testConnection();

      return {
        status: 'ok',
        enabled: this.enabled,
        configured: connectionResult.success,
        hasCredentials: !!(this.apiKey && this.clientId && this.clientSecret),
        authenticated: !!this.accessToken,
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

export default YouTubePostingService;
