import mongoose from 'mongoose';

/**
 * Marketing Topic Recommendation Schema
 * Stores AI-generated topic recommendations for content creation
 */

const marketingTopicRecommendationSchema = new mongoose.Schema({
  // Topic
  topic: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // Priority score (0-100)
  priorityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },

  // Component scores
  trendScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
    // How trending is this topic (40% weight)
  },
  competitionLevel: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
    // How saturated is this topic (30% negative weight - lower is better)
  },
  engagementPotential: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
    // Expected engagement (30% weight)
  },

  // Suggested content elements
  suggestedBooks: [{
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingBook'
    },
    title: String,
    author: String,
    angle: String,
    reason: String
  }],

  // Suggested hooks
  suggestedHooks: [{
    template: String,
    category: String,
    expectedEngagementRate: Number,
    examples: [String]
  }],

  // Suggested hashtags
  suggestedHashtags: [{
    hashtag: String,
    platform: String,
    reason: String,
    engagementRate: Number
  }],

  // Suggested tropes to focus on
  suggestedTropes: [{
    trope: String,
    trending: Boolean,
    reason: String
  }],

  // Reasoning
  reasoning: {
    why: String,
    // Why this topic is recommended
    marketGap: String,
    // What gap this fills
    targetAudience: String,
    // Who this content is for
    timing: String,
    // Why now is a good time
    risks: [String],
    // Potential risks
    alternatives: [String]
    // Alternative topics if this doesn't work
  },

  // Content format suggestions
  formatSuggestions: [{
    format: {
      type: String,
      enum: ['video', 'image', 'carousel', 'text']
    },
    platform: {
      type: String,
      enum: ['tiktok', 'instagram', 'youtube_shorts']
    },
    reason: String,
    estimatedPerformance: String
  }],

  // Validation period
  validFrom: {
    type: Date,
    default: Date.now,
    index: true
  },
  validUntil: {
    type: Date,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'in_progress', 'completed'],
    default: 'pending',
    index: true
  },

  // Outcome tracking
  outcome: {
    status: String,
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingPost'
    },
    actualViews: Number,
    actualEngagementRate: Number,
    success: Boolean,
    notes: String
  },

  // Source
  generatedBy: {
    type: String,
    default: 'system'
    // 'system', 'user', or user ID
  },
  generationMethod: {
    type: String,
    enum: ['automated', 'ai_suggested', 'manual'],
    default: 'automated'
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

// Indexes
marketingTopicRecommendationSchema.index({ status: 1, priorityScore: -1 });
marketingTopicRecommendationSchema.index({ validFrom: 1, validUntil: 1 });
marketingTopicRecommendationSchema.index({ trendScore: -1 });
marketingTopicRecommendationSchema.index({ competitionLevel: 1 });

// Update the updatedAt timestamp before saving
marketingTopicRecommendationSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Auto-expire if past validUntil
  if (this.validUntil && new Date() > this.validUntil && this.status === 'pending') {
    this.status = 'expired';
  }

  next();
});

// Static method to create recommendations
marketingTopicRecommendationSchema.statics.generateRecommendations = async function(options = {}) {
  const {
    count = 10,
    days = 7,
    platform = 'all'
  } = options;

  const recommendations = [];

  // This is a placeholder - actual implementation would:
  // 1. Query MarketingBookTrendMetrics for trending topics
  // 2. Query MarketingBook for relevant books
  // 3. Query MarketingHookPattern for relevant hooks
  // 4. Query MarketingHashtagPerformance for relevant hashtags
  // 5. Calculate priority scores

  // For now, return empty array - implementation in service layer
  return recommendations;
};

// Static method to get pending recommendations
marketingTopicRecommendationSchema.statics.getPending = function(options = {}) {
  const {
    limit = 20,
    minPriority = 50
  } = options;

  const query = {
    status: 'pending',
    priorityScore: { $gte: minPriority },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: new Date() } }
    ]
  };

  return this.find(query)
    .sort({ priorityScore: -1 })
    .limit(limit)
    .lean();
};

// Static method to accept a recommendation
marketingTopicRecommendationSchema.statics.acceptRecommendation = function(recommendationId, userId) {
  return this.findByIdAndUpdate(recommendationId, {
    status: 'accepted',
    acceptedBy: userId,
    acceptedAt: new Date()
  }, { new: true }).lean();
};

// Static method to reject a recommendation
marketingTopicRecommendationSchema.statics.rejectRecommendation = function(recommendationId, userId, reason) {
  return this.findByIdAndUpdate(recommendationId, {
    status: 'rejected',
    rejectedBy: userId,
    rejectedAt: new Date(),
    rejectionReason: reason
  }, { new: true }).lean();
};

// Static method to mark as completed
marketingTopicRecommendationSchema.statics.markCompleted = function(recommendationId, outcomeData) {
  return this.findByIdAndUpdate(recommendationId, {
    status: 'completed',
    outcome: outcomeData
  }, { new: true }).lean();
};

// Static method to get recommendation stats
marketingTopicRecommendationSchema.statics.getStats = function(options = {}) {
  const {
    startDate,
    endDate
  } = options;

  const matchQuery = {};

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgPriority: { $avg: '$priorityScore' }
      }
    }
  ]);
};

// Static method to clean expired recommendations
marketingTopicRecommendationSchema.statics.cleanExpired = function() {
  const now = new Date();

  return this.updateMany(
    {
      status: 'pending',
      validUntil: { $lt: now }
    },
    {
      status: 'expired'
    }
  );
};

// Static method to calculate priority score
marketingTopicRecommendationSchema.statics.calculatePriorityScore = function(trendScore, competitionLevel, engagementPotential) {
  // Formula: (trendScore * 0.4) + ((100 - competitionLevel) * 0.3) + (engagementPotential * 0.3)
  const trendWeight = 0.4;
  const competitionWeight = 0.3;
  const engagementWeight = 0.3;

  const trendComponent = trendScore * trendWeight;
  const competitionComponent = (100 - competitionLevel) * competitionWeight;
  const engagementComponent = engagementPotential * engagementWeight;

  return Math.round(trendComponent + competitionComponent + engagementComponent);
};

// Instance method to update scores
marketingTopicRecommendationSchema.methods.updateScores = function(scores) {
  if (scores.trendScore !== undefined) this.trendScore = scores.trendScore;
  if (scores.competitionLevel !== undefined) this.competitionLevel = scores.competitionLevel;
  if (scores.engagementPotential !== undefined) this.engagementPotential = scores.engagementPotential;

  // Recalculate priority score
  this.priorityScore = this.constructor.calculatePriorityScore(
    this.trendScore,
    this.competitionLevel,
    this.engagementPotential
  );

  return this.save();
};

// Instance method to add book suggestion
marketingTopicRecommendationSchema.methods.addBookSuggestion = function(bookData) {
  this.suggestedBooks = this.suggestedBooks || [];
  this.suggestedBooks.push(bookData);
  return this.save();
};

// Instance method to add hook suggestion
marketingTopicRecommendationSchema.methods.addHookSuggestion = function(hookData) {
  this.suggestedHooks = this.suggestedHooks || [];
  this.suggestedHooks.push(hookData);
  return this.save();
};

// Instance method to add hashtag suggestion
marketingTopicRecommendationSchema.methods.addHashtagSuggestion = function(hashtagData) {
  this.suggestedHashtags = this.suggestedHashtags || [];
  this.suggestedHashtags.push(hashtagData);
  return this.save();
};

// Virtual to check if recommendation is still valid
marketingTopicRecommendationSchema.virtual('isValid').get(function() {
  if (!this.validUntil) return true;
  return new Date() <= this.validUntil;
});

const MarketingTopicRecommendation = mongoose.model(
  'MarketingTopicRecommendation',
  marketingTopicRecommendationSchema,
  'marketing_topic_recommendations'
);

export default MarketingTopicRecommendation;
