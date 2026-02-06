import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  color: #a0a0a0;
  font-size: 14px;
`;

const Controls = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  background: #16213e;
  color: #eaeaea;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #7b2cbf;
  }
`;

const Button = styled.button`
  background: #7b2cbf;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 24px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #9d4edd;
  }
  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
`;

const Card = styled.div`
  background: #16213e;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #2d3561;
`;

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 16px;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #e94560;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #a0a0a0;
`;

const InsightCard = styled(Card)`
  border-left: 4px solid ${props => {
    switch (props.priority) {
      case 'high': return '#e94560';
      case 'medium': return '#ffb020';
      case 'low': return '#00d26a';
      default: return '#2d3561';
    }
  }};
`;

const InsightTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 8px;
`;

const InsightText = styled.p`
  font-size: 13px;
  color: #a0a0a0;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const RecommendationText = styled.p`
  font-size: 13px;
  color: #00d26a;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const ActionList = styled.ul`
  margin: 0;
  padding-left: 20px;

  li {
    font-size: 12px;
    color: #a0a0a0;
    margin-bottom: 4px;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 16px;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  background: #3d1a1a;
  border: 1px solid #e94560;
  border-radius: 8px;
  padding: 16px;
  color: #e94560;
  margin-bottom: 24px;
`;

const WarningMessage = styled.div`
  background: #3d3a1a;
  border: 1px solid #ffb020;
  border-radius: 8px;
  padding: 16px;
  color: #ffb020;
  margin-bottom: 24px;
`;

const ChartContainer = styled.div`
  height: 300px;
  margin-bottom: 24px;
`;

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#4a90e2'];

const ContentEngagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    platform: 'all',
    minViews: 100
  });

  useEffect(() => {
    loadAnalysis();
  }, [filters]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        minViews: filters.minViews
      };

      if (filters.platform !== 'all') {
        requestBody.platform = filters.platform;
      }

      const response = await fetch('/api/content-engagement/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load analysis');
      }

      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading engagement analysis...</LoadingSpinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>Error: {error}</ErrorMessage>
        <Button onClick={loadAnalysis}>Retry</Button>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container>
        <LoadingSpinner>Initializing...</LoadingSpinner>
      </Container>
    );
  }

  const { summary, correlations, insights, recommendations } = data;

  // Show warning if not enough data
  if (!summary || summary.totalPostsAnalyzed === 0) {
    return (
      <Container>
        <Header>
          <Title>Content Engagement Analysis</Title>
          <Subtitle>Correlate content features with engagement metrics</Subtitle>
        </Header>

        <WarningMessage>
          No data found for analysis. Try lowering the minimum views threshold.
        </WarningMessage>

        <Controls>
          <label>
            Min Views:
            <input
              type="number"
              value={filters.minViews}
              onChange={(e) => setFilters({ ...filters, minViews: parseInt(e.target.value) })}
              style={{ marginLeft: 8, padding: 4 }}
            />
          </label>
        </Controls>
      </Container>
    );
  }

  // Prepare chart data
  const categoryData = Object.entries(correlations?.byCategory || {})
    .map(([category, stats]) => ({
      name: category,
      engagement: stats.avgEngagementRate,
      views: stats.avgViews,
      count: stats.count
    }));

  const spicinessData = Object.entries(correlations?.bySpiciness || {})
    .map(([level, stats]) => ({
      name: `Level ${level}`,
      engagement: stats.avgEngagementRate,
      views: stats.avgViews,
      count: stats.count
    }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  const platformData = Object.entries(correlations?.byPlatform || {})
    .map(([platform, stats]) => ({
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      engagement: stats.avgEngagementRate,
      views: stats.avgViews,
      count: stats.count
    }));

  return (
    <Container>
      <Header>
        <Title>Content Engagement Analysis</Title>
        <Subtitle>
          Analyzed {summary.totalPostsAnalyzed} posts • {new Date(summary.analysisDate).toLocaleDateString()}
        </Subtitle>
      </Header>

      <Controls>
        <Select
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
        >
          <option value="all">All Platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube_shorts">YouTube Shorts</option>
        </Select>

        <label>
          Min Views:
          <input
            type="number"
            value={filters.minViews}
            onChange={(e) => setFilters({ ...filters, minViews: parseInt(e.target.value) })}
            style={{ marginLeft: 8, padding: 4 }}
          />
        </label>

        <Button onClick={loadAnalysis}>Refresh</Button>
      </Controls>

      {/* Summary Stats */}
      <Grid>
        <Card>
          <StatValue>{summary.totalPostsAnalyzed}</StatValue>
          <StatLabel>Posts Analyzed</StatLabel>
        </Card>
        <Card>
          <StatValue>{categoryData.length}</StatValue>
          <StatLabel>Categories</StatLabel>
        </Card>
        <Card>
          <StatValue>{spicinessData.length}</StatValue>
          <StatLabel>Spiciness Levels</StatLabel>
        </Card>
      </Grid>

      {/* Category Performance Chart */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Engagement by Category</CardTitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="name" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
              <Legend />
              <Bar dataKey="engagement" name="Avg Engagement Rate (%)" fill="#e94560" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Card>

      {/* Spiciness Performance Chart */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Engagement by Spiciness Level</CardTitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spicinessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="name" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
              <Legend />
              <Bar dataKey="engagement" name="Avg Engagement Rate (%)" fill="#7b2cbf" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Card>

      {/* Platform Performance Chart */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Engagement by Platform</CardTitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="name" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
              <Legend />
              <Bar dataKey="engagement" name="Avg Engagement Rate (%)" fill="#00d26a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Card>

      {/* Insights */}
      <div style={{ marginBottom: 24 }}>
        <CardTitle style={{ marginBottom: 16 }}>Key Insights</CardTitle>
        <Grid>
          {insights.insights?.map((insight, index) => (
            <InsightCard key={index} priority={insight.priority}>
              <InsightTitle>{insight.title}</InsightTitle>
              <InsightText>{insight.insight}</InsightText>
              <RecommendationText>💡 {insight.recommendation}</RecommendationText>
            </InsightCard>
          ))}
        </Grid>
      </div>

      {/* Recommendations */}
      <div>
        <CardTitle style={{ marginBottom: 16 }}>Recommendations</CardTitle>
        <Grid>
          {recommendations.recommendations?.map((rec, index) => (
            <InsightCard key={index} priority={rec.priority}>
              <InsightTitle>{rec.title}</InsightTitle>
              <InsightText>{rec.recommendation}</InsightText>
              <div style={{ marginBottom: 8 }}>
                <strong>Expected Impact:</strong> {rec.expectedImpact}
              </div>
              <ActionList>
                {rec.actionItems?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ActionList>
            </InsightCard>
          ))}
        </Grid>
      </div>
    </Container>
  );
};

export default ContentEngagement;
