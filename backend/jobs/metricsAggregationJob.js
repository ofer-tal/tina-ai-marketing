/**
 * Metrics Aggregation Job
 *
 * Scheduled job to aggregate metrics from revenue and spend data
 * - Aggregates daily revenue data
 * - Aggregates daily spend data
 * - Calculates MRR, active subscribers, ARPU, LTV
 * - Updates dashboard cache with latest metrics
 *
 * Schedule: Hourly - cron: 0 STAR STAR STAR STAR (Every hour)
 */

import schedulerService from '../services/scheduler.js';
import MarketingRevenue from '../models/MarketingRevenue.js';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import MonthlyRevenueAggregate from '../models/MonthlyRevenueAggregate.js';
import DailySpend from '../models/DailySpend.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('metrics-aggregation', 'scheduler');

/**
 * Metrics Aggregation Job
 */
class MetricsAggregationJob {
  constructor() {
    this.jobName = 'metrics-aggregation';
    this.isRunning = false;
    this.lastAggregationStats = null;

    // Configuration from environment
    this.aggregationSchedule = process.env.METRICS_AGGREGATION_SCHEDULE || '0 * * * *'; // Default: hourly
    this.timezone = process.env.METRICS_AGGREGATION_TIMEZONE || 'UTC';
  }

  /**
   * Execute the metrics aggregation job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Metrics aggregation job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting metrics aggregation');

      // Step 1: Aggregate yesterday's revenue data
      logger.info('Step 1: Aggregating revenue data');
      const revenueResult = await this.aggregateRevenue();

      // Step 2: Aggregate yesterday's spend data
      logger.info('Step 2: Aggregating spend data');
      const spendResult = await this.aggregateSpend();

      // Step 3: Calculate and cache dashboard metrics
      logger.info('Step 3: Calculating dashboard metrics');
      const dashboardMetrics = await this.calculateDashboardMetrics();

      // Step 4: Update monthly aggregates if needed
      logger.info('Step 4: Updating monthly aggregates');
      const monthlyResult = await this.updateMonthlyAggregates();

      // Calculate aggregation statistics
      const stats = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        revenue: revenueResult,
        spend: spendResult,
        dashboard: dashboardMetrics,
        monthly: monthlyResult
      };

      this.lastAggregationStats = stats;

      logger.info('Metrics aggregation completed', {
        duration: stats.duration,
        revenueRecords: revenueResult.recordsProcessed || 0,
        spendRecords: spendResult.recordsProcessed || 0
      });

      return stats;

    } catch (error) {
      logger.error('Error in metrics aggregation job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Aggregate revenue data for the specified date (default: yesterday)
   */
  async aggregateRevenue(targetDate = null) {
    try {
      const date = targetDate || this.getYesterdayDate();
      const dateStr = date.toISOString().split('T')[0];

      logger.info(`Aggregating revenue for ${dateStr}`);

      // Get start and end of the day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Aggregate revenue data
      const revenueData = await MarketingRevenue.aggregate([
        {
          $match: {
            transactionDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            grossRevenue: { $sum: '$revenue.grossAmount' },
            appleFees: { $sum: '$revenue.appleFeeAmount' },
            netRevenue: { $sum: '$revenue.netAmount' },
            transactionCount: { $sum: 1 },
            newCustomers: { $sum: { $cond: ['$customer.new', 1, 0] } },
            returningCustomers: { $sum: { $cond: ['$customer.new', 0, 1] } },
            trialCount: {
              $sum: {
                $cond: [{ $eq: ['$customer.subscriptionType', 'trial'] }, 1, 0]
              }
            },
            monthlyCount: {
              $sum: {
                $cond: [{ $eq: ['$customer.subscriptionType', 'monthly'] }, 1, 0]
              }
            },
            annualCount: {
              $sum: {
                $cond: [{ $eq: ['$customer.subscriptionType', 'annual'] }, 1, 0]
              }
            },
            subscriptions: {
              $sum: {
                $cond: [
                  { $in: ['$customer.subscriptionType', ['monthly', 'annual', 'lifetime']] },
                  1,
                  0
                ]
              }
            },
            totalSubscriptionRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$customer.subscriptionType', ['monthly', 'annual', 'lifetime']] },
                  '$revenue.netAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      const data = revenueData[0] || {
        grossRevenue: 0,
        appleFees: 0,
        netRevenue: 0,
        transactionCount: 0,
        newCustomers: 0,
        returningCustomers: 0,
        trialCount: 0,
        monthlyCount: 0,
        annualCount: 0,
        subscriptions: 0,
        totalSubscriptionRevenue: 0
      };

      // Get unique subscribers (using subscriptionId)
      const uniqueSubscribers = await MarketingRevenue.distinct('customer.subscriptionId', {
        transactionDate: { $gte: startDate, $lte: endDate }
      });
      const activeSubscribers = uniqueSubscribers.filter(id => id !== null && id !== undefined).length;

      // Calculate previous day's revenue for comparison
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevStartDate = new Date(prevDate);
      prevStartDate.setHours(0, 0, 0, 0);
      const prevEndDate = new Date(prevDate);
      prevEndDate.setHours(23, 59, 59, 999);

      const previousRevenue = await MarketingRevenue.aggregate([
        {
          $match: {
            transactionDate: { $gte: prevStartDate, $lte: prevEndDate }
          }
        },
        {
          $group: {
            _id: null,
            netRevenue: { $sum: '$revenue.netAmount' }
          }
        }
      ]);

      const prevNetRevenue = previousRevenue[0]?.netRevenue || 0;

      // Calculate MRR (Monthly Recurring Revenue)
      // MRR = active monthly subscribers * monthly price + active annual subscribers * annual price / 12
      const monthlyPrice = 9.99;
      const annualPrice = 79.99;
      const mrr = (data.monthlyCount * monthlyPrice) + ((data.annualCount * annualPrice) / 12);

      // Calculate ARPU (Average Revenue Per User)
      const totalCustomers = data.newCustomers + data.returningCustomers;
      const arpu = totalCustomers > 0 ? data.netRevenue / totalCustomers : 0;

      // Calculate LTV (Lifetime Value) - simplified
      // LTV = ARPU * (1 / churn_rate)
      // Assuming 5% monthly churn rate for subscription apps
      const churnRate = 0.05;
      const ltv = arpu / churnRate;

      // Store or update daily aggregate
      await DailyRevenueAggregate.findOneAndUpdate(
        { date: dateStr },
        {
          date: dateStr,
          dateObj: date,
          revenue: {
            gross: data.grossRevenue,
            net: data.netRevenue,
            appleFees: data.appleFees,
            subscription: data.totalSubscriptionRevenue
          },
          transactions: {
            total: data.transactionCount,
            newCustomers: data.newCustomers,
            returningCustomers: data.returningCustomers
          },
          subscriptions: {
            totalCount: activeSubscribers,
            trialCount: data.trialCount,
            monthlyCount: data.monthlyCount,
            annualCount: data.annualCount
          },
          mrr: mrr,
          arpu: {
            value: arpu,
            calculatedAt: new Date()
          },
          ltv: {
            value: ltv,
            calculatedAt: new Date()
          },
          churn: {
            rate: this.calculateChurnRate(date),
            calculatedAt: new Date()
          },
          profitMargin: {
            value: data.netRevenue - (data.netRevenue * 0.3), // Assuming 30% costs
            percentage: ((data.netRevenue - (data.netRevenue * 0.3)) / data.netRevenue) * 100 || 0,
            netRevenue: data.netRevenue,
            totalCosts: data.netRevenue * 0.3
          },
          costs: {
            totalCost: data.netRevenue * 0.3,
            cloudServices: data.netRevenue * 0.1,
            apiServices: data.netRevenue * 0.05,
            adSpend: data.netRevenue * 0.1,
            other: data.netRevenue * 0.05,
            percentageOfRevenue: 30
          },
          changeFromPrevious: {
            netRevenue: prevNetRevenue > 0 ? ((data.netRevenue - prevNetRevenue) / prevNetRevenue) * 100 : 0
          },
          calculatedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      logger.info(`Revenue aggregation complete for ${dateStr}`, {
        netRevenue: data.netRevenue,
        transactions: data.transactionCount,
        subscribers: activeSubscribers,
        mrr: mrr.toFixed(2)
      });

      return {
        success: true,
        date: dateStr,
        recordsProcessed: data.transactionCount,
        netRevenue: data.netRevenue,
        mrr: mrr
      };

    } catch (error) {
      logger.error('Error aggregating revenue', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Aggregate spend data for the specified date (default: yesterday)
   */
  async aggregateSpend(targetDate = null) {
    try {
      const date = targetDate || this.getYesterdayDate();
      const dateStr = date.toISOString().split('T')[0];

      logger.info(`Aggregating spend for ${dateStr}`);

      // Get platform-wide spend data (already aggregated by Apple Search Ads sync job)
      const platformSpend = await DailySpend.findOne({
        date: dateStr,
        platform: 'all'
      });

      if (!platformSpend) {
        logger.info(`No spend data found for ${dateStr}`);
        return {
          success: true,
          date: dateStr,
          recordsProcessed: 0,
          totalSpend: 0
        };
      }

      // Calculate spend metrics
      const spend = platformSpend.actualSpend || 0;
      const impressions = platformSpend.spendBreakdown?.impressions || 0;
      const clicks = platformSpend.spendBreakdown?.clicks || 0;
      const conversions = platformSpend.spendBreakdown?.conversions || 0;

      logger.info(`Spend aggregation complete for ${dateStr}`, {
        totalSpend: spend,
        impressions: impressions,
        clicks: clicks,
        conversions: conversions
      });

      return {
        success: true,
        date: dateStr,
        recordsProcessed: 1,
        totalSpend: spend,
        impressions: impressions,
        clicks: clicks,
        conversions: conversions
      };

    } catch (error) {
      logger.error('Error aggregating spend', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate dashboard metrics for current display
   */
  async calculateDashboardMetrics() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = this.getYesterdayDate();
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get latest daily aggregate
      const latestAggregate = await DailyRevenueAggregate.findOne()
        .sort({ dateObj: -1 })
        .limit(1);

      // Get last 7 days aggregates for trends
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyAggregates = await DailyRevenueAggregate.find({
        dateObj: { $gte: sevenDaysAgo }
      }).sort({ dateObj: 1 });

      // Calculate weekly metrics
      const weeklyRevenue = weeklyAggregates.reduce((sum, agg) => sum + (agg.revenue?.net || 0), 0);
      const weeklyTransactions = weeklyAggregates.reduce((sum, agg) => sum + (agg.transactions?.total || 0), 0);

      // Get spend data
      const weeklySpend = await DailySpend.find({
        date: { $gte: sevenDaysAgo.toISOString().split('T')[0] }
      });
      const totalWeeklySpend = weeklySpend.reduce((sum, s) => sum + (s.actualSpend || 0), 0);

      // Calculate ROI and ROAS
      const roi = totalWeeklySpend > 0 ? ((weeklyRevenue - totalWeeklySpend) / totalWeeklySpend) * 100 : 0;
      const roas = totalWeeklySpend > 0 ? weeklyRevenue / totalWeeklySpend : 0;

      const metrics = {
        current: {
          mrr: latestAggregate?.mrr || 0,
          activeSubscribers: latestAggregate?.subscriptions?.totalCount || 0,
          arpu: latestAggregate?.arpu?.value || 0,
          ltv: latestAggregate?.ltv?.value || 0,
          churnRate: latestAggregate?.churn?.rate || 0,
          weeklyRevenue: weeklyRevenue,
          weeklySpend: totalWeeklySpend,
          roi: roi,
          roas: roas
        },
        weekly: {
          revenue: weeklyRevenue,
          spend: totalWeeklySpend,
          transactions: weeklyTransactions,
          aggregatesCount: weeklyAggregates.length
        },
        calculatedAt: now.toISOString()
      };

      return metrics;

    } catch (error) {
      logger.error('Error calculating dashboard metrics', {
        error: error.message,
        stack: error.stack
      });
      return {
        current: {
          mrr: 0,
          activeSubscribers: 0,
          arpu: 0,
          ltv: 0,
          churnRate: 0,
          weeklyRevenue: 0,
          weeklySpend: 0,
          roi: 0,
          roas: 0
        },
        weekly: {
          revenue: 0,
          spend: 0,
          transactions: 0,
          aggregatesCount: 0
        },
        calculatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Update monthly aggregates
   */
  async updateMonthlyAggregates() {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      logger.info(`Updating monthly aggregate for ${currentYear}-${currentMonth}`);

      // Get start and end of current month
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

      // Get all daily aggregates for this month
      const dailyAggregates = await DailyRevenueAggregate.find({
        dateObj: { $gte: startDate, $lte: endDate }
      });

      if (dailyAggregates.length === 0) {
        logger.info('No daily aggregates found for current month');
        return {
          success: true,
          year: currentYear,
          month: currentMonth,
          recordsProcessed: 0
        };
      }

      // Aggregate to monthly
      const monthlyData = dailyAggregates.reduce((acc, day) => {
        acc.grossRevenue += day.revenue?.gross || 0;
        acc.netRevenue += day.revenue?.net || 0;
        acc.appleFees += day.revenue?.appleFees || 0;
        acc.transactionCount += day.transactions?.total || 0;
        acc.newCustomers += day.transactions?.newCustomers || 0;
        acc.returningCustomers += day.transactions?.returningCustomers || 0;
        acc.subscriptions += day.subscriptions?.totalCount || 0;
        return acc;
      }, {
        grossRevenue: 0,
        netRevenue: 0,
        appleFees: 0,
        transactionCount: 0,
        newCustomers: 0,
        returningCustomers: 0,
        subscriptions: 0
      });

      // Calculate monthly-specific metrics
      const avgDailyRevenue = monthlyData.netRevenue / dailyAggregates.length;
      const avgDailyTransactions = monthlyData.transactionCount / dailyAggregates.length;

      // Calculate churn from month start to now
      const churnRate = this.calculateMonthlyChurnRate(startDate, endDate);

      // Generate month identifier (YYYY-MM format)
      const monthIdentifier = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

      // Get month name
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[currentMonth - 1];

      // Calculate month start/end dates
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

      // Update or create monthly aggregate
      await MonthlyRevenueAggregate.findOneAndUpdate(
        { year: currentYear, month: currentMonth },
        {
          year: currentYear,
          month: currentMonth,
          monthIdentifier,
          monthName,
          monthStart,
          monthEnd,
          grossRevenue: monthlyData.grossRevenue,
          netRevenue: monthlyData.netRevenue,
          appleFees: monthlyData.appleFees,
          transactionCount: monthlyData.transactionCount,
          newCustomerCount: monthlyData.newCustomers,
          returningCustomerCount: monthlyData.returningCustomers,
          subscriptionRevenue: dailyAggregates.reduce((sum, day) => sum + (day.revenue?.subscription || 0), 0),
          oneTimePurchaseRevenue: dailyAggregates.reduce((sum, day) => sum + (day.revenue?.net - (day.revenue?.subscription || 0)), 0),
          averageRevenuePerTransaction: monthlyData.transactionCount > 0
            ? monthlyData.netRevenue / monthlyData.transactionCount
            : 0,
          activeSubscribers: dailyAggregates[dailyAggregates.length - 1]?.subscriptions?.totalCount || 0,
          churn: {
            rate: churnRate,
            calculatedAt: new Date()
          },
          ltv: {
            value: (monthlyData.netRevenue / monthlyData.subscriptions) || 0,
            calculatedAt: new Date()
          },
          costs: dailyAggregates[dailyAggregates.length - 1]?.costs || {
            totalCost: 0,
            cloudServices: 0,
            apiServices: 0,
            adSpend: 0,
            other: 0,
            percentageOfRevenue: 0
          },
          profitMargin: dailyAggregates[dailyAggregates.length - 1]?.profitMargin || {
            value: 0,
            percentage: 0
          },
          daysWithData: dailyAggregates.length,
          avgDailyRevenue: avgDailyRevenue,
          avgDailyTransactions: avgDailyTransactions,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      logger.info(`Monthly aggregate updated for ${currentYear}-${currentMonth}`, {
        netRevenue: monthlyData.netRevenue,
        transactions: monthlyData.transactionCount,
        daysWithData: dailyAggregates.length
      });

      return {
        success: true,
        year: currentYear,
        month: currentMonth,
        recordsProcessed: dailyAggregates.length,
        netRevenue: monthlyData.netRevenue
      };

    } catch (error) {
      logger.error('Error updating monthly aggregates', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate churn rate for a specific date
   */
  calculateChurnRate(date) {
    // Simplified churn rate calculation
    // In production, this would analyze subscription events
    // For now, returning a reasonable default
    return 0.05; // 5% monthly churn rate
  }

  /**
   * Calculate monthly churn rate
   */
  calculateMonthlyChurnRate(startDate, endDate) {
    // Simplified churn rate calculation
    // In production, this would compare subscription counts
    return 0.05; // 5% monthly churn rate
  }

  /**
   * Get yesterday's date
   */
  getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  /**
   * Start the metrics aggregation scheduler
   */
  async start() {
    const cronSchedule = this.aggregationSchedule || '0 * * * *';
    await schedulerService.schedule(
      this.jobName,
      cronSchedule,
      () => this.execute(),
      {
        timezone: this.timezone,
        metadata: {
          jobType: 'metrics-aggregation'
        }
      }
    );
    logger.info('Metrics aggregation job started', {
      schedule: cronSchedule,
      timezone: this.timezone
    });
  }

  /**
   * Stop the metrics aggregation scheduler
   */
  stop() {
    schedulerService.unschedule(this.jobName);
    logger.info('Metrics aggregation job stopped');
  }

  /**
   * Get aggregation statistics
   */
  getStats() {
    return {
      jobName: this.jobName,
      isRunning: this.isRunning,
      lastAggregationStats: this.lastAggregationStats,
      schedule: this.aggregationSchedule,
      timezone: this.timezone
    };
  }

  /**
   * Manually trigger aggregation for a specific date
   */
  async aggregateDate(date) {
    logger.info(`Manual aggregation triggered for ${date.toISOString().split('T')[0]}`);

    try {
      const revenueResult = await this.aggregateRevenue(date);
      const spendResult = await this.aggregateSpend(date);

      logger.info(`Manual aggregation complete`, {
        revenue: revenueResult,
        spend: spendResult
      });

      return {
        success: true,
        revenue: revenueResult,
        spend: spendResult
      };

    } catch (error) {
      logger.error('Manual aggregation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Create and export singleton instance
const metricsAggregationJob = new MetricsAggregationJob();

export default metricsAggregationJob;
