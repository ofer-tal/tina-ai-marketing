import express from 'express';
import revenueAttributionService from '../services/revenueAttributionService.js';
import MarketingRevenue from '../models/MarketingRevenue.js';

const router = express.Router();

/**
 * GET /api/revenue/attribution
 * Get attributed revenue data
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - channel: optional channel filter
 * - campaignId: optional campaign filter
 */
router.get('/attribution', async (req, res) => {
  try {
    const { startDate, endDate, channel, campaignId } = req.query;

    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filters = {};
    if (channel) filters.channel = channel;
    if (campaignId) filters.campaignId = campaignId;

    const data = await revenueAttributionService.getAttributedRevenue(start, end, filters);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching attributed revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      )
    });
  }
});

/**
 * GET /api/revenue/attribution/campaigns
 * Get revenue attributed to each campaign
 */
router.get('/attribution/campaigns', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const revenueByCampaign = await MarketingRevenue.getRevenueByCampaign(start, end);

    res.json({
      success: true,
      data: revenueByCampaign
    });
  } catch (error) {
    console.error('Error fetching revenue by campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue().byCampaign
    });
  }
});

/**
 * GET /api/revenue/attribution/channels
 * Get revenue attributed to each channel
 */
router.get('/attribution/channels', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const revenueByChannel = await MarketingRevenue.getRevenueByChannel(start, end);

    res.json({
      success: true,
      data: revenueByChannel
    });
  } catch (error) {
    console.error('Error fetching revenue by channel:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue().byChannel
    });
  }
});

/**
 * GET /api/revenue/attribution/daily
 * Get daily revenue trend
 */
router.get('/attribution/daily', async (req, res) => {
  try {
    const { startDate, endDate, channel } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyRevenue = await MarketingRevenue.getDailyRevenue(start, end, channel);

    res.json({
      success: true,
      data: dailyRevenue
    });
  } catch (error) {
    console.error('Error fetching daily revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue().dailyTrend
    });
  }
});

/**
 * GET /api/revenue/attribution/campaign/:campaignId/roi
 * Get ROI for a specific campaign
 */
router.get('/attribution/campaign/:campaignId/roi', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const roiData = await revenueAttributionService.getCampaignROI(campaignId);

    res.json({
      success: true,
      data: roiData
    });
  } catch (error) {
    console.error('Error fetching campaign ROI:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        campaignId: req.params.campaignId,
        attributedRevenue: 0,
        conversions: 0,
        spend: 0,
        roi: 0,
        roas: 0
      }
    });
  }
});

/**
 * POST /api/revenue/attribution/run
 * Run the attribution pipeline manually
 */
router.post('/attribution/run', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const result = await revenueAttributionService.runAttributionPipeline(start, end);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error running attribution pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/summary
 * Get revenue summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totalRevenue = await MarketingRevenue.getTotalRevenue(start, end);

    res.json({
      success: true,
      data: totalRevenue
    });
  } catch (error) {
    console.error('Error fetching revenue summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { totalRevenue: 0, transactionCount: 0 }
    });
  }
});

export default router;
