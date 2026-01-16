/**
 * LTV Modeling API Routes
 *
 * Provides endpoints for lifetime value modeling and prediction
 */

import express from 'express';
import LTVModelingService from '../services/ltvModelingService.js';

const router = express.Router();
const ltvService = new LTVModelingService();

/**
 * GET /api/ltv-modeling/historical
 * Step 1: Analyze historical LTV data
 */
router.get('/historical', async (req, res) => {
  try {
    const options = {
      minTransactions: parseInt(req.query.minTransactions) || 1,
      churnedOnly: req.query.churnedOnly === 'true',
      lookbackDays: parseInt(req.query.lookbackDays) || 365
    };

    const result = await ltvService.analyzeHistoricalLTVData(options);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing historical LTV:', error);
    res.status(500).json({
      error: 'Failed to analyze historical LTV data',
      message: error.message
    });
  }
});

/**
 * GET /api/ltv-modeling/segments
 * Step 2: Segment customers by type
 */
router.get('/segments', async (req, res) => {
  try {
    const segments = req.query.segments
      ? req.query.segments.split(',')
      : ['acquisitionChannel', 'subscriptionType', 'isNewCustomer'];

    const result = await ltvService.segmentCustomersByType(segments);
    res.json(result);
  } catch (error) {
    console.error('Error segmenting customers:', error);
    res.status(500).json({
      error: 'Failed to segment customers',
      message: error.message
    });
  }
});

/**
 * GET /api/ltv-modeling/average-ltv
 * Step 3: Calculate average LTV per segment
 */
router.get('/average-ltv', async (req, res) => {
  try {
    const segmentBy = req.query.segmentBy || 'acquisitionChannel';

    const result = await ltvService.calculateAverageLTVPerSegment(segmentBy);
    res.json(result);
  } catch (error) {
    console.error('Error calculating average LTV:', error);
    res.status(500).json({
      error: 'Failed to calculate average LTV',
      message: error.message
    });
  }
});

/**
 * POST /api/ltv-modeling/predict
 * Step 4: Predict new customer LTV
 */
router.post('/predict', async (req, res) => {
  try {
    const customerFeatures = req.body;

    const result = await ltvService.predictNewCustomerLTV(customerFeatures);
    res.json(result);
  } catch (error) {
    console.error('Error predicting LTV:', error);
    res.status(500).json({
      error: 'Failed to predict LTV',
      message: error.message
    });
  }
});

/**
 * GET /api/ltv-modeling/predict/sample
 * Get sample prediction with default features
 */
router.get('/predict/sample', async (req, res) => {
  try {
    const acquisitionChannel = req.query.channel || 'organic';
    const subscriptionType = req.query.subscription || 'premium_monthly';

    const customerFeatures = {
      acquisitionChannel,
      subscriptionType,
      isNewCustomer: true,
      firstTransactionAmount: parseFloat(req.query.firstAmount) || 9.99
    };

    const result = await ltvService.predictNewCustomerLTV(customerFeatures);
    res.json(result);
  } catch (error) {
    console.error('Error generating sample prediction:', error);
    res.status(500).json({
      error: 'Failed to generate sample prediction',
      message: error.message
    });
  }
});

/**
 * GET /api/ltv-modeling/analytics
 * Step 5: Display comprehensive LTV analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const options = {
      segmentBy: req.query.segmentBy || 'acquisitionChannel',
      includePredictions: req.query.includePredictions !== 'false',
      topSegments: parseInt(req.query.topSegments) || 10
    };

    const result = await ltvService.getLTVAnalytics(options);
    res.json(result);
  } catch (error) {
    console.error('Error generating LTV analytics:', error);
    res.status(500).json({
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/ltv-modeling/dashboard
 * Get simplified dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const analytics = await ltvService.getLTVAnalytics({
      segmentBy: 'acquisitionChannel',
      topSegments: 5
    });

    // Simplify for dashboard
    const dashboard = {
      summary: {
        totalCustomers: analytics.overview.totalCustomersAnalyzed,
        totalRevenue: analytics.overview.totalRevenue,
        avgLTV: analytics.overview.avgLTV,
        medianLTV: analytics.overview.medianLTV,
        topSegmentLTV: analytics.segments[0]?.avgLTV || 0,
        bottomSegmentLTV: analytics.segments[analytics.segments.length - 1]?.avgLTV || 0,
        ltvRange: {
          p10: analytics.overview.ltvDistribution.p10,
          p25: analytics.overview.ltvDistribution.p25,
          p50: analytics.overview.ltvDistribution.p50,
          p75: analytics.overview.ltvDistribution.p75,
          p90: analytics.overview.ltvDistribution.p90
        }
      },
      segments: analytics.segments.map(s => ({
        name: s.name,
        avgLTV: s.avgLTV,
        customerCount: s.customerCount,
        revenueShare: s.revenueShare
      })),
      insights: analytics.insights,
      generatedAt: analytics.generatedAt
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    res.status(500).json({
      error: 'Failed to generate dashboard data',
      message: error.message
    });
  }
});

/**
 * DELETE /api/ltv-modeling/cache
 * Clear LTV modeling cache
 */
router.delete('/cache', async (req, res) => {
  try {
    const result = ltvService.clearCache();
    res.json(result);
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/ltv-modeling/export
 * Export LTV data as CSV
 */
router.get('/export', async (req, res) => {
  try {
    const segmentBy = req.query.segmentBy || 'acquisitionChannel';
    const analytics = await ltvService.getLTVAnalytics({ segmentBy });

    // Build CSV
    const csvHeaders = [
      'Segment',
      'Customer Count',
      'Average LTV',
      'Median LTV',
      'LTV Range (Min)',
      'LTV Range (Max)',
      'Revenue Share',
      'Confidence',
      'Avg Lifetime (Months)',
      'Avg Transaction Value'
    ].join(',');

    const csvRows = analytics.segmentComparison.map(segment => {
      return [
        segment.segment,
        segment.metrics.customerCount,
        segment.metrics.avgLTV.toFixed(2),
        segment.metrics.medianLTV.toFixed(2),
        segment.variance.range.min.toFixed(2),
        segment.variance.range.max.toFixed(2),
        (analytics.segments.find(s => s.name === segment.segment)?.revenueShare * 100).toFixed(2) + '%',
        analytics.segments.find(s => s.name === segment.segment)?.confidence || 'N/A',
        segment.metrics.avgLifetimeMonths.toFixed(1),
        segment.metrics.avgTransactionValue.toFixed(2)
      ].join(',');
    });

    const csv = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ltv_analysis_${segmentBy}_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      error: 'Failed to export data',
      message: error.message
    });
  }
});

export default router;
