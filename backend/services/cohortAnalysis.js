/**
 * Cohort Analysis Service
 *
 * Analyzes user retention by acquisition cohort
 * Groups users by their first transaction month and tracks their retention over time
 */

import MarketingRevenue from '../models/MarketingRevenue.js';

class CohortAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get or create cached analysis
   */
  async getCachedAnalysis(key, computeFn) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const result = await computeFn();
    this.cache.set(key, { data: result, timestamp: Date.now() });
    return result;
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    return { success: true, message: 'Cache cleared' };
  }

  /**
   * Step 1: Group users by acquisition month
   * Finds the first transaction for each customer and groups by month
   */
  async groupUsersByAcquisitionMonth(filters = {}) {
    const matchStage = {};

    if (filters.startDate) {
      matchStage.transactionDate = { ...matchStage.transactionDate, $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      matchStage.transactionDate = { ...matchStage.transactionDate, $lte: new Date(filters.endDate) };
    }
    if (filters.channel) {
      matchStage['attributedTo.channel'] = filters.channel;
    }
    if (filters.subscriptionType) {
      matchStage['customer.subscriptionType'] = filters.subscriptionType;
    }

    // Group by subscription ID to find first transaction (acquisition)
    const cohortData = await MarketingRevenue.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customer.subscriptionId',
          firstTransactionDate: { $min: '$transactionDate' },
          firstTransactionId: { $first: '$transactionId' },
          subscriptionType: { $first: '$customer.subscriptionType' },
          channel: { $first: '$attributedTo.channel' },
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$revenue.netAmount' }
        }
      },
      {
        $project: {
          _id: 0,
          subscriptionId: '$_id',
          firstTransactionDate: 1,
          firstTransactionId: 1,
          subscriptionType: 1,
          channel: 1,
          totalTransactions: 1,
          totalRevenue: 1,
          cohortMonth: {
            $dateToString: { format: '%Y-%m', date: '$firstTransactionDate' }
          },
          cohortYear: { $year: '$firstTransactionDate' },
          cohortMonthNum: { $month: '$firstTransactionDate' }
        }
      },
      {
        $group: {
          _id: '$cohortMonth',
          cohortYear: { $first: '$cohortYear' },
          cohortMonthNum: { $first: '$cohortMonthNum' },
          userCount: { $sum: 1 },
          users: {
            $push: {
              subscriptionId: '$subscriptionId',
              firstTransactionDate: '$firstTransactionDate',
              subscriptionType: '$subscriptionType',
              channel: '$channel',
              totalTransactions: '$totalTransactions',
              totalRevenue: '$totalRevenue'
            }
          },
          totalRevenue: { $sum: '$totalRevenue' },
          avgRevenuePerUser: { $avg: '$totalRevenue' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    return {
      success: true,
      cohorts: cohortData,
      totalCohorts: cohortData.length,
      totalUsers: cohortData.reduce((sum, c) => sum + c.userCount, 0)
    };
  }

  /**
   * Step 2: Track retention over time
   * For each cohort, tracks how many users made transactions in subsequent months
   */
  async trackRetentionOverTime(cohortData, filters = {}) {
    if (!cohortData || cohortData.cohorts.length === 0) {
      return { success: false, error: 'No cohort data available' };
    }

    const cohorts = cohortData.cohorts;
    const cohortsWithRetention = [];

    for (const cohort of cohorts) {
      const cohortDate = new Date(cohort._id + '-01');
      const subscriptionIds = cohort.users.map(u => u.subscriptionId);

      // Get all transactions for this cohort's users
      const transactions = await MarketingRevenue.aggregate([
        {
          $match: {
            'customer.subscriptionId': { $in: subscriptionIds },
            transactionDate: { $gte: cohortDate }
          }
        },
        {
          $group: {
            _id: {
              subscriptionId: '$customer.subscriptionId',
              month: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } }
            },
            transactionCount: { $sum: 1 },
            revenue: { $sum: '$revenue.netAmount' }
          }
        }
      ]);

      // Calculate retention by month relative to cohort start
      const retentionByMonth = {};
      const cohortMonths = [];

      // Initialize with month 0 (acquisition month)
      retentionByMonth[0] = {
        period: 0,
        periodLabel: 'Month 0',
        activeUsers: cohort.userCount,
        retainedUsers: cohort.userCount,
        retentionRate: 100,
        totalRevenue: cohort.totalRevenue
      };

      // Group transactions by month offset from cohort start
      for (const tx of transactions) {
        const txDate = new Date(tx._id.month + '-01');
        const monthsDiff = this.getMonthsDiff(cohortDate, txDate);

        if (monthsDiff > 0 && monthsDiff <= 24) { // Track up to 24 months
          if (!retentionByMonth[monthsDiff]) {
            retentionByMonth[monthsDiff] = {
              period: monthsDiff,
              periodLabel: `Month ${monthsDiff}`,
              activeUsers: 0,
              retainedUsers: 0,
              retentionRate: 0,
              totalRevenue: 0
            };
          }
          retentionByMonth[monthsDiff].retainedUsers += 1;
          retentionByMonth[monthsDiff].totalRevenue += tx.revenue;
        }
      }

      // Convert to array and calculate rates
      const retentionData = Object.values(retentionByMonth)
        .sort((a, b) => a.period - b.period)
        .map(r => ({
          ...r,
          retentionRate: cohort.userCount > 0
            ? ((r.retainedUsers / cohort.userCount) * 100).toFixed(2)
            : 0
        }));

      cohortsWithRetention.push({
        ...cohort,
        retentionData,
        maxRetentionMonths: Math.max(...retentionData.map(r => r.period))
      });
    }

    return {
      success: true,
      cohorts: cohortsWithRetention
    };
  }

  /**
   * Step 3: Calculate retention rates
   * Computes comprehensive retention metrics for each cohort
   */
  async calculateRetentionRates(cohortsWithRetention) {
    if (!cohortsWithRetention || cohortsWithRetention.cohorts.length === 0) {
      return { success: false, error: 'No cohort data available' };
    }

    const cohorts = cohortsWithRetention.cohorts;
    const metrics = {
      overallRetention: {},
      cohortMetrics: [],
      averageRetentionByPeriod: {}
    };

    // Calculate metrics for each cohort
    for (const cohort of cohorts) {
      const cohortMetric = {
        cohortId: cohort._id,
        userCount: cohort.userCount,
        totalRevenue: cohort.totalRevenue,
        avgRevenuePerUser: cohort.avgRevenuePerUser,
        retentionRates: {}
      };

      // Extract retention rates by period
      for (const r of cohort.retentionData) {
        if (r.period > 0) { // Skip month 0 (acquisition)
          cohortMetric.retentionRates[r.period] = parseFloat(r.retentionRate);

          // Track average retention across all cohorts for this period
          if (!metrics.averageRetentionByPeriod[r.period]) {
            metrics.averageRetentionByPeriod[r.period] = {
              period: r.period,
              totalRate: 0,
              count: 0
            };
          }
          metrics.averageRetentionByPeriod[r.period].totalRate += parseFloat(r.retentionRate);
          metrics.averageRetentionByPeriod[r.period].count += 1;
        }
      }

      // Calculate key retention metrics
      const month1Retention = cohort.retentionData.find(r => r.period === 1);
      const month3Retention = cohort.retentionData.find(r => r.period === 3);
      const month6Retention = cohort.retentionData.find(r => r.period === 6);
      const month12Retention = cohort.retentionData.find(r => r.period === 12);

      cohortMetric.keyMetrics = {
        month1: month1Retention ? parseFloat(month1Retention.retentionRate) : 0,
        month3: month3Retention ? parseFloat(month3Retention.retentionRate) : 0,
        month6: month6Retention ? parseFloat(month6Retention.retentionRate) : 0,
        month12: month12Retention ? parseFloat(month12Retention.retentionRate) : 0
      };

      metrics.cohortMetrics.push(cohortMetric);
    }

    // Calculate average retention rates across all cohorts
    metrics.averageRetentionByPeriod = Object.values(metrics.averageRetentionByPeriod)
      .map(p => ({
        period: p.period,
        averageRetentionRate: (p.totalRate / p.count).toFixed(2)
      }))
      .sort((a, b) => a.period - b.period);

    // Overall averages
    const validMetrics = metrics.cohortMetrics.filter(m => m.keyMetrics.month1 > 0);
    metrics.overallRetention = {
      month1: validMetrics.length > 0
        ? (validMetrics.reduce((sum, m) => sum + m.keyMetrics.month1, 0) / validMetrics.length).toFixed(2)
        : 0,
      month3: validMetrics.length > 0
        ? (validMetrics.reduce((sum, m) => sum + (m.keyMetrics.month3 || 0), 0) / validMetrics.length).toFixed(2)
        : 0,
      month6: validMetrics.length > 0
        ? (validMetrics.reduce((sum, m) => sum + (m.keyMetrics.month6 || 0), 0) / validMetrics.length).toFixed(2)
        : 0,
      month12: validMetrics.length > 0
        ? (validMetrics.reduce((sum, m) => sum + (m.keyMetrics.month12 || 0), 0) / validMetrics.length).toFixed(2)
        : 0
    };

    return {
      success: true,
      metrics
    };
  }

  /**
   * Step 4: Generate cohort heatmap
   * Creates data structure for heatmap visualization (cohort rows x time columns)
   */
  async generateCohortHeatmap(cohortsWithRetention) {
    if (!cohortsWithRetention || cohortsWithRetention.cohorts.length === 0) {
      return { success: false, error: 'No cohort data available' };
    }

    const cohorts = cohortsWithRetention.cohorts;
    const heatmap = {
      cohorts: [],
      periods: [],
      maxPeriod: 0
    };

    // Find the maximum period across all cohorts
    heatmap.maxPeriod = Math.max(...cohorts.map(c => c.maxRetentionMonths || 0));

    // Generate period labels
    for (let i = 0; i <= Math.min(heatmap.maxPeriod, 24); i++) {
      heatmap.periods.push(`M${i}`);
    }

    // Build heatmap data for each cohort
    for (const cohort of cohorts) {
      const heatmapRow = {
        cohortId: cohort._id,
        cohortDate: cohort._id,
        userCount: cohort.userCount,
        retentionData: []
      };

      // Add retention data for each period
      for (let i = 0; i <= Math.min(heatmap.maxPeriod, 24); i++) {
        const retention = cohort.retentionData.find(r => r.period === i);
        heatmapRow.retentionData.push({
          period: i,
          periodLabel: `M${i}`,
          retentionRate: retention ? parseFloat(retention.retentionRate) : 0,
          retainedUsers: retention ? retention.retainedUsers : 0,
          revenue: retention ? retention.totalRevenue : 0,
          hasData: retention !== undefined
        });
      }

      heatmap.cohorts.push(heatmapRow);
    }

    // Calculate statistics for heatmap coloring
    const allRates = heatmap.cohorts.flatMap(c =>
      c.retentionData.filter(d => d.period > 0).map(d => d.retentionRate)
    );

    heatmap.statistics = {
      minRetention: Math.min(...allRates, 0),
      maxRetention: Math.max(...allRates, 0),
      avgRetention: allRates.length > 0
        ? (allRates.reduce((sum, r) => sum + r, 0) / allRates.length).toFixed(2)
        : 0
    };

    return {
      success: true,
      heatmap
    };
  }

  /**
   * Step 5: Identify trends
   * Analyzes retention patterns and identifies trends
   */
  async identifyTrends(cohortsWithRetention, retentionMetrics) {
    if (!cohortsWithRetention || !retentionMetrics) {
      return { success: false, error: 'Insufficient data for trend analysis' };
    }

    const cohorts = cohortsWithRetention.cohorts;
    const metrics = retentionMetrics.metrics;
    const trends = {
      overall: [],
      byPeriod: [],
      recommendations: []
    };

    // Analyze overall retention trends
    const sortedCohorts = [...cohorts].sort((a, b) => a._id.localeCompare(b._id));

    if (sortedCohorts.length >= 3) {
      const recentCohorts = sortedCohorts.slice(-3);
      const olderCohorts = sortedCohorts.slice(0, -3);

      const recentMonth1Avg = this.calculateAverageForPeriod(recentCohorts, 1);
      const olderMonth1Avg = this.calculateAverageForPeriod(olderCohorts, 1);

      if (recentMonth1Avg > olderMonth1Avg + 5) {
        trends.overall.push({
          type: 'improving',
          metric: 'Month 1 Retention',
          description: `Recent cohorts show ${recentMonth1Avg.toFixed(1)}% M1 retention vs ${olderMonth1Avg.toFixed(1)}% for older cohorts`,
          impact: 'positive',
          magnitude: (recentMonth1Avg - olderMonth1Avg).toFixed(1)
        });
      } else if (recentMonth1Avg < olderMonth1Avg - 5) {
        trends.overall.push({
          type: 'declining',
          metric: 'Month 1 Retention',
          description: `Recent cohorts show ${recentMonth1Avg.toFixed(1)}% M1 retention vs ${olderMonth1Avg.toFixed(1)}% for older cohorts`,
          impact: 'negative',
          magnitude: (olderMonth1Avg - recentMonth1Avg).toFixed(1)
        });
      }
    }

    // Analyze retention curve patterns
    const avgRetentionByPeriod = metrics.averageRetentionByPeriod;
    if (avgRetentionByPeriod.length >= 2) {
      const month1Rate = parseFloat(avgRetentionByPeriod.find(p => p.period === 1)?.averageRetentionRate || 0);
      const month3Rate = parseFloat(avgRetentionByPeriod.find(p => p.period === 3)?.averageRetentionRate || 0);
      const month6Rate = parseFloat(avgRetentionByPeriod.find(p => p.period === 6)?.averageRetentionRate || 0);

      const month3Drop = month1Rate - month3Rate;
      const month6Drop = month3Rate - month6Rate;

      if (month3Drop > 20) {
        trends.byPeriod.push({
          period: 'M1 to M3',
          type: 'high_churn',
          description: `Significant drop of ${month3Drop.toFixed(1)}% from month 1 to month 3`,
          recommendation: 'Focus on onboarding and early engagement to reduce churn',
          priority: 'high'
        });
      }

      if (month6Drop > 10) {
        trends.byPeriod.push({
          period: 'M3 to M6',
          type: 'medium_churn',
          description: `Moderate drop of ${month6Drop.toFixed(1)}% from month 3 to month 6`,
          recommendation: 'Implement retention strategies at month 3 milestone',
          priority: 'medium'
        });
      }
    }

    // Generate recommendations
    if (metrics.overallRetention.month1 < 40) {
      trends.recommendations.push({
        area: 'Early Retention',
        priority: 'high',
        recommendation: 'Month 1 retention below 40%. Improve onboarding experience and early value realization.',
        expectedImpact: '10-15% improvement in M1 retention',
        effort: 'medium'
      });
    }

    if (metrics.overallRetention.month3 < 20) {
      trends.recommendations.push({
        area: 'Medium-term Retention',
        priority: 'medium',
        recommendation: 'Month 3 retention below 20%. Implement engagement campaigns at week 4-6.',
        expectedImpact: '5-10% improvement in M3 retention',
        effort: 'low'
      });
    }

    if (metrics.overallRetention.month1 > 50) {
      trends.recommendations.push({
        area: 'Leverage Strength',
        priority: 'low',
        recommendation: 'Strong M1 retention (>50%). Analyze what works and double down on successful patterns.',
        expectedImpact: 'Maintain competitive advantage',
        effort: 'low'
      });
    }

    return {
      success: true,
      trends
    };
  }

  /**
   * Helper: Calculate months difference between two dates
   */
  getMonthsDiff(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  /**
   * Helper: Calculate average retention rate for a specific period across cohorts
   */
  calculateAverageForPeriod(cohorts, period) {
    const rates = cohorts
      .map(c => {
        const retention = c.retentionData?.find(r => r.period === period);
        return retention ? parseFloat(retention.retentionRate) : 0;
      })
      .filter(r => r > 0);

    return rates.length > 0 ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 0;
  }

  /**
   * Complete analysis pipeline
   */
  async analyze(filters = {}) {
    return this.getCachedAnalysis('cohort-analysis-' + JSON.stringify(filters), async () => {
      try {
        // Step 1: Group users by acquisition month
        const cohortData = await this.groupUsersByAcquisitionMonth(filters);

        // Step 2: Track retention over time
        const cohortsWithRetention = await this.trackRetentionOverTime(cohortData, filters);

        // Step 3: Calculate retention rates
        const retentionMetrics = await this.calculateRetentionRates(cohortsWithRetention);

        // Step 4: Generate cohort heatmap
        const heatmapData = await this.generateCohortHeatmap(cohortsWithRetention);

        // Step 5: Identify trends
        const trendsData = await this.identifyTrends(cohortsWithRetention, retentionMetrics);

        return {
          success: true,
          data: {
            cohorts: cohortsWithRetention.cohorts,
            metrics: retentionMetrics.metrics,
            heatmap: heatmapData.heatmap,
            trends: trendsData.trends,
            summary: {
              totalCohorts: cohortData.totalCohorts,
              totalUsers: cohortData.totalUsers,
              overallRetention: retentionMetrics.metrics.overallRetention
            }
          }
        };
      } catch (error) {
        console.error('Error in cohort analysis:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Get quick summary for dashboard
   */
  async getSummary(filters = {}) {
    const result = await this.analyze(filters);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      summary: result.data.summary
    };
  }
}

export default CohortAnalysisService;
