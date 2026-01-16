import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { showSuccessToast, showErrorToast } from '../components/Toast';

const PageContainer = styled.div`
  width: 100%;
`;

const Header = styled.div`
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

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const RangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #16213e;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const RangeButton = styled.button`
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

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$refreshing ? '#2d3561' : '#7b2cbf'};
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: ${props => props.$refreshing ? 'not-allowed' : 'pointer'};
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: #9d4edd;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled.div`
  background: ${props => props.$highlight ? 'linear-gradient(135deg, #e94560 0%, #7b2cbf 100%)' : '#16213e'};
  border: 1px solid ${props => props.$highlight ? '#e94560' : '#2d3561'};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);

  ${props => props.$highlight && `
    box-shadow: 0 8px 16px rgba(233, 69, 96, 0.3);
  `}
`;

const SummaryCardLabel = styled.div`
  font-size: 0.85rem;
  color: ${props => props.$highlight ? '#ffffff' : '#a0a0a0'};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryCardValue = styled.div`
  font-size: 1.75rem;
  font-weight: bold;
  color: ${props => props.$highlight ? '#ffffff' : '#ffffff'};
`;

const SummaryCardChange = styled.div`
  font-size: 0.85rem;
  margin-top: 0.5rem;
  color: ${props => {
    if (props.$positive) return '#00d26a';
    if (props.$negative) return '#e94560';
    return '#a0a0a0';
  }};
`;

const BestWorstSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const PerformerCard = styled.div`
  background: ${props => props.$best ? '#0a2d18' : '#2d0a0a'};
  border: 2px solid ${props => props.$best ? '#00d26a' : '#e94560'};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const PerformerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const PerformerIcon = styled.div`
  font-size: 2.5rem;
`;

const PerformerInfo = styled.div`
  flex: 1;
`;

const PerformerTitle = styled.div`
  font-size: 0.85rem;
  color: ${props => props.$best ? '#00d26a' : '#e94560'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
`;

const PerformerName = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: #ffffff;
`;

const PerformerMetric = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.$best ? '#00d26a' : '#e94560'};
  margin-top: 0.5rem;
`;

const ChannelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ChannelCard = styled.div`
  background: #16213e;
  border: 2px solid ${props => {
    if (props.$best) return '#00d26a';
    if (props.$worst) return '#e94560';
    return '#2d3561';
  }};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.4);
  }

  ${props => props.$best && `
    background: linear-gradient(135deg, rgba(0, 210, 106, 0.1) 0%, rgba(22, 33, 62, 1) 100%);
  `}

  ${props => props.$worst && `
    background: linear-gradient(135deg, rgba(233, 69, 96, 0.1) 0%, rgba(22, 33, 62, 1) 100%);
  `}
`;

const ChannelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ChannelIcon = styled.div`
  font-size: 2rem;
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const ChannelCategory = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EfficiencyScore = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: ${props => {
    if (props.$score >= 80) return '#00d26a';
    if (props.$score >= 60) return '#ffb020';
    return '#e94560';
  }};
  color: #000000;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.9rem;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: #ffffff;
`;

const MetricChange = styled.div`
  font-size: 0.75rem;
  color: ${props => {
    if (props.$positive) return '#00d26a';
    if (props.$negative) return '#e94560';
    return '#a0a0a0';
  }};
`;

const ReportSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const ReportTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  color: #e94560;
`;

const ReportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const ReportItem = styled.div`
  background: #0f1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const ReportItemLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ReportItemValue = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: #ffffff;
`;

const InsightsSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const InsightItem = styled.div`
  padding: 1rem;
  background: ${props => {
    if (props.$type === 'positive') return 'rgba(0, 210, 106, 0.1)';
    if (props.$type === 'warning') return 'rgba(255, 176, 32, 0.1)';
    return 'rgba(99, 102, 241, 0.1)';
  }};
  border-left: 4px solid ${props => {
    if (props.$type === 'positive') return '#00d26a';
    if (props.$type === 'warning') return '#ffb020';
    return '#6366f1';
  }};
  border-radius: 4px;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InsightTitle = styled.div`
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const InsightMessage = styled.div`
  color: #e0e0e0;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const InsightRecommendation = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyStateText = styled.div`
  font-size: 1.1rem;
`;

function ChannelPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`http://localhost:3001/api/channel-performance/compare?range=${range}`);
      if (!response.ok) {
        throw new Error('Failed to fetch channel performance data');
      }

      const result = await response.json();
      setData(result);

      if (showRefreshToast) {
        showSuccessToast('Channel performance data refreshed');
      }
    } catch (err) {
      console.error('Error fetching channel performance:', err);
      setError(err.message);
      if (showRefreshToast) {
        showErrorToast('Failed to refresh data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  if (loading) {
    return <LoadingSpinner message="Loading channel performance data..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!data) {
    return (
      <EmptyState>
        <EmptyStateIcon>📊</EmptyStateIcon>
        <EmptyStateText>No channel performance data available</EmptyStateText>
      </EmptyState>
    );
  }

  const { summary, rankings, channels, report } = data;

  return (
    <PageContainer>
      <Header>
        <Title>Channel Performance Comparison</Title>
        <Controls>
          <RangeSelector>
            {['30d', '90d', '180d'].map(r => (
              <RangeButton
                key={r}
                $active={range === r}
                onClick={() => handleRangeChange(r)}
              >
                {r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : '180 Days'}
              </RangeButton>
            ))}
          </RangeSelector>
          <RefreshButton
            onClick={handleRefresh}
            disabled={refreshing}
            $refreshing={refreshing}
          >
            {refreshing ? '🔄' : '🔄'} Refresh
          </RefreshButton>
        </Controls>
      </Header>

      {/* Summary Cards */}
      <SummaryCards>
        <SummaryCard>
          <SummaryCardLabel>Total Revenue</SummaryCardLabel>
          <SummaryCardValue>${summary.totalRevenue.toLocaleString()}</SummaryCardValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryCardLabel>Total Spend</SummaryCardLabel>
          <SummaryCardValue>${summary.totalSpend.toLocaleString()}</SummaryCardValue>
        </SummaryCard>
        <SummaryCard $highlight={summary.overallROI > 50}>
          <SummaryCardLabel>Overall ROI</SummaryCardLabel>
          <SummaryCardValue>{summary.overallROI}%</SummaryCardValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryCardLabel>Avg CAC</SummaryCardLabel>
          <SummaryCardValue>${summary.avgCAC.toFixed(2)}</SummaryCardValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryCardLabel>Total Users</SummaryCardLabel>
          <SummaryCardValue>{summary.totalUsers.toLocaleString()}</SummaryCardValue>
        </SummaryCard>
      </SummaryCards>

      {/* Best and Worst Performers */}
      <BestWorstSection>
        <PerformerCard $best>
          <PerformerHeader>
            <PerformerIcon>{rankings.mostEfficient.icon}</PerformerIcon>
            <PerformerInfo>
              <PerformerTitle $best>Most Efficient Channel</PerformerTitle>
              <PerformerName>{rankings.mostEfficient.channel}</PerformerName>
            </PerformerInfo>
          </PerformerHeader>
          <PerformerMetric $best>
            Score: {rankings.mostEfficient.score}/100
          </PerformerMetric>
        </PerformerCard>

        <PerformerCard $worst>
          <PerformerHeader>
            <PerformerIcon>{rankings.leastEfficient.icon}</PerformerIcon>
            <PerformerInfo>
              <PerformerTitle $worst>Least Efficient Channel</PerformerTitle>
              <PerformerName>{rankings.leastEfficient.channel}</PerformerName>
            </PerformerInfo>
          </PerformerHeader>
          <PerformerMetric $worst>
            Score: {rankings.leastEfficient.score}/100
          </PerformerMetric>
        </PerformerCard>
      </BestWorstSection>

      {/* All Channels */}
      <ChannelsGrid>
        {channels.map((channel, index) => (
          <ChannelCard
            key={channel.id}
            $best={index === 0}
            $worst={index === channels.length - 1}
          >
            <EfficiencyScore $score={channel.metrics.efficiencyScore}>
              {channel.metrics.efficiencyScore}/100
            </EfficiencyScore>

            <ChannelHeader>
              <ChannelIcon>{channel.icon}</ChannelIcon>
              <ChannelInfo>
                <ChannelName>{channel.name}</ChannelName>
                <ChannelCategory>{channel.category}</ChannelCategory>
              </ChannelInfo>
            </ChannelHeader>

            <MetricsGrid>
              <MetricItem>
                <MetricLabel>Revenue</MetricLabel>
                <MetricValue>${channel.metrics.revenue.toLocaleString()}</MetricValue>
                {channel.metrics.revenueTrend !== null && (
                  <MetricChange
                    $positive={channel.metrics.revenueTrendDirection === 'up'}
                    $negative={channel.metrics.revenueTrendDirection === 'down'}
                  >
                    {channel.metrics.revenueTrendDirection === 'up' ? '↑' : channel.metrics.revenueTrendDirection === 'down' ? '↓' : '→'}
                    {Math.abs(channel.metrics.revenueTrend)}%
                  </MetricChange>
                )}
              </MetricItem>

              <MetricItem>
                <MetricLabel>Spend</MetricLabel>
                <MetricValue>${channel.metrics.spend.toLocaleString()}</MetricValue>
              </MetricItem>

              <MetricItem>
                <MetricLabel>ROI</MetricLabel>
                <MetricValue>{channel.metrics.roi === 'Infinity' ? '∞' : channel.metrics.roi}%</MetricValue>
              </MetricItem>

              <MetricItem>
                <MetricLabel>CAC</MetricLabel>
                <MetricValue>${channel.metrics.cac.toFixed(2)}</MetricValue>
              </MetricItem>

              <MetricItem>
                <MetricLabel>Users</MetricLabel>
                <MetricValue>{channel.metrics.users.toLocaleString()}</MetricValue>
              </MetricItem>

              <MetricItem>
                <MetricLabel>LTV/CAC</MetricLabel>
                <MetricValue>{channel.metrics.ltv_cac_ratio.toFixed(2)}x</MetricValue>
              </MetricItem>
            </MetricsGrid>
          </ChannelCard>
        ))}
      </ChannelsGrid>

      {/* Comparison Report */}
      <ReportSection>
        <ReportTitle>📊 Comparison Report</ReportTitle>
        <ReportGrid>
          <ReportItem>
            <ReportItemLabel>Total Channels</ReportItemLabel>
            <ReportItemValue>{report.overview.totalChannels}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Active Channels</ReportItemLabel>
            <ReportItemValue>{report.overview.activeChannels}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Paid Channels</ReportItemLabel>
            <ReportItemValue>{report.overview.paidChannels}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Organic Channels</ReportItemLabel>
            <ReportItemValue>{report.overview.organicChannels}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Total Paid Spend</ReportItemLabel>
            <ReportItemValue>${report.paidPerformance.totalSpend.toLocaleString()}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Paid Revenue</ReportItemLabel>
            <ReportItemValue>${report.paidPerformance.totalRevenue.toLocaleString()}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Paid ROI</ReportItemLabel>
            <ReportItemValue>{report.paidPerformance.roi}%</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Organic Revenue</ReportItemLabel>
            <ReportItemValue>${report.organicPerformance.totalRevenue.toLocaleString()}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Organic % of Total</ReportItemLabel>
            <ReportItemValue>{report.organicPerformance.percentageOfTotal}%</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Top Paid Channel</ReportItemLabel>
            <ReportItemValue>{report.paidPerformance.topPaidChannel}</ReportItemValue>
          </ReportItem>
          <ReportItem>
            <ReportItemLabel>Top Organic Channel</ReportItemLabel>
            <ReportItemValue>{report.organicPerformance.topOrganicChannel}</ReportItemValue>
          </ReportItem>
        </ReportGrid>
      </ReportSection>

      {/* Insights */}
      {report.insights && report.insights.length > 0 && (
        <InsightsSection>
          <ReportTitle>💡 Insights & Recommendations</ReportTitle>
          {report.insights.map((insight, index) => (
            <InsightItem key={index} $type={insight.type}>
              <InsightTitle>{insight.icon} {insight.title}</InsightTitle>
              <InsightMessage>{insight.message}</InsightMessage>
              <InsightRecommendation>💡 {insight.recommendation}</InsightRecommendation>
            </InsightItem>
          ))}
        </InsightsSection>
      )}
    </PageContainer>
  );
}

export default ChannelPerformance;
