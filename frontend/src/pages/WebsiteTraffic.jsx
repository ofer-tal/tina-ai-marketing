/**
 * Website Traffic Dashboard
 *
 * Displays website traffic data from Google Analytics:
 * - Traffic trends over time (page views, sessions, users)
 * - Traffic sources breakdown (organic, social, direct, referral, email)
 * - Top pages by page views
 * - User acquisition metrics
 * - Bounce rate and session duration
 *
 * Feature #269: Website traffic tracking from GA
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#0ea5e9', '#f8312f', '#8b5cf6', '#ec4899'];

const SOURCE_COLORS = {
  'organic': '#00d26a',
  'social': '#0ea5e9',
  'direct': '#ffb020',
  'referral': '#8b5cf6',
  'email': '#ec4899'
};

// Styled Components replacing Tailwind classes
const Container = styled.div`
  padding: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: bold;
  color: white;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #9ca3af;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Select = styled.select`
  background: #374151;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #4b5563;
`;

const RefreshButton = styled.button`
  background: ${props => props.$refreshing ? '#4b5563' : '#2563eb'};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: ${props => props.$refreshing ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$refreshing ? 0.6 : 1};

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
`;

const SummaryCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.div`
  background: #1f2937;
  border-radius: 0.75rem;
  padding: 1.5rem;
`;

const SummaryCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const SummaryLabel = styled.p`
  color: #9ca3af;
  font-size: 0.875rem;
`;

const SummaryValue = styled.p`
  font-size: 1.875rem;
  font-weight: bold;
  color: white;
  margin-top: 0.5rem;
`;

const SummaryIcon = styled.div`
  font-size: 1.875rem;
`;

const SummarySubtext = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const ChartCard = styled.div`
  background: #1f2937;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  margin-bottom: 1rem;
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SourceLegend = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SourceLegendItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SourceLegendLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SourceColorDot = styled.div`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: ${props => props.$color};
`;

const SourceName = styled.span`
  color: #d1d5db;
`;

const SourceValue = styled.span`
  color: white;
  font-weight: 600;
`;

const PageRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #374151;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;

  &:hover {
    background: #4b5563;
  }
`;

const PageLeft = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PageNumber = styled.span`
  color: #9ca3af;
  font-weight: 600;
`;

const PagePath = styled.span`
  color: white;
  font-family: monospace;
  font-size: 0.875rem;
`;

const PageMeta = styled.div`
  display: flex;
  gap: 1rem;
`;

const PageMetaText = styled.span`
  color: #9ca3af;
  font-size: 0.75rem;
`;

const ThreeColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const MetricColumn = styled.div`
  margin-bottom: 0.5rem;
`;

const MetricColumnLabel = styled.p`
  color: #9ca3af;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`;

const MetricColumnValue = styled.p`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.$color || 'white'};
`;

const ProgressBar = styled.div`
  height: 0.5rem;
  background: #374151;
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$color || '#10b981'};
  width: ${props => props.$percent}%;
`;

const MetricSubtext = styled.p`
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const TwoColumnGridSmall = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const LoadingSkeleton = styled.div`
  padding: 1.5rem;

  .skeleton-title {
    height: 2rem;
    background: #374151;
    border-radius: 0.5rem;
    width: 33%;
    margin-bottom: 1rem;
  }

  .skeleton-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;

    .skeleton-card {
      height: 8rem;
      background: #374151;
      border-radius: 0.5rem;
    }
  }

  .skeleton-chart {
    height: 16rem;
    background: #374151;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
`;

const ErrorCard = styled.div`
  padding: 1.5rem;

  .error-content {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .error-text {
    color: #f87171;
  }

  .retry-button {
    margin-top: 1rem;
    background: #dc2626;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: none;
  }
`;

const NoDataCard = styled.div`
  padding: 1.5rem;

  .no-data-content {
    background: #1f2937;
    border-radius: 0.75rem;
    padding: 1.5rem;
    text-align: center;
  }

  .no-data-title {
    color: #9ca3af;
  }

  .no-data-subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
`;

export default function WebsiteTraffic() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date().toISOString().split('T')[0];
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(
        `http://localhost:3001/api/website-traffic/dashboard?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'Failed to fetch traffic data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('http://localhost:3001/api/website-traffic/refresh', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        // Fetch updated dashboard data
        await fetchDashboardData();
      } else {
        setError(data.error || 'Failed to refresh traffic data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <LoadingSkeleton>
        <div className="skeleton-title"></div>
        <div className="skeleton-cards">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
        <div className="skeleton-chart"></div>
      </LoadingSkeleton>
    );
  }

  if (error) {
    return (
      <ErrorCard>
        <div className="error-content">
          <p className="error-text">Error: {error}</p>
          <button
            onClick={fetchDashboardData}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </ErrorCard>
    );
  }

  if (!dashboardData) {
    return (
      <NoDataCard>
        <div className="no-data-content">
          <p className="no-data-title">No traffic data available</p>
          <p className="no-data-subtitle">Configure Google Analytics in Settings to start tracking</p>
        </div>
      </NoDataCard>
    );
  }

  const { trends, sources, topPages, acquisition } = dashboardData;
  const summary = trends?.summary || {};

  // Format daily trends for chart
  const dailyTrendsData = trends?.dailyTrends?.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    pageViews: d.pageViews,
    sessions: d.sessions,
    users: d.users
  })) || [];

  // Format sources for pie chart
  const sourcesData = sources?.sources?.map(s => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    value: s.sessions,
    percentage: s.percentage
  })) || [];

  // Format top pages
  const pagesData = topPages?.pages?.slice(0, 10).map(p => ({
    path: p.path,
    views: p.pageViews,
    unique: p.uniqueViews
  })) || [];

  return (
    <Container>
      {/* Header */}
      <Header>
        <div>
          <Title>🌐 Website Traffic</Title>
          <Subtitle>Track website traffic from Google Analytics</Subtitle>
        </div>
        <HeaderRight>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </Select>
          <RefreshButton
            onClick={handleRefresh}
            disabled={refreshing}
            $refreshing={refreshing}
          >
            {refreshing ? '⏳' : '🔄'} Refresh
          </RefreshButton>
        </HeaderRight>
      </Header>

      {/* Summary Cards */}
      <SummaryCardsGrid>
        <SummaryCard>
          <SummaryCardHeader>
            <div>
              <SummaryLabel>Total Page Views</SummaryLabel>
              <SummaryValue>
                {summary.totalPageViews?.toLocaleString() || '0'}
              </SummaryValue>
            </div>
            <SummaryIcon>👁️</SummaryIcon>
          </SummaryCardHeader>
          <SummarySubtext>Across {summary.daysWithData || 0} days</SummarySubtext>
        </SummaryCard>

        <SummaryCard>
          <SummaryCardHeader>
            <div>
              <SummaryLabel>Total Sessions</SummaryLabel>
              <SummaryValue>
                {summary.totalSessions?.toLocaleString() || '0'}
              </SummaryValue>
            </div>
            <SummaryIcon>🖥️</SummaryIcon>
          </SummaryCardHeader>
          <SummarySubtext>User visits</SummarySubtext>
        </SummaryCard>

        <SummaryCard>
          <SummaryCardHeader>
            <div>
              <SummaryLabel>Total Users</SummaryLabel>
              <SummaryValue>
                {summary.totalUsers?.toLocaleString() || '0'}
              </SummaryValue>
            </div>
            <SummaryIcon>👥</SummaryIcon>
          </SummaryCardHeader>
          <SummarySubtext>Unique visitors</SummarySubtext>
        </SummaryCard>

        <SummaryCard>
          <SummaryCardHeader>
            <div>
              <SummaryLabel>Avg Bounce Rate</SummaryLabel>
              <SummaryValue>
                {summary.avgBounceRate ? `${summary.avgBounceRate}%` : 'N/A'}
              </SummaryValue>
            </div>
            <SummaryIcon>📊</SummaryIcon>
          </SummaryCardHeader>
          <SummarySubtext>Lower is better</SummarySubtext>
        </SummaryCard>
      </SummaryCardsGrid>

      {/* Traffic Trends Chart */}
      <ChartCard>
        <ChartTitle>Traffic Trends Over Time</ChartTitle>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyTrendsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="pageViews"
              stackId="1"
              stroke="#e94560"
              fill="#e94560"
              fillOpacity={0.6}
              name="Page Views"
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stackId="2"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.6}
              name="Sessions"
            />
            <Area
              type="monotone"
              dataKey="users"
              stackId="3"
              stroke="#00d26a"
              fill="#00d26a"
              fillOpacity={0.6}
              name="Users"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Traffic Sources and Top Pages */}
      <TwoColumnGrid>
        {/* Traffic Sources Pie Chart */}
        <ChartCard>
          <ChartTitle>Traffic Sources</ChartTitle>
          {sourcesData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SOURCE_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem'
                    }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <SourceLegend>
                {sourcesData.map((source, index) => (
                  <SourceLegendItem key={source.name}>
                    <SourceLegendLeft>
                      <SourceColorDot
                        $color={SOURCE_COLORS[source.name.toLowerCase()] || COLORS[index % COLORS.length]}
                      />
                      <SourceName>{source.name}</SourceName>
                    </SourceLegendLeft>
                    <SourceValue>{source.value.toLocaleString()}</SourceValue>
                  </SourceLegendItem>
                ))}
              </SourceLegend>
            </>
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>No traffic source data available</p>
          )}
        </ChartCard>

        {/* Top Pages */}
        <ChartCard>
          <ChartTitle>Top Pages</ChartTitle>
          {pagesData.length > 0 ? (
            <>
              {pagesData.map((page, index) => (
                <PageRow key={page.path}>
                  <PageLeft>
                    <div>
                      <PageNumber>#{index + 1}</PageNumber>
                      <PagePath>{page.path}</PagePath>
                    </div>
                    <PageMeta>
                      <PageMetaText>{page.views.toLocaleString()} views</PageMetaText>
                      <PageMetaText>{page.unique.toLocaleString()} unique</PageMetaText>
                    </PageMeta>
                  </PageLeft>
                </PageRow>
              ))}
            </>
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>No page data available</p>
          )}
        </ChartCard>
      </TwoColumnGrid>

      {/* User Acquisition */}
      <ChartCard>
        <ChartTitle>User Acquisition</ChartTitle>
        {acquisition ? (
          <ThreeColumnGrid>
            <MetricColumn>
              <MetricColumnLabel>New Users</MetricColumnLabel>
              <MetricColumnValue $color="#4ade80">
                {acquisition.newUsers?.toLocaleString() || '0'}
              </MetricColumnValue>
              <ProgressBar>
                <ProgressFill
                  $color="#10b981"
                  $percent={acquisition.newUsers && acquisition.totalUsers
                    ? (acquisition.newUsers / acquisition.totalUsers * 100).toFixed(0)
                    : 0}
                />
              </ProgressBar>
              <MetricSubtext>
                {acquisition.newUsers && acquisition.totalUsers
                  ? `${(acquisition.newUsers / acquisition.totalUsers * 100).toFixed(1)}%`
                  : '0%'} of total
              </MetricSubtext>
            </MetricColumn>

            <MetricColumn>
              <MetricColumnLabel>Returning Users</MetricColumnLabel>
              <MetricColumnValue $color="#60a5fa">
                {acquisition.returningUsers?.toLocaleString() || '0'}
              </MetricColumnValue>
              <ProgressBar>
                <ProgressFill
                  $color="#3b82f6"
                  $percent={acquisition.returningUsers && acquisition.totalUsers
                    ? (acquisition.returningUsers / acquisition.totalUsers * 100).toFixed(0)
                    : 0}
                />
              </ProgressBar>
              <MetricSubtext>
                {acquisition.returningUsers && acquisition.totalUsers
                  ? `${(acquisition.returningUsers / acquisition.totalUsers * 100).toFixed(1)}%`
                  : '0%'} of total
              </MetricSubtext>
            </MetricColumn>

            <MetricColumn>
              <MetricColumnLabel>Conversion Rate</MetricColumnLabel>
              <MetricColumnValue $color="#a78bfa">
                {acquisition.conversionRate ? `${(parseFloat(acquisition.conversionRate) * 100).toFixed(2)}%` : 'N/A'}
              </MetricColumnValue>
              <MetricSubtext>Users who converted</MetricSubtext>
            </MetricColumn>
          </ThreeColumnGrid>
        ) : (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>No acquisition data available</p>
        )}
      </ChartCard>

      {/* Additional Metrics */}
      <ChartCard>
        <ChartTitle>Engagement Metrics</ChartTitle>
        <TwoColumnGridSmall>
          <MetricColumn>
            <MetricColumnLabel>Avg Session Duration</MetricColumnLabel>
            <MetricColumnValue>
              {summary.avgSessionDuration ? `${Math.floor(summary.avgSessionDuration / 60)}m ${summary.avgSessionDuration % 60}s` : 'N/A'}
            </MetricColumnValue>
            <MetricSubtext>Time spent on site per session</MetricSubtext>
          </MetricColumn>

          <MetricColumn>
            <MetricColumnLabel>Pages per Session</MetricColumnLabel>
            <MetricColumnValue>
              {summary.totalSessions && summary.totalPageViews
                ? (summary.totalPageViews / summary.totalSessions).toFixed(2)
                : 'N/A'}
            </MetricColumnValue>
            <MetricSubtext>Average pages viewed per visit</MetricSubtext>
          </MetricColumn>
        </TwoColumnGridSmall>
      </ChartCard>
    </Container>
  );
}
