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
    transform: translateY(-2px);
    transition: all 0.2s;
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
  color: ${props => {
    if (props.positive) return '#00d26a';
    if (props.negative) return '#f8312f';
    return '#eaeaea';
  }};
`;

const CardChange = styled.div`
  font-size: 0.9rem;
  margin-top: 0.5rem;
  color: ${props => props.positive ? '#00d26a' : props.negative ? '#f8312f' : '#a0a0a0'};
`;

const Section = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
`;

const ChannelTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const ChannelTableHeader = styled.th`
  text-align: left;
  padding: 1rem;
  border-bottom: 1px solid #2d3561;
  color: #a0a0a0;
  font-weight: 600;
`;

const ChannelTableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #2d3561;
`;

const ChannelTableRow = styled.tr`
  &:hover {
    background: #1a1a2e;
  }

  &:last-child ${ChannelTableCell} {
    border-bottom: none;
  }
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => {
    switch (props.type) {
      case 'paid': return '#e94560';
      case 'organic': return '#7b2cbf';
      default: return '#2d3561';
    }
  }};
`;

const ROIBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => {
    if (props.roi >= 100) return '#00d26a';
    if (props.roi >= 50) return '#ffb020';
    if (props.roi >= 0) return '#f8312f';
    return '#ff0000';
  }};
`;

const RecommendationsList = styled.div`
  display: grid;
  gap: 1rem;
`;

const RecommendationCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.priority) {
      case 'critical': return '#f8312f';
      case 'high': return '#ffb020';
      case 'medium': return '#7b2cbf';
      default: return '#2d3561';
    }
  }};

  &:hover {
    border-color: #e94560;
  }
`;

const RecommendationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const RecommendationTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  color: #eaeaea;
`;

const PriorityBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.priority) {
      case 'critical': return '#f8312f';
      case 'high': return '#ffb020';
      case 'medium': return '#7b2cbf';
      default: return '#2d3561';
    }
  }};
`;

const RecommendationDescription = styled.p`
  color: #a0a0a0;
  margin: 0 0 1rem 0;
  line-height: 1.6;
`;

const RecommendationActions = styled.ul`
  margin: 0;
  padding-left: 1.5rem;
  color: #eaeaea;
`;

const RecommendationActionsItem = styled.li`
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ExpectedOutcome = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #2d3561;
`;

const OutcomeLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const OutcomeValue = styled.div`
  color: #00d26a;
  font-weight: 600;
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  background: #f8312f;
  color: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
`;

const ChartContainer = styled.div`
  height: 350px;
  margin-bottom: 2rem;
`;

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#06b6d4'];

const ROIOptimization = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('90');

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `/api/roi-optimization/report?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ROI optimization report');
      }

      const data = await response.json();
      setReport(data.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching ROI optimization report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReport();
  };

  if (loading) {
    return <LoadingSpinner>Loading ROI optimization report...</LoadingSpinner>;
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorMessage>Error: {error}</ErrorMessage>
        <RefreshButton onClick={handleRefresh}>Retry</RefreshButton>
      </PageContainer>
    );
  }

  if (!report || !report.channelAnalysis) {
    return <LoadingSpinner>No data available</LoadingSpinner>;
  }

  const { channelAnalysis, recommendations, potentialImprovement } = report;

  // Prepare chart data
  const channelData = channelAnalysis.channels.map(ch => ({
    name: ch.channel.replace('_', ' ').toUpperCase(),
    revenue: ch.revenue,
    cost: ch.cost,
    profit: ch.profit,
    roi: ch.roi
  }));

  const roiData = channelAnalysis.channels.map(ch => ({
    name: ch.channel.replace('_', ' ').toUpperCase(),
    roi: ch.roi,
    roas: ch.roas === Infinity ? 100 : ch.roas
  }));

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>ROI Optimization</PageTitle>
        <PageSubtitle>
          Analyze channel performance and identify optimization opportunities
        </PageSubtitle>
      </PageHeader>

      <ControlsBar>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
        </Select>
        <RefreshButton onClick={handleRefresh} disabled={loading}>
          Refresh
        </RefreshButton>
      </ControlsBar>

      {/* Current Metrics Summary */}
      <SummaryCards>
        <SummaryCard>
          <CardLabel>Total Revenue</CardLabel>
          <CardValue>
            ${(channelAnalysis.summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardValue>
        </SummaryCard>
        <SummaryCard>
          <CardLabel>Total Cost</CardLabel>
          <CardValue>
            ${(channelAnalysis.summary?.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardValue>
        </SummaryCard>
        <SummaryCard>
          <CardLabel>Total Profit</CardLabel>
          <CardValue positive={(channelAnalysis.summary?.totalProfit || 0) > 0} negative={(channelAnalysis.summary?.totalProfit || 0) < 0}>
            ${(channelAnalysis.summary?.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardValue>
        </SummaryCard>
        <SummaryCard>
          <CardLabel>Overall ROI</CardLabel>
          <CardValue positive={(channelAnalysis.summary?.overallROI || 0) > 0} negative={(channelAnalysis.summary?.overallROI || 0) < 0}>
            {(channelAnalysis.summary?.overallROI || 0).toFixed(1)}%
          </CardValue>
        </SummaryCard>
      </SummaryCards>

      {/* Channel Performance Table */}
      <Section>
        <SectionTitle>Channel Performance</SectionTitle>
        <ChannelTable>
          <thead>
            <tr>
              <ChannelTableHeader>Channel</ChannelTableHeader>
              <ChannelTableHeader>Type</ChannelTableHeader>
              <ChannelTableHeader>Revenue</ChannelTableHeader>
              <ChannelTableHeader>Cost</ChannelTableHeader>
              <ChannelTableHeader>Profit</ChannelTableHeader>
              <ChannelTableHeader>ROI</ChannelTableHeader>
              <ChannelTableHeader>ROAS</ChannelTableHeader>
            </tr>
          </thead>
          <tbody>
            {channelAnalysis.channels.map((channel, index) => (
              <ChannelTableRow key={index}>
                <ChannelTableCell>
                  <strong>{channel.channel.replace('_', ' ').toUpperCase()}</strong>
                </ChannelTableCell>
                <ChannelTableCell>
                  <Badge type={channel.type}>{channel.type.toUpperCase()}</Badge>
                </ChannelTableCell>
                <ChannelTableCell>
                  ${channel.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ChannelTableCell>
                <ChannelTableCell>
                  ${channel.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ChannelTableCell>
                <ChannelTableCell style={{ color: (channel.profit || 0) > 0 ? '#00d26a' : '#f8312f' }}>
                  ${(channel.profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ChannelTableCell>
                <ChannelTableCell>
                  <ROIBadge roi={channel.roi || 0}>{(channel.roi || 0).toFixed(1)}%</ROIBadge>
                </ChannelTableCell>
                <ChannelTableCell>
                  {channel.roas === Infinity ? '∞' : (channel.roas || 0).toFixed(2)}x
                </ChannelTableCell>
              </ChannelTableRow>
            ))}
          </tbody>
        </ChannelTable>
      </Section>

      {/* Charts */}
      <TwoColumnLayout>
        <Section>
          <SectionTitle>Revenue vs Cost by Channel</SectionTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis dataKey="name" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#00d26a" name="Revenue" />
                <Bar dataKey="cost" fill="#e94560" name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Section>

        <Section>
          <SectionTitle>ROI by Channel</SectionTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis dataKey="name" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#16213e', border: '1px solid #2d3561' }}
                  formatter={(value) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="roi" fill="#7b2cbf" name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Section>
      </TwoColumnLayout>

      {/* Potential Improvement */}
      {potentialImprovement && (
        <Section>
          <SectionTitle>Potential Improvement</SectionTitle>
          <SummaryCards>
            <SummaryCard>
              <CardLabel>Current ROI</CardLabel>
              <CardValue>
                {(potentialImprovement.current?.roi || 0).toFixed(1)}%
              </CardValue>
            </SummaryCard>
            <SummaryCard>
              <CardLabel>Projected ROI</CardLabel>
              <CardValue positive={true}>
                {(potentialImprovement.projected?.roi || 0).toFixed(1)}%
              </CardValue>
              <CardChange positive={true}>
                +{(potentialImprovement.improvement?.roiIncrease || 0).toFixed(1)}% improvement
              </CardChange>
            </SummaryCard>
            <SummaryCard>
              <CardLabel>Potential Cost Savings</CardLabel>
              <CardValue positive={(potentialImprovement.improvement?.costSavings || 0) > 0}>
                ${(potentialImprovement.improvement?.costSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardValue>
            </SummaryCard>
            <SummaryCard>
              <CardLabel>Potential Revenue Increase</CardLabel>
              <CardValue positive={true}>
                ${(potentialImprovement.improvement?.revenueIncrease || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardValue>
            </SummaryCard>
          </SummaryCards>
        </Section>
      )}

      {/* Recommendations */}
      <Section>
        <SectionTitle>Optimization Recommendations</SectionTitle>
        <RecommendationsList>
          {recommendations && recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <RecommendationCard key={index} priority={rec.priority}>
                <RecommendationHeader>
                  <RecommendationTitle>{rec.title}</RecommendationTitle>
                  <PriorityBadge priority={rec.priority}>{rec.priority}</PriorityBadge>
                </RecommendationHeader>
                <RecommendationDescription>{rec.description}</RecommendationDescription>
                {rec.actions && rec.actions.length > 0 && (
                  <RecommendationActions>
                    {rec.actions.map((action, i) => (
                      <RecommendationActionsItem key={i}>
                        {typeof action === 'string' ? action : (
                          <span>
                            {action.channel && <strong>{action.channel}: </strong>}
                            {action.action || action.reason || JSON.stringify(action)}
                          </span>
                        )}
                      </RecommendationActionsItem>
                    ))}
                  </RecommendationActions>
                )}
                {rec.expectedOutcome && (
                  <ExpectedOutcome>
                    <OutcomeLabel>Expected Outcome:</OutcomeLabel>
                    <OutcomeValue>
                      {rec.expectedOutcome.roiImprovement != null && (
                        <span>ROI +{(rec.expectedOutcome.roiImprovement || 0).toFixed(1)}% | </span>
                      )}
                      {(rec.expectedOutcome.costSavings || 0) > 0 && (
                        <span>Save ${(rec.expectedOutcome.costSavings || 0).toFixed(2)} | </span>
                      )}
                      {(rec.expectedOutcome.revenueIncrease || 0) > 0 && (
                        <span>+$${(rec.expectedOutcome.revenueIncrease || 0).toFixed(2)} revenue</span>
                      )}
                    </OutcomeValue>
                  </ExpectedOutcome>
                )}
              </RecommendationCard>
            ))
          ) : (
            <p style={{ color: '#a0a0a0' }}>No recommendations available at this time.</p>
          )}
        </RecommendationsList>
      </Section>
    </PageContainer>
  );
};

export default ROIOptimization;
