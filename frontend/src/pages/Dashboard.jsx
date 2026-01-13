import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  width: 100%;
`;

const DashboardHeader = styled.div`
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

const TimePeriodSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #16213e;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const TimeButton = styled.button`
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

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const GlobalRefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$refreshing ? '#2d3561' : '#7b2cbf'};
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: ${props => props.$refreshing ? 'not-allowed' : 'pointer'};
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${props => props.$refreshing ? 0.6 : 1};

  &:hover:not([disabled]) {
    background: #9d4edd;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const LastUpdatedDisplay = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LastUpdatedText = styled.span`
  color: #a0a0a0;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'none'};
  }
`;

const MetricLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MetricIcon = styled.span`
  font-size: 1.2rem;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const MetricChange = styled.div`
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${props => props.$positive ? '#00d26a' : props.$negative ? '#e94560' : '#a0a0a0'};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const ErrorState = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 8px;
  padding: 1rem;
  color: #e94560;
  margin-bottom: 1rem;
`;

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const PostCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: translateY(-2px);
  }
`;

const PostTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const PlatformBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$platform) {
      case 'tiktok': return '#000000';
      case 'instagram': return '#E4405F';
      case 'youtube_shorts': return '#FF0000';
      default: return '#2d3561';
    }
  }};
  color: white;
`;

const PostedTime = styled.span`
  color: #a0a0a0;
  font-size: 0.75rem;
`;

const PostMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const MetricItem = styled.div`
  text-align: center;
`;

const PostMetricValue = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.$color || '#eaeaea'};
`;

const PostMetricLabel = styled.div`
  font-size: 0.65rem;
  color: #a0a0a0;
  margin-top: 0.1rem;
`;

const EngagementRate = styled.div`
  background: ${props => props.$high ? '#00d26a20' : props.$medium ? '#ffb02020' : '#2d3561'};
  border: 1px solid ${props => props.$high ? '#00d26a' : props.$medium ? '#ffb020' : '#2d3561'};
  border-radius: 6px;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.$high ? '#00d26a' : props.$medium ? '#ffb020' : '#eaeaea'};
`;

const LastUpdated = styled.div`
  text-align: right;
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 1rem;
`;

const KeywordsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const KeywordCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: translateY(-2px);
  }
`;

const KeywordHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const KeywordName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #eaeaea;
`;

const RankBadge = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${props => {
    if (props.$rank <= 10) return '#00d26a40';
    if (props.$rank <= 50) return '#ffb02040';
    return '#2d3561';
  }};
  color: ${props => {
    if (props.$rank <= 10) return '#00d26a';
    if (props.$rank <= 50) return '#ffb020';
    return '#a0a0a0';
  }};
  border: 1px solid ${props => {
    if (props.$rank <= 10) return '#00d26a';
    if (props.$rank <= 50) return '#ffb020';
    return '#2d3561';
  }};
`;

const KeywordMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`;

const KeywordMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const CompetitionBadge = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$level) {
      case 'low': return '#00d26a20';
      case 'medium': return '#ffb02020';
      case 'high': return '#e9456020';
      default: return '#2d3561';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'low': return '#00d26a';
      case 'medium': return '#ffb020';
      case 'high': return '#e94560';
      default: return '#a0a0a0';
    }
  }};
`;

const RankChange = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => {
    if (props.$change > 0) return '#00d26a';
    if (props.$change < 0) return '#e94560';
    return '#a0a0a0';
  }};
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s;
  margin-left: 1rem;

  &:hover {
    background: #ff6b8a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EngagementSection = styled.div`
  margin-bottom: 2rem;
`;

const EngagementMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const EngagementMetricCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: translateY(-2px);
  }
`;

const EngagementMetricIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;

const EngagementMetricValue = styled.div`
  font-size: 1.75rem;
  font-weight: bold;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const EngagementMetricLabel = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const EngagementMetricChange = styled.div`
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  color: ${props => props.$positive ? '#00d26a' : props.$negative ? '#e94560' : '#a0a0a0'};
`;

const PlatformBreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`;

const PlatformCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: ${props => props.$color || '#e94560'};
    box-shadow: 0 4px 20px ${props => props.$color ? `${props.$color}20` : 'rgba(233, 69, 96, 0.1)'};
    transform: translateY(-2px);
  }
`;

const PlatformHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #2d3561;
`;

const PlatformName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #eaeaea;
`;

const PlatformEngagementRate = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${props => props.$high ? '#00d26a20' : props.$medium ? '#ffb02020' : '#2d3561'};
  color: ${props => props.$high ? '#00d26a' : props.$medium ? '#ffb020' : '#a0a0a0'};
  border: 1px solid ${props => props.$high ? '#00d26a' : props.$medium ? '#ffb020' : '#2d3561'};
`;

const PlatformMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

const PlatformMetric = styled.div`
  text-align: center;
`;

const PlatformMetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.$color || '#eaeaea'};
`;

const PlatformMetricLabel = styled.div`
  font-size: 0.7rem;
  color: #a0a0a0;
  margin-top: 0.1rem;
`;

// Budget Utilization Section Styles
const BudgetSection = styled.div`
  margin-bottom: 2rem;
`;

const BudgetContainer = styled.div`
  background: #16213e;
  border: 1px solid ${props => {
    if (props.$alertLevel === 'critical') return '#e94560';
    if (props.$alertLevel === 'warning') return '#ffb020';
    return '#2d3561';
  }};
  border-radius: 12px;
  padding: 1.5rem;
`;

const BudgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const BudgetTitle = styled.h2`
  font-size: 1.25rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AlertBadge = styled.div`
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${props => {
    if (props.$level === 'critical') return '#e9456020';
    if (props.$level === 'warning') return '#ffb02020';
    return '#00d26a20';
  }};
  color: ${props => {
    if (props.$level === 'critical') return '#e94560';
    if (props.$level === 'warning') return '#ffb020';
    return '#00d26a';
  }};
  border: 1px solid ${props => {
    if (props.$level === 'critical') return '#e94560';
    if (props.$level === 'warning') return '#ffb020';
    return '#00d26a';
  }};
`;

const BudgetProgressSection = styled.div`
  margin-bottom: 1.5rem;
`;

const BudgetLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const BudgetSpentLabel = styled.div`
  color: #eaeaea;
  font-weight: 600;
`;

const BudgetRemainingLabel = styled.div`
  color: ${props => {
    if (props.$percent >= 90) return '#e94560';
    if (props.$percent >= 70) return '#ffb020';
    return '#a0a0a0';
  }};
  font-weight: 500;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 32px;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  border: 1px solid #2d3561;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.$percent >= 90) return 'linear-gradient(90deg, #e94560 0%, #ff6b8a 100%)';
    if (props.$percent >= 70) return 'linear-gradient(90deg, #ffb020 0%, #ffc840 100%)';
    return 'linear-gradient(90deg, #00d26a 0%, #00f080 100%)';
  }};
  width: ${props => Math.min(props.$percent, 100)}%;
  transition: width 0.5s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
`;

const ProgressPercent = styled.div`
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
`;

const ThresholdMarkers = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  pointer-events: none;
`;

const ThresholdMarker = styled.div`
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  position: absolute;
  left: ${props => props.$percent}%;
`;

const ThresholdLabel = styled.div`
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: #a0a0a0;
  white-space: nowrap;
`;

const BudgetMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const BudgetMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const BudgetMetricLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const BudgetMetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #eaeaea;
`;

const BudgetMetricHighlight = styled.span`
  color: ${props => {
    if (props.$color === 'green') return '#00d26a';
    if (props.$color === 'yellow') return '#ffb020';
    if (props.$color === 'red') return '#e94560';
    return '#eaeaea';
  }};
`;

const ChannelBreakdown = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #2d3561;
`;

const ChannelBreakdownTitle = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const ChannelCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const ChannelName = styled.div`
  font-size: 0.85rem;
  color: #eaeaea;
  font-weight: 600;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChannelProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #16213e;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ChannelProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.$percent >= 90) return '#e94560';
    if (props.$percent >= 70) return '#ffb020';
    return '#00d26a';
  }};
  width: ${props => Math.min(props.$percent, 100)}%;
  transition: width 0.3s ease;
`;

const ChannelStats = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
`;

const ChannelSpent = styled.div`
  color: #eaeaea;
`;

const ChannelRemaining = styled.div`
  color: ${props => {
    if (props.$percent >= 90) return '#e94560';
    if (props.$percent >= 70) return '#ffb020';
    return '#00d26a';
  }};
`;

// Alert Notification Components
const AlertsSection = styled.div`
  margin-bottom: 2rem;
`;

const AlertsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const AlertsTitle = styled.h2`
  font-size: 1.25rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AlertCount = styled.span`
  background: #2d3561;
  color: #eaeaea;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const DismissAllButton = styled.button`
  background: transparent;
  border: 1px solid #2d3561;
  color: #a0a0a0;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover {
    background: #2d3561;
    color: #eaeaea;
  }
`;

const AlertsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const AlertCard = styled.div`
  background: ${props => {
    if (props.$severity === 'critical') return 'rgba(233, 69, 96, 0.1)';
    if (props.$severity === 'warning') return 'rgba(255, 176, 32, 0.1)';
    return 'rgba(123, 44, 191, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.$severity === 'critical') return '#e94560';
    if (props.$severity === 'warning') return '#ffb020';
    return '#7b2cbf';
  }};
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    border-color: ${props => {
      if (props.$severity === 'critical') return '#ff6b8a';
      if (props.$severity === 'warning') return '#ffc947';
      return '#9d4cff';
    }};
    box-shadow: 0 4px 12px ${props => {
      if (props.$severity === 'critical') return 'rgba(233, 69, 96, 0.2)';
      if (props.$severity === 'warning') return 'rgba(255, 176, 32, 0.2)';
      return 'rgba(123, 44, 191, 0.2)';
    }};
  }
`;

const AlertIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const AlertContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const AlertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  gap: 1rem;
`;

const AlertTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AlertSeverityBadge = styled.span`
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: ${props => {
    if (props.$severity === 'critical') return '#e94560';
    if (props.$severity === 'warning') return '#ffb020';
    return '#7b2cbf';
  }};
  color: white;
`;

const AlertTime = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  white-space: nowrap;
`;

const AlertMessage = styled.div`
  color: #eaeaea;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
`;

const AlertDetails = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
  display: ${props => props.$expanded ? 'block' : 'none'};
`;

const AlertActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const AlertActionButton = styled.button`
  background: ${props => {
    if (props.$severity === 'critical') return '#e94560';
    if (props.$severity === 'warning') return '#ffb020';
    return '#7b2cbf';
  }};
  border: none;
  color: white;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

const AlertDismissButton = styled.button`
  background: transparent;
  border: 1px solid #2d3561;
  color: #a0a0a0;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2d3561;
    color: #eaeaea;
  }
`;

const NoAlerts = styled.div`
  text-align: center;
  padding: 2rem;
  color: #a0a0a0;
  font-size: 0.9rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
`;

function Dashboard() {
  const [timePeriod, setTimePeriod] = useState('24h');
  const [metrics, setMetrics] = useState(null);
  const [postsPerformance, setPostsPerformance] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock keyword rankings data
  const mockKeywordData = [
    { keyword: 'romantic stories', ranking: 3, volume: 65000, competition: 'high', change: 2 },
    { keyword: 'spicy fiction', ranking: 7, volume: 48000, competition: 'medium', change: -1 },
    { keyword: 'romance novels', ranking: 12, volume: 82000, competition: 'high', change: 5 },
    { keyword: 'love stories', ranking: 18, volume: 54000, competition: 'medium', change: 0 },
    { keyword: 'fantasy romance', ranking: 24, volume: 36000, competition: 'low', change: 3 },
    { keyword: 'erotic fiction', ranking: 31, volume: 29000, competition: 'medium', change: -2 },
    { keyword: 'romantic audiobooks', ranking: 45, volume: 22000, competition: 'low', change: 1 }
  ];

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchMetrics(),
        fetchPostsPerformance(),
        fetchEngagementMetrics(),
        fetchBudgetUtilization(),
        fetchAlerts()
      ]);
      setLastUpdated(new Date());
    };
    loadData();
  }, [timePeriod]);

  // Update timestamp display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render by updating state
      setLastUpdated(prev => new Date(prev));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/metrics?period=${timePeriod}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load dashboard metrics. Please try again later.');
      // Set mock data for development
      setMetrics({
        mrr: { current: 425, previous: 380, change: 11.8 },
        users: { current: 1247, previous: 1102, change: 13.2 },
        spend: { current: 87, previous: 92, change: -5.4 },
        posts: { current: 23, previous: 18, change: 27.8 }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsPerformance = async () => {
    try {
      const response = await fetch('/api/dashboard/posts/performance?limit=10');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPostsPerformance(data);
    } catch (err) {
      console.error('Failed to fetch posts performance:', err);
      // Set mock data for development
      setPostsPerformance(null);
    }
  };

  const refreshPostsPerformance = async () => {
    setRefreshing(true);
    await fetchPostsPerformance();
    setRefreshing(false);
  };

  const fetchEngagementMetrics = async () => {
    try {
      const response = await fetch(`/api/dashboard/engagement?period=${timePeriod}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEngagementData(data);
    } catch (err) {
      console.error('Failed to fetch engagement metrics:', err);
      // Set mock data for development
      setEngagementData(null);
    }
  };

  const fetchBudgetUtilization = async () => {
    try {
      const response = await fetch('/api/dashboard/budget-utilization');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBudgetData(data);
    } catch (err) {
      console.error('Failed to fetch budget utilization:', err);
      // Set mock data for development
      setBudgetData(null);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/dashboard/alerts');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      // Set empty array on error
      setAlerts([]);
    }
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchPostsPerformance(),
        fetchEngagementMetrics(),
        fetchBudgetUtilization(),
        fetchAlerts()
      ]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const dismissAllAlerts = () => {
    const allAlertIds = alerts.map(alert => alert.id);
    setDismissedAlerts(prev => new Set([...prev, ...allAlertIds]));
  };

  const getAlertIcon = (type, severity) => {
    // Return emoji based on alert type
    switch (type) {
      case 'budget': return '💰';
      case 'post_failure': return '⚠️';
      case 'keyword_ranking': return '📉';
      case 'campaign_performance': return '📊';
      case 'content_approval': return '✅';
      case 'milestone': return '🎉';
      default: return severity === 'critical' ? '🚨' : '🔔';
    }
  };

  const formatAlertDetails = (alert) => {
    const details = alert.details;
    if (!details) return '';

    let detailText = '';
    switch (alert.type) {
      case 'budget':
        detailText = `Budget: $${details.currentUtilization}% utilized ($${details.spent} of $${details.monthlyBudget} spent). Remaining: $${details.remaining}. Projected: $${details.projectedSpend} (${details.projectedOver > 0 ? 'over by $' + details.projectedOver : 'on track'})`;
        break;
      case 'post_failure':
        detailText = `Error: ${details.errorMessage}. Retry ${details.retryCount}/${details.maxRetries}. Scheduled: ${new Date(details.scheduledAt).toLocaleString()}`;
        break;
      case 'keyword_ranking':
        detailText = `Keyword: "${details.keyword}" | Previous: #${details.previousRanking} → Current: #${details.currentRanking} (${details.change > 0 ? '+' : ''}${details.change}) | Volume: ${details.volume.toLocaleString()} | Competition: ${details.competition}`;
        break;
      case 'campaign_performance':
        detailText = `Campaign: "${details.campaignName}" | ROI: ${details.roi}% (target: ${details.roiTarget}%) | Spend: $${details.spend} | Revenue: $${details.revenue}`;
        break;
      case 'content_approval':
        detailText = `${details.pendingCount} posts pending approval. First scheduled: ${new Date(details.firstScheduledAt).toLocaleString()}`;
        break;
      case 'milestone':
        detailText = `${details.metric}: $${details.current} (target: $${details.milestone}) - ${details.percentage.toFixed(1)}% achieved!`;
        break;
      default:
        detailText = JSON.stringify(details, null, 2);
    }
    return detailText;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatCompactNumber = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getEngagementLevel = (rate) => {
    if (rate >= 12) return 'high';
    if (rate >= 8) return 'medium';
    return 'low';
  };

  const renderMetricCard = (key, label, icon, prefix = '', suffix = '', onClick = null) => {
    if (!metrics || !metrics[key]) return null;

    const metric = metrics[key];
    const isPositive = metric.change > 0;
    const isNegative = metric.change < 0;

    return (
      <MetricCard
        key={key}
        $clickable={!!onClick}
        onClick={onClick}
      >
        <MetricLabel>
          <MetricIcon>{icon}</MetricIcon>
          {label}
        </MetricLabel>
        <MetricValue>
          {prefix}{formatNumber(metric.current)}{suffix}
        </MetricValue>
        <MetricChange $positive={isPositive} $negative={isNegative}>
          {isPositive && '↑'}
          {isNegative && '↓'}
          {!isPositive && !isNegative && '→'}
          {Math.abs(metric.change).toFixed(1)}% vs {timePeriod}
        </MetricChange>
      </MetricCard>
    );
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          Loading dashboard metrics...
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Tactical Dashboard</Title>
        <HeaderControls>
          <TimePeriodSelector>
            <TimeButton
              $active={timePeriod === '24h'}
              onClick={() => setTimePeriod('24h')}
            >
              24h
            </TimeButton>
            <TimeButton
              $active={timePeriod === '7d'}
              onClick={() => setTimePeriod('7d')}
            >
              7d
            </TimeButton>
            <TimeButton
              $active={timePeriod === '30d'}
              onClick={() => setTimePeriod('30d')}
            >
              30d
            </TimeButton>
          </TimePeriodSelector>

          <LastUpdatedDisplay>
            🕒 <LastUpdatedText>Updated {getTimeAgo(lastUpdated)}</LastUpdatedText>
          </LastUpdatedDisplay>

          <GlobalRefreshButton
            onClick={refreshAllData}
            disabled={refreshing}
            $refreshing={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh All'}
          </GlobalRefreshButton>
        </HeaderControls>
      </DashboardHeader>

      {error && (
        <ErrorState>
          {error}
        </ErrorState>
      )}

      {/* Alert Notifications Section */}
      <AlertsSection>
        <AlertsHeader>
          <AlertsTitle>
            🔔 Alert Notifications
            {alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
              <AlertCount>{alerts.filter(a => !dismissedAlerts.has(a.id)).length}</AlertCount>
            )}
          </AlertsTitle>
          {alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
            <DismissAllButton onClick={dismissAllAlerts}>
              Dismiss All
            </DismissAllButton>
          )}
        </AlertsHeader>

        {alerts.filter(alert => !dismissedAlerts.has(alert.id)).length === 0 ? (
          <NoAlerts>
            ✅ No active alerts. All systems operating normally.
          </NoAlerts>
        ) : (
          <AlertsList>
            {alerts
              .filter(alert => !dismissedAlerts.has(alert.id))
              .sort((a, b) => {
                // Sort by severity: critical first, then warning, then info
                const severityOrder = { critical: 0, warning: 1, info: 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
              })
              .map((alert) => (
                <AlertCard
                  key={alert.id}
                  $severity={alert.severity}
                  onClick={() => {
                    if (alert.action?.link) {
                      window.location.href = alert.action.link;
                    }
                  }}
                >
                  <AlertIcon>{getAlertIcon(alert.type, alert.severity)}</AlertIcon>
                  <AlertContent>
                    <AlertHeader>
                      <AlertTitle>
                        {alert.title}
                        <AlertSeverityBadge $severity={alert.severity}>
                          {alert.severity}
                        </AlertSeverityBadge>
                      </AlertTitle>
                      <AlertTime>{getTimeAgo(alert.timestamp)}</AlertTime>
                    </AlertHeader>
                    <AlertMessage>{alert.message}</AlertMessage>
                    <AlertDetails $expanded={true}>
                      {formatAlertDetails(alert)}
                    </AlertDetails>
                    <AlertActions>
                      {alert.action && (
                        <AlertActionButton
                          $severity={alert.severity}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = alert.action.link;
                          }}
                        >
                          {alert.action.label}
                        </AlertActionButton>
                      )}
                      <AlertDismissButton
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                      >
                        Dismiss
                      </AlertDismissButton>
                    </AlertActions>
                  </AlertContent>
                </AlertCard>
              ))}
          </AlertsList>
        )}
      </AlertsSection>

      <MetricsGrid>
        {renderMetricCard('mrr', 'Monthly Recurring Revenue', '💰', '$', '', () => window.location.href = '/dashboard/strategic')}
        {renderMetricCard('subscribers', 'Active Subscribers', '💎', '', '', () => window.location.href = '/dashboard/subscribers')}
        {renderMetricCard('users', 'Active Users', '👥')}
        {renderMetricCard('spend', 'Ad Spend', '📊', '$')}
        {renderMetricCard('posts', 'Content Posted', '📱')}
      </MetricsGrid>

      {budgetData && (
        <BudgetSection>
          <BudgetContainer $alertLevel={budgetData.alert.level}>
            <BudgetHeader>
              <BudgetTitle>
                💰 Budget Utilization
              </BudgetTitle>
              {budgetData.alert.message && (
                <AlertBadge $level={budgetData.alert.level}>
                  {budgetData.alert.level === 'critical' && '⚠️ '}
                  {budgetData.alert.level === 'warning' && '⚡ '}
                  {budgetData.alert.message}
                </AlertBadge>
              )}
            </BudgetHeader>

            <BudgetProgressSection>
              <BudgetLabels>
                <BudgetSpentLabel>
                  {formatCurrency(budgetData.budget.spent)} of {formatCurrency(budgetData.budget.monthly)} spent
                </BudgetSpentLabel>
                <BudgetRemainingLabel $percent={budgetData.utilization.percent}>
                  {formatCurrency(budgetData.budget.remaining)} remaining
                </BudgetRemainingLabel>
              </BudgetLabels>

              <ProgressBarContainer>
                <ProgressBarFill $percent={budgetData.utilization.percent}>
                  {budgetData.utilization.percent >= 15 && (
                    <ProgressPercent>{budgetData.utilization.percent}%</ProgressPercent>
                  )}
                </ProgressBarFill>
                <ThresholdMarkers>
                  <ThresholdMarker $percent="70">
                    <ThresholdLabel>70%</ThresholdLabel>
                  </ThresholdMarker>
                  <ThresholdMarker $percent="90">
                    <ThresholdLabel>90%</ThresholdLabel>
                  </ThresholdMarker>
                </ThresholdMarkers>
              </ProgressBarContainer>
            </BudgetProgressSection>

            <BudgetMetrics>
              <BudgetMetric>
                <BudgetMetricLabel>Monthly Budget</BudgetMetricLabel>
                <BudgetMetricValue>{formatCurrency(budgetData.budget.monthly)}</BudgetMetricValue>
              </BudgetMetric>
              <BudgetMetric>
                <BudgetMetricLabel>Projected Spend</BudgetMetricLabel>
                <BudgetMetricValue>
                  {budgetData.budget.projected > budgetData.budget.monthly ? (
                    <BudgetMetricHighlight $color="red">{formatCurrency(budgetData.budget.projected)}</BudgetMetricHighlight>
                  ) : (
                    <BudgetMetricHighlight $color="green">{formatCurrency(budgetData.budget.projected)}</BudgetMetricHighlight>
                  )}
                </BudgetMetricValue>
              </BudgetMetric>
              <BudgetMetric>
                <BudgetMetricLabel>Daily Spend Rate</BudgetMetricLabel>
                <BudgetMetricValue>{formatCurrency(budgetData.pacing.currentDailySpend)}/day</BudgetMetricValue>
              </BudgetMetric>
              <BudgetMetric>
                <BudgetMetricLabel>Budget Health</BudgetMetricLabel>
                <BudgetMetricValue>
                  {budgetData.pacing.budgetHealth === 'on-track' ? (
                    <BudgetMetricHighlight $color="green">On Track ✓</BudgetMetricHighlight>
                  ) : (
                    <BudgetMetricHighlight $color="yellow">Overspending</BudgetMetricHighlight>
                  )}
                </BudgetMetricValue>
              </BudgetMetric>
            </BudgetMetrics>

            <ChannelBreakdown>
              <ChannelBreakdownTitle>Spend by Channel</ChannelBreakdownTitle>
              <ChannelGrid>
                {Object.entries(budgetData.breakdown).map(([channelId, channelData]) => {
                  const channelNames = {
                    apple_search_ads: '🍎 Apple Search Ads',
                    tiktok_ads: '🎵 TikTok Ads',
                    instagram_ads: '📸 Instagram Ads'
                  };

                  return (
                    <ChannelCard key={channelId}>
                      <ChannelName>
                        {channelNames[channelId] || channelId}
                      </ChannelName>
                      <ChannelProgressBar>
                        <ChannelProgressFill $percent={channelData.percent} />
                      </ChannelProgressBar>
                      <ChannelStats>
                        <ChannelSpent>{formatCurrency(channelData.spent)} spent</ChannelSpent>
                        <ChannelRemaining>{formatCurrency(channelData.budget - channelData.spent)} left</ChannelRemaining>
                      </ChannelStats>
                    </ChannelCard>
                  );
                })}
              </ChannelGrid>
            </ChannelBreakdown>
          </BudgetContainer>
        </BudgetSection>
      )}

      <DashboardHeader>
        <Title>App Store Keyword Rankings</Title>
      </DashboardHeader>

      <KeywordsGrid>
        {mockKeywordData.map((keyword) => (
          <KeywordCard key={keyword.keyword} onClick={() => window.location.href = '/aso'}>
            <KeywordHeader>
              <KeywordName>{keyword.keyword}</KeywordName>
              <RankBadge $rank={keyword.ranking}>
                #{keyword.ranking}
              </RankBadge>
            </KeywordHeader>
            <KeywordMeta>
              <KeywordMetric>
                <MetricLabel>Volume</MetricLabel>
                <MetricValue>{formatNumber(keyword.volume)}</MetricValue>
              </KeywordMetric>
              <KeywordMetric>
                <MetricLabel>Competition</MetricLabel>
                <CompetitionBadge $level={keyword.competition}>
                  {keyword.competition}
                </CompetitionBadge>
              </KeywordMetric>
              <RankChange $change={keyword.change}>
                {keyword.change > 0 ? `↑${keyword.change}` : keyword.change < 0 ? `↓${Math.abs(keyword.change)}` : '→'}
              </RankChange>
            </KeywordMeta>
          </KeywordCard>
        ))}
      </KeywordsGrid>

      <DashboardHeader>
        <Title>Engagement Metrics</Title>
      </DashboardHeader>

      {engagementData && (
        <EngagementSection>
          <EngagementMetricsGrid>
            <EngagementMetricCard>
              <EngagementMetricIcon>👁️</EngagementMetricIcon>
              <EngagementMetricValue>{formatCompactNumber(engagementData.aggregate.totalViews)}</EngagementMetricValue>
              <EngagementMetricLabel>Total Views</EngagementMetricLabel>
              <EngagementMetricChange
                $positive={engagementData.aggregate.changes.views > 0}
                $negative={engagementData.aggregate.changes.views < 0}
              >
                {engagementData.aggregate.changes.views > 0 && '↑'}
                {engagementData.aggregate.changes.views < 0 && '↓'}
                {Math.abs(engagementData.aggregate.changes.views)}% vs prev
              </EngagementMetricChange>
            </EngagementMetricCard>

            <EngagementMetricCard>
              <EngagementMetricIcon>❤️</EngagementMetricIcon>
              <EngagementMetricValue>{formatCompactNumber(engagementData.aggregate.totalLikes)}</EngagementMetricValue>
              <EngagementMetricLabel>Total Likes</EngagementMetricLabel>
              <EngagementMetricChange
                $positive={engagementData.aggregate.changes.likes > 0}
                $negative={engagementData.aggregate.changes.likes < 0}
              >
                {engagementData.aggregate.changes.likes > 0 && '↑'}
                {engagementData.aggregate.changes.likes < 0 && '↓'}
                {Math.abs(engagementData.aggregate.changes.likes)}% vs prev
              </EngagementMetricChange>
            </EngagementMetricCard>

            <EngagementMetricCard>
              <EngagementMetricIcon>💬</EngagementMetricIcon>
              <EngagementMetricValue>{formatCompactNumber(engagementData.aggregate.totalComments)}</EngagementMetricValue>
              <EngagementMetricLabel>Total Comments</EngagementMetricLabel>
              <EngagementMetricChange
                $positive={engagementData.aggregate.changes.comments > 0}
                $negative={engagementData.aggregate.changes.comments < 0}
              >
                {engagementData.aggregate.changes.comments > 0 && '↑'}
                {engagementData.aggregate.changes.comments < 0 && '↓'}
                {Math.abs(engagementData.aggregate.changes.comments)}% vs prev
              </EngagementMetricChange>
            </EngagementMetricCard>

            <EngagementMetricCard>
              <EngagementMetricIcon>🔄</EngagementMetricIcon>
              <EngagementMetricValue>{formatCompactNumber(engagementData.aggregate.totalShares)}</EngagementMetricValue>
              <EngagementMetricLabel>Total Shares</EngagementMetricLabel>
              <EngagementMetricChange
                $positive={engagementData.aggregate.changes.shares > 0}
                $negative={engagementData.aggregate.changes.shares < 0}
              >
                {engagementData.aggregate.changes.shares > 0 && '↑'}
                {engagementData.aggregate.changes.shares < 0 && '↓'}
                {Math.abs(engagementData.aggregate.changes.shares)}% vs prev
              </EngagementMetricChange>
            </EngagementMetricCard>

            <EngagementMetricCard>
              <EngagementMetricIcon>📊</EngagementMetricIcon>
              <EngagementMetricValue>{engagementData.aggregate.avgEngagementRate}%</EngagementMetricValue>
              <EngagementMetricLabel>Avg Engagement Rate</EngagementMetricLabel>
              <EngagementMetricChange
                $positive={engagementData.aggregate.changes.engagementRate > 0}
                $negative={engagementData.aggregate.changes.engagementRate < 0}
              >
                {engagementData.aggregate.changes.engagementRate > 0 && '↑'}
                {engagementData.aggregate.changes.engagementRate < 0 && '↓'}
                {Math.abs(engagementData.aggregate.changes.engagementRate)}% pts vs prev
              </EngagementMetricChange>
            </EngagementMetricCard>
          </EngagementMetricsGrid>

          <PlatformBreakdownGrid>
            {engagementData.platforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                $color={platform.color}
                onClick={() => window.location.href = `/content?platform=${platform.id}`}
              >
                <PlatformHeader>
                  <PlatformName>
                    {platform.icon} {platform.name}
                  </PlatformName>
                  <PlatformEngagementRate
                    $high={platform.metrics.engagementRate >= 12}
                    $medium={platform.metrics.engagementRate >= 8 && platform.metrics.engagementRate < 12}
                  >
                    {platform.metrics.engagementRate}%
                  </PlatformEngagementRate>
                </PlatformHeader>

                <PlatformMetrics>
                  <PlatformMetric>
                    <PlatformMetricValue $color="#7b2cbf">{formatCompactNumber(platform.metrics.views)}</PlatformMetricValue>
                    <PlatformMetricLabel>Views</PlatformMetricLabel>
                  </PlatformMetric>

                  <PlatformMetric>
                    <PlatformMetricValue $color="#e94560">{formatCompactNumber(platform.metrics.likes)}</PlatformMetricValue>
                    <PlatformMetricLabel>Likes</PlatformMetricLabel>
                  </PlatformMetric>

                  <PlatformMetric>
                    <PlatformMetricValue $color="#00d26a">{formatCompactNumber(platform.metrics.comments)}</PlatformMetricValue>
                    <PlatformMetricLabel>Comments</PlatformMetricLabel>
                  </PlatformMetric>

                  <PlatformMetric>
                    <PlatformMetricValue $color="#ffb020">{formatCompactNumber(platform.metrics.shares)}</PlatformMetricValue>
                    <PlatformMetricLabel>Shares</PlatformMetricLabel>
                  </PlatformMetric>
                </PlatformMetrics>
              </PlatformCard>
            ))}
          </PlatformBreakdownGrid>
        </EngagementSection>
      )}

      <DashboardHeader>
        <Title>Recent Post Performance</Title>
        <RefreshButton onClick={refreshPostsPerformance} disabled={refreshing}>
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </RefreshButton>
      </DashboardHeader>

      {postsPerformance && postsPerformance.posts.length > 0 ? (
        <>
          <PostsGrid>
            {postsPerformance.posts.map((post) => (
              <PostCard key={post.id}>
                <PostTitle>{post.title}</PostTitle>
                <PostMeta>
                  <PlatformBadge $platform={post.platform}>
                    {post.platform === 'youtube_shorts' ? 'YouTube' : post.platform}
                  </PlatformBadge>
                  <PostedTime>{getTimeAgo(post.postedAt)}</PostedTime>
                </PostMeta>
                <PostMetricsGrid>
                  <MetricItem>
                    <PostMetricValue $color="#7b2cbf">{formatCompactNumber(post.performanceMetrics.views)}</PostMetricValue>
                    <PostMetricLabel>Views</PostMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <PostMetricValue $color="#e94560">{formatCompactNumber(post.performanceMetrics.likes)}</PostMetricValue>
                    <PostMetricLabel>Likes</PostMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <PostMetricValue $color="#00d26a">{formatCompactNumber(post.performanceMetrics.comments)}</PostMetricValue>
                    <PostMetricLabel>Comments</PostMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <PostMetricValue $color="#ffb020">{formatCompactNumber(post.performanceMetrics.shares)}</PostMetricValue>
                    <PostMetricLabel>Shares</PostMetricLabel>
                  </MetricItem>
                </PostMetricsGrid>
                <EngagementRate
                  $high={getEngagementLevel(post.performanceMetrics.engagementRate) === 'high'}
                  $medium={getEngagementLevel(post.performanceMetrics.engagementRate) === 'medium'}
                >
                  {post.performanceMetrics.engagementRate}% Engagement
                </EngagementRate>
              </PostCard>
            ))}
          </PostsGrid>
          <LastUpdated>
            Last updated: {new Date(postsPerformance.lastUpdated).toLocaleTimeString()} |
            Avg engagement: {postsPerformance.summary.avgEngagementRate}%
          </LastUpdated>
        </>
      ) : (
        <MetricCard>
          <MetricLabel>
            <MetricIcon>📱</MetricIcon>
            Post Performance
          </MetricLabel>
          <div style={{ color: '#a0a0a0', marginTop: '1rem' }}>
            No posts performance data available. Posts will appear here once content is published.
          </div>
        </MetricCard>
      )}
    </DashboardContainer>
  );
}

export default Dashboard;
