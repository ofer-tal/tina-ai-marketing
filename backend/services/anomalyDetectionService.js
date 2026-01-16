/**
 * Anomaly Detection Service
 *
 * Detects anomalies in performance metrics using statistical methods.
 * Supports multiple detection algorithms and alerting.
 */

import databaseService from "./database.js";
import { ObjectId } from "mongodb";

class AnomalyDetectionService {
  constructor() {
    this.db = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    this.db = await databaseService.getDatabase();
  }

  /**
   * Calculate baseline metrics from historical data
   */
  async calculateBaselineMetrics(metric, period = 30, aggregation = 'daily') {
    const cacheKey = `baseline_${metric}_${period}_${aggregation}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      await this.initialize();

      const collection = this.db.collection("analytics_metrics_timeseries");
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      // Group data by aggregation period
      const groupBy = aggregation === 'hourly' ? {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" },
        hour: { $hour: "$timestamp" }
      } : {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" }
      };

      const pipeline = [
        {
          $match: {
            metric: metric,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: groupBy,
            total: { $sum: "$value" },
            count: { $sum: 1 },
            values: { $push: "$value" }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 }
        }
      ];

      const results = await collection.aggregate(pipeline).toArray();

      // Extract values for statistical analysis
      const values = results.map(r => r.total);

      if (values.length === 0) {
        // Return mock data if no real data available
        const mockData = this.generateMockBaseline(metric, period);
        this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
        return mockData;
      }

      // Calculate statistics
      const stats = this.calculateStatistics(values);

      const baseline = {
        metric: metric,
        period: period,
        aggregation: aggregation,
        dataPoints: values.length,
        statistics: stats,
        values: values,
        timestamps: results.map(r => {
          if (aggregation === 'hourly') {
            return new Date(r._id.year, r._id.month - 1, r._id.day, r._id.hour);
          }
          return new Date(r._id.year, r._id.month - 1, r._id.day);
        }),
        calculatedAt: new Date()
      };

      this.cache.set(cacheKey, { data: baseline, timestamp: Date.now() });
      return baseline;

    } catch (error) {
      console.error(`Error calculating baseline for ${metric}:`, error);

      // Return mock data on error
      return this.generateMockBaseline(metric, period);
    }
  }

  /**
   * Calculate statistical measures
   */
  calculateStatistics(values) {
    const n = values.length;

    if (n === 0) {
      return { mean: 0, median: 0, stdDev: 0, variance: 0, min: 0, max: 0, percentile25: 0, percentile75: 0 };
    }

    // Mean
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Median
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Variance and Standard Deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Min and Max
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Percentiles
    const percentile25 = sorted[Math.floor(n * 0.25)];
    const percentile75 = sorted[Math.floor(n * 0.75)];

    // Coefficient of Variation
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

    return {
      mean,
      median,
      stdDev,
      variance,
      min,
      max,
      percentile25,
      percentile75,
      coefficientOfVariation,
      range: max - min,
      iqr: percentile75 - percentile25
    };
  }

  /**
   * Generate mock baseline data
   */
  generateMockBaseline(metric, period) {
    const mockData = {
      metric: metric,
      period: period,
      aggregation: 'daily',
      dataPoints: period,
      statistics: {},
      values: [],
      timestamps: [],
      calculatedAt: new Date(),
      isMock: true
    };

    // Generate realistic mock data based on metric type
    let baseValue, variance;
    switch (metric) {
      case 'revenue':
        baseValue = 500;
        variance = 100;
        break;
      case 'views':
        baseValue = 10000;
        variance = 2000;
        break;
      case 'engagement_rate':
        baseValue = 5;
        variance = 1;
        break;
      case 'conversions':
        baseValue = 50;
        variance = 15;
        break;
      case 'ctr':
        baseValue = 2;
        variance = 0.5;
        break;
      case 'spend':
        baseValue = 200;
        variance = 50;
        break;
      default:
        baseValue = 100;
        variance = 20;
    }

    const values = [];
    const timestamps = [];

    for (let i = 0; i < period; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (period - i));

      // Add some randomness and trends
      const trend = Math.sin(i / 7) * (variance * 0.3); // Weekly pattern
      const random = (Math.random() - 0.5) * variance * 0.5;
      const value = baseValue + trend + random;

      values.push(Math.max(0, Math.round(value * 100) / 100));
      timestamps.push(new Date(date));
    }

    mockData.values = values;
    mockData.timestamps = timestamps;
    mockData.statistics = this.calculateStatistics(values);

    return mockData;
  }

  /**
   * Monitor current metrics against baseline
   */
  async monitorMetrics(metrics = ['revenue', 'views', 'engagement_rate'], period = 30) {
    const results = [];

    for (const metric of metrics) {
      try {
        const baseline = await this.calculateBaselineMetrics(metric, period);

        // Get latest value
        const latestValue = await this.getLatestMetricValue(metric);

        // Calculate deviation
        const deviation = this.calculateDeviation(latestValue, baseline.statistics);

        results.push({
          metric: metric,
          baseline: baseline.statistics,
          currentValue: latestValue,
          deviation: deviation,
          isAnomaly: this.isAnomaly(deviation, baseline.statistics),
          timestamp: new Date()
        });

      } catch (error) {
        console.error(`Error monitoring metric ${metric}:`, error);
      }
    }

    return results;
  }

  /**
   * Get latest metric value
   */
  async getLatestMetricValue(metric) {
    try {
      await this.initialize();
      const collection = this.db.collection("analytics_metrics_timeseries");

      const latest = await collection.findOne(
        { metric: metric },
        { sort: { timestamp: -1 } }
      );

      return latest ? latest.value : 0;

    } catch (error) {
      console.error(`Error getting latest value for ${metric}:`, error);
      return 0;
    }
  }

  /**
   * Calculate deviation from baseline
   */
  calculateDeviation(value, statistics) {
    if (!statistics || statistics.mean === undefined) {
      return {
        zScore: 0,
        percentDifference: 0,
        isOutlier: false,
        distanceFromMean: 0,
        distanceFromMedian: 0
      };
    }

    const zScore = statistics.stdDev > 0
      ? (value - statistics.mean) / statistics.stdDev
      : 0;

    const percentDifference = statistics.mean > 0
      ? ((value - statistics.mean) / statistics.mean) * 100
      : 0;

    const distanceFromMean = value - statistics.mean;
    const distanceFromMedian = value - statistics.median;

    // Check if outlier using IQR method
    const iqr = statistics.iqr || 0;
    const lowerBound = statistics.percentile25 - 1.5 * iqr;
    const upperBound = statistics.percentile75 + 1.5 * iqr;
    const isOutlier = value < lowerBound || value > upperBound;

    return {
      zScore: Math.round(zScore * 100) / 100,
      percentDifference: Math.round(percentDifference * 100) / 100,
      isOutlier,
      distanceFromMean: Math.round(distanceFromMean * 100) / 100,
      distanceFromMedian: Math.round(distanceFromMedian * 100) / 100,
      lowerBound: Math.round(lowerBound * 100) / 100,
      upperBound: Math.round(upperBound * 100) / 100
    };
  }

  /**
   * Check if deviation is an anomaly
   */
  isAnomaly(deviation, statistics, threshold = 2) {
    // Z-score threshold (default: 2 standard deviations)
    if (Math.abs(deviation.zScore) > threshold) {
      return true;
    }

    // IQR method
    if (deviation.isOutlier) {
      return true;
    }

    // Percentage threshold (more than 50% deviation)
    if (Math.abs(deviation.percentDifference) > 50) {
      return true;
    }

    return false;
  }

  /**
   * Detect statistical anomalies using multiple methods
   */
  async detectAnomalies(metric, period = 30, method = 'zscore', threshold = 2) {
    try {
      const baseline = await this.calculateBaselineMetrics(metric, period);
      const anomalies = [];

      for (let i = 0; i < baseline.values.length; i++) {
        const value = baseline.values[i];
        const timestamp = baseline.timestamps[i];

        let isAnomaly = false;
        let score = 0;

        switch (method) {
          case 'zscore':
            score = (value - baseline.statistics.mean) / baseline.statistics.stdDev;
            isAnomaly = Math.abs(score) > threshold;
            break;

          case 'iqr':
            const iqr = baseline.statistics.iqr;
            const lowerBound = baseline.statistics.percentile25 - threshold * iqr;
            const upperBound = baseline.statistics.percentile75 + threshold * iqr;
            isAnomaly = value < lowerBound || value > upperBound;
            score = value < lowerBound
              ? (value - lowerBound) / iqr
              : (value - upperBound) / iqr;
            break;

          case 'isolation':
            // Simplified isolation forest concept
            const median = baseline.statistics.median;
            const mad = baseline.values.reduce((sum, val) => sum + Math.abs(val - median), 0) / baseline.values.length;
            score = (value - median) / (mad * 1.4826); // Modified Z-score
            isAnomaly = Math.abs(score) > threshold;
            break;

          case 'movingaverage':
            // Compare to moving average
            const window = 7;
            if (i >= window) {
              const recentValues = baseline.values.slice(i - window, i);
              const ma = recentValues.reduce((sum, val) => sum + val, 0) / window;
              const stdDev = Math.sqrt(recentValues.reduce((sum, val) => sum + Math.pow(val - ma, 2), 0) / window);
              score = stdDev > 0 ? (value - ma) / stdDev : 0;
              isAnomaly = Math.abs(score) > threshold;
            }
            break;
        }

        if (isAnomaly) {
          anomalies.push({
            timestamp,
            value,
            score: Math.round(score * 100) / 100,
            method: method,
            severity: this.calculateSeverity(score),
            baseline: baseline.statistics,
            deviation: this.calculateDeviation(value, baseline.statistics)
          });
        }
      }

      // Sort by severity
      anomalies.sort((a, b) => b.severity.score - a.severity.score);

      return {
        metric: metric,
        method: method,
        threshold: threshold,
        period: period,
        totalAnomalies: anomalies.length,
        anomalies: anomalies.slice(0, 20), // Return top 20
        statistics: baseline.statistics,
        detectedAt: new Date()
      };

    } catch (error) {
      console.error(`Error detecting anomalies for ${metric}:`, error);
      return {
        metric: metric,
        method: method,
        threshold: threshold,
        period: period,
        totalAnomalies: 0,
        anomalies: [],
        error: error.message,
        detectedAt: new Date()
      };
    }
  }

  /**
   * Calculate severity score for anomaly
   */
  calculateSeverity(score) {
    const absScore = Math.abs(score);

    if (absScore >= 4) {
      return { level: 'critical', score: absScore, color: '#f8312f' };
    } else if (absScore >= 3) {
      return { level: 'high', score: absScore, color: '#ff6b6b' };
    } else if (absScore >= 2) {
      return { level: 'medium', score: absScore, color: '#ffb020' };
    } else {
      return { level: 'low', score: absScore, color: '#ffd60a' };
    }
  }

  /**
   * Generate alerts for detected anomalies
   */
  async generateAlerts(anomalyResults, alertThreshold = 'medium') {
    const alerts = [];
    const thresholdLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const minLevel = thresholdLevels[alertThreshold] || 2;

    for (const result of anomalyResults) {
      for (const anomaly of result.anomalies) {
        if (thresholdLevels[anomaly.severity.level] >= minLevel) {
          alerts.push({
            id: new ObjectId().toString(),
            metric: result.metric,
            severity: anomaly.severity.level,
            score: anomaly.severity.score,
            value: anomaly.value,
            expectedRange: `${anomaly.baseline.percentile25.toFixed(2)} - ${anomaly.baseline.percentile75.toFixed(2)}`,
            deviation: anomaly.deviation.percentDifference,
            method: anomaly.method,
            timestamp: anomaly.timestamp,
            message: this.generateAlertMessage(result.metric, anomaly),
            recommendation: this.generateRecommendation(result.metric, anomaly),
            acknowledged: false,
            resolved: false,
            createdAt: new Date()
          });
        }
      }
    }

    // Sort by severity
    alerts.sort((a, b) => thresholdLevels[b.severity] - thresholdLevels[a.severity]);

    return alerts;
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(metric, anomaly) {
    const direction = anomaly.deviation.percentDifference > 0 ? 'high' : 'low';
    const percent = Math.abs(anomaly.deviation.percentDifference).toFixed(1);

    const metricNames = {
      revenue: 'Revenue',
      views: 'Views',
      engagement_rate: 'Engagement Rate',
      conversions: 'Conversions',
      ctr: 'Click-Through Rate',
      spend: 'Ad Spend'
    };

    return `${metricNames[metric] || metric} is unusually ${direction}: ${percent}% ${
      direction === 'high' ? 'above' : 'below'
    } normal (score: ${anomaly.score})`;
  }

  /**
   * Generate recommendation for anomaly
   */
  generateRecommendation(metric, anomaly) {
    const direction = anomaly.deviation.percentDifference > 0 ? 'high' : 'low';

    if (metric === 'revenue' && direction === 'low') {
      return 'Review recent campaigns, check conversion rates, and consider increasing ad spend.';
    } else if (metric === 'revenue' && direction === 'high') {
      return 'Investigate what drove the increase and consider doubling down on successful strategies.';
    } else if (metric === 'spend' && direction === 'high') {
      return 'Check if campaigns are overspending; consider pausing low-performing ads.';
    } else if (metric === 'views' && direction === 'low') {
      return 'Review content quality, posting times, and hashtag strategy.';
    } else if (metric === 'engagement_rate' && direction === 'low') {
      return 'Analyze content performance and A/B test new formats or hooks.';
    } else if (metric === 'conversions' && direction === 'low') {
      return 'Review app store listing, pricing, and conversion funnel.';
    } else {
      return 'Investigate the cause of this anomaly and take corrective action if needed.';
    }
  }

  /**
   * Provide context for investigation
   */
  async getAnomalyContext(metric, anomalyTimestamp, period = 7) {
    try {
      await this.initialize();

      const startDate = new Date(anomalyTimestamp);
      startDate.setDate(startDate.getDate() - period);

      const endDate = new Date(anomalyTimestamp);
      endDate.setDate(endDate.getDate() + period);

      const collection = this.db.collection("analytics_metrics_timeseries");

      // Get data around the anomaly
      const contextData = await collection.find({
        metric: metric,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 }).toArray();

      // Get related metrics
      const relatedMetrics = await collection.find({
        metric: { $in: ['views', 'engagement_rate', 'conversions', 'spend'] },
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 }).toArray();

      // Group related metrics by date
      const relatedByDate = {};
      for (const item of relatedMetrics) {
        const dateKey = item.timestamp.toISOString().split('T')[0];
        if (!relatedByDate[dateKey]) {
          relatedByDate[dateKey] = {};
        }
        relatedByDate[dateKey][item.metric] = item.value;
      }

      return {
        metric: metric,
        anomalyDate: anomalyTimestamp,
        period: period,
        contextData: contextData,
        relatedMetrics: relatedByDate,
        summary: {
          beforeAnomaly: contextData.filter(d => d.timestamp < anomalyTimestamp),
          afterAnomaly: contextData.filter(d => d.timestamp > anomalyTimestamp),
          trend: this.calculateTrend(contextData)
        },
        retrievedAt: new Date()
      };

    } catch (error) {
      console.error(`Error getting context for ${metric}:`, error);
      return {
        metric: metric,
        anomalyDate: anomalyTimestamp,
        period: period,
        contextData: [],
        relatedMetrics: {},
        error: error.message,
        retrievedAt: new Date()
      };
    }
  }

  /**
   * Calculate trend from data
   */
  calculateTrend(data) {
    if (data.length < 2) {
      return { direction: 'unknown', change: 0 };
    }

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;

    let direction = 'stable';
    if (change > 5) {
      direction = 'increasing';
    } else if (change < -5) {
      direction = 'decreasing';
    }

    return {
      direction,
      change: Math.round(change * 100) / 100,
      firstValue,
      lastValue
    };
  }

  /**
   * Get comprehensive anomaly report
   */
  async getAnomalyReport(metrics = ['revenue', 'views', 'engagement_rate'], period = 30) {
    try {
      const report = {
        generatedAt: new Date(),
        period: period,
        metrics: metrics,
        summary: {
          totalAnomalies: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0
        },
        anomaliesByMetric: {},
        alerts: [],
        insights: [],
        recommendations: []
      };

      // Detect anomalies for each metric
      for (const metric of metrics) {
        const result = await this.detectAnomalies(metric, period, 'zscore', 2);
        report.anomaliesByMetric[metric] = result;
        report.summary.totalAnomalies += result.totalAnomalies;

        // Count by severity
        for (const anomaly of result.anomalies) {
          switch (anomaly.severity.level) {
            case 'critical':
              report.summary.criticalCount++;
              break;
            case 'high':
              report.summary.highCount++;
              break;
            case 'medium':
              report.summary.mediumCount++;
              break;
            case 'low':
              report.severityLowCount++;
              break;
          }
        }
      }

      // Generate alerts
      const alertResults = Object.values(report.anomaliesByMetric);
      report.alerts = await this.generateAlerts(alertResults, 'medium');

      // Generate insights
      report.insights = this.generateReportInsights(report);

      // Generate recommendations
      report.recommendations = this.generateReportRecommendations(report);

      return report;

    } catch (error) {
      console.error('Error generating anomaly report:', error);
      return {
        generatedAt: new Date(),
        period: period,
        metrics: metrics,
        error: error.message
      };
    }
  }

  /**
   * Generate insights from anomaly report
   */
  generateReportInsights(report) {
    const insights = [];

    // Most problematic metric
    let maxAnomalies = 0;
    let worstMetric = null;
    for (const [metric, data] of Object.entries(report.anomaliesByMetric)) {
      if (data.totalAnomalies > maxAnomalies) {
        maxAnomalies = data.totalAnomalies;
        worstMetric = metric;
      }
    }

    if (worstMetric && maxAnomalies > 0) {
      insights.push({
        priority: 'high',
        metric: worstMetric,
        message: `${worstMetric} has the most anomalies (${maxAnomalies} in ${report.period} days)`,
        impact: 'high'
      });
    }

    // Recent critical anomalies
    const recentCritical = report.alerts.filter(a =>
      a.severity === 'critical' && !a.acknowledged
    );

    if (recentCritical.length > 0) {
      insights.push({
        priority: 'critical',
        message: `${recentCritical.length} unacknowledged critical anomalies require immediate attention`,
        impact: 'critical'
      });
    }

    // Positive anomalies (opportunities)
    const positiveAnomalies = report.alerts.filter(a =>
      a.deviation > 50 && a.severity !== 'critical'
    );

    if (positiveAnomalies.length > 0) {
      insights.push({
        priority: 'medium',
        message: `${positiveAnomalies.length} positive anomalies detected - investigate what's working`,
        impact: 'positive'
      });
    }

    return insights;
  }

  /**
   * Generate recommendations from anomaly report
   */
  generateReportRecommendations(report) {
    const recommendations = [];

    // If critical anomalies exist
    if (report.summary.criticalCount > 0) {
      recommendations.push({
        action: 'Investigate critical anomalies immediately',
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        metric: 'all'
      });
    }

    // If revenue anomalies
    if (report.anomaliesByMetric.revenue?.totalAnomalies > 0) {
      recommendations.push({
        action: 'Review revenue anomalies and adjust marketing strategy',
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        metric: 'revenue'
      });
    }

    // If engagement anomalies
    if (report.anomaliesByMetric.engagement_rate?.totalAnomalies > 0) {
      recommendations.push({
        action: 'A/B test new content formats to improve engagement',
        priority: 'medium',
        impact: 'medium',
        effort: 'low',
        metric: 'engagement_rate'
      });
    }

    return recommendations;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new AnomalyDetectionService();
