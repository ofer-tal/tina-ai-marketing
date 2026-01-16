/**
 * Analytics Metric Model
 *
 * Stores time-series metrics for dashboard analytics and reporting.
 * Aggregates metrics from multiple sources (revenue, posts, campaigns, etc.)
 *
 * Schema:
 * - metric: Name of the metric (e.g., 'mrr', 'subscribers', 'posts', 'spend')
 * - value: Numeric value of the metric
 * - dimensions: Additional context (platform, category, campaign, etc.)
 * - timestamp: When the metric was recorded
 * - source: Where the metric came from (appstore, tiktok, instagram, etc.)
 * - period: Aggregation period (daily, weekly, monthly)
 */

import mongoose from 'mongoose';

const analyticsMetricSchema = new mongoose.Schema({
  // Metric name (e.g., 'mrr', 'active_subscribers', 'posts_count', 'ad_spend')
  metric: {
    type: String,
    required: true,
    index: true
  },

  // Metric value
  value: {
    type: Number,
    required: true
  },

  // Additional dimensions for filtering/grouping
  dimensions: {
    platform: String, // tiktok, instagram, youtube_shorts
    category: String, // office_romance, dark_romance, etc.
    campaign: String, // campaign ID or name
    status: String, // posted, scheduled, etc.
    spiciness: Number, // 1, 2, 3
    channel: String, // organic, paid, social
    source: String // appstore, search_ads, social
  },

  // Timestamp for the metric
  timestamp: {
    type: Date,
    required: true,
    index: true
  },

  // Aggregation period
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily',
    index: true
  },

  // Source of the metric
  source: {
    type: String,
    required: true,
    index: true
  },

  // Metadata
  metadata: {
    date: String, // YYYY-MM-DD format for easy querying
    calculatedAt: Date // When this aggregation was calculated
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for common queries
analyticsMetricSchema.index({ metric: 1, timestamp: -1 });
analyticsMetricSchema.index({ metric: 1, period: 1, timestamp: -1 });
analyticsMetricSchema.index({ source: 1, timestamp: -1 });
analyticsMetricSchema.index({ 'metadata.date': 1, metric: 1 });

/**
 * Get metrics for a specific metric name and date range
 * @param {String} metric - Metric name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} dimensions - Optional dimension filters
 */
analyticsMetricSchema.statics.getMetrics = async function(metric, startDate, endDate, dimensions = {}) {
  const query = {
    metric,
    timestamp: { $gte: startDate, $lte: endDate }
  };

  // Add dimension filters
  if (dimensions.platform) query['dimensions.platform'] = dimensions.platform;
  if (dimensions.category) query['dimensions.category'] = dimensions.category;
  if (dimensions.campaign) query['dimensions.campaign'] = dimensions.campaign;
  if (dimensions.status) query['dimensions.status'] = dimensions.status;
  if (dimensions.channel) query['dimensions.channel'] = dimensions.channel;
  if (dimensions.source) query['dimensions.source'] = dimensions.source;

  return await this.find(query).sort({ timestamp: 1 });
};

/**
 * Get latest value for a metric
 * @param {String} metric - Metric name
 * @param {Object} dimensions - Optional dimension filters
 */
analyticsMetricSchema.statics.getLatest = async function(metric, dimensions = {}) {
  const query = { metric };

  // Add dimension filters
  if (dimensions.platform) query['dimensions.platform'] = dimensions.platform;
  if (dimensions.category) query['dimensions.category'] = dimensions.category;
  if (dimensions.campaign) query['dimensions.campaign'] = dimensions.campaign;
  if (dimensions.status) query['dimensions.status'] = dimensions.status;
  if (dimensions.channel) query['dimensions.channel'] = dimensions.channel;
  if (dimensions.source) query['dimensions.source'] = dimensions.source;

  return await this.findOne(query).sort({ timestamp: -1 });
};

/**
 * Aggregate metrics by period
 * @param {String} metric - Metric name
 * @param {String} period - Aggregation period (daily, weekly, monthly)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
analyticsMetricSchema.statics.aggregateByPeriod = async function(metric, period, startDate, endDate) {
  const groupBy = {
    daily: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
    weekly: { $dateToString: { format: '%Y-W%V', date: '$timestamp' } },
    monthly: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }
  };

  return await this.aggregate([
    {
      $match: {
        metric,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: groupBy[period],
        total: { $sum: '$value' },
        avg: { $avg: '$value' },
        min: { $min: '$value' },
        max: { $max: '$value' },
        count: { $sum: 1 },
        timestamp: { $first: '$timestamp' }
      }
    },
    {
      $sort: { timestamp: 1 }
    }
  ]);
};

/**
 * Delete metrics for a specific date range (for re-aggregation)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {String} metric - Optional metric name filter
 */
analyticsMetricSchema.statics.deleteDateRange = async function(startDate, endDate, metric = null) {
  const query = {
    timestamp: { $gte: startDate, $lte: endDate }
  };

  if (metric) query.metric = metric;

  return await this.deleteMany(query);
};

const AnalyticsMetric = mongoose.model('AnalyticsMetric', analyticsMetricSchema);

export default AnalyticsMetric;
