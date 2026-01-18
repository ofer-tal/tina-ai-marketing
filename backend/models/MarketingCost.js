import mongoose from 'mongoose';

/**
 * Marketing Cost Model
 * Tracks marketing costs including cloud services, API services, and ad spend
 */
const marketingCostSchema = new mongoose.Schema({
  // Date identifier
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },

  // Date object for range queries
  dateObj: {
    type: Date,
    required: true,
    index: true
  },

  // Cost breakdown
  costs: {
    // Cloud service costs (AWS, MongoDB Atlas, etc.)
    cloudServices: {
      amount: {
        type: Number,
        default: 0
      },
      breakdown: [{
        service: String, // e.g., 'AWS', 'MongoDB Atlas', 'Heroku'
        cost: Number,
        description: String
      }]
    },

    // API service costs (Fal.ai, RunPod, OpenAI, etc.)
    apiServices: {
      amount: {
        type: Number,
        default: 0
      },
      breakdown: [{
        service: String, // e.g., 'Fal.ai', 'RunPod', 'GLM-4.7'
        cost: Number,
        usageUnits: Number, // e.g., API calls, GPU hours
        description: String
      }]
    },

    // Ad spend (Apple Search Ads, TikTok Ads, etc.)
    adSpend: {
      amount: {
        type: Number,
        default: 0
      },
      breakdown: [{
        channel: String, // e.g., 'apple_search_ads', 'tiktok_ads'
        campaignId: String,
        campaignName: String,
        cost: Number,
        impressions: Number,
        clicks: Number
      }]
    },

    // Other marketing costs (tools, software, etc.)
    other: {
      amount: {
        type: Number,
        default: 0
      },
      breakdown: [{
        category: String,
        description: String,
        cost: Number
      }]
    }
  },

  // Total cost (calculated field)
  totalCost: {
    type: Number,
    default: 0
  },

  // Percentage of revenue (if revenue data available)
  percentageOfRevenue: {
    type: Number,
    default: 0
  },

  // Budget information
  budget: {
    allocated: {
      type: Number,
      default: 0
    },
    remaining: {
      type: Number,
      default: 0
    },
    utilized: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      default: 'manual' // 'manual', 'api', 'calculated'
    },
    calculatedAt: Date,
    notes: String
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

// Indexes
marketingCostSchema.index({ date: -1 });
marketingCostSchema.index({ dateObj: -1 });

/**
 * Static method: Calculate marketing costs as percentage of revenue
 * This implements the 10% rule for cloud/API costs
 */
marketingCostSchema.statics.calculateCostsFromRevenue = async function(dateObj, revenueData) {
  const dateStr = dateObj.toISOString().split('T')[0];

  // Calculate cloud/API costs as 10% of net revenue
  const netRevenue = revenueData?.netRevenue || 0;
  const cloudApiCost = netRevenue * 0.10; // 10% for cloud/API

  // Create or update cost record
  const costData = {
    date: dateStr,
    dateObj: dateObj,
    costs: {
      cloudServices: {
        amount: cloudApiCost * 0.6, // 60% of 10% = 6% for cloud
        breakdown: [{
          service: 'MongoDB Atlas',
          cost: cloudApiCost * 0.3,
          description: 'Database hosting'
        }, {
          service: 'AWS/Azure',
          cost: cloudApiCost * 0.3,
          description: 'Application hosting'
        }]
      },
      apiServices: {
        amount: cloudApiCost * 0.4, // 40% of 10% = 4% for APIs
        breakdown: [{
          service: 'Fal.ai',
          cost: cloudApiCost * 0.15,
          usageUnits: 0,
          description: 'Image/Video generation'
        }, {
          service: 'RunPod',
          cost: cloudApiCost * 0.15,
          usageUnits: 0,
          description: 'Video processing'
        }, {
          service: 'GLM-4.7',
          cost: cloudApiCost * 0.10,
          usageUnits: 0,
          description: 'Content generation AI'
        }]
      },
      adSpend: {
        amount: 0,
        breakdown: []
      },
      other: {
        amount: 0,
        breakdown: []
      }
    },
    totalCost: cloudApiCost,
    percentageOfRevenue: netRevenue > 0 ? ((cloudApiCost / netRevenue) * 100) : 0,
    metadata: {
      source: 'calculated',
      calculatedAt: new Date(),
      notes: 'Calculated as 10% of net revenue (6% cloud + 4% API services)'
    }
  };

  // Upsert the cost record
  const cost = await this.findOneAndUpdate(
    { date: dateStr },
    costData,
    { upsert: true, new: true }
  );

  return cost;
};

/**
 * Static method: Get costs for a date range
 */
marketingCostSchema.statics.getForDateRange = async function(startDate, endDate) {
  return this.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: 1 });
};

/**
 * Static method: Get total costs for a period
 */
marketingCostSchema.statics.getTotalCosts = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        dateObj: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$totalCost' },
        cloudServices: { $sum: '$costs.cloudServices.amount' },
        apiServices: { $sum: '$costs.apiServices.amount' },
        adSpend: { $sum: '$costs.adSpend.amount' },
        other: { $sum: '$costs.other.amount' },
        recordCount: { $sum: 1 }
      }
    }
  ]);

  return result[0] || {
    totalCost: 0,
    cloudServices: 0,
    apiServices: 0,
    adSpend: 0,
    other: 0,
    recordCount: 0
  };
};

/**
 * Static method: Get costs for a specific date
 */
marketingCostSchema.statics.getForDate = async function(dateObj) {
  const dateStr = dateObj.toISOString().split('T')[0];
  return this.findOne({ date: dateStr });
};

// Update timestamp on save
marketingCostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MarketingCost = mongoose.model('MarketingCost', marketingCostSchema);

export default MarketingCost;
