import mongoose from 'mongoose';

/**
 * Daily Revenue Aggregate Model
 * Stores pre-aggregated daily revenue data for performance optimization
 */
const dailyRevenueAggregateSchema = new mongoose.Schema({
  // Date identifier (YYYY-MM-DD format for easy querying)
  date: {
    type: String, // Format: YYYY-MM-DD
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

  // Period type
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },

  // Revenue totals
  revenue: {
    grossRevenue: {
      type: Number,
      default: 0
    },
    appleFees: {
      type: Number,
      default: 0
    },
    netRevenue: {
      type: Number,
      default: 0
    },
    refunds: {
      type: Number,
      default: 0
    }
  },

  // Revenue breakdown
  breakdown: {
    subscriptionRevenue: {
      type: Number,
      default: 0
    },
    oneTimePurchaseRevenue: {
      type: Number,
      default: 0
    },
    trialRevenue: {
      type: Number,
      default: 0
    }
  },

  // Customer metrics
  customers: {
    newCount: {
      type: Number,
      default: 0
    },
    returningCount: {
      type: Number,
      default: 0
    },
    totalActive: {
      type: Number,
      default: 0
    },
    churnedCount: {
      type: Number,
      default: 0
    }
  },

  // Transaction counts
  transactions: {
    totalCount: {
      type: Number,
    default: 0
    },
    newCustomerTransactions: {
      type: Number,
      default: 0
    },
    renewalTransactions: {
      type: Number,
      default: 0
    },
    refundTransactions: {
      type: Number,
      default: 0
    }
  },

  // Average metrics
  averages: {
    revenuePerTransaction: {
      type: Number,
      default: 0
    },
    revenuePerCustomer: {
      type: Number,
      default: 0
    }
  },

  // Attribution breakdown (revenue by channel)
  byChannel: [{
    channel: {
      type: String,
      enum: ['organic', 'apple_search_ads', 'tiktok_ads', 'instagram_ads', 'google_ads', 'referral', 'direct']
    },
    grossRevenue: Number,
    netRevenue: Number,
    transactionCount: Number,
    newCustomerCount: Number
  }],

  // Attribution breakdown (revenue by campaign)
  byCampaign: [{
    campaignId: String,
    campaignName: String,
    grossRevenue: Number,
    netRevenue: Number,
    transactionCount: Number,
    newCustomerCount: Number,
    roi: Number
  }],

  // Subscription type breakdown
  bySubscriptionType: [{
    type: {
      type: String,
      enum: ['trial', 'monthly', 'annual', 'lifetime']
    },
    count: Number,
    revenue: Number
  }],

  // Regional breakdown
  byRegion: [{
    countryCode: String,
    region: String,
    revenue: Number,
    transactionCount: Number
  }],

  // Data quality indicators
  dataQuality: {
    transactionCount: Number, // Number of transactions aggregated
    lastSyncAt: Date, // When this aggregate was last updated
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100 // Percentage of expected data
    },
    hasRefunds: {
      type: Boolean,
      default: false
    }
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      default: 'app_store_connect'
    },
    appVersion: String,
    aggregatedAt: {
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
});

// Compound indexes for efficient queries
dailyRevenueAggregateSchema.index({ date: -1 });
dailyRevenueAggregateSchema.index({ dateObj: -1 });
dailyRevenueAggregateSchema.index({ period: 1, dateObj: -1 });
dailyRevenueAggregateSchema.index({ 'dataQuality.lastSyncAt': -1 });

/**
 * Static method: Aggregate revenue for a specific date
 * Fetches all transactions for the date and creates/updates aggregate record
 */
dailyRevenueAggregateSchema.statics.aggregateForDate = async function(dateObj) {
  const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

  // Start of day and end of day
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);

  // Import MarketingRevenue model
  const MarketingRevenue = (await import('./MarketingRevenue.js')).default;

  // Aggregate all transactions for this date
  const dailyTransactions = await MarketingRevenue.find({
    transactionDate: { $gte: startOfDay, $lte: endOfDay }
  });

  if (dailyTransactions.length === 0) {
    // No transactions for this date, return null or create zero aggregate
    return null;
  }

  // Calculate aggregates
  let grossRevenue = 0;
  let appleFees = 0;
  let netRevenue = 0;
  let refunds = 0;

  let subscriptionRevenue = 0;
  let oneTimePurchaseRevenue = 0;
  let trialRevenue = 0;

  let newCustomerCount = 0;
  let returningCustomerCount = 0;
  let churnedCount = 0;

  let newCustomerTransactions = 0;
  let renewalTransactions = 0;
  let refundTransactions = 0;

  // Channel breakdown
  const channelMap = new Map();

  // Campaign breakdown
  const campaignMap = new Map();

  // Subscription type breakdown
  const subscriptionTypeMap = new Map();

  // Regional breakdown
  const regionMap = new Map();

  for (const tx of dailyTransactions) {
    grossRevenue += tx.revenue.grossAmount || 0;
    appleFees += tx.revenue.appleFeeAmount || 0;
    netRevenue += tx.revenue.netAmount || 0;

    if (tx.metadata?.isRefund) {
      refunds += tx.revenue.grossAmount || 0;
      refundTransactions++;
    }

    // Revenue breakdown
    if (tx.customer?.subscriptionType === 'monthly' || tx.customer?.subscriptionType === 'annual') {
      subscriptionRevenue += tx.revenue.netAmount || 0;
    } else if (tx.customer?.subscriptionType === 'trial') {
      trialRevenue += tx.revenue.netAmount || 0;
    } else {
      oneTimePurchaseRevenue += tx.revenue.netAmount || 0;
    }

    // Customer counts
    if (tx.customer?.new) {
      newCustomerCount++;
      newCustomerTransactions++;
    } else {
      returningCustomerCount++;
      renewalTransactions++;
    }

    // Channel breakdown
    if (tx.attributedTo?.channel) {
      const channel = tx.attributedTo.channel;
      if (!channelMap.has(channel)) {
        channelMap.set(channel, {
          channel,
          grossRevenue: 0,
          netRevenue: 0,
          transactionCount: 0,
          newCustomerCount: 0
        });
      }
      const ch = channelMap.get(channel);
      ch.grossRevenue += tx.revenue.grossAmount || 0;
      ch.netRevenue += tx.revenue.netAmount || 0;
      ch.transactionCount++;
      if (tx.customer?.new) ch.newCustomerCount++;
    }

    // Campaign breakdown
    if (tx.attributedTo?.campaignId) {
      const campaignId = tx.attributedTo.campaignId;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          campaignId,
          campaignName: tx.attributedTo.campaignName || 'Unknown',
          grossRevenue: 0,
          netRevenue: 0,
          transactionCount: 0,
          newCustomerCount: 0,
          roi: 0
        });
      }
      const camp = campaignMap.get(campaignId);
      camp.grossRevenue += tx.revenue.grossAmount || 0;
      camp.netRevenue += tx.revenue.netAmount || 0;
      camp.transactionCount++;
      if (tx.customer?.new) camp.newCustomerCount++;
    }

    // Subscription type breakdown
    if (tx.customer?.subscriptionType) {
      const subType = tx.customer.subscriptionType;
      if (!subscriptionTypeMap.has(subType)) {
        subscriptionTypeMap.set(subType, {
          type: subType,
          count: 0,
          revenue: 0
        });
      }
      const sub = subscriptionTypeMap.get(subType);
      sub.count++;
      sub.revenue += tx.revenue.netAmount || 0;
    }

    // Regional breakdown
    if (tx.metadata?.countryCode) {
      const countryCode = tx.metadata.countryCode;
      const region = tx.metadata.region || 'Unknown';
      const key = `${countryCode}-${region}`;
      if (!regionMap.has(key)) {
        regionMap.set(key, {
          countryCode,
          region,
          revenue: 0,
          transactionCount: 0
        });
      }
      const reg = regionMap.get(key);
      reg.revenue += tx.revenue.netAmount || 0;
      reg.transactionCount++;
    }
  }

  const totalCount = dailyTransactions.length;
  const avgRevenuePerTransaction = totalCount > 0 ? netRevenue / totalCount : 0;
  const totalCustomers = newCustomerCount + returningCustomerCount;
  const avgRevenuePerCustomer = totalCustomers > 0 ? netRevenue / totalCustomers : 0;

  // Build aggregate object
  const aggregateData = {
    date: dateStr,
    dateObj: startOfDay,
    period: 'daily',
    revenue: {
      grossRevenue,
      appleFees,
      netRevenue,
      refunds
    },
    breakdown: {
      subscriptionRevenue,
      oneTimePurchaseRevenue,
      trialRevenue
    },
    customers: {
      newCount: newCustomerCount,
      returningCount: returningCustomerCount,
      totalActive: totalCustomers,
      churnedCount
    },
    transactions: {
      totalCount,
      newCustomerTransactions,
      renewalTransactions,
      refundTransactions
    },
    averages: {
      revenuePerTransaction: avgRevenuePerTransaction,
      revenuePerCustomer: avgRevenuePerCustomer
    },
    byChannel: Array.from(channelMap.values()),
    byCampaign: Array.from(campaignMap.values()),
    bySubscriptionType: Array.from(subscriptionTypeMap.values()),
    byRegion: Array.from(regionMap.values()),
    dataQuality: {
      transactionCount: totalCount,
      lastSyncAt: new Date(),
      completeness: 100,
      hasRefunds: refundTransactions > 0
    },
    metadata: {
      source: 'aggregated',
      aggregatedAt: new Date()
    }
  };

  // Upsert the aggregate record
  const aggregate = await this.findOneAndUpdate(
    { date: dateStr },
    aggregateData,
    { upsert: true, new: true }
  );

  return aggregate;
};

/**
 * Static method: Get daily aggregates for a date range
 */
dailyRevenueAggregateSchema.statics.getForDateRange = async function(startDate, endDate) {
  return this.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: 1 });
};

/**
 * Static method: Get daily aggregate for a specific date
 */
dailyRevenueAggregateSchema.statics.getForDate = async function(dateObj) {
  const dateStr = dateObj.toISOString().split('T')[0];
  return this.findOne({ date: dateStr });
};

/**
 * Static method: Get transactions for a specific day (drill-down)
 */
dailyRevenueAggregateSchema.statics.getTransactionsForDate = async function(dateObj) {
  const dateStr = dateObj.toISOString().split('T')[0];
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);

  const MarketingRevenue = (await import('./MarketingRevenue.js')).default;

  return MarketingRevenue.find({
    transactionDate: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ transactionDate: -1 });
};

/**
 * Static method: Get daily aggregates with channel breakdown
 */
dailyRevenueAggregateSchema.statics.getDailyWithChannelBreakdown = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        dateObj: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $sort: { dateObj: 1 }
    },
    {
      $project: {
        date: 1,
        dateObj: 1,
        'revenue.grossRevenue': 1,
        'revenue.netRevenue': 1,
        'customers.newCount': 1,
        'customers.totalActive': 1,
        'transactions.totalCount': 1,
        byChannel: 1
      }
    }
  ]);
};

// Update timestamp on save
dailyRevenueAggregateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const DailyRevenueAggregate = mongoose.model('DailyRevenueAggregate', dailyRevenueAggregateSchema);

export default DailyRevenueAggregate;
