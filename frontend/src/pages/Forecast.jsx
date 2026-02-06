import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './Forecast.css';

const Forecast = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [horizon, setHorizon] = useState(30);
  const [model, setModel] = useState('ensemble');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);

  useEffect(() => {
    fetchForecast();
  }, [period, horizon, model, confidenceLevel]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/predictive-analytics/forecast?period=${period}&horizon=${horizon}&metric=revenue&model=${model}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setForecastData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch forecast');
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchForecast();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="forecast-container">
        <div className="forecast-header">
          <h1>🔮 Predictive Analytics</h1>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating forecast...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forecast-container">
        <div className="forecast-header">
          <h1>🔮 Predictive Analytics</h1>
        </div>
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={handleRefresh} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (!forecastData) {
    return null;
  }

  // Prepare chart data
  const historicalData = forecastData.historical.timeSeries.map(d => ({
    date: formatDate(d.date),
    actual: d.value,
    type: 'Historical'
  }));

  const projectionData = forecastData.projections.projections.map((d, i) => {
    const interval = forecastData.confidenceIntervals.intervals[i];
    return {
      date: formatDate(d.date),
      forecast: d.value,
      lowerBound: interval?.lowerBound || 0,
      upperBound: interval?.upperBound || 0,
      type: 'Forecast'
    };
  });

  const combinedData = [...historicalData, ...projectionData];

  const summary = forecastData.projections.summary;
  const historicalSummary = forecastData.historical.statistics;
  const confidenceSummary = forecastData.confidenceIntervals.summary;

  return (
    <div className="forecast-container">
      <div className="forecast-header">
        <h1>🔮 Predictive Analytics</h1>
        <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="forecast-controls">
        <div className="control-group">
          <label>Historical Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="30d">30 Days</option>
            <option value="60d">60 Days</option>
            <option value="90d">90 Days</option>
            <option value="180d">180 Days</option>
          </select>
        </div>

        <div className="control-group">
          <label>Forecast Horizon:</label>
          <select value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value))}>
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
            <option value={60}>60 Days</option>
            <option value={90}>90 Days</option>
          </select>
        </div>

        <div className="control-group">
          <label>Forecast Model:</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="ensemble">Ensemble (Recommended)</option>
            <option value="linear">Linear Regression</option>
            <option value="exponential">Exponential Smoothing</option>
            <option value="moving_average">Moving Average</option>
          </select>
        </div>

        <div className="control-group">
          <label>Confidence Level:</label>
          <select value={confidenceLevel} onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}>
            <option value={0.90}>90%</option>
            <option value={0.95}>95%</option>
            <option value={0.99}>99%</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="forecast-summary">
        <div className="summary-card">
          <h3>Current Trend</h3>
          <div className={`trend-indicator ${historicalSummary.trendDirection}`}>
            {historicalSummary.trendDirection === 'increasing' ? '📈' :
             historicalSummary.trendDirection === 'decreasing' ? '📉' : '➡️'}
            <span className="trend-text">{historicalSummary.trendDirection}</span>
          </div>
          <p className="metric-value">{historicalSummary.avgDailyGrowthRate.toFixed(2)}% daily growth</p>
        </div>

        <div className="summary-card">
          <h3>Projected Total</h3>
          <p className="metric-value">{formatCurrency(summary.totalProjected)}</p>
          <p className="metric-subtitle">Over {horizon} days</p>
        </div>

        <div className="summary-card">
          <h3>Final Projection</h3>
          <p className="metric-value">{formatCurrency(summary.finalValue)}</p>
          <p className="metric-subtitle">
            {summary.growthVsHistorical > 0 ? '+' : ''}{summary.growthVsHistorical.toFixed(1)}% vs historical
          </p>
        </div>

        <div className="summary-card">
          <h3>Confidence Range</h3>
          <p className="metric-value">
            {formatCurrency(confidenceSummary.totalLower)} - {formatCurrency(confidenceSummary.totalUpper)}
          </p>
          <p className="metric-subtitle">{(confidenceLevel * 100).toFixed(0)}% confidence</p>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div className="forecast-chart-container">
        <h2>Revenue Forecast with Confidence Intervals</h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis
              dataKey="date"
              stroke="#a0a0a0"
              tick={{ fill: '#a0a0a0' }}
            />
            <YAxis
              stroke="#a0a0a0"
              tick={{ fill: '#a0a0a0' }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#16213e',
                border: '1px solid #2d3561',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#eaeaea' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend />

            {/* Confidence interval area */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stackId="1"
              stroke="#7b2cbf"
              fill="#7b2cbf"
              fillOpacity={0.1}
              name="Upper Bound"
              hide
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stackId="2"
              stroke="#7b2cbf"
              fill="#7b2cbf"
              fillOpacity={0.1}
              name="Lower Bound"
              hide
            />

            {/* Historical actuals */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#00d26a"
              strokeWidth={2}
              dot={false}
              name="Actual Revenue"
              connectNulls={false}
            />

            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#e94560"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name="Forecast"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="forecast-insights">
        <h2>💡 Insights</h2>
        <div className="insights-grid">
          {forecastData.insights.map((insight, index) => (
            <div key={index} className={`insight-card priority-${insight.priority}`}>
              <div className="insight-header">
                <span className="insight-icon">
                  {insight.type === 'growth' && '📈'}
                  {insight.type === 'warning' && '⚠️'}
                  {insight.type === 'accuracy' && '🎯'}
                  {insight.type === 'seasonality' && '🔄'}
                  {insight.type === 'opportunity' && '🚀'}
                </span>
                <h3>{insight.title}</h3>
                <span className={`priority-badge ${insight.priority}`}>
                  {insight.priority}
                </span>
              </div>
              <p>{insight.description}</p>
              {insight.actionable && (
                <span className="actionable-badge">✓ Actionable</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="forecast-recommendations">
        <h2>🎯 Recommendations</h2>
        <div className="recommendations-grid">
          {forecastData.recommendations.map((rec, index) => (
            <div key={index} className={`recommendation-card impact-${rec.impact}`}>
              <div className="recommendation-header">
                <h3>{rec.action}</h3>
                <div className="impact-effort-tags">
                  <span className={`impact-tag ${rec.impact}`}>Impact: {rec.impact}</span>
                  <span className={`effort-tag ${rec.effort}`}>Effort: {rec.effort}</span>
                </div>
              </div>
              <p className="recommendation-description">{rec.description}</p>
              <p className="recommendation-rationale">
                <strong>Rationale:</strong> {rec.rationale}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Model Information */}
      <div className="forecast-model-info">
        <h2>📊 Model Information</h2>
        <div className="model-details">
          <div className="model-detail">
            <span className="detail-label">Model Type:</span>
            <span className="detail-value">{forecastData.forecast.modelMetrics.type}</span>
          </div>
          {forecastData.forecast.modelMetrics.components && (
            <div className="model-detail">
              <span className="detail-label">Components:</span>
              <span className="detail-value">
                {forecastData.forecast.modelMetrics.components.join(', ')}
              </span>
            </div>
          )}
          {forecastData.forecast.modelMetrics.weights && (
            <div className="model-detail">
              <span className="detail-label">Weights:</span>
              <span className="detail-value">
                {Object.entries(forecastData.forecast.modelMetrics.weights).map(([key, value]) =>
                  `${key}: ${(value * 100).toFixed(0)}%`
                ).join(', ')}
              </span>
            </div>
          )}
          <div className="model-detail">
            <span className="detail-label">Confidence:</span>
            <span className="detail-value">{(confidenceLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="model-detail">
            <span className="detail-label">Margin of Error:</span>
            <span className="detail-value">
              ±{confidenceSummary.marginPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Statistics Table */}
      <div className="forecast-statistics">
        <h2>📈 Historical Statistics</h2>
        <table className="statistics-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Period</td>
              <td>{forecastData.historical.period}</td>
            </tr>
            <tr>
              <td>Data Points</td>
              <td>{forecastData.historical.dataPoints}</td>
            </tr>
            <tr>
              <td>Mean</td>
              <td>{formatCurrency(historicalSummary.mean)}</td>
            </tr>
            <tr>
              <td>Standard Deviation</td>
              <td>{formatCurrency(historicalSummary.stdDev)}</td>
            </tr>
            <tr>
              <td>Minimum</td>
              <td>{formatCurrency(historicalSummary.min)}</td>
            </tr>
            <tr>
              <td>Maximum</td>
              <td>{formatCurrency(historicalSummary.max)}</td>
            </tr>
            <tr>
              <td>Total Growth</td>
              <td>{historicalSummary.totalGrowth.toFixed(2)}%</td>
            </tr>
            <tr>
              <td>Avg Daily Growth Rate</td>
              <td>{historicalSummary.avgDailyGrowthRate.toFixed(4)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Forecast;
