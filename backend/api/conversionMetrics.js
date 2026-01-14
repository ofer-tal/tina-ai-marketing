/**
 * Conversion Metrics API Routes
 *
 * Provides endpoints for tracking and analyzing App Store conversion rates.
 * All routes are prefixed with /api/conversion
 *
 * Routes:
 * - GET /api/conversion/metrics - Get conversion metrics for date range
 * - GET /api/conversion/latest - Get latest conversion metrics
 * - GET /api/conversion/funnel - Get conversion funnel breakdown
 * - GET /api/conversion/history - Get conversion history for trends
 * - POST /api/conversion/sync - Sync conversion metrics from App Store Connect
 * - GET /api/conversion/summary - Get conversion summary statistics
 */

import express from 'express';
import ConversionMetricsService from '../services/conversionMetricsService.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'conversion-metrics');
const conversionService = new ConversionMetricsService();

/**
 * GET /api/conversion/metrics
 *
 * Get conversion metrics for a date range
 * Query params:
 * - startDate: ISO date string (optional, defaults to 30 days ago)
 * - endDate: ISO date string (optional, defaults to now)
 * - period: daily|weekly|monthly (optional, defaults to daily)
 */
router.get('/metrics', async (req, res) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
      });
    }

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date();

    if (!startDate) {
      start.setDate(start.getDate() - 30); // Default to 30 days
    }

    logger.info('Fetching conversion metrics', {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      period,
    });

    const metrics = await conversionService.getConversionMetrics(start, end, period);

    res.json({
      success: true,
      data: {
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        count: metrics.length,
        metrics,
      },
    });
  } catch (error) {
    logger.error('Error fetching conversion metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/conversion/latest
 *
 * Get the most recent conversion metrics
 * Query params:
 * - period: daily|weekly|monthly (optional, defaults to daily)
 */
router.get('/latest', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;

    logger.info('Fetching latest conversion metrics', { period });

    const latest = await conversionService.getLatestMetrics(period);

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No conversion metrics found',
      });
    }

    res.json({
      success: true,
      data: latest,
    });
  } catch (error) {
    logger.error('Error fetching latest metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/conversion/funnel
 *
 * Get conversion funnel breakdown for the latest period
 * Shows each stage with conversion rates and dropoff
 */
router.get('/funnel', async (req, res) => {
  try {
    logger.info('Fetching conversion funnel');

    const funnel = await conversionService.getConversionFunnel();

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'No conversion funnel data available',
      });
    }

    res.json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    logger.error('Error fetching conversion funnel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion funnel',
      message: error.message,
    });
  }
});

/**
 * GET /api/conversion/history
 *
 * Get conversion metrics history for trend analysis
 * Query params:
 * - days: Number of days to fetch (optional, defaults to 30)
 */
router.get('/history', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    logger.info('Fetching conversion history', { days });

    const history = await conversionService.getConversionHistory(parseInt(days));

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        dataPoints: history.length,
        history,
      },
    });
  } catch (error) {
    logger.error('Error fetching conversion history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion history',
      message: error.message,
    });
  }
});

/**
 * POST /api/conversion/sync
 *
 * Sync conversion metrics from App Store Connect
 * This would typically be called by a scheduled job
 * Query params:
 * - daysBack: Number of days to sync (optional, defaults to 7)
 */
router.post('/sync', async (req, res) => {
  try {
    const { daysBack = 7 } = req.body;

    logger.info('Syncing conversion metrics from App Store Connect', { daysBack });

    const results = await conversionService.syncConversionMetrics(parseInt(daysBack));

    res.json({
      success: true,
      data: {
        synced: results.length,
        startDate: results[0]?.date,
        endDate: results[results.length - 1]?.date,
        metrics: results,
      },
    });
  } catch (error) {
    logger.error('Error syncing conversion metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync conversion metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/conversion/summary
 *
 * Get conversion summary statistics
 * Provides overall conversion metrics and key insights
 */
router.get('/summary', async (req, res) => {
  try {
    logger.info('Fetching conversion summary');

    const latest = await conversionService.getLatestMetrics('daily');

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No conversion data available',
      });
    }

    // Calculate summary statistics
    const summary = {
      date: latest.date,
      overallConversionRate: latest.conversionRates.overallConversionRate,
      funnelStages: {
        impressions: latest.impressions,
        productPageViews: latest.productPageViews,
        downloads: latest.downloads,
        installs: latest.installs,
        accountSignups: latest.accountSignups,
        trialActivations: latest.trialActivations,
        paidSubscriptions: latest.paidSubscriptions,
      },
      conversionRates: latest.conversionRates,
      biggestDropoff: latest.getBiggestDropoff(),
      dataQuality: latest.dataQuality,
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error fetching conversion summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/conversion/rate
 *
 * Get specific conversion rate calculations
 * Query params:
 * - from: Source stage (impressions, productPageViews, downloads, etc.)
 * - to: Target stage (productPageViews, downloads, installs, etc.)
 * - days: Number of days to average over (optional, defaults to 7)
 */
router.get('/rate', async (req, res) => {
  try {
    const { from = 'impressions', to = 'downloads', days = 7 } = req.query;

    logger.info('Calculating conversion rate', { from, to, days });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const metrics = await conversionService.getConversionMetrics(startDate, new Date(), 'daily');

    if (metrics.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No metrics available for the specified period',
      });
    }

    // Calculate averages
    const fromSum = metrics.reduce((sum, m) => sum + (m[from] || 0), 0);
    const toSum = metrics.reduce((sum, m) => sum + (m[to] || 0), 0);
    const rate = fromSum > 0 ? (toSum / fromSum) * 100 : 0;

    res.json({
      success: true,
      data: {
        from,
        to,
        period: `${days} days`,
        fromTotal: fromSum,
        toTotal: toSum,
        conversionRate: rate.toFixed(2) + '%',
        dataPoints: metrics.length,
      },
    });
  } catch (error) {
    logger.error('Error calculating conversion rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate conversion rate',
      message: error.message,
    });
  }
});

export default router;
