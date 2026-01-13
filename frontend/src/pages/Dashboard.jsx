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
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'none'};
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

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const PostCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: translateY(-2px);
  }
`;

const PostTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const PlatformBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$platform) {
      case 'tiktok': return '#000000';
      case 'instagram': return '#E4405F';
      case 'youtube_shorts': return '#FF0000';
      default: return '#2d3561';
    }
  }};
  color: white;
`;

const PostedTime = styled.span`
  color: #a0a0a0;
  font-size: 0.75rem;
`;

const PostMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const MetricItem = styled.div`
  text-align: center;
`;

const PostMetricValue = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.$color || '#eaeaea'};
`;

const PostMetricLabel = styled.div`
  font-size: 0.65rem;
  color: #a0a0a0;
  margin-top: 0.1rem;
`;

const EngagementRate = styled.div`
  background: ${props => props.$high ? '#00d26a20' : props.$medium ? '#ffb02020' : '#2d3561'};
  border: 1px solid ${props => props.$high ? '#00d26a' : props.$medium ? '#ffb020' : '#2d3561'};
  border-radius: 6px;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.$high ? '#00d26a' : props.$medium ? '#ffb020' : '#eaeaea'};
`;

const LastUpdated = styled.div`
  text-align: right;
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 1rem;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s;
  margin-left: 1rem;

  &:hover {
    background: #ff6b8a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

function Dashboard() {
  const [timePeriod, setTimePeriod] = useState('24h');
  const [metrics, setMetrics] = useState(null);
  const [postsPerformance, setPostsPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchPostsPerformance();
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

  const fetchPostsPerformance = async () => {
    try {
      const response = await fetch('/api/dashboard/posts/performance?limit=10');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPostsPerformance(data);
    } catch (err) {
      console.error('Failed to fetch posts performance:', err);
      // Set mock data for development
      setPostsPerformance(null);
    }
  };

  const refreshPostsPerformance = async () => {
    setRefreshing(true);
    await fetchPostsPerformance();
    setRefreshing(false);
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

  const formatCompactNumber = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getEngagementLevel = (rate) => {
    if (rate >= 12) return 'high';
    if (rate >= 8) return 'medium';
    return 'low';
  };

  const renderMetricCard = (key, label, icon, prefix = '', suffix = '', onClick = null) => {
    if (!metrics || !metrics[key]) return null;

    const metric = metrics[key];
    const isPositive = metric.change > 0;
    const isNegative = metric.change < 0;

    return (
      <MetricCard
        key={key}
        $clickable={!!onClick}
        onClick={onClick}
      >
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
        {renderMetricCard('mrr', 'Monthly Recurring Revenue', '💰', '$', '', () => window.location.href = '/dashboard/strategic')}
        {renderMetricCard('subscribers', 'Active Subscribers', '💎', '', '', () => window.location.href = '/dashboard/subscribers')}
        {renderMetricCard('users', 'Active Users', '👥')}
        {renderMetricCard('spend', 'Ad Spend', '📊', '$')}
        {renderMetricCard('posts', 'Content Posted', '📱')}
      </MetricsGrid>

      <DashboardHeader>
        <Title>Recent Post Performance</Title>
        <RefreshButton onClick={refreshPostsPerformance} disabled={refreshing}>
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </RefreshButton>
      </DashboardHeader>

      {postsPerformance && postsPerformance.posts.length > 0 ? (
        <>
          <PostsGrid>
            {postsPerformance.posts.map((post) => (
              <PostCard key={post.id}>
                <PostTitle>{post.title}</PostTitle>
                <PostMeta>
                  <PlatformBadge $platform={post.platform}>
                    {post.platform === 'youtube_shorts' ? 'YouTube' : post.platform}
                  </PlatformBadge>
                  <PostedTime>{getTimeAgo(post.postedAt)}</PostedTime>
                </PostMeta>
                <PostMetricsGrid>
                  <MetricItem>
                    <PostMetricValue $color="#7b2cbf">{formatCompactNumber(post.performanceMetrics.views)}</PostMetricValue>
                    <PostMetricLabel>Views</PostMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <PostMetricValue $color="#e94560">{formatCompactNumber(post.performanceMetrics.likes)}</PostMetricValue>
                    <PostMetricLabel>Likes</PostMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <PostMetricValue $color="#00d26a">{formatCompactNumber(post.performanceMetrics.comments)}</PostMetricValue>
                    <PostMetricLabel>Comments</PostMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <PostMetricValue $color="#ffb020">{formatCompactNumber(post.performanceMetrics.shares)}</PostMetricValue>
                    <PostMetricLabel>Shares</PostMetricLabel>
                  </MetricItem>
                </PostMetricsGrid>
                <EngagementRate
                  $high={getEngagementLevel(post.performanceMetrics.engagementRate) === 'high'}
                  $medium={getEngagementLevel(post.performanceMetrics.engagementRate) === 'medium'}
                >
                  {post.performanceMetrics.engagementRate}% Engagement
                </EngagementRate>
              </PostCard>
            ))}
          </PostsGrid>
          <LastUpdated>
            Last updated: {new Date(postsPerformance.lastUpdated).toLocaleTimeString()} |
            Avg engagement: {postsPerformance.summary.avgEngagementRate}%
          </LastUpdated>
        </>
      ) : (
        <MetricCard>
          <MetricLabel>
            <MetricIcon>📱</MetricIcon>
            Post Performance
          </MetricLabel>
          <div style={{ color: '#a0a0a0', marginTop: '1rem' }}>
            No posts performance data available. Posts will appear here once content is published.
          </div>
        </MetricCard>
      )}
    </DashboardContainer>
  );
}

export default Dashboard;
