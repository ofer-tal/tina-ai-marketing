import mongoose from 'mongoose';

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
  // Platform identifier (tiktok, instagram, youtube, twitter, pinterest, reddit, apple_search_ads, etc.)
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'instagram', 'youtube', 'twitter', 'pinterest', 'reddit', 'apple_search_ads', 'facebook', 'tiktok_ads', 'google_ads'],
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
  return await this.findOne({ platform, isActive: true }).sort({ createdAt: -1 });
};

// Static method to save or update token for a platform
// Uses upsert to ensure only one active token per platform
authTokenSchema.statics.saveToken = async function(platform, tokenData) {
  // First, deactivate all existing tokens for this platform
  await this.updateMany({ platform }, { isActive: false });

  // Create new active token record
  return await this.create({
    platform,
    isActive: true,
    ...tokenData,
  });
};

// Static method to refresh token for a platform
authTokenSchema.statics.refreshToken = async function(platform, newTokenData) {
  const activeToken = await this.getActiveToken(platform);
  if (activeToken) {
    Object.assign(activeToken, newTokenData);
    activeToken.lastRefreshedAt = new Date();
    return await activeToken.save();
  }
  return null;
};

// Static method to deactivate all tokens for a platform
authTokenSchema.statics.deactivatePlatform = async function(platform) {
  return await this.updateMany({ platform }, { isActive: false });
};

// Static method to get all active tokens
authTokenSchema.statics.getAllActive = async function() {
  return await this.find({ isActive: true }).sort({ platform: 1, createdAt: -1 });
};

const AuthToken = mongoose.model('AuthToken', authTokenSchema, 'marketing_auth_tokens');

export default AuthToken;
