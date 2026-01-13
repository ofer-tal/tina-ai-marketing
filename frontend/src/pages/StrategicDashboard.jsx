import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const DashboardContainer = styled.div`
  width: 100%;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const DateRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #16213e;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const DateButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? '#e94560' : 'transparent'};
  border: none;
  border-radius: 6px;
  color: ${props => props.$active ? '#ffffff' : '#a0a0a0'};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? '#e94560' : '#2d3561'};
    color: ${props => props.$active ? '#ffffff' : '#eaeaea'};
  }
`;

const ChartContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const ChartTitle = styled.h2`
  font-size: 1.25rem;
  color: #eaeaea;
  margin: 0 0 1rem 0;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const MetricLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #eaeaea;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const ErrorState = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 8px;
  padding: 1rem;
  color: #e94560;
  margin-bottom: 1rem;
`;

function StrategicDashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [mrrData, setMrrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMrrTrend();
  }, [dateRange]);

  const fetchMrrTrend = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/mrr-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMrrData(data);
    } catch (err) {
      console.error('Failed to fetch MRR trend:', err);
      setError('Failed to load MRR trend data. Please try again later.');
      // Set mock data for development
      const mockData = generateMockMrrData(dateRange);
      setMrrData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockMrrData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let currentMrr = 300;
    const targetMrr = 10000;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate growth with some randomness
      const growth = (targetMrr - currentMrr) / (days - i + 1);
      const randomFactor = (Math.random() - 0.4) * 50;
      currentMrr = Math.max(300, currentMrr + growth + randomFactor);

      data.push({
        date: date.toISOString().split('T')[0],
        mrr: Math.round(currentMrr),
        target: Math.round(targetMrr * (i / days))
      });
    }

    const current = data[data.length - 1].mrr;
    const previous = data[Math.max(0, data.length - 8)].mrr; // 7 days ago
    const change = ((current - previous) / previous * 100).toFixed(1);

    return {
      data,
      summary: {
        current: Math.round(current),
        previous: Math.round(previous),
        change: parseFloat(change),
        trend: current >= previous ? 'up' : 'down'
      }
    };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#16213e',
          border: '1px solid #2d3561',
          borderRadius: '8px',
          padding: '0.75rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.85rem' }}>
            {formatDate(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '0.25rem 0 0 0', color: entry.color, fontSize: '0.9rem' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          Loading strategic dashboard...
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Strategic Dashboard</Title>
        <DateRangeSelector>
          <DateButton
            $active={dateRange === '30d'}
            onClick={() => setDateRange('30d')}
          >
            30 Days
          </DateButton>
          <DateButton
            $active={dateRange === '90d'}
            onClick={() => setDateRange('90d')}
          >
            90 Days
          </DateButton>
          <DateButton
            $active={dateRange === '180d'}
            onClick={() => setDateRange('180d')}
          >
            180 Days
          </DateButton>
        </DateRangeSelector>
      </DashboardHeader>

      {error && (
        <ErrorState>
          {error}
        </ErrorState>
      )}

      {mrrData && (
        <>
          <MetricsRow>
            <MetricCard>
              <MetricLabel>Current MRR</MetricLabel>
              <MetricValue>{formatCurrency(mrrData.summary.current)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Previous MRR (7d ago)</MetricLabel>
              <MetricValue>{formatCurrency(mrrData.summary.previous)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Change (7d)</MetricLabel>
              <MetricValue style={{
                color: mrrData.summary.trend === 'up' ? '#00d26a' : '#e94560'
              }}>
                {mrrData.summary.trend === 'up' ? '↑' : '↓'}
                {Math.abs(mrrData.summary.change)}%
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Target MRR</MetricLabel>
              <MetricValue>$10,000</MetricValue>
            </MetricCard>
          </MetricsRow>

          <ChartContainer>
            <ChartTitle>Monthly Recurring Revenue Trend</ChartTitle>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={mrrData.data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#a0a0a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  stroke="#a0a0a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#a0a0a0' }}
                />
                <ReferenceLine
                  y={10000}
                  label="Target $10k"
                  stroke="#00d26a"
                  strokeDasharray="3 3"
                  style={{ color: '#00d26a' }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#e94560"
                  strokeWidth={2}
                  dot={{ fill: '#e94560', r: 3 }}
                  activeDot={{ r: 6 }}
                  name="MRR"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#7b2cbf"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Target Path"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </>
      )}
    </DashboardContainer>
  );
}

export default StrategicDashboard;
