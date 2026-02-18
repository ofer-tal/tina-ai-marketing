import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('models', 'auth-token');

/**
 * Marketing Auth Token Model
 *
 * Generic storage for OAuth/API tokens across all marketing platforms.
 * Supports TikTok, Instagram, YouTube, Twitter/X, Pinterest, Reddit, Apple Search Ads, etc.
 *
 * This allows the marketing daemon to access multiple platforms with persisted
 * credentials that survive server restarts.
 */
const authTokenSchema = new mongoose.Schema({
  // Platform identifier (tiktok, instagram, google (for Google Sheets), youtube (for YouTube), twitter, pinterest, reddit, apple_search_ads, etc.)
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'instagram', 'google', 'youtube', 'twitter', 'pinterest', 'reddit', 'apple_search_ads', 'facebook', 'tiktok_ads', 'google_ads'],
  },

  // OAuth/API Token fields
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: false, // Not all platforms provide refresh tokens
  },
  tokenType: {
    type: String,
    enum: ['oauth', 'bearer', 'api_key', 'basic'],
    default: 'oauth',
  },

  // Platform-specific identifiers
  creatorId: String,          // TikTok creator ID
  accountId: String,          // Instagram/YouTube account ID
  pageId: String,             // Facebook page ID
  developerAccountId: String, // Apple/TikTok dev account ID

  // Token scopes/permissions
  scope: [{
    type: String,
  }],

  // Token expiration
  expiresAt: {
    type: Date,
    required: false,
  },

  // User/Account info from platform
  userInfo: {
    // Common fields
    displayName: String,
    username: String,
    avatarUrl: String,
    bio: String,
    isVerified: Boolean,
    profileUrl: String,

    // Platform-specific
    email: String,
    locale: String,
  },

  // Metadata
  lastRefreshedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  // Additional platform-specific data (flexible schema)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes
authTokenSchema.index({ platform: 1, isActive: 1 });
authTokenSchema.index({ platform: 1, expiresAt: 1 });
authTokenSchema.index({ expiresAt: 1 }); // For cleanup of expired tokens

// Static method to get active token for a platform
authTokenSchema.statics.getActiveToken = async function(platform) {
  logger.debug(`[AuthToken] getActiveToken called for platform: ${platform}`);

  const token = await this.findOne({ platform, isActive: true }).sort({ createdAt: -1 });

  if (!token) {
    logger.warn(`[AuthToken] No active token found for platform: ${platform}`);
  }

  return token;
};

// Static method to save or update token for a platform
// Uses atomic operation to ensure only one active token per platform
// CRITICAL FIX: Prevents tokens being left inactive if create() fails
authTokenSchema.statics.saveToken = async function(platform, tokenData) {
  // Get stack trace for debugging - log who called this function
  const stack = new Error().stack;
  const caller = stack.split('\n')[2]?.trim() || 'unknown';

  logger.info('AuthToken.saveToken CALLED - will set NEW active token', {
    platform,
    hasAccessToken: !!tokenData.accessToken,
    hasRefreshToken: !!tokenData.refreshToken,
    expiresAt: tokenData.expiresAt?.toISOString(),
    caller,
    reason: 'New OAuth token obtained via callback or refresh'
  });

  try {
    // Step 1: Deactivate the existing active token (only one, not all!)
    // This is safer than updateMany which affects all tokens
    // Also, preserve its metadata for the new token
    let preservedMetadata = {};
    const deactivatedResult = await this.findOneAndUpdate(
      { platform, isActive: true },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date()
        }
      },
      { new: false }
    );

    if (deactivatedResult) {
      logger.info('AuthToken.saveToken - deactivated previous active token', {
        platform,
        deactivatedTokenId: deactivatedResult._id.toString(),
        wasActive: deactivatedResult.isActive,
        hadMetadata: !!deactivatedResult.metadata
      });
      // Preserve metadata from the old token
      if (deactivatedResult.metadata && Object.keys(deactivatedResult.metadata).length > 0) {
        preservedMetadata = deactivatedResult.metadata;
        logger.info('AuthToken.saveToken - preserving metadata from previous token', {
          platform,
          metadataKeys: Object.keys(preservedMetadata)
        });
      }
    } else {
      logger.info('AuthToken.saveToken - no previous active token found to deactivate', { platform });
    }

    // Step 2: Create the new active token
    // Merge preserved metadata with any new metadata from tokenData
    const mergedMetadata = {
      ...preservedMetadata,  // Old metadata (Page ID, Instagram User ID, etc.)
      ...tokenData.metadata,  // New metadata (if any)
    };

    const newToken = await this.create({
      platform,
      isActive: true,
      ...tokenData,
      metadata: mergedMetadata,
    });

    logger.info('AuthToken.saveToken - SUCCESS: new active token created and ACTIVE', {
      platform,
      newTokenId: newToken._id.toString(),
      isActive: newToken.isActive,
      expiresAt: newToken.expiresAt?.toISOString(),
      createdAt: newToken.createdAt.toISOString()
    });

    // Verify the token was actually created and is active
    const verifyToken = await this.findOne({ _id: newToken._id });
    if (!verifyToken || !verifyToken.isActive) {
      logger.error('AuthToken.saveToken - VERIFICATION FAILED: token created but not active!', {
        platform,
        tokenId: newToken._id.toString(),
        verifyToken: verifyToken ? { isActive: verifyToken.isActive } : null
      });
    }

    return newToken;

  } catch (error) {
    logger.error('AuthToken.saveToken - FAILURE: failed to create new token', {
      platform,
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      caller
    });

    // CRITICAL RECOVERY: Attempt to reactivate the previously deactivated token
    // This ensures we never leave ALL tokens inactive
    try {
      const reactivated = await this.findOneAndUpdate(
        { platform, isActive: false, deactivatedAt: { $exists: true } },
        { $set: { isActive: true, reactivatedAt: new Date() } },
        { sort: { deactivatedAt: -1 } }
      );

      if (reactivated) {
        logger.warn('AuthToken.saveToken - RECOVERY: reactivated previous token after creation failure', {
          platform,
          reactivatedTokenId: reactivated._id.toString(),
          originalError: error.message
        });
      } else {
        logger.error('AuthToken.saveToken - CRITICAL: no previous token found to reactivate', {
          platform,
          originalError: error.message
        });
      }
    } catch (reactivateError) {
      logger.error('AuthToken.saveToken - CRITICAL: failed to reactivate previous token', {
        platform,
        reactivateError: reactivateError.message,
        originalError: error.message
      });
    }

    throw error;
  }
};

// Static method to refresh token for a platform
authTokenSchema.statics.refreshToken = async function(platform, newTokenData) {
  // Get stack trace for debugging
  const stack = new Error().stack;
  const caller = stack.split('\n')[2]?.trim() || 'unknown';

  logger.info('AuthToken.refreshToken CALLED - will UPDATE existing active token', {
    platform,
    hasNewAccessToken: !!newTokenData.accessToken,
    hasNewRefreshToken: !!newTokenData.refreshToken,
    newExpiresAt: newTokenData.expiresAt?.toISOString(),
    isActiveBeingSet: newTokenData.isActive,
    caller,
    reason: 'Token refreshed via refresh_token grant'
  });

  const activeToken = await this.getActiveToken(platform);

  if (!activeToken) {
    logger.error('AuthToken.refreshToken - NO ACTIVE TOKEN FOUND to refresh', {
      platform,
      caller
    });
    return null;
  }

  logger.info('AuthToken.refreshToken - found active token to update', {
    platform,
      tokenId: activeToken._id.toString(),
    wasActive: activeToken.isActive,
    currentExpiresAt: activeToken.expiresAt?.toISOString()
  });

  try {
    // Manually set each field to avoid Object.assign issues with Mongoose
    if (newTokenData.accessToken !== undefined) {
      activeToken.accessToken = newTokenData.accessToken;
      logger.debug('AuthToken.refreshToken - updated accessToken');
    }
    if (newTokenData.refreshToken !== undefined) {
      activeToken.refreshToken = newTokenData.refreshToken;
      logger.debug('AuthToken.refreshToken - updated refreshToken');
    }
    if (newTokenData.expiresAt !== undefined) {
      activeToken.expiresAt = newTokenData.expiresAt;
      logger.debug('AuthToken.refreshToken - updated expiresAt');
    }
    if (newTokenData.tokenType !== undefined) {
      activeToken.tokenType = newTokenData.tokenType;
    }
    if (newTokenData.lastRefreshedAt !== undefined) {
      activeToken.lastRefreshedAt = newTokenData.lastRefreshedAt;
    }
    if (newTokenData.isActive !== undefined) {
      logger.warn('AuthToken.refreshToken - isActive being explicitly set!', {
        platform,
        newIsActive: newTokenData.isActive,
        caller
      });
      activeToken.isActive = newTokenData.isActive;
    }
    if (newTokenData.creatorId !== undefined) {
      activeToken.creatorId = newTokenData.creatorId;
    }
    if (newTokenData.metadata !== undefined) {
      activeToken.metadata = newTokenData.metadata;
    }

    // Always update lastRefreshedAt
    activeToken.lastRefreshedAt = new Date();

    // Mark as modified
    activeToken.markModified('accessToken');
    activeToken.markModified('refreshToken');
    activeToken.markModified('expiresAt');
    activeToken.markModified('lastRefreshedAt');

    const savedToken = await activeToken.save();

    logger.info('AuthToken.refreshToken - SUCCESS: token updated and remains ACTIVE', {
      platform,
      tokenId: savedToken._id.toString(),
      isActive: savedToken.isActive,
      expiresAt: savedToken.expiresAt?.toISOString(),
      lastRefreshedAt: savedToken.lastRefreshedAt?.toISOString()
    });

    return savedToken;
  } catch (error) {
    logger.error('AuthToken.refreshToken - FAILURE: failed to update token', {
      platform,
      tokenId: activeToken._id.toString(),
      error: error.message,
      stack: error.stack,
      caller
    });
    throw error;
  }
};

// Static method to deactivate all tokens for a platform
// WARNING: This should rarely be used - prefer saveToken which creates a new active token
authTokenSchema.statics.deactivatePlatform = async function(platform) {
  // Get stack trace for debugging
  const stack = new Error().stack;
  const caller = stack.split('\n')[2]?.trim() || 'unknown';

  logger.warn('AuthToken.deactivatePlatform CALLED - will DEACTIVATE ALL tokens for platform', {
    platform,
    caller,
    reason: 'Manual deactivation requested'
  });

  const result = await this.updateMany({ platform }, { isActive: false });

  logger.warn('AuthToken.deactivatePlatform - deactivated tokens', {
    platform,
    count: result.modifiedCount,
    caller
  });

  return result;
};

// Static method to get all active tokens
authTokenSchema.statics.getAllActive = async function() {
  return await this.find({ isActive: true }).sort({ platform: 1, createdAt: -1 });
};

const AuthToken = mongoose.model('AuthToken', authTokenSchema, 'marketing_auth_tokens');

export default AuthToken;
