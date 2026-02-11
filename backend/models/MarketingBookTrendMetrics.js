import mongoose from 'mongoose';

/**
 * Marketing Book Trend Metrics Schema
 * Stores time-series metrics for tracking trends across books, topics, tropes, hooks, and hashtags
 */

const marketingBookTrendMetricsSchema = new mongoose.Schema({
  // Entity being tracked
  entityType: {
    type: String,
    required: true,
    enum: ['book', 'topic', 'trope', 'hook', 'hashtag', 'author', 'series'],
    index: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
    // For books: MongoDB _id or goodreadsId
    // For others: identifier (e.g., trope name, hashtag without #)
  },
  entityName: {
    type: String,
    required: true,
    trim: true
    // Human-readable name for display
  },

  // Platform
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'instagram', 'youtube_shorts', 'all'],
    index: true
  },

  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },

  // Mention metrics
  mentionCount: {
    type: Number,
    default: 0,
    min: 0
    // Number of posts mentioning this entity in this time window
  },

  // Engagement velocity - how fast engagement is growing
  engagementVelocity: {
    type: Number,
    default: 0
    // Rate of engagement change per hour
  },

  // Average engagement rate for posts about this entity
  avgEngagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
    // (likes + comments + shares) / views * 100
  },

  // Number of posts sampled for this metric
  postsSampled: {
    type: Number,
    default: 0,
    min: 0
  },

  // Top performing posts about this entity
  topPosts: [{
    postId: String,
    platform: String,
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    engagementRate: Number,
    url: String,
    caption: String
  }],

  // Trend direction
  trendDirection: {
    type: String,
    enum: ['rising', 'stable', 'falling', 'volatile'],
    default: 'stable',
    index: true
  },

  // Trend velocity - percent change from previous period
  trendVelocity: {
    type: Number,
    default: 0
    // Positive = rising, negative = falling
  },

  // Confidence in the trend measurement
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
    // Based on sample size and data quality
  },

  // Additional breakdown metrics
  breakdown: {
    hourlyData: [{
      hour: Number,
      mentionCount: Number,
      avgEngagementRate: Number
    }],
    demographics: {
      ageGroups: [String],
      regions: [String]
    },
    sentiment: {
      positive: Number,
      neutral: Number,
      negative: Number
    }
  },

  // Metadata
  dataWindow: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient time-series queries
marketingBookTrendMetricsSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
marketingBookTrendMetricsSchema.index({ platform: 1, timestamp: -1 });
marketingBookTrendMetricsSchema.index({ entityType: 1, platform: 1, timestamp: -1 });
marketingBookTrendMetricsSchema.index({ trendDirection: 1, timestamp: -1 });
marketingBookTrendMetricsSchema.index({ entityType: 1, trendVelocity: -1 });

// TTL index - automatically delete raw metrics after 90 days
marketingBookTrendMetricsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static method to get metrics for an entity
marketingBookTrendMetricsSchema.statics.getMetrics = function(entityType, entityId, options = {}) {
  const {
    platform = 'all',
    startDate,
    endDate,
    limit = 100
  } = options;

  const query = { entityType, entityId };

  if (platform !== 'all') {
    query.platform = platform;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method to get current trend for an entity
marketingBookTrendMetricsSchema.statics.getCurrentTrend = async function(entityType, entityId, platform = 'all') {
  const recentMetrics = await this.find({
    entityType,
    entityId,
    platform
  })
    .sort({ timestamp: -1 })
    .limit(2)
    .lean();

  if (recentMetrics.length === 0) {
    return null;
  }

  const latest = recentMetrics[0];
  const previous = recentMetrics[1];

  return {
    entityType,
    entityId,
    entityName: latest.entityName,
    platform: latest.platform,
    currentDirection: latest.trendDirection,
    currentVelocity: latest.trendVelocity,
    currentMentionCount: latest.mentionCount,
    avgEngagementRate: latest.avgEngagementRate,
    previousVelocity: previous?.trendVelocity || 0,
    confidence: latest.confidence,
    lastUpdated: latest.timestamp
  };
};

// Static method to get rising trends
marketingBookTrendMetricsSchema.statics.getRisingTrends = function(options = {}) {
  const {
    entityType,
    platform = 'all',
    minVelocity = 10,
    limit = 20,
    hours = 24
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const query = {
    timestamp: { $gte: cutoffDate },
    trendDirection: 'rising',
    trendVelocity: { $gte: minVelocity }
  };

  if (entityType) {
    query.entityType = entityType;
  }

  if (platform !== 'all') {
    query.platform = platform;
  }

  return this.find(query)
    .sort({ trendVelocity: -1 })
    .limit(limit)
    .lean();
};

// Static method to get declining trends
marketingBookTrendMetricsSchema.statics.getDecliningTrends = function(options = {}) {
  const {
    entityType,
    platform = 'all',
    maxVelocity = -10,
    limit = 20,
    hours = 24
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const query = {
    timestamp: { $gte: cutoffDate },
    trendDirection: 'falling',
    trendVelocity: { $lte: maxVelocity }
  };

  if (entityType) {
    query.entityType = entityType;
  }

  if (platform !== 'all') {
    query.platform = platform;
  }

  return this.find(query)
    .sort({ trendVelocity: 1 }) // Most negative first
    .limit(limit)
    .lean();
};

// Static method to record metrics
marketingBookTrendMetricsSchema.statics.recordMetrics = function(metricsData) {
  // Calculate trend direction and velocity if not provided
  const record = { ...metricsData };

  if (!record.trendDirection || record.trendVelocity === undefined) {
    // Compare with previous metric to calculate velocity
    return this.findOne({
      entityType: record.entityType,
      entityId: record.entityId,
      platform: record.platform
    })
      .sort({ timestamp: -1 })
      .then(previous => {
        if (previous) {
          const mentionChange = previous.mentionCount > 0 ?
            ((record.mentionCount - previous.mentionCount) / previous.mentionCount) * 100 : 0;
          record.trendVelocity = mentionChange;

          if (mentionChange > 5) {
            record.trendDirection = 'rising';
          } else if (mentionChange < -5) {
            record.trendDirection = 'falling';
          } else {
            record.trendDirection = 'stable';
          }
        } else {
          record.trendVelocity = 0;
          record.trendDirection = 'stable';
        }

        return this.create(record);
      });
  }

  return this.create(record);
};

// Static method to aggregate metrics by entity type
marketingBookTrendMetricsSchema.statics.aggregateByEntityType = function(entityType, options = {}) {
  const {
    platform = 'all',
    hours = 24,
    minMentionCount = 5
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  return this.aggregate([
    {
      $match: {
        entityType,
        platform,
        timestamp: { $gte: cutoffDate },
        mentionCount: { $gte: minMentionCount }
      }
    },
    {
      $group: {
        _id: '$entityId',
        entityName: { $first: '$entityName' },
        totalMentions: { $sum: '$mentionCount' },
        avgEngagementRate: { $avg: '$avgEngagementRate' },
        avgTrendVelocity: { $avg: '$trendVelocity' },
        latestDirection: { $last: '$trendDirection' },
        latestVelocity: { $last: '$trendVelocity' },
        sampleCount: { $sum: 1 }
      }
    },
    {
      $sort: { avgTrendVelocity: -1 }
    }
  ]);
};

const MarketingBookTrendMetrics = mongoose.model(
  'MarketingBookTrendMetrics',
  marketingBookTrendMetricsSchema,
  'marketing_book_trend_metrics'
);

export default MarketingBookTrendMetrics;
