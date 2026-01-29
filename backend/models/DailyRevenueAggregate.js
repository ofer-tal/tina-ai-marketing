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

  // MRR (Monthly Recurring Revenue)
  mrr: {
    type: Number,
    default: 0
  },

  // Active subscribers (from users collection with subscription.status='active')
  subscribers: {
    totalCount: {
      type: Number,
      default: 0
    },
    monthlyCount: {
      type: Number,
      default: 0
    },
    annualCount: {
      type: Number,
      default: 0
    },
    lifetimeCount: {
      type: Number,
      default: 0
    },
    trialCount: {
      type: Number,
      default: 0
    }
  },

  // Customer metrics (from transactions)
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

  // Churn metrics
  churn: {
    rate: {
      type: Number,
      default: 0
    },
    periodStartSubscribers: {
      type: Number,
      default: 0
    },
    periodEndSubscribers: {
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

  // ARPU (Average Revenue Per User)
  arpu: {
    value: {
      type: Number,
      default: 0
    },
    periodRevenue: {
      type: Number,
      default: 0
    },
    periodSubscribers: {
      type: Number,
      default: 0
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // LTV (Lifetime Value)
  ltv: {
    value: {
      type: Number,
      default: 0
    },
    arpu: {
      type: Number,
      default: 0
    },
    customerLifespanMonths: {
      type: Number,
      default: 0
    },
    churnRate: {
      type: Number,
      default: 0
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Marketing costs (cloud, API, ad spend)
  costs: {
    totalCost: {
      type: Number,
      default: 0
    },
    cloudServices: {
      type: Number,
      default: 0
    },
    apiServices: {
      type: Number,
      default: 0
    },
    adSpend: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    },
    percentageOfRevenue: {
      type: Number,
      default: 0
    }
  },

  // Profit margin (after all costs)
  profitMargin: {
    value: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    netRevenue: {
      type: Number,
      default: 0
    },
    totalCosts: {
      type: Number,
      default: 0
    },
    calculatedAt: {
      type: Date,
      default: Date.now
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
          revenue: 0,
          uniqueSubscriptions: new Set()
        });
      }
      const sub = subscriptionTypeMap.get(subType);
      sub.count++;
      sub.revenue += tx.revenue.netAmount || 0;
      // Track unique subscription IDs for MRR calculation
      if (tx.customer?.subscriptionId) {
        sub.uniqueSubscriptions.add(tx.customer.subscriptionId);
      }
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

  // Calculate MRR (Monthly Recurring Revenue)
  // MRR = (monthly subscribers × monthly price) + (annual subscribers × annual price / 12)
  let mrr = 0;
  for (const [type, data] of subscriptionTypeMap.entries()) {
    if (type === 'monthly') {
      // Monthly subscribers: unique count × average monthly price
      const uniqueMonthlyCount = data.uniqueSubscriptions?.size || data.count;
      const avgMonthlyPrice = data.count > 0 ? data.revenue / data.count : 0;
      mrr += uniqueMonthlyCount * avgMonthlyPrice;
    } else if (type === 'annual') {
      // Annual subscribers: unique count × (average annual price / 12)
      const uniqueAnnualCount = data.uniqueSubscriptions?.size || data.count;
      const avgAnnualPrice = data.count > 0 ? data.revenue / data.count : 0;
      mrr += uniqueAnnualCount * (avgAnnualPrice / 12);
    }
    // Trials are not counted in MRR
  }

  // Query active subscribers from users collection
  // This gives us the actual count of users with active subscriptions
  let activeSubscribers = {
    totalCount: 0,
    monthlyCount: 0,
    annualCount: 0,
    lifetimeCount: 0,
    trialCount: 0
  };

  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Count total active subscribers
    activeSubscribers.totalCount = await usersCollection.countDocuments({
      'subscription.status': 'active'
    });

    // Count by subscription type using productId patterns
    activeSubscribers.monthlyCount = await usersCollection.countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /monthly\.|subscription\.monthly/
    });

    activeSubscribers.annualCount = await usersCollection.countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /annual\.|annualTrial/
    });

    activeSubscribers.lifetimeCount = await usersCollection.countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /lifetime/
    });

    activeSubscribers.trialCount = await usersCollection.countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /trial/
    });

    console.log(`Active subscribers: ${activeSubscribers.totalCount} total (${activeSubscribers.monthlyCount} monthly, ${activeSubscribers.annualCount} annual, ${activeSubscribers.lifetimeCount} lifetime, ${activeSubscribers.trialCount} trial)`);

    // Calculate churn metrics
    // Churn = users whose subscription changed from active to inactive/expired during this day
    let churnedCount = 0;
    let periodStartSubscribers = activeSubscribers.totalCount;

    // Get churned users - those whose subscription changed to inactive/expired today
    churnedCount = await usersCollection.countDocuments({
      'subscription.status': { $in: ['inactive', 'expired', 'canceled', 'cancelled', 'expired_redeemable'] },
      'subscription.changeDate': { $gte: startOfDay, $lte: endOfDay }
    });

    // Get subscribers at start of day (end of previous day + new today - churned today)
    // For more accuracy, we'll look at yesterday's aggregate if it exists
    const yesterday = new Date(dateObj);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayAggregate = await this.findOne({ date: yesterdayStr });
    periodStartSubscribers = yesterdayAggregate?.subscribers?.totalCount || activeSubscribers.totalCount;

    // Calculate churn rate: (churned / period_start) * 100
    const churnRate = periodStartSubscribers > 0 ? (churnedCount / periodStartSubscribers * 100) : 0;

    var churnMetrics = {
      rate: parseFloat(churnRate.toFixed(2)),
      periodStartSubscribers,
      periodEndSubscribers: activeSubscribers.totalCount
    };

    console.log(`Churn metrics: ${churnedCount} churned, ${churnMetrics.rate}% rate (${periodStartSubscribers} → ${activeSubscribers.totalCount})`);

    // Calculate ARPU (Average Revenue Per User)
    // ARPU = period net revenue / period active subscribers
    const arpuValue = activeSubscribers.totalCount > 0
      ? netRevenue / activeSubscribers.totalCount
      : 0;

    var arpuMetrics = {
      value: parseFloat(arpuValue.toFixed(2)),
      periodRevenue: netRevenue,
      periodSubscribers: activeSubscribers.totalCount,
      calculatedAt: new Date()
    };

    console.log(`ARPU: $${arpuMetrics.value} (revenue: $${netRevenue}, subscribers: ${activeSubscribers.totalCount})`);

    // Calculate LTV (Lifetime Value)
    // LTV = ARPU × customer lifespan (in months)
    // Customer lifespan = 1 / (churn rate / 100) if churn > 0, else use default 24 months
    let customerLifespanMonths = 24; // Default: 2 years
    if (churnMetrics.rate > 0) {
      customerLifespanMonths = 1 / (churnMetrics.rate / 100);
    }

    const ltvValue = arpuMetrics.value * customerLifespanMonths;

    var ltvMetrics = {
      value: parseFloat(ltvValue.toFixed(2)),
      arpu: arpuMetrics.value,
      customerLifespanMonths: parseFloat(customerLifespanMonths.toFixed(1)),
      churnRate: churnMetrics.rate,
      calculatedAt: new Date()
    };

    console.log(`LTV: $${ltvMetrics.value} (ARPU: $${arpuMetrics.value}, lifespan: ${ltvMetrics.customerLifespanMonths} months, churn: ${churnMetrics.rate}%)`);
  } catch (error) {
    console.error('Error querying active subscribers or calculating churn:', error);
    // If query fails, subscribers will remain at 0, churn at 0
    var churnMetrics = {
      rate: 0,
      periodStartSubscribers: 0,
      periodEndSubscribers: activeSubscribers.totalCount
    };
    var arpuMetrics = {
      value: 0,
      periodRevenue: netRevenue,
      periodSubscribers: activeSubscribers.totalCount,
      calculatedAt: new Date()
    };
    var ltvMetrics = {
      value: 0,
      arpu: arpuMetrics.value,
      customerLifespanMonths: 0,
      churnRate: churnMetrics.rate,
      calculatedAt: new Date()
    };
  }

  // Calculate marketing costs (10% of net revenue for cloud/API)
  // Cloud services: 6% of revenue
  // API services: 4% of revenue
  let costsMetrics = {
    totalCost: 0,
    cloudServices: 0,
    apiServices: 0,
    adSpend: 0,
    other: 0,
    percentageOfRevenue: 0
  };

  if (netRevenue > 0) {
    costsMetrics.cloudServices = netRevenue * 0.06; // 6% for cloud
    costsMetrics.apiServices = netRevenue * 0.04; // 4% for APIs
    costsMetrics.totalCost = costsMetrics.cloudServices + costsMetrics.apiServices;
    costsMetrics.percentageOfRevenue = (costsMetrics.totalCost / netRevenue) * 100;

    console.log(`Marketing costs: $${costsMetrics.totalCost.toFixed(2)} (${costsMetrics.percentageOfRevenue.toFixed(1)}% of revenue)`);
    console.log(`  - Cloud services: $${costsMetrics.cloudServices.toFixed(2)}`);
    console.log(`  - API services: $${costsMetrics.apiServices.toFixed(2)}`);
  }

  // Calculate profit margin
  // Profit margin = (net revenue - total costs) / net revenue × 100
  let profitMarginMetrics = {
    value: 0,
    percentage: 0,
    netRevenue: netRevenue,
    totalCosts: costsMetrics.totalCost,
    calculatedAt: new Date()
  };

  if (netRevenue > 0) {
    profitMarginMetrics.value = netRevenue - costsMetrics.totalCost;
    profitMarginMetrics.percentage = (profitMarginMetrics.value / netRevenue) * 100;

    console.log(`Profit margin: $${profitMarginMetrics.value.toFixed(2)} (${profitMarginMetrics.percentage.toFixed(1)}%)`);
  }

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
    mrr: Math.round(mrr * 100) / 100, // Round to 2 decimal places
    subscribers: activeSubscribers,
    churn: churnMetrics,
    arpu: arpuMetrics,
    ltv: ltvMetrics,
    costs: costsMetrics,
    profitMargin: profitMarginMetrics,
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

/**
 * Get total marketing spend for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Number} Total spend
 */
dailyRevenueAggregateSchema.statics.getTotalSpend = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: '$costs.totalCost' }
      }
    }
  ]);

  return result[0]?.totalSpend || 0;
};

/**
 * Get LTV (Lifetime Value) for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} LTV data with value
 */
dailyRevenueAggregateSchema.statics.getLTV = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalLTV: { $sum: { $ifNull: ['$ltv.value', 0] } },
        count: { $sum: 1 }
      }
    }
  ]);

  const value = result[0] && result[0].count > 0 ? result[0].totalLTV / result[0].count : 0;
  return { value };
};

/**
 * Get ARPU (Average Revenue Per User) for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Number} ARPU value
 */
dailyRevenueAggregateSchema.statics.getARPU = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$revenue.netRevenue' },
        totalActiveUsers: { $sum: '$customers.totalActive' }
      }
    }
  ]);

  if (result[0] && result[0].totalActiveUsers > 0) {
    return result[0].totalRevenue / result[0].totalActiveUsers;
  }
  return 0;
};

/**
 * Get churn rate for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Number} Churn rate (0-1)
 */
dailyRevenueAggregateSchema.statics.getChurnRate = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalChurned: { $sum: '$customers.churnedCount' },
        totalActive: { $sum: '$customers.totalActive' }
      }
    }
  ]);

  if (result[0] && result[0].totalActive > 0) {
    return result[0].totalChurned / result[0].totalActive;
  }
  return 0;
};

// Update timestamp on save
dailyRevenueAggregateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const DailyRevenueAggregate = mongoose.model('DailyRevenueAggregate', dailyRevenueAggregateSchema, 'marketing_daily_revenue_aggregates');

export default DailyRevenueAggregate;
