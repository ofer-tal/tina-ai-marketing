/**
 * Attribution API Routes
 *
 * Feature #257: Conversion attribution modeling
 * Provides endpoints for tracking touchpoints and attributing conversions to marketing channels
 */

import express from 'express';
import attributionService from '../services/attributionService.js';

const router = express.Router();

/**
 * Step 1: Track user touchpoints
 * GET /api/attribution/touchpoints
 */
router.get('/touchpoints', async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (platform) filters.platform = platform;

    const result = await attributionService.trackTouchpoints(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error tracking touchpoints:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 2: Model attribution (last click, multi-touch)
 * POST /api/attribution/model
 */
router.post('/model', async (req, res) => {
  try {
    const { model = 'last_click', startDate, endDate, platform } = req.body;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (platform) filters.platform = platform;

    // Get touchpoints first
    const touchpointsResult = await attributionService.trackTouchpoints(filters);

    // Apply attribution model
    const attributionResult = await attributionService.applyAttributionModel(
      touchpointsResult.touchpoints,
      model
    );

    res.json({
      success: true,
      data: attributionResult,
    });
  } catch (error) {
    console.error('Error applying attribution model:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 3: Attribute revenue to channels
 * GET /api/attribution/revenue
 */
router.get('/revenue', async (req, res) => {
  try {
    const { model = 'last_click', startDate, endDate, platform } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (platform) filters.platform = platform;

    const result = await attributionService.attributeRevenue(filters, model);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error attributing revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 4: Calculate attributed ROI
 * GET /api/attribution/roi
 */
router.get('/roi', async (req, res) => {
  try {
    const { model = 'last_click', startDate, endDate, platform } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (platform) filters.platform = platform;

    const result = await attributionService.calculateAttributedROI(filters, model);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error calculating attributed ROI:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 5: Display attribution report
 * GET /api/attribution/report
 */
router.get('/report', async (req, res) => {
  try {
    const { model = 'last_click', startDate, endDate, platform } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (platform) filters.platform = platform;

    const result = await attributionService.generateAttributionReport(filters, model);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error generating attribution report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Compare attribution models
 * GET /api/attribution/compare
 */
router.get('/compare', async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (platform) filters.platform = platform;

    const result = await attributionService.compareModels(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error comparing attribution models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get available attribution models
 * GET /api/attribution/models
 */
router.get('/models', async (req, res) => {
  try {
    const models = [
      {
        id: 'last_click',
        name: 'Last Click',
        description: '100% credit to the last touchpoint before conversion',
        useCase: 'Best for direct response campaigns'
      },
      {
        id: 'first_click',
        name: 'First Click',
        description: '100% credit to the first touchpoint in the journey',
        useCase: 'Best for brand awareness campaigns'
      },
      {
        id: 'linear',
        name: 'Linear',
        description: 'Equal credit distributed across all touchpoints',
        useCase: 'Best for understanding overall contribution'
      },
      {
        id: 'time_decay',
        name: 'Time Decay',
        description: 'More credit to touchpoints closer to conversion',
        useCase: 'Best for short sales cycles'
      },
      {
        id: 'position_based',
        name: 'Position Based',
        description: '40% first, 40% last, 20% middle touchpoints',
        useCase: 'Best for balanced view of customer journey'
      }
    ];

    res.json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error('Error getting attribution models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get attribution summary
 * GET /api/attribution/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { model = 'last_click', startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await attributionService.calculateAttributedROI(filters, model);

    const summary = {
      model,
      overall: result.overall,
      channels: result.channelROI.map(ch => ({
        channel: ch.channel,
        attributedRevenue: ch.attributedRevenue,
        attributedRevenuePercentage: ch.attributedRevenuePercentage,
        conversions: ch.conversions,
        roi: ch.roi
      })),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting attribution summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get channel breakdown
 * GET /api/attribution/channel/:channel
 */
router.get('/channel/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const { model = 'last_click', startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await attributionService.calculateAttributedROI(filters, model);

    const channelData = result.channelROI.find(ch => ch.channel === channel);

    if (!channelData) {
      return res.status(404).json({
        success: false,
        error: `Channel ${channel} not found`,
      });
    }

    res.json({
      success: true,
      data: {
        ...channelData,
        model,
        overallContext: result.overall
      },
    });
  } catch (error) {
    console.error('Error getting channel breakdown:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear attribution cache
 * POST /api/attribution/cache/clear
 */
router.post('/cache/clear', async (req, res) => {
  try {
    attributionService.clearCache();

    res.json({
      success: true,
      message: 'Attribution cache cleared',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
