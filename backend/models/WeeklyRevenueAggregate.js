import mongoose from 'mongoose';

/**
 * Weekly Revenue Aggregate Model
 * Stores pre-aggregated weekly revenue data for performance optimization
 */
const weeklyRevenueAggregateSchema = new mongoose.Schema({
  // Week identifier (YYYY-Www format for easy querying, e.g., 2026-W03)
  weekIdentifier: {
    type: String, // Format: YYYY-Www
    required: true,
    unique: true,
    index: true
  },

  // Year and week number
  year: {
    type: Number,
    required: true,
    index: true
  },

  weekNumber: {
    type: Number, // 1-53
    required: true
  },

  // Week start and end dates
  weekStart: {
    type: Date,
    required: true,
    index: true
  },

  weekEnd: {
    type: Date,
    required: true,
    index: true
  },

  // Period type
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
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

  // Channel breakdown
  byChannel: {
    organic: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 },
      customers: { type: Number, default: 0 }
    },
    paid: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 },
      customers: { type: Number, default: 0 }
    }
  },

  // Subscription type breakdown
  bySubscriptionType: {
    annual: {
      revenue: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    monthly: {
      revenue: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    trial: {
      revenue: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    oneTime: {
      revenue: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    }
  },

  // Regional breakdown
  byRegion: {
    americas: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 }
    },
    europe: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 }
    },
    apac: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 }
    },
    other: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 }
    }
  },

  // Week-over-week comparison
  weekOverWeek: {
    revenueGrowth: {
      type: Number, // Percentage change
      default: 0
    },
    revenueGrowthAmount: {
      type: Number, // Absolute change
      default: 0
    },
    customerGrowth: {
      type: Number, // Percentage change
      default: 0
    },
    transactionGrowth: {
      type: Number, // Percentage change
      default: 0
    }
  },

  // Days included in this week
  includedDays: [{
    type: String // YYYY-MM-DD format
  }],

  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  transactionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
weeklyRevenueAggregateSchema.index({ weekStart: 1, weekEnd: 1 });
weeklyRevenueAggregateSchema.index({ year: 1, weekNumber: 1 });

/**
 * Get the ISO week number for a given date
 * @param {Date} date - The date to get week number for
 * @returns {Object} - { year, weekNumber }
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), weekNumber: weekNo };
}

/**
 * Get week start and end dates for a given ISO week
 * @param {Number} year - Year
 * @param {Number} weekNumber - Week number (1-53)
 * @returns {Object} - { weekStart, weekEnd } as Date objects
 */
function getWeekBounds(year, weekNumber) {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7;
  const weekStart = new Date(firstDayOfYear);
  weekStart.setDate(firstDayOfYear.getDate() + daysOffset);

  // Adjust to Monday
  const dayOfWeek = weekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Aggregate revenue data for a specific week
 * @param {Number} year - Year
 * @param {Number} weekNumber - Week number (1-53)
 * @returns {Object} - Aggregated weekly revenue data
 */
weeklyRevenueAggregateSchema.statics.aggregateForWeek = async function(year, weekNumber) {
  const MarketingRevenue = mongoose.model('MarketingRevenue');
  const WeeklyRevenueAggregate = mongoose.model('WeeklyRevenueAggregate');

  const { weekStart, weekEnd } = getWeekBounds(year, weekNumber);

  // Fetch all transactions for the week
  const transactions = await MarketingRevenue.find({
    transactionDate: {
      $gte: weekStart,
      $lte: weekEnd
    }
  });

  if (transactions.length === 0) {
    return null;
  }

  // Calculate aggregate metrics
  const aggregate = {
    grossRevenue: 0,
    appleFees: 0,
    netRevenue: 0,
    refunds: 0,
    subscriptionRevenue: 0,
    oneTimePurchaseRevenue: 0,
    trialRevenue: 0,
    newCount: 0,
    returningCount: 0,
    totalActive: 0,
    churnedCount: 0,
    totalCount: 0,
    newCustomerTransactions: 0,
    renewalTransactions: 0,
    refundTransactions: 0,
    organicRevenue: 0,
    organicTransactions: 0,
    organicCustomers: 0,
    paidRevenue: 0,
    paidTransactions: 0,
    paidCustomers: 0,
    annualRevenue: 0,
    annualCount: 0,
    monthlyRevenue: 0,
    monthlyCount: 0,
    trialRevenueCount: 0,
    trialCount: 0,
    oneTimeRevenue: 0,
    oneTimeCount: 0,
    americasRevenue: 0,
    americasTransactions: 0,
    europeRevenue: 0,
    europeTransactions: 0,
    apacRevenue: 0,
    apacTransactions: 0,
    otherRevenue: 0,
    otherTransactions: 0
  };

  const customerIds = new Set();
  const newCustomerIds = new Set();
  const returningCustomerIds = new Set();
  const includedDays = new Set();

  transactions.forEach(transaction => {
    const revenue = transaction.revenue || {};
    const customer = transaction.customer || {};
    const attribution = transaction.attributedTo || {};
    const metadata = transaction.metadata || {};

    // Revenue totals
    aggregate.grossRevenue += revenue.grossAmount || 0;
    aggregate.appleFees += revenue.appleFee || 0;
    aggregate.netRevenue += revenue.netAmount || 0;
    aggregate.refunds += revenue.refundAmount || 0;

    // Revenue breakdown
    if (customer.subscriptionType === 'annual') {
      aggregate.subscriptionRevenue += revenue.netAmount || 0;
      aggregate.annualRevenue += revenue.netAmount || 0;
      aggregate.annualCount++;
    } else if (customer.subscriptionType === 'monthly') {
      aggregate.subscriptionRevenue += revenue.netAmount || 0;
      aggregate.monthlyRevenue += revenue.netAmount || 0;
      aggregate.monthlyCount++;
    } else if (customer.subscriptionType === 'trial') {
      aggregate.trialRevenue += revenue.netAmount || 0;
      aggregate.trialRevenueCount += revenue.netAmount || 0;
      aggregate.trialCount++;
    } else {
      aggregate.oneTimePurchaseRevenue += revenue.netAmount || 0;
      aggregate.oneTimeRevenue += revenue.netAmount || 0;
      aggregate.oneTimeCount++;
    }

    // Customer metrics
    if (customer.subscriptionId) {
      customerIds.add(customer.subscriptionId);

      if (customer.new) {
        aggregate.newCount++;
        aggregate.newCustomerTransactions++;
        newCustomerIds.add(customer.subscriptionId);
      } else {
        aggregate.returningCount++;
        aggregate.renewalTransactions++;
        returningCustomerIds.add(customer.subscriptionId);
      }
    }

    aggregate.totalCount++;

    // Channel breakdown
    const channel = attribution.channel || 'organic';
    if (channel === 'organic') {
      aggregate.organicRevenue += revenue.netAmount || 0;
      aggregate.organicTransactions++;
      if (customer.subscriptionId) {
        aggregate.organicCustomers++;
      }
    } else {
      aggregate.paidRevenue += revenue.netAmount || 0;
      aggregate.paidTransactions++;
      if (customer.subscriptionId) {
        aggregate.paidCustomers++;
      }
    }

    // Regional breakdown
    const region = metadata.region || 'other';
    if (region === 'AMERICAS') {
      aggregate.americasRevenue += revenue.netAmount || 0;
      aggregate.americasTransactions++;
    } else if (region === 'EUROPE') {
      aggregate.europeRevenue += revenue.netAmount || 0;
      aggregate.europeTransactions++;
    } else if (region === 'APAC') {
      aggregate.apacRevenue += revenue.netAmount || 0;
      aggregate.apacTransactions++;
    } else {
      aggregate.otherRevenue += revenue.netAmount || 0;
      aggregate.otherTransactions++;
    }

    // Track included days
    if (transaction.transactionDate) {
      const dateStr = transaction.transactionDate.toISOString().split('T')[0];
      includedDays.add(dateStr);
    }
  });

  aggregate.totalActive = customerIds.size;

  // Calculate averages
  const revenuePerTransaction = aggregate.totalCount > 0
    ? aggregate.netRevenue / aggregate.totalCount
    : 0;
  const revenuePerCustomer = aggregate.totalActive > 0
    ? aggregate.netRevenue / aggregate.totalActive
    : 0;

  // Calculate MRR (Monthly Recurring Revenue)
  // MRR = (monthly subscribers × monthly price) + (annual subscribers × annual price / 12)
  let mrr = 0;
  if (aggregate.monthlyCount > 0) {
    const avgMonthlyPrice = aggregate.monthlyRevenue / aggregate.monthlyCount;
    mrr += aggregate.monthlyCount * avgMonthlyPrice;
  }
  if (aggregate.annualCount > 0) {
    const avgAnnualPrice = aggregate.annualRevenue / aggregate.annualCount;
    mrr += aggregate.annualCount * (avgAnnualPrice / 12);
  }
  aggregate.mrr = Math.round(mrr * 100) / 100; // Round to 2 decimal places

  // Query active subscribers from users collection
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

    console.log(`Week ${year}-W${weekNumber} Active subscribers: ${activeSubscribers.totalCount} total`);

    // Calculate churn metrics
    // Get churned users - those whose subscription changed to inactive/expired during this week
    const churnedCount = await usersCollection.countDocuments({
      'subscription.status': { $in: ['inactive', 'expired', 'canceled', 'cancelled', 'expired_redeemable'] },
      'subscription.changeDate': { $gte: weekStart, $lte: weekEnd }
    });

    // Get previous week's subscriber count
    const prevWeekNumber = weekNumber - 1;
    let periodStartSubscribers = activeSubscribers.totalCount;

    if (prevWeekNumber > 0) {
      const prevWeek = await this.findOne({
        year,
        weekNumber: prevWeekNumber
      });
      periodStartSubscribers = prevWeek?.subscribers?.totalCount || activeSubscribers.totalCount;
    }

    // Calculate churn rate: (churned / period_start) * 100
    const churnRate = periodStartSubscribers > 0 ? (churnedCount / periodStartSubscribers * 100) : 0;

    var churnMetrics = {
      rate: parseFloat(churnRate.toFixed(2)),
      periodStartSubscribers,
      periodEndSubscribers: activeSubscribers.totalCount
    };

    console.log(`Week ${year}-W${weekNumber} Churn: ${churnedCount} churned, ${churnMetrics.rate}% rate`);

    // Calculate ARPU (Average Revenue Per User)
    // ARPU = period net revenue / period active subscribers
    const arpuValue = activeSubscribers.totalCount > 0
      ? aggregate.netRevenue / activeSubscribers.totalCount
      : 0;

    var arpuMetrics = {
      value: parseFloat(arpuValue.toFixed(2)),
      periodRevenue: aggregate.netRevenue,
      periodSubscribers: activeSubscribers.totalCount,
      calculatedAt: new Date()
    };

    console.log(`Week ${year}-W${weekNumber} ARPU: $${arpuMetrics.value} (revenue: $${aggregate.netRevenue}, subscribers: ${activeSubscribers.totalCount})`);

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

    console.log(`Week ${year}-W${weekNumber} LTV: $${ltvMetrics.value} (ARPU: $${arpuMetrics.value}, lifespan: ${ltvMetrics.customerLifespanMonths} months, churn: ${churnMetrics.rate}%)`);
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
      periodRevenue: aggregate.netRevenue,
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

  if (aggregate.netRevenue > 0) {
    costsMetrics.cloudServices = aggregate.netRevenue * 0.06; // 6% for cloud
    costsMetrics.apiServices = aggregate.netRevenue * 0.04; // 4% for APIs
    costsMetrics.totalCost = costsMetrics.cloudServices + costsMetrics.apiServices;
    costsMetrics.percentageOfRevenue = (costsMetrics.totalCost / aggregate.netRevenue) * 100;

    console.log(`Week ${year}-W${weekNumber} marketing costs: $${costsMetrics.totalCost.toFixed(2)} (${costsMetrics.percentageOfRevenue.toFixed(1)}% of revenue)`);
    console.log(`  - Cloud services: $${costsMetrics.cloudServices.toFixed(2)}`);
    console.log(`  - API services: $${costsMetrics.apiServices.toFixed(2)}`);
  }

  // Calculate profit margin
  // Profit margin = (net revenue - total costs) / net revenue × 100
  let profitMarginMetrics = {
    value: 0,
    percentage: 0,
    netRevenue: aggregate.netRevenue,
    totalCosts: costsMetrics.totalCost,
    calculatedAt: new Date()
  };

  if (aggregate.netRevenue > 0) {
    profitMarginMetrics.value = aggregate.netRevenue - costsMetrics.totalCost;
    profitMarginMetrics.percentage = (profitMarginMetrics.value / aggregate.netRevenue) * 100;

    console.log(`Profit margin: $${profitMarginMetrics.value.toFixed(2)} (${profitMarginMetrics.percentage.toFixed(1)}%)`);
  }

  // Generate week identifier
  const weekIdentifier = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

  // Fetch previous week's data for comparison
  const prevWeekNumber = weekNumber - 1;
  let weekOverWeek = {
    revenueGrowth: 0,
    revenueGrowthAmount: 0,
    customerGrowth: 0,
    transactionGrowth: 0
  };

  if (prevWeekNumber > 0) {
    const prevWeek = await WeeklyRevenueAggregate.findOne({
      year,
      weekNumber: prevWeekNumber
    });

    if (prevWeek) {
      const prevRevenue = prevWeek.revenue?.netRevenue || 0;
      const prevCustomers = prevWeek.customers?.totalActive || 0;
      const prevTransactions = prevWeek.transactions?.totalCount || 0;

      weekOverWeek.revenueGrowthAmount = aggregate.netRevenue - prevRevenue;
      weekOverWeek.revenueGrowth = prevRevenue > 0
        ? ((aggregate.netRevenue - prevRevenue) / prevRevenue) * 100
        : 0;
      weekOverWeek.customerGrowth = prevCustomers > 0
        ? ((aggregate.totalActive - prevCustomers) / prevCustomers) * 100
        : 0;
      weekOverWeek.transactionGrowth = prevTransactions > 0
        ? ((aggregate.totalCount - prevTransactions) / prevTransactions) * 100
        : 0;
    }
  }

  // Create or update weekly aggregate
  const weeklyAggregate = await WeeklyRevenueAggregate.findOneAndUpdate(
    { weekIdentifier },
    {
      year,
      weekNumber,
      weekStart,
      weekEnd,
      weekIdentifier,
      period: 'weekly',
      revenue: {
        grossRevenue: aggregate.grossRevenue,
        appleFees: aggregate.appleFees,
        netRevenue: aggregate.netRevenue,
        refunds: aggregate.refunds
      },
      breakdown: {
        subscriptionRevenue: aggregate.subscriptionRevenue,
        oneTimePurchaseRevenue: aggregate.oneTimePurchaseRevenue,
        trialRevenue: aggregate.trialRevenue
      },
      mrr: aggregate.mrr || 0,
      subscribers: activeSubscribers,
      churn: churnMetrics,
      arpu: arpuMetrics,
      ltv: ltvMetrics,
      costs: costsMetrics,
      profitMargin: profitMarginMetrics,
      customers: {
        newCount: aggregate.newCount,
        returningCount: aggregate.returningCount,
        totalActive: aggregate.totalActive,
        churnedCount: aggregate.churnedCount
      },
      transactions: {
        totalCount: aggregate.totalCount,
        newCustomerTransactions: aggregate.newCustomerTransactions,
        renewalTransactions: aggregate.renewalTransactions,
        refundTransactions: aggregate.refundTransactions
      },
      averages: {
        revenuePerTransaction,
        revenuePerCustomer
      },
      byChannel: {
        organic: {
          revenue: aggregate.organicRevenue,
          transactions: aggregate.organicTransactions,
          customers: aggregate.organicCustomers
        },
        paid: {
          revenue: aggregate.paidRevenue,
          transactions: aggregate.paidTransactions,
          customers: aggregate.paidCustomers
        }
      },
      bySubscriptionType: {
        annual: {
          revenue: aggregate.annualRevenue,
          count: aggregate.annualCount
        },
        monthly: {
          revenue: aggregate.monthlyRevenue,
          count: aggregate.monthlyCount
        },
        trial: {
          revenue: aggregate.trialRevenueCount,
          count: aggregate.trialCount
        },
        oneTime: {
          revenue: aggregate.oneTimeRevenue,
          count: aggregate.oneTimeCount
        }
      },
      byRegion: {
        americas: {
          revenue: aggregate.americasRevenue,
          transactions: aggregate.americasTransactions
        },
        europe: {
          revenue: aggregate.europeRevenue,
          transactions: aggregate.europeTransactions
        },
        apac: {
          revenue: aggregate.apacRevenue,
          transactions: aggregate.apacTransactions
        },
        other: {
          revenue: aggregate.otherRevenue,
          transactions: aggregate.otherTransactions
        }
      },
      weekOverWeek,
      includedDays: Array.from(includedDays),
      transactionCount: transactions.length,
      generatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return weeklyAggregate;
};

/**
 * Get weekly aggregates for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Array of weekly aggregates
 */
weeklyRevenueAggregateSchema.statics.getForDateRange = async function(startDate, endDate) {
  return this.find({
    weekStart: { $gte: startDate },
    weekEnd: { $lte: endDate }
  }).sort({ weekStart: 1 });
};

const WeeklyRevenueAggregate = mongoose.model('WeeklyRevenueAggregate', weeklyRevenueAggregateSchema, 'marketing_weekly_revenue_aggregates');

export default WeeklyRevenueAggregate;
