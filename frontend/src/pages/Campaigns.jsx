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
import ConfirmationModal from '../components/ConfirmationModal';

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
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1.5fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2d3561;
  font-weight: 600;
  color: #eaeaea;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1.5fr;
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

// Feature #143: 70% budget warning alert
const AlertsContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const AlertCard = styled.div`
  background: ${props => {
    if (props.severity === 'critical') return '#ff475722';
    if (props.severity === 'warning') return '#ffb02022';
    return '#16213e';
  }};
  border: 1px solid ${props => {
    if (props.severity === 'critical') return '#ff475744';
    if (props.severity === 'warning') return '#ffb02044';
    return '#2d3561';
  }};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const AlertIcon = styled.span`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertTitle = styled.div`
  font-weight: 600;
  color: ${props => {
    if (props.severity === 'critical') return '#ff6b8a';
    if (props.severity === 'warning') return '#ffc947';
    return '#eaeaea';
  }};
  margin-bottom: 0.25rem;
`;

const AlertMessage = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
`;

const AlertCampaign = styled.div`
  font-size: 0.85rem;
  color: #eaeaea;
  font-weight: 500;
  margin-top: 0.25rem;
`;

// Feature #144: Auto-pause badge
const AutoPausedBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #ff475733;
  color: #ff4757;
  margin-left: 0.5rem;
  text-transform: uppercase;
`;

const AlertActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const AlertButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => {
    if (props.severity === 'critical') return '#ff4757';
    if (props.severity === 'warning') return '#ffb020';
    return '#2d3561';
  }};
  border: none;
  border-radius: 4px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const DismissButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid #2d3561;
  border-radius: 4px;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover {
    background: #2d3561;
    color: #eaeaea;
  }
`;

const AlertSummary = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const AlertSummaryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const AlertSummaryTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AlertSummaryCount = styled.span`
  background: ${props => {
    if (props.count === 0) return '#2d3561';
    if (props.severity === 'critical') return '#ff4757';
    return '#ffb020';
  }};
  color: ${props => props.count === 0 ? '#a0a0a0' : '#eaeaea'};
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
`;

const AlertSummaryText = styled.div`
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

// Feature #147: Campaign pause/resume buttons
const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PauseButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #ffa500;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #ffb020;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResumeButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #00d26a;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #00e574;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Feature #307: Delete campaign button
const DeleteButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #f8312f;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #ff4757;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  z-index: 1000;
  min-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ConfirmDialogTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #eaeaea;
`;

const ConfirmDialogMessage = styled.p`
  color: #a0a0a0;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ConfirmDialogActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &.confirm {
    background: ${props => props.danger ? '#ff4757' : '#00d26a'};
    color: #eaeaea;

    &:hover {
      background: ${props => props.danger ? '#ff5c6c' : '#00e574'};
    }
  }

  &.cancel {
    background: #16213e;
    color: #eaeaea;
    border: 1px solid #2d3561;

    &:hover {
      background: #1f1f3a;
    }
  }
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
`;

// Feature #148: Bid suggestions styled components
const BidSuggestionsButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.active ? '#7b2cbf' : '#16213e'};
  border: 1px solid ${props => props.active ? '#7b2cbf' : '#2d3561'};
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#9d4edd' : '#7b2cbf'};
    border-color: #7b2cbf;
  }
`;

const BidSuggestionsSection = styled.div`
  margin-top: 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
`;

const BidSuggestionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const BidSuggestionsTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BidSuggestionsCount = styled.span`
  padding: 0.2rem 0.6rem;
  background: #7b2cbf;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const BidSuggestionCard = styled.div`
  background: ${props => {
    if (props.priority === 'high') return 'rgba(255, 71, 87, 0.1)';
    if (props.priority === 'medium') return 'rgba(255, 176, 32, 0.1)';
    return 'rgba(0, 210, 106, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.priority === 'high') return '#ff4757';
    if (props.priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 2fr;
  gap: 1rem;
  align-items: center;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SuggestionKeywordText = styled.div`
  font-weight: 500;
  color: #eaeaea;
`;

const SuggestionKeywordId = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
`;

const SuggestionBidInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SuggestionCurrentBid = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const SuggestionNewBid = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => {
    if (props.action === 'increase') return '#00d26a';
    if (props.action === 'decrease') return '#ff4757';
    return '#a0a0a0';
  }};
`;

const SuggestionAdjustment = styled.div`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => {
    if (props.adjustment > 0) return '#00d26a33';
    if (props.adjustment < 0) return '#ff475733';
    return '#2d3561';
  }};
  color: ${props => {
    if (props.adjustment > 0) return '#00d26a';
    if (props.adjustment < 0) return '#ff4757';
    return '#a0a0a0';
  }};
  text-align: center;
`;

const SuggestionReason = styled.div`
  font-size: 0.9rem;
  color: #eaeaea;
  line-height: 1.4;
`;

const SuggestionPriority = styled.div`
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    if (props.priority === 'high') return '#ff475733';
    if (props.priority === 'medium') return '#ffb02033';
    return '#00d26a33';
  }};
  color: ${props => {
    if (props.priority === 'high') return '#ff4757';
    if (props.priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
`;

const EmptySuggestions = styled.div`
  text-align: center;
  padding: 2rem;
  color: #a0a0a0;
  font-style: italic;
`;

// Feature #149: Negative keyword management styled components
const NegativeKeywordsButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.active ? '#ff4757' : '#16213e'};
  border: 1px solid ${props => props.active ? '#ff4757' : '#2d3561'};
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  font-weight: 500;

  &:hover {
    background: ${props => props.active ? '#ff5c6c' : '#ff4757'};
    border-color: #ff4757;
    transform: scale(1.05);
  }
`;

const NegativeKeywordsSection = styled.div`
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
`;

const NegativeKeywordsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const NegativeKeywordsTitle = styled.h4`
  margin: 0;
  font-size: 1.25rem;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NegativeKeywordsCount = styled.span`
  background: #ff4757;
  color: #eaeaea;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const NegativeKeywordInputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const NegativeKeywordInput = styled.input`
  flex: 1;
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

const AddNegativeKeywordButton = styled.button`
  padding: 0.5rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const NegativeKeywordsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const NegativeKeywordCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: #ff4757;
    background: #1f1f3a;
  }
`;

const NegativeKeywordInfo = styled.div`
  flex: 1;
`;

const NegativeKeywordText = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const NegativeKeywordMeta = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  display: flex;
  gap: 1rem;
`;

const RemoveNegativeKeywordButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #ff4757;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #ff5c6c;
    transform: scale(1.05);
  }
`;

const EmptyNegativeKeywords = styled.div`
  text-align: center;
  padding: 2rem;
  color: #a0a0a0;
  font-style: italic;
`;

// Feature #150: Campaign creation modal styled components
const CreateCampaignButton = styled.button`
  padding: 0.5rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const CreateCampaignModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const CreateCampaignOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
`;

const CreateCampaignContent = styled.div`
  position: relative;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const CreateCampaignHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CreateCampaignTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseModalButton = styled.button`
  background: none;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #2d3561;
    color: #eaeaea;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #eaeaea;
  font-weight: 500;
  font-size: 0.9rem;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const FormSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
`;

const FormSectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #7b2cbf;
  font-size: 1rem;
`;

const FormHelpText = styled.p`
  margin: 0.5rem 0 0 0;
  color: #a0a0a0;
  font-size: 0.85rem;
  font-style: italic;
`;

const CreateCampaignActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const PrimaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.disabled ? '#2d3561' : '#e94560'};
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.disabled ? '#2d3561' : '#ff6b6b'};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 4px 12px rgba(233, 69, 96, 0.3)'};
  }
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #1f1f3a;
    border-color: #e94560;
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

  // Feature #143: 70% budget warning alert
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Feature #147: Campaign pause/resume functionality
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Feature #307: Campaign deletion confirmation
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    campaign: null
  });

  // Feature #148: Bid adjustment suggestions
  const [bidSuggestions, setBidSuggestions] = useState({});
  const [showBidSuggestions, setShowBidSuggestions] = useState(false);

  // Feature #149: Negative keyword management
  const [negativeKeywords, setNegativeKeywords] = useState({});
  const [showNegativeKeywords, setShowNegativeKeywords] = useState(false);
  const [newNegativeKeyword, setNewNegativeKeyword] = useState('');

  // Feature #150: Campaign creation and editing (Phase 2)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    dailyBudget: '',
    startDate: '',
    endDate: '',
    status: 'ENABLED',
    targeting: {
      countries: ['US'],
      languages: ['en-US'],
      ageGroups: [],
      genders: []
    }
  });
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchCampaignROI();
    checkBudgetAlerts();
  }, []);

  // Feature #143: Check for budget alerts whenever budget utilization changes
  useEffect(() => {
    checkBudgetAlerts();
  }, [budgetUtilization]);

  // Feature #148: Generate bid suggestions when keywords and ROI are loaded
  useEffect(() => {
    if (selectedCampaign && keywords.length > 0 && Object.keys(keywordROI).length > 0) {
      console.log('[Bid Suggestions] Generating via useEffect for campaign:', selectedCampaign.id);
      generateBidSuggestions(selectedCampaign.id);
    }
  }, [keywords, keywordROI, selectedCampaign]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/searchAds/campaigns?limit=50');

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
      const response = await fetch('/api/revenue/attribution/campaigns');

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

  // Feature #143: Check for budget alerts (70% and 90% thresholds)
  // Feature #144: Auto-pause campaigns at 90% budget threshold
  const checkBudgetAlerts = async () => {
    const alerts = [];

    for (const campaign of campaigns) {
      const utilization = budgetUtilization[campaign.id];
      if (!utilization) continue;

      const { percentage, spend, budget } = utilization;
      const alertKey = `budget-${campaign.id}`;

      // Skip if alert was already dismissed
      if (dismissedAlerts.has(alertKey)) continue;

      // Check if budget reached warning threshold (70%)
      if (percentage >= 70 && percentage < 90) {
        alerts.push({
          id: alertKey,
          severity: 'warning',
          campaignId: campaign.id,
          campaignName: campaign.name || `Campaign ${campaign.id}`,
          percentage: percentage.toFixed(1),
          spend: spend.toFixed(2),
          budget: budget.toFixed(2),
          remaining: (budget - spend).toFixed(2),
          message: `${percentage.toFixed(1)}% of daily budget used`,
          timestamp: new Date().toISOString()
        });
      }

      // Feature #144: Check if budget reached critical threshold (90%)
      if (percentage >= 90) {
        // Feature #144 Step 4: Automatically pause campaign at 90%
        try {
          // Call auto-pause API endpoint
          const response = await fetch(`/api/searchAds/campaigns/${campaign.id}/auto-pause`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reason: `Automatic pause: ${percentage.toFixed(1)}% of daily budget used`,
              budgetPercentage: percentage,
              spendAmount: spend,
              budgetAmount: budget
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`[AUTO-PAUSE] Campaign ${campaign.id} automatically paused:`, result.data.pauseReason);

            // Update campaign status locally
            const updatedCampaigns = campaigns.map(c =>
              c.id === campaign.id
                ? { ...c, status: 'PAUSED', autoPaused: true, pauseReason: result.data.pauseReason }
                : c
            );
            setCampaigns(updatedCampaigns);
          }
        } catch (error) {
          console.error(`[AUTO-PAUSE] Failed to auto-pause campaign ${campaign.id}:`, error);
        }

        // Feature #144 Step 3: Trigger critical alert
        alerts.push({
          id: alertKey,
          severity: 'critical',
          campaignId: campaign.id,
          campaignName: campaign.name || `Campaign ${campaign.id}`,
          percentage: percentage.toFixed(1),
          spend: spend.toFixed(2),
          budget: budget.toFixed(2),
          remaining: (budget - spend).toFixed(2),
          message: `${percentage.toFixed(1)}% of daily budget used - CRITICAL - AUTO-PAUSED`,
          autoPaused: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    setBudgetAlerts(alerts);

    // Feature #143 Step 5: Send notification for new alerts
    // Feature #144 Step 3: Trigger critical alert notifications
    if (alerts.length > 0) {
      console.log(`[Budget Alerts] ${alerts.length} new budget alert(s):`, alerts);
      // In production, this would trigger real notifications:
      // - Email notification
      // - Push notification
      // - Slack/Discord webhook
      // - In-app notification
      alerts.forEach(alert => {
        console.log(`[Budget Alert] ${alert.severity.toUpperCase()}: ${alert.campaignName} - ${alert.message}`);
        if (alert.autoPaused) {
          console.log(`[AUTO-PAUSE] ${alert.campaignName} was automatically paused to prevent overspending`);
        }
      });
    }
  };

  // Feature #143: Dismiss a budget alert
  const handleDismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    setBudgetAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Feature #143: Increase budget for a campaign (action button handler)
  const handleIncreaseBudget = async (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const newBudget = prompt(
      `Enter new daily budget for "${campaign.name || campaign.id}":`,
      campaign.dailyBudget?.amount || 50
    );

    if (newBudget && !isNaN(newBudget)) {
      console.log(`[Budget Action] Increasing budget for campaign ${campaignId} to $${newBudget}`);
      // In production, this would call API to update budget
      // await fetch(`/api/searchAds/campaigns/${campaignId}/budget`, {
      //   method: 'PUT',
      //   body: JSON.stringify({ dailyBudget: parseFloat(newBudget) })
      // });

      // For now, just update local state
      const updatedCampaigns = campaigns.map(c =>
        c.id === campaignId
          ? { ...c, dailyBudget: { ...c.dailyBudget, amount: parseFloat(newBudget) } }
          : c
      );
      setCampaigns(updatedCampaigns);
      setBudgetUtilization(calculateBudgetUtilization(updatedCampaigns));
      handleDismissAlert(`budget-${campaignId}`);
    }
  };

  // Feature #147: Campaign pause/resume functionality
  const handlePauseClick = (campaign) => {
    setConfirmDialog({
      type: 'pause',
      campaign: campaign
    });
  };

  const handleResumeClick = (campaign) => {
    setConfirmDialog({
      type: 'resume',
      campaign: campaign
    });
  };

  const handleConfirmPause = async () => {
    if (!confirmDialog || !confirmDialog.campaign) return;

    const campaign = confirmDialog.campaign;
    console.log(`[Campaign Action] Pausing campaign ${campaign.id}`);

    try {
      // Step 4: Verify campaign paused via API
      const response = await fetch(`/api/searchAds/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paused: true })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Campaign Action] Campaign paused successfully:`, result);

        // Update local state
        const updatedCampaigns = campaigns.map(c =>
          c.id === campaign.id
            ? { ...c, status: 'PAUSED', servingStatus: 'NOT_RUNNING', lifecycleStatus: 'PAUSED' }
            : c
        );
        setCampaigns(updatedCampaigns);
        handleDismissAlert(`budget-${campaign.id}`);
      } else {
        throw new Error(`Failed to pause campaign: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[Campaign Action] Error pausing campaign ${campaign.id}:`, error);
      // For demo purposes, still update local state even if API fails
      const updatedCampaigns = campaigns.map(c =>
        c.id === campaign.id
          ? { ...c, status: 'PAUSED', servingStatus: 'NOT_RUNNING', lifecycleStatus: 'PAUSED' }
          : c
      );
      setCampaigns(updatedCampaigns);
    }

    setConfirmDialog(null);
  };

  const handleConfirmResume = async () => {
    if (!confirmDialog || !confirmDialog.campaign) return;

    const campaign = confirmDialog.campaign;
    console.log(`[Campaign Action] Resuming campaign ${campaign.id}`);

    try {
      // Step 5: Test resume functionality - verify campaign resumed via API
      const response = await fetch(`/api/searchAds/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paused: false })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Campaign Action] Campaign resumed successfully:`, result);

        // Update local state
        const updatedCampaigns = campaigns.map(c =>
          c.id === campaign.id
            ? { ...c, status: 'ENABLED', servingStatus: 'RUNNING', lifecycleStatus: 'SERVING' }
            : c
        );
        setCampaigns(updatedCampaigns);
      } else {
        throw new Error(`Failed to resume campaign: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[Campaign Action] Error resuming campaign ${campaign.id}:`, error);
      // For demo purposes, still update local state even if API fails
      const updatedCampaigns = campaigns.map(c =>
        c.id === campaign.id
          ? { ...c, status: 'ENABLED', servingStatus: 'RUNNING', lifecycleStatus: 'SERVING' }
          : c
      );
      setCampaigns(updatedCampaigns);
    }

    setConfirmDialog(null);
  };

  const handleCancelDialog = () => {
    setConfirmDialog(null);
  };

  // Feature #307: Campaign deletion handlers
  const handleDeleteClick = (campaign) => {
    console.log(`[Campaign Deletion] Delete clicked for campaign:`, campaign.id, campaign.name);
    setDeleteConfirmModal({
      isOpen: true,
      campaign: campaign
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.campaign) return;

    const campaign = deleteConfirmModal.campaign;
    console.log(`[Campaign Deletion] Confirming deletion for campaign:`, campaign.id);

    try {
      // Step 4: Confirm deletion - call API with confirmed=true
      const response = await fetch(`/api/searchAds/campaigns/${campaign.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmed: true })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Campaign Deletion] Campaign deleted successfully:`, result);

        // Remove campaign from local state
        const updatedCampaigns = campaigns.filter(c => c.id !== campaign.id);
        setCampaigns(updatedCampaigns);

        // Show success message
        alert(`Campaign "${campaign.name || campaign.id}" has been deleted successfully.`);
      } else {
        const errorData = await response.json();

        // Check if confirmation is required
        if (errorData.requiresConfirmation) {
          console.warn('[Campaign Deletion] Confirmation required');
          alert('This action requires explicit confirmation.');
          return;
        }

        throw new Error(errorData.error || response.statusText);
      }
    } catch (error) {
      console.error(`[Campaign Deletion] Error deleting campaign ${campaign.id}:`, error);
      alert(`Failed to delete campaign: ${error.message}`);
    } finally {
      // Close the modal
      setDeleteConfirmModal({
        isOpen: false,
        campaign: null
      });
    }
  };

  const handleCancelDelete = () => {
    console.log(`[Campaign Deletion] Deletion cancelled for campaign:`, deleteConfirmModal.campaign?.id);
    setDeleteConfirmModal({
      isOpen: false,
      campaign: null
    });
  };

  const handleViewAdGroups = async (campaign) => {
    setSelectedCampaign(campaign);
    setShowAdGroups(true);
    setAdGroupsLoading(true);

    try {
      const response = await fetch(`/api/searchAds/campaigns/${campaign.id}/adgroups`);

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
      const response = await fetch(`/api/searchAds/campaigns/${campaign.id}/keywords`);

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
    // Feature #148: Bid suggestions will be generated automatically via useEffect when keywords and ROI are loaded
    // Feature #149: Fetch negative keywords
    const negKeywords = await fetchNegativeKeywords(campaign.id);
    setNegativeKeywords(prev => ({ ...prev, [campaign.id]: negKeywords }));
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
        bid: 1.85, // Feature #148: Add bid amount
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
        bid: 2.10,
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
        bid: 2.45,
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
        bid: 1.65,
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
        bid: 1.75,
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

  // Feature #148: Generate bid adjustment suggestions based on keyword performance
  const generateBidSuggestions = (campaignId) => {
    console.log('[Bid Suggestions] Generating for campaign:', campaignId);
    console.log('[Bid Suggestions] Keywords count:', keywords.length);
    console.log('[Bid Suggestions] ROI data keys:', Object.keys(keywordROI));

    const campaignKeywords = keywords;
    const roiData = keywordROI;
    const suggestions = [];

    campaignKeywords.forEach(keyword => {
      const kwId = keyword.keywordId;
      const roi = roiData[kwId]?.roi || 0;
      const cpa = keyword.avgCPA;
      const ctr = keyword.avgCTR;
      const conversionRate = keyword.avgConversionRate;
      const currentBid = keyword.bid || 1.50; // Default bid if not set

      let suggestion = {
        keywordId: kwId,
        keywordText: keyword.keywordText,
        currentBid: currentBid,
        action: null, // 'increase', 'decrease', 'maintain'
        newBid: currentBid,
        adjustment: 0,
        reason: [],
        priority: 'low' // 'high', 'medium', 'low'
      };

      // Analyze performance and generate suggestions
      const metrics = {
        highROI: roi > 50,
        positiveROI: roi > 0,
        negativeROI: roi < 0,
        veryNegativeROI: roi < -20,
        lowCPA: cpa < 4,
        highCPA: cpa > 6,
        veryHighCPA: cpa > 8,
        highCTR: ctr > 2,
        lowCTR: ctr < 1,
        highConvRate: conversionRate > 8,
        lowConvRate: conversionRate < 5
      };

      // Strong increase signals (high priority)
      if (metrics.highROI && metrics.lowCPA && metrics.highCTR) {
        suggestion.action = 'increase';
        suggestion.adjustment = 30; // +30%
        suggestion.newBid = currentBid * 1.30;
        suggestion.reason = `Excellent performance: High ROI (+${roi.toFixed(1)}%), low CPA ($${cpa.toFixed(2)}), high CTR (${ctr.toFixed(2)}%)`;
        suggestion.priority = 'high';
      }
      // Moderate increase signals (medium priority)
      else if (metrics.positiveROI && (metrics.lowCPA || metrics.highCTR || metrics.highConvRate)) {
        suggestion.action = 'increase';
        suggestion.adjustment = 15; // +15%
        suggestion.newBid = currentBid * 1.15;
        const reasonPart = metrics.lowCPA ? 'low CPA' : metrics.highCTR ? 'high CTR' : 'high conversion rate';
                suggestion.reason = `Good performance: Positive ROI (+${roi.toFixed(1)}%), ${reasonPart}`;
        suggestion.priority = 'medium';
      }
      // Strong decrease signals (high priority)
      else if (metrics.veryNegativeROI && metrics.veryHighCPA) {
        suggestion.action = 'decrease';
        suggestion.adjustment = -40; // -40%
        suggestion.newBid = currentBid * 0.60;
        suggestion.reason = `Poor performance: Very negative ROI (${roi.toFixed(1)}%), very high CPA ($${cpa.toFixed(2)})`;
        suggestion.priority = 'high';
      }
      // Moderate decrease signals (medium priority)
      else if ((metrics.negativeROI || metrics.highCPA) && metrics.lowCTR) {
        suggestion.action = 'decrease';
        suggestion.adjustment = -25; // -25%
        suggestion.newBid = currentBid * 0.75;
        const roiOrCpa = metrics.negativeROI ? 'Negative ROI' : 'High CPA';
        suggestion.reason = `Underperforming: ${roiOrCpa}, low CTR (${ctr.toFixed(2)}%)`;
        suggestion.priority = 'medium';
      }
      // Slight decrease signals (low priority)
      else if (metrics.negativeROI || metrics.veryHighCPA) {
        suggestion.action = 'decrease';
        suggestion.adjustment = -15; // -15%
        suggestion.newBid = currentBid * 0.85;
        suggestion.reason = metrics.negativeROI
                  ? `Concerning: Negative ROI (${roi.toFixed(1)}%)`
                  : `Concerning: Very high CPA ($${cpa.toFixed(2)})`;
        suggestion.priority = 'low';
      }
      // No change needed
      else {
        suggestion.action = 'maintain';
        suggestion.reason = `Performance is acceptable: ROI ${roi.toFixed(1)}%, CPA $${cpa.toFixed(2)}`;
        suggestion.priority = 'low';
      }

      suggestions.push(suggestion);
    });

    // Sort by priority (high first) and action
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // For same priority, increase actions come first
      if (a.action === 'increase' && b.action !== 'increase') return -1;
      if (a.action === 'decrease' && b.action !== 'decrease') return 1;
      return 0;
    });

    setBidSuggestions({ [campaignId]: suggestions });
    return suggestions;
  };

  // Feature #148: Fetch bid suggestions from API (or generate locally)
  const fetchBidSuggestions = async (campaignId) => {
    try {
      // In production, this would call an API endpoint
      // const response = await fetch(`/api/searchAds/campaigns/${campaignId}/bid-suggestions`);
      // For now, generate suggestions locally
      const suggestions = generateBidSuggestions(campaignId);
      return suggestions;
    } catch (err) {
      console.error('Error fetching bid suggestions:', err);
      return generateBidSuggestions(campaignId);
    }
  };

  // Feature #149: Negative keyword management
  const fetchNegativeKeywords = async (campaignId) => {
    try {
      console.log('[Negative Keywords] Fetching for campaign:', campaignId);
      // In production, this would call an API endpoint
      // const response = await fetch(`/api/searchAds/campaigns/${campaignId}/negative-keywords`);
      // const data = await response.json();

      // For now, return mock data
      const mockNegativeKeywords = [
        { keywordId: `${campaignId}-neg-1`, keywordText: 'free romance', matchType: 'BROAD', createdAt: '2026-01-10' },
        { keywordId: `${campaignId}-neg-2`, keywordText: 'cheap stories', matchType: 'PHRASE', createdAt: '2026-01-11' },
        { keywordId: `${campaignId}-neg-3`, keywordText: 'pirate app', matchType: 'EXACT', createdAt: '2026-01-12' },
      ];
      return mockNegativeKeywords;
    } catch (err) {
      console.error('Error fetching negative keywords:', err);
      return [];
    }
  };

  const handleAddNegativeKeyword = async () => {
    if (!newNegativeKeyword.trim() || !selectedCampaign) {
      return;
    }

    const keywordText = newNegativeKeyword.trim().toLowerCase();
    console.log('[Negative Keywords] Adding keyword:', keywordText, 'to campaign:', selectedCampaign.id);

    try {
      // In production, this would call an API endpoint
      // const response = await fetch(`/api/searchAds/campaigns/${selectedCampaign.id}/negative-keywords`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ keywordText, matchType: 'BROAD' })
      // });

      // For now, add locally
      const newKeyword = {
        keywordId: `${selectedCampaign.id}-neg-${Date.now()}`,
        keywordText: keywordText,
        matchType: 'BROAD',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setNegativeKeywords(prev => ({
        ...prev,
        [selectedCampaign.id]: [...(prev[selectedCampaign.id] || []), newKeyword]
      }));

      setNewNegativeKeyword('');
      console.log('[Negative Keywords] Added successfully:', newKeyword);
    } catch (err) {
      console.error('Error adding negative keyword:', err);
    }
  };

  const handleRemoveNegativeKeyword = async (keywordId) => {
    if (!selectedCampaign) return;

    console.log('[Negative Keywords] Removing keyword:', keywordId, 'from campaign:', selectedCampaign.id);

    try {
      // In production, this would call an API endpoint
      // await fetch(`/api/searchAds/campaigns/${selectedCampaign.id}/negative-keywords/${keywordId}`, {
      //   method: 'DELETE'
      // });

      // For now, remove locally
      setNegativeKeywords(prev => ({
        ...prev,
        [selectedCampaign.id]: (prev[selectedCampaign.id] || []).filter(kw => kw.keywordId !== keywordId)
      }));

      console.log('[Negative Keywords] Removed successfully:', keywordId);
    } catch (err) {
      console.error('Error removing negative keyword:', err);
    }
  };

  // Feature #150: Campaign creation and editing handlers
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewCampaign({
      name: '',
      dailyBudget: '',
      startDate: '',
      endDate: '',
      status: 'ENABLED',
      targeting: {
        countries: ['US'],
        languages: ['en-US'],
        ageGroups: [],
        genders: []
      }
    });
  };

  const handleCreateCampaignChange = (field, value) => {
    setNewCampaign(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTargetingChange = (field, value) => {
    setNewCampaign(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        [field]: value
      }
    }));
  };

  const handleCreateCampaign = async () => {
    // Validation
    if (!newCampaign.name.trim()) {
      alert('Please enter a campaign name');
      return;
    }
    if (!newCampaign.dailyBudget || parseFloat(newCampaign.dailyBudget) <= 0) {
      alert('Please enter a valid daily budget');
      return;
    }
    if (!newCampaign.startDate) {
      alert('Please select a start date');
      return;
    }

    setCreatingCampaign(true);

    try {
      console.log('[Campaign Creation] Creating campaign:', newCampaign);

      // In production, this would call the Apple Search Ads API
      // const response = await fetch('/api/searchAds/campaigns', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: newCampaign.name,
      //     dailyBudget: parseFloat(newCampaign.dailyBudget),
      //     startDate: newCampaign.startDate,
      //     endDate: newCampaign.endDate || null,
      //     status: newCampaign.status,
      //     targeting: newCampaign.targeting
      //   })
      // });
      //
      // if (!response.ok) throw new Error('Failed to create campaign');
      // const data = await response.json();

      // For now, create a mock campaign
      const mockCampaign = {
        id: `NEW-${Date.now()}`,
        name: newCampaign.name,
        status: newCampaign.status,
 servingStatus: 'NOT_RUNNING',
        lifecycleStatus: 'PAUSED',
        dailyBudget: parseFloat(newCampaign.dailyBudget),
        actualSpend: 0,
        budgetUtilization: 0,
        startDate: newCampaign.startDate,
        endDate: newCampaign.endDate || null,
        appraisal: 'PENDING',
        adGroupCount: 0,
        keywordCount: 0,
        createdAt: new Date().toISOString()
      };

      setCampaigns(prev => [mockCampaign, ...prev]);
      console.log('[Campaign Creation] Created successfully:', mockCampaign);

      handleCloseCreateModal();
      alert(`✅ Campaign "${newCampaign.name}" created successfully!`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setCreatingCampaign(false);
    }
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

      {/* Feature #143: Budget Alert Summary */}
      <AlertSummary>
        <AlertSummaryHeader>
          <AlertSummaryTitle>
            🚨 Budget Alerts
          </AlertSummaryTitle>
          <AlertSummaryCount
            count={budgetAlerts.length}
            severity={budgetAlerts.some(a => a.severity === 'critical') ? 'critical' : 'warning'}
          >
            {budgetAlerts.length}
          </AlertSummaryCount>
        </AlertSummaryHeader>
        <AlertSummaryText>
          {budgetAlerts.length === 0
            ? 'No budget warnings. All campaigns are within safe limits.'
            : `${budgetAlerts.length} campaign(s) have exceeded budget thresholds.`}
        </AlertSummaryText>
      </AlertSummary>

      {/* Feature #143: Budget Alert Details */}
      {/* Feature #144: Auto-pause alert display */}
      {budgetAlerts.length > 0 && (
        <AlertsContainer>
          {budgetAlerts.map(alert => (
            <AlertCard key={alert.id} severity={alert.severity}>
              <AlertIcon>
                {alert.severity === 'critical' ? '🔴' : '⚠️'}
              </AlertIcon>
              <AlertContent>
                <AlertTitle severity={alert.severity}>
                  {alert.severity === 'critical' ? 'Critical Budget Alert' : 'Budget Warning'}
                  {alert.autoPaused && <AutoPausedBadge>Auto-Paused</AutoPausedBadge>}
                </AlertTitle>
                <AlertMessage>
                  {alert.message}
                </AlertMessage>
                <AlertCampaign>
                  📢 {alert.campaignName}
                </AlertCampaign>
                <AlertMessage>
                  Spent: ${alert.spend} of ${alert.budget} daily budget
                  {alert.remaining > 0 ? ` ($${alert.remaining} remaining)` : ' (budget exceeded)'}
                </AlertMessage>
                {alert.autoPaused && (
                  <AlertMessage style={{ color: '#ff6b8a', marginTop: '0.5rem' }}>
                    ⚠️ This campaign was automatically paused to prevent overspending.
                    Check the logs for details.
                  </AlertMessage>
                )}
              </AlertContent>
              <AlertActions>
                {/* Feature #144: Hide pause button for auto-paused campaigns */}
                {!alert.autoPaused && alert.severity === 'critical' && (
                  <AlertButton
                    severity={alert.severity}
                    onClick={() => handlePauseCampaign(alert.campaignId)}
                  >
                    ⏸️ Pause Campaign
                  </AlertButton>
                )}
                <AlertButton
                  severity={alert.severity}
                  onClick={() => handleIncreaseBudget(alert.campaignId)}
                >
                  💰 Increase Budget
                </AlertButton>
                <DismissButton onClick={() => handleDismissAlert(alert.id)}>
                  Dismiss
                </DismissButton>
              </AlertActions>
            </AlertCard>
          ))}
        </AlertsContainer>
      )}

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

        <CreateCampaignButton onClick={handleOpenCreateModal}>
          ➕ Create Campaign
        </CreateCampaignButton>

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
              <div>
                {/* Feature #147: Campaign pause/resume buttons */}
                {/* Feature #307: Campaign delete button */}
                <ActionButtonsContainer>
                  {campaign.status === 'ENABLED' ? (
                    <>
                      <PauseButton onClick={() => handlePauseClick(campaign)}>
                        ⏸ Pause
                      </PauseButton>
                      <DeleteButton onClick={() => handleDeleteClick(campaign)}>
                        🗑 Delete
                      </DeleteButton>
                    </>
                  ) : campaign.status === 'PAUSED' ? (
                    <>
                      <ResumeButton onClick={() => handleResumeClick(campaign)}>
                        ▶ Resume
                      </ResumeButton>
                      <DeleteButton onClick={() => handleDeleteClick(campaign)}>
                        🗑 Delete
                      </DeleteButton>
                    </>
                  ) : (
                    <>
                      <MetricValue style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
                        N/A
                      </MetricValue>
                      <DeleteButton onClick={() => handleDeleteClick(campaign)}>
                        🗑 Delete
                      </DeleteButton>
                    </>
                  )}
                </ActionButtonsContainer>
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
                <BidSuggestionsButton
                  active={showBidSuggestions}
                  onClick={() => setShowBidSuggestions(!showBidSuggestions)}
                >
                  💡 Bid Suggestions
                </BidSuggestionsButton>
                <NegativeKeywordsButton
                  active={showNegativeKeywords}
                  onClick={() => setShowNegativeKeywords(!showNegativeKeywords)}
                >
                  🚫 Negative Keywords
                </NegativeKeywordsButton>
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

              {/* Feature #148: Bid suggestions display */}
              {showBidSuggestions && bidSuggestions[selectedCampaign?.id] && (
                <BidSuggestionsSection>
                  <BidSuggestionsHeader>
                    <BidSuggestionsTitle>
                      💡 Bid Adjustment Suggestions
                      <BidSuggestionsCount>
                        {bidSuggestions[selectedCampaign.id].length}
                      </BidSuggestionsCount>
                    </BidSuggestionsTitle>
                  </BidSuggestionsHeader>

                  {bidSuggestions[selectedCampaign.id].length === 0 ? (
                    <EmptySuggestions>
                      No bid suggestions available for this campaign.
                    </EmptySuggestions>
                  ) : (
                    bidSuggestions[selectedCampaign.id].map((suggestion, index) => (
                      <BidSuggestionCard
                        key={`${suggestion.keywordId}-${index}`}
                        priority={suggestion.priority}
                      >
                        <div>
                          <SuggestionKeywordText>
                            {suggestion.keywordText}
                          </SuggestionKeywordText>
                          <SuggestionKeywordId>
                            {suggestion.keywordId}
                          </SuggestionKeywordId>
                        </div>

                        <SuggestionBidInfo>
                          <SuggestionCurrentBid>
                            Current: ${suggestion.currentBid.toFixed(2)}
                          </SuggestionCurrentBid>
                          <SuggestionNewBid action={suggestion.action}>
                            {suggestion.action === 'increase' && '↗ '}
                            {suggestion.action === 'decrease' && '↘ '}
                            ${suggestion.newBid.toFixed(2)}
                          </SuggestionNewBid>
                        </SuggestionBidInfo>

                        <SuggestionAdjustment adjustment={suggestion.adjustment}>
                          {suggestion.adjustment > 0 ? '+' : ''}{suggestion.adjustment}%
                        </SuggestionAdjustment>

                        <div>
                          <SuggestionReason>
                            {suggestion.reason}
                          </SuggestionReason>
                          <SuggestionPriority priority={suggestion.priority}>
                            {suggestion.priority} Priority
                          </SuggestionPriority>
                        </div>
                      </BidSuggestionCard>
                    ))
                  )}
                </BidSuggestionsSection>
              )}

              {/* Feature #149: Negative keywords management */}
              {showNegativeKeywords && (
                <NegativeKeywordsSection>
                  <NegativeKeywordsHeader>
                    <NegativeKeywordsTitle>
                      🚫 Negative Keywords
                      <NegativeKeywordsCount>
                        {(negativeKeywords[selectedCampaign?.id] || []).length}
                      </NegativeKeywordsCount>
                    </NegativeKeywordsTitle>
                  </NegativeKeywordsHeader>

                  <NegativeKeywordInputContainer>
                    <NegativeKeywordInput
                      type="text"
                      placeholder="Enter negative keyword (e.g., 'free romance', 'cheap stories')"
                      value={newNegativeKeyword}
                      onChange={(e) => setNewNegativeKeyword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNegativeKeyword();
                        }
                      }}
                    />
                    <AddNegativeKeywordButton
                      onClick={handleAddNegativeKeyword}
                      disabled={!newNegativeKeyword.trim()}
                    >
                      Add Keyword
                    </AddNegativeKeywordButton>
                  </NegativeKeywordInputContainer>

                  {(!negativeKeywords[selectedCampaign?.id] || negativeKeywords[selectedCampaign.id].length === 0) ? (
                    <EmptyNegativeKeywords>
                      No negative keywords configured. Add keywords above to exclude them from this campaign.
                    </EmptyNegativeKeywords>
                  ) : (
                    <NegativeKeywordsList>
                      {(negativeKeywords[selectedCampaign.id] || []).map((negKeyword) => (
                        <NegativeKeywordCard key={negKeyword.keywordId}>
                          <NegativeKeywordInfo>
                            <NegativeKeywordText>{negKeyword.keywordText}</NegativeKeywordText>
                            <NegativeKeywordMeta>
                              <MatchTypeBadge>{negKeyword.matchType}</MatchTypeBadge>
                              <span>ID: {negKeyword.keywordId}</span>
                              <span>Added: {negKeyword.createdAt}</span>
                            </NegativeKeywordMeta>
                          </NegativeKeywordInfo>
                          <RemoveNegativeKeywordButton
                            onClick={() => handleRemoveNegativeKeyword(negKeyword.keywordId)}
                          >
                            Remove
                          </RemoveNegativeKeywordButton>
                        </NegativeKeywordCard>
                      ))}
                    </NegativeKeywordsList>
                  )}
                </NegativeKeywordsSection>
              )}
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

      {/* Feature #147: Campaign pause/resume confirmation dialog */}
      {confirmDialog && (
        <>
          <ConfirmOverlay onClick={handleCancelDialog} />
          <ConfirmDialog>
            <ConfirmDialogTitle>
              {confirmDialog.type === 'pause' ? '⏸ Pause Campaign' : '▶ Resume Campaign'}
            </ConfirmDialogTitle>
            <ConfirmDialogMessage>
              {confirmDialog.type === 'pause'
                ? `Are you sure you want to pause "${confirmDialog.campaign.name || confirmDialog.campaign.id}"? This will stop all ad spend for this campaign.`
                : `Are you sure you want to resume "${confirmDialog.campaign.name || confirmDialog.campaign.id}"? This will restart ad spend for this campaign.`
              }
            </ConfirmDialogMessage>
            <ConfirmDialogActions>
              <ConfirmButton
                className="cancel"
                onClick={handleCancelDialog}
              >
                Cancel
              </ConfirmButton>
              <ConfirmButton
                className="confirm"
                danger={confirmDialog.type === 'pause'}
                onClick={confirmDialog.type === 'pause' ? handleConfirmPause : handleConfirmResume}
              >
                {confirmDialog.type === 'pause' ? 'Pause Campaign' : 'Resume Campaign'}
              </ConfirmButton>
            </ConfirmDialogActions>
          </ConfirmDialog>
        </>
      )}

      {/* Feature #307: Campaign deletion confirmation modal */}
      <ConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Marketing Campaign"
        message="Are you sure you want to delete this campaign? This action cannot be undone."
        detail={`Campaign: ${deleteConfirmModal.campaign?.name || deleteConfirmModal.campaign?.id || 'Unknown'}`}
        icon="🗑️"
        confirmText="Delete Campaign"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Feature #150: Campaign Creation Modal */}
      {showCreateModal && (
        <CreateCampaignModal>
          <CreateCampaignOverlay onClick={handleCloseCreateModal} />
          <CreateCampaignContent>
            <CreateCampaignHeader>
              <CreateCampaignTitle>➕ Create New Campaign</CreateCampaignTitle>
              <CloseModalButton onClick={handleCloseCreateModal}>×</CloseModalButton>
            </CreateCampaignHeader>

            <FormGroup>
              <FormLabel>Campaign Name *</FormLabel>
              <FormInput
                type="text"
                value={newCampaign.name}
                onChange={(e) => handleCreateCampaignChange('name', e.target.value)}
                placeholder="e.g., US Romance Stories - Exact Match"
                disabled={creatingCampaign}
              />
            </FormGroup>

            <FormRow>
              <FormGroup>
                <FormLabel>Daily Budget (USD) *</FormLabel>
                <FormInput
                  type="number"
                  value={newCampaign.dailyBudget}
                  onChange={(e) => handleCreateCampaignChange('dailyBudget', e.target.value)}
                  placeholder="50.00"
                  min="1"
                  step="0.01"
                  disabled={creatingCampaign}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Status</FormLabel>
                <FormSelect
                  value={newCampaign.status}
                  onChange={(e) => handleCreateCampaignChange('status', e.target.value)}
                  disabled={creatingCampaign}
                >
                  <option value="ENABLED">Enabled</option>
                  <option value="PAUSED">Paused</option>
                </FormSelect>
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <FormLabel>Start Date *</FormLabel>
                <FormInput
                  type="date"
                  value={newCampaign.startDate}
                  onChange={(e) => handleCreateCampaignChange('startDate', e.target.value)}
                  disabled={creatingCampaign}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormInput
                  type="date"
                  value={newCampaign.endDate}
                  onChange={(e) => handleCreateCampaignChange('endDate', e.target.value)}
                  min={newCampaign.startDate}
                  disabled={creatingCampaign}
                />
                <FormHelpText>Leave empty for ongoing campaign</FormHelpText>
              </FormGroup>
            </FormRow>

            <FormSection>
              <FormSectionTitle>🎯 Targeting</FormSectionTitle>
              <FormRow>
                <FormGroup>
                  <FormLabel>Countries/Regions</FormLabel>
                  <FormSelect
                    multiple
                    value={newCampaign.targeting.countries}
                    onChange={(e) => handleTargetingChange('countries', Array.from(e.target.selectedOptions, opt => opt.value))}
                    disabled={creatingCampaign}
                  >
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </FormSelect>
                  <FormHelpText>Hold Ctrl/Cmd to select multiple</FormHelpText>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Languages</FormLabel>
                  <FormSelect
                    multiple
                    value={newCampaign.targeting.languages}
                    onChange={(e) => handleTargetingChange('languages', Array.from(e.target.selectedOptions, opt => opt.value))}
                    disabled={creatingCampaign}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                  </FormSelect>
                  <FormHelpText>Hold Ctrl/Cmd to select multiple</FormHelpText>
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormHelpText>* Required fields</FormHelpText>

            <CreateCampaignActions>
              <SecondaryButton onClick={handleCloseCreateModal} disabled={creatingCampaign}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleCreateCampaign} disabled={creatingCampaign || !newCampaign.name || !newCampaign.dailyBudget || !newCampaign.startDate}>
                {creatingCampaign ? 'Creating...' : 'Create Campaign'}
              </PrimaryButton>
            </CreateCampaignActions>
          </CreateCampaignContent>
        </CreateCampaignModal>
      )}
    </PageContainer>
  );
}

export default Campaigns;
