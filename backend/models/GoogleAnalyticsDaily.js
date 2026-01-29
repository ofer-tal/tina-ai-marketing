/**
 * Google Analytics Daily Model
 *
 * Stores daily Google Analytics 4 data for web analytics:
 * - Page views and sessions
 * - Traffic sources breakdown
 * - User acquisition metrics
 * - Real-time user snapshots
 *
 * Used for web traffic analysis separate from app revenue data
 */

import mongoose from 'mongoose';

const googleAnalyticsDailySchema = new mongoose.Schema({
  // Date identifier (YYYY-MM-DD format)
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Full date object for date range queries
  dateObj: {
    type: Date,
    required: true,
    index: true
  },

  // Session metrics
  sessions: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    totalPageViews: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    avgSessionDuration: {
      type: Number,
      default: 0
    }
  },

  // Traffic sources breakdown
  trafficSources: [{
    source: {
      type: String,
      enum: ['organic', 'social', 'direct', 'referral', 'email', 'paid', 'other']
    },
    sessions: {
      type: Number,
      default: 0
    },
    users: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    // Original source/medium from GA4
    originalSource: String,
    originalMedium: String
  }],

  // User acquisition metrics
  userAcquisition: {
    newUsers: {
      type: Number,
      default: 0
    },
    returningUsers: {
      type: Number,
      default: 0
    },
    acquisitionChannels: [{
      channel: String,
      users: Number,
      percentage: Number
    }]
  },

  // Real-time snapshots (taken throughout the day)
  realtimeSnapshots: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    activeLast30Minutes: {
      type: Number,
      default: 0
    },
    activeLast60Minutes: {
      type: Number,
      default: 0
    }
  }],

  // Top pages for the day
  topPages: [{
    path: String,
    title: String,
    pageViews: Number,
    uniqueViews: Number,
    viewsPerSession: Number
  }],

  // Data quality indicators
  dataQuality: {
    lastSyncAt: {
      type: Date,
      default: Date.now
    },
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    hasRealtimeData: {
      type: Boolean,
      default: false
    }
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      default: 'google_analytics'
    },
    propertyId: String,
    syncedAt: {
      type: Date,
      default: Date.now
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
}, {
  timestamps: true
});

// Compound indexes for efficient queries
googleAnalyticsDailySchema.index({ date: -1 });
googleAnalyticsDailySchema.index({ dateObj: -1 });
googleAnalyticsDailySchema.index({ 'dataQuality.lastSyncAt': -1 });
googleAnalyticsDailySchema.index({ 'trafficSources.source': 1, dateObj: -1 });

/**
 * Static method: Get GA data for a date range
 */
googleAnalyticsDailySchema.statics.getForDateRange = async function(startDate, endDate) {
  return this.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: 1 });
};

/**
 * Static method: Get or create record for a specific date
 */
googleAnalyticsDailySchema.statics.getForDate = async function(dateObj) {
  const dateStr = dateObj.toISOString().split('T')[0];
  return this.findOne({ date: dateStr });
};

/**
 * Static method: Aggregate traffic sources for date range
 */
googleAnalyticsDailySchema.statics.getTrafficSourcesAggregate = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        dateObj: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $unwind: '$trafficSources'
    },
    {
      $group: {
        _id: '$trafficSources.source',
        totalSessions: { $sum: '$trafficSources.sessions' },
        totalUsers: { $sum: '$trafficSources.users' },
        daysPresent: { $sum: 1 }
      }
    },
    {
      $sort: { totalSessions: -1 }
    }
  ]);

  const totalSessions = result.reduce((sum, r) => sum + r.totalSessions, 0);

  return result.map(r => ({
    source: r._id,
    sessions: r.totalSessions,
    users: r.totalUsers,
    percentage: totalSessions > 0 ? Math.round((r.totalSessions / totalSessions) * 100) : 0,
    daysPresent: r.daysPresent
  }));
};

/**
 * Static method: Get daily totals for charting
 */
googleAnalyticsDailySchema.statics.getDailyTotals = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        dateObj: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $project: {
        date: 1,
        dateObj: 1,
        sessions: '$sessions.totalSessions',
        users: '$sessions.totalUsers',
        pageViews: '$sessions.totalPageViews',
        avgSessionDuration: '$sessions.avgSessionDuration',
        bounceRate: '$sessions.bounceRate'
      }
    },
    {
      $sort: { dateObj: 1 }
    }
  ]);
};

// Update timestamp on save
googleAnalyticsDailySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const GoogleAnalyticsDaily = mongoose.model('GoogleAnalyticsDaily', googleAnalyticsDailySchema, 'marketing_google_analytics_daily');

export default GoogleAnalyticsDaily;
