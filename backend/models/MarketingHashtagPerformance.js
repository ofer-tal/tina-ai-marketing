import mongoose from 'mongoose';

/**
 * Marketing Hashtag Performance Schema
 * Stores hashtag performance data across platforms
 */

const marketingHashtagPerformanceSchema = new mongoose.Schema({
  // Hashtag (without the # symbol)
  hashtag: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },

  // Platform
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'instagram', 'youtube_shorts'],
    index: true
  },

  // Performance metrics
  avgViews: {
    type: Number,
    default: 0,
    min: 0
  },
  medianViews: {
    type: Number,
    default: 0
  },
  engagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  medianEngagementRate: {
    type: Number,
    default: 0
  },

  // Trend velocity
  trendVelocity: {
    type: Number,
    default: 0
    // Percent change in usage/engagement over time
  },
  trendDirection: {
    type: String,
    enum: ['rising', 'stable', 'falling', 'saturated'],
    default: 'stable'
  },

  // Best paired hashtags
  bestPairedWith: [{
    hashtag: String,
    avgViews: Number,
    engagementRate: Number,
    combinationCount: Number,
    synergyScore: Number
    // How much better they perform together than separately
  }],

  // Overuse/saturation risk
  overuseRisk: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'saturated'],
      default: 'low'
    },
    saturationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
      // 0 = fresh/new, 100 = completely saturated
    },
    postsPerDay: {
      type: Number,
      default: 0
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Category/Niche
  category: {
    type: String,
    enum: ['booktok', 'bookstagram', 'romance', 'fantasy', 'contemporary', 'spicy', 'clean', 'trope_specific', 'general', 'other'],
    default: 'other'
  },

  // Hashtag combination stats
  combinationStats: [{
    hashtagSet: [String],
    performance: {
      avgViews: Number,
      engagementRate: Number,
      sampleSize: Number
    },
    lastSeen: Date
  }],

  // Time-based performance
  hourlyPerformance: [{
    hour: Number,
    avgViews: Number,
    engagementRate: Number
  }],
  dailyPerformance: [{
    dayOfWeek: String,
    avgViews: Number,
    engagementRate: Number
  }],

  // Audience demographics (if available)
  demographics: {
    ageGroups: [String],
    topRegions: [String],
    genderDistribution: {
      female: Number,
      male: Number,
      other: Number
    }
  },

  // Related hashtags
  relatedHashtags: [{
    hashtag: String,
    correlation: Number
    // 0-1, how often they appear together
  }],

  // Sample size
  sampleSize: {
    type: Number,
    default: 0,
    min: 0
  },

  // Metadata
  firstSeenAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastAnalyzed: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true,
    index: true
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

// Compound unique index
marketingHashtagPerformanceSchema.index({ hashtag: 1, platform: 1 }, { unique: true });
marketingHashtagPerformanceSchema.index({ platform: 1, trendVelocity: -1 });
marketingHashtagPerformanceSchema.index({ platform: 1, engagementRate: -1 });
marketingHashtagPerformanceSchema.index({ category: 1, platform: 1 });
marketingHashtagPerformanceSchema.index({ active: 1, 'overuseRisk.level': 1 });

// Update the updatedAt timestamp before saving
marketingHashtagPerformanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get hashtag performance
marketingHashtagPerformanceSchema.statics.getPerformance = function(hashtag, platform) {
  return this.findOne({
    hashtag: hashtag.toLowerCase().replace(/^#/, ''),
    platform,
    active: true
  }).lean();
};

// Static method to get trending hashtags
marketingHashtagPerformanceSchema.statics.getTrending = function(options = {}) {
  const {
    platform,
    category,
    minEngagementRate = 0,
    maxSaturation = 80,
    limit = 20
  } = options;

  const query = {
    active: true,
    trendDirection: 'rising',
    engagementRate: { $gte: minEngagementRate },
    'overuseRisk.saturationScore': { $lte: maxSaturation }
  };

  if (platform) {
    query.platform = platform;
  }

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ trendVelocity: -1, engagementRate: -1 })
    .limit(limit)
    .lean();
};

// Static method to get winning combinations
marketingHashtagPerformanceSchema.statics.getWinningCombinations = function(options = {}) {
  const {
    platform,
    minSampleSize = 5,
    limit = 20
  } = options;

  const matchQuery = {
    active: true,
    'combinationStats.performance.sampleSize': { $gte: minSampleSize }
  };

  if (platform) {
    matchQuery.platform = platform;
  }

  return this.aggregate([
    { $match: matchQuery },
    { $unwind: '$combinationStats' },
    { $match: { 'combinationStats.performance.sampleSize': { $gte: minSampleSize } } },
    {
      $sort: { 'combinationStats.performance.engagementRate': -1 }
    },
    {
      $group: {
        _id: '$_id',
        hashtag: { $first: '$hashtag' },
        platform: { $first: '$platform' },
        combinationStats: { $push: '$combinationStats' }
      }
    },
    { $limit: limit }
  ]);
};

// Static method to check saturation
marketingHashtagPerformanceSchema.statics.checkSaturation = function(hashtag, platform) {
  return this.findOne({
    hashtag: hashtag.toLowerCase().replace(/^#/, ''),
    platform,
    active: true
  })
    .select('overuseRisk saturationScore postsPerDay')
    .lean();
};

// Static method to optimize hashtags for content
marketingHashtagPerformanceSchema.statics.optimizeHashtags = function(options = {}) {
  const {
    platform,
    topic,
    bookType,
    count = 10,
    excludeSaturation = true
  } = options;

  const query = { active: true, platform };

  // Filter by category if topic is provided
  if (topic) {
    const categoryMap = {
      'romance': 'romance',
      'fantasy': 'fantasy',
      'spicy': 'spicy',
      'clean': 'clean'
    };
    if (categoryMap[topic]) {
      query.category = categoryMap[topic];
    }
  }

  // Exclude saturated hashtags if requested
  if (excludeSaturation) {
    query['overuseRisk.saturationScore'] = { $lt: 80 };
  }

  return this.find(query)
    .sort({ engagementRate: -1, 'overuseRisk.saturationScore': 1 })
    .limit(count * 2) // Get more to filter
    .lean()
    .then(hashtags => {
      // Filter out hashtags that often appear together (avoid redundancy)
      const selected = [];
      const usedRelated = new Set();

      for (const tag of hashtags) {
        if (selected.length >= count) break;

        const key = tag.hashtag.toLowerCase();
        if (usedRelated.has(key)) continue;

        selected.push(tag);
        usedRelated.add(key);

        // Mark related hashtags as used to avoid redundancy
        if (tag.relatedHashtags) {
          tag.relatedHashtags
            .filter(r => r.correlation > 0.5)
            .forEach(r => usedRelated.add(r.hashtag.toLowerCase()));
        }
      }

      return selected;
    });
};

// Static method to record hashtag usage
marketingHashtagPerformanceSchema.statics.recordUsage = function(hashtag, platform, metrics) {
  const {
    views,
    engagementRate,
    pairedHashtags = [],
    topic
  } = metrics;

  const cleanHashtag = hashtag.toLowerCase().replace(/^#/, '');

  return this.findOneAndUpdate(
    { hashtag: cleanHashtag, platform },
    {
      $inc: {
        sampleSize: 1
      },
      $set: {
        lastUpdated: new Date(),
        lastAnalyzed: new Date()
      },
      $setOnInsert: {
        firstSeenAt: new Date()
      }
    },
    { upsert: true, new: true }
  ).then(tag => {
    // Update running averages
    const oldAvgViews = tag.avgViews || 0;
    const oldAvgEngagement = tag.engagementRate || 0;
    const newSampleSize = tag.sampleSize;

    tag.avgViews = (oldAvgViews * (newSampleSize - 1) + views) / newSampleSize;
    tag.engagementRate = (oldAvgEngagement * (newSampleSize - 1) + engagementRate) / newSampleSize;

    // Update category if provided
    if (topic && tag.category === 'other') {
      const categoryMap = {
        'romance': 'romance',
        'fantasy': 'fantasy',
        'spicy': 'spicy',
        'clean': 'clean',
        'booktok': 'booktok',
        'bookstagram': 'bookstagram'
      };
      if (categoryMap[topic]) {
        tag.category = categoryMap[topic];
      }
    }

    // Update paired hashtags
    if (pairedHashtags.length > 0) {
      for (const paired of pairedHashtags) {
        const cleanPaired = paired.toLowerCase().replace(/^#/, '');
        if (cleanPaired === cleanHashtag) continue;

        const existingPair = tag.bestPairedWith.find(p => p.hashtag === cleanPaired);
        if (existingPair) {
          existingPair.combinationCount++;
          existingPair.avgViews = (existingPair.avgViews * (existingPair.combinationCount - 1) + views) / existingPair.combinationCount;
          existingPair.engagementRate = (existingPair.engagementRate * (existingPair.combinationCount - 1) + engagementRate) / existingPair.combinationCount;
        } else {
          tag.bestPairedWith.push({
            hashtag: cleanPaired,
            avgViews: views,
            engagementRate: engagementRate,
            combinationCount: 1,
            synergyScore: 0
          });
        }
      }

      // Keep only top 20 pairings
      tag.bestPairedWith.sort((a, b) => b.engagementRate - a.engagementRate);
      tag.bestPairedWith = tag.bestPairedWith.slice(0, 20);
    }

    return tag.save();
  });
};

// Static method to update saturation levels
marketingHashtagPerformanceSchema.statics.updateSaturationLevels = async function(platform) {
  const hashtags = await this.find({ platform, active: true }).lean();

  // Group by category and calculate relative saturation
  const byCategory = {};
  for (const tag of hashtags) {
    byCategory[tag.category] = byCategory[tag.category] || [];
    byCategory[tag.category].push(tag);
  }

  const updates = [];

  for (const category in byCategory) {
    const tags = byCategory[category];
    const maxPostsPerDay = Math.max(...tags.map(t => t.overuseRisk.postsPerDay || 0));

    for (const tag of tags) {
      const postsPerDay = tag.overuseRisk.postsPerDay || 0;
      const saturationScore = maxPostsPerDay > 0 ? (postsPerDay / maxPostsPerDay) * 100 : 0;

      let level = 'low';
      if (saturationScore > 80) level = 'saturated';
      else if (saturationScore > 60) level = 'high';
      else if (saturationScore > 30) level = 'medium';

      updates.push({
        updateOne: {
          filter: { _id: tag._id },
          update: {
            'overuseRisk.saturationScore': saturationScore,
            'overuseRisk.level': level,
            'overuseRisk.calculatedAt': new Date()
          }
        }
      });
    }
  }

  if (updates.length > 0) {
    return this.bulkWrite(updates);
  }

  return { modifiedCount: 0 };
};

const MarketingHashtagPerformance = mongoose.model(
  'MarketingHashtagPerformance',
  marketingHashtagPerformanceSchema,
  'marketing_hashtag_performance'
);

export default MarketingHashtagPerformance;
