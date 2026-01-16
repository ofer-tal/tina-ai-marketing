/**
 * Content Performance Dashboard
 *
 * Tracks and displays performance metrics across all content types:
 * - Blog Posts
 * - Press Releases
 * - Social Media Posts
 *
 * Feature #271: Content performance tracking
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Styled Components
const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#ffffff'};
  margin-bottom: 0.5rem;
`;

const Description = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#888'};
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  background: ${props => props.theme?.colors?.background || '#1a1a1a'};
  border: 1px solid ${props => props.theme?.colors?.border || '#333'};
  border-radius: 6px;
  color: ${props => props.theme?.colors?.text || '#ffffff'};
  cursor: pointer;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#6366f1'};
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.theme?.colors?.primary || '#6366f1'};
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme?.colors?.primaryHover || '#4f46e5'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const Card = styled.div`
  background: ${props => props.theme?.colors?.cardBackground || '#242424'};
  border: 1px solid ${props => props.theme?.colors?.border || '#333'};
  border-radius: 12px;
  padding: 1.5rem;
`;

const CardLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme?.colors?.textSecondary || '#888'};
  margin-bottom: 0.5rem;
`;

const CardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme?.colors?.text || '#ffffff'};
  margin-bottom: 0.25rem;
`;

const CardSubtext = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme?.colors?.textSecondary || '#888'};
`;

const ChartSection = styled.div`
  background: ${props => props.theme?.colors?.cardBackground || '#242424'};
  border: 1px solid ${props => props.theme?.colors?.border || '#333'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#ffffff'};
  margin-bottom: 1.5rem;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#333'};
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: ${props => props.$active
    ? props.theme?.colors?.primary || '#6366f1'
    : props.theme?.colors?.textSecondary || '#888'};
  border: none;
  border-bottom: 2px solid ${props => props.$active
    ? props.theme?.colors?.primary || '#6366f1'
    : 'transparent'};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: ${props => props.theme?.colors?.primary || '#6366f1'};
  }
`;

const ErrorMessage = styled.div`
  background: #ff444415;
  color: #ff4444;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme?.colors?.textSecondary || '#888'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme?.colors?.textSecondary || '#888'};
`;

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const ContentPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [topContent, setTopContent] = useState(null);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const [summaryRes, trendsRes, topContentRes, breakdownRes] = await Promise.all([
        fetch(`http://localhost:3001/api/content-performance/summary?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`),
        fetch(`http://localhost:3001/api/content-performance/trends/${dateRange}`),
        fetch(`http://localhost:3001/api/content-performance/top/10?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`),
        fetch(`http://localhost:3001/api/content-performance/breakdown?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`),
      ]);

      const [summaryData, trendsData, topContentData, breakdownData] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
        topContentRes.json(),
        breakdownRes.json(),
      ]);

      setSummary(summaryData.data);
      setTrends(trendsData.data);
      setTopContent(topContentData.data);
      setBreakdown(breakdownData.data);
    } catch (err) {
      setError('Failed to load content performance data');
      console.error('Error fetching content performance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingMessage>Loading content performance data...</LoadingMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!summary) {
    return <EmptyState>No content performance data available</EmptyState>;
  }

  const totalContent = summary.totals?.totalContent || 0;
  const totalViews = summary.totals?.totalViews || 0;
  const totalEngagements = summary.totals?.totalEngagements || 0;
  const avgEngagementRate = summary.totals?.avgEngagementRate || 0;

  return (
    <PageContainer>
      <Header>
        <Title>📊 Content Performance</Title>
        <Description>Track performance across all published content</Description>
      </Header>

      <Controls>
        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </Select>
        <Button onClick={fetchData}>🔄 Refresh</Button>
      </Controls>

      <SummaryCards>
        <Card>
          <CardLabel>Total Content</CardLabel>
          <CardValue>{totalContent}</CardValue>
          <CardSubtext>Across all types</CardSubtext>
        </Card>

        <Card>
          <CardLabel>Total Views</CardLabel>
          <CardValue>{totalViews.toLocaleString()}</CardValue>
          <CardSubtext>Blog + Press + Social</CardSubtext>
        </Card>

        <Card>
          <CardLabel>Total Engagements</CardLabel>
          <CardValue>{totalEngagements.toLocaleString()}</CardValue>
          <CardSubtext>Likes, shares, comments</CardSubtext>
        </Card>

        <Card>
          <CardLabel>Avg Engagement Rate</CardLabel>
          <CardValue>{avgEngagementRate.toFixed(2)}%</CardValue>
          <CardSubtext>Across all content</CardSubtext>
        </Card>
      </SummaryCards>

      <Tabs>
        <Tab
          $active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Tab>
        <Tab
          $active={activeTab === 'trends'}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </Tab>
        <Tab
          $active={activeTab === 'top'}
          onClick={() => setActiveTab('top')}
        >
          Top Content
        </Tab>
        <Tab
          $active={activeTab === 'breakdown'}
          onClick={() => setActiveTab('breakdown')}
        >
          Breakdown
        </Tab>
      </Tabs>

      {activeTab === 'overview' && (
        <>
          <ChartSection>
            <SectionTitle>Performance by Content Type</SectionTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                {
                  name: 'Blog Posts',
                  views: summary.blogPosts?.totalViews || 0,
                  engagements: summary.blogPosts?.totalEngagements || 0,
                },
                {
                  name: 'Press Releases',
                  views: summary.pressReleases?.totalImpressions || 0,
                  engagements: summary.pressReleases?.totalEngagements || 0,
                },
                {
                  name: 'Social Media',
                  views: summary.socialMedia?.totalViews || 0,
                  engagements: summary.socialMedia?.totalEngagements || 0,
                },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#242424', border: '1px solid #333', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }}
                />
                <Legend />
                <Bar dataKey="views" fill="#6366f1" name="Views/Impressions" />
                <Bar dataKey="engagements" fill="#ec4899" name="Engagements" />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>

          <ChartSection>
            <SectionTitle>Content Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Blog Posts', value: summary.blogPosts?.totalPosts || 0 },
                    { name: 'Press Releases', value: summary.pressReleases?.totalReleases || 0 },
                    { name: 'Social Media', value: summary.socialMedia?.totalPosts || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#242424', border: '1px solid #333', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartSection>
        </>
      )}

      {activeTab === 'trends' && trends && (
        <ChartSection>
          <SectionTitle>Performance Over Time</SectionTitle>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trends.dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: '#242424', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend />
              <Area type="monotone" dataKey="blogViews" stackId="1" stroke="#6366f1" fill="#6366f1" name="Blog Views" />
              <Area type="monotone" dataKey="pressImpressions" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Press Impressions" />
              <Area type="monotone" dataKey="socialViews" stackId="1" stroke="#ec4899" fill="#ec4899" name="Social Views" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {activeTab === 'top' && topContent && (
        <ChartSection>
          <SectionTitle>Top Performing Content</SectionTitle>
          {topContent.topContent && topContent.topContent.length > 0 ? (
            <div>
              {topContent.topContent.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {item.type} • {new Date(item.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>
                      {item.engagements.toLocaleString()} engagements
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {item.engagementRate}% rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No top content data available</EmptyState>
          )}
        </ChartSection>
      )}

      {activeTab === 'breakdown' && breakdown && (
        <>
          <ChartSection>
            <SectionTitle>Blog Posts by Category</SectionTitle>
            {Object.keys(breakdown.breakdown.blog).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(breakdown.breakdown.blog).map(([name, data]) => ({
                  name,
                  views: data.views,
                  engagements: data.engagements,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#242424', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#6366f1" />
                  <Bar dataKey="engagements" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>No blog category data available</EmptyState>
            )}
          </ChartSection>

          <ChartSection>
            <SectionTitle>Social Media by Platform</SectionTitle>
            {Object.keys(breakdown.breakdown.social?.byPlatform || {}).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(breakdown.breakdown.social.byPlatform).map(([name, data]) => ({
                  name,
                  views: data.views,
                  engagements: data.engagements,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#242424', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#6366f1" />
                  <Bar dataKey="engagements" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>No social media platform data available</EmptyState>
            )}
          </ChartSection>
        </>
      )}
    </PageContainer>
  );
};

export default ContentPerformance;
