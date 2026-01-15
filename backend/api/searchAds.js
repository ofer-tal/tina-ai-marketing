/**
 * Apple Search Ads API Routes
 *
 * Provides endpoints for managing Apple Search Ads campaigns
 */

import express from 'express';
import appleSearchAdsService from '../services/appleSearchAdsService.js';

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

export default router;
