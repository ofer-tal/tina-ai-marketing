import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

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

const TimePeriodSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #16213e;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const TimeButton = styled.button`
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

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: translateY(-2px);
  }
`;

const MetricLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MetricIcon = styled.span`
  font-size: 1.2rem;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const MetricChange = styled.div`
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${props => props.$positive ? '#00d26a' : props.$negative ? '#e94560' : '#a0a0a0'};
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

function Dashboard() {
  const [timePeriod, setTimePeriod] = useState('24h');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, [timePeriod]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/metrics?period=${timePeriod}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load dashboard metrics. Please try again later.');
      // Set mock data for development
      setMetrics({
        mrr: { current: 425, previous: 380, change: 11.8 },
        users: { current: 1247, previous: 1102, change: 13.2 },
        spend: { current: 87, previous: 92, change: -5.4 },
        posts: { current: 23, previous: 18, change: 27.8 }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const renderMetricCard = (key, label, icon, prefix = '', suffix = '') => {
    if (!metrics || !metrics[key]) return null;

    const metric = metrics[key];
    const isPositive = metric.change > 0;
    const isNegative = metric.change < 0;

    return (
      <MetricCard key={key}>
        <MetricLabel>
          <MetricIcon>{icon}</MetricIcon>
          {label}
        </MetricLabel>
        <MetricValue>
          {prefix}{formatNumber(metric.current)}{suffix}
        </MetricValue>
        <MetricChange $positive={isPositive} $negative={isNegative}>
          {isPositive && '↑'}
          {isNegative && '↓'}
          {!isPositive && !isNegative && '→'}
          {Math.abs(metric.change).toFixed(1)}% vs {timePeriod}
        </MetricChange>
      </MetricCard>
    );
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          Loading dashboard metrics...
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Tactical Dashboard</Title>
        <TimePeriodSelector>
          <TimeButton
            $active={timePeriod === '24h'}
            onClick={() => setTimePeriod('24h')}
          >
            24h
          </TimeButton>
          <TimeButton
            $active={timePeriod === '7d'}
            onClick={() => setTimePeriod('7d')}
          >
            7d
          </TimeButton>
          <TimeButton
            $active={timePeriod === '30d'}
            onClick={() => setTimePeriod('30d')}
          >
            30d
          </TimeButton>
        </TimePeriodSelector>
      </DashboardHeader>

      {error && (
        <ErrorState>
          {error}
        </ErrorState>
      )}

      <MetricsGrid>
        {renderMetricCard('mrr', 'Monthly Recurring Revenue', '💰', '$')}
        {renderMetricCard('users', 'Active Users', '👥')}
        {renderMetricCard('spend', 'Ad Spend', '📊', '$')}
        {renderMetricCard('posts', 'Content Posted', '📱')}
      </MetricsGrid>

      <DashboardHeader>
        <Title>Recent Activity</Title>
      </DashboardHeader>

      <MetricCard>
        <MetricLabel>
          <MetricIcon>📋</MetricIcon>
          Activity Log
        </MetricLabel>
        <div style={{ color: '#a0a0a0', marginTop: '1rem' }}>
          No recent activity to display. The system is tracking metrics and will show activity here once operations begin.
        </div>
      </MetricCard>
    </DashboardContainer>
  );
}

export default Dashboard;
