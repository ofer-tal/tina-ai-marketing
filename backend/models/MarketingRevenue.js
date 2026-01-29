import mongoose from 'mongoose';

/**
 * Marketing Revenue Attribution Model
 * Tracks revenue attributed to marketing campaigns and channels
 */
const marketingRevenueSchema = new mongoose.Schema({
  // Transaction identifier
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Attribution details
  attributedTo: {
    campaignId: {
      type: String,
      index: true
    },
    campaignName: String,
    adGroupId: String,
    adGroupName: String,
    keywordId: String,
    keywordText: String,
    channel: {
      type: String,
      enum: ['organic', 'apple_search_ads', 'tiktok_ads', 'instagram_ads', 'google_ads', 'referral', 'direct'],
      index: true
    }
  },

  // Revenue details
  revenue: {
    grossAmount: {
      type: Number,
      required: true
    },
    appleFee: {
      type: Number,
      default: 0.15 // 15% Apple fee
    },
    appleFeeAmount: {
      type: Number,
      required: true
    },
    netAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },

  // Transaction details
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },

  // Attribution window (days from ad click to conversion)
  attributionWindow: {
    type: Number,
    default: 7
  },

  // Touchpoint data (when user interacted with ad)
  touchpointDate: {
    type: Date,
    index: true
  },

  // Customer details (for LTV calculation)
  customer: {
    new: {
      type: Boolean,
      default: true
    },
    subscriptionType: {
      type: String,
      enum: ['trial', 'monthly', 'annual', 'lifetime']
    },
    subscriptionId: String
  },

  // Attribution confidence
  attributionConfidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },

  // Metadata
  metadata: {
    source: String,
    appVersion: String,
    region: String,
    deviceType: String
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

// Indexes for efficient queries
marketingRevenueSchema.index({ transactionDate: -1 });
marketingRevenueSchema.index({ attributedTo: { campaignId: 1, channel: 1 } });
marketingRevenueSchema.index({ channel: 1, transactionDate: -1 });
marketingRevenueSchema.index({ 'customer.new': 1, transactionDate: -1 });

// Static methods for revenue aggregation
marketingRevenueSchema.statics.getTotalRevenue = async function(startDate, endDate, filters = {}) {
  const query = {
    transactionDate: { $gte: startDate, $lte: endDate }
  };

  if (filters.channel) query.attributedTo.channel = filters.channel;
  if (filters.campaignId) query['attributedTo.campaignId'] = filters.campaignId;
  if (filters.newCustomer !== undefined) query['customer.new'] = filters.newCustomer;

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        grossRevenue: { $sum: '$revenue.grossAmount' },
        appleFees: { $sum: '$revenue.appleFeeAmount' },
        netRevenue: { $sum: '$revenue.netAmount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  return result[0] || { grossRevenue: 0, appleFees: 0, netRevenue: 0, transactionCount: 0 };
};

marketingRevenueSchema.statics.getRevenueByCampaign = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        transactionDate: { $gte: startDate, $lte: endDate },
        'attributedTo.campaignId': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          campaignId: '$attributedTo.campaignId',
          campaignName: '$attributedTo.campaignName'
        },
        grossRevenue: { $sum: '$revenue.grossAmount' },
        appleFees: { $sum: '$revenue.appleFeeAmount' },
        netRevenue: { $sum: '$revenue.netAmount' },
        transactionCount: { $sum: 1 },
        newCustomerRevenue: {
          $sum: {
            $cond: ['$customer.new', '$revenue.netAmount', 0]
          }
        }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
};

marketingRevenueSchema.statics.getRevenueByChannel = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        transactionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$attributedTo.channel',
        grossRevenue: { $sum: '$revenue.grossAmount' },
        appleFees: { $sum: '$revenue.appleFeeAmount' },
        netRevenue: { $sum: '$revenue.netAmount' },
        transactionCount: { $sum: 1 },
        newCustomerRevenue: {
          $sum: {
            $cond: ['$customer.new', '$revenue.netAmount', 0]
          }
        }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
};

marketingRevenueSchema.statics.getDailyRevenue = async function(startDate, endDate, channel = null) {
  const match = {
    transactionDate: { $gte: startDate, $lte: endDate }
  };

  if (channel) {
    match['attributedTo.channel'] = channel;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' }
        },
        grossRevenue: { $sum: '$revenue.grossAmount' },
        appleFees: { $sum: '$revenue.appleFeeAmount' },
        netRevenue: { $sum: '$revenue.netAmount' },
        transactionCount: { $sum: 1 },
        newCustomerCount: {
          $sum: {
            $cond: ['$customer.new', 1, 0]
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

marketingRevenueSchema.statics.getRevenueROI = async function(campaignId) {
  const revenueData = await this.aggregate([
    {
      $match: {
        'attributedTo.campaignId': campaignId
      }
    },
    {
      $group: {
        _id: '$attributedTo.campaignId',
        attributedGrossRevenue: { $sum: '$revenue.grossAmount' },
        attributedNetRevenue: { $sum: '$revenue.netAmount' },
        conversions: { $sum: 1 }
      }
    }
  ]);

  if (revenueData.length === 0) {
    return { attributedGrossRevenue: 0, attributedNetRevenue: 0, conversions: 0, roi: null };
  }

  // Note: Spend needs to be fetched from campaign data
  return {
    attributedGrossRevenue: revenueData[0].attributedGrossRevenue,
    attributedNetRevenue: revenueData[0].attributedNetRevenue,
    conversions: revenueData[0].conversions
  };
};

marketingRevenueSchema.statics.getMonthlyNetRevenue = async function(year, month) {
  // Create date range for the specified month
  const startDate = new Date(year, month - 1, 1); // month is 1-indexed (1 = January)
  const endDate = new Date(year, month, 1); // First day of next month

  return this.aggregate([
    {
      $match: {
        transactionDate: { $gte: startDate, $lt: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$transactionDate' },
          month: { $month: '$transactionDate' }
        },
        grossRevenue: { $sum: '$revenue.grossAmount' },
        appleFees: { $sum: '$revenue.appleFeeAmount' },
        netRevenue: { $sum: '$revenue.netAmount' },
        transactionCount: { $sum: 1 },
        newCustomerCount: {
          $sum: {
            $cond: ['$customer.new', 1, 0]
          }
        },
        returningCustomerCount: {
          $sum: {
            $cond: ['$customer.new', 0, 1]
          }
        },
        subscriptionRevenue: {
          $sum: {
            $cond: [
              { $in: ['$customer.subscriptionType', ['monthly', 'annual', 'lifetime']] },
              '$revenue.netAmount',
              0
            ]
          }
        },
        oneTimePurchaseRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$customer.subscriptionType', 'trial'] },
              '$revenue.netAmount',
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        grossRevenue: 1,
        appleFees: 1,
        netRevenue: 1,
        transactionCount: 1,
        newCustomerCount: 1,
        returningCustomerCount: 1,
        subscriptionRevenue: 1,
        oneTimePurchaseRevenue: 1,
        averageRevenuePerTransaction: { $divide: ['$netRevenue', '$transactionCount'] }
      }
    }
  ]);
};

marketingRevenueSchema.statics.getMonthlyNetRevenueHistory = async function(months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        transactionDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$transactionDate' },
          month: { $month: '$transactionDate' }
        },
        grossRevenue: { $sum: '$revenue.grossAmount' },
        appleFees: { $sum: '$revenue.appleFeeAmount' },
        netRevenue: { $sum: '$revenue.netAmount' },
        transactionCount: { $sum: 1 },
        newCustomerCount: {
          $sum: {
            $cond: ['$customer.new', 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        grossRevenue: 1,
        appleFees: 1,
        netRevenue: 1,
        transactionCount: 1,
        newCustomerCount: 1
      }
    },
    {
      $sort: { year: 1, month: 1 }
    }
  ]);
};

/**
 * Get new customer count for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Number} New customer count
 */
marketingRevenueSchema.statics.getNewCustomerCount = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        transactionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalNewCustomers: { $sum: { $cond: ['$customer.new', 1, 0] } }
      }
    }
  ]);

  return result[0]?.totalNewCustomers || 0;
};

// Instance method to calculate ROAS
marketingRevenueSchema.methods.calculateROAS = function(spend) {
  if (!spend || spend === 0) return null;
  return (this.revenue.netAmount / spend).toFixed(2);
};

// Update timestamp on save
marketingRevenueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MarketingRevenue = mongoose.model('MarketingRevenue', marketingRevenueSchema, 'marketing_revenues');

export default MarketingRevenue;
