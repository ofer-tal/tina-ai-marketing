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
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2d3561;
  font-weight: 600;
  color: #eaeaea;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
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

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/searchAds/campaigns?limit=50');

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
            </TableRow>
          ))
        )}
      </CampaignsTable>
    </PageContainer>
  );
}

export default Campaigns;
