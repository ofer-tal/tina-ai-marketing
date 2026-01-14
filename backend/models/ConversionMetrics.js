/**
 * Conversion Metrics Model
 *
 * Tracks App Store conversion rates from impressions to downloads.
 * Stores daily conversion metrics with funnel breakdown.
 *
 * Schema:
 * - date: Date of the metrics
 * - period: daily, weekly, monthly aggregation
 * - impressions: App Store impressions (app appeared in search/browse)
 * - productPageViews: Users who viewed the app product page
 * - downloads: App units (downloads)
 * - installs: Users who completed installation
 * - accountSignups: Users who created an account
 * - trialActivations: Users who started free trial
 * - paidSubscriptions: Users who converted to paid
 * - conversionRates: Object with rate calculations at each funnel stage
 * - previousMetrics: Comparison to previous period
 * - metadata: Additional context (source, campaign, etc.)
 */

import mongoose from 'mongoose';

const conversionMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true,
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
    required: true,
  },

  // Funnel metrics
  impressions: {
    type: Number,
    default: 0,
    description: 'App Store impressions (times app appeared in search or browse)',
  },
  productPageViews: {
    type: Number,
    default: 0,
    description: 'Users who viewed the app product page',
  },
  downloads: {
    type: Number,
    default: 0,
    description: 'App units (downloads)',
  },
  installs: {
    type: Number,
    default: 0,
    description: 'Users who completed installation',
  },
  accountSignups: {
    type: Number,
    default: 0,
    description: 'Users who created an account',
  },
  trialActivations: {
    type: Number,
    default: 0,
    description: 'Users who started free trial',
  },
  paidSubscriptions: {
    type: Number,
    default: 0,
    description: 'Users who converted to paid subscription',
  },

  // Conversion rates at each stage
  conversionRates: {
    impressionsToProductPage: {
      type: Number,
      default: 0,
      description: 'Conversion rate from impressions to product page views',
    },
    productPageToDownload: {
      type: Number,
      default: 0,
      description: 'Conversion rate from product page views to downloads',
    },
    downloadToInstall: {
      type: Number,
      default: 0,
      description: 'Conversion rate from downloads to installs',
    },
    installToSignup: {
      type: Number,
      default: 0,
      description: 'Conversion rate from installs to account signups',
    },
    signupToTrial: {
      type: Number,
      default: 0,
      description: 'Conversion rate from signups to trial activations',
    },
    trialToPaid: {
      type: Number,
      default: 0,
      description: 'Conversion rate from trials to paid subscriptions',
    },
    overallConversionRate: {
      type: Number,
      default: 0,
      description: 'Overall conversion rate from impressions to paid subscriptions',
    },
  },

  // Comparison to previous period
  previousMetrics: {
    period: {
      type: String,
      description: 'Previous period type (daily, weekly, monthly)',
    },
    date: {
      type: Date,
      description: 'Previous period date',
    },
    change: {
      impressions: { type: Number, default: 0 },
      productPageViews: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      installs: { type: Number, default: 0 },
      accountSignups: { type: Number, default: 0 },
      trialActivations: { type: Number, default: 0 },
      paidSubscriptions: { type: Number, default: 0 },
      overallConversionRate: { type: Number, default: 0 },
    },
    percentChange: {
      impressions: { type: Number, default: 0 },
      productPageViews: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      installs: { type: Number, default: 0 },
      accountSignups: { type: Number, default: 0 },
      trialActivations: { type: Number, default: 0 },
      paidSubscriptions: { type: Number, default: 0 },
      overallConversionRate: { type: Number, default: 0 },
    },
  },

  // Additional metadata
  metadata: {
    source: {
      type: String,
      description: 'Data source (App Store Connect, analytics, etc.)',
    },
    appId: {
      type: String,
      description: 'App Store app ID',
    },
    campaign: {
      type: String,
      description: 'Associated marketing campaign (if applicable)',
    },
    platform: {
      type: String,
      description: 'Platform (iOS, Android, etc.)',
    },
    category: {
      type: String,
      description: 'App category for segmentation',
    },
  },

  // Data quality and validation
  dataQuality: {
    isEstimated: {
      type: Boolean,
      default: false,
    },
    estimatedFields: [{
      type: String,
      description: 'List of fields that are estimated rather than actual',
    }],
    completeness: {
      type: Number,
      default: 100,
      description: 'Percentage of complete data (0-100)',
    },
  },

  calculatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient queries
conversionMetricsSchema.index({ date: -1, period: 1 });
conversionMetricsSchema.index({ period: 1, date: -1 });
conversionMetricsSchema.index({ 'metadata.source': 1 });
conversionMetricsSchema.index({ 'metadata.appId': 1 });

/**
 * Calculate conversion rates from funnel metrics
 */
conversionMetricsSchema.methods.calculateConversionRates = function() {
  const metrics = this;

  // Impressions to Product Page Views
  if (metrics.impressions > 0) {
    metrics.conversionRates.impressionsToProductPage =
      (metrics.productPageViews / metrics.impressions) * 100;
  }

  // Product Page Views to Downloads
  if (metrics.productPageViews > 0) {
    metrics.conversionRates.productPageToDownload =
      (metrics.downloads / metrics.productPageViews) * 100;
  }

  // Downloads to Installs
  if (metrics.downloads > 0) {
    metrics.conversionRates.downloadToInstall =
      (metrics.installs / metrics.downloads) * 100;
  }

  // Installs to Signups
  if (metrics.installs > 0) {
    metrics.conversionRates.installToSignup =
      (metrics.accountSignups / metrics.installs) * 100;
  }

  // Signups to Trials
  if (metrics.accountSignups > 0) {
    metrics.conversionRates.signupToTrial =
      (metrics.trialActivations / metrics.accountSignups) * 100;
  }

  // Trials to Paid
  if (metrics.trialActivations > 0) {
    metrics.conversionRates.trialToPaid =
      (metrics.paidSubscriptions / metrics.trialActivations) * 100;
  }

  // Overall Conversion Rate (Impressions to Paid)
  if (metrics.impressions > 0) {
    metrics.conversionRates.overallConversionRate =
      (metrics.paidSubscriptions / metrics.impressions) * 100;
  }

  return metrics.conversionRates;
};

/**
 * Compare with previous period metrics
 */
conversionMetricsSchema.methods.compareToPrevious = function(previousMetrics) {
  if (!previousMetrics) {
    return this.previousMetrics;
  }

  const current = this;
  const comparison = {
    period: previousMetrics.period,
    date: previousMetrics.date,
    change: {},
    percentChange: {},
  };

  // Calculate absolute and percentage changes
  const fields = [
    'impressions',
    'productPageViews',
    'downloads',
    'installs',
    'accountSignups',
    'trialActivations',
    'paidSubscriptions',
  ];

  fields.forEach(field => {
    comparison.change[field] = current[field] - previousMetrics[field];

    if (previousMetrics[field] !== 0) {
      comparison.percentChange[field] =
        ((current[field] - previousMetrics[field]) / previousMetrics[field]) * 100;
    } else {
      comparison.percentChange[field] = current[field] > 0 ? 100 : 0;
    }
  });

  // Overall conversion rate change
  comparison.change.overallConversionRate =
    current.conversionRates.overallConversionRate -
    previousMetrics.conversionRates.overallConversionRate;

  if (previousMetrics.conversionRates.overallConversionRate !== 0) {
    comparison.percentChange.overallConversionRate =
      ((current.conversionRates.overallConversionRate -
        previousMetrics.conversionRates.overallConversionRate) /
        previousMetrics.conversionRates.overallConversionRate) * 100;
  }

  this.previousMetrics = comparison;
  return comparison;
};

/**
 * Get funnel dropoff at each stage
 */
conversionMetricsSchema.methods.getFunnelDropoff = function() {
  const metrics = this;
  const dropoff = {};

  // Dropoff from Impressions to Product Page Views
  if (metrics.impressions > 0) {
    dropoff.impressionsToProductPage = {
      count: metrics.impressions - metrics.productPageViews,
      percentage: ((metrics.impressions - metrics.productPageViews) / metrics.impressions) * 100,
    };
  }

  // Dropoff from Product Page Views to Downloads
  if (metrics.productPageViews > 0) {
    dropoff.productPageToDownload = {
      count: metrics.productPageViews - metrics.downloads,
      percentage: ((metrics.productPageViews - metrics.downloads) / metrics.productPageViews) * 100,
    };
  }

  // Dropoff from Downloads to Installs
  if (metrics.downloads > 0) {
    dropoff.downloadToInstall = {
      count: metrics.downloads - metrics.installs,
      percentage: ((metrics.downloads - metrics.installs) / metrics.downloads) * 100,
    };
  }

  // Dropoff from Installs to Signups
  if (metrics.installs > 0) {
    dropoff.installToSignup = {
      count: metrics.installs - metrics.accountSignups,
      percentage: ((metrics.installs - metrics.accountSignups) / metrics.installs) * 100,
    };
  }

  // Dropoff from Signups to Trials
  if (metrics.accountSignups > 0) {
    dropoff.signupToTrial = {
      count: metrics.accountSignups - metrics.trialActivations,
      percentage: ((metrics.accountSignups - metrics.trialActivations) / metrics.accountSignups) * 100,
    };
  }

  // Dropoff from Trials to Paid
  if (metrics.trialActivations > 0) {
    dropoff.trialToPaid = {
      count: metrics.trialActivations - metrics.paidSubscriptions,
      percentage: ((metrics.trialActivations - metrics.paidSubscriptions) / metrics.trialActivations) * 100,
    };
  }

  return dropoff;
};

/**
 * Identify biggest dropoff point in funnel
 */
conversionMetricsSchema.methods.getBiggestDropoff = function() {
  const dropoff = this.getFunnelDropoff();
  let biggest = null;
  let maxPercentage = 0;

  Object.keys(dropoff).forEach(stage => {
    if (dropoff[stage].percentage > maxPercentage) {
      maxPercentage = dropoff[stage].percentage;
      biggest = {
        stage,
        ...dropoff[stage],
      };
    }
  });

  return biggest;
};

// Update the updatedAt timestamp before saving
conversionMetricsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const ConversionMetrics = mongoose.model('ConversionMetrics', conversionMetricsSchema);

export default ConversionMetrics;
