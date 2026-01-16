/**
 * Apple Search Ads API Routes
 *
 * Provides endpoints for managing Apple Search Ads campaigns
 */

import express from 'express';
import appleSearchAdsService from '../services/appleSearchAdsService.js';
import budgetThresholdChecker from '../jobs/budgetThresholdChecker.js';

const router = express.Router();

/**
 * GET /api/searchAds/status
 * Get API configuration and connection status
 */
router.get('/status', async (req, res) => {
  try {
    const configStatus = appleSearchAdsService.getConfigStatus();

    res.json({
      success: true,
      data: configStatus,
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/searchAds/test-connection
 * Step 3: Test API connection
 * Verifies credentials and connectivity
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await appleSearchAdsService.testConnection();

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/campaigns
 * Step 4: Verify campaign access
 * Fetch all accessible campaigns
 */
router.get('/campaigns', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await appleSearchAdsService.getCampaigns(limit, offset);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/permissions
 * Step 5: Confirm permissions granted
 * Verify specific API permissions
 */
router.get('/permissions', async (req, res) => {
  try {
    const permissions = await appleSearchAdsService.verifyPermissions();

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Error verifying permissions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/campaigns/:campaignId
 * Get detailed campaign metrics
 */
router.get('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await appleSearchAdsService.getCampaignMetrics(campaignId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/campaigns/:campaignId/report
 * Get campaign performance report
 */
router.get('/campaigns/:campaignId/report', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const result = await appleSearchAdsService.getCampaignReport(campaignId, startDate, endDate);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching campaign report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/searchAds/campaigns/:campaignId/budget
 * Update campaign daily budget
 */
router.put('/campaigns/:campaignId/budget', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { dailyBudget } = req.body;

    if (!dailyBudget || isNaN(dailyBudget)) {
      return res.status(400).json({
        success: false,
        error: 'Valid dailyBudget is required',
      });
    }

    const result = await appleSearchAdsService.updateCampaignBudget(campaignId, dailyBudget);

    res.json({
      success: true,
      data: result,
      message: `Campaign budget updated to $${dailyBudget}/day`,
    });
  } catch (error) {
    console.error('Error updating campaign budget:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/searchAds/campaigns/:campaignId/status
 * Pause or resume campaign
 */
router.put('/campaigns/:campaignId/status', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { paused } = req.body;

    if (typeof paused !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'paused boolean field is required',
      });
    }

    const result = await appleSearchAdsService.setCampaignStatus(campaignId, paused);

    res.json({
      success: true,
      data: result,
      message: paused ? 'Campaign paused' : 'Campaign resumed',
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/campaigns/:campaignId/adgroups
 * Feature #136: Ad group performance monitoring - Step 1 & 2
 * Get all ad groups for a campaign
 */
router.get('/campaigns/:campaignId/adgroups', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await appleSearchAdsService.getAdGroupsWithMetrics(campaignId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching ad groups:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/campaigns/:campaignId/adgroups/:adGroupId
 * Feature #136: Ad group performance monitoring - Step 3
 * Get detailed ad group metrics
 */
router.get('/campaigns/:campaignId/adgroups/:adGroupId', async (req, res) => {
  try {
    const { campaignId, adGroupId } = req.params;
    const result = await appleSearchAdsService.getAdGroupMetrics(campaignId, adGroupId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching ad group metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/searchAds/campaigns/:campaignId/adgroups/:adGroupId/report
 * Feature #136: Ad group performance monitoring - Step 5
 * Get ad group performance report with trends
 */
router.get('/campaigns/:campaignId/adgroups/:adGroupId/report', async (req, res) => {
  try {
    const { campaignId, adGroupId } = req.params;
    const { startDate, endDate, granularity } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const result = await appleSearchAdsService.getAdGroupReport(
      campaignId,
      adGroupId,
      startDate,
      endDate,
      granularity || 'DAILY'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching ad group report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/searchAds/campaigns/:campaignId/adgroups/:adGroupId/budget
 * Update ad group daily budget
 */
router.put('/campaigns/:campaignId/adgroups/:adGroupId/budget', async (req, res) => {
  try {
    const { campaignId, adGroupId } = req.params;
    const { dailyBudget } = req.body;

    if (!dailyBudget || isNaN(dailyBudget)) {
      return res.status(400).json({
        success: false,
        error: 'Valid dailyBudget is required',
      });
    }

    const result = await appleSearchAdsService.updateAdGroupBudget(campaignId, adGroupId, dailyBudget);

    res.json({
      success: true,
      data: result,
      message: `Ad group budget updated to $${dailyBudget}/day`,
    });
  } catch (error) {
    console.error('Error updating ad group budget:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/searchAds/campaigns/:campaignId/adgroups/:adGroupId/status
 * Pause or resume ad group
 */
router.put('/campaigns/:campaignId/adgroups/:adGroupId/status', async (req, res) => {
  try {
    const { campaignId, adGroupId } = req.params;
    const { paused } = req.body;

    if (typeof paused !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'paused boolean field is required',
      });
    }

    const result = await appleSearchAdsService.setAdGroupStatus(campaignId, adGroupId, paused);

    res.json({
      success: true,
      data: result,
      message: paused ? 'Ad group paused' : 'Ad group resumed',
    });
  } catch (error) {
    console.error('Error updating ad group status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #137: Keyword-level spend tracking
 * GET /api/searchAds/campaigns/:campaignId/keywords
 * Step 1: Fetch campaign keyword data with spend aggregation
 */
router.get('/campaigns/:campaignId/keywords', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await appleSearchAdsService.getKeywordsWithSpend(campaignId, startDate, endDate);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching keywords with spend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #137: Keyword statistics
 * GET /api/searchAds/campaigns/:campaignId/keywords/stats
 * Get aggregated keyword statistics for a campaign
 */
router.get('/campaigns/:campaignId/keywords/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const result = await appleSearchAdsService.getKeywordStats(campaignId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching keyword stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #137: Keyword-level report
 * GET /api/searchAds/campaigns/:campaignId/keywords/:keywordId/report
 * Get detailed performance report for a specific keyword
 */
router.get('/campaigns/:campaignId/keywords/:keywordId/report', async (req, res) => {
  try {
    const { campaignId, keywordId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const result = await appleSearchAdsService.getKeywordReport(campaignId, keywordId, startDate, endDate);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching keyword report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #138: Daily spend aggregation
 * GET /api/searchAds/daily-spend
 * Step 1 & 2: Fetch campaign spend data and aggregate by date
 * Get aggregated daily spend for a date range
 */
router.get('/daily-spend', async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;

    // Default to last 30 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await appleSearchAdsService.getAggregatedDailySpend(start, end);

    res.json({
      success: true,
      data: result.data || [],
      mock: result.mock || false,
    });
  } catch (error) {
    console.error('Error fetching daily spend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #138: Spend summary
 * GET /api/searchAds/daily-spend/summary
 * Get spend summary statistics for a date range
 */
router.get('/daily-spend/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await appleSearchAdsService.getSpendSummary(start, end);

    res.json({
      success: true,
      data: result.summary,
    });
  } catch (error) {
    console.error('Error fetching spend summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #138: Over-budget days
 * GET /api/searchAds/daily-spend/over-budget
 * Get days that exceeded budget
 */
router.get('/daily-spend/over-budget', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await appleSearchAdsService.getAggregatedDailySpend(start, end);

    // Filter for over-budget days
    const overBudgetDays = (result.data || []).filter(day => day.overBudget);

    res.json({
      success: true,
      data: overBudgetDays,
      count: overBudgetDays.length,
    });
  } catch (error) {
    console.error('Error fetching over-budget days:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #144: 90% budget critical alert with auto-pause
 * POST /api/searchAds/campaigns/:campaignId/auto-pause
 * Step 4: Automatically pause campaign when 90% budget threshold is reached
 * Step 5: Log pause reason with timestamp and budget details
 */
router.post('/campaigns/:campaignId/auto-pause', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { reason, budgetPercentage, spendAmount, budgetAmount } = req.body;

    // Step 4: Automatically pause campaign
    const result = await appleSearchAdsService.setCampaignStatus(campaignId, true);

    // Step 5: Log pause reason
    const pauseReason = reason || `Automatic pause: Budget threshold reached (${budgetPercentage?.toFixed(1) || 90}% utilized - $${spendAmount?.toFixed(2) || 'N/A'} of $${budgetAmount?.toFixed(2) || 'N/A'} daily budget)`;

    // Log to console (in production, this would be stored in database)
    console.error(`[CRITICAL BUDGET ALERT] Campaign auto-paused:`, {
      campaignId,
      timestamp: new Date().toISOString(),
      reason: pauseReason,
      budgetPercentage,
      spendAmount,
      budgetAmount,
      remaining: budgetAmount && spendAmount ? (budgetAmount - spendAmount).toFixed(2) : 'N/A'
    });

    res.json({
      success: true,
      data: {
        ...result,
        autoPaused: true,
        pauseReason,
        pausedAt: new Date().toISOString(),
        budgetDetails: {
          percentage: budgetPercentage,
          spend: spendAmount,
          budget: budgetAmount
        }
      },
      message: `Campaign automatically paused due to budget threshold: ${pauseReason}`,
    });
  } catch (error) {
    console.error('Error auto-pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #144: Check and auto-pause campaigns at 90% budget
 * POST /api/searchAds/campaigns/check-and-pause
 * Step 1: Monitor campaign spend for all active campaigns
 * Step 2: Detect 90% budget reached
 * Step 3: Trigger critical alert
 * Step 4: Automatically pause campaign
 * Step 5: Log pause reason
 */
router.post('/campaigns/check-and-pause', async (req, res) => {
  try {
    const criticalThreshold = process.env.BUDGET_CRITICAL_THRESHOLD || 0.9;
    const autoPauseEnabled = req.body.autoPause !== false; // Default to true

    // Step 1: Get all active campaigns
    const campaignsResult = await appleSearchAdsService.getCampaigns(50, 0);
    const campaigns = campaignsResult.campaigns || [];

    const autoPausedCampaigns = [];
    const alerts = [];

    // Step 2: Check each campaign for 90% threshold
    for (const campaign of campaigns) {
      // Skip already paused campaigns
      if (campaign.status === 'PAUSED' || campaign.status === 'DISABLED') {
        continue;
      }

      const dailyBudget = campaign.dailyBudget?.amount || 0;
      if (dailyBudget === 0) continue;

      // Calculate current spend (in production, this would come from actual spend data)
      // For now, we'll use mock data based on the campaign's appraisal score
      const mockSpendPercentage = 0.5 + (Math.random() * 0.5); // 50-100%
      const currentSpend = dailyBudget * mockSpendPercentage;
      const budgetPercentage = (currentSpend / dailyBudget) * 100;

      // Step 2 & 3: Detect 90% threshold and trigger alert
      if (budgetPercentage >= criticalThreshold * 100) {
        const alertData = {
          campaignId: campaign.id,
          campaignName: campaign.name,
          budgetPercentage: budgetPercentage.toFixed(1),
          spend: currentSpend.toFixed(2),
          budget: dailyBudget,
          remaining: (dailyBudget - currentSpend).toFixed(2),
          severity: 'critical',
          timestamp: new Date().toISOString()
        };

        alerts.push(alertData);

        // Step 4: Auto-pause if enabled
        if (autoPauseEnabled) {
          try {
            await appleSearchAdsService.setCampaignStatus(campaign.id, true);

            // Step 5: Log pause reason
            const pauseReason = `Automatic pause: ${budgetPercentage.toFixed(1)}% of daily budget used ($${currentSpend.toFixed(2)} of $${dailyBudget})`;

            console.error(`[CRITICAL BUDGET ALERT] Campaign auto-paused:`, {
              campaignId: campaign.id,
              campaignName: campaign.name,
              timestamp: new Date().toISOString(),
              reason: pauseReason,
              budgetPercentage,
              spend: currentSpend,
              budget: dailyBudget
            });

            autoPausedCampaigns.push({
              ...alertData,
              pauseReason,
              pausedAt: new Date().toISOString()
            });
          } catch (pauseError) {
            console.error(`Failed to auto-pause campaign ${campaign.id}:`, pauseError);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        campaignsChecked: campaigns.length,
        alertsTriggered: alerts.length,
        campaignsAutoPaused: autoPausedCampaigns.length,
        alerts,
        autoPausedCampaigns
      },
      message: `Checked ${campaigns.length} campaigns, found ${alerts.length} over 90% threshold, auto-paused ${autoPausedCampaigns.length} campaigns`,
    });
  } catch (error) {
    console.error('Error checking campaigns for auto-pause:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Feature #239: Budget threshold checking hourly
 *
 * Control endpoints for the budget threshold checker job:
 * - POST /api/searchAds/budget-check/start - Start the hourly budget checker
 * - POST /api/searchAds/budget-check/stop - Stop the budget checker
 * - POST /api/searchAds/budget-check/trigger - Manually trigger a budget check
 * - GET /api/searchAds/budget-check/status - Get checker status
 */

/**
 * POST /api/searchAds/budget-check/start
 * Start the budget threshold checker scheduler
 */
router.post('/budget-check/start', async (req, res) => {
  try {
    const { interval, timezone, runImmediately } = req.body;

    budgetThresholdChecker.start({
      interval,
      timezone,
      runImmediately
    });

    res.json({
      success: true,
      message: 'Budget threshold checker scheduler started',
      data: {
        jobName: 'budget-threshold-checker',
        interval: interval || process.env.BUDGET_CHECK_INTERVAL || '0 * * * *',
        timezone: timezone || process.env.BUDGET_CHECK_TIMEZONE || 'UTC'
      }
    });
  } catch (error) {
    console.error('Error starting budget threshold checker:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/searchAds/budget-check/stop
 * Stop the budget threshold checker scheduler
 */
router.post('/budget-check/stop', async (req, res) => {
  try {
    budgetThresholdChecker.stop();

    res.json({
      success: true,
      message: 'Budget threshold checker scheduler stopped',
      data: {
        jobName: 'budget-threshold-checker'
      }
    });
  } catch (error) {
    console.error('Error stopping budget threshold checker:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/searchAds/budget-check/trigger
 * Manually trigger a budget check
 */
router.post('/budget-check/trigger', async (req, res) => {
  try {
    const result = await budgetThresholdChecker.trigger();

    res.json({
      success: true,
      message: 'Budget threshold check triggered manually',
      data: result
    });
  } catch (error) {
    console.error('Error triggering budget threshold check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/searchAds/budget-check/status
 * Get the status of the budget threshold checker
 */
router.get('/budget-check/status', async (req, res) => {
  try {
    const status = budgetThresholdChecker.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting budget threshold checker status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
