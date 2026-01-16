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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: #a0a0a0;
  margin: 0.5rem 0 0 0;
  font-size: 1rem;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    transform: none;
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled.div`
  background: linear-gradient(135deg, #16213e 0%, #1a1a3e 100%);
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.15);
  }
`;

const CardLabel = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const CardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #e94560;
  margin-bottom: 0.25rem;
`;

const CardSubtext = styled.div`
  font-size: 0.85rem;
  color: #7b2cbf;
`;

const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ChartCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
`;

const ChartTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #eaeaea;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '📊';
  }
`;

const RankingsTable = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const TableTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #eaeaea;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '🏆';
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  border-bottom: 2px solid #2d3561;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #2d3561;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(233, 69, 96, 0.1);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  text-align: left;
  color: #eaeaea;
  font-size: 0.9rem;
`;

const TableHeader = styled.th`
  padding: 1rem;
  text-align: left;
  color: #a0a0a0;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RankBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.9rem;
  background: ${props => {
    if (props.$rank <= 3) return '#e94560';
    if (props.$rank <= 5) return '#7b2cbf';
    return '#2d3561';
  }};
  color: white;
`;

const PerformanceBar = styled.div`
  width: 100px;
  height: 8px;
  background: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;
`;

const PerformanceFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 4px;
  width: ${props => props.$percent}%;
  transition: width 0.3s ease;
`;

const TierBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$tier) {
      case 'Excellent': return '#00d26a';
      case 'Good': return '#7b2cbf';
      case 'Average': return '#ffb020';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const InsightsSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const InsightCard = styled.div`
  padding: 1rem;
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(0, 210, 106, 0.1)';
      case 'warning': return 'rgba(255, 176, 32, 0.1)';
      case 'info': return 'rgba(123, 44, 191, 0.1)';
      default: return 'rgba(45, 53, 97, 0.5)';
    }
  }};
  border-left: 3px solid ${props => {
    switch (props.$type) {
      case 'success': return '#00d26a';
      case 'warning': return '#ffb020';
      case 'info': return '#7b2cbf';
      default: return '#2d3561';
    }
  }};
  border-radius: 6px;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InsightTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InsightMessage = styled.div`
  color: #c0c0c0;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const RecommendationsSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
`;

const RecommendationCard = styled.div`
  padding: 1rem;
  background: rgba(45, 53, 97, 0.5);
  border: 1px solid #2d3561;
  border-radius: 8px;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const RecommendationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const RecommendationTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RecommendationMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const MetaBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    if (props.$priority === 'high') return '#e94560';
    if (props.$priority === 'medium') return '#7b2cbf';
    return '#2d3561';
  }};
  color: white;
`;

const RecommendationDescription = styled.div`
  color: #c0c0c0;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  padding: 1.5rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  border-radius: 8px;
  color: #ff6b6b;
  text-align: center;
  margin-bottom: 2rem;
`;

// Colors for charts
const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#00b4d8', '#ff6b6b', '#4ecdc4', '#95e1d3'];

function VideoStyles() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState(null);

  useEffect(() => {
    fetchData();
  }, [platformFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const platform = platformFilter === 'all' ? undefined : platformFilter;
      const response = await fetch(`http://localhost:3001/api/video-style-analysis/analyze${platform ? `?platform=${platform}` : ''}`);

      if (!response.ok) {
        throw new Error('Failed to fetch video style analysis');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Error fetching video style analysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Header>
          <div>
            <Title>Video Style Performance</Title>
            <Subtitle>Analyze which video styles perform best across platforms</Subtitle>
          </div>
        </Header>
        <LoadingSpinner>Loading video style analysis...</LoadingSpinner>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Header>
          <div>
            <Title>Video Style Performance</Title>
            <Subtitle>Analyze which video styles perform best across platforms</Subtitle>
          </div>
        </Header>
        <ErrorMessage>
          ⚠️ {error}
        </ErrorMessage>
        <RefreshButton onClick={fetchData}>Retry</RefreshButton>
      </PageContainer>
    );
  }

  if (!data) {
    return null;
  }

  const { statistics, ranked, characteristics, insights, recommendations } = data;

  // Prepare chart data
  const viewsData = (ranked?.ranked || []).map(style => ({
    name: style.displayName,
    views: Math.round(style.averages.avgViews),
    posts: style.postCount
  }));

  const engagementData = (ranked?.ranked || []).map(style => ({
    name: style.displayName,
    engagementRate: style.averages.avgEngagementRate.toFixed(2),
    posts: style.postCount
  }));

  const viralityData = (ranked?.ranked || []).map(style => ({
    name: style.displayName,
    viralityScore: style.viralityScore.toFixed(1),
    posts: style.postCount
  }));

  const pieData = (ranked?.ranked || []).map((style, index) => ({
    name: style.displayName,
    value: style.postCount,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <PageContainer>
      <Header>
        <div>
          <Title>Video Style Performance</Title>
          <Subtitle>Analyze which video styles perform best across platforms</Subtitle>
        </div>
        <Controls>
          <FilterSelect
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All Platforms</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube_shorts">YouTube Shorts</option>
          </FilterSelect>
          <RefreshButton onClick={fetchData} disabled={loading}>
            🔄 Refresh
          </RefreshButton>
        </Controls>
      </Header>

      {/* Summary Cards */}
      <SummaryCards>
        <SummaryCard>
          <CardLabel>Total Video Styles</CardLabel>
          <CardValue>{statistics?.totalStyles || 0}</CardValue>
          <CardSubtext>{statistics?.activeStyles || 0} active</CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Top Style</CardLabel>
          <CardValue style={{ fontSize: '1.5rem' }}>
            {ranked?.top?.displayName || 'N/A'}
          </CardValue>
          <CardSubtext>
            Score: {ranked?.top?.viralityScore?.toFixed(1) || '0'}
          </CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Lowest Style</CardLabel>
          <CardValue style={{ fontSize: '1.5rem' }}>
            {ranked?.bottom?.displayName || 'N/A'}
          </CardValue>
          <CardSubtext>
            Score: {ranked?.bottom?.viralityScore?.toFixed(1) || '0'}
          </CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Performance Gap</CardLabel>
          <CardValue>
            {ranked?.gap?.viralityScore?.toFixed(1) || '0'}
          </CardValue>
          <CardSubtext>Virality points</CardSubtext>
        </SummaryCard>
      </SummaryCards>

      {/* Charts */}
      <ChartsSection>
        <ChartCard>
          <ChartTitle>Average Views by Style</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="name" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
              <Legend />
              <Bar dataKey="views" fill="#e94560" name="Avg Views" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Engagement Rate by Style</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="name" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
              <Legend />
              <Bar dataKey="engagementRate" fill="#7b2cbf" name="Engagement Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Virality Score by Style</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={viralityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="name" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
              <Legend />
              <Bar dataKey="viralityScore" fill="#00d26a" name="Virality Score" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Posts Distribution by Style</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                labelStyle={{ color: '#eaeaea' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsSection>

      {/* Rankings Table */}
      <RankingsTable>
        <TableTitle>Video Style Rankings</TableTitle>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Rank</TableHeader>
              <TableHeader>Style</TableHeader>
              <TableHeader>Tier</TableHeader>
              <TableHeader>Posts</TableHeader>
              <TableHeader>Avg Views</TableHeader>
              <TableHeader>Engagement</TableHeader>
              <TableHeader>Virality</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {(ranked?.ranked || []).map((style) => (
              <TableRow key={style.style}>
                <TableCell>
                  <RankBadge $rank={style.rank}>{style.rank}</RankBadge>
                </TableCell>
                <TableCell>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {style.displayName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                    {style.description}
                  </div>
                </TableCell>
                <TableCell>
                  <TierBadge $tier={characteristics?.find(c => c.style === style.style)?.tier || 'Low'}>
                    {characteristics?.find(c => c.style === style.style)?.tier || 'Low'}
                  </TierBadge>
                </TableCell>
                <TableCell>{style.postCount}</TableCell>
                <TableCell>
                  {style.averages.avgViews > 0
                    ? style.averages.avgViews.toLocaleString()
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {style.averages.avgEngagementRate.toFixed(2)}%
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PerformanceBar $percent={Math.min(style.viralityScore, 100)} />
                    <span style={{ fontWeight: '600', minWidth: '40px' }}>
                      {style.viralityScore.toFixed(1)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </RankingsTable>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <InsightsSection>
          <TableTitle>Key Insights</TableTitle>
          {insights.map((insight, index) => (
            <InsightCard key={index} $type={insight.type}>
              <InsightTitle>
                {insight.priority === 'high' && '🔴'}
                {insight.priority === 'medium' && '🟡'}
                {insight.priority === 'low' && '🔵'}
                {insight.title}
              </InsightTitle>
              <InsightMessage>{insight.message}</InsightMessage>
            </InsightCard>
          ))}
        </InsightsSection>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <RecommendationsSection>
          <TableTitle>Recommendations</TableTitle>
          {recommendations.map((rec, index) => (
            <RecommendationCard key={index}>
              <RecommendationHeader>
                <RecommendationTitle>
                  🎯 {rec.action}
                </RecommendationTitle>
                <RecommendationMeta>
                  <MetaBadge $priority={rec.priority}>{rec.priority}</MetaBadge>
                  <MetaBadge $priority="medium">Impact: {rec.impact}</MetaBadge>
                  <MetaBadge $priority="medium">Effort: {rec.effort}</MetaBadge>
                </RecommendationMeta>
              </RecommendationHeader>
              <RecommendationDescription>{rec.description}</RecommendationDescription>
            </RecommendationCard>
          ))}
        </RecommendationsSection>
      )}
    </PageContainer>
  );
}

export default VideoStyles;
