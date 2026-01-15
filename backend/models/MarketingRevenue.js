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
    amount: {
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
        totalRevenue: { $sum: '$revenue.amount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  return result[0] || { totalRevenue: 0, transactionCount: 0 };
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
        totalRevenue: { $sum: '$revenue.amount' },
        transactionCount: { $sum: 1 },
        newCustomerRevenue: {
          $sum: {
            $cond: ['$customer.new', '$revenue.amount', 0]
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
        totalRevenue: { $sum: '$revenue.amount' },
        transactionCount: { $sum: 1 },
        newCustomerRevenue: {
          $sum: {
            $cond: ['$customer.new', '$revenue.amount', 0]
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
        totalRevenue: { $sum: '$revenue.amount' },
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
        attributedRevenue: { $sum: '$revenue.amount' },
        conversions: { $sum: 1 }
      }
    }
  ]);

  if (revenueData.length === 0) {
    return { attributedRevenue: 0, conversions: 0, roi: null };
  }

  // Note: Spend needs to be fetched from campaign data
  return {
    attributedRevenue: revenueData[0].attributedRevenue,
    conversions: revenueData[0].conversions
  };
};

// Instance method to calculate ROAS
marketingRevenueSchema.methods.calculateROAS = function(spend) {
  if (!spend || spend === 0) return null;
  return (this.revenue.amount / spend).toFixed(2);
};

// Update timestamp on save
marketingRevenueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MarketingRevenue = mongoose.model('MarketingRevenue', marketingRevenueSchema);

export default MarketingRevenue;
