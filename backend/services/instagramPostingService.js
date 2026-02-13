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

import BaseApiClient from "./baseApiClient.js";
import { getLogger } from "../utils/logger.js";
import rateLimiterService from "./rateLimiter.js";
import oauthManager from "./oauthManager.js";
import { formatHashtagsForPosting } from "../utils/hashtagUtils.js";

const logger = getLogger("services", "instagram-posting");

class InstagramPostingService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: "InstagramPosting",
      baseURL: "https://graph.facebook.com/v18.0",
      timeout: 60000,
      ...config,
    });

    // Instagram Graph API credentials
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    this.enabled = process.env.ENABLE_INSTAGRAM_POSTING === "true";

    // Track Instagram account info
    this.instagramBusinessAccountId = null;
    this.instagramUserId = null;
    this.pageAccessToken = null; // Page Access Token for Instagram operations
    this.pageId = null;

    // Instagram Graph API endpoints
    this.endpoints = {
      oauth: {
        authorize: "https://www.facebook.com/v18.0/dialog/oauth",
        token: "https://graph.facebook.com/v18.0/oauth/access_token",
        refresh: "https://graph.facebook.com/v18.0/oauth/access_token",
      },
      media: {
        create: "/{instagram_user_id}/media",
        status: "/{container_id}?fields=status_code",
        publish: "/{instagram_user_id}/media_publish",
      },
      user: {
        info: "/{instagram_user_id}?fields=username,account_type,media_count",
        accounts:
          "/me/accounts?fields=instagram_business_account{id,username,name,profile_pic_url}",
      },
      discovery: {
        businessAccount:
          "/me/accounts?fields=id,name,category,instagram_business_account{id,username,name,profile_pic_url}",
      },
    };

    // OAuth scopes for Instagram Reels
    this.scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "pages_read_engagement",
      "pages_show_list",
    ];

    logger.info("Instagram Posting Service initialized", {
      enabled: this.enabled,
      appIdConfigured: !!this.appId,
      appSecretConfigured: !!this.appSecret,
      redirectUriConfigured: !!this.redirectUri,
    });
  }

  /**
   * Ensure Instagram User ID is loaded from database
   * Tries to load from token metadata first, falls back to API discovery
   */
  async ensureInstagramUserId() {
    // If already loaded, return
    if (this.instagramUserId) {
      return { success: true, instagramUserId: this.instagramUserId };
    }

    try {
      // Try to load from token metadata
      const { default: AuthToken } = await import("../models/AuthToken.js");
      const token = await AuthToken.getActiveToken("instagram");

      if (token && token.metadata?.instagramUserId) {
        this.instagramUserId = token.metadata.instagramUserId;
        this.instagramBusinessAccountId = token.metadata.instagramUserId;
        logger.info("Instagram User ID loaded from token metadata", {
          instagramUserId: this.instagramUserId,
        });
        return { success: true, instagramUserId: this.instagramUserId };
      }

      // Not in metadata, try to discover
      logger.info(
        "Instagram User ID not in token metadata, attempting discovery...",
      );
      const discoveryResult = await this.discoverBusinessAccount();

      if (discoveryResult.success && discoveryResult.businessAccount) {
        // Save to token metadata for next time
        if (token) {
          token.metadata = token.metadata || {};
          token.metadata.instagramUserId = discoveryResult.businessAccount.id;
          token.metadata.instagramUsername =
            discoveryResult.businessAccount.username;
          token.metadata.pageId = discoveryResult.pageId;
          await token.save();
        }
        return { success: true, instagramUserId: this.instagramUserId };
      }

      return {
        success: false,
        error: discoveryResult.error || "Instagram User ID not set",
        code: discoveryResult.code || "NO_INSTAGRAM_USER_ID",
      };
    } catch (error) {
      logger.error("Failed to ensure Instagram User ID", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Ensure Page Access Token is loaded
   * Instagram API with Facebook Login requires Page Access Token for media operations
   */
  async ensurePageAccessToken() {
    // If already loaded, return
    if (this.pageAccessToken) {
      return { success: true, pageAccessToken: this.pageAccessToken };
    }

    try {
      // Get token from database
      const { default: AuthToken } = await import("../models/AuthToken.js");
      const tokenModel = await AuthToken.getActiveToken("instagram");
      const token = await oauthManager.getToken("instagram");

      if (!token || !token.accessToken || !tokenModel) {
        return {
          success: false,
          error: "Not authenticated - no access token",
          code: "NOT_AUTHENTICATED",
        };
      }

      let pageId = null;
      let pageAccessToken = null;

      // Priority 1: Use Page ID from token metadata
      if (tokenModel.metadata?.pageId) {
        pageId = tokenModel.metadata.pageId;
        logger.info("Using Page ID from token metadata", { pageId });
      }

      // Priority 2: Try /me/accounts
      if (!pageId) {
        logger.info("Fetching Facebook Pages from /me/accounts...");
        const pagesUrl = `${this.baseURL}/me/accounts?fields=id,name,access_token`;
        const pagesResp = await fetch(pagesUrl, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });

        if (pagesResp.ok) {
          const pagesData = await pagesResp.json();
          if (pagesData.data && pagesData.data.length > 0) {
            const page =
              pagesData.data.find((p) => p.access_token) || pagesData.data[0];
            pageId = page.id;
            pageAccessToken = page.access_token;
            logger.info("Found Page from /me/accounts", {
              pageId,
              hasToken: !!pageAccessToken,
            });
          }
        }
      }

      // Priority 3: Use known Page ID fallback
      if (!pageId && tokenModel.metadata?.pageId) {
        pageId = tokenModel.metadata.pageId;
      }

      // Get Page access token if we don't have it yet
      if (!pageAccessToken && pageId) {
        const pageUrl = `${this.baseURL}/${pageId}?fields=id,name,access_token,instagram_business_account`;
        const pageResp = await fetch(pageUrl, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });

        if (!pageResp.ok) {
          const errorData = await pageResp.json();
          return {
            success: false,
            error: `Failed to get Page access token: ${errorData.error?.message || pageResp.status}`,
            code: "PAGE_ACCESS_FAILED",
          };
        }

        const pageData = await pageResp.json();
        pageAccessToken = pageData.access_token;

        // Store in metadata for next time
        tokenModel.metadata = tokenModel.metadata || {};
        tokenModel.metadata.pageId = pageId;
        if (pageData.instagram_business_account?.id) {
          tokenModel.metadata.instagramUserId =
            pageData.instagram_business_account.id;
        }
        await tokenModel.save();

        logger.info("Got Page access token", {
          pageId,
          pageName: pageData.name,
          hasToken: true,
        });
      }

      if (!pageAccessToken) {
        return {
          success: false,
          error:
            "Could not get Page Access Token. Please ensure your Facebook Page is properly connected.",
          code: "NO_PAGE_TOKEN",
        };
      }

      // Cache for future use
      this.pageAccessToken = pageAccessToken;
      this.pageId = pageId;

      return { success: true, pageAccessToken, pageId };
    } catch (error) {
      logger.error("Failed to ensure Page Access Token", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test connection to Instagram Graph API
   */
  async testConnection() {
    try {
      logger.info("Testing Instagram Graph API connection...");

      if (!this.enabled) {
        return {
          success: false,
          error: "Instagram posting is disabled in configuration",
          code: "DISABLED",
        };
      }

      if (!this.appId || !this.appSecret) {
        return {
          success: false,
          error: "Instagram Graph API credentials not configured",
          code: "MISSING_CREDENTIALS",
          details: {
            appIdConfigured: !!this.appId,
            appSecretConfigured: !!this.appSecret,
          },
        };
      }

      if (!this.redirectUri) {
        return {
          success: false,
          error: "Instagram redirect URI not configured",
          code: "MISSING_REDIRECT_URI",
        };
      }

      const isAuthenticated = await oauthManager.isAuthenticated("instagram");

      logger.info("Instagram Graph API connection test successful", {
        authenticated: isAuthenticated,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
      });

      return {
        success: true,
        authenticated: isAuthenticated,
        hasCredentials: true,
        message: "Instagram Graph API credentials configured successfully",
      };
    } catch (error) {
      logger.error("Instagram Graph API connection test failed", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: "CONNECTION_ERROR",
      };
    }
  }

  /**
   * Check token status
   */
  async checkTokenStatus() {
    try {
      const isAuthenticated = await oauthManager.isAuthenticated("instagram");
      const token = await oauthManager.getToken("instagram");

      return {
        authenticated: isAuthenticated,
        hasToken: !!token,
        expiresAt: token?.expiresAt,
        canRefresh: !!token?.refreshToken,
      };
    } catch (error) {
      logger.error("Token status check failed", {
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
    return oauthManager
      .getAuthorizationUrl("instagram", this.scopes)
      .then(({ authUrl }) => authUrl);
  }

  /**
   * Exchange authorization code for access token
   * @deprecated Use oauthManager.handleCallback('instagram', callbackUrl, state) directly
   */
  async exchangeCodeForToken(code) {
    logger.warn(
      "exchangeCodeForToken is deprecated, use oauthManager.handleCallback instead",
    );
    return {
      success: false,
      error:
        "This method is deprecated. Use the unified OAuth callback handler.",
    };
  }

  /**
   * Refresh access token
   * @deprecated Handled automatically by OAuth2Fetch
   */
  async refreshAccessToken() {
    logger.warn("refreshAccessToken is deprecated, token refresh is automatic");
    return {
      success: false,
      error: "Token refresh is now handled automatically by OAuth2Fetch",
    };
  }

  /**
   * Verify permissions for content publishing
   */
  async verifyPermissions() {
    try {
      logger.info("Verifying Instagram Graph API permissions...");

      const token = await oauthManager.getToken("instagram");
      if (!token || !token.accessToken) {
        return {
          success: false,
          error: "Not authenticated - no access token",
          code: "NOT_AUTHENTICATED",
        };
      }

      // Required permissions for Instagram Reels publishing
      const requiredPermissions = [
        "instagram_basic",
        "instagram_content_publish",
        "pages_read_engagement",
        "pages_show_list",
      ];

      // Debug token info to check permissions
      const debugUrl = `${this.baseURL}/debug_token?input_token=${token.accessToken}`;
      const response = await rateLimiterService.fetch(debugUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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
      const grantedScopesArray = grantedScopes.split(",");

      // Check which permissions are granted
      const permissionStatus = requiredPermissions.map((perm) => ({
        permission: perm,
        granted: grantedScopesArray.includes(perm),
      }));

      const missingPermissions = permissionStatus
        .filter((p) => !p.granted)
        .map((p) => p.permission);

      const hasAllPermissions = missingPermissions.length === 0;

      logger.info("Instagram Graph API permissions verified", {
        hasAllPermissions,
        grantedCount: permissionStatus.filter((p) => p.granted).length,
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
          ? "All required permissions granted"
          : "Some permissions are missing",
      };
    } catch (error) {
      logger.error("Instagram Graph API permissions verification failed", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: "PERMISSIONS_CHECK_ERROR",
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
          error: "Instagram user ID not set",
        };
      }

      const endpoint = this.endpoints.user.info.replace(
        "{instagram_user_id}",
        this.instagramUserId,
      );
      const response = await this.request(endpoint);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error("Failed to get Instagram user info", {
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
   * Uses Page access token to query /instagram_accounts edge
   * Prioritizes: token metadata > /me/accounts > hard-coded fallback
   */
  async discoverBusinessAccount() {
    try {
      logger.info("Discovering Instagram business account...");

      // Get both the Mongoose model and the plain token object
      const { default: AuthToken } = await import("../models/AuthToken.js");
      const tokenModel = await AuthToken.getActiveToken("instagram");
      const token = await oauthManager.getToken("instagram");

      if (!token || !token.accessToken || !tokenModel) {
        return {
          success: false,
          error: "Not authenticated - no access token",
          code: "NOT_AUTHENTICATED",
        };
      }

      let pageId = null;
      let pageAccessToken = null;
      let pageName = null;

      // Priority 1: Use Page ID from token metadata (stored during previous discovery)
      if (tokenModel.metadata?.pageId) {
        pageId = tokenModel.metadata.pageId;
        logger.info("Using Page ID from token metadata", { pageId });
      }

      // Priority 2: Try /me/accounts
      if (!pageId) {
        logger.info("Fetching Facebook Pages from /me/accounts...");
        const pagesUrl = `${this.baseURL}/me/accounts?fields=id,name,access_token`;
        const pagesResp = await fetch(pagesUrl, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });

        if (pagesResp.ok) {
          const pagesData = await pagesResp.json();
          if (pagesData.data && pagesData.data.length > 0) {
            const page =
              pagesData.data.find((p) => p.access_token) || pagesData.data[0];
            pageId = page.id;
            pageAccessToken = page.access_token;
            pageName = page.name;
            logger.info("Found Page from /me/accounts", { pageId, pageName });
          }
        }
      }

      // Priority 3: Use well-known Page ID for this user (temporary fallback)
      if (!pageId) {
        // Check if we're in development mode with known Page ID
        const knownPageId = "1002795712911665"; // Your Facebook Page ID
        logger.info("Using known Page ID as fallback", { pageId: knownPageId });
        pageId = knownPageId;
      }

      // Get Page access token if we don't have it yet
      if (!pageAccessToken && pageId) {
        const pageUrl = `${this.baseURL}/${pageId}?fields=id,name,access_token,instagram_business_account`;
        const pageResp = await fetch(pageUrl, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });

        if (pageResp.ok) {
          const pageData = await pageResp.json();
          pageAccessToken = pageData.access_token;
          pageName = pageData.name;

          // Store in metadata for next time using Mongoose model
          tokenModel.metadata = tokenModel.metadata || {};
          tokenModel.metadata.pageId = pageId;

          // Also store Instagram Business Account ID if available
          if (pageData.instagram_business_account?.id) {
            tokenModel.metadata.instagramUserId =
              pageData.instagram_business_account.id;
            logger.info("Got Instagram Business Account from Page", {
              igUserId: pageData.instagram_business_account.id,
            });
          }

          await tokenModel.save();

          logger.info("Got Page access token", {
            pageId,
            pageName,
            hasToken: true,
          });
        }
      }

      if (!pageAccessToken) {
        return {
          success: false,
          error: "Could not get Page access token",
          code: "NO_PAGE_TOKEN",
        };
      }

      // Step 2: Use Page access token to get Instagram accounts
      logger.info("Fetching Instagram accounts for Page...");
      const igAccountsUrl = `${this.baseURL}/${pageId}/instagram_accounts`;
      const igAccountsResp = await fetch(igAccountsUrl, {
        headers: { Authorization: `Bearer ${pageAccessToken}` },
      });

      if (!igAccountsResp.ok) {
        const errorData = await igAccountsResp.json();
        logger.error("Failed to fetch Instagram accounts", {
          status: igAccountsResp.status,
          error: errorData,
        });
        return {
          success: false,
          error: `Failed to fetch Instagram accounts: ${errorData.error?.message || igAccountsResp.status}`,
          code: "INSTAGRAM_FETCH_FAILED",
        };
      }

      const igAccountsData = await igAccountsResp.json();

      if (!igAccountsData.data || igAccountsData.data.length === 0) {
        logger.warn("No Instagram accounts found for this Page", {
          pageId,
          pageName,
        });
        return {
          success: false,
          error: `No Instagram Business Account connected to Page "${pageName || pageId}". Please connect your Instagram Professional account in Meta Business Suite.`,
          code: "NO_INSTAGRAM_ACCOUNT",
          details: {
            pageId,
            pageName,
            instructions: [
              "1. Go to business.facebook.com",
              `2. Select your Page: "${pageName || pageId}"`,
              "3. Go to Settings > Business assets > Instagram accounts",
              '4. Click "Add an account" and connect your Instagram Professional account',
            ],
          },
        };
      }

      // Get the first Instagram account ID
      const igAccountId = igAccountsData.data[0].id;
      logger.info("Found Instagram account", { igAccountId });

      // Step 3: Try to get more details via business_discovery
      let businessAccount = { id: igAccountId };
      try {
        const businessDiscUrl = `${this.baseURL}/${pageId}?fields=business_discovery.username(blush.spicy){id,username,profile_picture_url}`;
        const businessDiscResp = await fetch(businessDiscUrl, {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        });

        if (businessDiscResp.ok) {
          const businessDiscData = await businessDiscResp.json();
          if (businessDiscData.business_discovery) {
            businessAccount = businessDiscData.business_discovery;
            logger.info("Got business_discovery details", {
              username: businessAccount.username,
            });

            // Store in metadata for next time using Mongoose model
            tokenModel.metadata = tokenModel.metadata || {};
            tokenModel.metadata.instagramUserId = businessAccount.id;
            tokenModel.metadata.instagramUsername = businessAccount.username;
            await tokenModel.save();
          }
        }
      } catch (e) {
        logger.debug("business_discovery failed, using basic ID", {
          error: e.message,
        });
      }

      this.instagramBusinessAccountId = businessAccount.id;
      this.instagramUserId = businessAccount.id;

      logger.info("Instagram business account discovered", {
        instagramUserId: this.instagramUserId,
        username: businessAccount.username,
        pageId,
        pageName,
      });

      return {
        success: true,
        businessAccount,
        pageId,
        message: "Instagram business account connected successfully",
      };
    } catch (error) {
      logger.error("Failed to discover Instagram business account", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: "DISCOVERY_ERROR",
      };
    }
  }

  /**
   * Create media container for Instagram Reels
   * IMPORTANT: Requires Page Access Token, not User Access Token
   */
  async createMediaContainer(videoUrl, caption, hashtags = []) {
    try {
      logger.info("Creating Instagram media container...", {
        videoUrl,
        captionLength: caption?.length,
        hashtagCount: hashtags?.length,
      });

      if (!this.instagramUserId) {
        throw new Error("Instagram user ID not set");
      }

      // Get Page Access Token (required for Instagram API with Facebook Login)
      const pageTokenResult = await this.ensurePageAccessToken();
      if (!pageTokenResult.success) {
        throw new Error(pageTokenResult.error);
      }

      const endpoint = this.endpoints.media.create.replace(
        "{instagram_user_id}",
        this.instagramUserId,
      );

      // Combine caption and hashtags (format with "#" prefix)
      const fullCaption =
        hashtags.length > 0 ? `${caption}\n\n${formatHashtagsForPosting(hashtags).join(" ")}` : caption;

      const params = new URLSearchParams({
        video_url: videoUrl,
        caption: fullCaption,
        media_type: "REELS",
      });

      // Use Page Access Token for container creation
      const response = await rateLimiterService.fetch(
        `${this.baseURL}${endpoint}?${params}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.pageAccessToken}`,
          },
        },
      );

      if (!response.ok) {
        // Try to get detailed error from response body
        let errorDetails = `Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            if (errorData.error.message) {
              errorDetails += ` | Message: ${errorData.error.message}`;
            }
            if (errorData.error.type) {
              errorDetails += ` | Type: ${errorData.error.type}`;
            }
            if (errorData.error.code) {
              errorDetails += ` | Code: ${errorData.error.code}`;
            }
          }
          logger.error("Instagram API error response", {
            status: response.status,
            errorData,
          });
        } catch (parseError) {
          logger.error("Could not parse Instagram error response", {
            status: response.status,
            parseError: parseError.message,
          });
        }
        throw new Error(`Media container creation failed: ${errorDetails}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      logger.info("Instagram media container created successfully", {
        containerId: data.id,
      });

      return {
        success: true,
        containerId: data.id,
      };
    } catch (error) {
      logger.error("Failed to create Instagram media container", {
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
   * IMPORTANT: Requires Page Access Token, not User Access Token
   */
  async checkContainerStatus(containerId) {
    try {
      logger.info("Checking Instagram media container status...", {
        containerId,
      });

      // Ensure we have Page Access Token
      const pageTokenResult = await this.ensurePageAccessToken();
      if (!pageTokenResult.success) {
        throw new Error(pageTokenResult.error);
      }

      const endpoint = this.endpoints.media.status.replace(
        "{container_id}",
        containerId,
      );

      // Use Page Access Token for status check
      const response = await rateLimiterService.fetch(
        `${this.baseURL}${endpoint}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.pageAccessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Container status check failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const statusCode = data.status_code;
      const isFinished = statusCode === "FINISHED";

      logger.info("Instagram media container status checked", {
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
      logger.error("Failed to check container status", {
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
   * IMPORTANT: Requires Page Access Token, not User Access Token
   */
  async publishMediaContainer(containerId) {
    try {
      logger.info("Publishing Instagram media container...", {
        containerId,
      });

      if (!this.instagramUserId) {
        throw new Error("Instagram user ID not set");
      }

      // Ensure we have Page Access Token
      const pageTokenResult = await this.ensurePageAccessToken();
      if (!pageTokenResult.success) {
        throw new Error(pageTokenResult.error);
      }

      const endpoint = this.endpoints.media.publish.replace(
        "{instagram_user_id}",
        this.instagramUserId,
      );

      const params = new URLSearchParams({
        creation_id: containerId,
      });

      // Use Page Access Token for publishing
      const response = await rateLimiterService.fetch(
        `${this.baseURL}${endpoint}?${params}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.pageAccessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Media publish failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      logger.info("Instagram media published successfully", {
        mediaId: data.id,
      });

      return {
        success: true,
        mediaId: data.id,
      };
    } catch (error) {
      logger.error("Failed to publish Instagram media", {
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
   * @param {string} videoPath - Local video path (for logging only, S3 URL should be provided)
   * @param {string} caption - Post caption
   * @param {Array} hashtags - Array of hashtags
   * @param {Function} onProgress - Progress callback
   * @param {string} s3Url - Public S3 URL for the video (required for Instagram API)
   * @param {Object} post - MarketingPost document (for saving container state)
   */
  async postVideo(
    videoPath,
    caption,
    hashtags = [],
    onProgress,
    s3Url = null,
    post = null,
  ) {
    try {
      logger.info("Starting Instagram Reels posting workflow...", {
        videoPath,
        captionLength: caption?.length,
        hashtagCount: hashtags?.length,
        hasS3Url: !!s3Url,
        hasPostObject: !!post,
        existingContainerId: post?.instagramContainerId,
      });

      // Ensure Instagram User ID is loaded from database
      const userIdResult = await this.ensureInstagramUserId();
      if (!userIdResult.success) {
        throw new Error(userIdResult.error);
      }

      // Instagram API requires a publicly accessible video URL
      const videoUrl = s3Url || videoPath;

      if (!videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
        throw new Error(
          "Instagram API requires a public URL for video. Please provide S3 URL.",
        );
      }

      let containerId;

      // STEP 1: Check for existing container (retry scenario)
      if (post?.instagramContainerId) {
        containerId = post.instagramContainerId;
        logger.info("Found existing Instagram container, checking status...", {
          containerId,
          previousStatus: post.instagramContainerStatus,
        });

        // Check if the existing container is still valid
        const statusResult = await this.checkContainerStatus(containerId);

        if (!statusResult.success) {
          // Container check failed - might be expired or invalid
          logger.warn(
            "Existing container check failed, creating new container",
            {
              containerId,
              error: statusResult.error,
            },
          );
          containerId = null;
        } else if (
          statusResult.statusCode === "ERROR" ||
          statusResult.statusCode === "EXPIRED"
        ) {
          logger.warn(
            "Existing container is in error or expired state, creating new container",
            {
              containerId,
              statusCode: statusResult.statusCode,
            },
          );
          containerId = null;
        } else if (statusResult.isFinished) {
          // Container is already finished, skip to publishing
          logger.info(
            "Existing container already finished, proceeding to publish",
            {
              containerId,
            },
          );
          onProgress?.({
            stage: "container_already_finished",
            progress: 80,
            containerId,
          });
        } else {
          // Container is still in progress, continue waiting
          logger.info(
            "Existing container still processing, will continue waiting",
            {
              containerId,
              statusCode: statusResult.statusCode,
            },
          );
          onProgress?.({
            stage: "resuming_container_processing",
            progress: 50,
            containerId,
          });
        }
      }

      // STEP 2: Create new container if needed
      if (!containerId) {
        onProgress?.({ stage: "creating_container", progress: 10 });

        const containerResult = await this.createMediaContainer(
          videoUrl,
          caption,
          hashtags,
        );

        if (!containerResult.success) {
          throw new Error(
            `Failed to create media container: ${containerResult.error}`,
          );
        }

        containerId = containerResult.containerId;
        onProgress?.({ stage: "container_created", progress: 30, containerId });

        // Save container ID immediately to post for retry capability
        if (post) {
          post.instagramContainerId = containerId;
          post.instagramContainerStatus = "IN_PROGRESS";
          await post.save();
          logger.info("Saved container ID to post for retry capability", {
            postId: post._id,
            containerId,
          });
        }
      }

      // STEP 3: Wait for container to be processed (if not already finished)
      onProgress?.({ stage: "processing_video", progress: 50 });

      let attempts = 0;
      const maxAttempts = 20;
      let isFinished = false;

      // Check if already finished before entering loop
      const initialStatusResult = await this.checkContainerStatus(containerId);
      if (initialStatusResult.success && initialStatusResult.isFinished) {
        isFinished = true;
        logger.info("Container already finished, skipping wait loop");
      }

      while (!isFinished && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusResult = await this.checkContainerStatus(containerId);

        if (!statusResult.success) {
          throw new Error(
            `Failed to check container status: ${statusResult.error}`,
          );
        }

        isFinished = statusResult.isFinished;
        attempts++;

        // Update container status on post
        if (post && statusResult.statusCode) {
          post.instagramContainerStatus = statusResult.statusCode;
          await post.save();
        }

        onProgress?.({
          stage: "processing_video",
          progress: 50 + (attempts / maxAttempts) * 30,
          attempts,
          statusCode: statusResult.statusCode,
        });
      }

      if (!isFinished) {
        throw new Error("Video processing timed out");
      }

      // Update status to finished
      if (post) {
        post.instagramContainerStatus = "FINISHED";
        await post.save();
      }

      // STEP 4: Publish the media
      onProgress?.({ stage: "publishing", progress: 90 });

      const publishResult = await this.publishMediaContainer(containerId);

      if (!publishResult.success) {
        throw new Error(`Failed to publish media: ${publishResult.error}`);
      }

      const publishId = publishResult.mediaId;

      // STEP 5: Fetch permalink from Instagram and get CORRECT media ID for insights
      // The publish response ID doesn't work with insights - need to query /me/media for actual ID
      let permalink = null;
      let insightsMediaId = publishId; // fallback to publish ID
      try {
        permalink = await this.getMediaPermalink(publishId);
        logger.info("Fetched Instagram media permalink", { permalink });

        // CRITICAL: Query /me/media to get the ACTUAL media ID that works with insights
        // The publish response ID is different from the media ID needed for insights endpoint
        const correctMediaId = await this.getMediaIdForInsights(
          publishId,
          permalink,
        );
        if (correctMediaId) {
          insightsMediaId = correctMediaId;
          logger.info("Retrieved correct media ID for insights", {
            publishId,
            insightsMediaId: correctMediaId,
          });
        }
      } catch (permalinkError) {
        logger.warn("Failed to fetch permalink (non-critical)", {
          error: permalinkError.message,
        });
      }

      onProgress({
        stage: "completed",
        progress: 100,
        mediaId: insightsMediaId,
        permalink,
      });

      logger.info("Instagram Reels posted successfully", {
        publishId,
        insightsMediaId,
        permalink,
      });

      return {
        success: true,
        mediaId: insightsMediaId, // Return the ID that works with insights!
        permalink,
        containerId,
        message: "Instagram Reel posted successfully",
      };
    } catch (error) {
      logger.error("Failed to post Instagram Reel", {
        error: error.message,
        stack: error.stack,
      });

      // Update container status to error on post
      if (post && post.instagramContainerId) {
        post.instagramContainerStatus = "ERROR";
        await post.save();
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get permalink for an Instagram media
   * @param {string} mediaId - The Instagram media ID
   * @returns {Promise<string|null>} The permalink or null if fetch fails
   */
  async getMediaPermalink(mediaId) {
    try {
      if (!this.instagramUserId) {
        throw new Error("Instagram user ID not set");
      }

      // Ensure we have Page Access Token
      const pageTokenResult = await this.ensurePageAccessToken();
      if (!pageTokenResult.success) {
        throw new Error(pageTokenResult.error);
      }

      // Query the media object with permalink field
      const endpoint = `/${mediaId}?fields=permalink`;

      // Use Page Access Token for permalink fetch
      const response = await rateLimiterService.fetch(
        `${this.baseURL}${endpoint}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.pageAccessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch media permalink: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.permalink || null;
    } catch (error) {
      logger.error("Failed to fetch Instagram media permalink", {
        error: error.message,
        mediaId,
      });
      return null;
    }
  }

  /**
   * Get the correct media ID for insights API
   * After publishing, the returned ID doesn't work with insights.
   * We need to query /me/media to find the media object and get its actual ID.
   *
   * @param {string} publishId - The ID returned from publishMediaContainer
   * @param {string} permalink - The permalink URL (contains short code as fallback)
   * @returns {Promise<string|null>} The media ID that works with insights endpoint
   */
  async getMediaIdForInsights(publishId, permalink) {
    try {
      // Ensure we have Page Access Token
      const pageTokenResult = await this.ensurePageAccessToken();
      if (!pageTokenResult.success) {
        throw new Error(pageTokenResult.error);
      }

      // Extract short code from permalink for fallback matching
      // e.g., https://www.instagram.com/reel/DUlp2l1ASyG/ -> DUlp2l1ASyG
      const permalinkMatch = permalink?.match(
        /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      );
      const shortCode = permalinkMatch ? permalinkMatch[1] : null;

      // Approach 1: Query /me/media and find by timestamp
      // Recently posted media should appear first
      const mediaEndpoint = `/${this.instagramUserId}/media`;
      const mediaUrl = `${this.baseURL}${mediaEndpoint}?fields=id,permalink,timestamp,media_type&limit=25`;

      logger.info("Querying /me/media to find correct media ID for insights", {
        publishId,
        shortCode,
      });

      const response = await rateLimiterService.fetch(mediaUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.pageAccessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to query user media: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const mediaItems = data.data || [];

      // Find matching media - try multiple approaches
      let matchedMedia = null;

      // Approach 1: Match by short code from permalink
      if (shortCode) {
        matchedMedia = mediaItems.find((item) => {
          const itemPermalink = item.permalink || "";
          return (
            itemPermalink.includes(shortCode) || itemPermalink === permalink
          );
        });
        logger.debug("Trying to match by permalink short code", {
          shortCode,
          found: !!matchedMedia,
        });
      }

      // Approach 2: Match by publish ID (ig_id field sometimes matches publish ID)
      if (!matchedMedia) {
        // The media object's 'id' field is what we need for insights
        // But sometimes publish returns a different ID format
        // Just take the most recent REEL
        const recentReels = mediaItems.filter(
          (item) =>
            item.media_type === "CAROUSEL" ||
            item.media_type === "REEL" ||
            !item.media_type,
        );

        if (recentReels.length > 0) {
          // Take the most recent one (likely what we just posted)
          matchedMedia = recentReels[0];
          logger.debug("Using most recent reel as fallback", {
            id: matchedMedia.id,
            permalink: matchedMedia.permalink,
          });
        }
      }

      if (matchedMedia) {
        logger.info("Found matching media for insights", {
          publishId,
          insightsMediaId: matchedMedia.id,
          permalink: matchedMedia.permalink,
        });
        return matchedMedia.id; // This is the ID that works with /insights endpoint
      }

      logger.warn("Could not find matching media for insights", {
        publishId,
        shortCode,
        totalMediaItems: mediaItems.length,
      });

      return publishId; // Fallback to original publish ID
    } catch (error) {
      logger.error("Failed to get media ID for insights", {
        error: error.message,
        publishId,
      });
      return null;
    }
  }

  /**
   * Make authenticated request using BaseApiClient
   * Overrides the base method to inject OAuth token
   */
  async request(endpoint, options = {}) {
    const token = await oauthManager.getToken("instagram");
    if (!token || !token.accessToken) {
      throw new Error("Not authenticated - no access token");
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await rateLimiterService.fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token.accessToken}`,
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
    const isAuthenticated = await oauthManager.isAuthenticated("instagram");

    return {
      success: true,
      service: "instagram-posting",
      status: "ok",
      enabled: this.enabled,
      timestamp: new Date().toISOString(),
      capabilities: {
        configured: !!this.appId && !!this.appSecret,
        authenticated: isAuthenticated,
        hasBusinessAccount: !!this.instagramBusinessAccountId,
        supportsReels: true,
        maxDuration: 90,
        features: [
          "oauth_authentication",
          "reels_upload",
          "caption_and_hashtags",
          "status_tracking",
          "container_creation",
          "media_publishing",
        ],
      },
    };
  }
}

export default new InstagramPostingService();
