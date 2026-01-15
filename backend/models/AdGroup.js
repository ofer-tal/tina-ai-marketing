/**
 * AdGroup Model
 *
 * Stores performance data for Apple Search Ads ad groups
 * Part of the paid ads management system
 */

import mongoose from 'mongoose';

const adGroupSchema = new mongoose.Schema({
  // Identification
  campaignId: {
    type: String,
    required: true,
    index: true,
  },
  adGroupId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },

  // Status
  status: {
    type: String,
    enum: ['ENABLED', 'PAUSED', 'DISABLED', 'UNKNOWN'],
    default: 'UNKNOWN',
  },
  servingStatus: {
    type: String,
    enum: ['RUNNING', 'NOT_RUNNING', 'PAUSED', 'UNKNOWN'],
    default: 'UNKNOWN',
  },

  // Performance Metrics (daily)
  impressions: {
    type: Number,
    default: 0,
  },
  taps: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  conversions: {
    type: Number,
    default: 0,
  },
  installs: {
    type: Number,
    default: 0,
  },

  // Financial Metrics
  spend: {
    type: Number,
    default: 0,
  },
  averageCpa: {
    type: Number,
    default: 0,
  },
  averageCpc: {
    type: Number,
    default: 0,
  },
  cpm: {
    type: Number,
    default: 0,
  },

  // Calculated Metrics
  ctr: {
    type: Number,
    default: 0, // Click-through rate
  },
  conversionRate: {
    type: Number,
    default: 0, // Conversion rate
  },
  roas: {
    type: Number,
    default: 0, // Return on ad spend
  },
  localSpendPerRoas: {
    type: Number,
    default: 0,
  },

  // Budgeting
  dailyBudget: {
    type: Number,
    default: 0,
  },

  // Trend Data
  trend: {
    clicks: {
      type: String,
      enum: ['up', 'down', 'stable', 'neutral'],
      default: 'neutral',
    },
    conversions: {
      type: String,
      enum: ['up', 'down', 'stable', 'neutral'],
      default: 'neutral',
    },
    ctr: {
      type: String,
      enum: ['up', 'down', 'stable', 'neutral'],
      default: 'neutral',
    },
    roas: {
      type: String,
      enum: ['up', 'down', 'stable', 'neutral'],
      default: 'neutral',
    },
  },

  // Change percentages (vs previous period)
  change: {
    clicks: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
    ctr: {
      type: Number,
      default: 0,
    },
    roas: {
      type: Number,
      default: 0,
    },
  },

  // Metadata
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },

  // Timestamps
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
adGroupSchema.index({ campaignId: 1, date: -1 });
adGroupSchema.index({ status: 1, date: -1 });

/**
 * Calculate CTR (Click-Through Rate)
 */
adGroupSchema.methods.calculateCTR = function() {
  if (this.impressions > 0) {
    this.ctr = (this.clicks / this.impressions) * 100;
  } else {
    this.ctr = 0;
  }
  return this.ctr;
};

/**
 * Calculate Conversion Rate
 */
adGroupSchema.methods.calculateConversionRate = function() {
  if (this.clicks > 0) {
    this.conversionRate = (this.conversions / this.clicks) * 100;
  } else {
    this.conversionRate = 0;
  }
  return this.conversionRate;
};

/**
 * Calculate ROAS (Return on Ad Spend)
 * ROAS = Revenue / Spend
 * For now, use average order value if available
 */
adGroupSchema.methods.calculateROAS = function() {
  if (this.spend > 0) {
    // Assuming $10 average revenue per conversion for blush app
    const revenue = this.conversions * 10;
    this.roas = revenue / this.spend;
  } else {
    this.roas = 0;
  }
  return this.roas;
};

/**
 * Calculate CPA (Cost Per Acquisition)
 */
adGroupSchema.methods.calculateCPA = function() {
  if (this.conversions > 0) {
    this.averageCpa = this.spend / this.conversions;
  } else {
    this.averageCpa = 0;
  }
  return this.averageCpa;
};

/**
 * Calculate all metrics
 */
adGroupSchema.methods.calculateMetrics = function() {
  this.calculateCTR();
  this.calculateConversionRate();
  this.calculateROAS();
  this.calculateCPA();
  return this;
};

/**
 * Determine trend based on change percentage
 */
adGroupSchema.methods.determineTrend = function(changePercentage) {
  if (Math.abs(changePercentage) < 2) {
    return 'stable';
  } else if (changePercentage > 5) {
    return 'up';
  } else if (changePercentage < -5) {
    return 'down';
  } else if (changePercentage > 0) {
    return 'up';
  } else {
    return 'down';
  }
};

/**
 * Static method to get ad groups by campaign
 */
adGroupSchema.statics.getByCampaign = function(campaignId, limit = 50) {
  return this.find({ campaignId })
    .sort({ date: -1 })
    .limit(limit)
    .exec();
};

/**
 * Static method to get aggregated stats for campaign
 */
adGroupSchema.statics.getAggregatedStats = async function(campaignId) {
  const result = await this.aggregate([
    { $match: { campaignId } },
    {
      $group: {
        _id: '$campaignId',
        totalImpressions: { $sum: '$impressions' },
        totalClicks: { $sum: '$clicks' },
        totalConversions: { $sum: '$conversions' },
        totalSpend: { $sum: '$spend' },
        avgCTR: { $avg: '$ctr' },
        avgConversionRate: { $avg: '$conversionRate' },
        avgROAS: { $avg: '$roas' },
        avgCPA: { $avg: '$averageCpa' },
        count: { $sum: 1 },
      }
    }
  ]);

  if (result.length > 0) {
    return result[0];
  }

  return {
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalSpend: 0,
    avgCTR: 0,
    avgConversionRate: 0,
    avgROAS: 0,
    avgCPA: 0,
    count: 0,
  };
};

const AdGroup = mongoose.model('AdGroup', adGroupSchema);

export default AdGroup;
