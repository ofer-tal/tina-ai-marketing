/**
 * Forecasting Utilities
 * Mathematical functions for time series forecasting
 */

/**
 * Linear Regression Forecasting
 * y = mx + b
 */
function calculateLinearRegression(timeSeries, horizon) {
  const n = timeSeries.length;
  const values = timeSeries.map(d => d.value);

  // Calculate sums
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  values.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast
  const forecast = [];
  const lastX = n - 1;

  for (let i = 1; i <= horizon; i++) {
    const x = lastX + i;
    const y = slope * x + intercept;
    forecast.push(Math.max(0, y)); // Ensure non-negative
  }

  return {
    values: forecast,
    slope,
    intercept,
    rSquared: null // Will be calculated by service
  };
}

/**
 * Exponential Smoothing (Simple Exponential Smoothing)
 * F(t) = alpha * Y(t-1) + (1 - alpha) * F(t-1)
 */
function calculateExponentialSmoothing(values, horizon, alpha = 0.3) {
  const n = values.length;

  // Initialize forecast with first value
  const forecasts = [values[0]];

  // Calculate historical forecasts
  for (let i = 1; i < n; i++) {
    const forecast = alpha * values[i - 1] + (1 - alpha) * forecasts[i - 1];
    forecasts.push(forecast);
  }

  // Calculate Mean Squared Error
  let mse = 0;
  for (let i = 1; i < n; i++) {
    mse += Math.pow(values[i] - forecasts[i], 2);
  }
  mse = mse / (n - 1);

  // Generate future forecast
  const futureForecast = [];
  const lastForecast = forecasts[n - 1];

  for (let i = 0; i < horizon; i++) {
    // For exponential smoothing, future forecast equals last forecast
    futureForecast.push(Math.max(0, lastForecast));
  }

  return {
    values: futureForecast,
    alpha,
    mse,
    historicalForecasts: forecasts
  };
}

/**
 * Moving Average Forecasting
 * Simple Moving Average with specified window
 */
function calculateMovingAverage(values, horizon, windowSize = null) {
  const n = values.length;

  // Determine optimal window size (typically sqrt(n) or n/3)
  if (!windowSize) {
    windowSize = Math.max(3, Math.min(14, Math.floor(Math.sqrt(n))));
  }

  const averages = [];

  // Calculate moving averages
  for (let i = windowSize - 1; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += values[i - j];
    }
    averages.push(sum / windowSize);
  }

  // Calculate MSE
  let mse = 0;
  let count = 0;
  for (let i = windowSize - 1; i < n; i++) {
    mse += Math.pow(values[i] - averages[i - windowSize + 1], 2);
    count++;
  }
  mse = mse / count;

  // Generate future forecast (last moving average)
  const lastAverage = averages[averages.length - 1];
  const futureForecast = [];

  for (let i = 0; i < horizon; i++) {
    futureForecast.push(Math.max(0, lastAverage));
  }

  return {
    values: futureForecast,
    window: windowSize,
    mse,
    historicalAverages: averages
  };
}

/**
 * Double Exponential Smoothing (Holt's Method)
 * For trending data
 */
function calculateDoubleExponentialSmoothing(timeSeries, horizon, alpha = 0.3, beta = 0.3) {
  const values = timeSeries.map(d => d.value);
  const n = values.length;

  // Initialize
  let level = values[0];
  let trend = values[1] - values[0];

  const levels = [level];
  const trends = [trend];
  const forecasts = [];

  // Calculate level and trend
  for (let i = 1; i < n; i++) {
    const newLevel = alpha * values[i] + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;

    level = newLevel;
    trend = newTrend;

    levels.push(level);
    trends.push(trend);
    forecasts.push(level + trend);
  }

  // Generate future forecast
  const futureForecast = [];
  for (let i = 1; i <= horizon; i++) {
    futureForecast.push(Math.max(0, level + i * trend));
  }

  return {
    values: futureForecast,
    alpha,
    beta,
    level,
    trend,
    historicalForecasts: forecasts
  };
}

/**
 * Triple Exponential Smoothing (Holt-Winters Method)
 * For seasonal data
 */
function calculateHoltWinters(timeSeries, horizon, alpha = 0.3, beta = 0.3, gamma = 0.3, seasonLength = 7) {
  const values = timeSeries.map(d => d.value);
  const n = values.length;

  // Initialize
  const level = values.slice(0, seasonLength).reduce((sum, v) => sum + v, 0) / seasonLength;
  const initialSeasonal = values.slice(0, seasonLength).map(v => v / level);

  let currentLevel = level;
  let currentTrend = 0;
  const seasonal = [...initialSeasonal];

  const forecasts = [];

  // Calculate level, trend, and seasonal components
  for (let i = seasonLength; i < n; i++) {
    const prevLevel = currentLevel;
    const seasonalIndex = i % seasonLength;

    currentLevel = alpha * (values[i] / seasonal[seasonalIndex]) + (1 - alpha) * (prevLevel + currentTrend);
    currentTrend = beta * (currentLevel - prevLevel) + (1 - beta) * currentTrend;
    seasonal[seasonalIndex] = gamma * (values[i] / currentLevel) + (1 - gamma) * seasonal[seasonalIndex];

    forecasts.push((currentLevel + currentTrend) * seasonal[(i + 1) % seasonLength]);
  }

  // Generate future forecast
  const futureForecast = [];
  for (let i = 1; i <= horizon; i++) {
    const seasonalIndex = (n - 1 + i) % seasonLength;
    futureForecast.push(Math.max(0, (currentLevel + i * currentTrend) * seasonal[seasonalIndex]));
  }

  return {
    values: futureForecast,
    alpha,
    beta,
    gamma,
    seasonLength,
    level: currentLevel,
    trend: currentTrend,
    seasonal
  };
}

/**
 * Calculate forecast accuracy metrics
 */
function calculateForecastAccuracy(actuals, forecasts) {
  const n = actuals.length;

  let sumErrors = 0;
  let sumAbsErrors = 0;
  let sumSquaredErrors = 0;
  let sumPercentErrors = 0;

  for (let i = 0; i < n; i++) {
    const actual = actuals[i];
    const forecast = forecasts[i];

    const error = actual - forecast;
    const absError = Math.abs(error);
    const squaredError = error * error;
    const percentError = Math.abs(error / actual) * 100;

    sumErrors += error;
    sumAbsErrors += absError;
    sumSquaredErrors += squaredError;
    sumPercentErrors += percentError;
  }

  return {
    ME: sumErrors / n, // Mean Error
    MAD: sumAbsErrors / n, // Mean Absolute Deviation
    MSE: sumSquaredErrors / n, // Mean Squared Error
    RMSE: Math.sqrt(sumSquaredErrors / n), // Root Mean Squared Error
    MAPE: sumPercentErrors / n, // Mean Absolute Percentage Error
    n: n
  };
}

/**
 * Calculate weighted moving average
 */
function calculateWeightedMovingAverage(values, horizon, weights = null) {
  const n = values.length;

  // Default weights: more recent values have higher weight
  if (!weights) {
    const windowSize = Math.max(3, Math.min(10, Math.floor(Math.sqrt(n))));
    weights = [];
    for (let i = 1; i <= windowSize; i++) {
      weights.push(i);
    }
    // Normalize weights
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);
  }

  const forecasts = [];
  const windowSize = weights.length;

  for (let i = windowSize - 1; i < n; i++) {
    let weightedSum = 0;
    for (let j = 0; j < windowSize; j++) {
      weightedSum += values[i - j] * weights[j];
    }
    forecasts.push(weightedSum);
  }

  // Generate future forecast
  const lastForecast = forecasts[forecasts.length - 1];
  const futureForecast = [];
  for (let i = 0; i < horizon; i++) {
    futureForecast.push(lastForecast);
  }

  return {
    values: futureForecast,
    weights,
    window: windowSize
  };
}

export {
  calculateLinearRegression,
  calculateExponentialSmoothing,
  calculateMovingAverage,
  calculateDoubleExponentialSmoothing,
  calculateHoltWinters,
  calculateForecastAccuracy,
  calculateWeightedMovingAverage
};
