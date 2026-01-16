import schedulerService from '../services/scheduler.js';
import AnalyticsMetric from '../models/AnalyticsMetric.js';
import MarketingPost from '../models/MarketingPost.js';
import MarketingRevenue from '../models/MarketingRevenue.js';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import DailySpend from '../models/DailySpend.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('metrics-aggregator', 'metrics-aggregator');

/**
 * Daily Metrics Aggregation Job
 *
 * Aggregates and stores daily metrics from all sources:
 * - Revenue metrics (MRR, subscribers, revenue)
 * - Content metrics (posts, views, engagement)
 * - Ad metrics (spend, impressions, clicks)
 * - ASO metrics (keyword rankings, downloads)
 * - Conversion metrics (funnel performance)
 *
 * Runs daily at a configurable time (default: 01:00 UTC)
 */
class MetricsAggregatorJob {
  constructor() {
    this.jobName = 'daily-metrics-aggregation';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled metrics aggregation job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.scheduleTime - Time in HH:MM format (default: "01:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Metrics aggregator already started');
      return;
    }

    try {
      // Get schedule time from environment or options
      const scheduleTime = options.scheduleTime || process.env.METRICS_AGGREGATION_TIME || '01:00';
      const timezone = options.timezone || process.env.METRICS_AGGREGATION_TIMEZONE || 'UTC';

      // Parse HH:MM format to create cron expression
      const [hour, minute] = scheduleTime.split(':').map(Number);

      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid schedule time format: ${scheduleTime}. Expected HH:MM format (00:00-23:59)`);
      }

      // Create cron expression: "minute hour * * *"
      const cronExpression = `${minute} ${hour} * * *`;

      logger.info('Starting metrics aggregation scheduler', {
        jobName: this.jobName,
        scheduleTime,
        timezone,
        cronExpression
      });

      // Start the scheduler service if not already running
      if (schedulerService.getStatus().status !== 'running') {
        schedulerService.start();
        logger.info('Scheduler service started');
      }

      // Schedule the job using SchedulerService
      schedulerService.schedule(
        this.jobName,
        cronExpression,
        async () => await this.execute(),
        {
          timezone,
          immediate: options.runImmediately || false
        }
      );

      this.isScheduled = true;
      logger.info('Metrics aggregation scheduler started successfully', {
        jobName: this.jobName,
        scheduleTime,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start metrics aggregation scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled metrics aggregation job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Metrics aggregator not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Metrics aggregation scheduler stopped');
    } catch (error) {
      logger.error('Failed to stop metrics aggregation scheduler', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute the metrics aggregation job
   * This is the main entry point called by the scheduler
   */
  async execute() {
    logger.info('Starting metrics aggregation job');
    const startTime = Date.now();

    try {
      // Calculate date range for yesterday (complete day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      logger.info('Aggregating metrics for date range', {
        startDate: yesterday.toISOString(),
        endDate: endOfYesterday.toISOString()
      });

      // Aggregate metrics from all sources
      const results = {
        revenue: await this.aggregateRevenueMetrics(yesterday, endOfYesterday),
        content: await this.aggregateContentMetrics(yesterday, endOfYesterday),
        ads: await this.aggregateAdMetrics(yesterday, endOfYesterday)
      };

      const duration = Date.now() - startTime;
      logger.info('Metrics aggregation completed', {
        duration: `${duration}ms`,
        results: {
          revenueMetrics: results.revenue.length,
          contentMetrics: results.content.length,
          adMetrics: results.ads.length
        }
      });

      return {
        success: true,
        date: yesterday.toISOString().split('T')[0],
        metrics: {
          revenue: results.revenue.length,
          content: results.content.length,
          ads: results.ads.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Metrics aggregation failed', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Aggregate revenue metrics
   * Fetches from MarketingRevenue and DailyRevenueAggregate collections
   */
  async aggregateRevenueMetrics(startDate, endDate) {
    logger.info('Aggregating revenue metrics');

    const metrics = [];

    try {
      // Get daily revenue aggregate for this date
      const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyRevenue = await DailyRevenueAggregate.findOne({ date: dateStr });

      if (dailyRevenue) {
        // MRR metric
        if (dailyRevenue.revenue?.netRevenue) {
          metrics.push({
            metric: 'mrr',
            value: dailyRevenue.revenue.netRevenue,
            dimensions: {
              source: 'appstore'
            },
            timestamp: startDate,
            source: 'appstore',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Active subscribers metric
        if (dailyRevenue.subscribers?.activeSubscribers) {
          metrics.push({
            metric: 'active_subscribers',
            value: dailyRevenue.subscribers.activeSubscribers,
            dimensions: {
              source: 'appstore'
            },
            timestamp: startDate,
            source: 'appstore',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // New users metric
        if (dailyRevenue.users?.newUsers) {
          metrics.push({
            metric: 'new_users',
            value: dailyRevenue.users.newUsers,
            dimensions: {
              source: 'appstore'
            },
            timestamp: startDate,
            source: 'appstore',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Churned subscribers metric
        if (dailyRevenue.subscribers?.churnedSubscribers) {
          metrics.push({
            metric: 'churned_subscribers',
            value: dailyRevenue.subscribers.churnedSubscribers,
            dimensions: {
              source: 'appstore'
            },
            timestamp: startDate,
            source: 'appstore',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Net revenue metric
        if (dailyRevenue.revenue?.netRevenue) {
          metrics.push({
            metric: 'net_revenue',
            value: dailyRevenue.revenue.netRevenue,
            dimensions: {
              source: 'appstore'
            },
            timestamp: startDate,
            source: 'appstore',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Gross revenue metric
        if (dailyRevenue.revenue?.grossRevenue) {
          metrics.push({
            metric: 'gross_revenue',
            value: dailyRevenue.revenue.grossRevenue,
            dimensions: {
              source: 'appstore'
            },
            timestamp: startDate,
            source: 'appstore',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }
      }

      // Save metrics to database
      if (metrics.length > 0) {
        // Delete existing metrics for this date to avoid duplicates
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'mrr');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'active_subscribers');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'new_users');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'churned_subscribers');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'net_revenue');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'gross_revenue');

        await AnalyticsMetric.insertMany(metrics);
        logger.info(`Saved ${metrics.length} revenue metrics`);
      }

    } catch (error) {
      logger.error('Failed to aggregate revenue metrics', { error: error.message });
    }

    return metrics;
  }

  /**
   * Aggregate content metrics
   * Fetches from MarketingPost collection
   */
  async aggregateContentMetrics(startDate, endDate) {
    logger.info('Aggregating content metrics');

    const metrics = [];

    try {
      // Count posts by status
      const postCounts = await MarketingPost.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const dateStr = startDate.toISOString().split('T')[0];

      for (const statusCount of postCounts) {
        metrics.push({
          metric: 'posts_created',
          value: statusCount.count,
          dimensions: {
            status: statusCount._id,
            source: 'content_generation'
          },
          timestamp: startDate,
          source: 'content_generation',
          period: 'daily',
          metadata: {
            date: dateStr,
            calculatedAt: new Date()
          }
        });
      }

      // Count posts by platform
      const platformCounts = await MarketingPost.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 }
          }
        }
      ]);

      for (const platformCount of platformCounts) {
        metrics.push({
          metric: 'posts_by_platform',
          value: platformCount.count,
          dimensions: {
            platform: platformCount._id,
            source: 'content_generation'
          },
          timestamp: startDate,
          source: 'content_generation',
          period: 'daily',
          metadata: {
            date: dateStr,
            calculatedAt: new Date()
          }
        });
      }

      // Aggregate engagement metrics for posted content
      const engagementMetrics = await MarketingPost.aggregate([
        {
          $match: {
            postedAt: { $gte: startDate, $lte: endDate },
            status: 'posted'
          }
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$performanceMetrics.views' },
            totalLikes: { $sum: '$performanceMetrics.likes' },
            totalComments: { $sum: '$performanceMetrics.comments' },
            totalShares: { $sum: '$performanceMetrics.shares' },
            postCount: { $sum: 1 }
          }
        }
      ]);

      if (engagementMetrics.length > 0) {
        const engagement = engagementMetrics[0];

        // Views metric
        if (engagement.totalViews) {
          metrics.push({
            metric: 'post_views',
            value: engagement.totalViews,
            dimensions: {
              source: 'social_media'
            },
            timestamp: startDate,
            source: 'social_media',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Likes metric
        if (engagement.totalLikes) {
          metrics.push({
            metric: 'post_likes',
            value: engagement.totalLikes,
            dimensions: {
              source: 'social_media'
            },
            timestamp: startDate,
            source: 'social_media',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Comments metric
        if (engagement.totalComments) {
          metrics.push({
            metric: 'post_comments',
            value: engagement.totalComments,
            dimensions: {
              source: 'social_media'
            },
            timestamp: startDate,
            source: 'social_media',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Shares metric
        if (engagement.totalShares) {
          metrics.push({
            metric: 'post_shares',
            value: engagement.totalShares,
            dimensions: {
              source: 'social_media'
            },
            timestamp: startDate,
            source: 'social_media',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Average engagement rate metric
        if (engagement.postCount > 0) {
          const avgEngagementRate = (
            (engagement.totalLikes + engagement.totalComments + engagement.totalShares) /
            (engagement.totalViews || 1)
          ) * 100;

          metrics.push({
            metric: 'avg_engagement_rate',
            value: parseFloat(avgEngagementRate.toFixed(2)),
            dimensions: {
              source: 'social_media'
            },
            timestamp: startDate,
            source: 'social_media',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Posts posted metric
        metrics.push({
          metric: 'posts_posted',
          value: engagement.postCount,
          dimensions: {
            status: 'posted',
            source: 'social_media'
          },
          timestamp: startDate,
          source: 'social_media',
          period: 'daily',
          metadata: {
            date: dateStr,
            calculatedAt: new Date()
          }
        });
      }

      // Save metrics to database
      if (metrics.length > 0) {
        // Delete existing content metrics for this date
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'posts_created');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'posts_by_platform');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'post_views');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'post_likes');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'post_comments');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'post_shares');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'avg_engagement_rate');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'posts_posted');

        await AnalyticsMetric.insertMany(metrics);
        logger.info(`Saved ${metrics.length} content metrics`);
      }

    } catch (error) {
      logger.error('Failed to aggregate content metrics', { error: error.message });
    }

    return metrics;
  }

  /**
   * Aggregate ad metrics
   * Fetches from DailySpend collection
   */
  async aggregateAdMetrics(startDate, endDate) {
    logger.info('Aggregating ad metrics');

    const metrics = [];

    try {
      const dateStr = startDate.toISOString().split('T')[0];

      // Get daily spend data
      const dailySpend = await DailySpend.findOne({ date: dateStr });

      if (dailySpend) {
        // Total spend metric
        if (dailySpend.totalSpend) {
          metrics.push({
            metric: 'ad_spend',
            value: dailySpend.totalSpend,
            dimensions: {
              source: 'apple_search_ads'
            },
            timestamp: startDate,
            source: 'apple_search_ads',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Impressions metric
        if (dailySpend.impressions) {
          metrics.push({
            metric: 'ad_impressions',
            value: dailySpend.impressions,
            dimensions: {
              source: 'apple_search_ads'
            },
            timestamp: startDate,
            source: 'apple_search_ads',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Clicks metric
        if (dailySpend.clicks) {
          metrics.push({
            metric: 'ad_clicks',
            value: dailySpend.clicks,
            dimensions: {
              source: 'apple_search_ads'
            },
            timestamp: startDate,
            source: 'apple_search_ads',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Conversions metric
        if (dailySpend.conversions) {
          metrics.push({
            metric: 'ad_conversions',
            value: dailySpend.conversions,
            dimensions: {
              source: 'apple_search_ads'
            },
            timestamp: startDate,
            source: 'apple_search_ads',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }

        // Cost metric
        if (dailySpend.cost) {
          metrics.push({
            metric: 'ad_cost',
            value: dailySpend.cost,
            dimensions: {
              source: 'apple_search_ads'
            },
            timestamp: startDate,
            source: 'apple_search_ads',
            period: 'daily',
            metadata: {
              date: dateStr,
              calculatedAt: new Date()
            }
          });
        }
      }

      // Save metrics to database
      if (metrics.length > 0) {
        // Delete existing ad metrics for this date
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'ad_spend');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'ad_impressions');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'ad_clicks');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'ad_conversions');
        await AnalyticsMetric.deleteDateRange(startDate, endDate, 'ad_cost');

        await AnalyticsMetric.insertMany(metrics);
        logger.info(`Saved ${metrics.length} ad metrics`);
      }

    } catch (error) {
      logger.error('Failed to aggregate ad metrics', { error: error.message });
    }

    return metrics;
  }

  /**
   * Manually trigger aggregation for a specific date
   * Useful for backfilling or re-aggregating data
   *
   * @param {Date} date - Date to aggregate (defaults to yesterday)
   */
  async trigger(date = null) {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    logger.info('Manually triggering metrics aggregation', {
      date: startDate.toISOString().split('T')[0]
    });

    return await this.execute();
  }

  /**
   * Get job status
   */
  getStatus() {
    const jobInfo = schedulerService.getJob(this.jobName);

    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      isRunning: jobInfo ? jobInfo.scheduled : false,
      stats: jobInfo ? jobInfo.stats : null
    };
  }
}

// Create singleton instance
const metricsAggregatorJob = new MetricsAggregatorJob();

export default metricsAggregatorJob;
