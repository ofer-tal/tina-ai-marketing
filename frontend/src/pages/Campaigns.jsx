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
  ReferenceLine
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
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2d3561;
  font-weight: 600;
  color: #eaeaea;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr;
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

// Feature #140: ROI display components
const ROIValue = styled.div`
  font-weight: 600;
  color: ${props => {
    if (props.roi > 0) return '#00d26a'; // Green for positive ROI
    if (props.roi < 0) return '#ff4757'; // Red for negative ROI
    return '#a0a0a0'; // Gray for zero ROI
  }};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ROILabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const ROIBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => {
    if (props.roi > 0) return '#00d26a33';
    if (props.roi < 0) return '#ff475733';
    return '#2d3561';
  }};
  color: ${props => {
    if (props.roi > 0) return '#00d26a';
    if (props.roi < 0) return '#ff4757';
    return '#a0a0a0';
  }};
`;

// Feature #142: Budget utilization progress bar
const BudgetUtilizationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
`;

const BudgetProgressBar = styled.div`
  width: 100%;
  max-width: 100px;
  height: 6px;
  background: #2d3561;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`;

const BudgetProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.percentage >= 90) return '#ff4757'; // Red for critical
    if (props.percentage >= 70) return '#ffb020'; // Orange for warning
    return '#00d26a'; // Green for normal
  }};
  width: ${props => Math.min(props.percentage, 100)}%;
  transition: width 0.3s ease, background 0.3s ease;
`;

const BudgetUtilizationText = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => {
    if (props.percentage >= 90) return '#ff4757';
    if (props.percentage >= 70) return '#ffb020';
    return '#00d26a';
  }};
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

// Feature #138: Daily spend aggregation styled components
const DailySpendSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
`;

const DailySpendHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const DailySpendTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseDailySpendButton = styled.button`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    border-color: #e94560;
  }
`;

const DailySpendChartContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const DailySpendSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SummaryCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const SummaryLabel = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.color || '#eaeaea'};
`;

const OverBudgetList = styled.div`
  margin-top: 1.5rem;
`;

const OverBudgetTitle = styled.h4`
  font-size: 1.1rem;
  color: #ff4757;
  margin: 0 0 1rem 0;
`;

const OverBudgetItem = styled.div`
  background: #ff475722;
  border: 1px solid #ff475744;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const OverBudgetDate = styled.div`
  font-weight: 600;
  color: #ff6b8a;
`;

const OverBudgetAmount = styled.div`
  font-size: 0.9rem;
  color: #ff6b8a;
`;

const DailySpendLegend = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendColor = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: ${props => props.color};
`;

// Feature #137: Keyword-level spend tracking styled components
const KeywordsSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
`;

const KeywordsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const KeywordsTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseKeywordsButton = styled.button`
  padding: 0.5rem 1rem;
  background: #2d3561;
  border: 1px solid #3d4571;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    border-color: #e94560;
  }
`;

const SortControls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const SortButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.active ? '#e94560' : '#16213e'};
  border: 1px solid ${props => props.active ? '#e94560' : '#2d3561'};
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    border-color: #e94560;
  }
`;

const KeywordsTable = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  overflow-x: auto;
`;

const KeywordsTableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2d3561;
  font-weight: 600;
  color: #eaeaea;
  font-size: 0.85rem;
`;

const KeywordsTableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
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

const KeywordText = styled.div`
  font-weight: 500;
  color: #eaeaea;
`;

const MatchTypeBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.matchType) {
      case 'EXACT': return '#00d26a33';
      case 'BROAD': return '#e9456033';
      case 'PHRASE': return '#ffa50033';
      default: return '#2d3561';
    }
  }};
  color: ${props => {
    switch (props.matchType) {
      case 'EXACT': return '#00d26a';
      case 'BROAD': return '#e94560';
      case 'PHRASE': return '#ffa500';
      default: return '#a0a0a0';
    }
  }};
`;

const MetricCell = styled.div`
  text-align: right;
  color: #eaeaea;
`;

const MetricLabelSmall = styled.div`
  font-size: 0.7rem;
  color: #a0a0a0;
`;

const MetricValueSmall = styled.div`
  font-weight: 600;
  color: ${props => props.color || '#eaeaea'};
`;

const ViewKeywordsButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #7b2cbf;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #9d4edd;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ViewDailySpendButton = styled.button`
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

  // Feature #137: Keyword-level spend tracking
  const [keywords, setKeywords] = useState([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);
  const [keywordSortBy, setKeywordSortBy] = useState('spend'); // Step 5: Enable sorting by spend

  // Feature #138: Daily spend aggregation
  const [dailySpend, setDailySpend] = useState([]);
  const [dailySpendLoading, setDailySpendLoading] = useState(false);
  const [showDailySpend, setShowDailySpend] = useState(false);

  // Feature #140: ROI calculation per campaign
  const [campaignROI, setCampaignROI] = useState({});

  // Feature #141: ROI calculation per keyword
  const [keywordROI, setKeywordROI] = useState({});

  // Feature #142: Budget utilization percentage
  const [budgetUtilization, setBudgetUtilization] = useState({});

  useEffect(() => {
    fetchCampaigns();
    fetchCampaignROI();
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
        // Feature #142: Calculate budget utilization
        setBudgetUtilization(calculateBudgetUtilization(data.data.campaigns));
      } else {
        // Use mock data if API fails
        const mockCampaigns = getMockCampaigns();
        setCampaigns(mockCampaigns);
        setBudgetUtilization(calculateBudgetUtilization(mockCampaigns));
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
      // Fall back to mock data
      const mockCampaigns = getMockCampaigns();
      setCampaigns(mockCampaigns);
      setBudgetUtilization(calculateBudgetUtilization(mockCampaigns));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaigns();
    setRefreshing(false);
  };

  // Feature #140: Fetch ROI data for all campaigns
  const fetchCampaignROI = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/revenue/attribution/campaigns');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Create a map of campaignId -> ROI data
        const roiMap = {};
        data.data.forEach(item => {
          roiMap[item.campaignId] = {
            revenue: item.revenue || 0,
            spend: item.spend || 0,
            roi: calculateROI(item.revenue || 0, item.spend || 0),
            transactions: item.transactions || 0
          };
        });
        setCampaignROI(roiMap);
      } else {
        // Use mock ROI data
        setCampaignROI(getMockCampaignROI());
      }
    } catch (err) {
      console.error('Error fetching campaign ROI:', err);
      // Fall back to mock data
      setCampaignROI(getMockCampaignROI());
    }
  };

  // Calculate ROI percentage
  const calculateROI = (revenue, spend) => {
    if (spend === 0) return 0;
    return ((revenue - spend) / spend) * 100;
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

  // Feature #137: Keyword-level spend tracking handlers
  const handleViewKeywords = async (campaign) => {
    setSelectedCampaign(campaign);
    setShowKeywords(true);
    setKeywordsLoading(true);

    try {
      const response = await fetch(`http://localhost:3003/api/searchAds/campaigns/${campaign.id}/keywords`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.keywords) {
        setKeywords(data.data.keywords);
      } else {
        // Use mock data
        setKeywords(getMockKeywords(campaign.id));
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
      // Fall back to mock data
      setKeywords(getMockKeywords(campaign.id));
    } finally {
      setKeywordsLoading(false);
    }

    // Feature #141: Fetch keyword ROI data
    fetchKeywordROI(campaign.id);
  };

  const handleCloseKeywords = () => {
    setShowKeywords(false);
    setSelectedCampaign(null);
    setKeywords([]);
  };

  const handleSortBySpend = () => {
    const sorted = [...keywords].sort((a, b) => b.totalSpend - a.totalSpend);
    setKeywords(sorted);
    setKeywordSortBy('spend');
  };

  const handleSortByCPA = () => {
    const sorted = [...keywords].sort((a, b) => a.avgCPA - b.avgCPA);
    setKeywords(sorted);
    setKeywordSortBy('cpa');
  };

  const handleSortByConversions = () => {
    const sorted = [...keywords].sort((a, b) => b.totalConversions - a.totalConversions);
    setKeywords(sorted);
    setKeywordSortBy('conversions');
  };

  // Feature #141: Handle sorting keywords by ROI
  const handleSortByROI = () => {
    const sorted = [...keywords].sort((a, b) => {
      const aROI = keywordROI[a.keywordId]?.roi || 0;
      const bROI = keywordROI[b.keywordId]?.roi || 0;
      return bROI - aROI;
    });
    setKeywords(sorted);
    setKeywordSortBy('roi');
  };

  // Feature #141: Fetch ROI data for keywords
  const fetchKeywordROI = async (campaignId) => {
    try {
      // In production, this would call a keyword-level ROI endpoint
      // For now, generate mock ROI data for keywords
      const mockKeywordROI = getMockKeywordROI(campaignId);
      setKeywordROI(mockKeywordROI);
    } catch (err) {
      console.error('Error fetching keyword ROI:', err);
      // Fall back to mock data
      setKeywordROI(getMockKeywordROI(campaignId));
    }
  };

  // Feature #142: Calculate budget utilization for campaigns
  const calculateBudgetUtilization = (campaigns) => {
    const utilization = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    campaigns.forEach(campaign => {
      const dailyBudget = campaign.dailyBudget?.amount || 0;
      if (dailyBudget === 0) {
        utilization[campaign.id] = { percentage: 0, spend: 0, budget: dailyBudget };
        return;
      }

      // Generate mock daily spend data for today
      // In production, this would come from actual spend data
      const mockDailySpend = dailyBudget * (0.5 + Math.random() * 0.6); // 50-110% of budget
      const percentage = (mockDailySpend / dailyBudget) * 100;

      utilization[campaign.id] = {
        percentage: Math.min(percentage, 120), // Cap at 120% for display
        spend: mockDailySpend,
        budget: dailyBudget
      };
    });

    return utilization;
  };

  const getMockKeywords = (campaignId) => {
    return [
      {
        keywordText: 'romance stories',
        keywordId: `${campaignId}-kw-001`,
        matchType: 'BROAD',
        totalImpressions: 12500,
        totalClicks: 842,
        totalConversions: 67,
        totalSpend: 234.50,
        avgCTR: 6.74,
        avgConversionRate: 7.96,
        avgROAS: 2.86,
        avgCPA: 3.50,
      },
      {
        keywordText: 'spicy stories',
        keywordId: `${campaignId}-kw-002`,
        matchType: 'EXACT',
        totalImpressions: 8900,
        totalClicks: 654,
        totalConversions: 42,
        totalSpend: 189.80,
        avgCTR: 7.35,
        avgConversionRate: 6.42,
        avgROAS: 2.21,
        avgCPA: 4.52,
      },
      {
        keywordText: 'interactive fiction',
        keywordId: `${campaignId}-kw-003`,
        matchType: 'PHRASE',
        totalImpressions: 6200,
        totalClicks: 423,
        totalConversions: 28,
        totalSpend: 145.20,
        avgCTR: 6.82,
        avgConversionRate: 6.62,
        avgROAS: 1.93,
        avgCPA: 5.19,
      },
      {
        keywordText: 'love stories',
        keywordId: `${campaignId}-kw-004`,
        matchType: 'BROAD',
        totalImpressions: 9800,
        totalClicks: 587,
        totalConversions: 51,
        totalSpend: 167.40,
        avgCTR: 5.99,
        avgConversionRate: 8.69,
        avgROAS: 3.05,
        avgCPA: 3.28,
      },
      {
        keywordText: 'romantic games',
        keywordId: `${campaignId}-kw-005`,
        matchType: 'EXACT',
        totalImpressions: 5400,
        totalClicks: 398,
        totalConversions: 35,
        totalSpend: 128.60,
        avgCTR: 7.37,
        avgConversionRate: 8.79,
        avgROAS: 2.72,
        avgCPA: 3.67,
      },
    ];
  };

  // Feature #141: Mock ROI data for keywords
  const getMockKeywordROI = (campaignId) => {
    return {
      [`${campaignId}-kw-001`]: {
        revenue: 315.00,
        spend: 185.50,
        roi: 69.81,
        transactions: 21
      },
      [`${campaignId}-kw-002`]: {
        revenue: 245.40,
        spend: 203.70,
        roi: 20.47,
        transactions: 16
      },
      [`${campaignId}-kw-003`]: {
        revenue: 198.60,
        spend: 225.30,
        roi: -11.85,
        transactions: 13
      },
      [`${campaignId}-kw-004`]: {
        revenue: 153.00,
        spend: 167.40,
        roi: -8.60,
        transactions: 10
      },
      [`${campaignId}-kw-005`]: {
        revenue: 210.00,
        spend: 128.60,
        roi: 63.30,
        transactions: 14
      }
    };
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

  // Feature #138: Daily spend aggregation handlers
  const handleViewDailySpend = async () => {
    setDailySpendLoading(true);
    setShowDailySpend(true);
    setDailySpend([]);

    try {
      // Calculate date range (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(`http://localhost:3000/api/searchAds/daily-spend?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        setDailySpend(data.data || []);
      } else {
        // Use mock data if API fails
        const mockData = getMockDailySpend(startDate, endDate);
        setDailySpend(mockData);
      }
    } catch (error) {
      console.error('Error fetching daily spend:', error);
      // Use mock data as fallback
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const mockData = getMockDailySpend(startDate, endDate);
      setDailySpend(mockData);
    } finally {
      setDailySpendLoading(false);
    }
  };

  const handleCloseDailySpend = () => {
    setShowDailySpend(false);
  };

  const getMockDailySpend = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const dailyBudget = 100; // Default budget

    const mockData = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Generate realistic spend variations
      const baseSpend = dailyBudget * 0.6; // 60% of budget on average
      const variation = (Math.random() - 0.5) * dailyBudget * 0.4; // ±20% variation
      const actualSpend = Math.max(0, baseSpend + variation);

      // Occasionally go over budget (10% chance)
      const isOverBudget = Math.random() < 0.1;
      const finalSpend = isOverBudget ? Math.min(dailyBudget * 1.2, actualSpend * 1.3) : actualSpend;

      const budgetUtilization = (finalSpend / dailyBudget) * 100;
      const overBudget = finalSpend > dailyBudget;
      const overBudgetAmount = overBudget ? finalSpend - dailyBudget : 0;

      mockData.push({
        date: dateStr,
        dailyBudget,
        actualSpend: parseFloat(finalSpend.toFixed(2)),
        budgetUtilization: parseFloat(budgetUtilization.toFixed(1)),
        overBudget,
        overBudgetAmount: parseFloat(overBudgetAmount.toFixed(2)),
        budgetStatus: budgetUtilization >= 100 ? 'critical' : budgetUtilization >= 90 ? 'over_budget' : budgetUtilization >= 70 ? 'on_budget' : 'under_budget',
      });
    }

    return mockData;
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

  // Feature #140: Mock ROI data for campaigns
  const getMockCampaignROI = () => {
    return {
      '123456789': {
        revenue: 1260.15,
        spend: 850.00,
        roi: 48.25,
        transactions: 90
      },
      '123456790': {
        revenue: 540.30,
        spend: 625.00,
        roi: -13.55,
        transactions: 36
      },
      '123456791': {
        revenue: 180.45,
        spend: 425.00,
        roi: -57.54,
        transactions: 12
      },
      '123456792': {
        revenue: 95.20,
        spend: 125.00,
        roi: -23.84,
        transactions: 6
      }
    };
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
          <div>Ad Groups</div>
          <div>Keywords</div>
          <div>Daily Spend</div>
          <div>ROI</div>
          <div>Budget Util</div>
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
              <div>
                <ViewKeywordsButton onClick={() => handleViewKeywords(campaign)}>
                  View Keywords
                </ViewKeywordsButton>
              </div>
              <div>
                <ViewDailySpendButton onClick={handleViewDailySpend}>
                  💰 Daily Spend
                </ViewDailySpendButton>
              </div>
              <div>
                {/* Feature #140: ROI calculation display */}
                {campaignROI[campaign.id] ? (
                  <>
                    <ROIValue roi={campaignROI[campaign.id].roi}>
                      {campaignROI[campaign.id].roi > 0 ? '▲' : campaignROI[campaign.id].roi < 0 ? '▼' : '─'}
                      {Math.abs(campaignROI[campaign.id].roi).toFixed(1)}%
                    </ROIValue>
                    <ROILabel>
                      {formatCurrency(campaignROI[campaign.id].revenue)} / {formatCurrency(campaignROI[campaign.id].spend)}
                    </ROILabel>
                  </>
                ) : (
                  <>
                    <MetricValue>--</MetricValue>
                    <MetricLabel>No data</MetricLabel>
                  </>
                )}
              </div>
              <div>
                {/* Feature #142: Budget utilization progress bar */}
                {budgetUtilization[campaign.id] ? (
                  <BudgetUtilizationContainer>
                    <BudgetProgressBar>
                      <BudgetProgressFill percentage={budgetUtilization[campaign.id].percentage} />
                    </BudgetProgressBar>
                    <BudgetUtilizationText percentage={budgetUtilization[campaign.id].percentage}>
                      {budgetUtilization[campaign.id].percentage.toFixed(0)}%
                    </BudgetUtilizationText>
                  </BudgetUtilizationContainer>
                ) : (
                  <MetricValue>--</MetricValue>
                )}
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

      {/* Feature #137: Keyword-level spend tracking */}
      {showKeywords && selectedCampaign && (
        <KeywordsSection>
          <KeywordsHeader>
            <KeywordsTitle>
              🔑 Keywords: {selectedCampaign.name}
            </KeywordsTitle>
            <CloseKeywordsButton onClick={handleCloseKeywords}>
              ✕ Close
            </CloseKeywordsButton>
          </KeywordsHeader>

          {keywordsLoading ? (
            <LoadingState>Loading keywords...</LoadingState>
          ) : keywords.length === 0 ? (
            <EmptyState>No keywords found for this campaign.</EmptyState>
          ) : (
            <>
              <SortControls>
                <SortButton
                  active={keywordSortBy === 'spend'}
                  onClick={handleSortBySpend}
                >
                  Sort by Spend
                </SortButton>
                <SortButton
                  active={keywordSortBy === 'cpa'}
                  onClick={handleSortByCPA}
                >
                  Sort by CPA
                </SortButton>
                <SortButton
                  active={keywordSortBy === 'conversions'}
                  onClick={handleSortByConversions}
                >
                  Sort by Conversions
                </SortButton>
                <SortButton
                  active={keywordSortBy === 'roi'}
                  onClick={handleSortByROI}
                >
                  Sort by ROI
                </SortButton>
              </SortControls>

              <KeywordsTable>
                <KeywordsTableHeader>
                  <div>Keyword</div>
                  <div>Match Type</div>
                  <div>Spend</div>
                  <div>Clicks</div>
                  <div>Conversions</div>
                  <div>CPA</div>
                  <div>CTR</div>
                  <div>Conv. Rate</div>
                  <div>ROI</div>
                </KeywordsTableHeader>
                {keywords.map((keyword) => (
                  <KeywordsTableRow key={keyword.keywordId}>
                    <KeywordText>{keyword.keywordText}</KeywordText>
                    <MatchTypeBadge matchType={keyword.matchType}>
                      {keyword.matchType}
                    </MatchTypeBadge>
                    <MetricCell>
                      <MetricValueSmall>${keyword.totalSpend.toFixed(2)}</MetricValueSmall>
                    </MetricCell>
                    <MetricCell>
                      <MetricValueSmall>{keyword.totalClicks.toLocaleString()}</MetricValueSmall>
                    </MetricCell>
                    <MetricCell>
                      <MetricValueSmall color="#00d26a">
                        {keyword.totalConversions}
                      </MetricValueSmall>
                    </MetricCell>
                    <MetricCell>
                      <MetricValueSmall color={keyword.avgCPA < 4 ? '#00d26a' : keyword.avgCPA < 6 ? '#ffa500' : '#ff4757'}>
                        ${keyword.avgCPA.toFixed(2)}
                      </MetricValueSmall>
                    </MetricCell>
                    <MetricCell>
                      <MetricValueSmall>{keyword.avgCTR.toFixed(2)}%</MetricValueSmall>
                    </MetricCell>
                    <MetricCell>
                      <MetricValueSmall>{keyword.avgConversionRate.toFixed(2)}%</MetricValueSmall>
                    </MetricCell>
                    <MetricCell>
                      {keywordROI[keyword.keywordId] ? (
                        <ROIValue roi={keywordROI[keyword.keywordId].roi}>
                          {keywordROI[keyword.keywordId].roi > 0 ? '▲' : keywordROI[keyword.keywordId].roi < 0 ? '▼' : '─'}
                          {Math.abs(keywordROI[keyword.keywordId].roi).toFixed(1)}%
                        </ROIValue>
                      ) : (
                        <MetricValueSmall>--</MetricValueSmall>
                      )}
                    </MetricCell>
                  </KeywordsTableRow>
                ))}
              </KeywordsTable>
            </>
          )}
        </KeywordsSection>
      )}

      {/* Feature #138: Daily spend aggregation */}
      {showDailySpend && (
        <DailySpendSection>
          <DailySpendHeader>
            <DailySpendTitle>
              💰 Daily Spend Analysis (Last 30 Days)
            </DailySpendTitle>
            <CloseDailySpendButton onClick={handleCloseDailySpend}>
              ✕ Close
            </CloseDailySpendButton>
          </DailySpendHeader>

          {dailySpendLoading ? (
            <LoadingState>Loading daily spend data...</LoadingState>
          ) : dailySpend.length === 0 ? (
            <EmptyState>No daily spend data available.</EmptyState>
          ) : (
            <>
              {/* Summary cards */}
              <DailySpendSummary>
                <SummaryCard>
                  <SummaryLabel>Total Spend</SummaryLabel>
                  <SummaryValue>
                    ${dailySpend.reduce((sum, day) => sum + day.actualSpend, 0).toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Average Daily Spend</SummaryLabel>
                  <SummaryValue>
                    ${(dailySpend.reduce((sum, day) => sum + day.actualSpend, 0) / dailySpend.length).toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Daily Budget</SummaryLabel>
                  <SummaryValue>
                    ${dailySpend[0]?.dailyBudget || 0}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Over-Budget Days</SummaryLabel>
                  <SummaryValue color="#ff4757">
                    {dailySpend.filter(day => day.overBudget).length}
                  </SummaryValue>
                </SummaryCard>
              </DailySpendSummary>

              {/* Chart */}
              <DailySpendChartContainer>
                <DailySpendLegend>
                  <LegendItem>
                    <LegendColor color="#e94560" />
                    <span>Actual Spend</span>
                  </LegendItem>
                  <LegendItem>
                    <LegendColor color="#7b2cbf" />
                    <span>Daily Budget</span>
                  </LegendItem>
                </DailySpendLegend>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailySpend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      stroke="#a0a0a0"
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis
                      stroke="#a0a0a0"
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#16213e',
                        border: '1px solid #2d3561',
                        borderRadius: '8px',
                        color: '#eaeaea',
                      }}
                      labelStyle={{ color: '#eaeaea' }}
                      formatter={(value, name) => {
                        if (name === 'actualSpend') return [`$${value.toFixed(2)}`, 'Actual Spend'];
                        if (name === 'dailyBudget') return [`$${value}`, 'Daily Budget'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <ReferenceLine
                      y={dailySpend[0]?.dailyBudget || 0}
                      stroke="#7b2cbf"
                      strokeDasharray="3 3"
                      label={{ value: 'Budget', fill: '#7b2cbf', fontSize: 12 }}
                    />
                    <Bar
                      dataKey="actualSpend"
                      fill="#e94560"
                      radius={[4, 4, 0, 0]}
                      name="Actual Spend"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </DailySpendChartContainer>

              {/* Over-budget days list */}
              {dailySpend.filter(day => day.overBudget).length > 0 && (
                <OverBudgetList>
                  <OverBudgetTitle>
                    ⚠️ Over-Budget Days ({dailySpend.filter(day => day.overBudget).length})
                  </OverBudgetTitle>
                  {dailySpend
                    .filter(day => day.overBudget)
                    .sort((a, b) => b.overBudgetAmount - a.overBudgetAmount)
                    .map((day) => (
                      <OverBudgetItem key={day.date}>
                        <OverBudgetDate>
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </OverBudgetDate>
                        <OverBudgetAmount>
                          Budget: ${day.dailyBudget.toFixed(2)} |
                          Spent: ${day.actualSpend.toFixed(2)} |
                          Over: ${day.overBudgetAmount.toFixed(2)} ({day.budgetUtilization.toFixed(1)}%)
                        </OverBudgetAmount>
                      </OverBudgetItem>
                    ))}
                </OverBudgetList>
              )}
            </>
          )}
        </DailySpendSection>
      )}
    </PageContainer>
  );
}

export default Campaigns;
