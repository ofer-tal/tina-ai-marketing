/**
 * Lifetime Value (LTV) Modeling Service
 *
 * Analyzes historical customer revenue data to build predictive LTV models
 * Segments customers by type and calculates/predicts LTV for each segment
 */

import mongoose from 'mongoose';

// Import models
import AppUser from '../models/AppUser.js';
import MarketingRevenue from '../models/MarketingRevenue.js';

class LTVModelingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    this.model = null; // Trained predictive model
  }

  /**
   * Step 1: Analyze historical LTV data
   * Calculate actual lifetime value for churned customers
   * Build dataset for model training
   */
  async analyzeHistoricalLTVData(options = {}) {
    const cacheKey = `historical_ltv_${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const {
        minTransactions = 1,
        churnedOnly = true,
        lookbackDays = 365
      } = options;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      // Aggregate revenue by customer
      const revenueByCustomer = await MarketingRevenue.aggregate([
        {
          $match: {
            transactionDate: { $gte: cutoffDate },
            'customer.userId': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$customer.userId',
            totalRevenue: { $sum: '$revenue.netAmount' },
            transactionCount: { $sum: 1 },
            firstTransaction: { $min: '$transactionDate' },
            lastTransaction: { $max: '$transactionDate' },
            channels: { $addToSet: '$attributedTo.channel' },
            isNewCustomer: { $first: '$customer.new' },
            acquisitionChannel: { $first: '$attributedTo.channel' },
            subscriptionType: { $first: '$customer.subscriptionType' }
          }
        },
        {
          $match: {
            transactionCount: { $gte: minTransactions }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        }
      ]);

      // Calculate customer lifetime (days between first and last transaction)
      const customersWithLTV = revenueByCustomer.map(customer => {
        const lifetimeDays = Math.ceil(
          (customer.lastTransaction - customer.firstTransaction) / (1000 * 60 * 60 * 24)
        );

        // Calculate monthly LTV (lifetime revenue / months active)
        const lifetimeMonths = Math.max(lifetimeDays / 30, 1);
        const monthlyLTV = customer.totalRevenue / lifetimeMonths;

        return {
          userId: customer._id,
          totalRevenue: customer.totalRevenue,
          transactionCount: customer.transactionCount,
          lifetimeDays,
          lifetimeMonths,
          monthlyLTV,
          avgTransactionValue: customer.totalRevenue / customer.transactionCount,
          firstTransaction: customer.firstTransaction,
          lastTransaction: customer.lastTransaction,
          channels: customer.channels,
          isNewCustomer: customer.isNewCustomer,
          acquisitionChannel: customer.acquisitionChannel,
          subscriptionType: customer.subscriptionType || 'unknown'
        };
      });

      // Calculate statistics
      const totalCustomers = customersWithLTV.length;
      const totalRevenue = customersWithLTV.reduce((sum, c) => sum + c.totalRevenue, 0);
      const avgLTV = totalRevenue / totalCustomers;
      const medianLTV = this.calculateMedian(customersWithLTV.map(c => c.totalRevenue));

      const ltvDistribution = {
        p10: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 10),
        p25: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 25),
        p50: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 50),
        p75: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 75),
        p90: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 90),
        p95: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 95),
        p99: this.calculatePercentile(customersWithLTV.map(c => c.totalRevenue), 99)
      };

      const result = {
        customers: customersWithLTV,
        statistics: {
          totalCustomers,
          totalRevenue,
          avgLTV,
          medianLTV,
          ltvDistribution
        },
        generatedAt: new Date()
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Error analyzing historical LTV data:', error);
      throw new Error(`Failed to analyze LTV data: ${error.message}`);
    }
  }

  /**
   * Step 2: Segment by customer type
   * Group customers into meaningful segments based on behavior and attributes
   */
  async segmentCustomersByType(segments = ['acquisitionChannel', 'subscriptionType', 'isNewCustomer']) {
    const cacheKey = `customer_segments_${JSON.stringify(segments)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get historical LTV data
      const ltvData = await this.analyzeHistoricalLTVData();

      // Segment customers
      const segmentGroups = {};

      ltvData.customers.forEach(customer => {
        // Create segment key based on specified segments
        const segmentKey = segments.map(segment => {
          const value = customer[segment];
          return value || 'unknown';
        }).join('|');

        if (!segmentGroups[segmentKey]) {
          segmentGroups[segmentKey] = {
            key: segmentKey,
            criteria: {},
            customers: [],
            totalRevenue: 0,
            totalTransactions: 0,
            totalLifetimeDays: 0
          };

          // Build criteria object
          segments.forEach(segment => {
            const value = customer[segment];
            segmentGroups[segmentKey].criteria[segment] = value || 'unknown';
          });
        }

        segmentGroups[segmentKey].customers.push(customer);
        segmentGroups[segmentKey].totalRevenue += customer.totalRevenue;
        segmentGroups[segmentKey].totalTransactions += customer.transactionCount;
        segmentGroups[segmentKey].totalLifetimeDays += customer.lifetimeDays;
      });

      // Calculate segment statistics
      const segmentAnalysis = Object.values(segmentGroups).map(segment => {
        const customerCount = segment.customers.length;
        const avgLTV = segment.totalRevenue / customerCount;
        const avgTransactionValue = segment.totalRevenue / segment.totalTransactions;
        const avgLifetimeDays = segment.totalLifetimeDays / customerCount;

        // Calculate LTV range for this segment
        const ltvValues = segment.customers.map(c => c.totalRevenue);
        const ltvRange = {
          min: Math.min(...ltvValues),
          max: Math.max(...ltvValues),
          median: this.calculateMedian(ltvValues)
        };

        return {
          ...segment,
          customerCount,
          avgLTV,
          avgTransactionValue,
          avgLifetimeDays,
          avgLifetimeMonths: avgLifetimeDays / 30,
          ltvRange,
          shareOfTotalRevenue: segment.totalRevenue / ltvData.statistics.totalRevenue
        };
      });

      // Sort by average LTV descending
      segmentAnalysis.sort((a, b) => b.avgLTV - a.avgLTV);

      const result = {
        segments: segmentAnalysis,
        totalSegments: segmentAnalysis.length,
        generatedAt: new Date()
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Error segmenting customers:', error);
      throw new Error(`Failed to segment customers: ${error.message}`);
    }
  }

  /**
   * Step 3: Calculate average LTV per segment
   * Detailed analysis with confidence intervals
   */
  async calculateAverageLTVPerSegment(segmentBy = 'acquisitionChannel') {
    const cacheKey = `avg_ltv_segment_${segmentBy}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get segmented data
      const segmentedData = await this.segmentCustomersByType([segmentBy]);

      // Calculate detailed statistics for each segment
      const segmentLTVDetails = await Promise.all(
        segmentedData.segments.map(async segment => {
          const ltvValues = segment.customers.map(c => c.totalRevenue);

          // Calculate confidence interval (95%)
          const mean = segment.avgLTV;
          const stdDev = this.calculateStandardDeviation(ltvValues);
          const marginOfError = 1.96 * (stdDev / Math.sqrt(segment.customerCount));
          const confidenceInterval = {
            lower: Math.max(0, mean - marginOfError),
            upper: mean + marginOfError,
            marginOfError
          };

          // Calculate predictive power metrics
          const variance = stdDev * stdDev;
          const coefficientOfVariation = stdDev / mean;

          // Analyze transaction patterns
          const transactionCounts = segment.customers.map(c => c.transactionCount);
          const avgTransactionsPerCustomer = segment.totalTransactions / segment.customerCount;

          return {
            segmentName: segment.key,
            criteria: segment.criteria,
            metrics: {
              customerCount: segment.customerCount,
              totalRevenue: segment.totalRevenue,
              avgLTV: mean,
              medianLTV: segment.ltvRange.median,
              ltvRange: segment.ltvRange,
              confidenceInterval,
              variance,
              standardDeviation: stdDev,
              coefficientOfVariation,
              avgTransactionsPerCustomer,
              avgTransactionValue: segment.avgTransactionValue,
              avgLifetimeMonths: segment.avgLifetimeMonths
            },
            predictiveMetrics: {
              sampleSize: segment.customerCount,
              isReliable: segment.customerCount >= 30, // Generally reliable if n >= 30
              confidence: segment.customerCount >= 100 ? 'high' : segment.customerCount >= 30 ? 'medium' : 'low',
              marginOfErrorPercent: (marginOfError / mean) * 100
            },
            revenueContribution: {
              total: segment.totalRevenue,
              shareOfTotal: segment.shareOfTotalRevenue,
              rank: 0 // Will be calculated after sorting
            }
          };
        })
      );

      // Sort by revenue contribution and calculate rank
      segmentLTVDetails.sort((a, b) => b.revenueContribution.total - a.revenueContribution.total);
      segmentLTVDetails.forEach((segment, index) => {
        segment.revenueContribution.rank = index + 1;
      });

      const result = {
        segmentBy,
        segments: segmentLTVDetails,
        summary: {
          totalSegments: segmentLTVDetails.length,
          totalRevenue: segmentLTVDetails.reduce((sum, s) => sum + s.metrics.totalRevenue, 0),
          totalCustomers: segmentLTVDetails.reduce((sum, s) => sum + s.metrics.customerCount, 0),
          overallAvgLTV: segmentLTVDetails.reduce((sum, s) => sum + s.metrics.avgLTV, 0) / segmentLTVDetails.length
        },
        generatedAt: new Date()
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Error calculating average LTV per segment:', error);
      throw new Error(`Failed to calculate average LTV: ${error.message}`);
    }
  }

  /**
   * Step 4: Predict new customer LTV
   * Use segment averages and predictive features to estimate LTV for new customers
   */
  async predictNewCustomerLTV(customerFeatures = {}) {
    try {
      const {
        acquisitionChannel,
        subscriptionType,
        isNewCustomer = true,
        firstTransactionAmount,
        geography,
        device,
        referrer
      } = customerFeatures;

      // Get segment averages
      const segmentData = await this.calculateAverageLTVPerSegment('acquisitionChannel');

      // Find matching segment or use closest match
      let predictedLTV = 0;
      let confidence = 'low';
      let matchedSegment = null;

      // Primary: Match by acquisition channel
      const channelSegment = segmentData.segments.find(
        s => s.criteria.acquisitionChannel === acquisitionChannel
      );

      if (channelSegment) {
        matchedSegment = channelSegment;
        predictedLTV = channelSegment.metrics.avgLTV;
        confidence = channelSegment.predictiveMetrics.confidence;

        // Adjust based on subscription type if available
        if (subscriptionType) {
          const subscriptionSegment = await this.calculateAverageLTVPerSegment('subscriptionType');
          const subSegment = subscriptionSegment.segments.find(
            s => s.criteria.subscriptionType === subscriptionType
          );

          if (subSegment) {
            // Blend predictions (weighted average)
            const channelWeight = 0.6; // Channel is more predictive
            const subWeight = 0.4;

            predictedLTV = (predictedLTV * channelWeight) + (subSegment.metrics.avgLTV * subWeight);
            confidence = channelSegment.predictiveMetrics.confidence;
          }
        }

        // Adjust based on first transaction amount
        if (firstTransactionAmount && firstTransactionAmount > 0) {
          // Calculate ratio to average first transaction
          const avgFirstTransaction = channelSegment.metrics.avgTransactionValue;
          const ratio = firstTransactionAmount / avgFirstTransaction;

          // Adjust prediction (first transaction is often predictive)
          // Cap adjustment between 0.5x and 2.0x to avoid extreme predictions
          const adjustmentFactor = Math.max(0.5, Math.min(2.0, ratio));
          predictedLTV = predictedLTV * adjustmentFactor;
        }
      }

      // Calculate prediction range
      let predictionRange = null;
      if (matchedSegment) {
        const stdDev = matchedSegment.metrics.standardDeviation;
        const marginOfError = matchedSegment.metrics.confidenceInterval.marginOfError;

        predictionRange = {
          low: Math.max(0, predictedLTV - marginOfError),
          expected: predictedLTV,
          high: predictedLTV + marginOfError,
          confidence: confidence,
          marginOfError: marginOfError,
          marginOfErrorPercent: (marginOfError / predictedLTV) * 100
        };
      }

      // Generate recommendations
      const recommendations = [];
      if (matchedSegment) {
        if (matchedSegment.metrics.coefficientOfVariation > 1.0) {
          recommendations.push({
            type: 'warning',
            message: 'High variance in this segment - predictions may be less accurate',
            action: 'Monitor customer behavior closely for first 90 days'
          });
        }

        if (matchedSegment.predictiveMetrics.confidence === 'low') {
          recommendations.push({
            type: 'info',
            message: 'Limited sample size for this segment',
            action: 'Consider using broader segment averages for prediction'
          });
        }

        if (predictedLTV < matchedSegment.metrics.totalRevenue / matchedSegment.metrics.customerCount * 0.5) {
          recommendations.push({
            type: 'opportunity',
            message: 'Customer shows below-average predicted LTV',
            action: 'Implement retention strategies to increase lifetime value'
          });
        }
      }

      return {
        prediction: predictionRange,
        matchedSegment: matchedSegment ? {
          name: matchedSegment.segmentName,
          avgLTV: matchedSegment.metrics.avgLTV,
          medianLTV: matchedSegment.metrics.medianLTV,
          customerCount: matchedSegment.metrics.customerCount
        } : null,
        customerFeatures,
        recommendations,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error predicting customer LTV:', error);
      throw new Error(`Failed to predict LTV: ${error.message}`);
    }
  }

  /**
   * Step 5: Display in analytics
   * Get comprehensive LTV analytics for dashboard
   */
  async getLTVAnalytics(dashboardOptions = {}) {
    const cacheKey = `ltv_analytics_${JSON.stringify(dashboardOptions)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const {
        segmentBy = 'acquisitionChannel',
        includePredictions = true,
        topSegments = 10
      } = dashboardOptions;

      // Get all the data
      const [historicalData, segmentData, avgLTVData] = await Promise.all([
        this.analyzeHistoricalLTVData(),
        this.segmentCustomersByType([segmentBy]),
        this.calculateAverageLTVPerSegment(segmentBy)
      ]);

      // Build analytics summary
      const analytics = {
        overview: {
          totalCustomersAnalyzed: historicalData.statistics.totalCustomers,
          totalRevenue: historicalData.statistics.totalRevenue,
          avgLTV: historicalData.statistics.avgLTV,
          medianLTV: historicalData.statistics.medianLTV,
          ltvDistribution: historicalData.statistics.ltvDistribution
        },
        segments: avgLTVData.segments.slice(0, topSegments).map(segment => ({
          name: segment.segmentName,
          customerCount: segment.metrics.customerCount,
          avgLTV: segment.metrics.avgLTV,
          medianLTV: segment.metrics.medianLTV,
          ltvRange: segment.metrics.ltvRange,
          confidence: segment.predictiveMetrics.confidence,
          revenueShare: segment.revenueContribution.shareOfTotal,
          revenueRank: segment.revenueContribution.rank
        })),
        topPerformingSegments: avgLTVData.segments
          .sort((a, b) => b.metrics.avgLTV - a.metrics.avgLTV)
          .slice(0, 5)
          .map(segment => ({
            name: segment.segmentName,
            avgLTV: segment.metrics.avgLTV,
            customerCount: segment.metrics.customerCount,
            totalRevenue: segment.metrics.totalRevenue
          })),
        highValueSegments: avgLTVData.segments
          .filter(s => s.metrics.avgLTV > historicalData.statistics.avgLTV * 1.5)
          .map(segment => ({
            name: segment.segmentName,
            avgLTV: segment.metrics.avgLTV,
            aboveAverageBy: ((segment.metrics.avgLTV - historicalData.statistics.avgLTV) / historicalData.statistics.avgLTV * 100).toFixed(1)
          })),
        lowValueSegments: avgLTVData.segments
          .filter(s => s.metrics.avgLTV < historicalData.statistics.avgLTV * 0.5)
          .map(segment => ({
            name: segment.segmentName,
            avgLTV: segment.metrics.avgLTV,
            belowAverageBy: ((historicalData.statistics.avgLTV - segment.metrics.avgLTV) / historicalData.statistics.avgLTV * 100).toFixed(1)
          })),
        segmentComparison: avgLTVData.segments.slice(0, topSegments).map(segment => ({
          segment: segment.segmentName,
          metrics: {
            avgLTV: segment.metrics.avgLTV,
            medianLTV: segment.metrics.medianLTV,
            customerCount: segment.metrics.customerCount,
            avgLifetimeMonths: segment.metrics.avgLifetimeMonths,
            avgTransactionValue: segment.metrics.avgTransactionValue
          },
          variance: {
            standardDeviation: segment.metrics.standardDeviation,
            coefficientOfVariation: segment.metrics.coefficientOfVariation,
            range: segment.metrics.ltvRange
          }
        })),
        insights: this.generateLTVInsights(historicalData, avgLTVData),
        generatedAt: new Date()
      };

      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;

    } catch (error) {
      console.error('Error generating LTV analytics:', error);
      throw new Error(`Failed to generate analytics: ${error.message}`);
    }
  }

  /**
   * Generate insights from LTV analysis
   */
  generateLTVInsights(historicalData, segmentData) {
    const insights = [];
    const { avgLTV, ltvDistribution } = historicalData.statistics;

    // Insight 1: High-value segments
    const topSegment = segmentData.segments[0];
    if (topSegment) {
      insights.push({
        type: 'opportunity',
        title: 'Highest Value Segment Identified',
        message: `${topSegment.segmentName} has the highest average LTV at $${topSegment.metrics.avgLTV.toFixed(2)}`,
        recommendation: `Focus acquisition efforts on ${topSegment.criteria.acquisitionChannel || 'this channel'}`,
        impact: 'high',
        potentialValue: topSegment.metrics.avgLTV * 100 // Projected value for 100 customers
      });
    }

    // Insight 2: LTV distribution
    if (ltvDistribution.p95 > avgLTV * 3) {
      insights.push({
        type: 'insight',
        title: 'Significant LTV Variance',
        message: `Top 5% of customers have ${(ltvDistribution.p95 / avgLTV).toFixed(1)}x higher LTV than average`,
        recommendation: 'Identify and nurture high-value customer characteristics',
        impact: 'medium'
      });
    }

    // Insight 3: Segment reliability
    const lowConfidenceSegments = segmentData.segments.filter(s => s.predictiveMetrics.confidence === 'low');
    if (lowConfidenceSegments.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Limited Data on Some Segments',
        message: `${lowConfidenceSegments.length} segment(s) have insufficient data for reliable predictions`,
        recommendation: 'Increase sample size or combine similar segments for better predictions',
        impact: 'low'
      });
    }

    return insights;
  }

  /**
   * Helper: Calculate median
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Helper: Calculate percentile
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Helper: Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    return { success: true, message: 'LTV modeling cache cleared' };
  }
}

export default LTVModelingService;
