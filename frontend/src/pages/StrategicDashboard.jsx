import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

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

const DateRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #16213e;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const DateButton = styled.button`
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

const ChartContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const ChartTitle = styled.h2`
  font-size: 1.25rem;
  color: #eaeaea;
  margin: 0 0 1rem 0;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const MetricLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.$positive ? '#00d26a' : props.$positive === false ? '#e94560' : '#eaeaea'};
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

const ROIChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`;

const ROIChannelCard = styled.div`
  background: #16213e;
  border: 1px solid ${props => props.$color || '#2d3561'};
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: ${props => props.$color || '#e94560'};
    box-shadow: 0 4px 20px ${props => props.$color ? props.$color + '20' : 'rgba(233, 69, 96, 0.2)'};
    transform: translateY(-2px);
  }
`;

const ROIChannelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ROIChannelName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #eaeaea;
  font-size: 1rem;
`;

const ROIChannelIcon = styled.span`
  font-size: 1.25rem;
`;

const ROIChannelBadge = styled.div`
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: ${props => props.$category === 'paid' ? '#e9456020' : '#00d26a20'};
  color: ${props => props.$category === 'paid' ? '#e94560' : '#00d26a'};
  font-weight: 500;
  text-transform: uppercase;
`;

const ROIMetric = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const ROIMetricLabel = styled.div`
  color: #a0a0a0;
`;

const ROIMetricValue = styled.div`
  font-weight: 600;
  color: ${props => props.$positive ? '#00d26a' : props.$positive === false ? '#e94560' : '#eaeaea'};
`;

const ROIMainValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.$positive ? '#00d26a' : props.$positive === false ? '#e94560' : props.$color || '#eaeaea'};
  text-align: center;
  margin: 1rem 0;
`;

const ROIMainLabel = styled.div`
  text-align: center;
  color: #a0a0a0;
  font-size: 0.85rem;
`;

// Conversion Funnel Components
const FunnelContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const FunnelStage = styled.div`
  background: ${props => props.$active ? '#1a1a2e' : '#16213e'};
  border: 1px solid ${props => props.$active ? '#e94560' : '#2d3561'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: ${props => props.$color || '#e94560'};
    box-shadow: 0 4px 20px ${props => props.$color ? props.$color + '20' : 'rgba(233, 69, 96, 0.2)'};
    transform: translateX(4px);
  }

  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: ${props => props.$width}%;
    background: ${props => props.$color || '#e94560'};
    border-radius: 0 4px 4px 0;
  }
`;

const FunnelStageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-left: 0.75rem;
`;

const FunnelStageName = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FunnelStageTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  font-size: 1rem;
`;

const FunnelStageDescription = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const FunnelStageMetrics = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FunnelStageCount = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.$color || '#e94560'};
`;

const FunnelStageConversion = styled.div`
  text-align: right;
`;

const FunnelConversionRate = styled.div`
  font-weight: 600;
  color: ${props => props.$positive ? '#00d26a' : props.$positive === false ? '#e94560' : '#a0a0a0'};
  font-size: 0.9rem;
`;

const FunnelDropoffInfo = styled.div`
  font-size: 0.75rem;
  color: #f8312f;
`;

const FunnelDetailsPanel = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const FunnelDetailsTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #eaeaea;
  font-size: 1rem;
`;

const FunnelDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const FunnelDetailItem = styled.div`
  background: #16213e;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #2d3561;
`;

const FunnelDetailLabel = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const FunnelDetailValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #eaeaea;
`;

const FunnelLegend = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const FunnelLegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FunnelLegendColor = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${props => props.$color};
`;

// ASO Competitiveness Analysis Styled Components
const OpportunityAlert = styled.div`
  background: linear-gradient(135deg, rgba(0, 210, 106, 0.1) 0%, rgba(0, 210, 106, 0.05) 100%);
  border: 1px solid rgba(0, 210, 106, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const OpportunityIcon = styled.div`
  font-size: 1.5rem;
`;

const OpportunityText = styled.div`
  color: #eaeaea;
  font-size: 0.95rem;
`;

const OpportunityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const OpportunityCard = styled.div`
  background: rgba(0, 210, 106, 0.05);
  border: 1px solid rgba(0, 210, 106, 0.2);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 210, 106, 0.1);
    border-color: rgba(0, 210, 106, 0.4);
    transform: translateY(-2px);
  }
`;

const OpportunityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const OpportunityKeyword = styled.div`
  font-weight: 600;
  color: #eaeaea;
  font-size: 1rem;
`;

const OpportunityScore = styled.div`
  background: #00d26a;
  color: #000;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.9rem;
`;

const OpportunityMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
`;

const OpportunityMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const OpportunityMetricLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OpportunityMetricValue = styled.div`
  font-size: 0.9rem;
  color: ${props => props.$positive ? '#00d26a' : '#eaeaea'};
  font-weight: 500;
`;

const CompetitivenessBreakdown = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const CompetitionLevel = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;

  &:hover {
    border-color: ${props => props.$color};
  }
`;

const CompetitionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const CompetitionBadge = styled.div`
  background: ${props => props.$color};
  color: #000;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
`;

const CompetitionCount = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const CompetitionStats = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2d3561;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
`;

const StatValue = styled.div`
  font-size: 1rem;
  color: #eaeaea;
  font-weight: 600;
`;

const KeywordList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const KeywordItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #16213e;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    transform: translateX(4px);
  }
`;

const KeywordName = styled.div`
  color: #eaeaea;
  font-size: 0.9rem;
`;

const KeywordDifficulty = styled.div`
  font-size: 0.85rem;
  color: ${props => {
    if (props.$difficulty < 40) return '#00d26a';
    if (props.$difficulty < 60) return '#ffc107';
    return '#f94144';
  }};
  font-weight: 600;
`;

const MoreKeywords = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  text-align: center;
  padding: 0.5rem;
  font-style: italic;
`;

// ASO Keyword Suggestions Styled Components
const SuggestionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SuggestionsTitle = styled.h3`
  font-size: 1.1rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SuggestionsCount = styled.span`
  background: #7b2cbf;
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
`;

const SuggestionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SuggestionCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #7b2cbf;
    box-shadow: 0 4px 20px rgba(123, 44, 191, 0.15);
    transform: translateY(-2px);
  }
`;

const SuggestionKeyword = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const SuggestionCategory = styled.div`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
  background: ${props => {
    switch (props.$category) {
      case 'romance': return 'rgba(233, 69, 96, 0.2)';
      case 'stories': return 'rgba(123, 44, 191, 0.2)';
      case 'spicy': return 'rgba(255, 107, 157, 0.2)';
      case 'games': return 'rgba(0, 210, 106, 0.2)';
      default: return 'rgba(160, 160, 160, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$category) {
      case 'romance': return '#e94560';
      case 'stories': return '#7b2cbf';
      case 'spicy': return '#ff6b9d';
      case 'games': return '#00d26a';
      default: return '#a0a0a0';
    }
  }};
`;

const SuggestionReason = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 1rem;
  line-height: 1.4;
`;

const SuggestionMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const SuggestionMetric = styled.div`
  text-align: center;
  padding: 0.5rem;
  background: #16213e;
  border-radius: 6px;
`;

const SuggestionMetricLabel = styled.div`
  font-size: 0.7rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
`;

const SuggestionMetricValue = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.$positive ? '#00d26a' : props.$negative ? '#f94144' : '#eaeaea'};
`;

const AddKeywordButton = styled.button`
  background: linear-gradient(135deg, #7b2cbf 0%, #e94560 100%);
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  margin-top: 0.75rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const NoSuggestions = styled.div`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
  font-size: 0.95rem;
`;

// App Metadata Styled Components
const MetadataHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const MetadataTitle = styled.h3`
  font-size: 1.25rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MetadataActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const EditButton = styled.button`
  padding: 0.5rem 1rem;
  background: #2d3561;
  border: 1px solid #e94560;
  border-radius: 6px;
  color: #e94560;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SaveButton = styled.button`
  padding: 0.5rem 1rem;
  background: #00d26a;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: #00b558;
  }
`;

const CancelButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #a0a0a0;
  border-radius: 6px;
  color: #a0a0a0;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: #2d3561;
    color: #eaeaea;
  }
`;

const MetadataSection = styled.div`
  margin-bottom: 2rem;
`;

const MetadataLabel = styled.label`
  display: block;
  font-size: 0.9rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const MetadataValue = styled.div`
  padding: 1rem;
  background: #0f3460;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;

  &:focus-within {
    border-color: #e94560;
  }
`;

const MetadataInput = styled.textarea`
  width: 100%;
  background: transparent;
  border: none;
  color: #eaeaea;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #666;
  }
`;

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetadataField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SmallMetadataInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: #0f3460;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.9rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &::placeholder {
    color: #666;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const UrlList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UrlItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #0f3460;
  border: 1px solid #2d3561;
  border-radius: 6px;
  font-size: 0.85rem;
`;

const UrlLabel = styled.span`
  color: #a0a0a0;
  min-width: 100px;
`;

const UrlValue = styled.a`
  color: #e94560;
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
`;

// Description Optimization Styled Components
const DescriptionOptimizationContainer = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const DescriptionOptimizationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const DescriptionOptimizationTitle = styled.h3`
  font-size: 1.5rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DescriptionAnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DescriptionMetricCard = styled.div`
  background: #0f3460;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #2d3561;
`;

const DescriptionMetricLabel = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const DescriptionMetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #e94560;
`;

const DescriptionCurrentPreview = styled.div`
  background: #0f3460;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid #2d3561;
`;

const DescriptionSectionTitle = styled.h4`
  font-size: 1.1rem;
  color: #eaeaea;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DescriptionText = styled.div`
  background: #1a1a2e;
  border-radius: 6px;
  padding: 1rem;
  color: #e0e0e0;
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
`;

const DescriptionSuggestionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DescriptionSuggestionCard = styled.div`
  background: #0f3460;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #2d3561;
  border-left: 4px solid ${props => {
    switch(props.$priority) {
      case 'HIGH': return '#e94560';
      case 'MEDIUM': return '#f39c12';
      case 'LOW': return '#3498db';
      default: return '#2d3561';
    }
  }};
`;

const DescriptionSuggestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const DescriptionSuggestionCategory = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const DescriptionSuggestionPriority = styled.span`
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  background: ${props => {
    switch(props.$priority) {
      case 'HIGH': return '#e94560';
      case 'MEDIUM': return '#f39c12';
      case 'LOW': return '#3498db';
      default: return '#2d3561';
    }
  }};
  color: #fff;
`;

const DescriptionSuggestionText = styled.div`
  color: #e0e0e0;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

const DescriptionSuggestionExample = styled.div`
  background: #1a1a2e;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #a0a0a0;
  font-style: italic;
  border-left: 2px solid #e94560;
`;

const DescriptionSuggestionDetails = styled.div`
  background: #1a1a2e;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-top: 0.5rem;
`;

const OptimizedDescriptionSection = styled.div`
  background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
  border-radius: 8px;
  padding: 1.5rem;
  border: 2px solid #e94560;
`;

const OptimizedDescriptionText = styled.div`
  background: #1a1a2e;
  border-radius: 6px;
  padding: 1rem;
  color: #e0e0e0;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 1rem;
  max-height: 250px;
  overflow-y: auto;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const ApplyButton = styled.button`
  background: #e94560;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #4a4a4a;
    cursor: not-allowed;
    transform: none;
  }
`;

const DismissButton = styled.button`
  background: transparent;
  color: #a0a0a0;
  border: 1px solid #2d3561;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2d3561;
    color: #eaeaea;
  }
`;

const KeywordOpportunitiesSection = styled.div`
  background: #0f3460;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid #2d3561;
`;

const KeywordOpportunityItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #2d3561;

  &:last-child {
    border-bottom: none;
  }
`;

const DescriptionKeywordName = styled.div`
  font-weight: 600;
  color: #eaeaea;
`;

const DescriptionKeywordReason = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  flex: 1;
  margin-left: 1rem;
`;

const DescriptionKeywordPriority = styled.div`
  font-size: 0.875rem;
  color: #e94560;
  font-weight: 600;
`;

// Icon A/B Testing Styled Components
const IconABTestingContainer = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const IconABTestingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const IconABTestingTitle = styled.h3`
  font-size: 1.5rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CurrentIconSection = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #0f3460;
  border-radius: 8px;
`;

const IconPreview = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #2d3561;
  background: #1a1a2e;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const IconAnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const IconMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const IconMetricLabel = styled.span`
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const IconMetricValue = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => {
    const value = props.$value;
    if (value >= 80) return '#00d26a';
    if (value >= 60) return '#ffb020';
    return '#e94560';
  }};
`;

const IconDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const IconDetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const IconDetailLabel = styled.span`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const IconDetailValue = styled.span`
  font-size: 0.95rem;
  color: #eaeaea;
`;

const StrengthsWeaknessesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StrengthsWeaknessesBox = styled.div`
  background: #0f3460;
  padding: 1rem;
  border-radius: 8px;
`;

const StrengthsWeaknessesTitle = styled.h4`
  font-size: 1rem;
  color: ${props => props.$type === 'strengths' ? '#00d26a' : '#e94560'};
  margin: 0 0 0.75rem 0;
`;

const StrengthsWeaknessesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StrengthsWeaknessesItem = styled.li`
  font-size: 0.9rem;
  color: #eaeaea;
  padding: 0.5rem 0;
  border-bottom: 1px solid #2d3561;

  &:last-child {
    border-bottom: none;
  }

  &::before {
    content: ${props => props.$type === 'strengths' ? '"✓ "' : '"⚠ "'};
    color: ${props => props.$type === 'strengths' ? '#00d26a' : '#e94560'};
    margin-right: 0.5rem;
  }
`;

const CompetitorAnalysisSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionHeading = styled.h4`
  font-size: 1.1rem;
  color: #eaeaea;
  margin: 0 0 1rem 0;
`;

const CompetitorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CompetitorCard = styled.div`
  background: #0f3460;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const CompetitorName = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const CompetitorDetail = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const MarketTrendsBox = styled.div`
  background: #0f3460;
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid #e94560;
`;

const TrendItem = styled.div`
  font-size: 0.9rem;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const TrendLabel = styled.span`
  color: #a0a0a0;
`;

const VariationsSection = styled.div`
  margin-bottom: 2rem;
`;

const VariationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const VariationCard = styled.div`
  background: #0f3460;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid ${props => {
    switch (props.$priority) {
      case 'high': return '#00d26a';
      case 'medium': return '#ffb020';
      case 'low': return '#e94560';
      default: return '#2d3561';
    }
  }};
`;

const VariationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
`;

const VariationName = styled.h5`
  font-size: 1.1rem;
  color: #eaeaea;
  margin: 0;
`;

const PriorityBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$priority) {
      case 'high': return '#00d26a';
      case 'medium': return '#ffb020';
      case 'low': return '#e94560';
      default: return '#2d3561';
    }
  }};
  color: #1a1a2e;
`;

const ConfidenceBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #2d3561;
  color: #a0a0a0;
`;

const VariationDescription = styled.p`
  font-size: 0.9rem;
  color: #eaeaea;
  margin: 0 0 1rem 0;
  line-height: 1.5;
`;

const VariationHypothesis = styled.div`
  background: #1a1a2e;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const HypothesisLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const HypothesisText = styled.div`
  font-size: 0.85rem;
  color: #00d26a;
  font-style: italic;
`;

const ExpectedImprovement = styled.div`
  font-size: 0.9rem;
  color: #00d26a;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const ExperimentStructureBox = styled.div`
  background: #0f3460;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #e94560;
`;

const ExperimentStructureTitle = styled.h4`
  font-size: 1rem;
  color: #e94560;
  margin: 0 0 1rem 0;
`;

const ExperimentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ExperimentItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ExperimentLabel = styled.span`
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const ExperimentValue = styled.span`
  font-size: 0.95rem;
  color: #eaeaea;
  font-weight: 600;
`;

const SuccessCriteriaBox = styled.div`
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
`;

const SuccessCriteriaTitle = styled.div`
  font-size: 0.9rem;
  color: #00d26a;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const SuccessCriteriaList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SuccessCriteriaItem = styled.li`
  font-size: 0.85rem;
  color: #eaeaea;
  padding: 0.25rem 0;

  &::before {
    content: "✓ ";
    color: #00d26a;
    margin-right: 0.5rem;
  }
`;

// Screenshot Analysis Styled Components
const ScreenshotAnalysisHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ScreenshotAnalysisTitle = styled.h3`
  font-size: 1.15rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ScreenshotScore = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: ${props => {
    const score = props.$score;
    if (score >= 80) return 'rgba(0, 210, 106, 0.1)';
    if (score >= 60) return 'rgba(255, 176, 32, 0.1)';
    return 'rgba(248, 49, 47, 0.1)';
  }};
  border: 1px solid ${props => {
    const score = props.$score;
    if (score >= 80) return '#00d26a';
    if (score >= 60) return '#ffb020';
    return '#f8312f';
  }};
  border-radius: 8px;
`;

const ScreenshotScoreValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => {
    const score = props.$score;
    if (score >= 80) return '#00d26a';
    if (score >= 60) return '#ffb020';
    return '#f8312f';
  }};
`;

const ScreenshotScoreLabel = styled.span`
  font-size: 0.875rem;
  color: #a0a0a0;
`;

const ScreenshotsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ScreenshotThumbnail = styled.div`
  position: relative;
  aspect-ratio: 9 / 19.5;
  background: #1a1a2e;
  border: 2px solid ${props => props.$first ? '#e94560' : '#2d3561'};
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
    border-color: #e94560;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ScreenshotNumber = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: ${props => props.$first ? '#e94560' : 'rgba(0, 0, 0, 0.7)'};
  color: #ffffff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const ScreenshotBadge = styled.div`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: #a0a0a0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.625rem;
`;

const AnalysisSection = styled.div`
  margin-top: 1.5rem;
`;

const AnalysisCategory = styled.div`
  margin-bottom: 1.5rem;
`;

const AnalysisCategoryTitle = styled.h4`
  font-size: 1rem;
  color: #eaeaea;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AnalysisItem = styled.div`
  background: ${props => {
    switch (props.$severity) {
      case 'high': return 'rgba(248, 49, 47, 0.1)';
      case 'warning': return 'rgba(255, 176, 32, 0.1)';
      case 'medium': return 'rgba(255, 176, 32, 0.08)';
      case 'info': return 'rgba(123, 44, 191, 0.1)';
      case 'success': return 'rgba(0, 210, 106, 0.1)';
      default: return 'rgba(255, 255, 255, 0.03)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$severity) {
      case 'high': return '#f8312f';
      case 'warning': return '#ffb020';
      case 'medium': return '#ffb020';
      case 'info': return '#7b2cbf';
      case 'success': return '#00d26a';
      default: return '#2d3561';
    }
  }};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const SeverityIcon = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`;

const AnalysisContent = styled.div`
  flex: 1;
`;

const AnalysisMessage = styled.div`
  color: #eaeaea;
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const AnalysisRecommendation = styled.div`
  color: #a0a0a0;
  font-size: 0.875rem;
  font-style: italic;
`;

// Keyword History Modal
const KeywordModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const KeywordModalContent = styled.div`
  background: #16213e;
  border: 2px solid #e94560;
  border-radius: 16px;
  padding: 2rem;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const KeywordModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2d3561;
`;

const KeywordModalTitle = styled.h3`
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const KeywordModalClose = styled.button`
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: all 0.2s;

  &:hover {
    color: #e94560;
    transform: rotate(90deg);
  }
`;

const KeywordModalStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const KeywordModalStat = styled.div`
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const KeywordModalStatLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const KeywordModalStatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #eaeaea;
`;

const KeywordModalChart = styled.div`
  background: #1a1a2e;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #2d3561;
  min-height: 300px;
`;

const KeywordHistoryEmpty = styled.div`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
`;

const DateRangeFilter = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const DateFilterButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.$active ? '#e94560' : 'transparent'};
  border: 1px solid #2d3561;
  border-radius: 4px;
  color: ${props => props.$active ? '#ffffff' : '#a0a0a0'};
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? '#e94560' : '#2d3561'};
    border-color: #e94560;
  }
`;

// Category Ranking Styled Components
const CategoryRankingContainer = styled(ChartContainer)`
  margin-top: 2rem;
`;

const CategoryRankingTitle = styled.h3`
  font-size: 1.25rem;
  color: #eaeaea;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CategoryRankingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const CategoryRankingCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const CategoryRankingLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const CategoryRankingValue = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: #e94560;
  margin-bottom: 0.25rem;
`;

const CategoryRankingSubtext = styled.div`
  color: #7b2cbf;
  font-size: 0.875rem;
`;

const CategoryRankingTrend = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
`;

const TrendIndicator = styled.span`
  color: ${props => props.$trend === 'up' ? '#00d26a' : props.$trend === 'down' ? '#f8312f' : '#a0a0a0'};
  font-weight: bold;
`;

const CategoryRankingHistory = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const CategoryRankingStats = styled.div`
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
`;

const CategoryRankingStat = styled.div`
  text-align: center;
`;

const CategoryRankingStatLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
`;

const CategoryRankingStatValue = styled.div`
  color: #eaeaea;
  font-size: 1.125rem;
  font-weight: bold;
`;

const RefreshButton = styled.button`
  background: #2d3561;
  border: 1px solid #e94560;
  color: #eaeaea;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;



function StrategicDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');
  const [mrrData, setMrrData] = useState(null);
  const [userGrowthData, setUserGrowthData] = useState(null);
  const [cacData, setCacData] = useState(null);
  const [acquisitionData, setAcquisitionData] = useState(null);
  const [revenueSpendData, setRevenueSpendData] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState(null);
  const [conversionHistory, setConversionHistory] = useState(null);
  const [competitivenessData, setCompetitivenessData] = useState(null);
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [appMetadata, setAppMetadata] = useState(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState(null);
  const [keywordModal, setKeywordModal] = useState({ isOpen: false, keyword: null, history: null });
  const [screenshotAnalysis, setScreenshotAnalysis] = useState(null);
  const [iconABTesting, setIconABTesting] = useState(null);
  const [descriptionOptimization, setDescriptionOptimization] = useState(null);
  const [categoryRanking, setCategoryRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMrrTrend();
    fetchUserGrowth();
    fetchCacTrend();
    fetchAcquisitionSplit();
    fetchRevenueSpendTrend();
    fetchRoiByChannel();
    fetchConversionFunnel();
    fetchConversionHistory();
    fetchCompetitivenessData();
    fetchSuggestionsData();
    fetchAppMetadata();
    fetchScreenshotAnalysis();
    fetchIconABTesting();
    fetchDescriptionOptimization();
    fetchCategoryRanking();
  }, [dateRange]);

  const fetchMrrTrend = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/mrr-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMrrData(data);
    } catch (err) {
      console.error('Failed to fetch MRR trend:', err);
      setError('Failed to load MRR trend data. Please try again later.');
      // Set mock data for development
      const mockData = generateMockMrrData(dateRange);
      setMrrData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const response = await fetch(`/api/dashboard/user-growth?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUserGrowthData(data);
    } catch (err) {
      console.error('Failed to fetch user growth data:', err);
      // Set mock data for development
      const mockData = generateMockUserGrowthData(dateRange);
      setUserGrowthData(mockData);
    }
  };

  const fetchCacTrend = async () => {
    try {
      const response = await fetch(`/api/dashboard/cac-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCacData(data);
    } catch (err) {
      console.error('Failed to fetch CAC trend data:', err);
      // Set mock data for development
      const mockData = generateMockCacData(dateRange);
      setCacData(mockData);
    }
  };

  const fetchAcquisitionSplit = async () => {
    try {
      const response = await fetch(`/api/dashboard/acquisition-split?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAcquisitionData(data);
    } catch (err) {
      console.error('Failed to fetch acquisition split data:', err);
      // Set mock data for development
      const mockData = generateMockAcquisitionData(dateRange);
      setAcquisitionData(mockData);
    }
  };

  const fetchRevenueSpendTrend = async () => {
    try {
      const response = await fetch(`/api/dashboard/revenue-spend-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRevenueSpendData(data);
    } catch (err) {
      console.error('Failed to fetch revenue vs spend trend:', err);
      // Set mock data for development
      const mockData = generateMockRevenueSpendData(dateRange);
      setRevenueSpendData(mockData);
    }
  };

  const fetchRoiByChannel = async () => {
    try {
      const response = await fetch(`/api/dashboard/roi-by-channel?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRoiData(data);
    } catch (err) {
      console.error('Failed to fetch ROI by channel data:', err);
      // Set mock data for development
      const mockData = generateMockRoiData(dateRange);
      setRoiData(mockData);
    }
  };

  const generateMockRoiData = (range) => {
    const channels = [
      {
        id: 'apple_search_ads',
        name: 'Apple Search Ads',
        category: 'paid',
        icon: '🍎',
        color: '#00d26a'
      },
      {
        id: 'tiktok_ads',
        name: 'TikTok Ads',
        category: 'paid',
        icon: '🎵',
        color: '#e94560'
      },
      {
        id: 'instagram_ads',
        name: 'Instagram Ads',
        category: 'paid',
        icon: '📸',
        color: '#7b2cbf'
      },
      {
        id: 'organic_app_store',
        name: 'Organic (App Store)',
        category: 'organic',
        icon: '🔍',
        color: '#00d4ff'
      },
      {
        id: 'social_organic',
        name: 'Social Organic',
        category: 'organic',
        icon: '💬',
        color: '#ffb020'
      }
    ];

    const channelData = channels.map(channel => {
      let revenue, spend, users;

      if (channel.category === 'paid') {
        if (channel.id === 'apple_search_ads') {
          spend = 800 + Math.random() * 200;
          users = Math.round(spend / 25);
          revenue = users * 15;
        } else if (channel.id === 'tiktok_ads') {
          spend = 500 + Math.random() * 300;
          users = Math.round(spend / 35);
          revenue = users * 12;
        } else {
          spend = 400 + Math.random() * 200;
          users = Math.round(spend / 40);
          revenue = users * 11;
        }
      } else {
        spend = 0;
        users = Math.round(50 + Math.random() * 150);
        revenue = users * 14;
      }

      const profit = revenue - spend;
      const roi = spend > 0 ? ((profit / spend) * 100) : Infinity;

      return {
        id: channel.id,
        name: channel.name,
        category: channel.category,
        icon: channel.icon,
        color: channel.color,
        metrics: {
          spend: parseFloat(spend.toFixed(2)),
          revenue: parseFloat(revenue.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          users: users,
          roi: parseFloat(roi.toFixed(1)),
          cac: parseFloat((spend / users).toFixed(2)) || 0,
          ltv: parseFloat((revenue / users).toFixed(2)) || 0
        }
      };
    });

    const totalSpend = channelData.reduce((sum, ch) => sum + ch.metrics.spend, 0);
    const totalRevenue = channelData.reduce((sum, ch) => sum + ch.metrics.revenue, 0);
    const totalProfit = channelData.reduce((sum, ch) => sum + ch.metrics.profit, 0);
    const totalUsers = channelData.reduce((sum, ch) => sum + ch.metrics.users, 0);
    const overallROI = totalSpend > 0 ? ((totalProfit / totalSpend) * 100).toFixed(1) : 'N/A';

    channelData.sort((a, b) => b.metrics.roi - a.metrics.roi);

    return {
      channels: channelData,
      summary: {
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalUsers: totalUsers,
        overallROI: overallROI === 'N/A' ? null : parseFloat(overallROI),
        bestChannel: channelData[0].name,
        worstChannel: channelData[channelData.length - 1].name
      }
    };
  };

  const fetchConversionFunnel = async () => {
    try {
      const response = await fetch('/api/conversion/funnel');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Transform new API format to match existing component structure
        const transformedData = {
          stages: result.data.stages,
          summary: result.data.summary
        };
        setFunnelData(transformedData);
      } else {
        throw new Error('Invalid data format from API');
      }
    } catch (err) {
      console.error('Failed to fetch conversion funnel data:', err);
      // Set mock data for development
      const mockData = generateMockFunnelData(dateRange);
      setFunnelData(mockData);
    }
  };

  const fetchConversionHistory = async () => {
    try {
      const response = await fetch('/api/conversion/history?days=30');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setConversionHistory(result.data.history);
      }
    } catch (err) {
      console.error('Failed to fetch conversion history:', err);
    }
  };

  const fetchCompetitivenessData = async () => {
    try {
      const response = await fetch('/api/aso/competitiveness');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setCompetitivenessData(result.data);
    } catch (err) {
      console.error('Failed to fetch competitiveness data:', err);
    }
  };
  const fetchSuggestionsData = async () => {
    try {
      const response = await fetch('/api/aso/suggestions');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSuggestionsData(result.data);
    } catch (err) {
      console.error('Failed to fetch keyword suggestions:', err);
    }
  };

  const fetchAppMetadata = async () => {
    try {
      const response = await fetch('/api/appstore/metadata');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAppMetadata(result.metadata);
    } catch (err) {
      console.error('Failed to fetch app metadata:', err);
      // Set mock metadata for development
      setAppMetadata({
        title: 'Blush - Romantic Stories',
        subtitle: 'Spicy AI Romance & Love Stories',
        description: 'Dive into a world of romantic fiction with Blush! Our AI-powered story generator creates personalized spicy romance tales just for you. Whether you love love stories, romantic novels, or spicy fiction, Blush has something for everyone.\n\nFeatures:\n• Personalized AI-generated romance stories\n• Multiple romance genres: fantasy, historical, contemporary, and more\n• Spicy stories for mature audiences\n• Daily new story updates\n• Save your favorites and read offline\n\nPerfect for fans of romantic stories, love stories, and interactive romance games.',
        keywords: 'romance,stories,love,spicy,fiction,romantic,novels,interactive,games',
        promotionalText: 'New stories added daily! Discover your perfect romance.',
        supportUrl: 'https://blush.app/support',
        marketingUrl: 'https://blush.app',
        privacyPolicyUrl: 'https://blush.app/privacy'
      });
    }
  };

  const handleSaveMetadata = async () => {
    try {
      const response = await fetch('/api/appstore/metadata/blush-app', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedMetadata)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAppMetadata(editedMetadata);
      setIsEditingMetadata(false);
      alert('App metadata updated successfully!');
    } catch (err) {
      console.error('Failed to update app metadata:', err);
      alert('Failed to update app metadata. Please try again.');
    }
  };

  const fetchScreenshotAnalysis = async () => {
    try {
      const response = await fetch('/api/appstore/screenshots/analysis');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setScreenshotAnalysis(result);
    } catch (err) {
      console.error('Failed to fetch screenshot analysis:', err);
      // Set mock data for development
      setScreenshotAnalysis({
        screenshots: [
          { id: '1', deviceType: 'iPhone 6.7" Display', url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+1', order: 1 },
          { id: '2', deviceType: 'iPhone 6.7" Display', url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+2', order: 2 },
          { id: '3', deviceType: 'iPhone 6.7" Display', url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+3', order: 3 },
          { id: '4', deviceType: 'iPhone 6.7" Display', url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+4', order: 4 },
          { id: '5', deviceType: 'iPhone 6.7" Display', url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+5', order: 5 },
          { id: '6', deviceType: 'iPhone 6.7" Display', url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+6', order: 6 }
        ],
        analysis: {
          totalScreenshots: 6,
          deviceTypes: ['iPhone 6.7" Display'],
          score: 55,
          suggestions: [
            { type: 'count', severity: 'success', message: 'Good screenshot count (6). Within recommended range of 5-8.' },
            { type: 'device_coverage', severity: 'info', message: 'Only iPhone 6.7" Display screenshots found.', recommendation: 'Consider adding iPad-specific screenshots if your app supports iPad.' },
            { type: 'order', severity: 'medium', message: 'Screenshot order matters for conversion.', recommendation: 'Order: 1) Hook/Value proposition, 2) Key feature, 3) Social proof, 4-6) Additional features, 7-8) Call-to-action' },
            { type: 'consistency', severity: 'low', message: 'Maintain consistent branding across all screenshots.', recommendation: 'Use same color scheme, fonts, and style. Tell a cohesive story.' },
            { type: 'testing', severity: 'info', message: 'Screenshots should be A/B tested for optimal conversion.', recommendation: 'Test different first screenshots, feature emphasis, and value propositions.' }
          ],
          issues: [
            { type: 'first_screenshot', severity: 'high', message: 'First screenshot must be compelling and show the app\'s core value.', recommendation: 'Ensure first screenshot shows: app name/logo, main benefit, and a clear call-to-action. Avoid text-heavy designs.' },
            { type: 'text_readability', severity: 'medium', message: 'Ensure text is readable on small screens.', recommendation: 'Use minimum 16pt font, high contrast, and limit to 20% of screenshot area.' }
          ]
        }
      });
    }
  };

  const fetchIconABTesting = async () => {
    try {
      const response = await fetch('/api/appstore/icon/ab-testing');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setIconABTesting(result);
    } catch (err) {
      console.error('Failed to fetch icon A/B testing data:', err);
      // Set mock data for development
      setIconABTesting({
        currentIcon: {
          url: 'https://via.placeholder.com/1024x1024/1a1a2e/e94560?text=Blush+Icon',
          size: '1024x1024',
          format: 'PNG',
          description: 'Current Blush app icon featuring romantic theme'
        },
        currentAnalysis: {
          clarity: 75,
          brandRecognition: 70,
          emotionalAppeal: 80,
          uniqueness: 65,
          scalability: 85,
          colorScheme: {
            primary: '#e94560',
            secondary: '#1a1a2e',
            contrast: 'good',
            vibrancy: 'high'
          },
          strengths: [
            'Strong emotional appeal with romantic theme',
            'Good color contrast for visibility',
            'Clear brand identity'
          ],
          weaknesses: [
            'Could be more distinctive in crowded category',
            'Consider testing with character variations',
            'Potential to stand out more with bolder design'
          ]
        },
        competitorAnalysis: {
          competitors: [
            { name: 'Episode', iconStyle: 'Character-focused', colors: 'Purple/Pink gradient' },
            { name: 'Chapters', iconStyle: 'Illustration', colors: 'Blue/Gold' },
            { name: 'Choices', iconStyle: 'Typography-focused', colors: 'Red/White' },
            { name: 'Romance Club', iconStyle: 'Photo-realistic', colors: 'Pink/Red' }
          ],
          marketTrends: {
            commonColors: ['Pink', 'Purple', 'Red', 'Gold'],
            commonStyles: ['Character-focused', 'Gradient backgrounds', 'Romantic imagery'],
            differentiation: 'Most apps use pink/purple gradients with characters'
          }
        },
        recommendations: {
          variations: [
            {
              id: 'variation-a',
              name: 'Bold Character Focus',
              description: 'Emphasize romantic character with larger presence',
              hypothesis: 'Larger, more expressive character will increase emotional connection and CTR by 15%',
              expectedImprovement: '+15%',
              priority: 'high',
              confidence: 'medium'
            },
            {
              id: 'variation-b',
              name: 'Minimalist Symbol',
              description: 'Clean, modern design with romantic symbol',
              hypothesis: 'Minimalist design will stand out against busy competitor icons and increase CTR by 10%',
              expectedImprovement: '+10%',
              priority: 'medium',
              confidence: 'medium'
            },
            {
              id: 'variation-c',
              name: 'Unique Color Scheme',
              description: 'Differentiate with unexpected color combination',
              hypothesis: 'Unique colors will grab attention in pink/purple saturated category and increase CTR by 12%',
              expectedImprovement: '+12%',
              priority: 'medium',
              confidence: 'low'
            },
            {
              id: 'variation-d',
              name: 'Typography + Symbol',
              description: 'Combine app name with romantic symbol',
              hypothesis: 'Brand name visibility will increase recognition and CTR by 8%',
              expectedImprovement: '+8%',
              priority: 'low',
              confidence: 'low'
            }
          ],
          experimentStructure: {
            testName: 'App Icon A/B Test - Conversion Optimization',
            metric: 'Conversion Rate (Product Page Views → Downloads)',
            baseline: {
              currentRate: '17.3%',
              weeklyProductPageViews: 18500,
              weeklyDownloads: 3200
            },
            testConfiguration: {
              duration: '14 days',
              minSampleSize: 5000,
              trafficSplit: '50/50',
              significance: 95
            }
          }
        }
      });
    }
  };

  const fetchDescriptionOptimization = async () => {
    try {
      const response = await fetch('/api/appstore/description/analyze');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setDescriptionOptimization(result.data);
    } catch (err) {
      console.error('Failed to fetch description optimization:', err);
      // Set mock data for development
      setDescriptionOptimization({
        currentDescription: 'Dive into a world of romantic fiction with Blush! Our AI-powered story generator creates personalized spicy romance tales just for you.',
        analysis: {
          length: {
            characters: 150,
            words: 20,
            sentences: 2
          },
          structure: {
            hasHook: false,
            hasFeatures: false,
            hasCallToAction: false,
            hasSocialProof: false
          },
          readability: {
            score: 60,
            level: 'Fairly easy to read'
          }
        },
        suggestions: [
          {
            category: 'Structure',
            priority: 'HIGH',
            suggestion: 'Add bullet points to highlight features'
          },
          {
            category: 'Keywords',
            priority: 'HIGH',
            suggestion: 'Include more tracked keywords'
          }
        ]
      });
    }
  };

  const fetchCategoryRanking = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/aso/category/stats');
      const data = await response.json();

      if (data.success) {
        setCategoryRanking(data.data);
      }
    } catch (error) {
      console.error('Error fetching category ranking:', error);
      // Set mock data on error
      setCategoryRanking({
        currentRanking: 42,
        percentile: 98,
        totalApps: 2450,
        category: 'Books',
        subcategory: 'Romance',
        previousRanking: 45,
        rankingChange: 3,
        trend: 'up',
        changeMagnitude: 3,
        historyPoints: 15,
        lastChecked: new Date().toISOString()
      });
    }
  };

  const handleRefreshRanking = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/aso/category/sync', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setCategoryRanking(data.data);
      }
    } catch (error) {
      console.error('Error refreshing category ranking:', error);
    }
  };

  const generateMockFunnelData = (range) => {
    const multiplier = range === '30d' ? 1 : range === '90d' ? 3 : 6;

    return {
      period: range,
      stages: [
        {
          id: 'impressions',
          name: 'App Store Impressions',
          description: 'Times app appeared in search or browse',
          count: 45000 * multiplier,
          conversionRate: null,
          dropoffCount: null,
          dropoffRate: null
        },
        {
          id: 'product_page_views',
          name: 'Product Page Views',
          description: 'Users who viewed the app product page',
          count: 18500 * multiplier,
          conversionRate: 41.1,
          dropoffCount: 26500 * multiplier,
          dropoffRate: 58.9
        },
        {
          id: 'downloads',
          name: 'App Downloads',
          description: 'Users who downloaded the app',
          count: 3200 * multiplier,
          conversionRate: 17.3,
          dropoffCount: 15300 * multiplier,
          dropoffRate: 82.7
        },
        {
          id: 'installs',
          name: 'App Installs',
          description: 'Users who completed installation',
          count: 2900 * multiplier,
          conversionRate: 90.6,
          dropoffCount: 300 * multiplier,
          dropoffRate: 9.4
        },
        {
          id: 'signups',
          name: 'Account Signups',
          description: 'Users who created an account',
          count: 2100 * multiplier,
          conversionRate: 72.4,
          dropoffCount: 800 * multiplier,
          dropoffRate: 27.6
        },
        {
          id: 'trial_starts',
          name: 'Trial Activations',
          description: 'Users who started free trial',
          count: 1650 * multiplier,
          conversionRate: 78.6,
          dropoffCount: 450 * multiplier,
          dropoffRate: 21.4
        },
        {
          id: 'subscriptions',
          name: 'Paid Subscriptions',
          description: 'Users who converted to paid subscription',
          count: 485 * multiplier,
          conversionRate: 29.4,
          dropoffCount: 1165 * multiplier,
          dropoffRate: 70.6
        }
      ],
      summary: {
        totalImpressions: 45000 * multiplier,
        totalConversions: 485 * multiplier,
        overallConversionRate: 1.08,
        avgConversionRatePerStage: 54.9,
        biggestDropoffStage: 'product_page_views',
        biggestDropoffRate: 58.9
      },
      stageDetails: {
        impressions: {
          breakdown: {
            search: 28000 * multiplier,
            browse: 12000 * multiplier,
            referrals: 5000 * multiplier
          },
          topSources: [
            { source: 'Keyword: romantic stories', count: 8500 * multiplier },
            { source: 'Keyword: spicy fiction', count: 6200 * multiplier },
            { source: 'Keyword: romance novels', count: 5100 * multiplier }
          ]
        },
        product_page_views: {
          avgTimeOnPage: 42,
          bounceRate: 58.9,
          returnVisitors: 3200 * multiplier
        },
        downloads: {
          abortedDownloads: 300 * multiplier,
          retryRate: 9.4
        },
        subscriptions: {
          byPlan: {
            monthly: 320 * multiplier,
            annual: 165 * multiplier
          },
          avgTimeToSubscribe: 4.2,
          churnRate: 8.3
        }
      }
    };
  };

  const generateMockRevenueSpendData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let dailyRevenue = 15; // ~$450/month initially
    let dailySpend = 45; // High initial spend

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate revenue growth
      const revenueGrowth = 0.5 + (Math.random() * 1.5);
      dailyRevenue += revenueGrowth;

      // Simulate spend optimization
      if (i < days * 0.3) {
        dailySpend -= 0.3 + (Math.random() * 0.5);
      } else {
        dailySpend += (Math.random() - 0.5) * 2;
      }

      dailySpend = Math.max(dailySpend, 15);

      const revenueVariation = (Math.random() - 0.5) * 3;
      const spendVariation = (Math.random() - 0.5) * 5;

      dailyRevenue = Math.max(dailyRevenue + revenueVariation, 10);
      dailySpend = Math.max(dailySpend + spendVariation, 10);

      const monthlyRevenue = Math.round(dailyRevenue * 30);
      const monthlySpend = Math.round(dailySpend * 30);

      data.push({
        date: date.toISOString().split('T')[0],
        revenue: monthlyRevenue,
        spend: monthlySpend,
        profit: monthlyRevenue - monthlySpend
      });
    }

    const latest = data[data.length - 1];
    const previous = data[Math.floor(data.length / 2)];
    const revenueChange = ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1);
    const spendChange = ((latest.spend - previous.spend) / previous.spend * 100).toFixed(1);
    const profitMargin = ((latest.profit / latest.revenue) * 100).toFixed(1);

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
    const avgProfitMargin = ((totalRevenue - totalSpend) / totalRevenue * 100).toFixed(1);

    return {
      data,
      summary: {
        current: {
          revenue: latest.revenue,
          spend: latest.spend,
          profit: latest.profit,
          profitMargin: parseFloat(profitMargin)
        },
        previous: {
          revenue: previous.revenue,
          spend: previous.spend,
          profit: previous.profit
        },
        change: {
          revenue: parseFloat(revenueChange),
          spend: parseFloat(spendChange)
        },
        averages: {
          revenue: Math.round(totalRevenue / data.length),
          spend: Math.round(totalSpend / data.length),
          profitMargin: parseFloat(avgProfitMargin)
        },
        totalProfit: totalRevenue - totalSpend
      }
    };
  };

  const generateMockMrrData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let currentMrr = 300;
    const targetMrr = 10000;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate growth with some randomness
      const growth = (targetMrr - currentMrr) / (days - i + 1);
      const randomFactor = (Math.random() - 0.4) * 50;
      currentMrr = Math.max(300, currentMrr + growth + randomFactor);

      data.push({
        date: date.toISOString().split('T')[0],
        mrr: Math.round(currentMrr),
        target: Math.round(targetMrr * (i / days))
      });
    }

    const current = data[data.length - 1].mrr;
    const previous = data[Math.max(0, data.length - 8)].mrr; // 7 days ago
    const change = ((current - previous) / previous * 100).toFixed(1);

    return {
      data,
      summary: {
        current: Math.round(current),
        previous: Math.round(previous),
        change: parseFloat(change),
        trend: current >= previous ? 'up' : 'down'
      }
    };
  };

  const generateMockUserGrowthData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let cumulativeUsers = 850;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const baseGrowth = 15;
      const acceleration = (i / days) * 20;
      const randomFactor = (Math.random() - 0.5) * 10;
      const newUsers = Math.max(0, Math.round(baseGrowth + acceleration + randomFactor));

      cumulativeUsers += newUsers;

      data.push({
        date: date.toISOString().split('T')[0],
        users: cumulativeUsers,
        newUsers: newUsers
      });
    }

    const current = data[data.length - 1].users;
    const previousIndex = Math.max(0, data.length - 8);
    const previous = data[previousIndex].users;
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    const totalNewUsers = data.reduce((sum, day) => sum + day.newUsers, 0);
    const avgDailyNewUsers = Math.round(totalNewUsers / days);

    return {
      data,
      summary: {
        current: current,
        previous: previous,
        change: change,
        changePercent: parseFloat(changePercent),
        avgDailyNewUsers: avgDailyNewUsers,
        trend: change >= 0 ? 'up' : 'down'
      }
    };
  };

  const generateMockCacData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let cac = 45.00;
    const targetCac = 15.00;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const progress = i / days;
      const optimization = (cac - targetCac) * (1 - Math.pow(progress, 0.5));
      const randomFactor = (Math.random() - 0.5) * 3;
      cac = Math.max(targetCac, cac - optimization * 0.1 + randomFactor);

      const dailySpend = 25 + Math.random() * 50;
      const dailyNewUsers = Math.round(dailySpend / cac);

      data.push({
        date: date.toISOString().split('T')[0],
        cac: parseFloat(cac.toFixed(2)),
        marketingSpend: parseFloat(dailySpend.toFixed(2)),
        newUsers: dailyNewUsers
      });
    }

    const current = data[data.length - 1].cac;
    const previousIndex = Math.max(0, data.length - 8);
    const previous = data[previousIndex].cac;
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    const avgCac = data.reduce((sum, day) => sum + day.cac, 0) / data.length;
    const totalSpend = data.reduce((sum, day) => sum + day.marketingSpend, 0);
    const totalNewUsers = data.reduce((sum, day) => sum + day.newUsers, 0);

    return {
      data,
      summary: {
        current: parseFloat(current.toFixed(2)),
        previous: parseFloat(previous.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent),
        average: parseFloat(avgCac.toFixed(2)),
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalNewUsers: totalNewUsers,
        trend: change <= 0 ? 'down' : 'up'
      }
    };
  };

  const generateMockAcquisitionData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let organicRatio = 0.35; // Starting with 35% organic

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Organic ratio improves over time (from 35% to 55%)
      const progress = i / days;
      organicRatio = 0.35 + (0.20 * progress);
      organicRatio += (Math.random() - 0.5) * 0.05;
      organicRatio = Math.min(0.80, Math.max(0.20, organicRatio));

      const baseUsers = 20 + (progress * 30);
      const dailyNewUsers = Math.round(baseUsers + (Math.random() - 0.5) * 10);
      const organicUsers = Math.round(dailyNewUsers * organicRatio);
      const paidUsers = dailyNewUsers - organicUsers;

      data.push({
        date: date.toISOString().split('T')[0],
        totalUsers: dailyNewUsers,
        organicUsers: organicUsers,
        paidUsers: paidUsers,
        organicPercent: parseFloat((organicRatio * 100).toFixed(1)),
        paidPercent: parseFloat(((1 - organicRatio) * 100).toFixed(1))
      });
    }

    const totalUsers = data.reduce((sum, day) => sum + day.totalUsers, 0);
    const totalOrganic = data.reduce((sum, day) => sum + day.organicUsers, 0);
    const totalPaid = data.reduce((sum, day) => sum + day.paidUsers, 0);
    const avgOrganicPercent = parseFloat(((totalOrganic / totalUsers) * 100).toFixed(1));
    const avgPaidPercent = parseFloat(((totalPaid / totalUsers) * 100).toFixed(1));

    return {
      data,
      summary: {
        totalUsers: totalUsers,
        organicUsers: totalOrganic,
        paidUsers: totalPaid,
        organicPercent: avgOrganicPercent,
        paidPercent: avgPaidPercent,
        previous: {
          organicPercent: parseFloat((avgOrganicPercent - 5).toFixed(1)),
          paidPercent: parseFloat((avgPaidPercent + 5).toFixed(1))
        },
        trend: 'up'
      }
    };
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
  const handleAddKeyword = async (suggestion) => {
    try {
      const response = await fetch('/api/aso/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword: suggestion.keyword,
          volume: suggestion.volume,
          difficulty: suggestion.difficulty,
          competition: suggestion.competition,
          target: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Refresh suggestions to remove the added keyword
      await fetchSuggestionsData();

      // Refresh competitiveness data to include the new keyword
      await fetchCompetitivenessData();

      // Show success message
      alert(`Keyword "${suggestion.keyword}" added to tracking!`);
    } catch (error) {
      console.error('Failed to add keyword:', error);
      alert(`Failed to add keyword: ${error.message}`);
    }
  };

  const handleKeywordClick = async (keyword) => {
    try {
      // Find the keyword in competitiveness data to get its full details
      const allKeywords = Object.values(competitivenessData.byLevel || {})
        .flatMap(level => level.keywords || []);

      const keywordData = allKeywords.find(kw => kw.keyword === keyword);

      if (!keywordData) {
        console.error('Keyword not found:', keyword);
        return;
      }

      // Fetch ranking history from API
      const response = await fetch(`/api/aso/keywords/history/${encodeURIComponent(keyword)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setKeywordModal({
        isOpen: true,
        keyword: keywordData,
        history: result.data.history || []
      });
    } catch (error) {
      console.error('Failed to fetch keyword history:', error);
      // If API fails, show modal with empty history
      setKeywordModal({
        isOpen: true,
        keyword: { keyword, difficulty: 50, volume: 0, ranking: null },
        history: []
      });
    }
  };

  const handleCloseKeywordModal = () => {
    setKeywordModal({ isOpen: false, keyword: null, history: null });
  };


  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateRollingAverage = (data, currentDate) => {
    const currentIndex = data.findIndex(d => d.date === currentDate);
    if (currentIndex < 6) return null; // Need at least 7 days for rolling average

    const window = data.slice(currentIndex - 6, currentIndex + 1);
    const avg = window.reduce((sum, d) => sum + d.newUsers, 0) / window.length;
    return Math.round(avg);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#16213e',
          border: '1px solid #2d3561',
          borderRadius: '8px',
          padding: '0.75rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.85rem' }}>
            {formatDate(label)}
          </p>
          {payload.map((entry, index) => {
            let value = entry.value;
            if (entry.name === 'New Users' || entry.dataKey === 'users' || entry.name === 'Cumulative Users' ||
                entry.name === 'Daily New Users' || entry.name === '7-Day Rolling Average' ||
                entry.dataKey === 'newUsers' || entry.dataKey === 'rollingAvg') {
              value = formatNumber(entry.value);
            } else if (entry.name === 'CAC' || entry.name === 'Marketing Spend' || entry.name.includes('Spend')) {
              value = formatCurrency(entry.value);
            } else if (entry.name.includes('Revenue')) {
              value = formatCurrency(entry.value);
            } else {
              value = entry.value;
            }
            return (
              <p key={index} style={{ margin: '0.25rem 0 0 0', color: entry.color, fontSize: '0.9rem' }}>
                {entry.name}: {value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          Loading strategic dashboard...
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Strategic Dashboard</Title>
        <DateRangeSelector>
          <DateButton
            $active={dateRange === '30d'}
            onClick={() => setDateRange('30d')}
          >
            30 Days
          </DateButton>
          <DateButton
            $active={dateRange === '90d'}
            onClick={() => setDateRange('90d')}
          >
            90 Days
          </DateButton>
          <DateButton
            $active={dateRange === '180d'}
            onClick={() => setDateRange('180d')}
          >
            180 Days
          </DateButton>
        </DateRangeSelector>
      </DashboardHeader>

      {error && (
        <ErrorState>
          {error}
        </ErrorState>
      )}

      {mrrData && (
        <>
          <MetricsRow>
            <MetricCard>
              <MetricLabel>Current MRR</MetricLabel>
              <MetricValue>{formatCurrency(mrrData.summary.current)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Previous MRR (7d ago)</MetricLabel>
              <MetricValue>{formatCurrency(mrrData.summary.previous)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Change (7d)</MetricLabel>
              <MetricValue style={{
                color: mrrData.summary.trend === 'up' ? '#00d26a' : '#e94560'
              }}>
                {mrrData.summary.trend === 'up' ? '↑' : '↓'}
                {Math.abs(mrrData.summary.change)}%
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Target MRR</MetricLabel>
              <MetricValue>$10,000</MetricValue>
            </MetricCard>
          </MetricsRow>

          <ChartContainer>
            <ChartTitle>Monthly Recurring Revenue Trend</ChartTitle>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={mrrData.data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#a0a0a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  stroke="#a0a0a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#a0a0a0' }}
                />
                <ReferenceLine
                  y={10000}
                  label="Target $10k"
                  stroke="#00d26a"
                  strokeDasharray="3 3"
                  style={{ color: '#00d26a' }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#e94560"
                  strokeWidth={2}
                  dot={{ fill: '#e94560', r: 3 }}
                  activeDot={{ r: 6 }}
                  name="MRR"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#7b2cbf"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Target Path"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* User Growth Section */}
          {userGrowthData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Total Users</MetricLabel>
                  <MetricValue>{formatNumber(userGrowthData.summary.current)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Previous (7d ago)</MetricLabel>
                  <MetricValue>{formatNumber(userGrowthData.summary.previous)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>New Users (7d)</MetricLabel>
                  <MetricValue style={{
                    color: userGrowthData.summary.trend === 'up' ? '#00d26a' : '#e94560'
                  }}>
                    {userGrowthData.summary.trend === 'up' ? '+' : ''}
                    {formatNumber(userGrowthData.summary.change)}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Avg Daily New Users</MetricLabel>
                  <MetricValue>{formatNumber(userGrowthData.summary.avgDailyNewUsers)}</MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>User Growth Trend</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={userGrowthData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d26a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00d26a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value;
                      }}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#00d26a"
                      strokeWidth={2}
                      fill="url(#colorUsers)"
                      dot={{ fill: '#00d26a', r: 3 }}
                      activeDot={{ r: 6 }}
                      name="Cumulative Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#7b2cbf"
                      strokeWidth={2}
                      dot={false}
                      name="New Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Daily New Users Bar Chart */}
              <ChartContainer>
                <ChartTitle>Daily New Users / Downloads</ChartTitle>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={userGrowthData.data.map(d => ({
                      ...d,
                      rollingAvg: calculateRollingAverage(userGrowthData.data, d.date)
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Bar
                      dataKey="newUsers"
                      fill="#00d26a"
                      radius={[4, 4, 0, 0]}
                      name="Daily New Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="rollingAvg"
                      stroke="#7b2cbf"
                      strokeWidth={3}
                      dot={false}
                      name="7-Day Rolling Average"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {/* CAC Trend Section */}
          {cacData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Current CAC</MetricLabel>
                  <MetricValue>{formatCurrency(cacData.summary.current)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Previous CAC (7d ago)</MetricLabel>
                  <MetricValue>{formatCurrency(cacData.summary.previous)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Change (7d)</MetricLabel>
                  <MetricValue style={{
                    color: cacData.summary.trend === 'down' ? '#00d26a' : '#e94560'
                  }}>
                    {cacData.summary.trend === 'down' ? '↓' : '↑'}
                    {formatCurrency(Math.abs(cacData.summary.change))}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Average CAC</MetricLabel>
                  <MetricValue>{formatCurrency(cacData.summary.average)}</MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Customer Acquisition Cost (CAC) Trend</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={cacData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorCac" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffb020" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffb020" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <ReferenceLine
                      y={15}
                      label="Target $15"
                      stroke="#00d26a"
                      strokeDasharray="3 3"
                      style={{ color: '#00d26a' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cac"
                      stroke="#ffb020"
                      strokeWidth={2}
                      dot={{ fill: '#ffb020', r: 3 }}
                      activeDot={{ r: 6 }}
                      name="CAC"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {acquisitionData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Organic Users</MetricLabel>
                  <MetricValue style={{ color: '#00d26a' }}>
                    {formatNumber(acquisitionData.summary.organicUsers)}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Paid Users</MetricLabel>
                  <MetricValue style={{ color: '#7b2cbf' }}>
                    {formatNumber(acquisitionData.summary.paidUsers)}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Organic %</MetricLabel>
                  <MetricValue style={{
                    color: acquisitionData.summary.trend === 'up' ? '#00d26a' : '#e94560'
                  }}>
                    {acquisitionData.summary.trend === 'up' ? '↑' : '↓'}
                    {acquisitionData.summary.organicPercent}%
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Previous (7d ago)</MetricLabel>
                  <MetricValue>
                    {acquisitionData.summary.previous.organicPercent}% / {acquisitionData.summary.previous.paidPercent}%
                  </MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Organic vs Paid User Acquisition</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={acquisitionData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Bar
                      dataKey="organicUsers"
                      name="Organic Users"
                      fill="#00d26a"
                      stackId="acquisition"
                    />
                    <Bar
                      dataKey="paidUsers"
                      name="Paid Users"
                      fill="#7b2cbf"
                      stackId="acquisition"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {/* Revenue vs Spend Section */}
          {revenueSpendData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Monthly Revenue</MetricLabel>
                  <MetricValue>{formatCurrency(revenueSpendData.summary.current.revenue)}</MetricValue>
                  <MetricChange $positive={revenueSpendData.summary.change.revenue >= 0}>
                    {revenueSpendData.summary.change.revenue >= 0 ? '↑' : '↓'} {Math.abs(revenueSpendData.summary.change.revenue)}%
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Marketing Spend</MetricLabel>
                  <MetricValue>{formatCurrency(revenueSpendData.summary.current.spend)}</MetricValue>
                  <MetricChange $positive={revenueSpendData.summary.change.spend <= 0}>
                    {revenueSpendData.summary.change.spend <= 0 ? '↓' : '↑'} {Math.abs(revenueSpendData.summary.change.spend)}%
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Monthly Profit</MetricLabel>
                  <MetricValue $positive={revenueSpendData.summary.current.profit >= 0}>
                    {formatCurrency(revenueSpendData.summary.current.profit)}
                  </MetricValue>
                  <MetricChange $positive={revenueSpendData.summary.current.profit >= 0}>
                    {revenueSpendData.summary.current.profit >= 0 ? '✓' : '✗'} {revenueSpendData.summary.current.profitMargin}%
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Avg Profit Margin</MetricLabel>
                  <MetricValue $positive={revenueSpendData.summary.averages.profitMargin >= 0}>
                    {revenueSpendData.summary.averages.profitMargin}%
                  </MetricValue>
                  <MetricChange>
                    {formatCurrency(revenueSpendData.summary.averages.revenue)} / {formatCurrency(revenueSpendData.summary.averages.spend)}
                  </MetricChange>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Revenue vs Marketing Spend</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={revenueSpendData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#00d26a"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="spend"
                      name="Marketing Spend"
                      stroke="#e94560"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={0}
                      stroke="#2d3561"
                      strokeWidth={1}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {/* ROI by Channel Section */}
          {roiData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Total Spend</MetricLabel>
                  <MetricValue>{formatCurrency(roiData.summary.totalSpend)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Total Revenue</MetricLabel>
                  <MetricValue>{formatCurrency(roiData.summary.totalRevenue)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Overall ROI</MetricLabel>
                  <MetricValue $positive={roiData.summary.overallROI > 0}>
                    {roiData.summary.overallROI !== null ? roiData.summary.overallROI + '%' : '∞'}
                  </MetricValue>
                  <MetricChange>
                    Best: {roiData.summary.bestChannel}
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Total Profit</MetricLabel>
                  <MetricValue $positive={roiData.summary.totalProfit > 0}>
                    {formatCurrency(roiData.summary.totalProfit)}
                  </MetricValue>
                  <MetricChange>
                    From {roiData.channels.length} channels
                  </MetricChange>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>ROI by Marketing Channel</ChartTitle>
                <ROIChannelGrid>
                  {roiData.channels.map((channel) => (
                    <ROIChannelCard
                      key={channel.id}
                      $color={channel.color}
                      onClick={() => navigate(`/dashboard/channel/${channel.id}`)}
                      title="Click to view channel details"
                    >
                      <ROIChannelHeader>
                        <ROIChannelName>
                          <ROIChannelIcon>{channel.icon}</ROIChannelIcon>
                          {channel.name}
                        </ROIChannelName>
                        <ROIChannelBadge $category={channel.category}>
                          {channel.category}
                        </ROIChannelBadge>
                      </ROIChannelHeader>

                      <ROIMainLabel>ROI</ROIMainLabel>
                      <ROIMainValue
                        $positive={channel.metrics.roi === 'Infinity' || channel.metrics.roi === Infinity ? true : channel.metrics.roi > 0}
                        $color={channel.color}
                      >
                        {channel.metrics.roi === 'Infinity' || channel.metrics.roi === Infinity ? '∞' : channel.metrics.roi + '%'}
                      </ROIMainValue>

                      <ROIMetric>
                        <ROIMetricLabel>Spend</ROIMetricLabel>
                        <ROIMetricValue>{formatCurrency(channel.metrics.spend)}</ROIMetricValue>
                      </ROIMetric>
                      <ROIMetric>
                        <ROIMetricLabel>Revenue</ROIMetricLabel>
                        <ROIMetricValue $positive={true}>{formatCurrency(channel.metrics.revenue)}</ROIMetricValue>
                      </ROIMetric>
                      <ROIMetric>
                        <ROIMetricLabel>Profit</ROIMetricLabel>
                        <ROIMetricValue $positive={channel.metrics.profit > 0}>
                          {formatCurrency(channel.metrics.profit)}
                        </ROIMetricValue>
                      </ROIMetric>
                      <ROIMetric>
                        <ROIMetricLabel>Users</ROIMetricLabel>
                        <ROIMetricValue>{formatNumber(channel.metrics.users)}</ROIMetricValue>
                      </ROIMetric>
                      <ROIMetric>
                        <ROIMetricLabel>CAC</ROIMetricLabel>
                        <ROIMetricValue>
                          {channel.metrics.cac > 0 ? formatCurrency(channel.metrics.cac) : 'N/A'}
                        </ROIMetricValue>
                      </ROIMetric>
                      <ROIMetric>
                        <ROIMetricLabel>LTV</ROIMetricLabel>
                        <ROIMetricValue $positive={true}>
                          {formatCurrency(channel.metrics.ltv)}/mo
                        </ROIMetricValue>
                      </ROIMetric>
                    </ROIChannelCard>
                  ))}
                </ROIChannelGrid>
              </ChartContainer>
            </>
          )}

          {/* ASO Competitiveness Analysis Section */}
          {competitivenessData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Total Keywords</MetricLabel>
                  <MetricValue>{competitivenessData.summary.totalKeywords}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Avg Difficulty</MetricLabel>
                  <MetricValue>{competitivenessData.summary.avgDifficulty}/100</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Low Competition</MetricLabel>
                  <MetricValue $positive={true}>{competitivenessData.summary.lowCompetitionCount}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>High Competition</MetricLabel>
                  <MetricValue $positive={false}>{competitivenessData.summary.highCompetitionCount}</MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Keyword Competitiveness Analysis</ChartTitle>

                {competitivenessData.lowCompetitionOpportunities.length > 0 && (
                  <>
                    <OpportunityAlert>
                      <OpportunityIcon>💡</OpportunityIcon>
                      <OpportunityText>
                        <strong>Low-Competition Opportunities:</strong> {competitivenessData.lowCompetitionOpportunities.length} keywords with high potential and low competition
                      </OpportunityText>
                    </OpportunityAlert>

                    <OpportunityGrid>
                      {competitivenessData.lowCompetitionOpportunities.map((opportunity, index) => (
                        <OpportunityCard key={index}>
                          <OpportunityHeader>
                            <OpportunityKeyword>{opportunity.keyword}</OpportunityKeyword>
                            <OpportunityScore>{opportunity.opportunityScore}</OpportunityScore>
                          </OpportunityHeader>
                          <OpportunityMetrics>
                            <OpportunityMetric>
                              <OpportunityMetricLabel>Volume</OpportunityMetricLabel>
                              <OpportunityMetricValue>{formatNumber(opportunity.volume)}</OpportunityMetricValue>
                            </OpportunityMetric>
                            <OpportunityMetric>
                              <OpportunityMetricLabel>Difficulty</OpportunityMetricLabel>
                              <OpportunityMetricValue $positive={opportunity.difficulty < 50}>
                                {opportunity.difficulty}/100
                              </OpportunityMetricValue>
                            </OpportunityMetric>
                            {opportunity.ranking && (
                              <OpportunityMetric>
                                <OpportunityMetricLabel>Ranking</OpportunityMetricLabel>
                                <OpportunityMetricValue>#{opportunity.ranking}</OpportunityMetricValue>
                              </OpportunityMetric>
                            )}
                          </OpportunityMetrics>
                        </OpportunityCard>
                      ))}
                    </OpportunityGrid>
                  </>
                )}

                <CompetitivenessBreakdown>
                  {Object.entries(competitivenessData.byLevel).map(([level, data]) => (
                    <CompetitionLevel key={level}>
                      <CompetitionHeader>
                        <CompetitionBadge $color={data.color}>{data.label}</CompetitionBadge>
                        <CompetitionCount>{data.count} keywords</CompetitionCount>
                      </CompetitionHeader>
                      <CompetitionStats>
                        <Stat>
                          <StatLabel>Avg Difficulty</StatLabel>
                          <StatValue>{data.avgDifficulty}/100</StatValue>
                        </Stat>
                        <Stat>
                          <StatLabel>Total Volume</StatLabel>
                          <StatValue>{formatNumber(data.totalVolume)}</StatValue>
                        </Stat>
                      </CompetitionStats>
                      {data.keywords.length > 0 && (
                        <KeywordList>
                          {data.keywords.slice(0, 5).map((kw, idx) => (
                            <KeywordItem key={idx} onClick={() => handleKeywordClick(kw.keyword)} style={{ cursor: 'pointer' }}>
                              <KeywordName>{kw.keyword}</KeywordName>
                              <KeywordDifficulty $difficulty={kw.difficulty}>
                                {kw.difficulty}/100
                              </KeywordDifficulty>
                            </KeywordItem>
                          ))}
                          {data.keywords.length > 5 && (
                            <MoreKeywords>+{data.keywords.length - 5} more</MoreKeywords>
                          )}
                        </KeywordList>
                      )}
                    </CompetitionLevel>
                  ))}
                </CompetitivenessBreakdown>
              </ChartContainer>
            </>
          )}


          {/* ASO Keyword Suggestions Section */}
          {suggestionsData && (
            <>
              <ChartContainer>
                <SuggestionsHeader>
                  <SuggestionsTitle>
                    🎯 New Keyword Opportunities
                    <SuggestionsCount>{suggestionsData.total} suggestions</SuggestionsCount>
                  </SuggestionsTitle>
                </SuggestionsHeader>

                {suggestionsData.suggestions.length > 0 ? (
                  <>
                    <SuggestionsGrid>
                      {suggestionsData.suggestions.map((suggestion, index) => (
                        <SuggestionCard key={index}>
                          <SuggestionCategory $category={suggestion.category}>
                            {suggestion.category}
                          </SuggestionCategory>
                          <SuggestionKeyword>{suggestion.keyword}</SuggestionKeyword>
                          <SuggestionReason>{suggestion.reason}</SuggestionReason>
                          <SuggestionMetrics>
                            <SuggestionMetric>
                              <SuggestionMetricLabel>Volume</SuggestionMetricLabel>
                              <SuggestionMetricValue>
                                {formatNumber(suggestion.volume)}
                              </SuggestionMetricValue>
                            </SuggestionMetric>
                            <SuggestionMetric>
                              <SuggestionMetricLabel>Difficulty</SuggestionMetricLabel>
                              <SuggestionMetricValue
                                $positive={suggestion.difficulty < 50}
                                $negative={suggestion.difficulty > 70}
                              >
                                {suggestion.difficulty}/100
                              </SuggestionMetricValue>
                            </SuggestionMetric>
                            <SuggestionMetric>
                              <SuggestionMetricLabel>Score</SuggestionMetricLabel>
                              <SuggestionMetricValue $positive={true}>
                                {suggestion.opportunityScore}
                              </SuggestionMetricValue>
                            </SuggestionMetric>
                          </SuggestionMetrics>
                          <AddKeywordButton onClick={() => handleAddKeyword(suggestion)}>
                            + Add to Tracking
                          </AddKeywordButton>
                        </SuggestionCard>
                      ))}
                    </SuggestionsGrid>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#16213e', borderRadius: '8px', fontSize: '0.9rem', color: '#a0a0a0' }}>
                      <strong>💡 Tip:</strong> These keywords are not currently being tracked but show high potential based on search volume and competition analysis.
                    </div>
                  </>
                ) : (
                  <NoSuggestions>
                    No new keyword opportunities found at this time. Check back later after analyzing more data.
                  </NoSuggestions>
                )}
              </ChartContainer>
            </>
          )}


          {/* App Metadata Section */}
          {appMetadata && (
            <ChartContainer>
              <MetadataHeader>
                <MetadataTitle>📱 App Metadata</MetadataTitle>
                <MetadataActions>
                  {!isEditingMetadata ? (
                    <EditButton onClick={() => {
                      setIsEditingMetadata(true);
                      setEditedMetadata({...appMetadata});
                    }}>
                      ✏️ Edit Metadata
                    </EditButton>
                  ) : (
                    <>
                      <SaveButton onClick={handleSaveMetadata}>
                        💾 Save Changes
                      </SaveButton>
                      <CancelButton onClick={() => {
                        setIsEditingMetadata(false);
                        setEditedMetadata(null);
                      }}>
                        ✕ Cancel
                      </CancelButton>
                    </>
                  )}
                </MetadataActions>
              </MetadataHeader>

              <MetadataGrid>
                <MetadataField>
                  <MetadataLabel>Title</MetadataLabel>
                  {isEditingMetadata ? (
                    <SmallMetadataInput
                      type="text"
                      value={editedMetadata?.title || ''}
                      onChange={(e) => setEditedMetadata({...editedMetadata, title: e.target.value})}
                      placeholder="App title"
                    />
                  ) : (
                    <MetadataValue>{appMetadata.title}</MetadataValue>
                  )}
                </MetadataField>

                <MetadataField>
                  <MetadataLabel>Subtitle</MetadataLabel>
                  {isEditingMetadata ? (
                    <SmallMetadataInput
                      type="text"
                      value={editedMetadata?.subtitle || ''}
                      onChange={(e) => setEditedMetadata({...editedMetadata, subtitle: e.target.value})}
                      placeholder="App subtitle"
                    />
                  ) : (
                    <MetadataValue>{appMetadata.subtitle}</MetadataValue>
                  )}
                </MetadataField>
              </MetadataGrid>

              <MetadataSection>
                <MetadataLabel>Description</MetadataLabel>
                {isEditingMetadata ? (
                  <MetadataValue>
                    <MetadataInput
                      rows={8}
                      value={editedMetadata?.description || ''}
                      onChange={(e) => setEditedMetadata({...editedMetadata, description: e.target.value})}
                      placeholder="App description"
                    />
                  </MetadataValue>
                ) : (
                  <MetadataValue>{appMetadata.description}</MetadataValue>
                )}
              </MetadataSection>

              <MetadataSection>
                <MetadataLabel>Keywords</MetadataLabel>
                {isEditingMetadata ? (
                  <SmallMetadataInput
                    type="text"
                    value={editedMetadata?.keywords || ''}
                    onChange={(e) => setEditedMetadata({...editedMetadata, keywords: e.target.value})}
                    placeholder="Comma-separated keywords"
                  />
                ) : (
                  <MetadataValue>{appMetadata.keywords}</MetadataValue>
                )}
              </MetadataSection>

              {appMetadata.promotionalText && (
                <MetadataSection>
                  <MetadataLabel>Promotional Text</MetadataLabel>
                  {isEditingMetadata ? (
                    <MetadataValue>
                      <MetadataInput
                        rows={3}
                        value={editedMetadata?.promotionalText || ''}
                        onChange={(e) => setEditedMetadata({...editedMetadata, promotionalText: e.target.value})}
                        placeholder="Promotional text"
                      />
                    </MetadataValue>
                  ) : (
                    <MetadataValue>{appMetadata.promotionalText}</MetadataValue>
                  )}
                </MetadataSection>
              )}

              <MetadataSection>
                <MetadataLabel>URLs</MetadataLabel>
                <UrlList>
                  {appMetadata.supportUrl && (
                    <UrlItem>
                      <UrlLabel>Support:</UrlLabel>
                      <UrlValue href={appMetadata.supportUrl} target="_blank" rel="noopener noreferrer">
                        {appMetadata.supportUrl}
                      </UrlValue>
                    </UrlItem>
                  )}
                  {appMetadata.marketingUrl && (
                    <UrlItem>
                      <UrlLabel>Marketing:</UrlLabel>
                      <UrlValue href={appMetadata.marketingUrl} target="_blank" rel="noopener noreferrer">
                        {appMetadata.marketingUrl}
                      </UrlValue>
                    </UrlItem>
                  )}
                  {appMetadata.privacyPolicyUrl && (
                    <UrlItem>
                      <UrlLabel>Privacy:</UrlLabel>
                      <UrlValue href={appMetadata.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
                        {appMetadata.privacyPolicyUrl}
                      </UrlValue>
                    </UrlItem>
                  )}
                </UrlList>
              </MetadataSection>
            </ChartContainer>
          )}


          {/* Description Optimization Section */}
          {descriptionOptimization && descriptionOptimization.analysis && (
            <DescriptionOptimizationContainer>
              <DescriptionOptimizationHeader>
                <DescriptionOptimizationTitle>✍️ Description Optimization</DescriptionOptimizationTitle>
              </DescriptionOptimizationHeader>

              {/* Analysis Metrics */}
              <DescriptionAnalysisGrid>
                <DescriptionMetricCard>
                  <DescriptionMetricLabel>Characters</DescriptionMetricLabel>
                  <DescriptionMetricValue>
                    {descriptionOptimization.analysis.length?.characters || 0}
                  </DescriptionMetricValue>
                </DescriptionMetricCard>
                <DescriptionMetricCard>
                  <DescriptionMetricLabel>Words</DescriptionMetricLabel>
                  <DescriptionMetricValue>
                    {descriptionOptimization.analysis.length?.words || 0}
                  </DescriptionMetricValue>
                </DescriptionMetricCard>
                <DescriptionMetricCard>
                  <DescriptionMetricLabel>Readability</DescriptionMetricLabel>
                  <DescriptionMetricValue style={{fontSize: '1.1rem'}}>
                    {descriptionOptimization.analysis.readability?.level || 'Unknown'}
                  </DescriptionMetricValue>
                </DescriptionMetricCard>
                <DescriptionMetricCard>
                  <DescriptionMetricLabel>Missing Keywords</DescriptionMetricLabel>
                  <DescriptionMetricValue>
                    {descriptionOptimization.keywordOpportunities?.totalMissing || 0}
                  </DescriptionMetricValue>
                </DescriptionMetricCard>
              </DescriptionAnalysisGrid>

              {/* Current Description */}
              <DescriptionCurrentPreview>
                <DescriptionSectionTitle>📄 Current Description</DescriptionSectionTitle>
                <DescriptionText>
                  {descriptionOptimization.currentDescription || 'No description set'}
                </DescriptionText>
              </DescriptionCurrentPreview>

              {/* Keyword Opportunities */}
              {descriptionOptimization.keywordOpportunities?.totalMissing > 0 && (
                <KeywordOpportunitiesSection>
                  <DescriptionSectionTitle>🎯 Keyword Opportunities</DescriptionSectionTitle>
                  {descriptionOptimization.keywordOpportunities.topOpportunities?.slice(0, 5).map((opportunity, index) => (
                    <KeywordOpportunityItem key={index}>
                      <DescriptionKeywordName>{opportunity.keyword}</DescriptionKeywordName>
                      <DescriptionKeywordReason>{opportunity.reason}</DescriptionKeywordReason>
                      <DescriptionKeywordPriority>Priority: {opportunity.priority}/100</DescriptionKeywordPriority>
                    </KeywordOpportunityItem>
                  ))}
                </KeywordOpportunitiesSection>
              )}

              {/* Suggestions */}
              {descriptionOptimization.suggestions && descriptionOptimization.suggestions.length > 0 && (
                <>
                  <DescriptionSectionTitle>💡 Optimization Suggestions</DescriptionSectionTitle>
                  <DescriptionSuggestionsGrid>
                    {descriptionOptimization.suggestions.map((suggestion, index) => (
                      <DescriptionSuggestionCard key={index} $priority={suggestion.priority}>
                        <DescriptionSuggestionHeader>
                          <DescriptionSuggestionCategory>{suggestion.category}</DescriptionSuggestionCategory>
                          <DescriptionSuggestionPriority $priority={suggestion.priority}>
                            {suggestion.priority}
                          </DescriptionSuggestionPriority>
                        </DescriptionSuggestionHeader>
                        <DescriptionSuggestionText>{suggestion.suggestion}</DescriptionSuggestionText>
                        {suggestion.example && (
                          <DescriptionSuggestionExample>Example: {suggestion.example}</DescriptionSuggestionExample>
                        )}
                        {suggestion.details && (
                          <DescriptionSuggestionDetails>{suggestion.details}</DescriptionSuggestionDetails>
                        )}
                      </DescriptionSuggestionCard>
                    ))}
                  </DescriptionSuggestionsGrid>
                </>
              )}

              {/* Optimized Description */}
              {descriptionOptimization.optimizedDescription && (
                <OptimizedDescriptionSection>
                  <DescriptionSectionTitle>✨ Optimized Description Draft</DescriptionSectionTitle>
                  <OptimizedDescriptionText>
                    {descriptionOptimization.optimizedDescription}
                  </OptimizedDescriptionText>
                  <ActionButtons>
                    <ApplyButton
                      onClick={async () => {
                        if (appMetadata) {
                          const updatedMetadata = {
                            ...appMetadata,
                            description: descriptionOptimization.optimizedDescription
                          };
                          await fetch('/api/appstore/metadata/' + (process.env.REACT_APP_APP_ID || 'blush-app'), {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedMetadata)
                          });
                          await fetchAppMetadata();
                          await fetchDescriptionOptimization();
                        }
                      }}
                    >
                      Apply Optimized Description
                    </ApplyButton>
                    <DismissButton
                      onClick={() => setDescriptionOptimization(null)}
                    >
                      Dismiss
                    </DismissButton>
                  </ActionButtons>
                </OptimizedDescriptionSection>
              )}
            </DescriptionOptimizationContainer>
          )}


          {/* Screenshot Analysis Section */}
          {screenshotAnalysis && screenshotAnalysis.analysis && (
            <ChartContainer>
              <ScreenshotAnalysisHeader>
                <ScreenshotAnalysisTitle>📸 Screenshot Analysis</ScreenshotAnalysisTitle>
                <ScreenshotScore $score={screenshotAnalysis.analysis.score || 0}>
                  <ScreenshotScoreValue $score={screenshotAnalysis.analysis.score || 0}>
                    {screenshotAnalysis.analysis.score || 0}
                  </ScreenshotScoreValue>
                  <ScreenshotScoreLabel>
                    {(screenshotAnalysis.analysis.score || 0) >= 80 ? 'Excellent' :
                     (screenshotAnalysis.analysis.score || 0) >= 60 ? 'Good' :
                     (screenshotAnalysis.analysis.score || 0) >= 40 ? 'Fair' : 'Needs Work'}
                  </ScreenshotScoreLabel>
                </ScreenshotScore>
              </ScreenshotAnalysisHeader>

              <ScreenshotsGrid>
                {screenshotAnalysis.screenshots && screenshotAnalysis.screenshots.map((screenshot, index) => (
                  <ScreenshotThumbnail key={screenshot.id} $first={index === 0}>
                    <img src={screenshot.url} alt={`Screenshot ${index + 1}`} />
                    <ScreenshotNumber $first={index === 0}>{index + 1}</ScreenshotNumber>
                    <ScreenshotBadge>{screenshot.deviceType}</ScreenshotBadge>
                  </ScreenshotThumbnail>
                ))}
              </ScreenshotsGrid>

              <AnalysisSection>
                {screenshotAnalysis.analysis.issues && screenshotAnalysis.analysis.issues.length > 0 && (
                  <AnalysisCategory>
                    <AnalysisCategoryTitle>⚠️ Issues to Address</AnalysisCategoryTitle>
                    {screenshotAnalysis.analysis.issues.map((issue, index) => (
                      <AnalysisItem key={index} $severity={issue.severity}>
                        <SeverityIcon>
                          {issue.severity === 'high' ? '🔴' :
                           issue.severity === 'warning' ? '🟠' :
                           issue.severity === 'medium' ? '🟡' : 'ℹ️'}
                        </SeverityIcon>
                        <AnalysisContent>
                          <AnalysisMessage>{issue.message}</AnalysisMessage>
                          {issue.recommendation && (
                            <AnalysisRecommendation>💡 {issue.recommendation}</AnalysisRecommendation>
                          )}
                        </AnalysisContent>
                      </AnalysisItem>
                    ))}
                  </AnalysisCategory>
                )}

                {screenshotAnalysis.analysis.suggestions && screenshotAnalysis.analysis.suggestions.length > 0 && (
                  <AnalysisCategory>
                    <AnalysisCategoryTitle>💡 Recommendations</AnalysisCategoryTitle>
                    {screenshotAnalysis.analysis.suggestions.map((suggestion, index) => (
                      <AnalysisItem key={index} $severity={suggestion.severity}>
                        <SeverityIcon>
                          {suggestion.severity === 'success' ? '✅' :
                           suggestion.severity === 'info' ? '💡' :
                           suggestion.severity === 'medium' ? '📝' : '💭'}
                        </SeverityIcon>
                        <AnalysisContent>
                          <AnalysisMessage>{suggestion.message}</AnalysisMessage>
                          {suggestion.recommendation && (
                            <AnalysisRecommendation>💡 {suggestion.recommendation}</AnalysisRecommendation>
                          )}
                        </AnalysisContent>
                      </AnalysisItem>
                    ))}
                  </AnalysisCategory>
                )}
              </AnalysisSection>
            </ChartContainer>
          )}


          {/* Icon A/B Testing Section */}
          {iconABTesting && (
            <IconABTestingContainer>
              <IconABTestingHeader>
                <IconABTestingTitle>🎨 Icon A/B Testing Recommendations</IconABTestingTitle>
              </IconABTestingHeader>

              {/* Current Icon Analysis */}
              <CurrentIconSection>
                <IconPreview>
                  <img src={iconABTesting.currentIcon?.url || 'https://via.placeholder.com/200?text=Icon'} alt="Current Icon" />
                </IconPreview>
                <IconDetails>
                  <IconDetailItem>
                    <IconDetailLabel>Size</IconDetailLabel>
                    <IconDetailValue>{iconABTesting.currentIcon?.size || '1024x1024'}</IconDetailValue>
                  </IconDetailItem>
                  <IconDetailItem>
                    <IconDetailLabel>Format</IconDetailLabel>
                    <IconDetailValue>{iconABTesting.currentIcon?.format || 'PNG'}</IconDetailValue>
                  </IconDetailItem>
                  <IconDetailItem>
                    <IconDetailLabel>Description</IconDetailLabel>
                    <IconDetailValue>{iconABTesting.currentIcon?.description || 'Current app icon'}</IconDetailValue>
                  </IconDetailItem>
                  <IconAnalysisGrid>
                    <IconMetric>
                      <IconMetricLabel>Clarity</IconMetricLabel>
                      <IconMetricValue $value={iconABTesting.currentAnalysis?.clarity || 0}>
                        {iconABTesting.currentAnalysis?.clarity || 0}/100
                      </IconMetricValue>
                    </IconMetric>
                    <IconMetric>
                      <IconMetricLabel>Brand Recognition</IconMetricLabel>
                      <IconMetricValue $value={iconABTesting.currentAnalysis?.brandRecognition || 0}>
                        {iconABTesting.currentAnalysis?.brandRecognition || 0}/100
                      </IconMetricValue>
                    </IconMetric>
                    <IconMetric>
                      <IconMetricLabel>Emotional Appeal</IconMetricLabel>
                      <IconMetricValue $value={iconABTesting.currentAnalysis?.emotionalAppeal || 0}>
                        {iconABTesting.currentAnalysis?.emotionalAppeal || 0}/100
                      </IconMetricValue>
                    </IconMetric>
                    <IconMetric>
                      <IconMetricLabel>Uniqueness</IconMetricLabel>
                      <IconMetricValue $value={iconABTesting.currentAnalysis?.uniqueness || 0}>
                        {iconABTesting.currentAnalysis?.uniqueness || 0}/100
                      </IconMetricValue>
                    </IconMetric>
                    <IconMetric>
                      <IconMetricLabel>Scalability</IconMetricLabel>
                      <IconMetricValue $value={iconABTesting.currentAnalysis?.scalability || 0}>
                        {iconABTesting.currentAnalysis?.scalability || 0}/100
                      </IconMetricValue>
                    </IconMetric>
                  </IconAnalysisGrid>
                </IconDetails>
              </CurrentIconSection>

              {/* Strengths and Weaknesses */}
              <StrengthsWeaknessesGrid>
                <StrengthsWeaknessesBox>
                  <StrengthsWeaknessesTitle $type="strengths">✓ Strengths</StrengthsWeaknessesTitle>
                  <StrengthsWeaknessesList>
                    {iconABTesting.currentAnalysis?.strengths?.map((strength, index) => (
                      <StrengthsWeaknessesItem key={index} $type="strengths">
                        {strength}
                      </StrengthsWeaknessesItem>
                    ))}
                  </StrengthsWeaknessesList>
                </StrengthsWeaknessesBox>
                <StrengthsWeaknessesBox>
                  <StrengthsWeaknessesTitle $type="weaknesses">⚠ Areas for Improvement</StrengthsWeaknessesTitle>
                  <StrengthsWeaknessesList>
                    {iconABTesting.currentAnalysis?.weaknesses?.map((weakness, index) => (
                      <StrengthsWeaknessesItem key={index} $type="weaknesses">
                        {weakness}
                      </StrengthsWeaknessesItem>
                    ))}
                  </StrengthsWeaknessesList>
                </StrengthsWeaknessesBox>
              </StrengthsWeaknessesGrid>

              {/* Competitor Analysis */}
              <CompetitorAnalysisSection>
                <SectionHeading>📊 Competitor Analysis</SectionHeading>
                <CompetitorGrid>
                  {iconABTesting.competitorAnalysis?.competitors?.map((competitor, index) => (
                    <CompetitorCard key={index}>
                      <CompetitorName>{competitor.name}</CompetitorName>
                      <CompetitorDetail>Style: {competitor.iconStyle}</CompetitorDetail>
                      <CompetitorDetail>Colors: {competitor.colors}</CompetitorDetail>
                    </CompetitorCard>
                  ))}
                </CompetitorGrid>
                <MarketTrendsBox>
                  <TrendItem>
                    <TrendLabel>Common Colors: </TrendLabel>
                    {iconABTesting.competitorAnalysis?.marketTrends?.commonColors?.join(', ')}
                  </TrendItem>
                  <TrendItem>
                    <TrendLabel>Common Styles: </TrendLabel>
                    {iconABTesting.competitorAnalysis?.marketTrends?.commonStyles?.join(', ')}
                  </TrendItem>
                  <TrendItem>
                    <TrendLabel>Differentiation: </TrendLabel>
                    {iconABTesting.competitorAnalysis?.marketTrends?.differentiation}
                  </TrendItem>
                </MarketTrendsBox>
              </CompetitorAnalysisSection>

              {/* A/B Test Variations */}
              <VariationsSection>
                <SectionHeading>🧪 Recommended A/B Test Variations</SectionHeading>
                <VariationsGrid>
                  {iconABTesting.recommendations?.variations?.map((variation) => (
                    <VariationCard key={variation.id} $priority={variation.priority}>
                      <VariationHeader>
                        <VariationName>{variation.name}</VariationName>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <PriorityBadge $priority={variation.priority}>
                            {variation.priority.toUpperCase()}
                          </PriorityBadge>
                          <ConfidenceBadge>
                            {variation.confidence} confidence
                          </ConfidenceBadge>
                        </div>
                      </VariationHeader>
                      <VariationDescription>{variation.description}</VariationDescription>
                      <VariationHypothesis>
                        <HypothesisLabel>HYPOTHESIS</HypothesisLabel>
                        <HypothesisText>"{variation.hypothesis}"</HypothesisText>
                      </VariationHypothesis>
                      <ExpectedImprovement>
                        Expected: {variation.expectedImprovement}
                      </ExpectedImprovement>
                    </VariationCard>
                  ))}
                </VariationsGrid>
              </VariationsSection>

              {/* Experiment Structure */}
              <ExperimentStructureBox>
                <ExperimentStructureTitle>⚙️ Experiment Setup</ExperimentStructureTitle>
                <ExperimentGrid>
                  <ExperimentItem>
                    <ExperimentLabel>Test Name</ExperimentLabel>
                    <ExperimentValue>{iconABTesting.recommendations?.experimentStructure?.testName}</ExperimentValue>
                  </ExperimentItem>
                  <ExperimentItem>
                    <ExperimentLabel>Primary Metric</ExperimentLabel>
                    <ExperimentValue>{iconABTesting.recommendations?.experimentStructure?.metric}</ExperimentValue>
                  </ExperimentItem>
                  <ExperimentItem>
                    <ExperimentLabel>Current Conversion Rate</ExperimentLabel>
                    <ExperimentValue>{iconABTesting.recommendations?.experimentStructure?.baseline?.currentRate}</ExperimentValue>
                  </ExperimentItem>
                  <ExperimentItem>
                    <ExperimentLabel>Test Duration</ExperimentLabel>
                    <ExperimentValue>{iconABTesting.recommendations?.experimentStructure?.testConfiguration?.duration}</ExperimentValue>
                  </ExperimentItem>
                  <ExperimentItem>
                    <ExperimentLabel>Sample Size</ExperimentLabel>
                    <ExperimentValue>{formatNumber(iconABTesting.recommendations?.experimentStructure?.testConfiguration?.minSampleSize)}</ExperimentValue>
                  </ExperimentItem>
                  <ExperimentItem>
                    <ExperimentLabel>Traffic Split</ExperimentLabel>
                    <ExperimentValue>{iconABTesting.recommendations?.experimentStructure?.testConfiguration?.trafficSplit}</ExperimentValue>
                  </ExperimentItem>
                  <ExperimentItem>
                    <ExperimentLabel>Statistical Significance</ExperimentLabel>
                    <ExperimentValue>{iconABTesting.recommendations?.experimentStructure?.testConfiguration?.significance}%</ExperimentValue>
                  </ExperimentItem>
                </ExperimentGrid>
                <SuccessCriteriaBox>
                  <SuccessCriteriaTitle>✓ Success Criteria</SuccessCriteriaTitle>
                  <SuccessCriteriaList>
                    <SuccessCriteriaItem>
                      {iconABTesting.recommendations?.experimentStructure?.successCriteria?.primary}
                    </SuccessCriteriaItem>
                    {iconABTesting.recommendations?.experimentStructure?.successCriteria?.secondary?.map((criterion, index) => (
                      <SuccessCriteriaItem key={index}>{criterion}</SuccessCriteriaItem>
                    ))}
                  </SuccessCriteriaList>
                </SuccessCriteriaBox>
              </ExperimentStructureBox>
            </IconABTestingContainer>
          )}


          {/* Category Ranking Section */}
          {categoryRanking && (
            <CategoryRankingContainer>
              <CategoryRankingTitle>
                📊 Category Rankings
                <RefreshButton onClick={handleRefreshRanking} style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                  🔄 Refresh
                </RefreshButton>
              </CategoryRankingTitle>

              <CategoryRankingGrid>
                <CategoryRankingCard>
                  <CategoryRankingLabel>Current Ranking</CategoryRankingLabel>
                  <CategoryRankingValue>#{categoryRanking.currentRanking}</CategoryRankingValue>
                  <CategoryRankingSubtext>in {categoryRanking.category} › {categoryRanking.subcategory}</CategoryRankingSubtext>
                  <CategoryRankingTrend>
                    {categoryRanking.trend === 'up' && (
                      <>
                        <TrendIndicator $trend="up">▲</TrendIndicator>
                        <span>Up {Math.abs(categoryRanking.rankingChange)} positions</span>
                      </>
                    )}
                    {categoryRanking.trend === 'down' && (
                      <>
                        <TrendIndicator $trend="down">▼</TrendIndicator>
                        <span>Down {Math.abs(categoryRanking.rankingChange)} positions</span>
                      </>
                    )}
                    {categoryRanking.trend === 'stable' && (
                      <>
                        <TrendIndicator $trend="stable">─</TrendIndicator>
                        <span>Stable</span>
                      </>
                    )}
                  </CategoryRankingTrend>
                </CategoryRankingCard>

                <CategoryRankingCard>
                  <CategoryRankingLabel>Percentile</CategoryRankingLabel>
                  <CategoryRankingValue>{categoryRanking.percentile}%</CategoryRankingValue>
                  <CategoryRankingSubtext>Top {categoryRanking.percentile}% of category</CategoryRankingSubtext>
                </CategoryRankingCard>

                <CategoryRankingCard>
                  <CategoryRankingLabel>Total Apps</CategoryRankingLabel>
                  <CategoryRankingValue>{formatNumber(categoryRanking.totalApps)}</CategoryRankingValue>
                  <CategoryRankingSubtext>in {categoryRanking.subcategory}</CategoryRankingSubtext>
                </CategoryRankingCard>
              </CategoryRankingGrid>

              <CategoryRankingHistory>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={categoryRanking.historyPoints > 0 ? [] : [
                    { date: 'Day 1', ranking: 45 },
                    { date: 'Day 2', ranking: 44 },
                    { date: 'Day 3', ranking: 46 },
                    { date: 'Day 4', ranking: 43 },
                    { date: 'Day 5', ranking: 42 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      stroke="#a0a0a0"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      reversed
                      stroke="#a0a0a0"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Ranking', angle: -90, position: 'insideLeft', fill: '#a0a0a0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2d3561',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`#${value}`, 'Ranking']}
                    />
                    <Area
                      type="monotone"
                      dataKey="ranking"
                      stroke="#e94560"
                      fill="#e94560"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CategoryRankingHistory>

              <CategoryRankingStats>
                <CategoryRankingStat>
                  <CategoryRankingStatLabel>Previous Ranking</CategoryRankingStatLabel>
                  <CategoryRankingStatValue>#{categoryRanking.previousRanking || 'N/A'}</CategoryRankingStatValue>
                </CategoryRankingStat>
                <CategoryRankingStat>
                  <CategoryRankingStatLabel>7-Day Change</CategoryRankingStatLabel>
                  <CategoryRankingStatValue style={{ color: categoryRanking.rankingChange > 0 ? '#00d26a' : categoryRanking.rankingChange < 0 ? '#f8312f' : '#eaeaea' }}>
                    {categoryRanking.rankingChange > 0 ? '+' : ''}{categoryRanking.rankingChange || 0}
                  </CategoryRankingStatValue>
                </CategoryRankingStat>
                <CategoryRankingStat>
                  <CategoryRankingStatLabel>History Points</CategoryRankingStatLabel>
                  <CategoryRankingStatValue>{categoryRanking.historyPoints || 0}</CategoryRankingStatValue>
                </CategoryRankingStat>
                <CategoryRankingStat>
                  <CategoryRankingStatLabel>Last Checked</CategoryRankingStatLabel>
                  <CategoryRankingStatValue style={{ fontSize: '0.875rem' }}>
                    {new Date(categoryRanking.lastChecked).toLocaleDateString()}
                  </CategoryRankingStatValue>
                </CategoryRankingStat>
              </CategoryRankingStats>
            </CategoryRankingContainer>
          )}


          {/* Conversion Funnel Section */}
          {funnelData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Total Impressions</MetricLabel>
                  <MetricValue>{formatNumber(funnelData.summary.totalImpressions)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Total Conversions</MetricLabel>
                  <MetricValue>{formatNumber(funnelData.summary.totalConversions)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Overall Conversion Rate</MetricLabel>
                  <MetricValue>{funnelData.summary.overallConversionRate}%</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Biggest Dropoff</MetricLabel>
                  <MetricValue style={{ color: '#f8312f' }}>
                    {funnelData.stages.find(s => s.id === funnelData.summary.biggestDropoffStage)?.name}
                  </MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Conversion Funnel</ChartTitle>

                <FunnelLegend>
                  <FunnelLegendItem>
                    <FunnelLegendColor $color="#e94560" />
                    <span>Conversion Rate (Green = Good, Red = Poor)</span>
                  </FunnelLegendItem>
                  <FunnelLegendItem>
                    <FunnelLegendColor $color="#f8312f" />
                    <span>Dropoff Rate</span>
                  </FunnelLegendItem>
                </FunnelLegend>

                <FunnelContainer>
                  {funnelData.stages.map((stage, index) => {
                    // Calculate width percentage based on position in funnel
                    const maxWidth = 100;
                    const minWidth = 30;
                    const width = maxWidth - ((maxWidth - minWidth) / (funnelData.stages.length - 1)) * index;

                    // Generate color based on conversion rate
                    const getColor = () => {
                      if (!stage.conversionRate) return '#e94560';
                      if (stage.conversionRate >= 70) return '#00d26a';
                      if (stage.conversionRate >= 40) return '#ffb020';
                      return '#e94560';
                    };

                    const color = getColor();

                    return (
                      <FunnelStage
                        key={stage.id}
                        $active={selectedFunnelStage === stage.id}
                        $width={width}
                        $color={color}
                        onClick={() => setSelectedFunnelStage(selectedFunnelStage === stage.id ? null : stage.id)}
                      >
                        <FunnelStageHeader>
                          <FunnelStageName>
                            <FunnelStageTitle>{stage.name}</FunnelStageTitle>
                            <FunnelStageDescription>{stage.description}</FunnelStageDescription>
                          </FunnelStageName>
                          <FunnelStageMetrics>
                            <FunnelStageCount $color={color}>
                              {formatNumber(stage.count)}
                            </FunnelStageCount>
                            <FunnelStageConversion>
                              {stage.conversionRate !== null && (
                                <>
                                  <FunnelConversionRate $positive={stage.conversionRate >= 50}>
                                    {stage.conversionRate}% conversion
                                  </FunnelConversionRate>
                                  {stage.dropoffRate > 0 && (
                                    <FunnelDropoffInfo>
                                      -{stage.dropoffRate}% dropoff
                                    </FunnelDropoffInfo>
                                  )}
                                </>
                              )}
                              {stage.conversionRate === null && (
                                <FunnelConversionRate>Starting point</FunnelConversionRate>
                              )}
                            </FunnelStageConversion>
                          </FunnelStageMetrics>
                        </FunnelStageHeader>

                        {selectedFunnelStage === stage.id && funnelData.stageDetails[stage.id] && (
                          <FunnelDetailsPanel $visible={true}>
                            <FunnelDetailsTitle>Detailed Breakdown</FunnelDetailsTitle>
                            <FunnelDetailsGrid>
                              {stage.id === 'impressions' && funnelData.stageDetails.impressions && (
                                <>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Search</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.impressions.breakdown.search)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Browse</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.impressions.breakdown.browse)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Referrals</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.impressions.breakdown.referrals)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  {funnelData.stageDetails.impressions.topSources && (
                                    <FunnelDetailItem style={{ gridColumn: '1 / -1' }}>
                                      <FunnelDetailLabel>Top Sources</FunnelDetailLabel>
                                      {funnelData.stageDetails.impressions.topSources.map((source, idx) => (
                                        <FunnelDetailValue key={idx} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                          {source.source}: {formatNumber(source.count)}
                                        </FunnelDetailValue>
                                      ))}
                                    </FunnelDetailItem>
                                  )}
                                </>
                              )}
                              {stage.id === 'product_page_views' && funnelData.stageDetails.product_page_views && (
                                <>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Avg Time on Page</FunnelDetailLabel>
                                    <FunnelDetailValue>{funnelData.stageDetails.product_page_views.avgTimeOnPage}s</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Bounce Rate</FunnelDetailLabel>
                                    <FunnelDetailValue style={{ color: '#f8312f' }}>{funnelData.stageDetails.product_page_views.bounceRate}%</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Return Visitors</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.product_page_views.returnVisitors)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                </>
                              )}
                              {stage.id === 'downloads' && funnelData.stageDetails.downloads && (
                                <>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Aborted Downloads</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.downloads.abortedDownloads)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Retry Rate</FunnelDetailLabel>
                                    <FunnelDetailValue>{funnelData.stageDetails.downloads.retryRate}%</FunnelDetailValue>
                                  </FunnelDetailItem>
                                </>
                              )}
                              {stage.id === 'subscriptions' && funnelData.stageDetails.subscriptions && (
                                <>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Monthly Plans</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.subscriptions.byPlan.monthly)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Annual Plans</FunnelDetailLabel>
                                    <FunnelDetailValue>{formatNumber(funnelData.stageDetails.subscriptions.byPlan.annual)}</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Avg Time to Subscribe</FunnelDetailLabel>
                                    <FunnelDetailValue>{funnelData.stageDetails.subscriptions.avgTimeToSubscribe} days</FunnelDetailValue>
                                  </FunnelDetailItem>
                                  <FunnelDetailItem>
                                    <FunnelDetailLabel>Churn Rate</FunnelDetailLabel>
                                    <FunnelDetailValue style={{ color: '#f8312f' }}>{funnelData.stageDetails.subscriptions.churnRate}%</FunnelDetailValue>
                                  </FunnelDetailItem>
                                </>
                              )}
                            </FunnelDetailsGrid>
                          </FunnelDetailsPanel>
                        )}
                      </FunnelStage>
                    );
                  })}
                </FunnelContainer>
              </ChartContainer>
            </>
          )}

          {/* Keyword History Modal */}
          {keywordModal.isOpen && keywordModal.keyword && (
            <KeywordModalOverlay onClick={handleCloseKeywordModal}>
              <KeywordModalContent onClick={(e) => e.stopPropagation()}>
                <KeywordModalHeader>
                  <KeywordModalTitle>
                    📊 {keywordModal.keyword.keyword}
                  </KeywordModalTitle>
                  <KeywordModalClose onClick={handleCloseKeywordModal}>✕</KeywordModalClose>
                </KeywordModalHeader>

                <KeywordModalStats>
                  <KeywordModalStat>
                    <KeywordModalStatLabel>Current Ranking</KeywordModalStatLabel>
                    <KeywordModalStatValue>
                      {keywordModal.keyword.ranking ? `#${keywordModal.keyword.ranking}` : 'N/A'}
                    </KeywordModalStatValue>
                  </KeywordModalStat>
                  <KeywordModalStat>
                    <KeywordModalStatLabel>Difficulty</KeywordModalStatLabel>
                    <KeywordModalStatValue>{keywordModal.keyword.difficulty}/100</KeywordModalStatValue>
                  </KeywordModalStat>
                  <KeywordModalStat>
                    <KeywordModalStatLabel>Search Volume</KeywordModalStatLabel>
                    <KeywordModalStatValue>{formatNumber(keywordModal.keyword.volume || 0)}</KeywordModalStatValue>
                  </KeywordModalStat>
                  <KeywordModalStat>
                    <KeywordModalStatLabel>History Points</KeywordModalStatLabel>
                    <KeywordModalStatValue>{keywordModal.history?.length || 0}</KeywordModalStatValue>
                  </KeywordModalStat>
                </KeywordModalStats>

                <KeywordModalChart>
                  {keywordModal.history && keywordModal.history.length > 0 ? (
                    <>
                      <DateRangeFilter>
                        <DateFilterButton $active={true}>All Time</DateFilterButton>
                      </DateRangeFilter>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={keywordModal.history.map(h => ({
                          date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          ranking: h.ranking
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                          <XAxis
                            dataKey="date"
                            stroke="#a0a0a0"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            reversed={true}
                            stroke="#a0a0a0"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Ranking', angle: -90, position: 'insideLeft', fill: '#a0a0a0' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#16213e',
                              border: '1px solid #e94560',
                              borderRadius: '8px',
                              color: '#eaeaea'
                            }}
                            formatter={(value) => [`#${value}`, 'Ranking']}
                          />
                          <Line
                            type="monotone"
                            dataKey="ranking"
                            stroke="#e94560"
                            strokeWidth={2}
                            dot={{ fill: '#e94560', r: 4 }}
                            activeDot={{ r: 6, stroke: '#7b2cbf', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <KeywordHistoryEmpty>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                      <div>No ranking history available yet</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        History will be populated as rankings are tracked over time
                      </div>
                    </KeywordHistoryEmpty>
                  )}
                </KeywordModalChart>
              </KeywordModalContent>
            </KeywordModalOverlay>
          )}
        </>
      )}
    </DashboardContainer>
  );
}

export default StrategicDashboard;
