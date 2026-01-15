import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

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

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.active ? '#e94560' : '#16213e'};
  border: 1px solid ${props => props.active ? '#e94560' : '#2d3561'};
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background: ${props => props.active ? '#ff6b6b' : '#e94560'};
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
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #e94560;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CampaignsTable = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2d3561;
  font-weight: 600;
  color: #eaeaea;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #2d3561;
  align-items: center;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #1f1f3a;
  }
`;

const CampaignName = styled.div`
  font-weight: 500;
  color: #eaeaea;
`;

const CampaignId = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: capitalize;
  background: ${props => {
    switch (props.status) {
      case 'ENABLED':
      case 'active':
        return '#00d26a33';
      case 'PAUSED':
      case 'paused':
        return '#ffa50033';
      case 'DISABLED':
      case 'disabled':
        return '#ff475733';
      default:
        return '#2d3561';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'ENABLED':
      case 'active':
        return '#00d26a';
      case 'PAUSED':
      case 'paused':
        return '#ffa500';
      case 'DISABLED':
      case 'disabled':
        return '#ff4757';
      default:
        return '#a0a0a0';
    }
  }};
`;

const MetricValue = styled.div`
  font-weight: 600;
  color: #eaeaea;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #a0a0a0;
`;

const ErrorState = styled.div`
  padding: 2rem;
  background: #ff475722;
  border: 1px solid #ff475744;
  border-radius: 8px;
  margin-bottom: 2rem;
  color: #ff6b8a;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #a0a0a0;
`;

const InfoCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
`;

const InfoCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const InfoIcon = styled.span`
  font-size: 1.5rem;
`;

const InfoText = styled.div`
  flex: 1;
`;

const InfoTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const InfoDescription = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
`;

const AdGroupsSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
`;

const AdGroupsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const AdGroupsTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseAdGroupsButton = styled.button`
  padding: 0.5rem 1rem;
  background: #2d3561;
  border: 1px solid #3d4571;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3d4571;
  }
`;

const AdGroupsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
`;

const AdGroupCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const AdGroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const AdGroupName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const AdGroupId = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const AdGroupMetrics = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
`;

const AdGroupMetric = styled.div`
  display: flex;
  flex-direction: column;
`;

const AdGroupMetricValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #eaeaea;
`;

const AdGroupMetricLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
`;

const TrendIndicator = styled.span`
  font-size: 0.85rem;
  margin-left: 0.5rem;
  color: ${props => {
    if (props.trend === 'up') return '#00d26a';
    if (props.trend === 'down') return '#ff4757';
    return '#a0a0a0';
  }};
`;

const AdGroupBudget = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #2d3561;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AdGroupBudgetLabel = styled.span`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const AdGroupBudgetValue = styled.span`
  font-weight: 600;
  color: #eaeaea;
`;

const ViewAdGroupsButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [adGroups, setAdGroups] = useState([]);
  const [adGroupsLoading, setAdGroupsLoading] = useState(false);
  const [showAdGroups, setShowAdGroups] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3003/api/searchAds/campaigns?limit=50');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.campaigns) {
        setCampaigns(data.data.campaigns);
      } else {
        // Use mock data if API fails
        setCampaigns(getMockCampaigns());
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
      // Fall back to mock data
      setCampaigns(getMockCampaigns());
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaigns();
    setRefreshing(false);
  };

  const handleViewAdGroups = async (campaign) => {
    setSelectedCampaign(campaign);
    setShowAdGroups(true);
    setAdGroupsLoading(true);

    try {
      const response = await fetch(`http://localhost:3003/api/searchAds/campaigns/${campaign.id}/adgroups`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.adGroups) {
        setAdGroups(data.data.adGroups);
      } else {
        // Use mock data
        setAdGroups(getMockAdGroups(campaign.id));
      }
    } catch (err) {
      console.error('Error fetching ad groups:', err);
      // Fall back to mock data
      setAdGroups(getMockAdGroups(campaign.id));
    } finally {
      setAdGroupsLoading(false);
    }
  };

  const handleCloseAdGroups = () => {
    setShowAdGroups(false);
    setSelectedCampaign(null);
    setAdGroups([]);
  };

  const getMockAdGroups = (campaignId) => {
    return [
      {
        adGroupId: `${campaignId}-ag-1`,
        name: 'Romance Stories - Exact Match',
        status: 'ENABLED',
        servingStatus: 'RUNNING',
        dailyBudget: 30,
        impressions: 45230,
        clicks: 892,
        conversions: 67,
        spend: 234.50,
        ctr: 1.97,
        conversionRate: 7.51,
        averageCpa: 3.50,
        roas: 2.86,
        trend: {
          clicks: 'up',
          conversions: 'up',
          ctr: 'stable',
          roas: 'up',
        },
        change: {
          clicks: 12.5,
          conversions: 8.3,
          ctr: -0.5,
          roas: 15.2,
        },
      },
      {
        adGroupId: `${campaignId}-ag-2`,
        name: 'Spicy Stories - Broad Match',
        status: 'ENABLED',
        servingStatus: 'RUNNING',
        dailyBudget: 25,
        impressions: 38450,
        clicks: 654,
        conversions: 42,
        spend: 189.75,
        ctr: 1.70,
        conversionRate: 6.42,
        averageCpa: 4.52,
        roas: 2.21,
        trend: {
          clicks: 'stable',
          conversions: 'down',
          ctr: 'down',
          roas: 'down',
        },
        change: {
          clicks: 1.2,
          conversions: -12.5,
          ctr: -3.2,
          roas: -8.7,
        },
      },
      {
        adGroupId: `${campaignId}-ag-3`,
        name: 'Interactive Stories - Phrase Match',
        status: 'PAUSED',
        servingStatus: 'PAUSED',
        dailyBudget: 20,
        impressions: 28930,
        clicks: 423,
        conversions: 28,
        spend: 145.20,
        ctr: 1.46,
        conversionRate: 6.62,
        averageCpa: 5.19,
        roas: 1.93,
        trend: {
          clicks: 'down',
          conversions: 'down',
          ctr: 'stable',
          roas: 'down',
        },
        change: {
          clicks: -15.3,
          conversions: -18.2,
          ctr: -1.5,
          roas: -22.1,
        },
      },
      {
        adGroupId: `${campaignId}-ag-4`,
        name: 'Love Stories - Exact Match',
        status: 'ENABLED',
        servingStatus: 'RUNNING',
        dailyBudget: 15,
        impressions: 31280,
        clicks: 587,
        conversions: 51,
        spend: 167.40,
        ctr: 1.88,
        conversionRate: 8.69,
        averageCpa: 3.28,
        roas: 3.05,
        trend: {
          clicks: 'up',
          conversions: 'up',
          ctr: 'up',
          roas: 'up',
        },
        change: {
          clicks: 18.7,
          conversions: 22.5,
          ctr: 4.3,
          roas: 25.8,
        },
      },
    ];
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '▲';
      case 'down': return '▼';
      case 'stable': return '─';
      default: return '•';
    }
  };

  const formatPercentage = (value) => {
    if (value === 0) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getMockCampaigns = () => {
    return [
      {
        id: '123456789',
        name: 'Blush App - US - Romance Stories',
        status: 'ENABLED',
        dailyBudget: { amount: 100, currency: 'USD' },
        lifecycleStatus: 'SERVING',
        startDate: '2025-01-01',
        endDate: null,
        servingStatus: 'RUNNING',
        appraisal: {
          score: 85,
          reasons: ['High conversion rate', 'Good CTR']
        }
      },
      {
        id: '123456790',
        name: 'Blush App - UK - Spicy Stories',
        status: 'ENABLED',
        dailyBudget: { amount: 75, currency: 'USD' },
        lifecycleStatus: 'SERVING',
        startDate: '2025-01-01',
        endDate: null,
        servingStatus: 'RUNNING',
        appraisal: {
          score: 72,
          reasons: ['Moderate performance']
        }
      },
      {
        id: '123456791',
        name: 'Blush App - CA - Romance Keywords',
        status: 'PAUSED',
        dailyBudget: { amount: 50, currency: 'USD' },
        lifecycleStatus: 'PAUSED',
        startDate: '2025-01-01',
        endDate: null,
        servingStatus: 'NOT_RUNNING',
        appraisal: {
          score: 45,
          reasons: ['Low ROI', 'High CPC']
        }
      },
      {
        id: '123456792',
        name: 'Blush App - AU - Test Campaign',
        status: 'DISABLED',
        dailyBudget: { amount: 25, currency: 'USD' },
        lifecycleStatus: 'ADJUSTING',
        startDate: '2025-01-15',
        endDate: null,
        servingStatus: 'NOT_RUNNING',
        appraisal: {
          score: 30,
          reasons: ['Under review']
        }
      }
    ];
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (statusFilter === 'all') return true;
    return campaign.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getAppraisalColor = (score) => {
    if (score >= 80) return '#00d26a';
    if (score >= 60) return '#ffa500';
    return '#ff4757';
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>📢 Ad Campaigns</PageTitle>
          <PageSubtitle>Manage and monitor your paid advertising campaigns</PageSubtitle>
        </PageHeader>
        <LoadingState>Loading campaigns...</LoadingState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>📢 Ad Campaigns</PageTitle>
        <PageSubtitle>Manage and monitor your paid advertising campaigns</PageSubtitle>
      </PageHeader>

      {error && (
        <ErrorState>
          ⚠️ Error loading campaigns: {error}. Displaying mock data for demonstration.
        </ErrorState>
      )}

      <InfoCard>
        <InfoCardContent>
          <InfoIcon>🍎</InfoIcon>
          <InfoText>
            <InfoTitle>Apple Search Ads Integration</InfoTitle>
            <InfoDescription>
              Campaigns are fetched from Apple Search Ads API. Configure credentials in Settings to see real data.
            </InfoDescription>
          </InfoText>
        </InfoCardContent>
      </InfoCard>

      <ControlsBar>
        <FilterButton
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        >
          All ({campaigns.length})
        </FilterButton>
        <FilterButton
          active={statusFilter === 'enabled'}
          onClick={() => setStatusFilter('enabled')}
        >
          Active ({campaigns.filter(c => c.status === 'ENABLED').length})
        </FilterButton>
        <FilterButton
          active={statusFilter === 'paused'}
          onClick={() => setStatusFilter('paused')}
        >
          Paused ({campaigns.filter(c => c.status === 'PAUSED').length})
        </FilterButton>
        <FilterButton
          active={statusFilter === 'disabled'}
          onClick={() => setStatusFilter('disabled')}
        >
          Disabled ({campaigns.filter(c => c.status === 'DISABLED').length})
        </FilterButton>

        <RefreshButton onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? '🔄' : '🔄'} Refresh
        </RefreshButton>
      </ControlsBar>

      <CampaignsTable>
        <TableHeader>
          <div>Campaign Name</div>
          <div>Status</div>
          <div>Daily Budget</div>
          <div>Serving Status</div>
          <div>Start Date</div>
          <div>Appraisal</div>
          <div>Actions</div>
        </TableHeader>

        {filteredCampaigns.length === 0 ? (
          <EmptyState>
            No campaigns found matching the selected filter.
          </EmptyState>
        ) : (
          filteredCampaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <div>
                <CampaignName>{campaign.name}</CampaignName>
                <CampaignId>ID: {campaign.id}</CampaignId>
              </div>
              <div>
                <StatusBadge status={campaign.status.toLowerCase()}>
                  {campaign.status}
                </StatusBadge>
              </div>
              <div>
                <MetricValue>
                  {formatCurrency(campaign.dailyBudget?.amount || 0, campaign.dailyBudget?.currency)}
                </MetricValue>
                <MetricLabel>per day</MetricLabel>
              </div>
              <div>
                <MetricValue>{campaign.servingStatus}</MetricValue>
                <MetricLabel>{campaign.lifecycleStatus}</MetricLabel>
              </div>
              <div>
                <MetricValue>{new Date(campaign.startDate).toLocaleDateString()}</MetricValue>
                <MetricLabel>
                  {campaign.endDate ? `to ${new Date(campaign.endDate).toLocaleDateString()}` : 'Ongoing'}
                </MetricLabel>
              </div>
              <div>
                <MetricValue style={{ color: getAppraisalColor(campaign.appraisal?.score || 0) }}>
                  {campaign.appraisal?.score || 0}/100
                </MetricValue>
                <MetricLabel>
                  {campaign.appraisal?.reasons?.[0] || 'N/A'}
                </MetricLabel>
              </div>
              <div>
                <ViewAdGroupsButton onClick={() => handleViewAdGroups(campaign)}>
                  View Ad Groups
                </ViewAdGroupsButton>
              </div>
            </TableRow>
          ))
        )}
      </CampaignsTable>

      {showAdGroups && selectedCampaign && (
        <AdGroupsSection>
          <AdGroupsHeader>
            <AdGroupsTitle>
              📊 Ad Groups: {selectedCampaign.name}
            </AdGroupsTitle>
            <CloseAdGroupsButton onClick={handleCloseAdGroups}>
              ✕ Close
            </CloseAdGroupsButton>
          </AdGroupsHeader>

          {adGroupsLoading ? (
            <LoadingState>Loading ad groups...</LoadingState>
          ) : adGroups.length === 0 ? (
            <EmptyState>No ad groups found for this campaign.</EmptyState>
          ) : (
            <AdGroupsGrid>
              {adGroups.map((adGroup) => (
                <AdGroupCard key={adGroup.adGroupId}>
                  <AdGroupHeader>
                    <div>
                      <AdGroupName>{adGroup.name}</AdGroupName>
                      <AdGroupId>ID: {adGroup.adGroupId}</AdGroupId>
                    </div>
                    <StatusBadge status={adGroup.status.toLowerCase()}>
                      {adGroup.status}
                    </StatusBadge>
                  </AdGroupHeader>

                  <AdGroupMetrics>
                    <AdGroupMetric>
                      <AdGroupMetricValue>
                        {adGroup.impressions?.toLocaleString() || 0}
                      </AdGroupMetricValue>
                      <AdGroupMetricLabel>Impressions</AdGroupMetricLabel>
                    </AdGroupMetric>

                    <AdGroupMetric>
                      <AdGroupMetricValue>
                        {adGroup.clicks?.toLocaleString() || 0}
                        <TrendIndicator trend={adGroup.trend?.clicks}>
                          {getTrendIcon(adGroup.trend?.clicks)} {formatPercentage(adGroup.change?.clicks || 0)}
                        </TrendIndicator>
                      </AdGroupMetricValue>
                      <AdGroupMetricLabel>Clicks</AdGroupMetricLabel>
                    </AdGroupMetric>

                    <AdGroupMetric>
                      <AdGroupMetricValue>
                        {adGroup.conversions?.toLocaleString() || 0}
                        <TrendIndicator trend={adGroup.trend?.conversions}>
                          {getTrendIcon(adGroup.trend?.conversions)} {formatPercentage(adGroup.change?.conversions || 0)}
                        </TrendIndicator>
                      </AdGroupMetricValue>
                      <AdGroupMetricLabel>Conversions</AdGroupMetricLabel>
                    </AdGroupMetric>

                    <AdGroupMetric>
                      <AdGroupMetricValue>
                        {adGroup.ctr?.toFixed(2) || 0}%
                      </AdGroupMetricValue>
                      <AdGroupMetricLabel>CTR</AdGroupMetricLabel>
                    </AdGroupMetric>

                    <AdGroupMetric>
                      <AdGroupMetricValue>
                        ${adGroup.averageCpa?.toFixed(2) || '0.00'}
                      </AdGroupMetricValue>
                      <AdGroupMetricLabel>CPA</AdGroupMetricLabel>
                    </AdGroupMetric>

                    <AdGroupMetric>
                      <AdGroupMetricValue>
                        {adGroup.roas?.toFixed(2) || '0.00'}x
                        <TrendIndicator trend={adGroup.trend?.roas}>
                          {getTrendIcon(adGroup.trend?.roas)} {formatPercentage(adGroup.change?.roas || 0)}
                        </TrendIndicator>
                      </AdGroupMetricValue>
                      <AdGroupMetricLabel>ROAS</AdGroupMetricLabel>
                    </AdGroupMetric>
                  </AdGroupMetrics>

                  <AdGroupBudget>
                    <AdGroupBudgetLabel>Daily Budget:</AdGroupBudgetLabel>
                    <AdGroupBudgetValue>
                      {formatCurrency(adGroup.dailyBudget || 0)}
                    </AdGroupBudgetValue>
                  </AdGroupBudget>
                </AdGroupCard>
              ))}
            </AdGroupsGrid>
          )}
        </AdGroupsSection>
      )}
    </PageContainer>
  );
}

export default Campaigns;
