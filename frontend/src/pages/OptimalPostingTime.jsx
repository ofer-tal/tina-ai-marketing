import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #eaeaea;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #2d3561;
  border-radius: 8px;
  background: #16213e;
  color: #eaeaea;
  cursor: pointer;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: #e94560;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const Card = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  color: #eaeaea;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #2d3561;

  &:last-child {
    border-bottom: none;
  }
`;

const StatLabel = styled.span`
  color: #a0a0a0;
`;

const StatValue = styled.span`
  font-weight: 600;
  color: #eaeaea;
`;

const PeakTimeCard = styled(Card)`
  border-left: 4px solid #00d26a;
`;

const WorstTimeCard = styled(Card)`
  border-left: 4px solid #f8312f;
`;

const ChartContainer = styled(Card)`
  min-height: 400px;
`;

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RecommendationItem = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid ${props => {
    switch (props.priority) {
      case 'high': return '#f8312f';
      case 'medium': return '#ffb020';
      default: return '#a0a0a0';
    }
  }};
`;

const RecommendationTitle = styled.h4`
  font-size: 1rem;
  color: #eaeaea;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PriorityBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.priority) {
      case 'high': return 'rgba(248, 49, 47, 0.2)';
      case 'medium': return 'rgba(255, 176, 32, 0.2)';
      default: return 'rgba(160, 160, 160, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.priority) {
      case 'high': return '#f8312f';
      case 'medium': return '#ffb020';
      default: return '#a0a0a0';
    }
  }};
`;

const ScheduleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const PlatformSchedule = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const PlatformName = styled.h4`
  font-size: 1rem;
  color: #eaeaea;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TimeSlot = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #16213e;
  border-radius: 6px;
  margin-bottom: 0.5rem;
`;

const TimeSlotPriority = styled.span`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: #e94560;
  color: white;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  background: rgba(248, 49, 47, 0.1);
  border: 1px solid #f8312f;
  border-radius: 8px;
  padding: 1rem;
  color: #f8312f;
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
`;

function OptimalPostingTime() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    platform: '',
    days: 30,
    timezone: 'America/New_York'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.platform) params.append('platform', filters.platform);
      params.append('days', filters.days);
      params.append('timezone', filters.timezone);
      params.append('postsPerDay', '3');
      params.append('minIntervalHours', '4');

      const response = await fetch(`/api/posting-time/analysis?${params}`);
      const result = await response.json();

      if (result.success) {
        if (result.data.error) {
          setError(result.data.error);
          setData(null);
        } else {
          setData(result.data);
        }
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handlePlatformChange = (e) => {
    setFilters({ ...filters, platform: e.target.value });
  };

  const handleDaysChange = (e) => {
    setFilters({ ...filters, days: parseInt(e.target.value) });
  };

  const handleTimezoneChange = (e) => {
    setFilters({ ...filters, timezone: e.target.value });
  };

  if (loading) {
    return <LoadingSpinner>Loading analysis...</LoadingSpinner>;
  }

  if (error) {
    return (
      <PageContainer>
        <Header>
          <Title>⏰ Optimal Posting Times</Title>
          <Controls>
            <Select value={filters.platform} onChange={handlePlatformChange}>
              <option value="">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube_shorts">YouTube Shorts</option>
            </Select>
            <Select value={filters.days} onChange={handleDaysChange}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
            <Button onClick={fetchData}>🔄 Refresh</Button>
          </Controls>
        </Header>
        <ErrorMessage>{error}</ErrorMessage>
        <EmptyState>
          <p>Not enough data available yet. Start posting content to see optimal time recommendations.</p>
        </EmptyState>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <Header>
          <Title>⏰ Optimal Posting Times</Title>
          <Controls>
            <Select value={filters.platform} onChange={handlePlatformChange}>
              <option value="">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube_shorts">YouTube Shorts</option>
            </Select>
            <Select value={filters.days} onChange={handleDaysChange}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
            <Button onClick={fetchData}>🔄 Refresh</Button>
          </Controls>
        </Header>
        <EmptyState>
          <p>No data available. Start posting content to see optimal time recommendations.</p>
        </EmptyState>
      </PageContainer>
    );
  }

  const { summary, peakTimes, worstTimes, overallAverages, schedule, analysis } = data;

  // Prepare chart data
  const chartData = data.hourlyData.map(hour => ({
    hour: `${hour.hour}:00`,
    engagement: hour.avgEngagementScore,
    views: hour.avgViews,
    engagementRate: hour.avgEngagementRate
  }));

  return (
    <PageContainer>
      <Header>
        <Title>⏰ Optimal Posting Times</Title>
        <Controls>
          <Select value={filters.platform} onChange={handlePlatformChange}>
            <option value="">All Platforms</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube_shorts">YouTube Shorts</option>
          </Select>
          <Select value={filters.days} onChange={handleDaysChange}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Select value={filters.timezone} onChange={handleTimezoneChange}>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
          </Select>
          <Button onClick={fetchData}>🔄 Refresh</Button>
        </Controls>
      </Header>

      {/* Summary Stats */}
      <Grid>
        <Card>
          <CardTitle>📊 Analysis Summary</CardTitle>
          <StatRow>
            <StatLabel>Posts Analyzed</StatLabel>
            <StatValue>{summary.totalPostsAnalyzed || overallAverages?.totalPosts || 0}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Date Range</StatLabel>
            <StatValue>{summary.dateRange}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Timezone</StatLabel>
            <StatValue>{summary.timezone}</StatValue>
          </StatRow>
        </Card>

        <Card>
          <CardTitle>📈 Overall Averages</CardTitle>
          <StatRow>
            <StatLabel>Avg Engagement Score</StatLabel>
            <StatValue>{overallAverages?.avgEngagementScore?.toFixed(2) || 'N/A'}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Avg Views</StatLabel>
            <StatValue>{overallAverages?.avgViews?.toLocaleString() || 'N/A'}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Avg Engagement Rate</StatLabel>
            <StatValue>{overallAverages?.avgEngagementRate?.toFixed(2)}%</StatValue>
          </StatRow>
        </Card>

        <Card>
          <CardTitle>⏰ Best Time Range</CardTitle>
          <StatRow>
            <StatLabel>Top Performing Period</StatLabel>
            <StatValue style={{ textTransform: 'capitalize' }}>
              {analysis?.bestTimeRange || 'N/A'}
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Score</StatLabel>
            <StatValue>{analysis?.bestTimeRangeScore?.toFixed(2) || 'N/A'}</StatValue>
          </StatRow>
        </Card>
      </Grid>

      {/* Peak and Worst Times */}
      <Grid>
        <PeakTimeCard>
          <CardTitle>🏆 Peak Posting Times</CardTitle>
          {peakTimes?.slice(0, 3).map((peak, index) => (
            <StatRow key={index}>
              <StatLabel>#{index + 1} {peak.hourFormatted}</StatLabel>
              <StatValue>
                Score: {peak.avgEngagementScore?.toFixed(2)}
                <br />
                <small>({peak.postCount} posts)</small>
              </StatValue>
            </StatRow>
          ))}
        </PeakTimeCard>

        <WorstTimeCard>
          <CardTitle>📉 Low Engagement Times</CardTitle>
          {worstTimes?.slice(0, 3).map((worst, index) => (
            <StatRow key={index}>
              <StatLabel>#{index + 1} {worst.hourFormatted}</StatLabel>
              <StatValue>
                Score: {worst.avgEngagementScore?.toFixed(2)}
                <br />
                <small>({worst.postCount} posts)</small>
              </StatValue>
            </StatRow>
          ))}
        </WorstTimeCard>

        <Card>
          <CardTitle>💡 Quick Recommendations</CardTitle>
          <StatRow>
            <StatLabel>Best Time to Post</StatLabel>
            <StatValue>{peakTimes?.[0]?.hourFormatted || 'N/A'}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Avoid Posting</StatLabel>
            <StatValue>{worstTimes?.[0]?.hourFormatted || 'N/A'}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Vs Average</StatLabel>
            <StatValue>
              {peakTimes?.[0]?.normalizedScore?.toFixed(0)}% of average
            </StatValue>
          </StatRow>
        </Card>
      </Grid>

      {/* Hourly Engagement Chart */}
      <ChartContainer>
        <CardTitle>📊 Engagement by Hour (UTC)</CardTitle>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis dataKey="hour" stroke="#a0a0a0" />
            <YAxis stroke="#a0a0a0" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#16213e',
                border: '1px solid #2d3561',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#e94560"
              strokeWidth={2}
              name="Engagement Score"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Recommended Schedule */}
      <Card style={{ marginBottom: '2rem' }}>
        <CardTitle>📅 Recommended Posting Schedule</CardTitle>
        <ScheduleGrid>
          {schedule?.schedule?.map(platform => (
            <PlatformSchedule key={platform.platform}>
              <PlatformName>
                {platform.platform === 'tiktok' && '🎵'}
                {platform.platform === 'instagram' && '📸'}
                {platform.platform === 'youtube_shorts' && '📺'}
                {' '}{platform.platform.replace('_', ' ').toUpperCase()}
              </PlatformName>
              {platform.postingTimes.map((time, index) => (
                <TimeSlot key={index}>
                  <span>
                    <strong>{time.hourFormatted}</strong>
                    <br />
                    <small>Confidence: {time.confidence}</small>
                  </span>
                  <TimeSlotPriority>Priority {time.priority}</TimeSlotPriority>
                </TimeSlot>
              ))}
            </PlatformSchedule>
          ))}
        </ScheduleGrid>
      </Card>

      {/* Detailed Recommendations */}
      <Card>
        <CardTitle>💡 Detailed Recommendations</CardTitle>
        <RecommendationList>
          {schedule?.recommendations?.map((rec, index) => (
            <RecommendationItem key={index} priority={rec.priority}>
              <RecommendationTitle>
                {rec.title}
                <PriorityBadge priority={rec.priority}>{rec.priority}</PriorityBadge>
              </RecommendationTitle>
              <p>{rec.description}</p>
              <p><strong>Action:</strong> {rec.action}</p>
            </RecommendationItem>
          ))}
        </RecommendationList>
      </Card>
    </PageContainer>
  );
}

export default OptimalPostingTime;
