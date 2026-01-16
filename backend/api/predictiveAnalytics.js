import express from 'express';
const router = express.Router();
import PredictiveAnalyticsService from '../services/predictiveAnalyticsService.js';

const service = new PredictiveAnalyticsService();

/**
 * @route   GET /api/predictive-analytics/forecast
 * @desc    Generate complete forecast with all models
 * @query   period - Historical period (default: 90d)
 * @query   horizon - Forecast horizon in days (default: 30)
 * @query   metric - Metric to forecast (default: revenue)
 * @query   model - Forecasting model (default: ensemble)
 * @access  Private
 */
router.get('/forecast', async (req, res) => {
  try {
    const { period = '90d', horizon = 30, metric = 'revenue', model = 'ensemble' } = req.query;

    const forecast = await service.generateForecast(
      period,
      parseInt(horizon),
      metric,
      model
    );

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/predictive-analytics/historical
 * @desc    Get historical trend analysis
 * @query   period - Historical period (default: 90d)
 * @query   metric - Metric to analyze (default: revenue)
 * @access  Private
 */
router.get('/historical', async (req, res) => {
  try {
    const { period = '90d', metric = 'revenue' } = req.query;

    const historical = await service.analyzeHistoricalTrends(period, metric);

    res.json({
      success: true,
      data: historical
    });
  } catch (error) {
    console.error('Error analyzing historical trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/predictive-analytics/forecast
 * @desc    Apply specific forecasting model
 * @body    historicalData - Historical trend analysis data
 * @body    horizon - Forecast horizon in days
 * @body    model - Forecasting model to apply
 * @access  Private
 */
router.post('/forecast/model', async (req, res) => {
  try {
    const { historicalData, horizon = 30, model = 'ensemble' } = req.body;

    if (!historicalData) {
      return res.status(400).json({
        success: false,
        error: 'historicalData is required'
      });
    }

    const forecast = await service.applyForecastingModel(historicalData, horizon, model);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error applying forecasting model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/predictive-analytics/projections
 * @desc    Generate future projections
 * @body    forecastData - Forecast data from model
 * @body    historicalData - Historical data for comparison
 * @access  Private
 */
router.post('/forecast/projections', async (req, res) => {
  try {
    const { forecastData, historicalData } = req.body;

    if (!forecastData || !historicalData) {
      return res.status(400).json({
        success: false,
        error: 'forecastData and historicalData are required'
      });
    }

    const projections = await service.generateFutureProjections(forecastData, historicalData);

    res.json({
      success: true,
      data: projections
    });
  } catch (error) {
    console.error('Error generating projections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/predictive-analytics/confidence-intervals
 * @desc    Calculate confidence intervals for projections
 * @body    projections - Projection data
 * @body    historicalData - Historical data
 * @body    confidenceLevel - Confidence level (default: 0.95)
 * @access  Private
 */
router.post('/forecast/confidence-intervals', async (req, res) => {
  try {
    const { projections, historicalData, confidenceLevel = 0.95 } = req.body;

    if (!projections || !historicalData) {
      return res.status(400).json({
        success: false,
        error: 'projections and historicalData are required'
      });
    }

    const intervals = await service.calculateConfidenceIntervals(
      projections,
      historicalData,
      confidenceLevel
    );

    res.json({
      success: true,
      data: intervals
    });
  } catch (error) {
    console.error('Error calculating confidence intervals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/predictive-analytics/summary
 * @desc    Get quick forecast summary
 * @query   period - Historical period (default: 90d)
 * @query   horizon - Forecast horizon (default: 30)
 * @access  Private
 */
router.get('/summary', async (req, res) => {
  try {
    const { period = '90d', horizon = 30 } = req.query;

    const forecast = await service.generateForecast(period, parseInt(horizon), 'revenue', 'ensemble');

    const summary = {
      historical: {
        period: forecast.historical.period,
        currentRevenue: forecast.historical.timeSeries[forecast.historical.timeSeries.length - 1].value,
        avgRevenue: forecast.historical.statistics.mean,
        growthRate: forecast.historical.statistics.avgDailyGrowthRate,
        trend: forecast.historical.statistics.trendDirection
      },
      projections: {
        totalProjected: forecast.projections.summary.totalProjected,
        avgDaily: forecast.projections.summary.averageDaily,
        finalValue: forecast.projections.summary.finalValue,
        growthVsHistorical: forecast.projections.summary.growthVsHistorical
      },
      confidence: {
        level: forecast.confidenceIntervals.confidenceLevel,
        totalLower: forecast.confidenceIntervals.summary.totalLower,
        totalUpper: forecast.confidenceIntervals.summary.totalUpper,
        avgMargin: forecast.confidenceIntervals.summary.avgMargin,
        marginPercentage: forecast.confidenceIntervals.summary.marginPercentage
      },
      model: forecast.forecast.modelMetrics
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting forecast summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/predictive-analytics/models
 * @desc    Get available forecasting models
 * @access  Private
 */
router.get('/models', (req, res) => {
  const models = [
    {
      id: 'linear',
      name: 'Linear Regression',
      description: 'Best for steady trends with consistent growth or decline',
      parameters: ['slope', 'intercept']
    },
    {
      id: 'exponential',
      name: 'Exponential Smoothing',
      description: 'Best for stable data with no clear trend',
      parameters: ['alpha']
    },
    {
      id: 'moving_average',
      name: 'Moving Average',
      description: 'Best for volatile data with short-term fluctuations',
      parameters: ['window']
    },
    {
      id: 'double_exponential',
      name: 'Double Exponential Smoothing',
      description: 'Best for data with trend but no seasonality',
      parameters: ['alpha', 'beta']
    },
    {
      id: 'holt_winters',
      name: 'Triple Exponential Smoothing (Holt-Winters)',
      description: 'Best for data with both trend and seasonality',
      parameters: ['alpha', 'beta', 'gamma', 'seasonLength']
    },
    {
      id: 'ensemble',
      name: 'Ensemble Model',
      description: 'Combines multiple models for balanced predictions',
      parameters: ['weights']
    }
  ];

  res.json({
    success: true,
    data: models
  });
});

/**
 * @route   GET /api/predictive-analytics/compare
 * @desc    Compare different forecasting models
 * @query   period - Historical period (default: 90d)
 * @query   horizon - Forecast horizon (default: 30)
 * @access  Private
 */
router.get('/compare', async (req, res) => {
  try {
    const { period = '90d', horizon = 30 } = req.query;

    const models = ['linear', 'exponential', 'moving_average', 'ensemble'];
    const comparisons = [];

    for (const model of models) {
      try {
        const forecast = await service.generateForecast(period, parseInt(horizon), 'revenue', model);
        comparisons.push({
          model: model,
          modelMetrics: forecast.forecast.modelMetrics,
          projections: forecast.projections.summary,
          confidence: forecast.confidenceIntervals.summary
        });
      } catch (error) {
        console.error(`Error with model ${model}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: comparisons
    });
  } catch (error) {
    console.error('Error comparing models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/predictive-analytics/cache/clear
 * @desc    Clear forecast cache
 * @access  Private
 */
router.post('/cache/clear', (req, res) => {
  try {
    service.clearCache();

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

/**
 * @route   GET /api/predictive-analytics/insights
 * @desc    Get forecast insights only
 * @query   period - Historical period (default: 90d)
 * @query   horizon - Forecast horizon (default: 30)
 * @access  Private
 */
router.get('/insights', async (req, res) => {
  try {
    const { period = '90d', horizon = 30 } = req.query;

    const forecast = await service.generateForecast(period, parseInt(horizon), 'revenue', 'ensemble');

    res.json({
      success: true,
      data: {
        insights: forecast.insights,
        recommendations: forecast.recommendations
      }
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/predictive-analytics/scenarios
 * @desc    Generate forecast scenarios (optimistic, base, pessimistic)
 * @query   period - Historical period (default: 90d)
 * @query   horizon - Forecast horizon (default: 30)
 * @access  Private
 */
router.get('/scenarios', async (req, res) => {
  try {
    const { period = '90d', horizon = 30 } = req.query;

    // Base case forecast
    const baseForecast = await service.generateForecast(period, parseInt(horizon), 'revenue', 'ensemble');

    // Optimistic scenario (95th percentile)
    const optimistic = {
      projections: baseForecast.confidenceIntervals.intervals.map(i => ({
        date: i.date,
        value: i.upperBound
      })),
      description: 'Best-case scenario based on 95% confidence interval'
    };

    // Pessimistic scenario (5th percentile)
    const pessimistic = {
      projections: baseForecast.confidenceIntervals.intervals.map(i => ({
        date: i.date,
        value: i.lowerBound
      })),
      description: 'Worst-case scenario based on 5% confidence interval'
    };

    res.json({
      success: true,
      data: {
        optimistic,
        base: baseForecast.projections,
        pessimistic
      }
    });
  } catch (error) {
    console.error('Error generating scenarios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
