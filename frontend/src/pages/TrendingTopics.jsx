/**
 * Trending Topics Page
 * Feature #272: Topic suggestions based on trends
 *
 * Displays trending industry themes, competitor analysis,
 * content gaps, and AI-generated topic suggestions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 30px;

  h1 {
    color: #fff;
    font-size: 28px;
    margin-bottom: 8px;
  }

  p {
    color: #999;
    font-size: 14px;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  background: ${props => props.$primary ? '#6366f1' : '#374151'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$primary ? '#4f46e5' : '#4b5563'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  background: #374151;
  color: white;
  border: 1px solid #4b5563;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const Card = styled.div`
  background: #1f2937;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #374151;

  h3 {
    color: #fff;
    font-size: 16px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h4 {
    color: #f3f4f6;
    font-size: 14px;
    margin-bottom: 10px;
    margin-top: 15px;
  }
`;

const MetricCard = styled(Card)`
  text-align: center;

  .metric-value {
    font-size: 32px;
    font-weight: bold;
    color: #6366f1;
    margin-bottom: 5px;
  }

  .metric-label {
    color: #9ca3af;
    font-size: 14px;
  }
`;

const TrendList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TrendItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #111827;
  border-radius: 8px;
  border-left: 3px solid ${props => props.$trend === 'rising' ? '#10b981' : props.$trend === 'falling' ? '#ef4444' : '#6b7280'};

  .trend-name {
    color: #f3f4f6;
    font-size: 14px;
    flex: 1;
  }

  .trend-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #9ca3af;
  }

  .trend-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .trend-badge.rising {
    background: #10b98120;
    color: #10b981;
  }

  .trend-badge.falling {
    background: #ef444420;
    color: #ef4444;
  }

  .trend-badge.stable {
    background: #6b728020;
    color: #6b7280;
  }
`;

const SuggestionCard = styled(Card)`
  border-left: 4px solid ${props => props.$priority === 'high' ? '#10b981' : props.$priority === 'medium' ? '#f59e0b' : '#6b7280'};

  .suggestion-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .suggestion-title {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    flex: 1;
    margin-right: 10px;
  }

  .suggestion-badges {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .badge {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge.high {
    background: #10b98120;
    color: #10b981;
  }

  .badge.medium {
    background: #f59e0b20;
    color: #f59e0b;
  }

  .badge.low {
    background: #6b728020;
    color: #6b7280;
  }

  .badge.quick-win {
    background: #8b5cf620;
    color: #8b5cf6;
  }

  .suggestion-description {
    color: #d1d5db;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 15px;
  }

  .key-points {
    margin: 15px 0;
  }

  .key-points ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .key-points li {
    color: #d1d5db;
    font-size: 13px;
    padding: 5px 0;
    padding-left: 20px;
    position: relative;

    &:before {
      content: '•';
      position: absolute;
      left: 5px;
      color: #6366f1;
    }
  }

  .suggestion-meta {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    padding-top: 15px;
    border-top: 1px solid #374151;
    font-size: 12px;
    color: #9ca3af;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .meta-value {
    color: #f3f4f6;
    font-weight: 600;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
`;

const ErrorState = styled.div`
  background: #ef444410;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 20px;
  color: #fca5a5;
  text-align: center;
  margin: 20px 0;
`;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const TrendingTopics = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchComprehensiveData();
  }, [timeframe]);

  const fetchComprehensiveData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/trending-topics/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe })
      });

      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch trending topics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchComprehensiveData();
  };

  if (loading) {
    return (
      <PageContainer>
        <Header>
          <h1>🔍 Trending Topics</h1>
          <p>AI-powered topic suggestions based on industry trends, competitor analysis, and content gaps</p>
        </Header>
        <LoadingState>
          <div>🔄 Analyzing trends and generating suggestions...</div>
        </LoadingState>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Header>
          <h1>🔍 Trending Topics</h1>
          <p>AI-powered topic suggestions based on industry trends, competitor analysis, and content gaps</p>
        </Header>
        <ErrorState>
          <div>⚠️ {error}</div>
          <Button onClick={handleRefresh} style={{ marginTop: '15px' }}>Retry</Button>
        </ErrorState>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <Header>
          <h1>🔍 Trending Topics</h1>
          <p>AI-powered topic suggestions based on industry trends, competitor analysis, and content gaps</p>
        </Header>
        <LoadingState>
          <div>No data available. Click refresh to generate suggestions.</div>
          <Button $primary onClick={handleRefresh} style={{ marginTop: '15px' }}>
            Generate Suggestions
          </Button>
        </LoadingState>
      </PageContainer>
    );
  }

  const { workflow, summary } = data;
  const trendingThemes = workflow.step1_trends.trendingThemes || [];
  const suggestions = workflow.step5_prioritized.suggestions || [];
  const priorityTiers = workflow.step5_prioritized.priorityTiers || {};
  const topTopics = workflow.step2_competitors.topTopics || [];

  // Prepare chart data
  const trendData = trendingThemes.slice(0, 8).map(theme => ({
    name: theme.theme.substring(0, 20),
    frequency: theme.frequency,
    sources: theme.sources?.length || 1
  }));

  const categoryData = [
    { name: 'Technology', value: trendingThemes.filter(t => t.category === 'technology').length },
    { name: 'Romance', value: trendingThemes.filter(t => t.category === 'romance').length },
    { name: 'Writing Craft', value: trendingThemes.filter(t => t.category === 'writing-craft').length },
    { name: 'Storytelling', value: trendingThemes.filter(t => t.category === 'storytelling').length },
    { name: 'General', value: trendingThemes.filter(t => t.category === 'general').length }
  ].filter(cat => cat.value > 0);

  return (
    <PageContainer>
      <Header>
        <h1>🔍 Trending Topics</h1>
        <p>AI-powered topic suggestions based on industry trends, competitor analysis, and content gaps</p>
      </Header>

      <Controls>
        <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </Select>
        <Button onClick={handleRefresh}>🔄 Refresh</Button>
      </Controls>

      {/* Summary Metrics */}
      <Grid>
        <MetricCard>
          <div className="metric-value">{summary.trendingThemes || 0}</div>
          <div className="metric-label">Trending Themes</div>
        </MetricCard>
        <MetricCard>
          <div className="metric-value">{summary.competitorContentAnalyzed || 0}</div>
          <div className="metric-label">Competitor Articles</div>
        </MetricCard>
        <MetricCard>
          <div className="metric-value">{summary.contentGaps || 0}</div>
          <div className="metric-label">Content Gaps</div>
        </MetricCard>
        <MetricCard>
          <div className="metric-value">{summary.topicSuggestions || 0}</div>
          <div className="metric-label">Topic Suggestions</div>
        </MetricCard>
        <MetricCard>
          <div className="metric-value">{summary.quickWins || 0}</div>
          <div className="metric-label">Quick Wins</div>
        </MetricCard>
      </Grid>

      {/* Trending Themes Chart */}
      <Grid>
        <Card style={{ gridColumn: '1 / -1' }}>
          <h3>📊 Trend Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                itemStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Bar dataKey="frequency" fill="#6366f1" name="Frequency" />
              <Bar dataKey="sources" fill="#10b981" name="Sources" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3>📈 Trending Themes</h3>
          <TrendList>
            {trendingThemes.slice(0, 6).map((theme, index) => (
              <TrendItem key={index} $trend={theme.trendDirection}>
                <div className="trend-name">{theme.theme}</div>
                <div className="trend-meta">
                  <span className="trend-badge {theme.trendDirection}">{theme.trendDirection}</span>
                  <span>{theme.frequency} mentions</span>
                </div>
              </TrendItem>
            ))}
          </TrendList>
        </Card>

        <Card>
          <h3>🎯 Category Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                itemStyle={{ color: '#f3f4f6' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      {/* Top Competitor Topics */}
      {topTopics.length > 0 && (
        <Card style={{ marginBottom: '30px' }}>
          <h3>🏆 Top Competitor Topics</h3>
          <Grid>
            {topTopics.slice(0, 4).map((topic, index) => (
              <Card key={index} style={{ background: '#111827', margin: 0 }}>
                <h4>{topic.topic}</h4>
                <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '10px' }}>
                  {topic.title}
                </div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6b7280' }}>
                  <span>👁️ {topic.views.toLocaleString()} views</span>
                  <span>💬 {topic.shares} shares</span>
                  <span>📊 {(topic.engagementRate * 100).toFixed(1)}% engagement</span>
                </div>
              </Card>
            ))}
          </Grid>
        </Card>
      )}

      {/* Quick Wins */}
      {priorityTiers.quickWins && priorityTiers.quickWins.length > 0 && (
        <Card style={{ marginBottom: '30px', borderLeft: '4px solid #8b5cf6' }}>
          <h3>⚡ Quick Wins</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '15px' }}>
            High opportunity, low difficulty topics you can create quickly
          </p>
          <Grid>
            {priorityTiers.quickWins.slice(0, 3).map((suggestion, index) => (
              <SuggestionCard key={index} $priority="high" style={{ margin: 0 }}>
                <div className="suggestion-header">
                  <div className="suggestion-title">{suggestion.title}</div>
                  <div className="suggestion-badges">
                    <span className="badge quick-win">Quick Win</span>
                  </div>
                </div>
                <div className="suggestion-description">{suggestion.description}</div>
              </SuggestionCard>
            ))}
          </Grid>
        </Card>
      )}

      {/* Priority-Ordered Suggestions */}
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>📝 Prioritized Topic Suggestions</h3>

      {/* High Priority */}
      {priorityTiers.high && priorityTiers.high.length > 0 && (
        <>
          <h4 style={{ color: '#10b981', marginBottom: '15px' }}>🔥 High Priority</h4>
          <Grid style={{ marginBottom: '20px' }}>
            {priorityTiers.high.slice(0, 3).map((suggestion, index) => (
              <SuggestionCard key={index} $priority="high">
                <div className="suggestion-header">
                  <div className="suggestion-title">{suggestion.title}</div>
                  <div className="suggestion-badges">
                    <span className="badge high">High Priority</span>
                    {suggestion.quickWin && <span className="badge quick-win">Quick Win</span>}
                  </div>
                </div>

                <div className="suggestion-description">{suggestion.description}</div>

                {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
                  <div className="key-points">
                    <strong style={{ color: '#f3f4f6', fontSize: '13px' }}>Key Points:</strong>
                    <ul>
                      {suggestion.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="suggestion-meta">
                  <div className="meta-item">
                    <span>📊 Opportunity Score:</span>
                    <span className="meta-value">{(suggestion.opportunityScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="meta-item">
                    <span>🎯 Trend Alignment:</span>
                    <span className="meta-value">{(suggestion.trendAlignment * 100).toFixed(0)}%</span>
                  </div>
                  <div className="meta-item">
                    <span>📈 SEO Potential:</span>
                    <span className="meta-value">{(suggestion.seoPotential * 100).toFixed(0)}%</span>
                  </div>
                  <div className="meta-item">
                    <span>📝 Difficulty:</span>
                    <span className="meta-value">{(suggestion.estimatedDifficulty * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {suggestion.targetKeywords && suggestion.targetKeywords.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <strong style={{ color: '#f3f4f6', fontSize: '12px' }}>Keywords:</strong>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                      {suggestion.targetKeywords.map((keyword, i) => (
                        <span
                          key={i}
                          style={{
                            background: '#6366f120',
                            color: '#a5b4fc',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SuggestionCard>
            ))}
          </Grid>
        </>
      )}

      {/* Medium Priority */}
      {priorityTiers.medium && priorityTiers.medium.length > 0 && (
        <>
          <h4 style={{ color: '#f59e0b', marginBottom: '15px' }}>⚡ Medium Priority</h4>
          <Grid style={{ marginBottom: '20px' }}>
            {priorityTiers.medium.slice(0, 2).map((suggestion, index) => (
              <SuggestionCard key={index} $priority="medium">
                <div className="suggestion-header">
                  <div className="suggestion-title">{suggestion.title}</div>
                  <div className="suggestion-badges">
                    <span className="badge medium">Medium Priority</span>
                  </div>
                </div>
                <div className="suggestion-description">{suggestion.description}</div>
                <div className="suggestion-meta">
                  <div className="meta-item">
                    <span>📊 Opportunity:</span>
                    <span className="meta-value">{(suggestion.opportunityScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="meta-item">
                    <span>📈 SEO:</span>
                    <span className="meta-value">{(suggestion.seoPotential * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </SuggestionCard>
            ))}
          </Grid>
        </>
      )}

      {/* Low Priority */}
      {priorityTiers.low && priorityTiers.low.length > 0 && (
        <>
          <h4 style={{ color: '#6b7280', marginBottom: '15px' }}>📌 Low Priority</h4>
          <Grid>
            {priorityTiers.low.slice(0, 2).map((suggestion, index) => (
              <SuggestionCard key={index} $priority="low">
                <div className="suggestion-header">
                  <div className="suggestion-title">{suggestion.title}</div>
                  <div className="suggestion-badges">
                    <span className="badge low">Low Priority</span>
                  </div>
                </div>
                <div className="suggestion-description">{suggestion.description}</div>
              </SuggestionCard>
            ))}
          </Grid>
        </>
      )}
    </PageContainer>
  );
};

export default TrendingTopics;
