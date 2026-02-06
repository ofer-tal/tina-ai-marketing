/**
 * Anomaly Detection Page
 *
 * Detects and displays anomalies in performance metrics.
 * Provides alerts, context, and recommendations for investigation.
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';

const AnomalyDetection = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [period, setPeriod] = useState(30);
  const [method, setMethod] = useState('zscore');
  const [threshold, setThreshold] = useState(2);
  const [baselineData, setBaselineData] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [contextData, setContextData] = useState(null);

  useEffect(() => {
    fetchSummary();
    fetchAvailableMetrics();
    fetchAvailableMethods();
  }, [period]);

  useEffect(() => {
    if (selectedMetric) {
      fetchBaseline();
      fetchAnomalies();
    }
  }, [selectedMetric, period, method, threshold]);

  useEffect(() => {
    if (anomalies) {
      generateAlerts();
      generateInsights();
    }
  }, [anomalies]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/anomaly-detection/summary?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchAvailableMetrics = async () => {
    try {
      const response = await fetch('/api/anomaly-detection/metrics');
      const result = await response.json();

      if (result.success) {
        setAvailableMetrics(result.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchAvailableMethods = async () => {
    try {
      const response = await fetch('/api/anomaly-detection/methods');
      const result = await response.json();

      if (result.success) {
        setAvailableMethods(result.data);
      }
    } catch (error) {
      console.error('Error fetching methods:', error);
    }
  };

  const fetchBaseline = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/anomaly-detection/baseline?metric=${selectedMetric}&period=${period}`
      );
      const result = await response.json();

      if (result.success) {
        setBaselineData(result.data);
      }
    } catch (error) {
      console.error('Error fetching baseline:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnomalies = async () => {
    try {
      const response = await fetch(
        `/api/anomaly-detection/detect?metric=${selectedMetric}&period=${period}&method=${method}&threshold=${threshold}`
      );
      const result = await response.json();

      if (result.success) {
        setAnomalies(result.data);
      }
    } catch (error) {
      console.error('Error detecting anomalies:', error);
    }
  };

  const generateAlerts = async () => {
    try {
      const response = await fetch('/api/anomaly-detection/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomalyResults: [anomalies],
          alertThreshold: 'medium'
        })
      });
      const result = await response.json();

      if (result.success) {
        setAlerts(result.data);
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  };

  const generateInsights = () => {
    if (!anomalies || !baselineData) return;

    const newInsights = [];

    // Check if anomalies exist
    if (anomalies.totalAnomalies > 0) {
      newInsights.push({
        priority: anomalies.totalAnomalies > 5 ? 'high' : 'medium',
        title: `${anomalies.totalAnomalies} anomalies detected`,
        description: `Found ${anomalies.totalAnomalies} anomalies in ${selectedMetric} over the last ${period} days`
      });
    }

    // Check for critical anomalies
    const criticalCount = anomalies.anomalies.filter(a => a.severity.level === 'critical').length;
    if (criticalCount > 0) {
      newInsights.push({
        priority: 'high',
        title: `${criticalCount} critical anomalies`,
        description: 'Immediate investigation required'
      });
    }

    // Check distribution
    const positive = anomalies.anomalies.filter(a => a.deviation.percentDifference > 0).length;
    const negative = anomalies.anomalies.filter(a => a.deviation.percentDifference < 0).length;

    if (positive > negative) {
      newInsights.push({
        priority: 'medium',
        title: 'Mostly positive deviations',
        description: `${positive} positive vs ${negative} negative - investigate what\'s working`
      });
    } else if (negative > positive) {
      newInsights.push({
        priority: 'negative',
        title: 'Mostly negative deviations',
        description: `${negative} negative vs ${positive} positive - investigate issues`
      });
    }

    setInsights(newInsights);
  };

  const fetchContext = async (anomalyTimestamp) => {
    try {
      const response = await fetch(
        `/api/anomaly-detection/context/${selectedMetric}?timestamp=${anomalyTimestamp.toISOString()}&period=7`
      );
      const result = await response.json();

      if (result.success) {
        setContextData(result.data);
      }
    } catch (error) {
      console.error('Error fetching context:', error);
    }
  };

  const handleAnomalyClick = (anomaly) => {
    setSelectedAnomaly(anomaly);
    fetchContext(new Date(anomaly.timestamp));
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#f8312f',
      high: '#ff6b6b',
      medium: '#ffb020',
      low: '#ffd60a'
    };
    return colors[severity] || '#999';
  };

  const prepareChartData = () => {
    if (!baselineData) return [];

    return baselineData.timestamps.map((timestamp, index) => ({
      date: new Date(timestamp).toLocaleDateString(),
      value: baselineData.values[index],
      mean: baselineData.statistics.mean,
      upperBound: baselineData.statistics.mean + (threshold * baselineData.statistics.stdDev),
      lowerBound: baselineData.statistics.mean - (threshold * baselineData.statistics.stdDev),
      isAnomaly: anomalies?.anomalies.some(a =>
        new Date(a.timestamp).getTime() === new Date(timestamp).getTime()
      )
    }));
  };

  const prepareAnomalyScatterData = () => {
    if (!anomalies) return [];

    return anomalies.anomalies.map(anomaly => ({
      date: new Date(anomaly.timestamp).getTime(),
      value: anomaly.value,
      severity: anomaly.severity.level,
      score: anomaly.score
    }));
  };

  const getMetricDisplayName = (metricName) => {
    const metric = availableMetrics.find(m => m.name === metricName);
    return metric ? metric.displayName : metricName;
  };

  const getMethodDisplayName = (methodName) => {
    const method = availableMethods.find(m => m.name === methodName);
    return method ? method.displayName : methodName;
  };

  if (loading && !baselineData) {
    return (
      <div className="page-container">
        <div className="loading">Loading anomaly detection...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🔍 Anomaly Detection</h1>
        <p>Detect and investigate performance anomalies</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total Anomalies</div>
            <div className="summary-value">{summary.totalAnomalies}</div>
          </div>
          <div className="summary-card critical">
            <div className="summary-label">Critical</div>
            <div className="summary-value">{summary.criticalCount}</div>
          </div>
          <div className="summary-card high">
            <div className="summary-label">High</div>
            <div className="summary-value">{summary.highCount}</div>
          </div>
          <div className="summary-card medium">
            <div className="summary-label">Medium</div>
            <div className="summary-value">{summary.mediumCount}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Low</div>
            <div className="summary-value">{summary.lowCount}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <label>Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            {availableMetrics.map(metric => (
              <option key={metric.name} value={metric.name}>
                {metric.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>

        <div className="control-group">
          <label>Method:</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {availableMethods.map(m => (
              <option key={m.name} value={m.name}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Threshold:</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
          >
            <option value="1">1σ (Loose)</option>
            <option value="2">2σ (Standard)</option>
            <option value="3">3σ (Strict)</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            fetchBaseline();
            fetchAnomalies();
          }}
        >
          Refresh
        </button>
      </div>

      {/* Baseline Statistics */}
      {baselineData && (
        <div className="section">
          <h2>📊 Baseline Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Mean</div>
              <div className="stat-value">{baselineData.statistics.mean.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Median</div>
              <div className="stat-value">{baselineData.statistics.median.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Std Dev</div>
              <div className="stat-value">{baselineData.statistics.stdDev.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Min</div>
              <div className="stat-value">{baselineData.statistics.min.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Max</div>
              <div className="stat-value">{baselineData.statistics.max.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Data Points</div>
              <div className="stat-value">{baselineData.dataPoints}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">25th Percentile</div>
              <div className="stat-value">{baselineData.statistics.percentile25.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">75th Percentile</div>
              <div className="stat-value">{baselineData.statistics.percentile75.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {baselineData && (
        <div className="section">
          <h2>📈 {getMetricDisplayName(selectedMetric)} with Anomalies</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={prepareChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis
                dataKey="date"
                stroke="#a0a0a0"
                interval="preserveStartEnd"
              />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #2d3561',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <ReferenceLine
                y={baselineData.statistics.mean}
                label="Mean"
                stroke="#00d26a"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={baselineData.statistics.mean + (threshold * baselineData.statistics.stdDev)}
                label={`+${threshold}σ`}
                stroke="#f8312f"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={baselineData.statistics.mean - (threshold * baselineData.statistics.stdDev)}
                label={`-${threshold}σ`}
                stroke="#f8312f"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7b2cbf"
                strokeWidth={2}
                dot={false}
                name={getMetricDisplayName(selectedMetric)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Anomalies List */}
      {anomalies && anomalies.anomalies.length > 0 && (
        <div className="section">
          <h2>⚠️ Detected Anomalies ({anomalies.totalAnomalies})</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Score</th>
                  <th>Deviation</th>
                  <th>Severity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.anomalies.map((anomaly, index) => (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: `${getSeverityColor(anomaly.severity.level)}15`
                    }}
                  >
                    <td>{new Date(anomaly.timestamp).toLocaleDateString()}</td>
                    <td>{anomaly.value.toFixed(2)}</td>
                    <td>{anomaly.score}</td>
                    <td>{anomaly.deviation.percentDifference.toFixed(1)}%</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getSeverityColor(anomaly.severity.level),
                          color: '#fff'
                        }}
                      >
                        {anomaly.severity.level}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleAnomalyClick(anomaly)}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="section">
          <h2>🚨 Alerts ({alerts.length})</h2>
          <div className="alerts-container">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="alert-card"
                style={{
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`
                }}
              >
                <div className="alert-header">
                  <h3>{alert.message}</h3>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getSeverityColor(alert.severity),
                      color: '#fff'
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <div className="alert-body">
                  <p><strong>Value:</strong> {alert.value.toFixed(2)}</p>
                  <p><strong>Expected Range:</strong> {alert.expectedRange}</p>
                  <p><strong>Deviation:</strong> {alert.deviation.toFixed(1)}%</p>
                  <p><strong>Recommendation:</strong> {alert.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="section">
          <h2>💡 Insights</h2>
          <div className="insights-container">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="insight-card"
                style={{
                  borderLeft: `4px solid ${
                    insight.priority === 'high' ? '#f8312f' :
                    insight.priority === 'medium' ? '#ffb020' :
                    insight.priority === 'negative' ? '#f8312f' : '#00d26a'
                  }`
                }}
              >
                <h3>{insight.title}</h3>
                <p>{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Panel */}
      {selectedAnomaly && contextData && (
        <div className="section">
          <h2>🔬 Anomaly Context</h2>
          <div className="context-panel">
            <div className="context-summary">
              <h3>Selected Anomaly</h3>
              <p><strong>Date:</strong> {new Date(selectedAnomaly.timestamp).toLocaleString()}</p>
              <p><strong>Value:</strong> {selectedAnomaly.value.toFixed(2)}</p>
              <p><strong>Score:</strong> {selectedAnomaly.score}</p>
              <p><strong>Severity:</strong> {selectedAnomaly.severity.level}</p>
            </div>

            {contextData.summary && contextData.summary.trend && (
              <div className="trend-summary">
                <h3>Trend Analysis</h3>
                <p><strong>Direction:</strong> {contextData.summary.trend.direction}</p>
                <p><strong>Change:</strong> {contextData.summary.trend.change.toFixed(1)}%</p>
                <p><strong>Range:</strong> {contextData.summary.trend.firstValue.toFixed(2)} → {contextData.summary.trend.lastValue.toFixed(2)}</p>
              </div>
            )}

            {!contextData.summary && (
              <div className="trend-summary">
                <p style={{ color: '#a0a0a0' }}>Trend analysis not available for this anomaly.</p>
              </div>
            )}

            {contextData.relatedMetrics && Object.keys(contextData.relatedMetrics).length > 0 && (
              <div className="related-metrics">
                <h3>Related Metrics</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Views</th>
                      <th>Engagement</th>
                      <th>Conversions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(contextData.relatedMetrics).slice(0, 7).map(([date, metrics]) => (
                      <tr key={date}>
                        <td>{date}</td>
                        <td>{metrics.views?.toFixed(0) || 'N/A'}</td>
                        <td>{metrics.engagement_rate?.toFixed(2) || 'N/A'}%</td>
                        <td>{metrics.conversions?.toFixed(0) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedAnomaly(null);
                setContextData(null);
              }}
            >
              Close Context
            </button>
          </div>
        </div>
      )}

      <style>{`
        .page-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          background: #1a1a2e;
          min-height: 100vh;
          color: #eaeaea;
        }

        .page-header h1 {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .page-header p {
          color: #a0a0a0;
          margin-bottom: 24px;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: #16213e;
          border: 1px solid #2d3561;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .summary-card.critical {
          border-color: #f8312f;
          background: #f8312f10;
        }

        .summary-card.high {
          border-color: #ff6b6b;
          background: #ff6b6b10;
        }

        .summary-card.medium {
          border-color: #ffb020;
          background: #ffb02010;
        }

        .summary-label {
          color: #a0a0a0;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 28px;
          font-weight: bold;
          color: #e94560;
        }

        .controls {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-group label {
          color: #a0a0a0;
          font-size: 14px;
        }

        .control-group select {
          background: #16213e;
          border: 1px solid #2d3561;
          color: #eaeaea;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn {
          background: #7b2cbf;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn:hover {
          background: #9d4edd;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn-secondary {
          background: #2d3561;
        }

        .btn-secondary:hover {
          background: #3d4561;
        }

        .section {
          background: #16213e;
          border: 1px solid #2d3561;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .section h2 {
          font-size: 20px;
          margin-bottom: 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .stat-item {
          background: #1a1a2e;
          padding: 12px;
          border-radius: 4px;
          text-align: center;
        }

        .stat-label {
          color: #a0a0a0;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #00d26a;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #1a1a2e;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #2d3561;
          color: #a0a0a0;
          font-size: 12px;
          text-transform: uppercase;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #2d3561;
        }

        .data-table tr:hover {
          background: #1a1a2e;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .alerts-container {
          display: grid;
          gap: 16px;
        }

        .alert-card {
          background: #1a1a2e;
          border: 1px solid #2d3561;
          border-radius: 8px;
          padding: 16px;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .alert-header h3 {
          font-size: 16px;
          margin: 0;
        }

        .alert-body p {
          margin: 8px 0;
          font-size: 14px;
          color: #a0a0a0;
        }

        .insights-container {
          display: grid;
          gap: 12px;
        }

        .insight-card {
          background: #1a1a2e;
          padding: 16px;
          border-radius: 4px;
        }

        .insight-card h3 {
          font-size: 14px;
          margin: 0 0 8px 0;
        }

        .insight-card p {
          margin: 0;
          font-size: 13px;
          color: #a0a0a0;
        }

        .context-panel {
          background: #1a1a2e;
          padding: 16px;
          border-radius: 8px;
        }

        .context-summary,
        .trend-summary,
        .related-metrics {
          margin-bottom: 16px;
        }

        .context-summary h3,
        .trend-summary h3,
        .related-metrics h3 {
          font-size: 16px;
          margin-bottom: 12px;
        }

        .context-summary p,
        .trend-summary p {
          margin: 6px 0;
          font-size: 14px;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 50vh;
          font-size: 18px;
          color: #a0a0a0;
        }
      `}</style>
    </div>
  );
};

export default AnomalyDetection;
