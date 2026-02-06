import mongoose from 'mongoose';

/**
 * AI Avatar Schema
 * Stores AI avatars for tier_2 video generation
 */

const aiAvatarSchema = new mongoose.Schema({
  // Display name
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  // Description of personality/usage
  description: {
    type: String,
    trim: true
  },

  // Path to avatar image in storage
  imagePath: {
    type: String,
    trim: true
  },

  // HeyGen avatar ID (for future API use)
  heygenAvatarId: {
    type: String,
    trim: true
  },

  // Default voice ID for this avatar
  heygenVoiceId: {
    type: String,
    trim: true
  },

  // Gender classification
  gender: {
    type: String,
    enum: ['male', 'female', 'neutral'],
    default: 'neutral'
  },

  // Style classification
  style: {
    type: String,
    enum: ['professional', 'casual', 'playful', 'elegant', 'friendly', 'authoritative'],
    default: 'professional'
  },

  // Whether avatar is available for use
  isActive: {
    type: Boolean,
    default: true
  },

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },

  // Last used in post
  lastUsedAt: {
    type: Date
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
aiAvatarSchema.index({ isActive: 1 });
aiAvatarSchema.index({ gender: 1, style: 1 });
aiAvatarSchema.index({ usageCount: -1 });

// Update the updatedAt timestamp before saving
aiAvatarSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to increment usage count
aiAvatarSchema.methods.incrementUsage = function() {
  this.usageCount = (this.usageCount || 0) + 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Method to mark as inactive
aiAvatarSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Method to mark as active
aiAvatarSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Static method to get active avatars
aiAvatarSchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort({ usageCount: -1 });
};

// Static method to get avatars by gender and style filters
aiAvatarSchema.statics.getFiltered = function(filters = {}) {
  const query = { isActive: true };

  if (filters.gender) {
    query.gender = filters.gender;
  }
  if (filters.style) {
    query.style = filters.style;
  }

  return this.find(query).sort({ usageCount: -1 });
};

const AIAvatar = mongoose.model('AIAvatar', aiAvatarSchema, 'marketing_ai_avatars');

export default AIAvatar;
