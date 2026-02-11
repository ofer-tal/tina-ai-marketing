import mongoose from 'mongoose';

/**
 * Marketing BookTok Influencer Schema
 * Stores data about BookTok/Bookstagram influencers for competitive analysis
 */

const marketingBookTokInfluencerSchema = new mongoose.Schema({
  // Account information
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  displayName: {
    type: String,
    trim: true
  },

  // Platform
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'instagram', 'youtube_shorts'],
    index: true
  },

  // Follower metrics
  followerCount: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  followerHistory: [{
    date: Date,
    count: Number
  }],

  // Verification status
  verified: {
    type: Boolean,
    default: false
  },

  // Engagement metrics
  avgEngagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  avgViews: {
    type: Number,
    default: 0
  },
  avgLikes: {
    type: Number,
    default: 0
  },
  avgComments: {
    type: Number,
    default: 0
  },
  avgShares: {
    type: Number,
    default: 0
  },

  // Niche focus
  nicheFocus: [{
    type: String,
    enum: [
      'contemporary_romance',
      'fantasy_romance',
      'historical_romance',
      'paranormal_romance',
      'romantic_suspense',
      'erotica',
      'ya_romance',
      'lgbtq_romance',
      'mystery_romance',
      'sci_fi_romance',
      'general_books',
      'book_recommendations',
      'book_reviews',
      'spicy_books',
      'clean_books',
      'trope_analysis',
      'other'
    ]
  }],

  // Content style
  contentStyle: {
    primaryFormat: {
      type: String,
      enum: ['talking_head', 'text_over_video', 'aesthetic', 'skit', 'review', 'recommendation', 'discussion', 'other']
    },
    tone: {
      type: String,
      enum: ['humorous', 'serious', 'enthusiastic', 'analytical', 'storytelling', 'controversial', 'educational', 'relatable']
    },
    editingStyle: {
      type: String,
      enum: ['minimal', 'trendy', 'aesthetic', 'high_energy', 'slow', 'other']
    },
    postingFrequency: {
      type: String,
      enum: ['daily', 'multiple_daily', 'weekly', 'multiple_weekly', 'monthly', 'irregular']
    }
  },

  // Recent posts
  recentPosts: [{
    postId: String,
    url: String,
    caption: String,
    postedAt: Date,
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    engagementRate: Number,
    topics: [String],
    booksMentioned: [String],
    hashtags: [String],
    viral: {
      type: Boolean,
      default: false
    }
  }],

  // Topics covered
  topicsCovered: [{
    topic: String,
    postCount: Number,
    avgEngagement: Number,
    lastPostedAt: Date
  }],

  // Tropes they frequently discuss
  favoriteTropes: [{
    trope: String,
    mentionCount: Number,
    avgEngagement: Number
  }],

  // Books they frequently mention
  favoriteBooks: [{
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingBook'
    },
    bookTitle: String,
    mentionCount: Number,
    avgEngagement: Number
  }],

  // Collaboration potential
  collaborationScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
    // How likely they would be to collaborate/feature our content
  },

  // Influencer tier
  tier: {
    type: String,
    enum: ['nano', 'micro', 'mid', 'macro', 'mega'],
    default: 'nano'
    // nano: < 10k followers
    // micro: 10k - 50k
    // mid: 50k - 200k
    // macro: 200k - 1M
    // mega: > 1M
  },

  // Reach and impact
  reach: {
    estimated: Number,
    // Estimated unique viewers per month
    geographical: [String],
    // Top countries/regions
    ageDemographics: {
      '13-17': Number,
      '18-24': Number,
      '25-34': Number,
      '35-44': Number,
      '45+': Number
    }
  },

  // Brand alignment
  brandAlignment: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
    // How aligned their content is with our brand
  },

  // Notes
  notes: [{
    note: String,
    author: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Tracking metadata
  lastCheckedAt: {
    type: Date,
    default: Date.now
  },
  firstDiscoveredAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  inactiveReason: String,

  // External IDs
  externalId: String,
  // TikTok user ID, Instagram user ID, etc.

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

// Compound unique index
marketingBookTokInfluencerSchema.index({ username: 1, platform: 1 }, { unique: true });
marketingBookTokInfluencerSchema.index({ platform: 1, followerCount: -1 });
marketingBookTokInfluencerSchema.index({ platform: 1, avgEngagementRate: -1 });
marketingBookTokInfluencerSchema.index({ active: 1, tier: 1 });
marketingBookTokInfluencerSchema.index({ 'nicheFocus': 1 });

// Update the updatedAt timestamp before saving
marketingBookTokInfluencerSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Auto-calculate tier based on follower count
  if (this.followerCount < 10000) {
    this.tier = 'nano';
  } else if (this.followerCount < 50000) {
    this.tier = 'micro';
  } else if (this.followerCount < 200000) {
    this.tier = 'mid';
  } else if (this.followerCount < 1000000) {
    this.tier = 'macro';
  } else {
    this.tier = 'mega';
  }

  next();
});

// Static method to get top influencers
marketingBookTokInfluencerSchema.statics.getTopInfluencers = function(options = {}) {
  const {
    platform,
    niche,
    minFollowers = 0,
    minEngagementRate = 0,
    limit = 20
  } = options;

  const query = { active: true };

  if (platform) {
    query.platform = platform;
  }

  if (niche) {
    query.nicheFocus = niche;
  }

  if (minFollowers > 0) {
    query.followerCount = { $gte: minFollowers };
  }

  if (minEngagementRate > 0) {
    query.avgEngagementRate = { $gte: minEngagementRate };
  }

  return this.find(query)
    .sort({ avgEngagementRate: -1, followerCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to get influencers by topic
marketingBookTokInfluencerSchema.statics.getByTopic = function(topic, options = {}) {
  const {
    platform,
    limit = 20
  } = options;

  const query = {
    active: true,
    'topicsCovered.topic': topic
  };

  if (platform) {
    query.platform = platform;
  }

  return this.find(query)
    .sort({ 'topicsCovered.avgEngagement': -1 })
    .limit(limit)
    .lean();
};

// Static method to get influencer stats
marketingBookTokInfluencerSchema.statics.getInfluencerStats = function(username, platform) {
  return this.findOne({
    username: username.toLowerCase(),
    platform,
    active: true
  }).lean();
};

// Static method to find or create influencer
marketingBookTokInfluencerSchema.statics.findOrCreate = function(influencerData) {
  return this.findOne({
    username: influencerData.username.toLowerCase(),
    platform: influencerData.platform
  })
    .then(influencer => {
      if (influencer) {
        // Update existing influencer
        Object.assign(influencer, influencerData);
        influencer.lastCheckedAt = new Date();
        return influencer.save();
      }
      // Create new influencer
      return this.create(influencerData);
    });
};

// Instance method to add post
marketingBookTokInfluencerSchema.methods.addPost = function(postData) {
  this.recentPosts = this.recentPosts || [];

  // Add post to the beginning
  this.recentPosts.unshift({
    ...postData,
    postedAt: postData.postedAt || new Date()
  });

  // Keep only last 100 posts
  if (this.recentPosts.length > 100) {
    this.recentPosts = this.recentPosts.slice(0, 100);
  }

  // Update topics covered
  if (postData.topics && postData.topics.length > 0) {
    this.topicsCovered = this.topicsCovered || [];
    for (const topic of postData.topics) {
      const existing = this.topicsCovered.find(t => t.topic === topic);
      if (existing) {
        existing.postCount++;
        existing.avgEngagement = (existing.avgEngagement * (existing.postCount - 1) + (postData.engagementRate || 0)) / existing.postCount;
        existing.lastPostedAt = new Date();
      } else {
        this.topicsCovered.push({
          topic,
          postCount: 1,
          avgEngagement: postData.engagementRate || 0,
          lastPostedAt: new Date()
        });
      }
    }
  }

  // Update books mentioned
  if (postData.booksMentioned && postData.booksMentioned.length > 0) {
    this.favoriteBooks = this.favoriteBooks || [];
    for (const book of postData.booksMentioned) {
      const existing = this.favoriteBooks.find(b => b.bookTitle === book);
      if (existing) {
        existing.mentionCount++;
        existing.avgEngagement = (existing.avgEngagement * (existing.mentionCount - 1) + (postData.engagementRate || 0)) / existing.mentionCount;
      } else {
        this.favoriteBooks.push({
          bookTitle: book,
          mentionCount: 1,
          avgEngagement: postData.engagementRate || 0
        });
      }
    }
  }

  // Recalculate average engagement
  this.calculateAvgEngagement();

  this.lastCheckedAt = new Date();
  return this.save();
};

// Instance method to calculate average engagement
marketingBookTokInfluencerSchema.methods.calculateAvgEngagement = function() {
  if (this.recentPosts.length === 0) return;

  const totalViews = this.recentPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLikes = this.recentPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = this.recentPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
  const totalShares = this.recentPosts.reduce((sum, p) => sum + (p.shares || 0), 0);

  this.avgViews = totalViews / this.recentPosts.length;
  this.avgLikes = totalLikes / this.recentPosts.length;
  this.avgComments = totalComments / this.recentPosts.length;
  this.avgShares = totalShares / this.recentPosts.length;

  // Calculate engagement rate: (likes + comments + shares) / views * 100
  const totalEngagement = totalLikes + totalComments + totalShares;
  this.avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
};

// Instance method to mark as inactive
marketingBookTokInfluencerSchema.methods.markAsInactive = function(reason) {
  this.active = false;
  this.inactiveReason = reason;
  return this.save();
};

// Static method to track influencer content
marketingBookTokInfluencerSchema.statics.trackInfluencerContent = async function(username, platform) {
  // This is a placeholder - actual implementation would fetch from the platform API
  const influencer = await this.findOne({
    username: username.toLowerCase(),
    platform
  });

  if (!influencer) {
    return null;
  }

  influencer.lastCheckedAt = new Date();
  return influencer.save();
};

const MarketingBookTokInfluencer = mongoose.model(
  'MarketingBookTokInfluencer',
  marketingBookTokInfluencerSchema,
  'marketing_booktok_influencers'
);

export default MarketingBookTokInfluencer;
