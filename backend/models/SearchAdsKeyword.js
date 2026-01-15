/**
 * SearchAdsKeyword Model
 *
 * Stores performance data for individual keywords in Apple Search Ads
 * Part of the paid ads management system - Feature #137
 */

import mongoose from 'mongoose';

const searchAdsKeywordSchema = new mongoose.Schema({
  // Identification
  campaignId: {
    type: String,
    required: true,
    index: true,
  },
  adGroupId: {
    type: String,
    required: true,
    index: true,
  },
  keywordId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  keywordText: {
    type: String,
    required: true,
    index: true,
  },
  matchType: {
    type: String,
    enum: ['BROAD', 'EXACT', 'PHRASE', 'UNKNOWN'],
    default: 'UNKNOWN',
  },

  // Bidding
  bid: {
    type: Number,
    default: 0,
  },
  bidStatus: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'UNKNOWN'],
    default: 'UNKNOWN',
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
    spend: {
      type: String,
      enum: ['up', 'down', 'stable', 'neutral'],
      default: 'neutral',
    },
    ctr: {
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
    spend: {
      type: Number,
      default: 0,
    },
    ctr: {
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
searchAdsKeywordSchema.index({ campaignId: 1, date: -1 });
searchAdsKeywordSchema.index({ adGroupId: 1, date: -1 });
searchAdsKeywordSchema.index({ status: 1, date: -1 });
searchAdsKeywordSchema.index({ keywordText: 1, date: -1 });

/**
 * Calculate CTR (Click-Through Rate)
 */
searchAdsKeywordSchema.methods.calculateCTR = function() {
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
searchAdsKeywordSchema.methods.calculateConversionRate = function() {
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
 */
searchAdsKeywordSchema.methods.calculateROAS = function() {
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
searchAdsKeywordSchema.methods.calculateCPA = function() {
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
searchAdsKeywordSchema.methods.calculateMetrics = function() {
  this.calculateCTR();
  this.calculateConversionRate();
  this.calculateROAS();
  this.calculateCPA();
  return this;
};

/**
 * Determine trend based on change percentage
 */
searchAdsKeywordSchema.methods.determineTrend = function(changePercentage) {
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
 * Static method to get keywords by campaign
 */
searchAdsKeywordSchema.statics.getByCampaign = function(campaignId, limit = 100) {
  return this.find({ campaignId })
    .sort({ date: -1 })
    .limit(limit)
    .exec();
};

/**
 * Static method to get keywords by ad group
 */
searchAdsKeywordSchema.statics.getByAdGroup = function(adGroupId, limit = 100) {
  return this.find({ adGroupId })
    .sort({ date: -1 })
    .limit(limit)
    .exec();
};

/**
 * Static method to aggregate spend by keyword for a campaign
 * Feature #137: Step 2 - Aggregate spend by keyword
 */
searchAdsKeywordSchema.statics.aggregateSpendByKeyword = async function(campaignId, startDate = null, endDate = null) {
  const matchQuery = { campaignId };

  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) matchQuery.date.$lte = new Date(endDate);
  }

  const result = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$keywordText',
        keywordId: { $first: '$keywordId' },
        matchType: { $first: '$matchType' },
        totalImpressions: { $sum: '$impressions' },
        totalClicks: { $sum: '$clicks' },
        totalConversions: { $sum: '$conversions' },
        totalSpend: { $sum: '$spend' },
        avgCTR: { $avg: '$ctr' },
        avgConversionRate: { $avg: '$conversionRate' },
        avgROAS: { $avg: '$roas' },
        avgCPA: { $avg: '$averageCpa' },
        latestDate: { $max: '$date' },
        count: { $sum: 1 },
      }
    },
    {
      $project: {
        _id: 0,
        keywordText: '$_id',
        keywordId: 1,
        matchType: 1,
        totalImpressions: 1,
        totalClicks: 1,
        totalConversions: 1,
        totalSpend: 1,
        avgCTR: { $round: ['$avgCTR', 2] },
        avgConversionRate: { $round: ['$avgConversionRate', 2] },
        avgROAS: { $round: ['$avgROAS', 2] },
        avgCPA: { $round: ['$avgCPA', 2] },
        latestDate: 1,
        count: 1,
      }
    },
    {
      $sort: { totalSpend: -1 }
    }
  ]);

  return result;
};

/**
 * Static method to get keyword statistics
 */
searchAdsKeywordSchema.statics.getKeywordStats = async function(campaignId) {
  const result = await this.aggregate([
    { $match: { campaignId } },
    {
      $group: {
        _id: '$campaignId',
        totalKeywords: { $sum: 1 },
        totalImpressions: { $sum: '$impressions' },
        totalClicks: { $sum: '$clicks' },
        totalConversions: { $sum: '$conversions' },
        totalSpend: { $sum: '$spend' },
        avgCTR: { $avg: '$ctr' },
        avgConversionRate: { $avg: '$conversionRate' },
        avgCPA: { $avg: '$averageCpa' },
      }
    }
  ]);

  if (result.length > 0) {
    return result[0];
  }

  return {
    totalKeywords: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalSpend: 0,
    avgCTR: 0,
    avgConversionRate: 0,
    avgCPA: 0,
  };
};

const SearchAdsKeyword = mongoose.model('SearchAdsKeyword', searchAdsKeywordSchema);

export default SearchAdsKeyword;
