import mongoose from 'mongoose';

/**
 * Marketing Viral Pattern Schema
 * Stores viral content patterns that have been identified and validated
 */

const marketingViralPatternSchema = new mongoose.Schema({
  // Pattern type
  patternType: {
    type: String,
    required: true,
    enum: [
      'hook_structure',
      'visual_style',
      'audio_trend',
      'caption_format',
      'hashtag_combo',
      'content_timing',
      'trope_presentation',
      'emotional_hook',
      'call_to_action',
      'narrative_arc',
      'character_intro',
      'book_format',
      'multi_part_series',
      'reaction_format',
      'other'
    ],
    index: true
  },

  // Pattern description
  description: {
    type: String,
    required: true,
    trim: true
  },

  // Success metrics
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
    // Percentage of posts using this pattern that go "viral" (>2x avg engagement)
  },

  // Confidence level
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
    // Statistical confidence based on sample size
  },

  // Example breakdown
  exampleBreakdown: {
    postId: String,
    platform: String,
    url: String,
    views: Number,
    engagementRate: Number,
    shares: Number,
    caption: String,
    description: String
  },

  // Pattern variations
  variations: [{
    name: String,
    description: String,
    successRate: Number,
    sampleSize: Number,
    exampleUrl: String
  }],

  // When this pattern was first detected
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Confirmation tracking
  confirmedAt: {
    type: Date
    // When pattern reached statistical significance
  },
  confirmedCount: {
    type: Number,
    default: 0,
    min: 0
    // Number of times this pattern has been confirmed
  },

  // Performance metrics
  avgPerformanceMetrics: {
    views: {
      avg: Number,
      median: Number,
      p90: Number
    },
    engagementRate: {
      avg: Number,
      median: Number,
      p90: Number
    },
    shares: {
      avg: Number,
      median: Number
    },
    velocity: {
      avg: Number,
      // How fast it gains engagement in first 24h
      median: Number
    }
  },

  // Emotional trigger
  emotionalTrigger: {
    type: String,
    enum: [
      'curiosity',
      'surprise',
      'joy',
      'anger',
      'fear',
      'sadness',
      'disgust',
      'anticipation',
      'trust',
      'nostalgia',
      'excitement',
      'relatability',
      'controversy',
      'validation',
      'aspiration',
      'fomo',
      'other'
    ]
  },

  // Platform specificity
  platforms: [{
    type: String,
    enum: ['tiktok', 'instagram', 'youtube_shorts']
  }],

  // Topic/genre specificity
  worksBestFor: {
    topics: [String],
    genres: [String],
    spiceLevels: [Number],
    tropes: [String]
  },

  // Pattern lifecycle
  lifecycle: {
    stage: {
      type: String,
      enum: ['emerging', 'peak', 'declining', 'nostalgia_revival'],
      default: 'emerging'
    },
    peakAt: Date,
    estimatedDecline: Date
  },

  // Sample size
  sampleSize: {
    type: Number,
    default: 0,
    min: 0
  },

  // Viral threshold for this pattern
  viralThreshold: {
    views: Number,
    engagementRate: Number,
    velocity: Number
  },

  // Pattern characteristics
  characteristics: {
    duration: {
      type: String,
      enum: ['short', 'medium', 'long']
    },
    format: {
      type: String,
      enum: ['video', 'image', 'carousel', 'text']
    },
    elements: [String],
    style: String
  },

  // Related patterns
  relatedPatterns: [{
    patternId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingViralPattern'
    },
    relationship: String,
    synergy: Number
  }],

  // Tags for organization
  tags: [String],

  // Notes and observations
  notes: [{
    note: String,
    author: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Active status
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  deprecatedAt: {
    type: Date
  },
  deprecationReason: String,

  // Metadata
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

// Indexes
marketingViralPatternSchema.index({ patternType: 1, successRate: -1 });
marketingViralPatternSchema.index({ lifecycle: 1, successRate: -1 });
marketingViralPatternSchema.index({ active: 1, detectedAt: -1 });
marketingViralPatternSchema.index({ emotionalTrigger: 1 });
marketingViralPatternSchema.index({ tags: 1 });

// Update the updatedAt timestamp before saving
marketingViralPatternSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get viral patterns by type
marketingViralPatternSchema.statics.getByType = function(patternType, options = {}) {
  const {
    active = true,
    platform,
    minSuccessRate = 0,
    limit = 20
  } = options;

  const query = { patternType, active, successRate: { $gte: minSuccessRate } };

  if (platform) {
    query.platforms = platform;
  }

  return this.find(query)
    .sort({ successRate: -1, sampleSize: -1 })
    .limit(limit)
    .lean();
};

// Static method to get emerging patterns
marketingViralPatternSchema.statics.getEmerging = function(options = {}) {
  const {
    platform,
    minConfidence = 0.5,
    limit = 20,
    days = 7
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const query = {
    active: true,
    'lifecycle.stage': 'emerging',
    detectedAt: { $gte: cutoffDate },
    confidence: { $gte: minConfidence }
  };

  if (platform) {
    query.platforms = platform;
  }

  return this.find(query)
    .sort({ successRate: -1, detectedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get peak patterns
marketingViralPatternSchema.statics.getPeak = function(options = {}) {
  const {
    platform,
    limit = 20
  } = options;

  const query = {
    active: true,
    'lifecycle.stage': 'peak'
  };

  if (platform) {
    query.platforms = platform;
  }

  return this.find(query)
    .sort({ successRate: -1 })
    .limit(limit)
    .lean();
};

// Static method to get declining patterns
marketingViralPatternSchema.statics.getDeclining = function(options = {}) {
  const {
    platform,
    limit = 20
  } = options;

  const query = {
    active: true,
    'lifecycle.stage': 'declining'
  };

  if (platform) {
    query.platforms = platform;
  }

  return this.find(query)
    .sort({ successRate: -1 })
    .limit(limit)
    .lean();
};

// Static method to analyze content for patterns
marketingViralPatternSchema.statics.analyzeContent = async function(contentData) {
  const {
    caption,
    hashtags,
    platform,
    views,
    engagementRate
  } = contentData;

  // Find patterns that match this content
  const patterns = await this.find({
    active: true,
    platforms: { $in: [platform, 'all'] }
  }).lean();

  const matchedPatterns = [];

  for (const pattern of patterns) {
    // Simple pattern matching logic
    let matches = false;
    let score = 0;

    // Check for caption pattern
    if (pattern.patternType === 'caption_format' && pattern.description) {
      const keywords = pattern.description.toLowerCase().split(' ');
      const captionLower = caption.toLowerCase();
      const matchCount = keywords.filter(k => captionLower.includes(k)).length;
      if (matchCount >= keywords.length * 0.5) {
        matches = true;
        score = matchCount / keywords.length;
      }
    }

    // Check for hashtag combo
    if (pattern.patternType === 'hashtag_combo' && hashtags) {
      const patternTags = pattern.tags || [];
      const matchCount = patternTags.filter(t => hashtags.includes(t)).length;
      if (matchCount >= patternTags.length * 0.7) {
        matches = true;
        score = matchCount / patternTags.length;
      }
    }

    if (matches) {
      matchedPatterns.push({
        pattern,
        score,
        predictedSuccessRate: pattern.successRate * score
      });
    }
  }

  // Sort by predicted success rate
  matchedPatterns.sort((a, b) => b.predictedSuccessRate - a.predictedSuccessRate);

  return matchedPatterns;
};

// Static method to suggest pattern variations
marketingViralPatternSchema.statics.suggestVariations = function(patternId) {
  return this.findById(patternId)
    .then(pattern => {
      if (!pattern || !pattern.variations) return [];

      return pattern.variations.map(v => ({
        name: v.name,
        description: v.description,
        successRate: v.successRate,
        exampleUrl: v.exampleUrl
      }));
    });
};

// Static method to record pattern occurrence
marketingViralPatternSchema.statics.recordOccurrence = function(patternId, performanceData) {
  return this.findById(patternId).then(pattern => {
    if (!pattern) return null;

    pattern.sampleSize++;
    pattern.lastUpdated = new Date();

    // Update success rate if this post went viral
    const isViral = performanceData.views >= (pattern.viralThreshold?.views || 100000) ||
                   performanceData.engagementRate >= (pattern.viralThreshold?.engagementRate || 10);

    if (isViral) {
      pattern.confirmedCount++;
      // Recalculate success rate
      pattern.successRate = (pattern.confirmedCount / pattern.sampleSize) * 100;
    }

    // Update confidence based on sample size
    // More samples = higher confidence (caps at 0.95)
    pattern.confidence = Math.min(0.95, 1 - Math.exp(-pattern.sampleSize / 50));

    // Update lifecycle if confirmed many times recently
    if (pattern.confirmedCount >= 10 && !pattern.confirmedAt) {
      pattern.confirmedAt = new Date();
      pattern.lifecycle.stage = 'peak';
      pattern.lifecycle.peakAt = new Date();
    }

    return pattern.save();
  });
};

// Static method to deprecate pattern
marketingViralPatternSchema.statics.deprecatePattern = function(patternId, reason) {
  return this.findByIdAndUpdate(patternId, {
    active: false,
    deprecatedAt: new Date(),
    deprecationReason: reason,
    'lifecycle.stage': 'declining'
  }).lean();
};

const MarketingViralPattern = mongoose.model(
  'MarketingViralPattern',
  marketingViralPatternSchema,
  'marketing_viral_patterns'
);

export default MarketingViralPattern;
