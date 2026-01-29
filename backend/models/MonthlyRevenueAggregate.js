import mongoose from 'mongoose';

/**
 * Monthly Revenue Aggregate Model
 * Stores pre-aggregated monthly revenue data for performance optimization
 */
const monthlyRevenueAggregateSchema = new mongoose.Schema({
  // Month identifier (YYYY-MM format for easy querying, e.g., 2026-01)
  monthIdentifier: {
    type: String, // Format: YYYY-MM
    required: true,
    unique: true,
    index: true
  },

  // Year and month number
  year: {
    type: Number,
    required: true,
    index: true
  },

  month: {
    type: Number, // 1-12
    required: true
  },

  // Month name for display
  monthName: {
    type: String, // e.g., "January", "February"
    required: true
  },

  // Month start and end dates
  monthStart: {
    type: Date,
    required: true,
    index: true
  },

  monthEnd: {
    type: Date,
    required: true,
    index: true
  },

  // Period type
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly'
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
    },
    dailyAverageRevenue: {
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

  // Month-over-month comparison
  monthOverMonth: {
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

  // Days included in this month
  includedDays: [{
    type: String // YYYY-MM-DD format
  }],

  // Weeks included in this month
  includedWeeks: [{
    type: String // YYYY-Www format
  }],

  // Number of days in the month
  daysInMonth: {
    type: Number,
    default: 0
  },

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
monthlyRevenueAggregateSchema.index({ monthStart: 1, monthEnd: 1 });
monthlyRevenueAggregateSchema.index({ year: 1, month: 1 });

/**
 * Get month start and end dates for a given year and month
 * @param {Number} year - Year
 * @param {Number} month - Month number (1-12)
 * @returns {Object} - { monthStart, monthEnd } as Date objects
 */
function getMonthBounds(year, month) {
  const monthStart = new Date(year, month - 1, 1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return { monthStart, monthEnd };
}

/**
 * Get month name from month number
 * @param {Number} month - Month number (1-12)
 * @returns {String} - Month name
 */
function getMonthName(month) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month - 1] || 'Unknown';
}

/**
 * Aggregate revenue data for a specific month
 * @param {Number} year - Year
 * @param {Number} month - Month number (1-12)
 * @returns {Object} - Aggregated monthly revenue data
 */
monthlyRevenueAggregateSchema.statics.aggregateForMonth = async function(year, month) {
  const MarketingRevenue = mongoose.model('MarketingRevenue');
  const MonthlyRevenueAggregate = mongoose.model('MonthlyRevenueAggregate');

  const { monthStart, monthEnd } = getMonthBounds(year, month);
  const monthName = getMonthName(month);

  // Fetch all transactions for the month
  const transactions = await MarketingRevenue.find({
    transactionDate: {
      $gte: monthStart,
      $lte: monthEnd
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
  const includedWeeks = new Set();

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

    // Track included days and weeks
    if (transaction.transactionDate) {
      const dateStr = transaction.transactionDate.toISOString().split('T')[0];
      includedDays.add(dateStr);

      // Add ISO week
      const d = new Date(Date.UTC(
        transaction.transactionDate.getFullYear(),
        transaction.transactionDate.getMonth(),
        transaction.transactionDate.getDate()
      ));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      const weekIdentifier = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      includedWeeks.add(weekIdentifier);
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
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyAverageRevenue = aggregate.netRevenue / daysInMonth;

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

    console.log(`Month ${year}-${month} Active subscribers: ${activeSubscribers.totalCount} total`);

    // Calculate churn metrics
    // Get churned users - those whose subscription changed to inactive/expired during this month
    const churnedCount = await usersCollection.countDocuments({
      'subscription.status': { $in: ['inactive', 'expired', 'canceled', 'cancelled', 'expired_redeemable'] },
      'subscription.changeDate': { $gte: monthStart, $lte: monthEnd }
    });

    // Get previous month's subscriber count
    const prevMonth = month - 1;
    let periodStartSubscribers = activeSubscribers.totalCount;

    if (prevMonth > 0) {
      const prevMonthData = await this.findOne({
        year,
        month: prevMonth
      });
      periodStartSubscribers = prevMonthData?.subscribers?.totalCount || activeSubscribers.totalCount;
    } else if (prevMonth === 0) {
      // Check December of previous year
      const prevMonthData = await this.findOne({
        year: year - 1,
        month: 12
      });
      periodStartSubscribers = prevMonthData?.subscribers?.totalCount || activeSubscribers.totalCount;
    }

    // Calculate churn rate: (churned / period_start) * 100
    const churnRate = periodStartSubscribers > 0 ? (churnedCount / periodStartSubscribers * 100) : 0;

    var churnMetrics = {
      rate: parseFloat(churnRate.toFixed(2)),
      periodStartSubscribers,
      periodEndSubscribers: activeSubscribers.totalCount
    };

    console.log(`Month ${year}-${month} Churn: ${churnedCount} churned, ${churnMetrics.rate}% rate`);

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

    console.log(`Month ${year}-${month} ARPU: $${arpuMetrics.value} (revenue: $${aggregate.netRevenue}, subscribers: ${activeSubscribers.totalCount})`);

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

    console.log(`Month ${year}-${month} LTV: $${ltvMetrics.value} (ARPU: $${arpuMetrics.value}, lifespan: ${ltvMetrics.customerLifespanMonths} months, churn: ${churnMetrics.rate}%)`);
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

    console.log(`Month ${year}-${month.toString().padStart(2, '0')} marketing costs: $${costsMetrics.totalCost.toFixed(2)} (${costsMetrics.percentageOfRevenue.toFixed(1)}% of revenue)`);
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

  // Generate month identifier
  const monthIdentifier = `${year}-${month.toString().padStart(2, '0')}`;

  // Fetch previous month's data for comparison
  const prevMonth = month - 1;
  let monthOverMonth = {
    revenueGrowth: 0,
    revenueGrowthAmount: 0,
    customerGrowth: 0,
    transactionGrowth: 0
  };

  if (prevMonth > 0) {
    const prevMonthData = await MonthlyRevenueAggregate.findOne({
      year,
      month: prevMonth
    });

    if (prevMonthData) {
      const prevRevenue = prevMonthData.revenue?.netRevenue || 0;
      const prevCustomers = prevMonthData.customers?.totalActive || 0;
      const prevTransactions = prevMonthData.transactions?.totalCount || 0;

      monthOverMonth.revenueGrowthAmount = aggregate.netRevenue - prevRevenue;
      monthOverMonth.revenueGrowth = prevRevenue > 0
        ? ((aggregate.netRevenue - prevRevenue) / prevRevenue) * 100
        : 0;
      monthOverMonth.customerGrowth = prevCustomers > 0
        ? ((aggregate.totalActive - prevCustomers) / prevCustomers) * 100
        : 0;
      monthOverMonth.transactionGrowth = prevTransactions > 0
        ? ((aggregate.totalCount - prevTransactions) / prevTransactions) * 100
        : 0;
    }
  } else if (prevMonth === 0) {
    // Check December of previous year
    const prevMonthData = await MonthlyRevenueAggregate.findOne({
      year: year - 1,
      month: 12
    });

    if (prevMonthData) {
      const prevRevenue = prevMonthData.revenue?.netRevenue || 0;
      const prevCustomers = prevMonthData.customers?.totalActive || 0;
      const prevTransactions = prevMonthData.transactions?.totalCount || 0;

      monthOverMonth.revenueGrowthAmount = aggregate.netRevenue - prevRevenue;
      monthOverMonth.revenueGrowth = prevRevenue > 0
        ? ((aggregate.netRevenue - prevRevenue) / prevRevenue) * 100
        : 0;
      monthOverMonth.customerGrowth = prevCustomers > 0
        ? ((aggregate.totalActive - prevCustomers) / prevCustomers) * 100
        : 0;
      monthOverMonth.transactionGrowth = prevTransactions > 0
        ? ((aggregate.totalCount - prevTransactions) / prevTransactions) * 100
        : 0;
    }
  }

  // Create or update monthly aggregate
  const monthlyAggregate = await MonthlyRevenueAggregate.findOneAndUpdate(
    { monthIdentifier },
    {
      year,
      month,
      monthName,
      monthStart,
      monthEnd,
      monthIdentifier,
      period: 'monthly',
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
        revenuePerCustomer,
        dailyAverageRevenue
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
      monthOverMonth,
      includedDays: Array.from(includedDays).sort(),
      includedWeeks: Array.from(includedWeeks).sort(),
      daysInMonth,
      transactionCount: transactions.length,
      generatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return monthlyAggregate;
};

/**
 * Get monthly aggregates for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Array of monthly aggregates
 */
monthlyRevenueAggregateSchema.statics.getForDateRange = async function(startDate, endDate) {
  return this.find({
    monthStart: { $gte: startDate },
    monthEnd: { $lte: endDate }
  }).sort({ monthStart: 1 });
};

/**
 * Get monthly aggregate for a specific year and month
 * @param {Number} year - Year
 * @param {Number} month - Month number (1-12)
 * @returns {Object} - Monthly aggregate or null
 */
monthlyRevenueAggregateSchema.statics.getForMonth = async function(year, month) {
  return this.findOne({
    year,
    month
  });
};

/**
 * Get monthly history for a specified number of months
 * @param {Number} monthsCount - Number of months to retrieve (default: 12)
 * @returns {Array} - Array of monthly aggregates
 */
monthlyRevenueAggregateSchema.statics.getRecentMonths = async function(monthsCount = 12) {
  const currentDate = new Date();
  const months = [];

  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1
    });
  }

  const aggregates = await this.find({
    $or: months.map(m => ({ year: m.year, month: m.month }))
  }).sort({ monthStart: -1 });

  return aggregates;
};

const MonthlyRevenueAggregate = mongoose.model('MonthlyRevenueAggregate', monthlyRevenueAggregateSchema, 'marketing_monthly_revenue_aggregates');

export default MonthlyRevenueAggregate;
