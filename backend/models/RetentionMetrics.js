import mongoose from 'mongoose';

/**
 * Retention Metrics Model
 * Stores Firebase Analytics retention cohort data for user behavior analysis
 *
 * Tracks:
 * - Day 1, 7, 30 retention rates by cohort
 * - Session analytics (duration, frequency)
 * - Active users (DAU, WAU, MAU)
 * - User lifecycle metrics
 */
const retentionMetricsSchema = new mongoose.Schema({
  // Cohort date (when users first installed/activated)
  cohortDate: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },

  // Full date object for date range queries
  cohortDateObj: {
    type: Date,
    required: true,
    index: true
  },

  // Retention rates for this cohort
  retention: {
    // Percentage of users who returned on day N
    day1: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    day7: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    day30: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Rolling retention (users who returned at least once during period)
    rollingDay7: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    rollingDay30: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Cohort size (number of users in this cohort)
  cohortSize: {
    type: Number,
    default: 0
  },

  // Session analytics
  sessions: {
    // Average session duration in seconds
    avgDuration: {
      type: Number,
      default: 0
    },
    // Median session duration in seconds
    medianDuration: {
      type: Number,
      default: 0
    },
    // Average sessions per user during period
    avgSessionsPerUser: {
      type: Number,
      default: 0
    },
    // Total sessions for this cohort
    totalSessions: {
      type: Number,
      default: 0
    }
  },

  // Active user metrics
  activeUsers: {
    // Daily Active Users (DAU) - users with at least one session
    dau: {
      type: Number,
      default: 0
    },
    // Weekly Active Users (WAU) - users with at least one session in 7 days
    wau: {
      type: Number,
      default: 0
    },
    // Monthly Active Users (MAU) - users with at least one session in 30 days
    mau: {
      type: Number,
      default: 0
    },
    // DAU/MAU ratio (stickiness metric)
    stickinessRatio: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // User lifecycle metrics
  lifecycle: {
    // Average time to first purchase (seconds)
    avgTimeToFirstPurchase: {
      type: Number,
      default: 0
    },
    // Average time to subscription activation (seconds)
    avgTimeToSubscription: {
      type: Number,
      default: 0
    },
    // Conversion rate from free to paid
    freeToPaidConversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Trial to paid conversion rate
    trialToPaidConversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Device/platform breakdown
  byPlatform: [{
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    cohortSize: Number,
    retentionDay1: Number,
    retentionDay7: Number,
    retentionDay30: Number,
    avgSessionDuration: Number
  }],

  // Acquisition channel breakdown
  byChannel: [{
    channel: {
      type: String,
      enum: ['organic', 'apple_search_ads', 'tiktok', 'instagram', 'google_ads', 'referral', 'direct']
    },
    cohortSize: Number,
    retentionDay1: Number,
    retentionDay7: Number,
    retentionDay30: Number,
    avgSessionDuration: Number
  }],

  // Data source
  dataSource: {
    type: String,
    enum: ['firebase', 'app_store_connect', 'mixed'],
    default: 'firebase'
  },

  // Data quality and metadata
  dataQuality: {
    lastSyncAt: Date,
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    isEstimated: {
      type: Boolean,
      default: false
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
retentionMetricsSchema.index({ cohortDate: -1 });
retentionMetricsSchema.index({ cohortDateObj: -1 });
retentionMetricsSchema.index({ 'dataQuality.lastSyncAt': -1 });

/**
 * Static method: Get retention metrics for a date range
 */
retentionMetricsSchema.statics.getForDateRange = async function(startDate, endDate) {
  return this.find({
    cohortDateObj: { $gte: startDate, $lte: endDate }
  }).sort({ cohortDateObj: -1 });
};

/**
 * Static method: Get average retention rates for a period
 */
retentionMetricsSchema.statics.getAverageRetention = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        cohortDateObj: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        avgDay1: { $avg: '$retention.day1' },
        avgDay7: { $avg: '$retention.day7' },
        avgDay30: { $avg: '$retention.day30' },
        avgRollingDay7: { $avg: '$retention.rollingDay7' },
        avgRollingDay30: { $avg: '$retention.rollingDay30' },
        totalCohorts: { $sum: 1 },
        totalUsers: { $sum: '$cohortSize' }
      }
    }
  ]);

  if (result.length > 0) {
    return {
      day1: parseFloat((result[0].avgDay1 || 0).toFixed(2)),
      day7: parseFloat((result[0].avgDay7 || 0).toFixed(2)),
      day30: parseFloat((result[0].avgDay30 || 0).toFixed(2)),
      rollingDay7: parseFloat((result[0].avgRollingDay7 || 0).toFixed(2)),
      rollingDay30: parseFloat((result[0].avgRollingDay30 || 0).toFixed(2)),
      totalCohorts: result[0].totalCohorts,
      totalUsers: result[0].totalUsers
    };
  }
  return null;
};

/**
 * Static method: Get active user metrics for recent period
 */
retentionMetricsSchema.statics.getRecentActiveUsers = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await this.aggregate([
    {
      $match: {
        cohortDateObj: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avgDAU: { $avg: '$activeUsers.dau' },
        avgWAU: { $avg: '$activeUsers.wau' },
        avgMAU: { $avg: '$activeUsers.mau' },
        avgStickiness: { $avg: '$activeUsers.stickinessRatio' },
        maxDAU: { $max: '$activeUsers.dau' },
        minDAU: { $min: '$activeUsers.dau' }
      }
    }
  ]);

  if (result.length > 0) {
    return {
      avgDAU: Math.round(result[0].avgDAU || 0),
      avgWAU: Math.round(result[0].avgWAU || 0),
      avgMAU: Math.round(result[0].avgMAU || 0),
      avgStickiness: parseFloat((result[0].avgStickiness || 0).toFixed(2)),
      maxDAU: result[0].maxDAU || 0,
      minDAU: result[0].minDAU || 0
    };
  }
  return null;
};

/**
 * Static method: Get retention by acquisition channel
 */
retentionMetricsSchema.statics.getRetentionByChannel = async function(startDate, endDate) {
  const metrics = await this.getForDateRange(startDate, endDate);

  const channelMap = new Map();

  for (const metric of metrics) {
    if (metric.byChannel && metric.byChannel.length > 0) {
      for (const channel of metric.byChannel) {
        if (!channelMap.has(channel.channel)) {
          channelMap.set(channel.channel, {
            channel: channel.channel,
            totalCohortSize: 0,
            totalRetentionDay1: 0,
            totalRetentionDay7: 0,
            totalRetentionDay30: 0,
            totalAvgSessionDuration: 0,
            count: 0
          });
        }
        const data = channelMap.get(channel.channel);
        data.totalCohortSize += channel.cohortSize || 0;
        data.totalRetentionDay1 += channel.retentionDay1 || 0;
        data.totalRetentionDay7 += channel.retentionDay7 || 0;
        data.totalRetentionDay30 += channel.retentionDay30 || 0;
        data.totalAvgSessionDuration += channel.avgSessionDuration || 0;
        data.count++;
      }
    }
  }

  return Array.from(channelMap.values()).map(data => ({
    channel: data.channel,
    cohortSize: data.totalCohortSize,
    avgRetentionDay1: data.count > 0 ? parseFloat((data.totalRetentionDay1 / data.count).toFixed(2)) : 0,
    avgRetentionDay7: data.count > 0 ? parseFloat((data.totalRetentionDay7 / data.count).toFixed(2)) : 0,
    avgRetentionDay30: data.count > 0 ? parseFloat((data.totalRetentionDay30 / data.count).toFixed(2)) : 0,
    avgSessionDuration: data.count > 0 ? Math.round(data.totalAvgSessionDuration / data.count) : 0
  }));
};

// Update timestamp on save
retentionMetricsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const RetentionMetrics = mongoose.model('RetentionMetrics', retentionMetricsSchema, 'marketing_retention_metrics');

export default RetentionMetrics;
