/**
 * Budget Guard Service
 *
 * Pre-spend budget checking and overspend prevention system.
 * Intercepts all budget-impacting operations before they execute.
 *
 * Feature #296: Budget overspend prevention
 * - Step 1: Before spend, check budget
 * - Step 2: Calculate projected spend
 * - Step 3: Block if would exceed budget
 * - Step 4: Log prevention event
 * - Step 5: Alert user
 */

import DailySpend from '../models/DailySpend.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('budget-guard', 'budget-guard');

/**
 * Budget Guard Service
 *
 * Provides pre-spend validation to prevent budget overspend
 */
class BudgetGuardService {
  constructor() {
    // Budget thresholds from environment
    this.monthlyBudgetLimit = parseFloat(process.env.MONTHLY_BUDGET_LIMIT) || 1000;
    this.warningThreshold = parseFloat(process.env.BUDGET_WARNING_THRESHOLD) || 0.70;
    this.criticalThreshold = parseFloat(process.env.BUDGET_CRITICAL_THRESHOLD) || 0.90;
    this.overspendPreventionEnabled = process.env.ENABLE_OVERSPEND_PREVENTION !== 'false';

    logger.info('Budget Guard Service initialized', {
      monthlyBudgetLimit: this.monthlyBudgetLimit,
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold,
      overspendPreventionEnabled: this.overspendPreventionEnabled
    });
  }

  /**
   * Step 1: Before spend, check budget
   *
   * Validates if a proposed spend operation is safe to execute
   * This should be called BEFORE any budget-impacting operation
   *
   * @param {object} options - Spend validation options
   * @param {number} options.proposedSpend - Amount being spent
   * @param {string} options.operation - Operation type (e.g., 'updateCampaignBudget', 'setCampaignStatus')
   * @param {string} options.platform - Platform (e.g., 'apple_search_ads')
   * @param {string} options.campaignId - Campaign ID (optional)
   * @param {string} options.campaignName - Campaign name (optional)
   * @param {object} options.metadata - Additional metadata (optional)
   * @returns {Promise<object>} - Validation result with allowed flag
   */
  async validateSpend(options = {}) {
    const {
      proposedSpend = 0,
      operation = 'unknown',
      platform = 'unknown',
      campaignId = null,
      campaignName = null,
      metadata = {}
    } = options;

    logger.info('Budget pre-spend check initiated', {
      proposedSpend,
      operation,
      platform,
      campaignId,
      campaignName
    });

    // If overspend prevention is disabled, allow all operations
    if (!this.overspendPreventionEnabled) {
      logger.info('Overspend prevention disabled, allowing operation', {
        operation,
        proposedSpend
      });
      return {
        allowed: true,
        reason: 'Overspend prevention disabled',
        currentBudget: await this.getCurrentBudgetStatus()
      };
    }

    try {
      // Step 1: Get current budget status
      const currentBudget = await this.getCurrentBudgetStatus();

      // Step 2: Calculate projected spend
      const projected = await this.calculateProjectedSpend(currentBudget, proposedSpend);

      logger.info('Budget projection calculated', {
        currentSpent: currentBudget.totalSpent,
        proposedSpend,
        projectedTotal: projected.projectedTotal,
        remainingBudget: projected.remainingBudget,
        utilizationPercent: projected.utilizationPercent
      });

      // Step 3: Block if would exceed budget
      if (projected.wouldExceedBudget) {
        // Step 4: Log prevention event
        const preventionEvent = await this.logPreventionEvent({
          proposedSpend,
          operation,
          platform,
          campaignId,
          campaignName,
          currentBudget,
          projected,
          metadata
        });

        // Step 5: Alert user
        await this.alertUser(preventionEvent, projected);

        logger.warn('Budget overspend prevented', {
          operation,
          platform,
          campaignId,
          proposedSpend,
          currentSpent: currentBudget.totalSpent,
          projectedTotal: projected.projectedTotal,
          budgetLimit: this.monthlyBudgetLimit
        });

        return {
          allowed: false,
          reason: 'Would exceed monthly budget limit',
          currentBudget,
          projected,
          preventionEvent
        };
      }

      // Check if operation would push into critical zone (90%+)
      if (projected.utilizationPercent >= this.criticalThreshold * 100) {
        logger.warn('Operation would push budget to critical level', {
          operation,
          platform,
          proposedSpend,
          utilizationPercent: projected.utilizationPercent,
          criticalThreshold: this.criticalThreshold * 100
        });

        // Still allow but log warning
        return {
          allowed: true,
          warning: 'Operation will push budget to critical level (90%+)',
          currentBudget,
          projected
        };
      }

      // Check if operation would push into warning zone (70%+)
      if (projected.utilizationPercent >= this.warningThreshold * 100) {
        logger.info('Operation would push budget to warning level', {
          operation,
          platform,
          proposedSpend,
          utilizationPercent: projected.utilizationPercent,
          warningThreshold: this.warningThreshold * 100
        });

        return {
          allowed: true,
          warning: 'Operation will push budget to warning level (70%+)',
          currentBudget,
          projected
        };
      }

      // Operation is safe
      logger.info('Budget pre-spend check passed', {
        operation,
        platform,
        proposedSpend,
        utilizationPercent: projected.utilizationPercent
      });

      return {
        allowed: true,
        currentBudget,
        projected
      };

    } catch (error) {
      logger.error('Budget validation failed', {
        error: error.message,
        stack: error.stack,
        operation,
        proposedSpend
      });

      // On error, fail open to prevent blocking operations
      return {
        allowed: true,
        warning: 'Budget validation failed, operation allowed',
        error: error.message
      };
    }
  }

  /**
   * Get current budget status from database
   * Returns actual spend for current month
   */
  async getCurrentBudgetStatus() {
    try {
      const now = new Date();
      const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM format
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-31`;

      // Fetch monthly spend from DailySpend collection
      const monthlySpend = await DailySpend.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: '$actualSpend' }
          }
        }
      ]);

      const totalSpent = monthlySpend.length > 0 ? monthlySpend[0].totalSpend : 0;
      const remaining = Math.max(0, this.monthlyBudgetLimit - totalSpent);
      const utilizationPercent = this.monthlyBudgetLimit > 0
        ? (totalSpent / this.monthlyBudgetLimit) * 100
        : 0;

      // Calculate pacing
      const currentDay = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const remainingDays = daysInMonth - currentDay;
      const dailySpendRate = currentDay > 0 ? totalSpent / currentDay : 0;
      const projectedSpend = totalSpent + (dailySpendRate * remainingDays);

      return {
        totalSpent,
        remaining,
        utilizationPercent,
        monthlyBudgetLimit: this.monthlyBudgetLimit,
        dailySpendRate,
        projectedSpend,
        currentDay,
        daysInMonth,
        remainingDays,
        yearMonth
      };

    } catch (error) {
      logger.error('Failed to get current budget status', {
        error: error.message,
        stack: error.stack
      });

      // Return zeros on error
      return {
        totalSpent: 0,
        remaining: this.monthlyBudgetLimit,
        utilizationPercent: 0,
        monthlyBudgetLimit: this.monthlyBudgetLimit,
        dailySpendRate: 0,
        projectedSpend: 0,
        currentDay: new Date().getDate(),
        daysInMonth: 30,
        remainingDays: 30,
        yearMonth: new Date().toISOString().slice(0, 7)
      };
    }
  }

  /**
   * Step 2: Calculate projected spend
   *
   * Calculates what the budget would look like after the proposed spend
   */
  async calculateProjectedSpend(currentBudget, proposedSpend) {
    const projectedTotal = currentBudget.totalSpent + proposedSpend;
    const remainingBudget = Math.max(0, this.monthlyBudgetLimit - projectedTotal);
    const utilizationPercent = this.monthlyBudgetLimit > 0
      ? (projectedTotal / this.monthlyBudgetLimit) * 100
      : 0;

    const wouldExceedBudget = projectedTotal > this.monthlyBudgetLimit;
    const overBudgetAmount = wouldExceedBudget ? projectedTotal - this.monthlyBudgetLimit : 0;

    return {
      projectedTotal,
      remainingBudget,
      utilizationPercent,
      wouldExceedBudget,
      overBudgetAmount,
      proposedSpend
    };
  }

  /**
   * Step 4: Log prevention event
   *
   * Logs when an operation is blocked due to budget concerns
   */
  async logPreventionEvent(options) {
    const {
      proposedSpend,
      operation,
      platform,
      campaignId,
      campaignName,
      currentBudget,
      projected,
      metadata
    } = options;

    const preventionEvent = {
      type: 'budget_overspend_prevented',
      timestamp: new Date().toISOString(),
      operation,
      platform,
      campaignId,
      campaignName,
      proposedSpend,
      currentSpent: currentBudget.totalSpent,
      projectedTotal: projected.projectedTotal,
      budgetLimit: this.monthlyBudgetLimit,
      overBudgetAmount: projected.overBudgetAmount,
      utilizationPercent: projected.utilizationPercent,
      metadata
    };

    logger.warn('BUDGET OVERSPEND PREVENTED', preventionEvent);

    // Could also store in database for audit trail
    // await BudgetPreventionEvent.create(preventionEvent);

    return preventionEvent;
  }

  /**
   * Step 5: Alert user
   *
   * Sends user-facing alert when operation is blocked
   */
  async alertUser(preventionEvent, projected) {
    const alert = {
      type: 'budget',
      severity: 'error',
      title: 'Budget Overspend Prevented',
      message: `Operation "${preventionEvent.operation}" was blocked to prevent exceeding monthly budget limit.`,
      details: {
        operation: preventionEvent.operation,
        platform: preventionEvent.platform,
        campaignId: preventionEvent.campaignId,
        campaignName: preventionEvent.campaignName,
        proposedSpend: `$${preventionEvent.proposedSpend.toFixed(2)}`,
        currentSpent: `$${preventionEvent.currentSpent.toFixed(2)}`,
        projectedTotal: `$${projected.projectedTotal.toFixed(2)}`,
        budgetLimit: `$${this.monthlyBudgetLimit.toFixed(2)}`,
        overBudgetAmount: `$${projected.overBudgetAmount.toFixed(2)}`,
        utilizationPercent: `${projected.utilizationPercent.toFixed(1)}%`,
        action: 'Review budget settings or increase monthly budget limit'
      },
      action: {
        label: 'Review Budget',
        link: '/dashboard?tab=budget'
      },
      timestamp: new Date().toISOString(),
      category: 'paid_ads'
    };

    logger.error('USER NOTIFICATION: Budget overspend prevented', alert);

    // Could also send push notification, email, etc.
    // await notificationService.send(alert);

    return alert;
  }

  /**
   * Validate campaign budget update
   * Convenience method for campaign budget operations
   */
  async validateCampaignBudgetUpdate(campaignId, currentBudget, newBudget, platform = 'apple_search_ads') {
    const proposedSpend = Math.max(0, newBudget - currentBudget);

    return await this.validateSpend({
      proposedSpend,
      operation: 'updateCampaignBudget',
      platform,
      campaignId,
      metadata: {
        currentBudget,
        newBudget
      }
    });
  }

  /**
   * Validate campaign enable
   * Convenience method for campaign status changes
   */
  async validateCampaignEnable(campaignId, campaignName, dailyBudget, platform = 'apple_search_ads') {
    // Estimate potential spend for rest of month
    const now = new Date();
    const remainingDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    const proposedSpend = dailyBudget * remainingDays;

    return await this.validateSpend({
      proposedSpend,
      operation: 'setCampaignStatus',
      platform,
      campaignId,
      campaignName,
      metadata: {
        dailyBudget,
        remainingDays,
        status: 'ENABLED'
      }
    });
  }

  /**
   * Validate keyword bid increase
   * Convenience method for keyword bidding operations
   */
  async validateKeywordBidIncrease(keywordId, currentBid, newBid, platform = 'apple_search_ads') {
    // Estimate additional spend from increased bid
    const bidIncrease = newBid - currentBid;
    const estimatedClicks = 10; // Conservative estimate
    const proposedSpend = bidIncrease * estimatedClicks;

    return await this.validateSpend({
      proposedSpend,
      operation: 'setKeywordBid',
      platform,
      keywordId,
      metadata: {
        currentBid,
        newBid,
        estimatedClicks
      }
    });
  }

  /**
   * Get service configuration
   */
  getConfig() {
    return {
      monthlyBudgetLimit: this.monthlyBudgetLimit,
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold,
      overspendPreventionEnabled: this.overspendPreventionEnabled
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.monthlyBudgetLimit !== undefined) {
      this.monthlyBudgetLimit = config.monthlyBudgetLimit;
    }
    if (config.warningThreshold !== undefined) {
      this.warningThreshold = config.warningThreshold;
    }
    if (config.criticalThreshold !== undefined) {
      this.criticalThreshold = config.criticalThreshold;
    }
    if (config.overspendPreventionEnabled !== undefined) {
      this.overspendPreventionEnabled = config.overspendPreventionEnabled;
    }

    logger.info('Budget Guard configuration updated', this.getConfig());
  }
}

// Create and export singleton instance
const budgetGuardService = new BudgetGuardService();

export default budgetGuardService;
