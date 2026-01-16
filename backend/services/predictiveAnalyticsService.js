import mongoose from 'mongoose';
import { calculateLinearRegression, calculateExponentialSmoothing, calculateMovingAverage } from '../utils/forecastingUtils.js';

/**
 * Predictive Analytics Service for Growth Forecasting
 * Implements multiple forecasting models with confidence intervals
 */
class PredictiveAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Analyze historical trends
   * Extract and analyze historical data for forecasting
   */
  async analyzeHistoricalTrends(period = '90d', metric = 'revenue') {
    try {
      const days = parseInt(period) || 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Try to fetch from marketing_revenue collection first
      let historicalData = [];
      try {
        let Revenue;
        try {
          Revenue = mongoose.model('MarketingRevenue');
        } catch (e) {
          Revenue = mongoose.model('MarketingRevenue', new mongoose.Schema({}, { strict: false }), 'marketing_revenue');
        }

        historicalData = await Revenue.find({
          date: { $gte: startDate },
          period: 'daily'
        }).sort({ date: 1 });
      } catch (dbError) {
        console.log('No marketing_revenue collection found, using dashboard data');
      }

      // If no data from database, use the same mock data as dashboard
      if (historicalData.length === 0) {
        historicalData = this.generateMockRevenueData(days, startDate);
      }

      if (historicalData.length === 0) {
        throw new Error('No historical data available for forecasting');
      }

      // Extract time series data
      const timeSeries = historicalData.map((record, index) => ({
        date: record.date,
        value: record[metric] || record.netRevenue || 0,
        index: index + 1
      }));

      // Calculate trend statistics
      const values = timeSeries.map(d => d.value);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Calculate growth rate
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const totalGrowth = ((lastValue - firstValue) / firstValue) * 100;
      const avgDailyGrowthRate = totalGrowth / days;

      // Identify trend direction
      let trendDirection = 'stable';
      if (avgDailyGrowthRate > 0.1) trendDirection = 'increasing';
      else if (avgDailyGrowthRate < -0.1) trendDirection = 'decreasing';

      // Detect seasonality (simplified)
      const seasonality = this.detectSeasonality(timeSeries);

      return {
        timeSeries,
        statistics: {
          mean,
          variance,
          stdDev,
          min: Math.min(...values),
          max: Math.max(...values),
          totalGrowth,
          avgDailyGrowthRate,
          trendDirection
        },
        seasonality,
        dataPoints: timeSeries.length,
        period: `${days}d`
      };
    } catch (error) {
      console.error('Error analyzing historical trends:', error);
      throw error;
    }
  }

  /**
   * Step 2: Apply forecasting model
   * Apply multiple forecasting models to historical data
   */
  async applyForecastingModel(historicalData, forecastHorizon = 30, model = 'linear') {
    try {
      const { timeSeries, statistics } = historicalData;
      const values = timeSeries.map(d => d.value);

      let forecast = [];
      let modelMetrics = {};

      switch (model) {
        case 'linear':
          forecast = calculateLinearRegression(timeSeries, forecastHorizon);
          modelMetrics = {
            type: 'Linear Regression',
            r_squared: this.calculateRSquared(timeSeries, forecast),
            slope: forecast.slope,
            intercept: forecast.intercept
          };
          break;

        case 'exponential':
          forecast = calculateExponentialSmoothing(values, forecastHorizon);
          modelMetrics = {
            type: 'Exponential Smoothing',
            alpha: forecast.alpha,
            mse: forecast.mse
          };
          break;

        case 'moving_average':
          forecast = calculateMovingAverage(values, forecastHorizon);
          modelMetrics = {
            type: 'Moving Average',
            window: forecast.window,
            mse: forecast.mse
          };
          break;

        case 'ensemble':
          // Combine all models
          const linearForecast = calculateLinearRegression(timeSeries, forecastHorizon);
          const expForecast = calculateExponentialSmoothing(values, forecastHorizon);
          const maForecast = calculateMovingAverage(values, forecastHorizon);

          forecast = this.createEnsembleForecast(linearForecast, expForecast, maForecast);
          modelMetrics = {
            type: 'Ensemble Model',
            components: ['Linear Regression', 'Exponential Smoothing', 'Moving Average'],
            weights: { linear: 0.4, exponential: 0.3, moving_average: 0.3 }
          };
          break;

        default:
          throw new Error(`Unknown forecasting model: ${model}`);
      }

      return {
        forecast,
        modelMetrics,
        horizon: forecastHorizon
      };
    } catch (error) {
      console.error('Error applying forecasting model:', error);
      throw error;
    }
  }

  /**
   * Step 3: Generate future projections
   * Generate date-based projections with forecasted values
   */
  async generateFutureProjections(forecastData, historicalData) {
    try {
      const { forecast, horizon } = forecastData;
      const { timeSeries } = historicalData;
      const lastDate = new Date(timeSeries[timeSeries.length - 1].date);

      // Generate projection dates
      const projections = [];
      for (let i = 1; i <= horizon; i++) {
        const projectionDate = new Date(lastDate);
        projectionDate.setDate(projectionDate.getDate() + i);

        const forecastValue = Array.isArray(forecast) ? forecast[i - 1] : forecast.values?.[i - 1];

        projections.push({
          date: projectionDate,
          value: forecastValue || 0,
          day: i
        });
      }

      // Calculate projected totals
      const totalProjectedValue = projections.reduce((sum, p) => sum + p.value, 0);
      const avgDailyProjection = totalProjectedValue / horizon;
      const lastProjection = projections[projections.length - 1];

      // Compare with historical
      const historicalAvg = historicalData.statistics.mean;
      const growthVsHistorical = ((avgDailyProjection - historicalAvg) / historicalAvg) * 100;

      return {
        projections,
        summary: {
          totalProjected: totalProjectedValue,
          averageDaily: avgDailyProjection,
          finalValue: lastProjection.value,
          growthVsHistorical,
          horizon
        }
      };
    } catch (error) {
      console.error('Error generating future projections:', error);
      throw error;
    }
  }

  /**
   * Step 4: Calculate confidence intervals
   * Calculate upper and lower confidence bounds for projections
   */
  async calculateConfidenceIntervals(projections, historicalData, confidenceLevel = 0.95) {
    try {
      const { statistics } = historicalData;
      const { stdDev, mean } = statistics;
      const projectionsList = projections.projections;

      // Calculate z-score for confidence level
      const zScore = this.getZScore(confidenceLevel);

      // Calculate standard error
      const n = historicalData.dataPoints;
      const standardError = stdDev / Math.sqrt(n);

      // Calculate confidence intervals for each projection
      const intervals = projectionsList.map((projection, index) => {
        const margin = zScore * standardError * Math.sqrt(1 + 1 / n + Math.pow(index + 1, 2) / (2 * n));

        return {
          date: projection.date,
          value: projection.value,
          lowerBound: Math.max(0, projection.value - margin),
          upperBound: projection.value + margin,
          margin: margin,
          range: margin * 2
        };
      });

      // Calculate aggregate confidence metrics
      const totalLower = intervals.reduce((sum, i) => sum + i.lowerBound, 0);
      const totalUpper = intervals.reduce((sum, i) => sum + i.upperBound, 0);
      const avgMargin = intervals.reduce((sum, i) => sum + i.margin, 0) / intervals.length;

      return {
        intervals,
        confidenceLevel,
        summary: {
          totalLower,
          totalUpper,
          avgMargin,
          marginPercentage: (avgMargin / projections.summary.averageDaily) * 100,
          uncertainty: 'moderate'
        }
      };
    } catch (error) {
      console.error('Error calculating confidence intervals:', error);
      throw error;
    }
  }

  /**
   * Complete forecasting workflow
   * Combines all steps into a single comprehensive forecast
   */
  async generateForecast(period = '90d', horizon = 30, metric = 'revenue', model = 'ensemble') {
    try {
      const cacheKey = `${period}-${horizon}-${metric}-${model}`;

      // Check cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Step 1: Analyze historical trends
      const historicalData = await this.analyzeHistoricalTrends(period, metric);

      // Step 2: Apply forecasting model
      const forecastData = await this.applyForecastingModel(historicalData, horizon, model);

      // Step 3: Generate future projections
      const projections = await this.generateFutureProjections(forecastData, historicalData);

      // Step 4: Calculate confidence intervals
      const confidenceIntervals = await this.calculateConfidenceIntervals(projections, historicalData);

      // Generate insights and recommendations
      const insights = this.generateForecastInsights(historicalData, projections, confidenceIntervals);
      const recommendations = this.generateForecastRecommendations(historicalData, projections, confidenceIntervals);

      const result = {
        historical: historicalData,
        forecast: forecastData,
        projections,
        confidenceIntervals,
        insights,
        recommendations,
        metadata: {
          generatedAt: new Date(),
          period,
          horizon,
          metric,
          model
        }
      };

      // Cache result
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
      });

      return result;
    } catch (error) {
      console.error('Error generating forecast:', error);
      throw error;
    }
  }

  /**
   * Generate insights from forecast data
   */
  generateForecastInsights(historical, projections, confidence) {
    const insights = [];
    const { statistics } = historical;
    const { summary: projSummary } = projections;
    const { summary: confSummary } = confidence;

    // Insight 1: Growth trend
    if (statistics.avgDailyGrowthRate > 0.1) {
      insights.push({
        type: 'growth',
        priority: 'high',
        title: 'Positive Growth Trend Detected',
        description: `Historical data shows ${statistics.avgDailyGrowthRate.toFixed(2)}% average daily growth over the last ${historical.period}. This trend is projected to continue with ${projSummary.growthVsHistorical.toFixed(1)}% growth vs historical average.`,
        actionable: true
      });
    } else if (statistics.avgDailyGrowthRate < -0.1) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Declining Trend Detected',
        description: `Historical data shows ${Math.abs(statistics.avgDailyGrowthRate).toFixed(2)}% average daily decline over the last ${historical.period}. Immediate action recommended to reverse trend.`,
        actionable: true
      });
    }

    // Insight 2: Confidence level
    if (confSummary.marginPercentage < 10) {
      insights.push({
        type: 'accuracy',
        priority: 'low',
        title: 'High Confidence Forecast',
        description: `Forecast confidence intervals are tight (${confSummary.marginPercentage.toFixed(1)}% margin), indicating high model accuracy and low uncertainty.`,
        actionable: false
      });
    } else if (confSummary.marginPercentage > 30) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: 'High Forecast Uncertainty',
        description: `Forecast confidence intervals are wide (${confSummary.marginPercentage.toFixed(1)}% margin), indicating high uncertainty. Consider using additional data sources.`,
        actionable: true
      });
    }

    // Insight 3: Seasonality
    if (historical.seasonality.detected) {
      insights.push({
        type: 'seasonality',
        priority: 'medium',
        title: 'Seasonal Pattern Detected',
        description: historical.seasonality.pattern,
        actionable: true
      });
    }

    // Insight 4: Projection milestone
    const projectedIncrease = projSummary.finalValue - statistics.mean;
    const projectedIncreasePercent = (projectedIncrease / statistics.mean) * 100;

    if (projectedIncreasePercent > 20) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        title: 'Strong Growth Projected',
        description: `Forecast projects ${projectedIncreasePercent.toFixed(1)}% increase by end of forecast period (${projSummary.horizon} days). This represents significant growth opportunity.`,
        actionable: true
      });
    }

    return insights;
  }

  /**
   * Generate recommendations from forecast data
   */
  generateForecastRecommendations(historical, projections, confidence) {
    const recommendations = [];
    const { statistics } = historical;
    const { summary: projSummary } = projections;

    // Recommendation 1: Budget adjustment
    if (projSummary.growthVsHistorical > 10) {
      recommendations.push({
        action: 'Increase Marketing Budget',
        impact: 'high',
        effort: 'low',
        description: `Projected ${projSummary.growthVsHistorical.toFixed(1)}% growth suggests room to increase marketing spend to maximize momentum.`,
        rationale: 'Positive growth trend with strong projections'
      });
    } else if (projSummary.growthVsHistorical < -10) {
      recommendations.push({
        action: 'Review and Optimize Campaigns',
        impact: 'high',
        effort: 'medium',
        description: `Projected decline of ${Math.abs(projSummary.growthVsHistorical).toFixed(1)}% requires immediate campaign optimization and strategy review.`,
        rationale: 'Negative trend needs intervention'
      });
    }

    // Recommendation 2: Content strategy
    if (statistics.trendDirection === 'increasing') {
      recommendations.push({
        action: 'Scale Winning Content Strategies',
        impact: 'high',
        effort: 'medium',
        description: 'Continue and scale content strategies that are driving growth. Focus on high-performing categories and formats.',
        rationale: 'Current strategies are working well'
      });
    }

    // Recommendation 3: Monitoring frequency
    const confidenceWidth = confidence.summary.marginPercentage;
    if (confidenceWidth > 20) {
      recommendations.push({
        action: 'Increase Forecast Monitoring',
        impact: 'medium',
        effort: 'low',
        description: 'Update forecasts weekly instead of monthly due to higher uncertainty. Track actuals vs projections closely.',
        rationale: 'Higher uncertainty requires closer monitoring'
      });
    }

    return recommendations;
  }

  /**
   * Detect seasonality in time series data
   */
  detectSeasonality(timeSeries) {
    // Simplified seasonality detection
    const values = timeSeries.map(d => d.value);
    const n = values.length;

    // Check for weekly patterns (7-day cycle)
    if (n >= 14) {
      const weeklyPattern = this.checkWeeklyPattern(timeSeries);
      if (weeklyPattern.detected) {
        return {
          detected: true,
          pattern: weeklyPattern.description,
          cycle: 'weekly'
        };
      }
    }

    // Check for monthly patterns
    if (n >= 30) {
      const monthlyPattern = this.checkMonthlyPattern(timeSeries);
      if (monthlyPattern.detected) {
        return {
          detected: true,
          pattern: monthlyPattern.description,
          cycle: 'monthly'
        };
      }
    }

    return {
      detected: false,
      pattern: 'No clear seasonal pattern detected',
      cycle: null
    };
  }

  checkWeeklyPattern(timeSeries) {
    const valuesByDay = [0, 0, 0, 0, 0, 0, 0];
    const countsByDay = [0, 0, 0, 0, 0, 0, 0];

    timeSeries.forEach(d => {
      const dayOfWeek = new Date(d.date).getDay();
      valuesByDay[dayOfWeek] += d.value;
      countsByDay[dayOfWeek]++;
    });

    const avgByDay = valuesByDay.map((sum, i) => countsByDay[i] > 0 ? sum / countsByDay[i] : 0);
    const overallAvg = avgByDay.reduce((sum, v) => sum + v, 0) / 7;

    // Check if any day is 20% above or below average
    const significantDeviation = avgByDay.some(avg => Math.abs(avg - overallAvg) / overallAvg > 0.2);

    return {
      detected: significantDeviation,
      description: significantDeviation ? 'Weekly pattern detected with variations by day of week' : ''
    };
  }

  checkMonthlyPattern(timeSeries) {
    // Simplified monthly pattern detection
    const values = timeSeries.map(d => d.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const difference = Math.abs(secondHalfAvg - firstHalfAvg) / firstHalfAvg;

    return {
      detected: difference > 0.15,
      description: difference > 0.15 ? 'Monthly pattern detected with significant changes over time' : ''
    };
  }

  /**
   * Create ensemble forecast from multiple models
   */
  createEnsembleForecast(linear, exp, ma) {
    const weights = { linear: 0.4, exponential: 0.3, moving_average: 0.3 };
    const values = [];
    const length = Math.max(
      Array.isArray(linear) ? linear.length : linear.values?.length || 0,
      Array.isArray(exp) ? exp.length : exp.values?.length || 0,
      Array.isArray(ma) ? ma.length : ma.values?.length || 0
    );

    for (let i = 0; i < length; i++) {
      const linearVal = Array.isArray(linear) ? linear[i] : linear.values?.[i] || 0;
      const expVal = Array.isArray(exp) ? exp[i] : exp.values?.[i] || 0;
      const maVal = Array.isArray(ma) ? ma[i] : ma.values?.[i] || 0;

      values.push(
        linearVal * weights.linear +
        expVal * weights.exponential +
        maVal * weights.moving_average
      );
    }

    return {
      values,
      method: 'ensemble',
      weights
    };
  }

  /**
   * Calculate R-squared for linear regression
   */
  calculateRSquared(timeSeries, forecast) {
    const values = timeSeries.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    let ssRes = 0;
    let ssTot = 0;

    const forecastValues = Array.isArray(forecast) ? forecast : forecast.values || [];

    values.forEach((actual, i) => {
      const predicted = forecastValues[i] || mean;
      ssRes += Math.pow(actual - predicted, 2);
      ssTot += Math.pow(actual - mean, 2);
    });

    return 1 - (ssRes / ssTot);
  }

  /**
   * Get z-score for confidence level
   */
  getZScore(confidenceLevel) {
    const zScores = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidenceLevel] || 1.96;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Generate mock revenue data (same as dashboard)
   */
  generateMockRevenueData(days, startDate) {
    const data = [];
    let dailyRevenue = 15; // ~$450/month initially
    let cumulativeRevenue = 4000; // Starting MRR base

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);

      // Simulate revenue growth with momentum
      const revenueGrowth = 0.5 + (Math.random() * 1.5); // $0.50-$2.00 growth per day
      dailyRevenue += revenueGrowth;

      // Add daily variation
      const revenueVariation = (Math.random() - 0.5) * 3;
      dailyRevenue += revenueVariation;

      // Ensure minimum revenue
      dailyRevenue = Math.max(dailyRevenue, 10);

      cumulativeRevenue += dailyRevenue;

      data.push({
        date: date,
        netRevenue: Math.round(dailyRevenue * 100) / 100,
        period: 'daily'
      });
    }

    return data;
  }
}

export default PredictiveAnalyticsService;
