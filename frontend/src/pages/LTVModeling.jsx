/**
 * Lifetime Value Modeling Page
 *
 * Displays customer LTV analytics, segment analysis, and predictions
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 28px;
  color: #eaeaea;
  margin: 0;
`;

const RefreshButton = styled.button`
  background: #e94560;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #d63850;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const Card = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 20px;

  h3 {
    font-size: 12px;
    color: #a0a0a0;
    margin: 0 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    font-size: 28px;
    font-weight: bold;
    color: #eaeaea;
    margin: 0;
  }

  .subtitle {
    font-size: 12px;
    color: #a0a0a0;
    margin-top: 5px;
  }
`;

const ChartContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;

  h3 {
    font-size: 18px;
    color: #eaeaea;
    margin: 0 0 20px 0;
  }
`;

const SegmentsTable = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  overflow-x: auto;

  h3 {
    font-size: 18px;
    color: #eaeaea;
    margin: 0 0 20px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;

    th {
      text-align: left;
      padding: 12px;
      color: #a0a0a0;
      font-size: 12px;
      text-transform: uppercase;
      border-bottom: 1px solid #2d3561;
    }

    td {
      padding: 12px;
      color: #eaeaea;
      border-bottom: 1px solid #2d3561;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: #1a1a2e;
    }
  }
`;

const InsightsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const InsightCard = styled.div`
  background: #16213e;
  border: 1px solid ${props => {
    if (props.type === 'opportunity') return '#00d26a';
    if (props.type === 'warning') return '#ffb020';
    if (props.type === 'insight') return '#7b2cbf';
    return '#2d3561';
  }};
  border-radius: 12px;
  padding: 20px;

  .insight-type {
    font-size: 11px;
    text-transform: uppercase;
    color: ${props => {
      if (props.type === 'opportunity') return '#00d26a';
      if (props.type === 'warning') return '#ffb020';
      if (props.type === 'insight') return '#7b2cbf';
      return '#a0a0a0';
    }};
    margin-bottom: 8px;
    font-weight: 600;
  }

  h4 {
    font-size: 16px;
    color: #eaeaea;
    margin: 0 0 10px 0;
  }

  p {
    font-size: 14px;
    color: #a0a0a0;
    margin: 0 0 15px 0;
    line-height: 1.5;
  }

  .recommendation {
    font-size: 13px;
    color: #eaeaea;
    background: rgba(255, 255, 255, 0.05);
    padding: 10px;
    border-radius: 6px;
    margin: 0;
  }

  .impact {
    display: inline-block;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    margin-top: 10px;
    background: ${props => {
      if (props.impact === 'high') return 'rgba(0, 210, 106, 0.2)';
      if (props.impact === 'medium') return 'rgba(255, 176, 32, 0.2)';
      return 'rgba(160, 160, 160, 0.2)';
    }};
    color: ${props => {
      if (props.impact === 'high') return '#00d26a';
      if (props.impact === 'medium') return '#ffb020';
      return '#a0a0a0';
    }};
  }
`;

const PredictionPanel = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;

  h3 {
    font-size: 18px;
    color: #eaeaea;
    margin: 0 0 20px 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }

  .form-group {
    label {
      display: block;
      font-size: 12px;
      color: #a0a0a0;
      margin-bottom: 5px;
    }

    select, input {
      width: 100%;
      padding: 10px;
      background: #1a1a2e;
      border: 1px solid #2d3561;
      border-radius: 6px;
      color: #eaeaea;
      font-size: 14px;

      &:focus {
        outline: none;
        border-color: #e94560;
      }
    }
  }

  .predict-button {
    background: #e94560;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;

    &:hover {
      background: #d63850;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .prediction-result {
    margin-top: 20px;
    padding: 20px;
    background: #1a1a2e;
    border-radius: 8px;

    .prediction-header {
      font-size: 14px;
      color: #a0a0a0;
      margin-bottom: 15px;
    }

    .prediction-value {
      font-size: 32px;
      font-weight: bold;
      color: #00d26a;
      margin-bottom: 10px;
    }

    .prediction-range {
      display: flex;
      gap: 20px;
      margin-top: 15px;

      .range-item {
        flex: 1;

        .label {
          font-size: 11px;
          color: #a0a0a0;
          margin-bottom: 5px;
        }

        .value {
          font-size: 16px;
          font-weight: 600;
        }

        &.low .value { color: #ffb020; }
        &.high .value { color: #00d26a; }
      }
    }
  }
`;

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#06b6d4', '#f8312f'];

const LTVModeling = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [fullAnalytics, setFullAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prediction form state
  const [predictionForm, setPredictionForm] = useState({
    acquisitionChannel: 'organic',
    subscriptionType: 'premium_monthly',
    isNewCustomer: true,
    firstTransactionAmount: 9.99
  });
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ltv-modeling/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const data = await response.json();
      setDashboardData(data);

      // Also fetch full analytics
      const analyticsResponse = await fetch('/api/ltv-modeling/analytics');
      if (!analyticsResponse.ok) throw new Error('Failed to fetch analytics');

      const analytics = await analyticsResponse.json();
      setFullAnalytics(analytics);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    try {
      setPredicting(true);
      setError(null);

      const response = await fetch('/api/ltv-modeling/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictionForm)
      });

      if (!response.ok) throw new Error('Failed to generate prediction');

      const data = await response.json();
      setPrediction(data);

    } catch (err) {
      console.error('Error predicting:', err);
      setError(err.message);
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Title>Loading Lifetime Value Analytics...</Title>
      </PageContainer>
    );
  }

  if (error && !dashboardData) {
    return (
      <PageContainer>
        <Title>Error</Title>
        <p style={{ color: '#f8312f' }}>{error}</p>
      </PageContainer>
    );
  }

  const segmentChartData = dashboardData?.segments?.map(s => ({
    name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
    avgLTV: s.avgLTV,
    customerCount: s.customerCount
  })) || [];

  const ltvDistributionData = dashboardData?.summary ? [
    { name: 'P10', value: dashboardData.summary.ltvRange.p10 },
    { name: 'P25', value: dashboardData.summary.ltvRange.p25 },
    { name: 'P50 (Median)', value: dashboardData.summary.ltvRange.p50 },
    { name: 'P75', value: dashboardData.summary.ltvRange.p75 },
    { name: 'P90', value: dashboardData.summary.ltvRange.p90 }
  ] : [];

  return (
    <PageContainer>
      <Header>
        <Title>💰 Lifetime Value Modeling</Title>
        <RefreshButton onClick={fetchDashboardData} disabled={loading}>
          🔄 Refresh
        </RefreshButton>
      </Header>

      {/* Summary Cards */}
      <SummaryCards>
        <Card>
          <h3>Total Customers Analyzed</h3>
          <p className="value">{dashboardData?.summary?.totalCustomers?.toLocaleString() || 0}</p>
          <p className="subtitle">With transaction history</p>
        </Card>

        <Card>
          <h3>Average LTV</h3>
          <p className="value">${dashboardData?.summary?.avgLTV?.toFixed(2) || '0.00'}</p>
          <p className="subtitle">Per customer lifetime</p>
        </Card>

        <Card>
          <h3>Median LTV</h3>
          <p className="value">${dashboardData?.summary?.medianLTV?.toFixed(2) || '0.00'}</p>
          <p className="subtitle">Middle customer value</p>
        </Card>

        <Card>
          <h3>Total Revenue</h3>
          <p className="value">${(dashboardData?.summary?.totalRevenue || 0).toLocaleString()}</p>
          <p className="subtitle">From analyzed customers</p>
        </Card>

        <Card>
          <h3>Top Segment LTV</h3>
          <p className="value">${dashboardData?.summary?.topSegmentLTV?.toFixed(2) || '0.00'}</p>
          <p className="subtitle">Highest performing segment</p>
        </Card>

        <Card>
          <h3>Total Revenue</h3>
          <p className="value">${(dashboardData?.summary?.totalRevenue || 0).toLocaleString()}</p>
          <p className="subtitle">All-time tracked revenue</p>
        </Card>
      </SummaryCards>

      {/* Segments Bar Chart */}
      <ChartContainer>
        <h3>Average LTV by Customer Segment</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={segmentChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis dataKey="name" stroke="#a0a0a0" />
            <YAxis stroke="#a0a0a0" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3561', borderRadius: '8px' }}
              labelStyle={{ color: '#eaeaea' }}
            />
            <Legend />
            <Bar dataKey="avgLTV" fill="#e94560" name="Average LTV ($)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* LTV Distribution */}
      <ChartContainer>
        <h3>LTV Distribution (Percentiles)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ltvDistributionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis dataKey="name" stroke="#a0a0a0" />
            <YAxis stroke="#a0a0a0" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3561', borderRadius: '8px' }}
              labelStyle={{ color: '#eaeaea' }}
              formatter={(value) => `$${value.toFixed(2)}`}
            />
            <Bar dataKey="value" fill="#7b2cbf" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Segments Table */}
      <SegmentsTable>
        <h3>Customer Segment Details</h3>
        <table>
          <thead>
            <tr>
              <th>Segment</th>
              <th>Customers</th>
              <th>Avg LTV</th>
              <th>Revenue Share</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData?.segments?.map((segment, index) => (
              <tr key={index}>
                <td>{segment.name}</td>
                <td>{segment.customerCount.toLocaleString()}</td>
                <td>${segment.avgLTV.toFixed(2)}</td>
                <td>{(segment.revenueShare * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SegmentsTable>

      {/* Prediction Panel */}
      <PredictionPanel>
        <h3>🎯 Predict Customer LTV</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Acquisition Channel</label>
            <select
              value={predictionForm.acquisitionChannel}
              onChange={(e) => setPredictionForm({ ...predictionForm, acquisitionChannel: e.target.value })}
            >
              <option value="organic">Organic (App Store)</option>
              <option value="apple_search_ads">Apple Search Ads</option>
              <option value="tiktok_ads">TikTok Ads</option>
              <option value="instagram_ads">Instagram Ads</option>
              <option value="google_ads">Google Ads</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          <div className="form-group">
            <label>Subscription Type</label>
            <select
              value={predictionForm.subscriptionType}
              onChange={(e) => setPredictionForm({ ...predictionForm, subscriptionType: e.target.value })}
            >
              <option value="premium_monthly">Premium Monthly</option>
              <option value="premium_annual">Premium Annual</option>
              <option value="basic_monthly">Basic Monthly</option>
              <option value="free">Free Trial</option>
            </select>
          </div>

          <div className="form-group">
            <label>First Transaction Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={predictionForm.firstTransactionAmount}
              onChange={(e) => setPredictionForm({ ...predictionForm, firstTransactionAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>&nbsp;</label>
            <button
              className="predict-button"
              onClick={handlePredict}
              disabled={predicting}
            >
              {predicting ? 'Predicting...' : 'Predict LTV'}
            </button>
          </div>
        </div>

        {prediction && prediction.prediction && (
          <div className="prediction-result">
            <div className="prediction-header">Predicted Lifetime Value</div>
            <div className="prediction-value">
              ${prediction.prediction.expected?.toFixed(2) || '0.00'}
            </div>

            <div className="prediction-range">
              <div className="range-item low">
                <div className="label">Low Estimate</div>
                <div className="value">${prediction.prediction.low?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="range-item">
                <div className="label">Expected</div>
                <div className="value">${prediction.prediction.expected?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="range-item high">
                <div className="label">High Estimate</div>
                <div className="value">${prediction.prediction.high?.toFixed(2) || '0.00'}</div>
              </div>
            </div>

            {prediction.prediction.confidence && (
              <div style={{ marginTop: '15px', fontSize: '12px', color: '#a0a0a0' }}>
                Confidence Level: <strong>{prediction.prediction.confidence}</strong>
                {' '}(Margin of error: ±{prediction.prediction.marginOfErrorPercent?.toFixed(1)}%)
              </div>
            )}

            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '10px' }}>Recommendations:</div>
                {prediction.recommendations.map((rec, idx) => (
                  <div key={idx} style={{
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '13px',
                    color: '#eaeaea'
                  }}>
                    <strong>{rec.type}:</strong> {rec.message}<br />
                    <span style={{ color: '#a0a0a0' }}>→ {rec.action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PredictionPanel>

      {/* Insights */}
      {fullAnalytics?.insights && fullAnalytics.insights.length > 0 && (
        <InsightsContainer>
          {fullAnalytics.insights.map((insight, index) => (
            <InsightCard
              key={index}
              type={insight.type}
              impact={insight.impact}
            >
              <div className="insight-type">{insight.type}</div>
              <h4>{insight.title}</h4>
              <p>{insight.message}</p>
              {insight.recommendation && (
                <div className="recommendation">
                  💡 {insight.recommendation}
                </div>
              )}
              {insight.potentialValue && (
                <div className="impact">
                  Potential Value: ${insight.potentialValue.toFixed(2)}
                </div>
              )}
              {insight.impact && (
                <div className="impact">
                  Impact: {insight.impact}
                </div>
              )}
            </InsightCard>
          ))}
        </InsightsContainer>
      )}
    </PageContainer>
  );
};

export default LTVModeling;
