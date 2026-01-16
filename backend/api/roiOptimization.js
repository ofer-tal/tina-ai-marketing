/**
 * ROI Optimization API Routes
 *
 * Provides endpoints for ROI optimization analysis and recommendations
 */

import express from 'express';
import roiOptimizationService from '../services/roiOptimizationService.js';

const router = express.Router();

/**
 * GET /api/roi-optimization/report
 * Get comprehensive ROI optimization report
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await roiOptimizationService.getOptimizationReport(startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating ROI optimization report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/roi-optimization/channels
 * Analyze ROI by channel (Step 1)
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/channels', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analysis = await roiOptimizationService.analyzeCurrentROIByChannel(startDate, endDate);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing channels:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: roiOptimizationService.getMockROIAnalysis()
    });
  }
});

/**
 * GET /api/roi-optimization/underperformers
 * Identify underperforming areas (Step 2)
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/underperformers', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const channelAnalysis = await roiOptimizationService.analyzeCurrentROIByChannel(startDate, endDate);
    const underperformance = await roiOptimizationService.identifyUnderperformingAreas(channelAnalysis);

    res.json({
      success: true,
      data: underperformance
    });
  } catch (error) {
    console.error('Error identifying underperformers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        underperformers: [],
        opportunities: [],
        summary: { totalUnderperformers: 0, criticalIssues: 0, totalOpportunities: 0 }
      }
    });
  }
});

/**
 * GET /api/roi-optimization/scenarios
 * Model optimization scenarios (Step 3)
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/scenarios', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const channelAnalysis = await roiOptimizationService.analyzeCurrentROIByChannel(startDate, endDate);
    const underperformance = await roiOptimizationService.identifyUnderperformingAreas(channelAnalysis);
    const scenarios = await roiOptimizationService.modelOptimizationScenarios(channelAnalysis, underperformance);

    res.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    console.error('Error modeling scenarios:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        scenarios: [],
        summary: { totalScenarios: 0, highImpactScenarios: 0, quickWins: 0 }
      }
    });
  }
});

/**
 * GET /api/roi-optimization/recommendations
 * Generate recommendations (Step 4)
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const channelAnalysis = await roiOptimizationService.analyzeCurrentROIByChannel(startDate, endDate);
    const underperformance = await roiOptimizationService.identifyUnderperformingAreas(channelAnalysis);
    const scenarios = await roiOptimizationService.modelOptimizationScenarios(channelAnalysis, underperformance);
    const recommendations = await roiOptimizationService.generateRecommendations(scenarios.scenarios, channelAnalysis);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/roi-optimization/projection
 * Estimate potential improvement (Step 5)
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/projection', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const channelAnalysis = await roiOptimizationService.analyzeCurrentROIByChannel(startDate, endDate);
    const underperformance = await roiOptimizationService.identifyUnderperformingAreas(channelAnalysis);
    const scenarios = await roiOptimizationService.modelOptimizationScenarios(channelAnalysis, underperformance);
    const projection = await roiOptimizationService.estimatePotentialImprovement(channelAnalysis, scenarios.scenarios);

    res.json({
      success: true,
      data: projection
    });
  } catch (error) {
    console.error('Error estimating projection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/roi-optimization/summary
 * Get summary of optimization opportunities
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await roiOptimizationService.getOptimizationReport(startDate, endDate);

    const summary = {
      currentMetrics: {
        totalROI: report.channelAnalysis.summary.overallROI,
        totalRevenue: report.channelAnalysis.summary.totalRevenue,
        totalCost: report.channelAnalysis.summary.totalCost,
        totalProfit: report.channelAnalysis.summary.totalProfit,
        activeChannels: report.channelAnalysis.summary.activeChannels
      },
      issues: {
        underperformingChannels: report.underperformanceAnalysis.summary.totalUnderperformers,
        criticalIssues: report.underperformanceAnalysis.summary.criticalIssues
      },
      opportunities: {
        totalScenarios: report.scenarios.length,
        highImpactOpportunities: report.underperformanceAnalysis.summary.highImpactOpportunities,
        quickWins: report.scenarios.filter(s => s.effort === 'low' && s.impact === 'high').length
      },
      projections: report.potentialImprovement ? {
        projectedROI: report.potentialImprovement.projected.roi,
        roiIncrease: report.potentialImprovement.improvement.roiIncrease,
        costSavings: report.potentialImprovement.improvement.costSavings,
        revenueIncrease: report.potentialImprovement.improvement.revenueIncrease
      } : null
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/roi-optimization/channels/:channelId
 * Get detailed analysis for a specific channel
 */
router.get('/channels/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { startDate, endDate } = req.query;

    const analysis = await roiOptimizationService.analyzeCurrentROIByChannel(startDate, endDate);
    const channel = analysis.channels.find(ch => ch.channel === channelId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error getting channel details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/roi-optimization/cache/clear
 * Clear the cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    roiOptimizationService.cache.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
