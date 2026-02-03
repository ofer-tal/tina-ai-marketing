/**
 * Apple Search Ads Sync Job
 *
 * Scheduled job to sync campaign spend data from Apple Search Ads API
 * - Fetches campaigns and their daily spend data
 * - Stores daily aggregates in DailySpend collection
 * - Calculates metrics: CAC, ROAS, ROI
 *
 * Schedule: Every 6 hours - cron: 0 STAR-SLASH-6 STAR STAR STAR (Every 6 hours)
 */

import schedulerService from '../services/scheduler.js';
import appleSearchAdsService from '../services/appleSearchAdsService.js';
import DailySpend from '../models/DailySpend.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('apple-search-ads-sync', 'scheduler');

/**
 * Apple Search Ads Sync Job
 */
class AppleSearchAdsSyncJob {
  constructor() {
    this.jobName = 'apple-search-ads-sync';
    this.isRunning = false;
    this.lastSyncStats = null;

    // Configuration from environment
    this.syncSchedule = process.env.SEARCH_ADS_SYNC_SCHEDULE || '0 */6 * * *'; // Default: every 6 hours
    this.timezone = process.env.SEARCH_ADS_SYNC_TIMEZONE || 'UTC';
    this.daysToSync = parseInt(process.env.SEARCH_ADS_SYNC_DAYS) || 7; // Sync last 7 days
  }

  /**
   * Initialize and schedule the job
   * Note: schedulerService.registerJob() auto-starts the job if scheduler is running
   */
  async initialize() {
    logger.info(`Initializing Apple Search Ads sync job with schedule: ${this.syncSchedule}`);

    // Register job with scheduler (must be awaited - it's async!)
    // Note: The scheduler will automatically start the job if it's running
    await schedulerService.registerJob(
      this.jobName,
      this.syncSchedule,
      () => this.execute(),
      {
        timezone: this.timezone,
        metadata: {
          description: 'Sync campaign spend data from Apple Search Ads API',
          daysToSync: this.daysToSync
        }
      }
    );

    logger.info('Apple Search Ads sync job initialized and scheduled');
  }

  /**
   * Execute the Apple Search Ads sync job
   * Fetches campaign spend data and stores in database
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Apple Search Ads sync job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting Apple Search Ads sync');

      // Check if Apple Search Ads service is configured
      if (!appleSearchAdsService.isConfigured()) {
        logger.warn('Apple Search Ads API not configured, skipping sync');
        return {
          success: false,
          reason: 'not_configured',
          message: 'Apple Search Ads credentials not configured'
        };
      }

      // Step 1: Test API connection
      logger.info('Step 1: Testing Apple Search Ads API connection');
      const connectionTest = await appleSearchAdsService.testConnection();

      if (!connectionTest.success) {
        logger.error('Apple Search Ads API connection test failed', {
          error: connectionTest.message
        });
        return {
          success: false,
          reason: 'connection_failed',
          message: connectionTest.message
        };
      }

      logger.info('Apple Search Ads API connection successful');

      // Step 2: Fetch campaigns
      logger.info('Step 2: Fetching campaigns');
      const campaignsResponse = await appleSearchAdsService.getCampaigns(200, 0);

      if (!campaignsResponse.success || !campaignsResponse.campaigns) {
        logger.error('Failed to fetch campaigns');
        return {
          success: false,
          reason: 'fetch_campaigns_failed',
          message: 'Failed to fetch campaigns from Apple Search Ads API'
        };
      }

      const campaigns = campaignsResponse.campaigns;
      logger.info(`Fetched ${campaigns.length} campaigns`);

      // Step 3: Calculate date range for sync
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.daysToSync);

      logger.info(`Step 3: Fetching spend data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

      // Step 4: Fetch and aggregate daily spend for each campaign
      const dailySpendData = await this.fetchCampaignSpendData(campaigns, startDate, endDate);

      // Step 5: Store daily spend data in database
      logger.info('Step 4: Storing daily spend data in database');
      const storedCount = await this.storeDailySpendData(dailySpendData);
      logger.info(`Stored ${storedCount} daily spend records`);

      // Step 6: Calculate and store overall platform daily aggregates
      logger.info('Step 5: Calculating platform-wide daily aggregates');
      const aggregateCount = await this.storePlatformAggregates(startDate, endDate);
      logger.info(`Stored ${aggregateCount} platform aggregate records`);

      // Step 7: Calculate trends for each day
      logger.info('Step 6: Calculating trends');
      await this.calculateTrends(startDate, endDate);

      // Calculate sync statistics
      const stats = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        campaignsFetched: campaigns.length,
        dailyRecordsStored: storedCount,
        aggregateRecordsStored: aggregateCount,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      };

      this.lastSyncStats = stats;

      logger.info('Apple Search Ads sync completed successfully', stats);

      return stats;

    } catch (error) {
      logger.error('Error in Apple Search Ads sync job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch campaign spend data for all campaigns
   */
  async fetchCampaignSpendData(campaigns, startDate, endDate) {
    const dailySpendMap = new Map(); // Key: date+campaignId, Value: spend data

    logger.info(`Fetching spend data for ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      const campaignId = String(campaign.id); // Ensure string for consistency
      const campaignName = campaign.name || campaignId;
      const dailyBudget = campaign.dailyBudget?.amount || 0;

      logger.debug(`Fetching data for campaign: ${campaignName} (${campaignId})`);

      try {
        // Fetch campaign report for the date range
        const reportResponse = await appleSearchAdsService.getCampaignReport(
          campaignId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        if (reportResponse.success && reportResponse.report) {
          // Process daily data from report
          for (const dayData of reportResponse.report) {
            const date = dayData.date;
            const key = `${date}_${campaignId}`;

            if (!dailySpendMap.has(key)) {
              dailySpendMap.set(key, {
                date: date,
                campaignId: campaignId,
                campaignName: campaignName,
                platform: 'apple_search_ads',
                dailyBudget: dailyBudget,
                actualSpend: 0,
                spendBreakdown: {
                  impressions: 0,
                  clicks: 0,
                  conversions: 0
                },
                metrics: {
                  ctr: 0,
                  conversionRate: 0,
                  cpa: 0,
                  roas: 0,
                  cpc: 0,
                  cpm: 0
                },
                dataSource: 'api'
              });
            }

            const spendData = dailySpendMap.get(key);

            // Accumulate spend data
            spendData.actualSpend += dayData.spend || 0;
            spendData.spendBreakdown.impressions += dayData.impressions || 0;
            spendData.spendBreakdown.clicks += dayData.clicks || 0;
            spendData.spendBreakdown.conversions += dayData.conversions || 0;
          }
        }

      } catch (error) {
        logger.error(`Failed to fetch report for campaign ${campaignName} (${campaignId})`, {
          error: error.message
        });
        // Continue with next campaign
      }
    }

    // Convert map to array and calculate derived metrics
    const dailySpendData = Array.from(dailySpendMap.values()).map(data => {
      const impressions = data.spendBreakdown.impressions;
      const clicks = data.spendBreakdown.clicks;
      const conversions = data.spendBreakdown.conversions;
      const spend = data.actualSpend;

      // Calculate metrics
      data.metrics.ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      data.metrics.conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      data.metrics.cpc = clicks > 0 ? spend / clicks : 0;
      data.metrics.cpa = conversions > 0 ? spend / conversions : 0;
      data.metrics.cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      data.metrics.roas = this.calculateROAS(spend, conversions);

      // Calculate budget status
      data.budgetUtilization = data.dailyBudget > 0 ? (spend / data.dailyBudget) * 100 : 0;
      data.budgetStatus = this.determineBudgetStatus(data.budgetUtilization);
      data.overBudgetAmount = data.budgetUtilization > 100 ? spend - data.dailyBudget : 0;

      return data;
    });

    logger.info(`Fetched ${dailySpendData.length} daily spend records`);

    return dailySpendData;
  }

  /**
   * Store daily spend data in database
   * Uses bulk upsert to handle duplicates
   */
  async storeDailySpendData(dailySpendData) {
    try {
      if (dailySpendData.length === 0) {
        return 0;
      }

      // Bulk upsert with compound key (date + campaignId)
      const operations = dailySpendData.map(data => ({
        updateOne: {
          filter: {
            date: data.date,
            campaignId: data.campaignId,
            platform: data.platform
          },
          update: { $set: data },
          upsert: true
        }
      }));

      const result = await DailySpend.bulkWrite(operations);
      const storedCount = result.upsertedCount + result.modifiedCount;

      logger.info(`Stored ${storedCount} daily spend records`, {
        upserted: result.upsertedCount,
        modified: result.modifiedCount
      });

      return storedCount;

    } catch (error) {
      logger.error('Error storing daily spend data', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Store platform-wide daily aggregates
   * Aggregates spend across all campaigns for each day
   */
  async storePlatformAggregates(startDate, endDate) {
    try {
      const aggregates = [];

      // Create date range for aggregation
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // Aggregate all campaigns for this date
        const dayAggregate = await DailySpend.aggregate([
          {
            $match: {
              date: dateStr,
              platform: 'apple_search_ads'
            }
          },
          {
            $group: {
              _id: '$date',
              date: { $first: '$date' },
              platform: { $first: 'all' },
              dailyBudget: { $sum: '$dailyBudget' },
              actualSpend: { $sum: '$actualSpend' },
              impressions: { $sum: '$spendBreakdown.impressions' },
              clicks: { $sum: '$spendBreakdown.clicks' },
              conversions: { $sum: '$spendBreakdown.conversions' },
              campaignsCount: { $sum: 1 }
            }
          }
        ]);

        if (dayAggregate.length > 0) {
          const agg = dayAggregate[0];

          // Calculate metrics for aggregate
          const spend = agg.actualSpend;
          const impressions = agg.impressions;
          const clicks = agg.clicks;
          const conversions = agg.conversions;

          const aggregateData = {
            date: dateStr,
            platform: 'all',
            campaignId: null,
            campaignName: 'All Campaigns',
            dailyBudget: agg.dailyBudget,
            actualSpend: spend,
            spendBreakdown: {
              impressions: impressions,
              clicks: clicks,
              conversions: conversions
            },
            metrics: {
              ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
              conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
              cpc: clicks > 0 ? spend / clicks : 0,
              cpa: conversions > 0 ? spend / conversions : 0,
              cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
              roas: this.calculateROAS(spend, conversions)
            },
            budgetUtilization: agg.dailyBudget > 0 ? (spend / agg.dailyBudget) * 100 : 0,
            budgetStatus: this.determineBudgetStatus(
              agg.dailyBudget > 0 ? (spend / agg.dailyBudget) * 100 : 0
            ),
            overBudgetAmount: 0,
            aggregationDetails: {
              campaignsCount: agg.campaignsCount,
              adGroupsCount: 0,
              lastAggregatedAt: new Date()
            },
            dataSource: 'aggregated'
          };

          aggregates.push(aggregateData);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Store aggregates
      if (aggregates.length > 0) {
        const operations = aggregates.map(data => ({
          updateOne: {
            filter: {
              date: data.date,
              platform: 'all',
              campaignId: null
            },
            update: { $set: data },
            upsert: true
          }
        }));

        const result = await DailySpend.bulkWrite(operations);
        return result.upsertedCount + result.modifiedCount;
      }

      return 0;

    } catch (error) {
      logger.error('Error storing platform aggregates', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate trends for each day compared to previous day
   */
  async calculateTrends(startDate, endDate) {
    try {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + 1); // Start from second day

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        // Get current and previous day data
        const [currentDay, previousDay] = await Promise.all([
          DailySpend.findOne({ date: dateStr, platform: 'all' }),
          DailySpend.findOne({ date: prevDateStr, platform: 'all' })
        ]);

        if (currentDay && previousDay) {
          // Calculate trends
          const calculateTrend = (curr, prev) => {
            if (prev === 0) return 'stable';
            const change = ((curr - prev) / prev) * 100;
            if (change > 5) return 'up';
            if (change < -5) return 'down';
            return 'stable';
          };

          const calculateChange = (curr, prev) => {
            if (prev === 0) return 0;
            return ((curr - prev) / prev) * 100;
          };

          currentDay.trend = {
            spend: calculateTrend(currentDay.actualSpend, previousDay.actualSpend),
            impressions: calculateTrend(
              currentDay.spendBreakdown.impressions,
              previousDay.spendBreakdown.impressions
            ),
            clicks: calculateTrend(
              currentDay.spendBreakdown.clicks,
              previousDay.spendBreakdown.clicks
            ),
            conversions: calculateTrend(
              currentDay.spendBreakdown.conversions,
              previousDay.spendBreakdown.conversions
            )
          };

          currentDay.changeFromPrevious = {
            spend: calculateChange(currentDay.actualSpend, previousDay.actualSpend),
            impressions: calculateChange(
              currentDay.spendBreakdown.impressions,
              previousDay.spendBreakdown.impressions
            ),
            clicks: calculateChange(
              currentDay.spendBreakdown.clicks,
              previousDay.spendBreakdown.clicks
            ),
            conversions: calculateChange(
              currentDay.spendBreakdown.conversions,
              previousDay.spendBreakdown.conversions
            )
          };

          await currentDay.save();
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

    } catch (error) {
      logger.error('Error calculating trends', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   * Assuming average revenue of $10 per conversion
   */
  calculateROAS(spend, conversions) {
    if (spend === 0) return 0;
    const estimatedRevenue = conversions * 10; // $10 per conversion
    return estimatedRevenue / spend;
  }

  /**
   * Determine budget status from utilization percentage
   */
  determineBudgetStatus(utilization) {
    if (utilization >= 100) return 'critical';
    if (utilization >= 90) return 'over_budget';
    if (utilization >= 70) return 'on_budget';
    return 'under_budget';
  }

  /**
   * Start the Apple Search Ads sync scheduler
   */
  async start() {
    const cronSchedule = this.syncSchedule || '0 */6 * * *';
    await schedulerService.schedule(
      this.jobName,
      cronSchedule,
      () => this.execute(),
      {
        timezone: this.timezone,
        metadata: {
          daysToSync: this.daysToSync,
          jobType: 'apple-search-ads-sync'
        }
      }
    );
    logger.info('Apple Search Ads sync job started', {
      schedule: cronSchedule,
      timezone: this.timezone
    });
  }

  /**
   * Stop the Apple Search Ads sync scheduler
   */
  stop() {
    schedulerService.unschedule(this.jobName);
    logger.info('Apple Search Ads sync job stopped');
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return {
      jobName: this.jobName,
      isRunning: this.isRunning,
      lastSyncStats: this.lastSyncStats,
      schedule: this.syncSchedule,
      timezone: this.timezone,
      daysToSync: this.daysToSync
    };
  }

  /**
   * Manually trigger a sync for a specific date range
   */
  async syncDateRange(startDate, endDate) {
    logger.info(`Manual sync triggered for ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    try {
      // Fetch campaigns
      const campaignsResponse = await appleSearchAdsService.getCampaigns(200, 0);

      if (!campaignsResponse.success || !campaignsResponse.campaigns) {
        throw new Error('Failed to fetch campaigns');
      }

      const campaigns = campaignsResponse.campaigns;

      // Fetch and aggregate daily spend
      const dailySpendData = await this.fetchCampaignSpendData(campaigns, startDate, endDate);

      // Store daily spend data
      const storedCount = await this.storeDailySpendData(dailySpendData);

      // Store platform aggregates
      const aggregateCount = await this.storePlatformAggregates(startDate, endDate);

      // Calculate trends
      await this.calculateTrends(startDate, endDate);

      logger.info(`Manual sync completed: ${storedCount} records stored, ${aggregateCount} aggregates`);

      return {
        success: true,
        recordsStored: storedCount,
        aggregatesStored: aggregateCount
      };

    } catch (error) {
      logger.error('Manual sync failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Create and export singleton instance
const appleSearchAdsSyncJob = new AppleSearchAdsSyncJob();

export default appleSearchAdsSyncJob;
