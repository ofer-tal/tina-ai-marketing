import mongoose from 'mongoose';

/**
 * Marketing Hook Pattern Schema
 * Stores hook templates and their performance data for content optimization
 */

const marketingHookPatternSchema = new mongoose.Schema({
  // Hook template
  hookTemplate: {
    type: String,
    required: true,
    trim: true,
    index: true
    // Template with placeholders, e.g., "What's the last [emotion] book you read?"
  },

  // Hook category
  category: {
    type: String,
    required: true,
    enum: [
      'opinion',
      'question',
      'confession',
      'challenge',
      'recommendation',
      'hot_take',
      'controversy',
      'relatable',
      'story_time',
      'trope_callout',
      'spice_warning',
      'book_review',
      'trope_breakdown',
      'other'
    ],
    index: true
  },

  // Performance metrics
  avgEngagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  medianEngagementRate: {
    type: Number,
    default: 0
  },
  sampleSize: {
    type: Number,
    default: 0,
    min: 0
    // Number of times this hook was used
  },

  // Contextual performance data
  worksBestFor: {
    platforms: [{
      type: String,
      enum: ['tiktok', 'instagram', 'youtube_shorts']
    }],
    topics: [String],
    bookTypes: [{
      genre: String,
      spiceLevel: Number
    }],
    timeOfDay: [String], // 'morning', 'afternoon', 'evening', 'night'
    dayOfWeek: [String]
  },

  // Example usage
  exampleUsage: [{
    actualHook: String,
    platform: String,
    views: Number,
    engagementRate: Number,
    url: String,
    usedAt: Date
  }],

  // Active status
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  stoppedWorkingAt: {
    type: Date
    // When this hook stopped performing well (if ever)
  },

  // Performance history over time
  performanceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    avgEngagementRate: Number,
    sampleSize: Number,
    platform: String
  }],

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsedAt: {
    type: Date
  },

  // Hook structure analysis
  structure: {
    opensWith: {
      type: String,
      enum: ['question', 'statement', 'exclamation', 'number', 'quote', 'confession', 'opinion']
    },
    length: {
      type: String,
      enum: ['short', 'medium', 'long']
      // short: < 50 chars, medium: 50-100, long: > 100
    },
    hasEmoji: Boolean,
    hasMention: Boolean,
    hasHashtag: Boolean,
    emotionalTone: {
      type: String,
      enum: ['excited', 'curious', 'shocked', 'nostalgic', 'angry', 'sad', 'humorous', 'serious']
    }
  },

  // Variations of this hook pattern
  variations: [{
    template: String,
    avgEngagementRate: Number,
    usageCount: Number
  }],

  // Tags for organization
  tags: [String],

  // Metadata
  discoveredAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date
    // When this pattern was confirmed as effective (after sample size threshold)
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
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
marketingHookPatternSchema.index({ category: 1, active: 1, avgEngagementRate: -1 });
marketingHookPatternSchema.index({ active: 1, avgEngagementRate: -1 });
marketingHookPatternSchema.index({ 'worksBestFor.platforms': 1 });
marketingHookPatternSchema.index({ tags: 1 });

// Update the updatedAt timestamp before saving
marketingHookPatternSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get hooks by category
marketingHookPatternSchema.statics.getByCategory = function(category, options = {}) {
  const {
    active = true,
    platform,
    minEngagementRate = 0,
    limit = 20
  } = options;

  const query = { category, active };

  if (platform) {
    query['worksBestFor.platforms'] = platform;
  }

  if (minEngagementRate > 0) {
    query.avgEngagementRate = { $gte: minEngagementRate };
  }

  return this.find(query)
    .sort({ avgEngagementRate: -1, sampleSize: -1 })
    .limit(limit)
    .lean();
};

// Static method to get top performing hooks
marketingHookPatternSchema.statics.getTopPerforming = function(options = {}) {
  const {
    category,
    platform,
    topic,
    minSampleSize = 5,
    limit = 20
  } = options;

  const query = { active: true, sampleSize: { $gte: minSampleSize } };

  if (category) {
    query.category = category;
  }

  if (platform) {
    query['worksBestFor.platforms'] = platform;
  }

  if (topic) {
    query['worksBestFor.topics'] = topic;
  }

  return this.find(query)
    .sort({ avgEngagementRate: -1 })
    .limit(limit)
    .lean();
};

// Static method to get hooks for a specific topic
marketingHookPatternSchema.statics.getForTopic = function(topic, options = {}) {
  const {
    platform,
    limit = 15
  } = options;

  const query = {
    active: true,
    'worksBestFor.topics': topic
  };

  if (platform) {
    query['worksBestFor.platforms'] = platform;
  }

  return this.find(query)
    .sort({ avgEngagementRate: -1 })
    .limit(limit)
    .lean();
};

// Static method to find similar hooks
marketingHookPatternSchema.statics.findSimilar = function(hookTemplate, limit = 10) {
  // Simple text search for similar hooks
  return this.find({
    active: true,
    hookTemplate: { $regex: hookTemplate.split(' ').slice(0, 3).join('|'), $options: 'i' }
  })
    .sort({ avgEngagementRate: -1 })
    .limit(limit)
    .lean();
};

// Static method to record hook performance
marketingHookPatternSchema.statics.recordPerformance = function(hookTemplate, performanceData) {
  const {
    platform,
    engagementRate,
    views,
    topic,
    bookType,
    url
  } = performanceData;

  return this.findOneAndUpdate(
    { hookTemplate, active: true },
    {
      $inc: {
        usageCount: 1,
        sampleSize: 1
      },
      $set: {
        lastUsedAt: new Date(),
        lastUpdated: new Date()
      },
      $push: {
        exampleUsage: {
          actualHook: hookTemplate,
          platform,
          views,
          engagementRate,
          url,
          usedAt: new Date()
        },
        performanceHistory: {
          date: new Date(),
          avgEngagementRate: engagementRate,
          sampleSize: 1,
          platform
        }
      },
      $addToSet: {
        'worksBestFor.platforms': platform
      }
    },
    { upsert: true, new: true }
  ).then(hook => {
    // Recalculate average engagement rate
    const totalEngagement = hook.performanceHistory.reduce((sum, h) => sum + h.avgEngagementRate, 0);
    hook.avgEngagementRate = totalEngagement / hook.performanceHistory.length;

    // Add topic if provided
    if (topic && !hook.worksBestFor.topics.includes(topic)) {
      hook.worksBestFor.topics.push(topic);
    }

    // Keep only last 100 examples
    if (hook.exampleUsage.length > 100) {
      hook.exampleUsage = hook.exampleUsage.slice(-100);
    }

    // Keep only last 90 days of performance history
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    hook.performanceHistory = hook.performanceHistory.filter(h => h.date >= ninetyDaysAgo);

    return hook.save();
  });
};

// Instance method to mark as outdated
marketingHookPatternSchema.methods.markAsOutdated = function(reason = 'performance_declined') {
  this.active = false;
  this.stoppedWorkingAt = new Date();
  return this.save();
};

// Instance method to add variation
marketingHookPatternSchema.methods.addVariation = function(template) {
  this.variations = this.variations || [];

  const existing = this.variations.find(v => v.template === template);
  if (existing) {
    existing.usageCount++;
  } else {
    this.variations.push({
      template,
      avgEngagementRate: 0,
      usageCount: 1
    });
  }

  return this.save();
};

// Virtual for checking if hook is statistically significant
marketingHookPatternSchema.virtual('isSignificant').get(function() {
  return this.sampleSize >= 5 && this.confidence >= 0.8;
});

const MarketingHookPattern = mongoose.model(
  'MarketingHookPattern',
  marketingHookPatternSchema,
  'marketing_hook_patterns'
);

export default MarketingHookPattern;
