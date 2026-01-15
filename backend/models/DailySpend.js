/**
 * Daily Spend Model
 *
 * Tracks daily ad spend aggregated from campaigns and ad groups.
 * Used for spend analysis, budget tracking, and trend visualization.
 */

import mongoose from 'mongoose';

const dailySpendSchema = new mongoose.Schema({
  // Date identifier (YYYY-MM-DD format for easy querying)
  date: {
    type: String,
    required: true,
    index: true,
    unique: true,
    validate: {
      validator: function(v) {
        // Validate YYYY-MM-DD format
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  },

  // Campaign reference (optional - can aggregate across all campaigns)
  campaignId: {
    type: String,
    index: true,
    required: false
  },

  // Platform identifier
  platform: {
    type: String,
    enum: ['apple_search_ads', 'tiktok', 'instagram', 'facebook', 'google_ads', 'all'],
    default: 'all',
    index: true
  },

  // Budget information
  dailyBudget: {
    type: Number,
    default: 0,
    min: 0
  },

  // Actual spend
  actualSpend: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  // Spend breakdown
  spendBreakdown: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    }
  },

  // Performance metrics
  metrics: {
    // Click-Through Rate
    ctr: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Conversion Rate
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Cost Per Acquisition
    cpa: {
      type: Number,
      default: 0,
      min: 0
    },
    // Return on Ad Spend
    roas: {
      type: Number,
      default: 0,
      min: 0
    },
    // Cost Per Click
    cpc: {
      type: Number,
      default: 0,
      min: 0
    },
    // Cost Per Mille (thousand impressions)
    cpm: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Budget status
  budgetStatus: {
    type: String,
    enum: ['under_budget', 'on_budget', 'over_budget', 'critical'],
    default: 'under_budget'
  },

  // Over-budget amount (if applicable)
  overBudgetAmount: {
    type: Number,
    default: 0
  },

  // Percentage of budget utilized
  budgetUtilization: {
    type: Number,
    default: 0,
    min: 0
  },

  // Trend indicators (compared to previous day)
  trend: {
    spend: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable'
    },
    impressions: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable'
    },
    clicks: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable'
    },
    conversions: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable'
    }
  },

  // Percentage change from previous day
  changeFromPrevious: {
    spend: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    }
  },

  // Aggregation metadata
  aggregationDetails: {
    campaignsCount: {
      type: Number,
      default: 0
    },
    adGroupsCount: {
      type: Number,
      default: 0
    },
    lastAggregatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Data source
  dataSource: {
    type: String,
    enum: ['api', 'manual', 'aggregated', 'mock'],
    default: 'api'
  },

  // Timestamps
  calculatedAt: {
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
dailySpendSchema.index({ date: -1, platform: 1 });
dailySpendSchema.index({ campaignId: 1, date: -1 });
dailySpendSchema.index({ date: -1, budgetStatus: 1 });

// Instance methods

/**
 * Calculate budget utilization percentage
 */
dailySpendSchema.methods.calculateBudgetUtilization = function() {
  if (this.dailyBudget <= 0) return 0;
  this.budgetUtilization = (this.actualSpend / this.dailyBudget) * 100;
  return this.budgetUtilization;
};

/**
 * Determine budget status based on utilization
 */
dailySpendSchema.methods.determineBudgetStatus = function() {
  const utilization = this.calculateBudgetUtilization();

  if (utilization >= 100) {
    this.budgetStatus = 'critical';
    this.overBudgetAmount = this.actualSpend - this.dailyBudget;
  } else if (utilization >= 90) {
    this.budgetStatus = 'over_budget';
    this.overBudgetAmount = this.actualSpend - this.dailyBudget;
  } else if (utilization >= 70) {
    this.budgetStatus = 'on_budget';
    this.overBudgetAmount = 0;
  } else {
    this.budgetStatus = 'under_budget';
    this.overBudgetAmount = 0;
  }

  return this.budgetStatus;
};

/**
 * Calculate performance metrics from breakdown
 */
dailySpendSchema.methods.calculateMetrics = function() {
  const { impressions, clicks, conversions } = this.spendBreakdown;

  // CTR = (clicks / impressions) * 100
  this.metrics.ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Conversion Rate = (conversions / clicks) * 100
  this.metrics.conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

  // CPC = spend / clicks
  this.metrics.cpc = clicks > 0 ? this.actualSpend / clicks : 0;

  // CPA = spend / conversions
  this.metrics.cpa = conversions > 0 ? this.actualSpend / conversions : 0;

  // CPM = (spend / impressions) * 1000
  this.metrics.cpm = impressions > 0 ? (this.actualSpend / impressions) * 1000 : 0;

  // ROAS = (revenue / spend) - assuming $10 per conversion
  const estimatedRevenue = conversions * 10;
  this.metrics.roas = this.actualSpend > 0 ? estimatedRevenue / this.actualSpend : 0;

  return this.metrics;
};

// Static methods

/**
 * Get daily spend for a date range
 */
dailySpendSchema.statics.getDailySpendInRange = async function(startDate, endDate, platform = 'all') {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    },
    platform: platform
  }).sort({ date: 1 });
};

/**
 * Aggregate daily spend by date across all campaigns
 */
dailySpendSchema.statics.aggregateDailySpend = async function(date) {
  const result = await this.aggregate([
    {
      $match: { date: date }
    },
    {
      $group: {
        _id: '$date',
        totalSpend: { $sum: '$actualSpend' },
        totalBudget: { $sum: '$dailyBudget' },
        totalImpressions: { $sum: '$spendBreakdown.impressions' },
        totalClicks: { $sum: '$spendBreakdown.clicks' },
        totalConversions: { $sum: '$spendBreakdown.conversions' },
        campaignsCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    return result[0];
  }
  return null;
};

/**
 * Get over-budget days
 */
dailySpendSchema.statics.getOverBudgetDays = async function(startDate, endDate, platform = 'all') {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    },
    platform: platform,
    budgetStatus: { $in: ['over_budget', 'critical'] }
  }).sort({ date: -1 });
};

/**
 * Calculate spend trend compared to previous day
 */
dailySpendSchema.statics.calculateTrends = async function(currentDate, previousDate) {
  const [current, previous] = await Promise.all([
    this.findOne({ date: currentDate }),
    this.findOne({ date: previousDate })
  ]);

  if (!current || !previous) {
    return null;
  }

  const calculateTrend = (curr, prev) => {
    if (prev === 0) return 'stable';
    const change = ((curr - prev) / prev) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const calculateChange = (curr, prev) => {
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
  };

  return {
    spend: {
      trend: calculateTrend(current.actualSpend, previous.actualSpend),
      change: calculateChange(current.actualSpend, previous.actualSpend)
    },
    impressions: {
      trend: calculateTrend(current.spendBreakdown.impressions, previous.spendBreakdown.impressions),
      change: calculateChange(current.spendBreakdown.impressions, previous.spendBreakdown.impressions)
    },
    clicks: {
      trend: calculateTrend(current.spendBreakdown.clicks, previous.spendBreakdown.clicks),
      change: calculateChange(current.spendBreakdown.clicks, previous.spendBreakdown.clicks)
    },
    conversions: {
      trend: calculateTrend(current.spendBreakdown.conversions, previous.spendBreakdown.conversions),
      change: calculateChange(current.spendBreakdown.conversions, previous.spendBreakdown.conversions)
    }
  };
};

/**
 * Get spend summary statistics
 */
dailySpendSchema.statics.getSpendSummary = async function(startDate, endDate, platform = 'all') {
  const pipeline = [
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        platform: platform
      }
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: '$actualSpend' },
        totalBudget: { $sum: '$dailyBudget' },
        avgDailySpend: { $avg: '$actualSpend' },
        maxDailySpend: { $max: '$actualSpend' },
        minDailySpend: { $min: '$actualSpend' },
        totalImpressions: { $sum: '$spendBreakdown.impressions' },
        totalClicks: { $sum: '$spendBreakdown.clicks' },
        totalConversions: { $sum: '$spendBreakdown.conversions' },
        overBudgetDays: {
          $sum: {
            $cond: [
              { $eq: ['$budgetStatus', 'critical'] },
              1,
              0
            ]
          }
        },
        daysCount: { $sum: 1 }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result.length > 0 ? result[0] : null;
};

const DailySpend = mongoose.model('DailySpend', dailySpendSchema);

export default DailySpend;
