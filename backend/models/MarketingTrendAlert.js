import mongoose from 'mongoose';

/**
 * Marketing Trend Alert Schema
 * Stores real-time trend alerts and notifications
 */

const marketingTrendAlertSchema = new mongoose.Schema({
  // Alert type
  alertType: {
    type: String,
    required: true,
    enum: [
      'viral',
      'emerging',
      'declining',
      'opportunity',
      'saturation',
      'competition_increase',
      'book_spike',
      'trope_trend',
      'hashtag_combo',
      'influencer_activity',
      'platform_algorithm',
      'other'
    ],
    index: true
  },

  // Alert title
  title: {
    type: String,
    required: true,
    trim: true
  },

  // Detailed description
  description: {
    type: String,
    required: true,
    trim: true
  },

  // Severity level
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },

  // Entity this alert is about
  entityType: {
    type: String,
    enum: ['book', 'topic', 'trope', 'hook', 'hashtag', 'author', 'series', 'influencer', 'general'],
    index: true
  },
  entityId: {
    type: String,
    index: true
  },
  entityName: String,

  // Alert data
  data: {
    // For viral alerts
    viral: {
      postId: String,
      platform: String,
      url: String,
      views: Number,
      engagementRate: Number,
      whatMadeItViral: String
    },

    // For emerging trends
    emerging: {
      trendName: String,
      velocity: Number,
      platform: String,
      description: String,
      suggestedActions: [String]
    },

    // For declining trends
    declining: {
      trendName: String,
      velocity: Number,
      platform: String,
      reason: String,
      alternatives: [String]
    },

    // For opportunities
    opportunity: {
      topic: String,
      reasoning: String,
      estimatedImpact: String,
      timeWindow: String
    },

    // For saturation alerts
    saturation: {
      hashtag: String,
      currentSaturation: Number,
      recommendation: String
    },

    // For competition increase
    competition: {
      topic: String,
      competitorCount: Number,
      avgCompetitorEngagement: Number,
      ourStanding: String
    },

    // For book spikes
    bookSpike: {
      bookTitle: String,
      author: String,
      mentionIncrease: Number,
      platform: String,
      reason: String
    },

    // General data
    metrics: {
      value: Number,
      previousValue: Number,
      changePercent: Number,
      timestamp: Date
    },

    // Platform affected
    platform: {
      type: String,
      enum: ['tiktok', 'instagram', 'youtube_shorts', 'all']
    },

    // Related hashtags
    hashtags: [String],

    // Related tropes
    tropes: [String],

    // Related books
    books: [{
      title: String,
      author: String
    }]
  },

  // Acknowledgment
  acknowledged: {
    type: Boolean,
    default: false,
    index: true
  },
  acknowledgedBy: {
    type: String
  },
  acknowledgedAt: {
    type: Date
  },

  // Action taken
  actionTaken: {
    type: String,
    enum: ['none', 'accepted', 'declined', 'deferred', 'implemented']
  },
  actionNotes: String,

  // Validity period
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
    // If set, alert is only relevant until this date
  },

  // Related alerts (for grouping)
  relatedAlerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingTrendAlert'
  }],

  // Notifications sent
  notificationsSent: [{
    channel: {
      type: String,
      enum: ['email', 'sse', 'webhook', 'slack', 'other']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed']
    }
  }],

  // Priority for display
  priority: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
    // Higher priority = more important
  },

  // Metadata
  createdBy: {
    type: String,
    default: 'system'
    // 'system' or user ID
  },
  source: {
    type: String,
    enum: ['automated', 'manual', 'api'],
    default: 'automated'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
marketingTrendAlertSchema.index({ alertType: 1, createdAt: -1 });
marketingTrendAlertSchema.index({ severity: 1, acknowledged: 1 });
marketingTrendAlertSchema.index({ acknowledged: 1, createdAt: -1 });
marketingTrendAlertSchema.index({ validFrom: 1, validUntil: 1 });

// Update the updatedAt timestamp before saving
marketingTrendAlertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create an alert
marketingTrendAlertSchema.statics.createAlert = function(alertData) {
  return this.create(alertData).then(alert => {
    // Trigger SSE notification for real-time alerts
    const sseService = require('../services/sseService');
    if (sseService && typeof sseService.broadcast === 'function') {
      sseService.broadcast('trend_alert', {
        id: alert._id,
        type: alert.alertType,
        title: alert.title,
        severity: alert.severity,
        description: alert.description,
        createdAt: alert.createdAt
      });
    }
    return alert;
  });
};

// Static method to get active alerts
marketingTrendAlertSchema.statics.getActiveAlerts = function(options = {}) {
  const {
    alertType,
    severity,
    acknowledged = false,
    limit = 50
  } = options;

  const query = {
    acknowledged,
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: new Date() } }
    ]
  };

  if (alertType) {
    query.alertType = alertType;
  }

  if (severity) {
    query.severity = severity;
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to acknowledge an alert
marketingTrendAlertSchema.statics.acknowledgeAlert = function(alertId, userId) {
  return this.findByIdAndUpdate(alertId, {
    acknowledged: true,
    acknowledgedBy: userId,
    acknowledgedAt: new Date()
  }, { new: true }).lean();
};

// Static method to get alert summary
marketingTrendAlertSchema.statics.getSummary = function(options = {}) {
  const {
    hours = 24,
    excludeAcknowledged = true
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const matchQuery = {
    createdAt: { $gte: cutoffDate }
  };

  if (excludeAcknowledged) {
    matchQuery.acknowledged = false;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$alertType',
        count: { $sum: 1 },
        highSeverity: {
          $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
        },
        urgentSeverity: {
          $sum: { $cond: [{ $eq: ['$severity', 'urgent'] }, 1, 0] }
        },
        latest: { $max: '$createdAt' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get alert by entity
marketingTrendAlertSchema.statics.getByEntity = function(entityType, entityId, options = {}) {
  const {
    limit = 20,
    includeAcknowledged = false
  } = options;

  const query = {
    entityType,
    entityId
  };

  if (!includeAcknowledged) {
    query.acknowledged = false;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to clean old alerts
marketingTrendAlertSchema.statics.cleanOldAlerts = function(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return this.deleteMany({
    $or: [
      { acknowledged: true, acknowledgedAt: { $lt: cutoffDate } },
      { validUntil: { $lt: new Date() } }
    ]
  });
};

// Instance method to mark as acknowledged
marketingTrendAlertSchema.methods.acknowledge = function(userId) {
  this.acknowledged = true;
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  return this.save();
};

// Instance method to set action taken
marketingTrendAlertSchema.methods.setAction = function(action, notes) {
  this.actionTaken = action;
  this.actionNotes = notes;
  return this.save();
};

// Instance method to extend validity
marketingTrendAlertSchema.methods.extendValidity = function(days) {
  const newDate = new Date();
  newDate.setDate(newDate.getDate() + days);
  this.validUntil = newDate;
  return this.save();
};

const MarketingTrendAlert = mongoose.model(
  'MarketingTrendAlert',
  marketingTrendAlertSchema,
  'marketing_trend_alerts'
);

export default MarketingTrendAlert;
