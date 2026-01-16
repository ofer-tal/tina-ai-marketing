import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  color: #a0a0a0;
  margin: 0;
  font-size: 1.1rem;
`;

const ControlsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    border-color: #e94560;
  }
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: auto;

  &:hover {
    background: #e94560;
    border-color: #e94560;
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

const SummaryCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2);
  }
`;

const CardLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const CardValue = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: ${props => props.color || '#eaeaea'};
`;

const CardSubtext = styled.div`
  color: ${props => props.positive ? '#00d26a' : props.negative ? '#f8312f' : '#a0a0a0'};
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const ChartsGrid = styled.div`
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
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: #eaeaea;
`;

const TableCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const TableTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: #eaeaea;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  border-bottom: 2px solid #2d3561;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #2d3561;
  cursor: pointer;

  &:hover {
    background: #1a1a2e;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  text-align: ${props => props.align || 'left'};
`;

const HeaderCell = styled.th`
  padding: 1rem;
  text-align: ${props => props.align || 'left'};
  color: #a0a0a0;
  font-weight: 500;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  background: ${props => {
    if (props.positive) return '#00d26a20';
    if (props.negative) return '#f8312f20';
    return '#2d3561';
  }};
  color: ${props => {
    if (props.positive) return '#00d26a';
    if (props.negative) return '#f8312f';
    return '#eaeaea';
  }};
`;

const InsightsSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: #eaeaea;
`;

const InsightCard = styled.div`
  background: ${props => {
    if (props.priority === 'high') return '#f8312f10';
    if (props.priority === 'medium') return '#ffb02010';
    return '#2d3561';
  }};
  border-left: 4px solid ${props => {
    if (props.priority === 'high') return '#f8312f';
    if (props.priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InsightTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const InsightDescription = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  background: #f8312f20;
  border: 1px solid #f8312f;
  border-radius: 8px;
  padding: 1rem;
  color: #f8312f;
  margin-bottom: 1rem;
`;

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#06b6d4'];

const Attribution = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('last_click');
  const [platform, setPlatform] = useState('all');
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetchModels();
    fetchData();
  }, [model, platform]);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/attribution/models');
      const result = await response.json();
      if (result.success) {
        setModels(result.data);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ model });
      if (platform !== 'all') {
        params.append('platform', platform);
      }

      const response = await fetch(`http://localhost:3001/api/attribution/report?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to load attribution data');
      }
    } catch (err) {
      console.error('Error fetching attribution data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData();
  };

  if (loading) {
    return <LoadingSpinner>Loading attribution data...</LoadingSpinner>;
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>🎯 Conversion Attribution</PageTitle>
          <PageSubtitle>Attribute conversions to marketing touchpoints</PageSubtitle>
        </PageHeader>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </PageContainer>
    );
  }

  if (!data) {
    return <LoadingSpinner>No data available</LoadingSpinner>;
  }

  // Prepare chart data
  const channelRevenueData = data.channelROI?.map(ch => ({
    channel: ch.channel.toUpperCase(),
    revenue: ch.attributedRevenue || 0,
    conversions: ch.conversions
  })) || [];

  const channelROIData = data.channelROI?.map(ch => ({
    channel: ch.channel.toUpperCase(),
    roi: parseFloat(ch.roi) || 0
  })) || [];

  const revenueDistributionData = data.channelROI?.map(ch => ({
    name: ch.channel.toUpperCase(),
    value: ch.attributedRevenue || 0,
    percentage: ch.attributedRevenuePercentage || 0
  })) || [];

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>🎯 Conversion Attribution</PageTitle>
        <PageSubtitle>Attribute conversions to marketing touchpoints</PageSubtitle>
      </PageHeader>

      <ControlsBar>
        <Select value={model} onChange={(e) => setModel(e.target.value)}>
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>

        <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All Platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube_shorts">YouTube Shorts</option>
        </Select>

        <RefreshButton onClick={handleRefresh} disabled={loading}>
          🔄 Refresh
        </RefreshButton>
      </ControlsBar>

      <SummaryCards>
        <SummaryCard>
          <CardLabel>Total Revenue</CardLabel>
          <CardValue>${(data.overall?.totalRevenue || 0).toFixed(2)}</CardValue>
          <CardSubtext>Attributed across all channels</CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Overall ROI</CardLabel>
          <CardValue color={parseFloat(data.overall?.roi) > 100 ? '#00d26a' : '#ffb020'}>
            {data.overall?.roi || 0}%
          </CardValue>
          <CardSubtext positive={parseFloat(data.overall?.roi) > 100}>
            {parseFloat(data.overall?.roi) > 100 ? 'Excellent' : 'Needs improvement'}
          </CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Total Conversions</CardLabel>
          <CardValue>{data.channelROI?.reduce((sum, ch) => sum + ch.conversions, 0) || 0}</CardValue>
          <CardSubtext>Across all channels</CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Total Cost</CardLabel>
          <CardValue>${(data.overall?.totalCost || 0).toFixed(2)}</CardValue>
          <CardSubtext>Estimated marketing spend</CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Net Profit</CardLabel>
          <CardValue color={(data.overall?.totalProfit || 0) > 0 ? '#00d26a' : '#f8312f'}>
            ${(data.overall?.totalProfit || 0).toFixed(2)}
          </CardValue>
          <CardSubtext positive={data.overall?.totalProfit > 0}>
            {data.overall?.totalProfit > 0 ? 'Profitable' : 'Loss'}
          </CardSubtext>
        </SummaryCard>

        <SummaryCard>
          <CardLabel>Profit Margin</CardLabel>
          <CardValue>{(data.overall?.profitMargin || 0).toFixed(1)}%</CardValue>
          <CardSubtext>Revenue after costs</CardSubtext>
        </SummaryCard>
      </SummaryCards>

      <ChartsGrid>
        <ChartCard>
          <ChartTitle>Attributed Revenue by Channel</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="channel" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#e94560" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>ROI by Channel</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelROIData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="channel" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                formatter={(value) => `${value.toFixed(2)}%`}
              />
              <Legend />
              <Bar dataKey="roi" fill="#7b2cbf" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Conversions by Channel</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
              <XAxis dataKey="channel" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
              />
              <Legend />
              <Bar dataKey="conversions" fill="#00d26a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Revenue Distribution</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsGrid>

      <TableCard>
        <TableTitle>Channel Attribution Details</TableTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <HeaderCell>Channel</HeaderCell>
              <HeaderCell align="right">Revenue</HeaderCell>
              <HeaderCell align="right">Revenue %</HeaderCell>
              <HeaderCell align="right">Conversions</HeaderCell>
              <HeaderCell align="right">Cost</HeaderCell>
              <HeaderCell align="right">ROI</HeaderCell>
              <HeaderCell align="right">Profit</HeaderCell>
              <HeaderCell align="right">Margin</HeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {data.channelROI?.map((ch, index) => (
              <TableRow key={index}>
                <TableCell>
                  <strong>{ch.channel.toUpperCase()}</strong>
                </TableCell>
                <TableCell align="right">${(ch.attributedRevenue || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{(ch.attributedRevenuePercentage || 0).toFixed(1)}%</TableCell>
                <TableCell align="right">{ch.conversions}</TableCell>
                <TableCell align="right">${(ch.estimatedCost || 0).toFixed(2)}</TableCell>
                <TableCell align="right">
                  <StatusBadge positive={parseFloat(ch.roi) > 100} negative={parseFloat(ch.roi) < 50}>
                    {parseFloat(ch.roi).toFixed(2)}%
                  </StatusBadge>
                </TableCell>
                <TableCell align="right">
                  <span style={{ color: ch.profit > 0 ? '#00d26a' : '#f8312f' }}>
                    ${(ch.profit || 0).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell align="right">{(ch.profitMargin || 0).toFixed(1)}%</TableCell>
              </TableRow>
            )) || []}
          </tbody>
        </Table>
      </TableCard>

      {data.insights && data.insights.length > 0 && (
        <InsightsSection>
          <SectionTitle>💡 Insights</SectionTitle>
          {data.insights.map((insight, index) => (
            <InsightCard key={index} priority={insight.priority}>
              <InsightTitle>{insight.title}</InsightTitle>
              <InsightDescription>{insight.description}</InsightDescription>
            </InsightCard>
          ))}
        </InsightsSection>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <InsightsSection>
          <SectionTitle>🎯 Recommendations</SectionTitle>
          {data.recommendations.map((rec, index) => (
            <InsightCard key={index} priority={rec.priority}>
              <InsightTitle>{rec.title}</InsightTitle>
              <InsightDescription>
                {rec.description}
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <strong>Impact:</strong> {rec.impact} | <strong>Effort:</strong> {rec.effort}
                </div>
              </InsightDescription>
            </InsightCard>
          ))}
        </InsightsSection>
      )}
    </PageContainer>
  );
};

export default Attribution;
