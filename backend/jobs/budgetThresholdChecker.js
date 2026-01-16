import schedulerService from '../services/scheduler.js';
import DailySpend from '../models/DailySpend.js';
import appleSearchAdsService from '../services/appleSearchAdsService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('budget-threshold-checker', 'budget-threshold-checker');

/**
 * Budget Threshold Checker Job
 *
 * Hourly job that checks budget utilization and triggers alerts/pauses as needed:
 * - Step 1: Set up hourly cron job
 * - Step 2: Fetch current ad spend
 * - Step 3: Calculate budget utilization
 * - Step 4: Trigger alert at 70%
 * - Step 5: Auto-pause at 90%
 *
 * Runs every hour at the top of the hour (configurable)
 */
class BudgetThresholdCheckerJob {
  constructor() {
    this.jobName = 'budget-threshold-checker';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled budget threshold checker job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.interval - Interval in cron format (default: "0 * * * *" for hourly)
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Budget threshold checker already started');
      return;
    }

    try {
      // Get interval from environment or options
      // Default: Run every hour at the top of the hour
      const cronExpression = options.interval || process.env.BUDGET_CHECK_INTERVAL || '0 * * * *';
      const timezone = options.timezone || process.env.BUDGET_CHECK_TIMEZONE || 'UTC';

      logger.info('Starting budget threshold checker scheduler', {
        jobName: this.jobName,
        cronExpression,
        timezone
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
      logger.info('Budget threshold checker scheduler started successfully', {
        jobName: this.jobName,
        cronExpression,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start budget threshold checker scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled budget threshold checker job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Budget threshold checker not currently scheduled');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Budget threshold checker scheduler stopped', {
        jobName: this.jobName
      });
    } catch (error) {
      logger.error('Failed to stop budget threshold checker scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the budget threshold check
   * This is the main job execution method
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Budget threshold check started', {
      jobName: this.jobName,
      timestamp: new Date().toISOString()
    });

    try {
      // Get thresholds from environment
      const warningThreshold = parseFloat(process.env.BUDGET_WARNING_THRESHOLD) || 0.70;
      const criticalThreshold = parseFloat(process.env.BUDGET_CRITICAL_THRESHOLD) || 0.90;
      const monthlyBudgetLimit = parseFloat(process.env.MONTHLY_BUDGET_LIMIT) || 1000;

      // Step 2: Fetch current ad spend
      const spendData = await this.fetchCurrentAdSpend();

      // Step 3: Calculate budget utilization
      const utilization = await this.calculateBudgetUtilization(spendData, monthlyBudgetLimit);

      logger.info('Budget utilization calculated', {
        utilizationPercent: utilization.percent,
        monthlyBudget: monthlyBudgetLimit,
        totalSpent: utilization.totalSpent,
        remaining: utilization.remaining
      });

      const alerts = [];
      const actions = [];

      // Step 4: Trigger alert at 70%
      if (utilization.percent >= warningThreshold * 100) {
        const warningAlert = await this.triggerWarningAlert(utilization, warningThreshold);
        alerts.push(warningAlert);
        logger.warn('Budget warning threshold reached', {
          utilizationPercent: utilization.percent,
          threshold: warningThreshold * 100,
          alert: warningAlert
        });
      }

      // Step 5: Auto-pause at 90%
      if (utilization.percent >= criticalThreshold * 100) {
        const criticalAlert = await this.triggerCriticalAlert(utilization, criticalThreshold);
        alerts.push(criticalAlert);

        // Auto-pause campaigns
        const pauseResults = await this.autoPauseCampaigns(utilization, criticalThreshold);
        actions.push(...pauseResults);

        logger.error('Budget critical threshold reached - campaigns auto-paused', {
          utilizationPercent: utilization.percent,
          threshold: criticalThreshold * 100,
          alert: criticalAlert,
          campaignsPaused: pauseResults.length
        });
      }

      const duration = Date.now() - startTime;
      logger.info('Budget threshold check completed', {
        jobName: this.jobName,
        duration: `${duration}ms`,
        alertsTriggered: alerts.length,
        actionsTaken: actions.length,
        utilizationPercent: utilization.percent
      });

      return {
        success: true,
        utilization,
        alerts,
        actions,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Budget threshold check failed', {
        jobName: this.jobName,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      throw error;
    }
  }

  /**
   * Step 2: Fetch current ad spend from all platforms
   */
  async fetchCurrentAdSpend() {
    logger.info('Fetching current ad spend from all platforms');

    const spendData = {
      apple_search_ads: 0,
      tiktok: 0,
      instagram: 0,
      facebook: 0,
      google_ads: 0,
      total: 0
    };

    try {
      // Fetch from DailySpend collection for current month
      const now = new Date();
      const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM format
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-31`;

      const monthlySpend = await DailySpend.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$platform',
            totalSpend: { $sum: '$actualSpend' }
          }
        }
      ]);

      // Aggregate spend by platform
      monthlySpend.forEach(item => {
        const platform = item._id === 'all' ? 'total' : item._id;
        if (spendData.hasOwnProperty(platform)) {
          spendData[platform] = item.totalSpend;
        }
      });

      // Calculate total
      spendData.total = Object.values(spendData).reduce((sum, val) => sum + val, 0) - spendData.total;

      logger.info('Ad spend fetched successfully', {
        spendData,
        month: yearMonth
      });

      return spendData;

    } catch (error) {
      logger.error('Failed to fetch ad spend', {
        error: error.message,
        stack: error.stack
      });

      // Return zero spend on error to prevent false positives
      return spendData;
    }
  }

  /**
   * Step 3: Calculate budget utilization percentage
   */
  async calculateBudgetUtilization(spendData, monthlyBudgetLimit) {
    const totalSpent = spendData.total;
    const remaining = Math.max(0, monthlyBudgetLimit - totalSpent);
    const percent = monthlyBudgetLimit > 0 ? (totalSpent / monthlyBudgetLimit) * 100 : 0;

    // Get current day of month for pacing calculation
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - currentDay;

    // Calculate projected spend
    const daysPassed = currentDay;
    const dailySpendRate = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const projected = totalSpent + (dailySpendRate * remainingDays);

    return {
      totalSpent,
      remaining,
      percent,
      projected,
      monthlyBudgetLimit,
      dailySpendRate,
      currentDay,
      daysInMonth,
      remainingDays,
      breakdown: spendData
    };
  }

  /**
   * Step 4: Trigger warning alert at 70%
   */
  async triggerWarningAlert(utilization, threshold) {
    const alert = {
      type: 'budget',
      severity: 'warning',
      title: 'Budget Warning Threshold Reached',
      message: `Marketing budget has reached ${utilization.percent.toFixed(1)}% utilization (${threshold * 100}% threshold). $${utilization.remaining.toFixed(2)} remaining of $${utilization.monthlyBudgetLimit} monthly budget.`,
      details: {
        currentUtilization: utilization.percent.toFixed(1),
        threshold: threshold * 100,
        spent: utilization.totalSpent.toFixed(2),
        remaining: utilization.remaining.toFixed(2),
        monthlyBudget: utilization.monthlyBudgetLimit,
        projected: utilization.projected.toFixed(2),
        dailySpendRate: utilization.dailySpendRate.toFixed(2),
        remainingDays: utilization.remainingDays
      },
      action: {
        label: 'Review Budget',
        link: '/dashboard?tab=budget'
      },
      timestamp: new Date().toISOString(),
      category: 'paid_ads'
    };

    // Store alert in database or notification system
    // For now, we'll just log it
    logger.warn('Budget warning alert triggered', alert);

    return alert;
  }

  /**
   * Step 5: Trigger critical alert and auto-pause campaigns at 90%
   */
  async triggerCriticalAlert(utilization, threshold) {
    const alert = {
      type: 'budget',
      severity: 'critical',
      title: 'Budget Critical Threshold Reached - Campaigns Auto-Paused',
      message: `Marketing budget has reached ${utilization.percent.toFixed(1)}% utilization (${threshold * 100}% threshold). Automatic pause triggered for active campaigns. $${utilization.remaining.toFixed(2)} remaining of $${utilization.monthlyBudgetLimit} monthly budget.`,
      details: {
        currentUtilization: utilization.percent.toFixed(1),
        threshold: threshold * 100,
        spent: utilization.totalSpent.toFixed(2),
        overBudget: Math.abs(utilization.remaining).toFixed(2),
        monthlyBudget: utilization.monthlyBudgetLimit,
        projected: utilization.projected.toFixed(2),
        dailySpendRate: utilization.dailySpendRate.toFixed(2),
        remainingDays: utilization.remainingDays
      },
      action: {
        label: 'Review Campaigns',
        link: '/ads/campaigns'
      },
      timestamp: new Date().toISOString(),
      category: 'paid_ads'
    };

    // Store alert in database or notification system
    logger.error('Budget critical alert triggered', alert);

    return alert;
  }

  /**
   * Auto-pause campaigns when critical threshold is reached
   */
  async autoPauseCampaigns(utilization, threshold) {
    const actions = [];
    const autoPauseEnabled = process.env.ENABLE_AUTO_PAUSE !== 'false';

    if (!autoPauseEnabled) {
      logger.info('Auto-pause is disabled, skipping campaign pause');
      return actions;
    }

    try {
      // Get active campaigns from Apple Search Ads
      const campaignsResult = await appleSearchAdsService.getCampaigns(50, 0);
      const campaigns = campaignsResult.campaigns || [];

      for (const campaign of campaigns) {
        // Skip already paused campaigns
        if (campaign.status === 'PAUSED' || campaign.status === 'DISABLED') {
          continue;
        }

        // Pause the campaign
        try {
          await appleSearchAdsService.setCampaignStatus(campaign.id, true);

          const action = {
            type: 'campaign_paused',
            campaignId: campaign.id,
            campaignName: campaign.name,
            platform: 'apple_search_ads',
            reason: `Budget critical threshold reached (${utilization.percent.toFixed(1)}% utilization)`,
            pausedAt: new Date().toISOString()
          };

          actions.push(action);
          logger.info('Campaign auto-paused', action);

        } catch (pauseError) {
          logger.error(`Failed to auto-pause campaign ${campaign.id}`, {
            error: pauseError.message,
            campaignId: campaign.id,
            campaignName: campaign.name
          });
        }
      }

    } catch (error) {
      logger.error('Failed to fetch campaigns for auto-pause', {
        error: error.message,
        stack: error.stack
      });
    }

    return actions;
  }

  /**
   * Manual trigger for testing purposes
   */
  async trigger() {
    logger.info('Manual trigger invoked for budget threshold checker');
    return await this.execute();
  }

  /**
   * Get job status
   */
  getStatus() {
    const schedulerStatus = schedulerService.getStatus();
    const jobInfo = schedulerStatus.jobs?.find(job => job.name === this.jobName);

    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      isRunning: jobInfo?.status === 'running',
      schedulerStatus: schedulerStatus.status,
      lastRun: jobInfo?.lastRun,
      nextRun: jobInfo?.nextRun,
      stats: jobInfo?.stats || {
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        lastDuration: 0
      }
    };
  }
}

// Create and export singleton instance
const budgetThresholdChecker = new BudgetThresholdCheckerJob();

export default budgetThresholdChecker;
