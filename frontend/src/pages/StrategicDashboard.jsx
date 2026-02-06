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

// ASO Score Styled Components
const ASOScoreContainer = styled(ChartContainer)`
  margin-top: 2rem;
`;

const ASOScoreHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ASOScoreTitle = styled.h3`
  font-size: 1.25rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ASOScoreRefreshButton = styled.button`
  background: #7b2cbf;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    background: #9d4edd;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ASOScoreMain = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
  border-radius: 12px;
  border: 2px solid ${props => {
    const score = props.score || 0;
    if (score >= 90) return '#00d26a';
    if (score >= 80) return '#00b4d8';
    if (score >= 70) return '#ffc107';
    if (score >= 60) return '#ff6b6b';
    return '#f8312f';
  }};
`;

const ASOScoreCircle = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: ${props => {
    const score = props.score || 0;
    if (score >= 90) return 'linear-gradient(135deg, #00d26a 0%, #00a86b 100%)';
    if (score >= 80) return 'linear-gradient(135deg, #00b4d8 0%, #0096c7 100%)';
    if (score >= 70) return 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)';
    if (score >= 60) return 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)';
    return 'linear-gradient(135deg, #f8312f 0%, #d32f2f 100%)';
  }};
  box-shadow: 0 8px 32px ${props => {
    const score = props.score || 0;
    if (score >= 90) return 'rgba(0, 210, 106, 0.3)';
    if (score >= 80) return 'rgba(0, 180, 216, 0.3)';
    if (score >= 70) return 'rgba(255, 193, 7, 0.3)';
    if (score >= 60) return 'rgba(255, 107, 107, 0.3)';
    return 'rgba(248, 49, 47, 0.3)';
  }};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: inherit;
    filter: blur(8px);
    opacity: 0.5;
    z-index: -1;
  }
`;

const ASOScoreValue = styled.div`
  font-size: 3.5rem;
  font-weight: bold;
  color: white;
  line-height: 1;
`;

const ASOScoreGrade = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  margin-top: 0.25rem;
`;

const ASOScoreLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ASOScoreDetails = styled.div`
  flex: 1;
`;

const ASOScoreOverallLabel = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const ASOScoreOverallValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const ASOScoreDescription = styled.div`
  font-size: 1rem;
  color: #b0b0b0;
  line-height: 1.5;
`;

const ASOScoreComponentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ASOScoreComponentCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;

  &:hover {
    border-color: #7b2cbf;
    transform: translateY(-2px);
  }
`;

const ASOScoreComponentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ASOScoreComponentName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #eaeaea;
`;

const ASOScoreComponentValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => {
    const score = props.score || 0;
    if (score >= 80) return '#00d26a';
    if (score >= 70) return '#00b4d8';
    if (score >= 60) return '#ffc107';
    return '#f8312f';
  }};
`;

const ASOScoreComponentBar = styled.div`
  height: 8px;
  background: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
`;

const ASOScoreComponentFill = styled.div`
  height: 100%;
  background: ${props => {
    const score = props.score || 0;
    if (score >= 80) return 'linear-gradient(90deg, #00d26a 0%, #00ff88 100%)';
    if (score >= 70) return 'linear-gradient(90deg, #00b4d8 0%, #00d4ff 100%)';
    if (score >= 60) return 'linear-gradient(90deg, #ffc107 0%, #ffca28 100%)';
    return 'linear-gradient(90deg, #f8312f 0%, #ff5252 100%)';
  }};
  border-radius: 4px;
  transition: width 0.5s ease;
  width: ${props => props.score}%;
`;

const ASOScoreComponentFactors = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ASOScoreFactor = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
`;

const ASOScoreFactorName = styled.div`
  color: #b0b0b0;
`;

const ASOScoreFactorScore = styled.div`
  color: ${props => {
    const score = props.score || 0;
    if (score >= 80) return '#00d26a';
    if (score >= 70) return '#00b4d8';
    if (score >= 60) return '#ffc107';
    return '#f8312f';
  }};
  font-weight: 600;
`;

const ASOScoreRecommendations = styled.div`
  margin-top: 2rem;
`;

const ASOScoreRecommendationsTitle = styled.h4`
  font-size: 1.125rem;
  color: #eaeaea;
  margin-bottom: 1rem;
`;

const ASOScoreRecommendationCard = styled.div`
  background: ${props => {
    if (props.priority === 'high') return 'rgba(248, 49, 47, 0.1)';
    if (props.priority === 'medium') return 'rgba(255, 176, 32, 0.1)';
    return '#16213e';
  }};
  border: 1px solid ${props => {
    if (props.priority === 'high') return '#f8312f';
    if (props.priority === 'medium') return '#ffb020';
    return '#2d3561';
  }};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 1rem;
  align-items: start;
`;

const ASOScoreRecommendationBadge = styled.div`
  background: ${props => {
    if (props.priority === 'high') return '#f8312f';
    if (props.priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
  white-space: nowrap;
`;

const ASOScoreRecommendationContent = styled.div`
  flex: 1;
`;

const ASOScoreRecommendationTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const ASOScoreRecommendationDescription = styled.div`
  font-size: 0.875rem;
  color: #b0b0b0;
  line-height: 1.4;
`;

const ASOScoreRecommendationImpact = styled.div`
  font-size: 0.75rem;
  color: ${props => {
    const impact = props.impact || 0;
    if (impact >= 20) return '#00d26a';
    if (impact >= 10) return '#00b4d8';
    return '#ffc107';
  }};
  margin-top: 0.5rem;
  font-weight: 600;
`;

const ASOScoreComparison = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: #16213e;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const ASOScoreComparisonTitle = styled.h4`
  font-size: 1.125rem;
  color: #eaeaea;
  margin-bottom: 1rem;
`;

const ASOScoreComparisonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ASOScoreComparisonItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #1a1a2e;
  border-radius: 6px;
`;

const ASOScoreComparisonCompetitor = styled.div`
  font-size: 1rem;
  color: #eaeaea;
`;

const ASOScoreComparisonScores = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ASOScoreComparisonCompetitorScore = styled.div`
  font-size: 1.125rem;
  font-weight: bold;
  color: #b0b0b0;
`;

const ASOScoreComparisonDifference = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => {
    const diff = props.difference || 0;
    if (diff > 0) return '#00d26a';
    if (diff < 0) return '#f8312f';
    return '#ffc107';
  }};
`;

// Competitor Keyword Monitoring Styled Components
const CompetitorMonitoringContainer = styled(ChartContainer)`
  margin-top: 2rem;
`;

const CompetitorMonitoringTitle = styled.h3`
  font-size: 1.25rem;
  color: #eaeaea;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CompetitorSummary = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const CompetitorSummaryText = styled.p`
  color: #eaeaea;
  line-height: 1.6;
  margin: 0;
`;

const CompetitorKeywordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const CompetitorKeywordCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const CompetitorKeywordCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const CompetitorKeywordName = styled.h4`
  font-size: 1rem;
  color: #eaeaea;
  margin: 0;
`;

const CompetitorKeywordBadge = styled.span`
  background: ${props => {
    if (props.priority === 'high') return '#f8312f';
    if (props.priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  color: #1a1a2e;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
`;

const CompetitorKeywordMetric = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #2d3561;

  &:last-child {
    border-bottom: none;
  }
`;

const CompetitorKeywordMetricLabel = styled.span`
  color: #a0a0a0;
  font-size: 0.875rem;
`;

const CompetitorKeywordMetricValue = styled.span`
  color: ${props => props.value >= 0 ? '#00d26a' : '#f8312f'};
  font-weight: bold;
  font-size: 0.875rem;
`;

const CompetitorMetricWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const KeywordGapsSection = styled.div`
  margin-top: 2rem;
`;

const KeywordGapsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const KeywordGapsTitle = styled.h4`
  font-size: 1.125rem;
  color: #eaeaea;
  margin: 0;
`;

const KeywordGapCard = styled.div`
  background: ${props => {
    if (props.opportunity === 'high') return 'rgba(248, 49, 47, 0.1)';
    if (props.opportunity === 'medium') return 'rgba(255, 176, 32, 0.1)';
    return '#16213e';
  }};
  border: 1px solid ${props => {
    if (props.opportunity === 'high') return '#f8312f';
    if (props.opportunity === 'medium') return '#ffb020';
    return '#2d3561';
  }};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    transform: translateX(4px);
  }
`;

const KeywordGapInfo = styled.div`
  flex: 1;
`;

const KeywordGapKeyword = styled.div`
  font-size: 1rem;
  font-weight: bold;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const KeywordGapDetails = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
`;

const KeywordGapRanking = styled.div`
  text-align: right;
`;

const KeywordGapOurRanking = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: ${props => props.isBetter ? '#00d26a' : '#f8312f'};
`;

const KeywordGapCompetitorRanking = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
`;

const RecommendationsSection = styled.div`
  margin-top: 2rem;
`;

const RecommendationCard = styled.div`
  background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
  border: 1px solid #7b2cbf;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`;

const RecommendationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.75rem;
`;

const RecommendationTitle = styled.h5`
  font-size: 1rem;
  color: #eaeaea;
  margin: 0;
  font-weight: bold;
`;

const RecommendationPriority = styled.span`
  background: ${props => {
    if (props.priority === 'high') return '#f8312f';
    if (props.priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  color: #1a1a2e;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
`;

const RecommendationDescription = styled.p`
  color: #a0a0a0;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 0.75rem 0;
`;

const RecommendationMeta = styled.div`
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
`;

const RecommendationMetaItem = styled.div`
  color: #e94560;
  font-weight: bold;
`;

const ThreatsSection = styled.div`
  margin-top: 2rem;
`;

const ThreatCard = styled.div`
  background: rgba(248, 49, 47, 0.1);
  border: 1px solid #f8312f;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ThreatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ThreatKeyword = styled.div`
  font-size: 1rem;
  font-weight: bold;
  color: #f8312f;
`;

const ThreatVolume = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
`;

const ThreatList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ThreatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(248, 49, 47, 0.05);
  border-radius: 4px;
`;

const ThreatCompetitor = styled.span`
  color: #eaeaea;
  font-size: 0.875rem;
`;

const ThreatRanking = styled.span`
  color: #f8312f;
  font-weight: bold;
  font-size: 0.875rem;
`;

// Weekly Report Components
const WeeklyReportContainer = styled(ChartContainer)`
  margin-bottom: 2rem;
`;

const ReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ReportPeriod = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ReportTitle = styled.h3`
  font-size: 1.5rem;
  color: #eaeaea;
  margin: 0;
`;

const ReportPeriodBadge = styled.span`
  background: linear-gradient(135deg, #e94560, #7b2cbf);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
`;

const ReportActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ReportActionButton = styled.button`
  background: #16213e;
  border: 1px solid #e94560;
  color: #eaeaea;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
  }
`;

const ScoreSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ScoreCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.trend === 'up' ? '#00d26a' : props.trend === 'down' ? '#f8312f' : '#6b7280'};
  }
`;

const ScoreLabel = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const ScoreValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const ScoreChange = styled.div`
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${props => props.change >= 0 ? '#00d26a' : '#f8312f'};
`;

const HighlightsSection = styled.div`
  margin-bottom: 2rem;
`;

const ReportSectionHeading = styled.h4`
  font-size: 1.125rem;
  color: #eaeaea;
  margin-bottom: 1rem;
`;

const HighlightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
`;

const HighlightCard = styled.div`
  background: ${props => {
    switch (props.type) {
      case 'improvement': return 'rgba(0, 210, 106, 0.1)';
      case 'decline': return 'rgba(248, 49, 47, 0.1)';
      case 'alert': return 'rgba(255, 149, 0, 0.1)';
      default: return 'rgba(123, 44, 191, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.type) {
      case 'improvement': return '#00d26a';
      case 'decline': return '#f8312f';
      case 'alert': return '#ff9500';
      default: return '#7b2cbf';
    }
  }};
  border-radius: 12px;
  padding: 1rem;
`;

const HighlightIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;

const HighlightTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const HighlightDescription = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
`;

const TopMoversSection = styled.div`
  margin-bottom: 2rem;
`;

const ReportTopMoversList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TopMoverItem = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TopMoverKeyword = styled.div`
  flex: 1;
`;

const TopMoverName = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const TopMoverVolume = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const TopMoverRanking = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const RankingChange = styled.div`
  font-weight: bold;
  color: ${props => props.change > 0 ? '#00d26a' : '#f8312f'};
  font-size: 0.875rem;
`;

const RankingValues = styled.div`
  text-align: right;
`;

const RankingCurrent = styled.div`
  font-size: 1.125rem;
  font-weight: bold;
  color: #eaeaea;
`;

const RankingPrevious = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-decoration: line-through;
`;

const ReportRecommendationsSection = styled.div`
  margin-bottom: 2rem;
`;

const ReportRecommendationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1rem;
`;

const ReportRecommendationCard = styled.div`
  background: #16213e;
  border: ${props => {
    switch (props.priority) {
      case 'high': return '2px solid #f8312f';
      case 'medium': return '2px solid #ff9500';
      default: return '2px solid #00d26a';
    }
  }};
  border-radius: 12px;
  padding: 1.25rem;
`;

const RecommendationHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const RecommendationCategoryBadge = styled.span`
  background: ${props => {
    switch (props.category) {
      case 'keyword': return '#e94560';
      case 'metadata': return '#7b2cbf';
      case 'visual': return '#00d26a';
      case 'technical': return '#ff9500';
      default: return '#6b7280';
    }
  }};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const RecPriorityBadge = styled.span`
  background: ${props => {
    switch (props.priority) {
      case 'high': return 'rgba(248, 49, 47, 0.2)';
      case 'medium': return 'rgba(255, 149, 0, 0.2)';
      default: return 'rgba(0, 210, 106, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.priority) {
      case 'high': return '#f8312f';
      case 'medium': return '#ff9500';
      default: return '#00d26a';
    }
  }};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const ReportRecommendationTitle = styled.h5`
  font-size: 1rem;
  color: #eaeaea;
  margin: 0 0 0.5rem 0;
`;

const ReportRecommendationDesc = styled.p`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
`;

const ReportRecommendationAction = styled.div`
  background: rgba(123, 44, 191, 0.1);
  border-left: 3px solid #7b2cbf;
  padding: 0.75rem;
  border-radius: 4px;
`;

const ReportActionLabel = styled.div`
  font-size: 0.75rem;
  color: #7b2cbf;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ReportActionText = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
`;

const ReportRecommendationMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ReportSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const SummaryItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: #16213e;
  border-radius: 8px;
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #eaeaea;
`;

const SummaryChange = styled.div`
  font-size: 0.75rem;
  color: ${props => props.change >= 0 ? '#00d26a' : '#f8312f'};
`;

const EmptyReportState = styled.div`
  text-align: center;
  padding: 3rem;
  background: #16213e;
  border-radius: 12px;
  border: 1px dashed #2d3561;

  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h4 {
    color: #eaeaea;
    margin-bottom: 0.5rem;
  }

  p {
    color: #a0a0a0;
    font-size: 0.875rem;
  }
`;

// Analysis Modal Components
const ExperimentAnalysisModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const ExperimentAnalysisModalContent = styled.div`
  background: #16213e;
  border-radius: 12px;
  max-width: 900px;
  max-height: 90vh;
  width: 95%;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid #2d3561;
`;

const ExperimentAnalysisModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #2d3561;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: #16213e;
  z-index: 10;
`;

const ExperimentAnalysisModalTitle = styled.h2`
  font-size: 1.5rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ExperimentAnalysisModalClose = styled.button`
  background: none;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  transition: color 0.2s;

  &:hover {
    color: #e94560;
  }
`;

const ExperimentAnalysisModalBody = styled.div`
  padding: 1.5rem;
`;

const ExperimentAnalysisSection = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ExperimentAnalysisSectionTitle = styled.h3`
  font-size: 1.25rem;
  color: #eaeaea;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ExperimentAnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ExperimentAnalysisCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const ExperimentAnalysisCardLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const ExperimentAnalysisCardValue = styled.div`
  font-size: 1.125rem;
  color: #eaeaea;
  font-weight: 600;
`;

const ExperimentAnalysisConclusion = styled.div`
  background: ${props => {
    if (props.$isSignificant) return 'rgba(0, 210, 106, 0.1)';
    return 'rgba(255, 149, 0, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.$isSignificant) return 'rgba(0, 210, 106, 0.3)';
    return 'rgba(255, 149, 0, 0.3)';
  }};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const ExperimentAnalysisConclusionText = styled.p`
  color: #eaeaea;
  margin: 0;
  line-height: 1.6;
  font-size: 1rem;
`;

const ExperimentAnalysisRecommendation = styled.div`
  background: #1a1a2e;
  border-left: 3px solid ${props => {
    if (props.$priority === 'high') return '#f8312f';
    if (props.$priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ExperimentAnalysisRecommendationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const ExperimentAnalysisRecommendationPriority = styled.span`
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: ${props => {
    if (props.$priority === 'high') return 'rgba(248, 49, 47, 0.2)';
    if (props.$priority === 'medium') return 'rgba(255, 176, 32, 0.2)';
    return 'rgba(0, 210, 106, 0.2)';
  }};
  color: ${props => {
    if (props.$priority === 'high') return '#f8312f';
    if (props.$priority === 'medium') return '#ffb020';
    return '#00d26a';
  }};
  font-weight: 600;
  text-transform: uppercase;
`;

const ExperimentAnalysisRecommendationTitle = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  font-weight: 600;
`;

const ExperimentAnalysisRecommendationDescription = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const ExperimentAnalysisRecommendationAction = styled.div`
  font-size: 0.75rem;
  color: #7b2cbf;
  font-weight: 500;
`;

const ExperimentAnalysisInsight = styled.div`
  background: #1a1a2e;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.75rem;
`;

const ExperimentAnalysisInsightTitle = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const ExperimentAnalysisInsightContent = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  line-height: 1.5;
`;

const ExperimentAnalysisNextStep = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 6px;
  margin-bottom: 0.75rem;
`;

const ExperimentAnalysisNextStepOrder = styled.div`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7b2cbf 0%, #e94560 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
`;

const ExperimentAnalysisNextStepContent = styled.div`
  flex: 1;
`;

const ExperimentAnalysisNextStepAction = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ExperimentAnalysisNextStepDetails = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const ExperimentAnalysisNextStepTimeframe = styled.div`
  font-size: 0.75rem;
  color: #7b2cbf;
  font-weight: 500;
`;

// A/B Testing Components
const ExperimentsContainer = styled(ChartContainer)`
  margin-bottom: 2rem;
`;

const ExperimentsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ExperimentsTitle = styled.h3`
  font-size: 1.5rem;
  color: #eaeaea;
  margin: 0;
`;

const ExperimentsStats = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ExperimentStatBadge = styled.div`
  background: ${props => props.color || '#16213e'};
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ExperimentStatLabel = styled.span`
  color: #a0a0a0;
`;

const ExperimentStatValue = styled.span`
  color: #eaeaea;
  font-weight: 600;
`;

const ExperimentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const ExperimentCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
    transform: translateY(-2px);
  }
`;

const ExperimentCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ExperimentTitle = styled.h4`
  font-size: 1.125rem;
  color: #eaeaea;
  margin: 0 0 0.5rem 0;
`;

const ExperimentType = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ExperimentStatusBadge = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.status) {
      case 'running':
        return `
          background: rgba(0, 210, 106, 0.2);
          color: #00d26a;
        `;
      case 'completed':
        return `
          background: rgba(123, 44, 191, 0.2);
          color: #7b2cbf;
        `;
      case 'draft':
        return `
          background: rgba(255, 149, 0, 0.2);
          color: #ff9500;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        `;
    }
  }}
`;

const ExperimentMetrics = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
`;

const ExperimentVariant = styled.div`
  text-align: center;
`;

const ExperimentVariantLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const ExperimentVariantValue = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: ${props => props.$winner ? '#00d26a' : '#eaeaea'};
`;

const ExperimentWinner = styled.div`
  background: ${props => props.winner === 'variantB'
    ? 'rgba(0, 210, 106, 0.1)'
    : 'rgba(123, 44, 191, 0.1)'};
  border-left: 3px solid ${props => props.winner === 'variantB'
    ? '#00d26a'
    : '#7b2cbf'};
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 1rem;
`;

const ExperimentWinnerLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const ExperimentWinnerValue = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  font-weight: 600;
`;

const AnalyzeButton = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #7b2cbf 0%, #e94560 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ExperimentProgress = styled.div`
  margin-top: 1rem;
`;

const ExperimentProgressBar = styled.div`
  height: 6px;
  background: #1a1a2e;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ExperimentProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560 0%, #7b2cbf 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
  width: ${props => props.$percentage}%;
`;

const ExperimentProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const CreateExperimentButton = styled.button`
  background: linear-gradient(135deg, #e94560, #7b2cbf);
  border: none;
  color: #eaeaea;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }
`;

const EmptyExperiments = styled.div`
  text-align: center;
  padding: 3rem;
  background: #16213e;
  border-radius: 12px;
  border: 1px dashed #2d3561;

  div {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h4 {
    color: #eaeaea;
    margin-bottom: 0.5rem;
  }

  p {
    color: #a0a0a0;
    font-size: 0.875rem;
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
  const [competitorMonitoring, setCompetitorMonitoring] = useState(null);
  const [asoScore, setAsoscore] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [experiments, setExperiments] = useState(null);
  const [experimentStats, setExperimentStats] = useState(null);
  const [analysisModal, setAnalysisModal] = useState({ isOpen: false, experimentId: null, analysis: null });
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
    fetchCompetitorMonitoring();
    fetchASOScore();
    fetchWeeklyReport();
    fetchExperiments();
    fetchExperimentStats();
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
      setMrrData(null);
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
      setUserGrowthData(null);
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
      setCacData(null);
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
      setAcquisitionData(null);
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
      setRevenueSpendData(null);
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
      setRoiData(null);
    }
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
      setFunnelData(null);
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
      const response = await fetch('/api/aso/category/stats');
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
      const response = await fetch('/api/aso/category/sync', {
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

  const fetchCompetitorMonitoring = async () => {
    try {
      // Fetch competitor insights
      const insightsResponse = await fetch('/api/aso/competitors/insights');
      const insightsData = await insightsResponse.json();

      // Fetch competitor gaps
      const gapsResponse = await fetch('/api/aso/competitors/gaps');
      const gapsData = await gapsResponse.json();

      // Fetch competitor data
      const dataResponse = await fetch('/api/aso/competitors/data');
      const dataResult = await dataResponse.json();

      if (insightsData.success || gapsData.success || dataResult.success) {
        setCompetitorMonitoring({
          insights: insightsData.success ? insightsData.data : null,
          gaps: gapsData.success ? gapsData.data : null,
          competitors: dataResult.success ? dataResult.data : []
        });
      }
    } catch (error) {
      console.error('Error fetching competitor monitoring data:', error);
      // Set mock data on error
      setCompetitorMonitoring({
        insights: {
          summary: 'Tracking 45 keywords across 5 competitors. On average, competitors rank 8 positions better than us. Found 12 high-priority and 8 medium-priority keyword gaps.',
          topGaps: [
            {
              competitorAppName: 'Episode',
              keyword: 'romance stories',
              ourRanking: 28,
              competitorRanking: 3,
              gap: 25,
              opportunityLevel: 'high'
            },
            {
              competitorAppName: 'Chapters',
              keyword: 'interactive stories',
              ourRanking: 35,
              competitorRanking: 8,
              gap: 27,
              opportunityLevel: 'high'
            },
            {
              competitorAppName: 'Choices',
              keyword: 'romantic games',
              ourRanking: 22,
              competitorRanking: 5,
              gap: 17,
              opportunityLevel: 'high'
            }
          ],
          recommendations: [
            {
              type: 'keyword_gap',
              priority: 'high',
              title: 'Optimize for "romance stories"',
              description: 'We rank #28 while Episode ranks #3. Consider adding this keyword to your app metadata.',
              keyword: 'romance stories',
              competitor: 'Episode',
              potentialGain: 89
            }
          ],
          competitiveThreats: [
            {
              keyword: 'romance stories',
              volume: 8500,
              ourRanking: 28,
              threats: [
                { competitor: 'Episode', ranking: 3, gap: 25 },
                { competitor: 'Chapters', ranking: 7, gap: 21 }
              ]
            }
          ],
          opportunities: [
            {
              keyword: 'otome games',
              ourRanking: 12,
              competitorRanking: 24,
              advantage: 12,
              competitorAppName: 'Chapters'
            }
          ]
        },
        gaps: {
          totalGaps: 20,
          highOpportunity: 12,
          mediumOpportunity: 8,
          gaps: [
            {
              competitorAppName: 'Episode',
              keyword: 'romance stories',
              ourRanking: 28,
              competitorRanking: 3,
              gap: 25,
              opportunityLevel: 'high'
            },
            {
              competitorAppName: 'Chapters',
              keyword: 'interactive stories',
              ourRanking: 35,
              competitorRanking: 8,
              gap: 27,
              opportunityLevel: 'high'
            }
          ]
        },
        competitors: [
          {
            competitorAppId: 'com.episode.romance',
            competitorAppName: 'Episode',
            keywordsTracked: 45,
            highOpportunityGaps: 8,
            mediumOpportunityGaps: 6,
            averageGap: -12.5,
            lastChecked: new Date().toISOString()
          },
          {
            competitorAppId: 'com.chapter.choosing',
            competitorAppName: 'Chapters',
            keywordsTracked: 42,
            highOpportunityGaps: 7,
            mediumOpportunityGaps: 5,
            averageGap: -10.2,
            lastChecked: new Date().toISOString()
          }
        ]
      });
    }
  };

  const fetchASOScore = async () => {
    try {
      const response = await fetch('/api/aso/score');
      const result = await response.json();

      if (result.success) {
        setAsoscore(result.data);
      }
    } catch (error) {
      console.error('Error fetching ASO score:', error);
      // Set mock data on error
      setAsoscore({
        overallScore: 73,
        keywordScore: 68,
        metadataScore: 75,
        visualScore: 78,
        ratingsScore: 84,
        conversionScore: 70,
        factors: {
          keywordRanking: { score: 65, weight: 0.10, description: 'Average ranking of target keywords' },
          keywordCoverage: { score: 72, weight: 0.08, description: 'Percentage of tracked keywords ranking in top 50' },
          keywordRelevance: { score: 70, weight: 0.07, description: 'Relevance of keywords to app category' },
          keywordDensity: { score: 65, weight: 0.05, description: 'Keyword usage in title, subtitle, description' },
          titleOptimization: { score: 75, weight: 0.10, description: 'Title length, keyword inclusion, clarity' },
          subtitleOptimization: { score: 72, weight: 0.08, description: 'Subtitle length, keyword inclusion' },
          descriptionQuality: { score: 78, weight: 0.07, description: 'Description length, readability, keyword usage' },
          iconQuality: { score: 75, weight: 0.10, description: 'Icon clarity, branding, emotional appeal' },
          screenshotQuality: { score: 80, weight: 0.06, description: 'Screenshot quality, captions, appeal' },
          visualConsistency: { score: 78, weight: 0.04, description: 'Consistent branding across visuals' },
          averageRating: { score: 84, weight: 0.08, description: 'App store average rating' },
          ratingCount: { score: 60, weight: 0.04, description: 'Number of ratings' },
          reviewSentiment: { score: 78, weight: 0.03, description: 'Positive review sentiment' },
          conversionRate: { score: 70, weight: 0.06, description: 'Product page to download conversion rate' },
          categoryRanking: { score: 98, weight: 0.04, description: 'Ranking in primary category' }
        },
        recommendations: [
          {
            category: 'keyword',
            priority: 'high',
            title: 'Improve keyword rankings',
            description: 'Current average ranking is low. Focus on optimizing app metadata and building organic installs for better rankings.',
            expectedImpact: 35,
            implemented: false
          },
          {
            category: 'ratings',
            priority: 'high',
            title: 'Increase review count',
            description: 'Low number of ratings. Implement review prompts and improve user engagement to get more ratings.',
            expectedImpact: 40,
            implemented: false
          },
          {
            category: 'conversion',
            priority: 'medium',
            title: 'Improve conversion rate',
            description: 'Current conversion rate is low. Optimize product page visuals, description, and screenshots to improve conversions.',
            expectedImpact: 30,
            implemented: false
          }
        ],
        competitorComparison: [
          {
            competitorAppName: 'Episode',
            competitorScore: 78,
            scoreDifference: -5
          },
          {
            competitorAppName: 'Chapters',
            competitorScore: 75,
            scoreDifference: -2
          },
          {
            competitorAppName: 'Choices',
            competitorScore: 72,
            scoreDifference: 1
          }
        ]
      });
    }
  };

  const fetchWeeklyReport = async () => {
    try {
      const response = await fetch('/api/reports/aso/weekly');
      const result = await response.json();

      if (result.success && result.data) {
        setWeeklyReport(result.data);
      } else {
        // Set mock data if no report exists yet
        setWeeklyReport({
          weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          weekEnd: new Date(),
          year: new Date().getFullYear(),
          weekNumber: getISOWeek(new Date()),
          overallScore: {
            current: 73,
            previous: 70,
            change: 3,
            trend: 'up'
          },
          componentScores: {
            keywordScore: { current: 68, previous: 65, change: 3, trend: 'up' },
            metadataScore: { current: 75, previous: 74, change: 1, trend: 'up' },
            visualScore: { current: 78, previous: 76, change: 2, trend: 'up' },
            ratingsScore: { current: 84, previous: 84, change: 0, trend: 'stable' },
            conversionScore: { current: 70, previous: 68, change: 2, trend: 'up' }
          },
          keywordRankings: {
            totalTracked: 16,
            inTop10: 2,
            inTop25: 5,
            inTop50: 11,
            notRanked: 5,
            averageRanking: 38,
            medianRanking: 35
          },
          rankingChanges: {
            improved: 8,
            declined: 3,
            stable: 5,
            new: 0,
            topMovers: [
              { keyword: 'romance stories', previousRanking: 25, currentRanking: 12, change: 13, volume: 8500 },
              { keyword: 'interactive stories', previousRanking: 18, currentRanking: 8, change: 10, volume: 4500 },
              { keyword: 'spicy stories', previousRanking: 45, currentRanking: 32, change: 13, volume: 3200 }
            ]
          },
          categoryRanking: {
            current: { ranking: 42, percentile: 98 },
            previous: { ranking: 48, percentile: 97 },
            change: 6,
            trend: 'up'
          },
          highlights: [
            { type: 'milestone', title: '2 Keywords in Top 10', description: 'Great progress! You have 2 keywords ranking in the top 10.', metric: 'Top 10 Keywords', value: '2' },
            { type: 'improvement', title: 'Big Jump: "romance stories"', description: 'Improved 13 positions this week, now ranking #12!', metric: 'Ranking Improvement', value: '+13 positions' },
            { type: 'milestone', title: 'Strong ASO Score', description: 'Your overall ASO score is 73, indicating strong optimization!', metric: 'ASO Score', value: '73' }
          ],
          recommendations: [
            {
              priority: 'high',
              category: 'keyword',
              title: 'Optimize High-Volume Keywords',
              description: '3 high-volume keywords are not ranking in the top 50.',
              actionItem: 'Focus on these keywords: romance novels, love stories, story games',
              expectedImpact: 'Significant traffic increase',
              estimatedEffort: 'moderate'
            },
            {
              priority: 'medium',
              category: 'metadata',
              title: 'Improve App Description',
              description: 'Add more relevant keywords to improve discoverability.',
              actionItem: 'Review and update app description with missing keywords',
              expectedImpact: 'Better keyword rankings',
              estimatedEffort: 'quick'
            },
            {
              priority: 'medium',
              category: 'visual',
              title: 'Test New Screenshots',
              description: 'Consider A/B testing new screenshot designs.',
              actionItem: 'Create 3-5 new screenshot variations highlighting key features',
              expectedImpact: 'Improved conversion rate',
              estimatedEffort: 'moderate'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching weekly report:', error);
      // Set mock data on error
      setWeeklyReport({
        overallScore: { current: 73, previous: 70, change: 3, trend: 'up' },
        keywordRankings: { totalTracked: 16, inTop10: 2, inTop25: 5, inTop50: 11, averageRanking: 38 },
        highlights: [],
        recommendations: []
      });
    }
  };

  const fetchExperiments = async () => {
    try {
      const response = await fetch('/api/experiments');
      const result = await response.json();

      if (result.success && result.data) {
        setExperiments(result.data);
      } else {
        // Set mock data if no experiments exist yet
        setExperiments([
          {
            _id: 'exp_mock_1',
            name: 'Icon Test - Romantic vs Minimalist',
            type: 'icon',
            status: 'completed',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            duration: 14,
            metric: 'conversionRate',
            variantA: {
              name: 'Control',
              iconUrl: '/mock-icons/control-icon.png',
              description: 'Current romantic-style icon with couple illustration'
            },
            variantB: {
              name: 'Treatment',
              iconUrl: '/mock-icons/treatment-icon.png',
              description: 'Minimalist icon with heart silhouette'
            },
            variantAConversions: 456,
            variantBConversions: 523,
            variantAViews: 12500,
            variantBViews: 12450,
            variantAConversionRate: 3.65,
            variantBConversionRate: 4.20,
            winner: 'variantB',
            significance: 0.02,
            confidence: 98,
            lift: 15.1,
            conclusion: 'The minimalist icon performed significantly better with 15.1% lift in conversion rate.',
            createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
          },
          {
            _id: 'exp_mock_2',
            name: 'Subtitle Test - Keyword Focus',
            type: 'subtitle',
            status: 'running',
            startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            duration: 14,
            metric: 'conversionRate',
            variantA: {
              name: 'Control',
              subtitle: 'Romantic Stories',
              description: 'Current subtitle emphasizing story genre'
            },
            variantB: {
              name: 'Treatment',
              subtitle: 'Interactive Romance',
              description: 'New subtitle emphasizing interactive gameplay'
            },
            variantAConversions: 89,
            variantBConversions: 102,
            variantAViews: 3200,
            variantBViews: 3150,
            variantAConversionRate: 2.78,
            variantBConversionRate: 3.24,
            winner: 'pending',
            significance: 0.15,
            confidence: 85,
            lift: 0,
            automaticallyStarted: true,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          {
            _id: 'exp_mock_3',
            name: 'Screenshot Test - Character Focus',
            type: 'screenshots',
            status: 'draft',
            duration: 14,
            metric: 'conversionRate',
            variantA: {
              name: 'Control',
              screenshotUrls: ['/mock/ss/control-1.png', '/mock/ss/control-2.png'],
              description: 'Current screenshots showing story interface'
            },
            variantB: {
              name: 'Treatment',
              screenshotUrls: ['/mock/ss/treatment-1.png', '/mock/ss/treatment-2.png'],
              description: 'New screenshots emphasizing character emotions'
            },
            variantAConversions: 0,
            variantBConversions: 0,
            variantAViews: 0,
            variantBViews: 0,
            winner: 'pending',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching experiments:', error);
      // Set mock data on error
      setExperiments([]);
    }
  };

  const fetchExperimentStats = async () => {
    try {
      const response = await fetch('/api/experiments/stats');
      const result = await response.json();

      if (result.success && result.data) {
        setExperimentStats(result.data);
      } else {
        // Set mock stats
        setExperimentStats({
          total: 3,
          draft: 1,
          running: 1,
          completed: 1,
          cancelled: 0,
          averageLift: '15.1%',
          byType: {
            icon: 1,
            screenshots: 1,
            subtitle: 1
          }
        });
      }
    } catch (error) {
      console.error('Error fetching experiment stats:', error);
      // Set mock stats on error
      setExperimentStats({
        total: 3,
        draft: 1,
        running: 1,
        completed: 1,
        cancelled: 0,
        averageLift: '15.1%',
        byType: {}
      });
    }
  };

  const fetchAnalysis = async (experimentId) => {
    try {
      const response = await fetch(`/api/experiments/${experimentId}/analyze`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      } else {
        // Return mock analysis data if API fails
        return {
          experiment: {
            id: experimentId,
            name: 'Icon Test - Romantic vs Minimalist',
            type: 'icon',
            status: 'completed',
            duration: 14
          },
          results: {
            variantA: {
              name: 'Control',
              views: 12500,
              conversions: 456,
              conversionRate: '3.65%'
            },
            variantB: {
              name: 'Treatment',
              views: 12450,
              conversions: 523,
              conversionRate: '4.20%'
            }
          },
          statistics: {
            winner: 'variantB',
            significance: '0.0200',
            confidence: '98.0%',
            lift: '15.10%',
            isSignificant: true,
            confidenceLevel: '95%'
          },
          sampleSize: {
            totalViews: 24950,
            totalConversions: 979,
            targetSampleSize: 1000,
            sufficient: true,
            durationElapsed: true,
            completionPercentage: '100%'
          },
          conclusion: 'Highly Significant Result: Treatment outperformed Control with 15.1% lift (4.20% vs 3.65% conversion rate). Statistical confidence: 95%. This result is very reliable and should inform immediate action.',
          recommendations: [
            {
              priority: 'high',
              type: 'implement_winner',
              title: 'Implement Treatment',
              description: 'The winning variant showed 15.1% lift with 98% confidence.',
              action: 'Apply the winning variant to the App Store production listing.'
            },
            {
              priority: 'medium',
              type: 'apply_learning',
              title: 'Apply Design Learning',
              description: 'Consider applying the winning design principles to other app store assets.',
              action: 'Review screenshot and design elements for consistency with winning icon style.'
            }
          ],
          insights: [
            {
              type: 'sample_size',
              title: 'Sample Size Analysis',
              content: 'Collected 24,950 total views with 979 conversions. Overall conversion rate: 3.92%.'
            },
            {
              type: 'statistical_power',
              title: 'Statistical Confidence',
              content: 'Results are statistically significant with 98% confidence. This is a reliable result.'
            }
          ],
          nextSteps: [
            {
              order: 1,
              action: 'Implement winning variant',
              details: 'Apply Treatment to production.',
              timeframe: 'Immediate'
            },
            {
              order: 2,
              action: 'Document learnings',
              details: 'Record what worked and why for future reference.',
              timeframe: 'This week'
            }
          ],
          generatedAt: new Date(),
          completedAt: new Date()
        };
      }
    } catch (error) {
      console.error('Error fetching experiment analysis:', error);
      return null;
    }
  };

  const getISOWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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

              <ExperimentAnalysisSection>
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
              </ExperimentAnalysisSection>
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


          {/* ASO Score Section */}
          {asoScore && (
            <ASOScoreContainer>
              <ASOScoreHeader>
                <ASOScoreTitle>
                  📊 ASO Score
                </ASOScoreTitle>
                <ASOScoreRefreshButton onClick={() => {
                  fetch('/api/aso/score/calculate', { method: 'POST' })
                    .then(res => res.json())
                    .then(result => {
                      if (result.success) {
                        setAsoscore(result.data);
                      }
                    });
                }}>
                  🔄 Recalculate
                </ASOScoreRefreshButton>
              </ASOScoreHeader>

              {/* Main Score Display */}
              <ASOScoreMain score={asoScore.overallScore}>
                <ASOScoreCircle score={asoScore.overallScore}>
                  <ASOScoreValue>{asoScore.overallScore}</ASOScoreValue>
                  <ASOScoreGrade>
                    {asoScore.overallScore >= 90 ? 'A' :
                     asoScore.overallScore >= 80 ? 'B' :
                     asoScore.overallScore >= 70 ? 'C' :
                     asoScore.overallScore >= 60 ? 'D' : 'F'}
                  </ASOScoreGrade>
                  <ASOScoreLabel>
                    {asoScore.overallScore >= 90 ? 'Excellent' :
                     asoScore.overallScore >= 80 ? 'Good' :
                     asoScore.overallScore >= 70 ? 'Fair' :
                     asoScore.overallScore >= 60 ? 'Poor' : 'Critical'}
                  </ASOScoreLabel>
                </ASOScoreCircle>
                <ASOScoreDetails>
                  <ASOScoreOverallLabel>Overall App Store Optimization Score</ASOScoreOverallLabel>
                  <ASOScoreOverallValue>{asoScore.overallScore}/100</ASOScoreOverallValue>
                  <ASOScoreDescription>
                    Your ASO score measures how well your app is optimized for the App Store.
                    It considers keywords, metadata, visuals, ratings, and conversion performance.
                  </ASOScoreDescription>
                </ASOScoreDetails>
              </ASOScoreMain>

              {/* Component Scores Grid */}
              <ASOScoreComponentsGrid>
                {/* Keyword Score */}
                <ASOScoreComponentCard>
                  <ASOScoreComponentHeader>
                    <ASOScoreComponentName>🔑 Keywords</ASOScoreComponentName>
                    <ASOScoreComponentValue score={asoScore.keywordScore}>{asoScore.keywordScore}</ASOScoreComponentValue>
                  </ASOScoreComponentHeader>
                  <ASOScoreComponentBar>
                    <ASOScoreComponentFill score={asoScore.keywordScore} />
                  </ASOScoreComponentBar>
                  <ASOScoreComponentFactors>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Ranking</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.keywordRanking?.score}>{asoScore.factors.keywordRanking?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Coverage</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.keywordCoverage?.score}>{asoScore.factors.keywordCoverage?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Relevance</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.keywordRelevance?.score}>{asoScore.factors.keywordRelevance?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Density</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.keywordDensity?.score}>{asoScore.factors.keywordDensity?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                  </ASOScoreComponentFactors>
                </ASOScoreComponentCard>

                {/* Metadata Score */}
                <ASOScoreComponentCard>
                  <ASOScoreComponentHeader>
                    <ASOScoreComponentName>📝 Metadata</ASOScoreComponentName>
                    <ASOScoreComponentValue score={asoScore.metadataScore}>{asoScore.metadataScore}</ASOScoreComponentValue>
                  </ASOScoreComponentHeader>
                  <ASOScoreComponentBar>
                    <ASOScoreComponentFill score={asoScore.metadataScore} />
                  </ASOScoreComponentBar>
                  <ASOScoreComponentFactors>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Title</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.titleOptimization?.score}>{asoScore.factors.titleOptimization?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Subtitle</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.subtitleOptimization?.score}>{asoScore.factors.subtitleOptimization?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Description</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.descriptionQuality?.score}>{asoScore.factors.descriptionQuality?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                  </ASOScoreComponentFactors>
                </ASOScoreComponentCard>

                {/* Visual Score */}
                <ASOScoreComponentCard>
                  <ASOScoreComponentHeader>
                    <ASOScoreComponentName>🎨 Visuals</ASOScoreComponentName>
                    <ASOScoreComponentValue score={asoScore.visualScore}>{asoScore.visualScore}</ASOScoreComponentValue>
                  </ASOScoreComponentHeader>
                  <ASOScoreComponentBar>
                    <ASOScoreComponentFill score={asoScore.visualScore} />
                  </ASOScoreComponentBar>
                  <ASOScoreComponentFactors>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Icon</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.iconQuality?.score}>{asoScore.factors.iconQuality?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Screenshots</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.screenshotQuality?.score}>{asoScore.factors.screenshotQuality?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Consistency</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.visualConsistency?.score}>{asoScore.factors.visualConsistency?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                  </ASOScoreComponentFactors>
                </ASOScoreComponentCard>

                {/* Ratings Score */}
                <ASOScoreComponentCard>
                  <ASOScoreComponentHeader>
                    <ASOScoreComponentName>⭐ Ratings</ASOScoreComponentName>
                    <ASOScoreComponentValue score={asoScore.ratingsScore}>{asoScore.ratingsScore}</ASOScoreComponentValue>
                  </ASOScoreComponentHeader>
                  <ASOScoreComponentBar>
                    <ASOScoreComponentFill score={asoScore.ratingsScore} />
                  </ASOScoreComponentBar>
                  <ASOScoreComponentFactors>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Average Rating</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.averageRating?.score}>{asoScore.factors.averageRating?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Rating Count</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.ratingCount?.score}>{asoScore.factors.ratingCount?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Sentiment</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.reviewSentiment?.score}>{asoScore.factors.reviewSentiment?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                  </ASOScoreComponentFactors>
                </ASOScoreComponentCard>

                {/* Conversion Score */}
                <ASOScoreComponentCard>
                  <ASOScoreComponentHeader>
                    <ASOScoreComponentName>📈 Conversion</ASOScoreComponentName>
                    <ASOScoreComponentValue score={asoScore.conversionScore}>{asoScore.conversionScore}</ASOScoreComponentValue>
                  </ASOScoreComponentHeader>
                  <ASOScoreComponentBar>
                    <ASOScoreComponentFill score={asoScore.conversionScore} />
                  </ASOScoreComponentBar>
                  <ASOScoreComponentFactors>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Conversion Rate</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.conversionRate?.score}>{asoScore.factors.conversionRate?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                    <ASOScoreFactor>
                      <ASOScoreFactorName>Category Ranking</ASOScoreFactorName>
                      <ASOScoreFactorScore score={asoScore.factors.categoryRanking?.score}>{asoScore.factors.categoryRanking?.score}</ASOScoreFactorScore>
                    </ASOScoreFactor>
                  </ASOScoreComponentFactors>
                </ASOScoreComponentCard>
              </ASOScoreComponentsGrid>

              {/* Recommendations */}
              {asoScore.recommendations && asoScore.recommendations.length > 0 && (
                <ASOScoreRecommendations>
                  <ASOScoreRecommendationsTitle>💡 Optimization Recommendations</ASOScoreRecommendationsTitle>
                  {asoScore.recommendations.slice(0, 5).map((rec, index) => (
                    <ASOScoreRecommendationCard key={index} priority={rec.priority}>
                      <ASOScoreRecommendationBadge priority={rec.priority}>
                        {rec.priority}
                      </ASOScoreRecommendationBadge>
                      <ASOScoreRecommendationContent>
                        <ASOScoreRecommendationTitle>{rec.title}</ASOScoreRecommendationTitle>
                        <ASOScoreRecommendationDescription>{rec.description}</ASOScoreRecommendationDescription>
                        <ASOScoreRecommendationImpact impact={rec.expectedImpact}>
                          Potential improvement: +{rec.expectedImpact} points
                        </ASOScoreRecommendationImpact>
                      </ASOScoreRecommendationContent>
                    </ASOScoreRecommendationCard>
                  ))}
                </ASOScoreRecommendations>
              )}

              {/* Competitor Comparison */}
              {asoScore.competitorComparison && asoScore.competitorComparison.length > 0 && (
                <ASOScoreComparison>
                  <ASOScoreComparisonTitle>🏆 Competitor Comparison</ASOScoreComparisonTitle>
                  <ASOScoreComparisonList>
                    {asoScore.competitorComparison.map((comp, index) => (
                      <ASOScoreComparisonItem key={index}>
                        <ASOScoreComparisonCompetitor>{comp.competitorAppName}</ASOScoreComparisonCompetitor>
                        <ASOScoreComparisonScores>
                          <ASOScoreComparisonCompetitorScore>{comp.competitorScore}</ASOScoreComparisonCompetitorScore>
                          <ASOScoreComparisonDifference difference={comp.scoreDifference}>
                            {comp.scoreDifference > 0 ? `+${comp.scoreDifference}` : comp.scoreDifference}
                          </ASOScoreComparisonDifference>
                        </ASOScoreComparisonScores>
                      </ASOScoreComparisonItem>
                    ))}
                  </ASOScoreComparisonList>
                </ASOScoreComparison>
              )}
            </ASOScoreContainer>
          )}

          {/* Competitor Keyword Monitoring Section */}
          {competitorMonitoring && (
            <CompetitorMonitoringContainer>
              <CompetitorMonitoringTitle>
                🎯 Competitor Keyword Monitoring
              </CompetitorMonitoringTitle>

              {/* Summary */}
              {competitorMonitoring.insights?.summary && (
                <CompetitorSummary>
                  <CompetitorSummaryText>
                    {competitorMonitoring.insights.summary}
                  </CompetitorSummaryText>
                </CompetitorSummary>
              )}

              {/* Competitors Grid */}
              {competitorMonitoring.competitors && competitorMonitoring.competitors.length > 0 && (
                <CompetitorKeywordGrid>
                  {competitorMonitoring.competitors.map((competitor, index) => (
                    <CompetitorKeywordCard key={index}>
                      <CompetitorKeywordCardHeader>
                        <CompetitorKeywordName>{competitor.competitorAppName}</CompetitorKeywordName>
                        <CompetitorKeywordBadge priority={
                          competitor.highOpportunityGaps > 5 ? 'high' :
                          competitor.highOpportunityGaps > 0 ? 'medium' : 'low'
                        }>
                          {competitor.highOpportunityGaps} high-priority gaps
                        </CompetitorKeywordBadge>
                      </CompetitorKeywordCardHeader>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2d3561'}}>
                          <span style={{color: '#a0a0a0', fontSize: '0.875rem'}}>Keywords Tracked</span>
                          <span style={{color: competitor.keywordsTracked >= 0 ? '#00d26a' : '#f8312f', fontWeight: 'bold', fontSize: '0.875rem'}}>{competitor.keywordsTracked}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2d3561'}}>
                          <span style={{color: '#a0a0a0', fontSize: '0.875rem'}}>High Opportunity Gaps</span>
                          <span style={{color: -competitor.highOpportunityGaps >= 0 ? '#00d26a' : '#f8312f', fontWeight: 'bold', fontSize: '0.875rem'}}>{competitor.highOpportunityGaps}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2d3561'}}>
                          <span style={{color: '#a0a0a0', fontSize: '0.875rem'}}>Medium Opportunity Gaps</span>
                          <span style={{color: -competitor.mediumOpportunityGaps >= 0 ? '#00d26a' : '#f8312f', fontWeight: 'bold', fontSize: '0.875rem'}}>{competitor.mediumOpportunityGaps}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2d3561'}}>
                          <span style={{color: '#a0a0a0', fontSize: '0.875rem'}}>Average Gap</span>
                          <span style={{color: competitor.averageGap >= 0 ? '#00d26a' : '#f8312f', fontWeight: 'bold', fontSize: '0.875rem'}}>{competitor.averageGap > 0 ? '+' : ''}{competitor.averageGap} positions</span>
                        </div>
                      </div>
                    </CompetitorKeywordCard>
                  ))}
                </CompetitorKeywordGrid>
              )}

              {/* Top Keyword Gaps */}
              {competitorMonitoring.gaps?.gaps && competitorMonitoring.gaps.gaps.length > 0 && (
                <KeywordGapsSection>
                  <KeywordGapsHeader>
                    <KeywordGapsTitle>
                      🚨 Top Keyword Gaps ({competitorMonitoring.gaps.totalGaps} total)
                    </KeywordGapsTitle>
                  </KeywordGapsHeader>
                  {competitorMonitoring.gaps.gaps.slice(0, 10).map((gap, index) => (
                    <KeywordGapCard
                      key={index}
                      opportunity={gap.opportunityLevel}
                    >
                      <KeywordGapInfo>
                        <KeywordGapKeyword>{gap.keyword}</KeywordGapKeyword>
                        <KeywordGapDetails>
                          vs {gap.competitorAppName} • {gap.opportunityLevel === 'high' ? 'High' : 'Medium'} priority
                        </KeywordGapDetails>
                      </KeywordGapInfo>
                      <KeywordGapRanking>
                        <KeywordGapOurRanking isBetter={gap.ourRanking < gap.competitorRanking}>
                          #{gap.ourRanking}
                        </KeywordGapOurRanking>
                        <KeywordGapCompetitorRanking>
                          They rank #{gap.competitorRanking}
                        </KeywordGapCompetitorRanking>
                      </KeywordGapRanking>
                    </KeywordGapCard>
                  ))}
                </KeywordGapsSection>
              )}

              {/* Recommendations */}
              {competitorMonitoring.insights?.recommendations && competitorMonitoring.insights.recommendations.length > 0 && (
                <RecommendationsSection>
                  <KeywordGapsHeader>
                    <KeywordGapsTitle>💡 Recommendations</KeywordGapsTitle>
                  </KeywordGapsHeader>
                  {competitorMonitoring.insights.recommendations.slice(0, 5).map((rec, index) => (
                    <RecommendationCard key={index}>
                      <RecommendationHeader>
                        <RecommendationTitle>{rec.title}</RecommendationTitle>
                        <RecommendationPriority priority={rec.priority}>
                          {rec.priority.toUpperCase()}
                        </RecommendationPriority>
                      </RecommendationHeader>
                      <RecommendationDescription>{rec.description}</RecommendationDescription>
                      <RecommendationMeta>
                        {rec.keyword && (
                          <RecommendationMetaItem>🔑 {rec.keyword}</RecommendationMetaItem>
                        )}
                        {rec.competitor && (
                          <RecommendationMetaItem>🎯 vs {rec.competitor}</RecommendationMetaItem>
                        )}
                        {rec.potentialGain && (
                          <RecommendationMetaItem>📈 +{rec.potentialGain}% potential</RecommendationMetaItem>
                        )}
                      </RecommendationMeta>
                    </RecommendationCard>
                  ))}
                </RecommendationsSection>
              )}

              {/* Competitive Threats */}
              {competitorMonitoring.insights?.competitiveThreats && competitorMonitoring.insights.competitiveThreats.length > 0 && (
                <ThreatsSection>
                  <KeywordGapsHeader>
                    <KeywordGapsTitle>⚠️ Competitive Threats</KeywordGapsTitle>
                  </KeywordGapsHeader>
                  {competitorMonitoring.insights.competitiveThreats.map((threat, index) => (
                    <ThreatCard key={index}>
                      <ThreatHeader>
                        <ThreatKeyword>{threat.keyword}</ThreatKeyword>
                        <ThreatVolume>Volume: {threat.volume.toLocaleString()}</ThreatVolume>
                      </ThreatHeader>
                      <ThreatList>
                        {threat.threats.map((t, tIndex) => (
                          <ThreatItem key={tIndex}>
                            <ThreatCompetitor>{t.competitor}</ThreatCompetitor>
                            <ThreatRanking>Rank #{t.ranking} (gap: {t.gap})</ThreatRanking>
                          </ThreatItem>
                        ))}
                      </ThreatList>
                    </ThreatCard>
                  ))}
                </ThreatsSection>
              )}
            </CompetitorMonitoringContainer>
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

          {/* Weekly ASO Report Section */}
          {weeklyReport && (
            <WeeklyReportContainer>
              <ReportHeader>
                <ReportPeriod>
                  <ReportTitle>📊 Weekly ASO Report</ReportTitle>
                  <ReportPeriodBadge>
                    Week {weeklyReport.weekNumber} • {weeklyReport.year}
                  </ReportPeriodBadge>
                </ReportPeriod>
                <ReportActions>
                  <ReportActionButton onClick={() => {
                    // Send to chat notification
                    const summary = `
📊 Weekly ASO Report: Week ${weeklyReport.weekNumber}

Overall Score: ${weeklyReport.overallScore.current}/100 ${weeklyReport.overallScore.trend === 'up' ? '▲' : weeklyReport.overallScore.trend === 'down' ? '▼' : '─'} (${weeklyReport.overallScore.change >= 0 ? '+' : ''}${weeklyReport.overallScore.change})

📈 Keyword Rankings:
• Top 10: ${weeklyReport.keywordRankings?.inTop10 || 0}
• Top 25: ${weeklyReport.keywordRankings?.inTop25 || 0}
• Top 50: ${weeklyReport.keywordRankings?.inTop50 || 0}
• Avg: #${weeklyReport.keywordRankings?.averageRanking || 'N/A'}

✨ Highlights:
${(weeklyReport.highlights || []).slice(0, 3).map(h => `${h.type === 'improvement' ? '🟢' : h.type === 'alert' ? '⚠️' : '🏆'} ${h.title}`).join('\n')}

💡 Top Recommendations:
${(weeklyReport.recommendations || []).slice(0, 2).map(r => r.title).join('\n')}
                    `;
                    alert('Weekly report summary copied to clipboard!\n\n' + summary);
                  }}>
                    📤 Send to Chat
                  </ReportActionButton>
                  <ReportActionButton onClick={fetchWeeklyReport}>
                    🔄 Refresh
                  </ReportActionButton>
                </ReportActions>
              </ReportHeader>

              {/* Score Summary */}
              <ScoreSummaryGrid>
                <ScoreCard trend={weeklyReport.overallScore.trend}>
                  <ScoreLabel>Overall Score</ScoreLabel>
                  <ScoreValue>{weeklyReport.overallScore.current}/100</ScoreValue>
                  <ScoreChange change={weeklyReport.overallScore.change}>
                    {weeklyReport.overallScore.change >= 0 ? '▲' : '▼'} {Math.abs(weeklyReport.overallScore.change)} pts
                  </ScoreChange>
                </ScoreCard>

                {weeklyReport.componentScores && (
                  <>
                    <ScoreCard trend={weeklyReport.componentScores.keywordScore?.trend}>
                      <ScoreLabel>Keywords</ScoreLabel>
                      <ScoreValue>{weeklyReport.componentScores.keywordScore?.current || 0}/100</ScoreValue>
                      <ScoreChange change={weeklyReport.componentScores.keywordScore?.change || 0}>
                        {weeklyReport.componentScores.keywordScore?.change >= 0 ? '▲' : '▼'} {Math.abs(weeklyReport.componentScores.keywordScore?.change || 0)} pts
                      </ScoreChange>
                    </ScoreCard>

                    <ScoreCard trend={weeklyReport.componentScores.metadataScore?.trend}>
                      <ScoreLabel>Metadata</ScoreLabel>
                      <ScoreValue>{weeklyReport.componentScores.metadataScore?.current || 0}/100</ScoreValue>
                      <ScoreChange change={weeklyReport.componentScores.metadataScore?.change || 0}>
                        {weeklyReport.componentScores.metadataScore?.change >= 0 ? '▲' : '▼'} {Math.abs(weeklyReport.componentScores.metadataScore?.change || 0)} pts
                      </ScoreChange>
                    </ScoreCard>

                    <ScoreCard trend={weeklyReport.componentScores.visualScore?.trend}>
                      <ScoreLabel>Visuals</ScoreLabel>
                      <ScoreValue>{weeklyReport.componentScores.visualScore?.current || 0}/100</ScoreValue>
                      <ScoreChange change={weeklyReport.componentScores.visualScore?.change || 0}>
                        {weeklyReport.componentScores.visualScore?.change >= 0 ? '▲' : '▼'} {Math.abs(weeklyReport.componentScores.visualScore?.change || 0)} pts
                      </ScoreChange>
                    </ScoreCard>

                    <ScoreCard trend={weeklyReport.componentScores.conversionScore?.trend}>
                      <ScoreLabel>Conversion</ScoreLabel>
                      <ScoreValue>{weeklyReport.componentScores.conversionScore?.current || 0}/100</ScoreValue>
                      <ScoreChange change={weeklyReport.componentScores.conversionScore?.change || 0}>
                        {weeklyReport.componentScores.conversionScore?.change >= 0 ? '▲' : '▼'} {Math.abs(weeklyReport.componentScores.conversionScore?.change || 0)} pts
                      </ScoreChange>
                    </ScoreCard>
                  </>
                )}
              </ScoreSummaryGrid>

              {/* Keyword Summary */}
              {weeklyReport.keywordRankings && (
                <ReportSummaryGrid>
                  <SummaryItem>
                    <SummaryLabel>Tracked Keywords</SummaryLabel>
                    <SummaryValue>{weeklyReport.keywordRankings.totalTracked}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>In Top 10</SummaryLabel>
                    <SummaryValue>{weeklyReport.keywordRankings.inTop10}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>In Top 25</SummaryLabel>
                    <SummaryValue>{weeklyReport.keywordRankings.inTop25}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>Average Ranking</SummaryLabel>
                    <SummaryValue>#{weeklyReport.keywordRankings.averageRanking || 'N/A'}</SummaryValue>
                  </SummaryItem>
                  {weeklyReport.rankingChanges && (
                    <>
                      <SummaryItem>
                        <SummaryLabel>Improved</SummaryLabel>
                        <SummaryValue style={{color: '#00d26a'}}>{weeklyReport.rankingChanges.improved}</SummaryValue>
                      </SummaryItem>
                      <SummaryItem>
                        <SummaryLabel>Declined</SummaryLabel>
                        <SummaryValue style={{color: '#f8312f'}}>{weeklyReport.rankingChanges.declined}</SummaryValue>
                      </SummaryItem>
                    </>
                  )}
                </ReportSummaryGrid>
              )}

              {/* Highlights Section */}
              {weeklyReport.highlights && weeklyReport.highlights.length > 0 && (
                <HighlightsSection>
                  <ReportSectionHeading>✨ Weekly Highlights</ReportSectionHeading>
                  <HighlightsGrid>
                    {weeklyReport.highlights.map((highlight, index) => (
                      <HighlightCard key={index} type={highlight.type}>
                        <HighlightIcon>
                          {highlight.type === 'improvement' ? '🟢' : highlight.type === 'decline' ? '🔴' : highlight.type === 'alert' ? '⚠️' : '🏆'}
                        </HighlightIcon>
                        <HighlightTitle>{highlight.title}</HighlightTitle>
                        <HighlightDescription>{highlight.description}</HighlightDescription>
                      </HighlightCard>
                    ))}
                  </HighlightsGrid>
                </HighlightsSection>
              )}

              {/* Top Movers Section */}
              {weeklyReport.rankingChanges?.topMovers && weeklyReport.rankingChanges.topMovers.length > 0 && (
                <TopMoversSection>
                  <ReportSectionHeading>🚀 Top Ranking Changes This Week</ReportSectionHeading>
                  <ReportTopMoversList>
                    {weeklyReport.rankingChanges.topMovers.slice(0, 5).map((mover, index) => (
                      <TopMoverItem key={index}>
                        <TopMoverKeyword>
                          <TopMoverName>{mover.keyword}</TopMoverName>
                          <TopMoverVolume>Volume: {formatNumber(mover.volume)}</TopMoverVolume>
                        </TopMoverKeyword>
                        <TopMoverRanking>
                          <RankingChange change={mover.change}>
                            {mover.change > 0 ? '▲' : '▼'} {Math.abs(mover.change)}
                          </RankingChange>
                          <RankingValues>
                            <RankingCurrent>#{mover.currentRanking}</RankingCurrent>
                            <RankingPrevious>#{mover.previousRanking}</RankingPrevious>
                          </RankingValues>
                        </TopMoverRanking>
                      </TopMoverItem>
                    ))}
                  </ReportTopMoversList>
                </TopMoversSection>
              )}

              {/* Recommendations Section */}
              {weeklyReport.recommendations && weeklyReport.recommendations.length > 0 && (
                <ReportRecommendationsSection>
                  <ReportSectionHeading>💡 Actionable Recommendations</ReportSectionHeading>
                  <ReportRecommendationsGrid>
                    {weeklyReport.recommendations.map((rec, index) => (
                      <ReportRecommendationCard key={index} priority={rec.priority}>
                        <RecommendationHeaderRow>
                          <RecommendationCategoryBadge category={rec.category}>
                            {rec.category}
                          </RecommendationCategoryBadge>
                          <RecPriorityBadge priority={rec.priority}>
                            {rec.priority.toUpperCase()}
                          </RecPriorityBadge>
                        </RecommendationHeaderRow>
                        <ReportRecommendationTitle>{rec.title}</ReportRecommendationTitle>
                        <ReportRecommendationDesc>{rec.description}</ReportRecommendationDesc>
                        <ReportRecommendationAction>
                          <ReportActionLabel>🎯 Action Item</ReportActionLabel>
                          <ReportActionText>{rec.actionItem}</ReportActionText>
                        </ReportRecommendationAction>
                        <ReportRecommendationMeta>
                          <MetaItem>
                            💪 {rec.expectedImpact}
                          </MetaItem>
                          <MetaItem>
                            ⏱️ {rec.estimatedEffort}
                          </MetaItem>
                        </ReportRecommendationMeta>
                      </ReportRecommendationCard>
                    ))}
                  </ReportRecommendationsGrid>
                </ReportRecommendationsSection>
              )}
            </WeeklyReportContainer>
          )}

          {/* A/B Testing Section */}
          {experiments && experimentStats && (
            <ExperimentsContainer>
              <ExperimentsHeader>
                <ExperimentsTitle>🧪 A/B Testing</ExperimentsTitle>
                <ExperimentsStats>
                  <ExperimentStatBadge color="#16213e">
                    <ExperimentStatLabel>Total:</ExperimentStatLabel>
                    <ExperimentStatValue>{experimentStats.total}</ExperimentStatValue>
                  </ExperimentStatBadge>
                  <ExperimentStatBadge color="rgba(0, 210, 106, 0.2)">
                    <ExperimentStatLabel>Running:</ExperimentStatLabel>
                    <ExperimentStatValue>{experimentStats.running}</ExperimentStatValue>
                  </ExperimentStatBadge>
                  <ExperimentStatBadge color="rgba(123, 44, 191, 0.2)">
                    <ExperimentStatLabel>Completed:</ExperimentStatLabel>
                    <ExperimentStatValue>{experimentStats.completed}</ExperimentStatValue>
                  </ExperimentStatBadge>
                  <ExperimentStatBadge color="rgba(255, 149, 0, 0.2)">
                    <ExperimentStatLabel>Avg Lift:</ExperimentStatLabel>
                    <ExperimentStatValue>{experimentStats.averageLift}</ExperimentStatValue>
                  </ExperimentStatBadge>
                </ExperimentsStats>
              </ExperimentsHeader>

              {experiments.length > 0 ? (
                <ExperimentsGrid>
                  {experiments.map((experiment) => (
                    <ExperimentCard key={experiment._id}>
                      <ExperimentCardHeader>
                        <div>
                          <ExperimentTitle>{experiment.name}</ExperimentTitle>
                          <ExperimentType>{experiment.type}</ExperimentType>
                        </div>
                        <ExperimentStatusBadge status={experiment.status}>
                          {experiment.status}
                        </ExperimentStatusBadge>
                      </ExperimentCardHeader>

                      {experiment.status === 'completed' ? (
                        <>
                          <ExperimentMetrics>
                            <ExperimentVariant>
                              <ExperimentVariantLabel>Control</ExperimentVariantLabel>
                              <ExperimentVariantValue $winner={experiment.winner === 'variantA'}>
                                {experiment.variantAConversionRate.toFixed(2)}%
                              </ExperimentVariantValue>
                            </ExperimentVariant>
                            <ExperimentVariant>
                              <ExperimentVariantLabel>Treatment</ExperimentVariantLabel>
                              <ExperimentVariantValue $winner={experiment.winner === 'variantB'}>
                                {experiment.variantBConversionRate.toFixed(2)}%
                              </ExperimentVariantValue>
                            </ExperimentVariant>
                          </ExperimentMetrics>

                          {experiment.winner && experiment.winner !== 'pending' && experiment.winner !== 'inconclusive' && (
                            <ExperimentWinner winner={experiment.winner}>
                              <ExperimentWinnerLabel>Winner</ExperimentWinnerLabel>
                              <ExperimentWinnerValue>
                                {experiment.winner === 'variantB' ? experiment.variantB.name : experiment.variantA.name}
                                {' '}with {experiment.lift.toFixed(1)}% lift
                              </ExperimentWinnerValue>
                            </ExperimentWinner>
                          )}

                          <AnalyzeButton
                            onClick={async () => {
                              const analysis = await fetchAnalysis(experiment._id);
                              if (analysis) {
                                setAnalysisModal({ isOpen: true, experimentId: experiment._id, analysis });
                              }
                            }}
                          >
                            📊 Analyze Results
                          </AnalyzeButton>
                        </>
                      ) : experiment.status === 'running' ? (
                        <>
                          <ExperimentMetrics>
                            <ExperimentVariant>
                              <ExperimentVariantLabel>Control</ExperimentVariantLabel>
                              <ExperimentVariantValue>
                                {experiment.variantAConversionRate.toFixed(2)}%
                              </ExperimentVariantValue>
                            </ExperimentVariant>
                            <ExperimentVariant>
                              <ExperimentVariantLabel>Treatment</ExperimentVariantLabel>
                              <ExperimentVariantValue>
                                {experiment.variantBConversionRate.toFixed(2)}%
                              </ExperimentVariantValue>
                            </ExperimentVariant>
                          </ExperimentMetrics>

                          <ExperimentProgress>
                            <ExperimentProgressBar>
                              <ExperimentProgressFill
                                $percentage={
                                  Math.min(((Date.now() - new Date(experiment.startDate).getTime()) / (experiment.duration * 24 * 60 * 60 * 1000)) * 100, 100)
                                }
                              />
                            </ExperimentProgressBar>
                            <ExperimentProgressLabel>
                              <span>{experiment.duration} days</span>
                              <span>
                                {Math.min(Math.round(((Date.now() - new Date(experiment.startDate).getTime()) / (experiment.duration * 24 * 60 * 60 * 1000)) * 100), 100)}% complete
                              </span>
                            </ExperimentProgressLabel>
                          </ExperimentProgress>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#a0a0a0' }}>
                          Draft - Not started yet
                        </div>
                      )}
                    </ExperimentCard>
                  ))}
                </ExperimentsGrid>
              ) : (
                <EmptyExperiments>
                  <div>🧪</div>
                  <h4>No A/B tests yet</h4>
                  <p>Create your first A/B test to optimize your App Store presence</p>
                </EmptyExperiments>
              )}
            </ExperimentsContainer>
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

      {/* Analysis Modal */}
      {analysisModal.isOpen && analysisModal.analysis && (
        <ExperimentAnalysisModal onClick={() => setAnalysisModal({ isOpen: false, experimentId: null, analysis: null })}>
          <ExperimentAnalysisModalContent onClick={(e) => e.stopPropagation()}>
            <ExperimentAnalysisModalHeader>
              <ExperimentAnalysisModalTitle>
                📊 {analysisModal.analysis.experiment.name} - Analysis
              </ExperimentAnalysisModalTitle>
              <ExperimentAnalysisModalClose onClick={() => setAnalysisModal({ isOpen: false, experimentId: null, analysis: null })}>
                ×
              </ExperimentAnalysisModalClose>
            </ExperimentAnalysisModalHeader>

            <ExperimentAnalysisModalBody>
              {/* Conclusion Section */}
              <ExperimentAnalysisConclusion $isSignificant={analysisModal.analysis.statistics.isSignificant}>
                <ExperimentAnalysisConclusionText>{analysisModal.analysis.conclusion}</ExperimentAnalysisConclusionText>
              </ExperimentAnalysisConclusion>

              {/* Test Results */}
              <ExperimentAnalysisSection>
                <ExperimentAnalysisSectionTitle>📈 Test Results</ExperimentAnalysisSectionTitle>
                <ExperimentAnalysisGrid>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Variant A ({analysisModal.analysis.results.variantA.name})</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.results.variantA.conversionRate}</ExperimentAnalysisCardValue>
                    <ExperimentAnalysisCardLabel>{analysisModal.analysis.results.variantA.views.toLocaleString()} views • {analysisModal.analysis.results.variantA.conversions} conversions</ExperimentAnalysisCardLabel>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Variant B ({analysisModal.analysis.results.variantB.name})</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.results.variantB.conversionRate}</ExperimentAnalysisCardValue>
                    <ExperimentAnalysisCardLabel>{analysisModal.analysis.results.variantB.views.toLocaleString()} views • {analysisModal.analysis.results.variantB.conversions} conversions</ExperimentAnalysisCardLabel>
                  </ExperimentAnalysisCard>
                </ExperimentAnalysisGrid>
                <ExperimentAnalysisGrid>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Winner</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.statistics.winner === 'variantA' ? analysisModal.analysis.results.variantA.name : analysisModal.analysis.results.variantB.name}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Lift</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.statistics.lift}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Confidence</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.statistics.confidence}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Significance</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>p = {analysisModal.analysis.statistics.significance}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                </ExperimentAnalysisGrid>
              </ExperimentAnalysisSection>

              {/* Sample Size Analysis */}
              <ExperimentAnalysisSection>
                <ExperimentAnalysisSectionTitle>📊 Sample Size Analysis</ExperimentAnalysisSectionTitle>
                <ExperimentAnalysisGrid>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Total Views</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.sampleSize.totalViews.toLocaleString()}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Total Conversions</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.sampleSize.totalConversions}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Target Sample Size</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.sampleSize.targetSampleSize}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                  <ExperimentAnalysisCard>
                    <ExperimentAnalysisCardLabel>Sufficient</ExperimentAnalysisCardLabel>
                    <ExperimentAnalysisCardValue>{analysisModal.analysis.sampleSize.sufficient ? '✅ Yes' : '❌ No'}</ExperimentAnalysisCardValue>
                  </ExperimentAnalysisCard>
                </ExperimentAnalysisGrid>
              </ExperimentAnalysisSection>

              {/* Recommendations */}
              <ExperimentAnalysisSection>
                <ExperimentAnalysisSectionTitle>💡 Recommendations</ExperimentAnalysisSectionTitle>
                {analysisModal.analysis.recommendations.map((rec, index) => (
                  <ExperimentAnalysisRecommendation key={index} $priority={rec.priority}>
                    <ExperimentAnalysisRecommendationHeader>
                      <ExperimentAnalysisRecommendationPriority $priority={rec.priority}>{rec.priority}</ExperimentAnalysisRecommendationPriority>
                      <ExperimentAnalysisRecommendationTitle>{rec.title}</ExperimentAnalysisRecommendationTitle>
                    </ExperimentAnalysisRecommendationHeader>
                    <ExperimentAnalysisRecommendationDescription>{rec.description}</ExperimentAnalysisRecommendationDescription>
                    <ExperimentAnalysisRecommendationAction>🎯 {rec.action}</ExperimentAnalysisRecommendationAction>
                  </ExperimentAnalysisRecommendation>
                ))}
              </ExperimentAnalysisSection>

              {/* Insights */}
              <ExperimentAnalysisSection>
                <ExperimentAnalysisSectionTitle>🔍 Insights</ExperimentAnalysisSectionTitle>
                {analysisModal.analysis.insights.map((insight, index) => (
                  <ExperimentAnalysisInsight key={index}>
                    <ExperimentAnalysisInsightTitle>{insight.title}</ExperimentAnalysisInsightTitle>
                    <ExperimentAnalysisInsightContent>{insight.content}</ExperimentAnalysisInsightContent>
                  </ExperimentAnalysisInsight>
                ))}
              </ExperimentAnalysisSection>

              {/* Next Steps */}
              <ExperimentAnalysisSection>
                <ExperimentAnalysisSectionTitle>✅ Next Steps</ExperimentAnalysisSectionTitle>
                {analysisModal.analysis.nextSteps.map((step, index) => (
                  <ExperimentAnalysisNextStep key={index}>
                    <ExperimentAnalysisNextStepOrder>{step.order}</ExperimentAnalysisNextStepOrder>
                    <ExperimentAnalysisNextStepContent>
                      <ExperimentAnalysisNextStepAction>{step.action}</ExperimentAnalysisNextStepAction>
                      <ExperimentAnalysisNextStepDetails>{step.details}</ExperimentAnalysisNextStepDetails>
                      <ExperimentAnalysisNextStepTimeframe>⏱️ {step.timeframe}</ExperimentAnalysisNextStepTimeframe>
                    </ExperimentAnalysisNextStepContent>
                  </ExperimentAnalysisNextStep>
                ))}
              </ExperimentAnalysisSection>
            </ExperimentAnalysisModalBody>
          </ExperimentAnalysisModalContent>
        </ExperimentAnalysisModal>
      )}
    </DashboardContainer>
  );
}

export default StrategicDashboard;
