import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { FaTiktok, FaInstagram, FaYoutube, FaLink } from 'react-icons/fa';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import CreatePostModal from '../components/CreatePostModal.jsx';
import GenerateVideoOptions from '../components/GenerateVideoOptions.jsx';
import RegenerateVideoModal from '../components/RegenerateVideoModal.jsx';
import Tier2VideoUpload from '../components/Tier2VideoUpload.jsx';
import EditTier2PostModal from '../components/EditTier2PostModal.jsx';
import ManualTikTokMatchDialog from '../components/ManualTikTokMatchDialog.jsx';
import { useSseEvents } from '../hooks/useSseEvents.js';
import {
  mergeUpdatedPost,
  mergeUpdatedPostWithSort,
  mergeNewPosts,
  removeDeletedPost,
  mergeProgressUpdate,
  mergeMetricsUpdate
} from '../utils/postUpdater.js';

const LibraryContainer = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  min-width: 250px;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

const DateFilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DateFilterButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? '#7b2cbf' : '#16213e'};
  border: 1px solid ${props => props.$active ? '#7b2cbf' : '#2d3561'};
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

const DateInput = styled.input`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
`;

const Button = styled.button`
  padding: 0.5rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    transform: none;
  }
`;

const CreatePostButton = styled(Button)`
  background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%);

  &:hover {
    background: linear-gradient(135deg, #9d4edd 0%, #b36bf7 100%);
  }
`;

// Bulk Action Components
const BulkActionsBar = styled.div`
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #1a1a3e 0%, #16213e 100%);
  border: 2px solid #7b2cbf;
  border-radius: 12px;
  animation: slideDown 0.3s ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const BulkActionsInfo = styled.div`
  flex: 1;
  color: #eaeaea;
  font-weight: 600;
`;

const BulkActionsCount = styled.span`
  background: #7b2cbf;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  margin-left: 0.5rem;
`;

const BulkActionButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: ${props => {
    const colors = {
      approve: '#28a745',
      reject: '#dc3545',
      delete: '#ff6b6b',
      export: '#667eea'
    };
    return colors[props.$action] || '#7b2cbf';
  }};
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const BulkActionsClear = styled.button`
  padding: 0.6rem 1.2rem;
  background: transparent;
  border: 2px solid #6c757d;
  border-radius: 8px;
  color: #a0a0a0;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    color: #e94560;
  }
`;

const CheckboxContainer = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
`;

const BulkCheckbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #7b2cbf;

  &:checked {
    background-color: #7b2cbf;
  }
`;

const SelectAllContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: #16213e;
  border: 1px solid ${props => props.$selected ? '#e94560' : '#2d3561'};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: ${props => props.$selected ? '0 0 0 3px rgba(233, 69, 96, 0.3)' : 'none'};

  &:hover {
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: ${props => props.$selected ? '0 8px 24px rgba(233, 69, 96, 0.3)' : '0 8px 24px rgba(233, 69, 96, 0.15)'};
  }
`;

const ThumbnailContainer = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const Thumbnail = styled.div`
  width: 100%;
  height: 100%;
  background: ${props => {
    // Use thumbnail image if available, otherwise use gradient
    if (props.$thumbnail) {
      return `url(${props.$thumbnail}) center/cover no-repeat`;
    }
    const gradients = {
      tiktok: 'linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)',
      instagram: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
      youtube_shorts: 'linear-gradient(135deg, #ff0000 0%, #282828 100%)'
    };
    return gradients[props.platform] || 'linear-gradient(135deg, #e94560 0%, #7b2cbf 100%)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
`;

const StatusBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    const colors = {
      draft: '#6c757d',
      ready: '#17a2b8',
      approved: '#0e4d30', // very dark green - waiting to post
      scheduled: '#007bff',
      posted: '#40c057', // bright green - already posted
      failed: '#dc3545',
      rejected: '#ff6b6b',
      generating: '#e94560',
      partial_posted: '#ffc107' // yellow for partial posting
    };
    return colors[props.status] || '#6c757d';
  }};
  color: white;
  animation: ${props => props.status === 'generating' ? 'pulse 1.5s ease-in-out infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

// Multi-platform status indicator
const MultiPlatformIndicator = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 0.25rem;
`;

const PlatformStatusDot = styled.div`
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => {
    const colors = {
      pending: '#6c757d',
      posting: '#e94560',
      posted: '#40c057',
      failed: '#dc3545',
      skipped: '#6c757d'
    };
    return colors[props.status] || '#6c757d';
  }};
  border: 1px solid white;
  cursor: pointer;
  transition: transform 0.2s;
  z-index: 2;

  &:hover {
    transform: scale(1.2);
  }
`;

const PlatformStatusTooltip = styled.div`
  position: absolute;
  top: 35px;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  white-space: nowrap;
  z-index: 10;
  display: ${props => props.$visible ? 'block' : 'none'};
  pointer-events: none;
`;

const MultiPlatformBadge = styled.div`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #7b2cbf;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
`;

const TierBadge = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${props => {
    const colors = {
      tier_1: '#7b2cbf',
      tier_2: '#e94560',
      tier_3: '#0d6efd'
    };
    return colors[props.tier] || '#6c757d';
  }};
  color: white;
`;

const CardContent = styled.div`
  padding: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  color: #eaeaea;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const ScheduledTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const TimeLabel = styled.span`
  font-size: 0.85rem;

  ${props => props.$color === 'red' && `
    color: #ff6b6b;
    font-weight: 500;
  `}

  ${props => props.$color === 'grey' && `
    color: #888;
  `}

  ${props => props.$color === 'green' && `
    color: #51cf66;
    font-weight: 500;
  `}

  ${props => !props.$color && `
    color: #a0a0a0;
  `}
`;

const StoryName = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 0.4rem 0.8rem;
  background: #2d3561;
  border: none;
  border-radius: 4px;
  color: #eaeaea;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
  }
`;

// Tier 2 script preview
const ScriptPreview = styled.div`
  margin-top: 0.75rem;
  padding: 0.6rem;
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #c0c0c0;
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: linear-gradient(transparent, rgba(22, 33, 62, 0.9));
  }
`;

const ScriptLabel = styled.div`
  font-weight: 600;
  color: #7b2cbf;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &::before {
    content: '📜';
  }
`;

const NoScriptMessage = styled.div`
  font-style: italic;
  color: #888;
  padding: 0.5rem 0;
`;

// Posted content link and stats
const PostedLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(233, 69, 96, 0.2);
  color: #e94560;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-top: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(233, 69, 96, 0.3);
    text-decoration: underline;
  }
`;

const PostedLinksContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`;

const StatItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  color: #a0a0a0;

  .stat-value {
    color: #eaeaea;
    font-weight: 500;
  }
`;

const PerPlatformStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const PlatformStatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #a0a0a0;
  padding: 0.25rem 0;
`;

const PlatformStatsLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 80px;
  color: #eaeaea;
  font-weight: 500;
`;

const PlatformMetrics = styled.span`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  .stat-value {
    color: #eaeaea;
    font-weight: 500;
  }
`;

const PerPlatformTimeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`;

const PerPlatformTimeItem = styled.div`
  font-size: 0.85rem;
  color: ${props => {
    if (props.$color === 'green') return '#40c057';
    if (props.$color === 'red') return '#dc3545';
    if (props.$color === 'grey') return '#a0a0a0';
    return '#eaeaea';
  }};
`;

const PlatformTimeLabel = styled.span`
  font-weight: 600;
`;

const PlatformEditContainer = styled.div`
  background: #16213e;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #2d3561;
`;

const PlatformEditLabel = styled.div`
  font-weight: 600;
  margin-bottom: 12px;
  color: #eaeaea;
`;

const PlatformEditItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
`;

const PlatformEditCheckbox = styled.input`
  width: 18px;
  height: 18px;
  margin-right: 12px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  accent-color: #e94560;
`;

const LegacyLoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: #a0a0a0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;

  h3 {
    margin: 0 0 0.5rem 0;
    color: #eaeaea;
  }

  p {
    margin: 0;
    color: #a0a0a0;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
`;

const PaginationButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.disabled ? '#2d3561' : '#16213e'};
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: ${props => props.disabled ? '#6c757d' : '#eaeaea'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #e94560;
    border-color: #e94560;
  }
`;

const PageInfo = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 1rem;
`;

const ModalContent = styled.div`
  position: relative;
  width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  /* On wide screens, use side-by-side layout */
  @media (min-width: 1024px) {
    flex-direction: row;
    max-width: 1400px;
    align-items: flex-start;
  }
`;

const ModalVideoSection = styled.div`
  flex-shrink: 0;

  @media (min-width: 1024px) {
    max-width: 450px;
  }
`;

const ModalDetailsSection = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;

  @media (min-width: 1024px) {
    max-height: 85vh;
  }

  @media (max-width: 1023px) {
    max-height: 40vh;
  }
`;

const ModalInfo = styled.div`
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 600px;

  @media (min-width: 1024px) {
    max-width: 100%;
  }
`;

const ModalTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  color: #eaeaea;
  font-size: 1.2rem;
`;

const PostIdBadge = styled.div`
  display: inline-block;
  background: rgba(115, 203, 229, 0.15);
  border: 1px solid #73cbe5;
  border-radius: 4px;
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  color: #73cbe5;
  font-family: 'Fira Code', monospace;
  margin-bottom: 1rem;
  user-select: all;
  cursor: pointer;

  &:hover {
    background: rgba(115, 203, 229, 0.25);
  }
`;

const ModalCaption = styled.p`
  margin: 0 0 1rem 0;
  color: #c0c0c0;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const ModalHashtags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const HashtagPlatformsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const HashtagPlatformSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PlatformLabel = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  font-weight: 500;
  text-transform: capitalize;
`;

const Hashtag = styled.span`
  padding: 0.25rem 0.75rem;
  background: #2d3561;
  border-radius: 16px;
  color: #e94560;
  font-size: 0.85rem;
  font-weight: 500;
`;

const PerformanceMetrics = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(45, 53, 97, 0.5);
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const MetricsTitle = styled.h4`
  color: #7b2cbf;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '📊';
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: #e94560;
`;

const EngagementRate = styled.div`
  grid-column: 1 / -1;
  padding-top: 1rem;
  border-top: 1px solid #2d3561;
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EngagementLabel = styled.span`
  font-size: 0.9rem;
  color: #eaeaea;
  font-weight: 500;
`;

const EngagementValue = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => {
    const rate = props.$rate || 0;
    if (rate >= 5) return '#00d26a';
    if (rate >= 3) return '#ffb020';
    return '#f8312f';
  }};
`;

const ApprovalHistory = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(45, 53, 97, 0.5);
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const ApprovalHistoryTitle = styled.h4`
  color: #7b2cbf;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '📋';
  }
`;

const ApprovalHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #16213e;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #7b2cbf;
    border-radius: 3px;
  }
`;

const ApprovalHistoryItem = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(22, 33, 62, 0.7);
  border-radius: 6px;
  border-left: 3px solid ${props => {
    switch (props.$action) {
      case 'approved': return '#00d26a';
      case 'rejected': return '#ff6b6b';
      case 'regenerated': return '#7b2cbf';
      case 'edited': return '#ffb020';
      default: return '#2d3561';
    }
  }};
`;

const ApprovalHistoryIcon = styled.div`
  font-size: 1.25rem;
  line-height: 1;
`;

const ApprovalHistoryContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ApprovalHistoryAction = styled.div`
  font-weight: 600;
  color: ${props => {
    switch (props.$action) {
      case 'approved': return '#00d26a';
      case 'rejected': return '#ff6b6b';
      case 'regenerated': return '#b36bf7';
      case 'edited': return '#ffb020';
      default: return '#eaeaea';
    }
  }};
  margin-bottom: 0.25rem;
`;

const ApprovalHistoryUser = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const ApprovalHistoryTime = styled.div`
  font-size: 0.75rem;
  color: #6c757d;
`;

const ApprovalHistoryDetails = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #2d3561;
  font-size: 0.85rem;
  color: #c0c0c0;
`;

const ApprovalHistoryDetail = styled.div`
  margin-bottom: 0.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const NoHistoryMessage = styled.div`
  text-align: center;
  padding: 1.5rem;
  color: #6c757d;
  font-style: italic;
`;



// Scheduled Time Display Components
const ScheduledTimeSection = styled.div`
  background: linear-gradient(135deg, #1a1a3e 0%, #16213e 100%);
  border: 2px solid #7b2cbf;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ScheduledTimeInfo = styled.div`
  flex: 1;
  min-width: 200px;
`;

const ScheduledTimeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const ScheduledTimeDisplay = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CountdownTimer = styled.div`
  font-size: 1.1rem;
  color: #00d26a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const TimezoneDisplay = styled.div`
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.25rem;
`;

const RescheduleButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: #7b2cbf;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #9d4edd;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const ScheduleButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: linear-gradient(135deg, #0056b3, #004494);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const ConfirmScheduleButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: #28a745;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #218838;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const CancelScheduleButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: #dc3545;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const DateTimePickerContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #2d3561;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const DateTimePickerRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const DateTimeInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #7b2cbf;
    box-shadow: 0 0 0 3px rgba(123, 44, 191, 0.1);
  }
`;

const ConfirmRescheduleButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: #00d26a;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #00b35d;
  }
`;

const CancelRescheduleButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: #ff6b6b;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff5252;
  }
`;

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;

  @media (min-width: 1024px) {
    min-height: 70vh;
    max-height: 85vh;
  }

  @media (max-width: 1023px) {
    max-height: 50vh;
  }
`;

const VideoPlayer = styled.video`
  max-width: 100%;
  max-height: 100%;
  max-width: 450px; /* Limit width for vertical 9:16 videos */
  object-fit: contain;
`;

const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;

  @media (min-width: 1024px) {
    min-height: 70vh;
    max-height: 85vh;
  }

  @media (max-width: 1023px) {
    max-height: 50vh;
  }
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 100%;
  max-width: 450px;
  object-fit: contain;
`;

const VideoPlaceholder = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: #888;
  font-size: 1.2rem;
  background: #1a1a2e;
  border-radius: 12px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0.5rem 1rem;
  background: rgba(233, 69, 96, 0.9);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  &:hover {
    background: #ff6b6b;
    transform: scale(1.05);
  }

  @media (max-width: 1023px) {
    top: -45px;
    right: 0;
  }
`;

// Upload Progress Components
const UploadProgressContainer = styled.div`
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #16213e;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const UploadProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const UploadProgressTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UploadProgressStatus = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.$status) {
      case 'uploading':
      case 'publishing':
        return `
          background: #e94560;
          color: white;
        `;
      case 'completed':
        return `
          background: #00d26a;
          color: white;
        `;
      case 'failed':
        return `
          background: #ff4757;
          color: white;
        `;
      default:
        return `
          background: #2d3561;
          color: #a0a0a0;
        `;
    }
  }}
`;

const UploadProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
`;

const UploadProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.$progress}%;
`;

const UploadProgressStage = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UploadProgressPercentage = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #e94560;
`;

const PostToTikTokButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostToInstagramButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(131, 58, 180, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ManualMatchButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ExportButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const DownloadButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #00d26a 0%, #00b862 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 210, 106, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ManualPostedButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(56, 239, 125, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const InstructionsModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const InstructionsContent = styled.div`
  background: #1a1a2e;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const InstructionsTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const InstructionsList = styled.ol`
  padding-left: 1.5rem;
  margin: 0 0 1.5rem 0;

  li {
    margin-bottom: 0.75rem;
    color: #eaeaea;
    line-height: 1.6;
  }
`;

const CaptionBox = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  max-height: 150px;
  overflow-y: auto;
  color: #eaeaea;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const CloseInstructionsButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #2d3561;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
  }
`;

const PlayButton = styled.button`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  background: rgba(233, 69, 96, 0.9);
  border: 3px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  opacity: 0;
  pointer-events: none;

  ${ThumbnailContainer}:hover & {
    opacity: 1;
    pointer-events: auto;
  }

  &:hover {
    background: rgba(233, 69, 96, 1);
    transform: translate(-50%, -50%) scale(1.1);
  }

  &::after {
    content: '▶';
    color: white;
    font-size: 1.5rem;
    margin-left: 4px;
  }
`;

const VideoIndicator = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

// Platform icons indicator for post cards
const PlatformIcons = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
`;

const PlatformIconBadge = styled.div`
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: ${props => {
    const colors = {
      tiktok: '#000000',
      instagram: '#E1306C',
      youtube_shorts: '#FF0000'
    };
    return colors[props.$platform] || '#666';
  }};
  font-size: 0.7rem;
  position: relative;
  svg {
    width: 14px;
    height: 14px;
    fill: white;
  }
`;

// Platform status text section
const PlatformStatusList = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const PlatformStatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: ${props => {
    const statusColors = {
      posted: 'rgba(74, 222, 128, 0.1)',
      pending: 'rgba(251, 191, 36, 0.1)',
      posting: 'rgba(96, 165, 250, 0.1)',
      failed: 'rgba(248, 113, 113, 0.1)',
      skipped: 'rgba(156, 163, 175, 0.1)'
    };
    return statusColors[props.$status] || 'rgba(156, 163, 175, 0.1)';
  }};
  color: ${props => {
    const statusColors = {
      posted: '#4ade80',
      pending: '#fbbf24',
      posting: '#60a5fa',
      failed: '#f87171',
      skipped: '#9ca3af'
    };
    return statusColors[props.$status] || '#9ca3af';
  }};
`;

// Social platform icons using react-icons
const TikTokIcon = () => <FaTiktok />;
const InstagramIcon = () => <FaInstagram />;
const YouTubeIcon = () => <FaYoutube />;

// Video Generation Progress Components
const GeneratingProgress = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
`;

const GeneratingProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
`;

const GeneratingProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 2px;
  transition: width 0.3s ease;
  animation: shimmer 1.5s ease-in-out infinite;

  @keyframes shimmer {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
`;

const GeneratingStatusText = styled.div`
  color: white;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #2d3561;
  flex-wrap: wrap;
`;

const TierBadgeInActions = styled.div`
  width: 100%;
  padding: 0.5rem;
  background: ${props => props.tier === 'tier_1' ? 'rgba(233, 69, 96, 0.15)' :
                      props.tier === 'tier_2' ? 'rgba(115, 203, 229, 0.15)' :
                      props.tier === 'tier_3' ? 'rgba(255, 193, 7, 0.15)' :
                      'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.tier === 'tier_1' ? '#e94560' :
                          props.tier === 'tier_2' ? '#73cbe5' :
                          props.tier === 'tier_3' ? '#ffc107' :
                          '#888'};
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.tier === 'tier_1' ? '#e94560' :
                  props.tier === 'tier_2' ? '#73cbe5' :
                  props.tier === 'tier_3' ? '#ffc107' :
                  '#eaeaea'};
  text-align: center;
`;

const ApproveButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: #00d26a;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #00b35d;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 210, 106, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const RejectButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: #ff6b6b;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }
`;

const RegenerateButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #7b2cbf;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #9d4edd;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
  }
`;

const DuplicateButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #17a2b8;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #138496;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
  }
`;

const DeleteButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #dc3545;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
  }
`;

const GenerateVideoButton = styled.button`
  flex: 1 1 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
  }
`;

// Edit Mode Components
const EditButton = styled.button`
  flex: 0 0 auto;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #7b2cbf;
  border-radius: 6px;
  color: #7b2cbf;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #7b2cbf;
    color: white;
  }
`;

const SaveButton = styled.button`
  padding: 0.5rem 1.5rem;
  background: #00d26a;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #00b35d;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 210, 106, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
    box-shadow: none;
  }
`;

const CancelButton = styled.button`
  padding: 0.5rem 1.5rem;
  background: transparent;
  border: 1px solid #ff6b6b;
  border-radius: 6px;
  color: #ff6b6b;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    color: white;
  }
`;

const EditActionsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2d3561;
`;

const EditCaptionTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #7b2cbf;
  }

  &::placeholder {
    color: #6c757d;
  }
`;

// Rejection Modal Components
const RejectModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const RejectModalContent = styled.div`
  background: #16213e;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const RejectModalTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #ff6b6b;
  font-size: 1.5rem;
`;

const RejectModalLabel = styled.label`
  display: block;
  margin: 1.5rem 0 0.5rem 0;
  color: #eaeaea;
  font-weight: 500;
  font-size: 0.95rem;
`;

const RejectModalTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  background: #0f1629;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #ff6b6b;
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

const RejectModalCheckbox = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #1a2332;
  border-radius: 8px;
  border: 1px solid #2d3561;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    background: #1f2940;
  }

  input[type="checkbox"] {
    margin-top: 0.25rem;
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #e94560;
  }
`;

const RejectModalCheckboxLabel = styled.div`
  flex: 1;
  color: #c0c0c0;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const RejectModalWarning = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(233, 69, 96, 0.1);
  border-left: 3px solid #e94560;
  border-radius: 4px;
  color: #e94560;
  font-size: 0.85rem;
`;

const RejectModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const RejectModalButton = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.cancel {
    background: #2d3561;
    color: #eaeaea;

    &:hover {
      background: #3a456b;
    }
  }

  &.confirm {
    background: #ff6b6b;
    color: white;

    &:hover {
      background: #ff5252;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    }

    &:disabled {
      background: #2d3561;
      cursor: not-allowed;
      opacity: 0.5;
      transform: none;
    }
  }
`;

// Regenerate Modal Components
const RegenerateModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const RegenerateModalContent = styled.div`
  background: #16213e;
  border: 2px solid #7b2cbf;
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const RegenerateModalTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RegenerateModalLabel = styled.label`
  display: block;
  font-size: 0.95rem;
  font-weight: 500;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const RegenerateModalTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  background: #1a1a2e;
  border: 2px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: #7b2cbf;
    box-shadow: 0 0 0 3px rgba(123, 44, 191, 0.1);
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

const RegenerateModalInfo = styled.div`
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid #7b2cbf;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #eaeaea;
  line-height: 1.5;
`;

const RegenerateModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const RegenerateModalButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.cancel {
    background: #2d3561;
    color: #eaeaea;

    &:hover {
      background: #3d4561;
    }
  }

  &.confirm {
    background: #7b2cbf;
    color: white;

    &:hover {
      background: #9d4edd;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
    }

    &:disabled {
      background: #2d3561;
      cursor: not-allowed;
      opacity: 0.5;
      transform: none;
    }
  }
`;

// Delete Modal Components
const DeleteModalOverlay = styled.div`
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

const DeleteModalContent = styled.div`
  background: #16213e;
  border: 2px solid #dc3545;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const DeleteModalTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  color: #dc3545;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DeleteModalText = styled.p`
  color: #eaeaea;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const DeleteModalWarning = styled.div`
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #eaeaea;
  line-height: 1.5;
`;

const DeleteModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const DeleteModalButton = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.cancel {
    background: #2d3561;
    color: #eaeaea;

    &:hover {
      background: #3d4561;
    }
  }

  &.confirm {
    background: #dc3545;
    color: white;

    &:hover {
      background: #c82333;
    }
  }
`;

function ContentLibrary() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    platform: 'all',
    status: 'all',
    tier: 'all', // 'all', 'tier_1', 'tier_2', 'tier_3'
    search: '',
    dateRange: 'all' // 'all', '7days', '30days', '90days', 'custom'
  });
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    reason: '',
    blacklistStory: false
  });
  const [regenerateModal, setRegenerateModal] = useState({
    isOpen: false,
    feedback: ''
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    postToDelete: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [editedHashtags, setEditedHashtags] = useState({
    tiktok: '',
    instagram: '',
    youtube_shorts: ''
  });
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledTimeForApproval, setScheduledTimeForApproval] = useState('');
  const [countdown, setCountdown] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [progressPollInterval, setProgressPollInterval] = useState(null);
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    data: null
  });
  const [bulkSelected, setBulkSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // New modals for post creation and video generation
  const [createPostModal, setCreatePostModal] = useState(false);
  const [generateVideoModal, setGenerateVideoModal] = useState(false);
  const [regenerateVideoModal, setRegenerateVideoModal] = useState(false);
  const [selectedPostForVideo, setSelectedPostForVideo] = useState(null);
  const [stories, setStories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0); // Increment to trigger refresh

  // Tier 2 video upload modal
  const [tier2UploadModal, setTier2UploadModal] = useState(false);
  const [selectedPostForTier2Upload, setSelectedPostForTier2Upload] = useState(null);
  const [editTier2Modal, setEditTier2Modal] = useState(false);
  const [selectedPostForTier2Edit, setSelectedPostForTier2Edit] = useState(null);
  const [platformEditMode, setPlatformEditMode] = useState(false);

  // Manual TikTok match dialog
  const [manualMatchDialog, setManualMatchDialog] = useState({
    isOpen: false,
    postId: null,
    postCaption: null
  });

  // Function to trigger a refresh
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Initial fetch and fetch on filter/pagination/refresh changes
  useEffect(() => {
    fetchPosts();
  }, [filters, pagination.page, refreshKey]);

  // ============================================================
  // SSE (Server-Sent Events) - Real-time updates
  // Replaces 30-second auto-refresh and 2-second progress polling
  // ============================================================

  // Determine if we should suppress SSE updates (when editing posts)
  // Note: We NO LONGER suppress updates when modals are open - the key
  // improvement of SSE is that background updates don't disrupt modals
  const lastSseUpdateRef = useRef(Date.now());

  // Track when SSE resumes after being paused (to catch up on missed events)
  // Note: We no longer do full refresh on resume - SSE incremental updates handle sync
  const [sseResumeTrigger, setSseResumeTrigger] = useState(0);

  // SSE event handlers with smart in-place merging (renamed to avoid conflicts)
  const handleSsePostCreated = useCallback((newPost) => {
    console.log('[SSE] Post created:', newPost._id);
    setPosts(prevPosts => mergeUpdatedPostWithSort(prevPosts, newPost));
    lastSseUpdateRef.current = Date.now();
  }, []);

  const handleSsePostUpdated = useCallback((updatedPost) => {
    console.log('[SSE] Post updated:', updatedPost._id);
    setPosts(prevPosts => mergeUpdatedPostWithSort(prevPosts, updatedPost));
    lastSseUpdateRef.current = Date.now();
  }, []);

  const handleSsePostDeleted = useCallback((deletedPostId) => {
    console.log('[SSE] Post deleted:', deletedPostId);
    setPosts(prevPosts => removeDeletedPost(prevPosts, deletedPostId));
    lastSseUpdateRef.current = Date.now();
  }, []);

  const handleSsePostStatusChanged = useCallback((data) => {
    console.log('[SSE] Post status changed:', data.postId, data.newStatus);
    if (data.post) {
      setPosts(prevPosts => mergeUpdatedPostWithSort(prevPosts, data.post));
    }
    lastSseUpdateRef.current = Date.now();
  }, []);

  const handleSsePostProgress = useCallback((data) => {
    console.log('[SSE] Post progress:', data.postId, data.percent + '%');
    setPosts(prevPosts => mergeProgressUpdate(prevPosts, data.postId, data));
    lastSseUpdateRef.current = Date.now();
  }, []);

  const handleSsePostMetricsUpdated = useCallback((data) => {
    console.log('[SSE] Post metrics updated:', data.postId, data);
    if (data.post) {
      // Full post update with metrics - use standard merge
      setPosts(prevPosts => mergeUpdatedPost(prevPosts, data.post));
    } else if (data.postId && data.metrics) {
      // Metrics only update - use dedicated metrics merge
      setPosts(prevPosts => mergeMetricsUpdate(prevPosts, data.postId, data.metrics));
    }
    lastSseUpdateRef.current = Date.now();
  }, []);

  // Handle SSE connection state
  const handleSseError = useCallback((error) => {
    console.warn('[SSE] Connection error:', error);
    // SSE will auto-reconnect, no action needed
  }, []);

  const handleSseConnected = useCallback(() => {
    console.log('[SSE] Connected - real-time updates enabled');
  }, []);

  // Ref to track if we need to refresh on resume (to catch up on missed events)
  const handleSseResumed = useCallback(() => {
    console.log('[SSE] Resumed - NOT triggering full refresh, SSE will sync any missed events');
    // NO LONGER trigger full fetchPosts() - SSE should keep us in sync
    // The mergeUpdatedPost function handles incremental updates
  }, []);

  // Establish SSE connection
  const { isConnected: sseConnected } = useSseEvents({
    onPostCreated: handleSsePostCreated,
    onPostUpdated: handleSsePostUpdated,
    onPostDeleted: handleSsePostDeleted,
    onPostStatusChanged: handleSsePostStatusChanged,
    onPostProgress: handleSsePostProgress,
    onPostMetricsUpdated: handleSsePostMetricsUpdated,
    onConnected: handleSseConnected,
    onResumed: handleSseResumed,
    onError: handleSseError
  });

  // Cleanup: stop polling when component unmounts or modal closes
  useEffect(() => {
    return () => {
      stopPollingUploadProgress();
    };
  }, []);

  // Note: SSE resume no longer triggers full refresh - incremental updates keep us in sync
  // useEffect(() => {
  //   if (sseResumeTrigger > 0) {
  //     console.log('[SSE] Refreshing posts after resume');
  //     fetchPosts();
  //   }
  // }, [sseResumeTrigger]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.tier !== 'all') params.append('contentTier', filters.tier);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', pagination.limit);
      params.append('skip', (pagination.page - 1) * pagination.limit);

      // Add date range filtering
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate = null;

        switch (filters.dateRange) {
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (customDateRange.start) {
              startDate = new Date(customDateRange.start);
              params.append('startDate', startDate.toISOString());
            }
            if (customDateRange.end) {
              const endDate = new Date(customDateRange.end);
              params.append('endDate', endDate.toISOString());
            }
            break;
        }

        if (startDate && filters.dateRange !== 'custom') {
          params.append('startDate', startDate.toISOString());
        }
      }

      // Try to fetch from API
      // Add cache-busting timestamp to ensure fresh data
      params.append('_t', Date.now());
      const response = await fetch(`/api/content/posts?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const fetchedPosts = data.data.posts || [];

      // Sort posts by: actual post/attempt date > scheduled date > created date (descending)
      const sortedPosts = [...fetchedPosts].sort((a, b) => {
        const getDate = (post) => {
          // Check platformStatus for earliest actual post/attempt date across all platforms
          if (post.platformStatus) {
            const dates = [];
            // Check each platform for postedAt or lastFailedAt (attempted but failed)
            Object.values(post.platformStatus).forEach(platformStatus => {
              if (platformStatus) {
                if (platformStatus.postedAt) dates.push(new Date(platformStatus.postedAt).getTime());
                if (platformStatus.lastFailedAt) dates.push(new Date(platformStatus.lastFailedAt).getTime());
              }
            });
            if (dates.length > 0) {
              // Return the earliest date across all platforms
              return Math.min(...dates);
            }
          }
          // Fallback to postedAt for single-platform posts without platformStatus
          if (post.status === 'posted' && post.postedAt) {
            return new Date(post.postedAt).getTime();
          }
          // If scheduled but not posted, use scheduled date
          if (post.scheduledAt) {
            return new Date(post.scheduledAt).getTime();
          }
          // Otherwise use creation date
          return new Date(post.createdAt || 0).getTime();
        };

        return getDate(b) - getDate(a); // Descending (newest first)
      });

      // Set posts from API - no mock data fallback
      setPosts(sortedPosts);
      setPagination(prev => ({
        ...prev,
        total: data.data.pagination?.total || 0,
        hasMore: data.data.pagination?.hasMore || false
      }));

    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
      setPosts([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        hasMore: false
      }));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the sort date for a post
  const getSortDate = (post) => {
    // Check platformStatus for earliest actual post/attempt date across all platforms
    if (post.platformStatus) {
      const dates = [];
      // Check each platform for postedAt or lastFailedAt (attempted but failed)
      Object.values(post.platformStatus).forEach(platformStatus => {
        if (platformStatus) {
          if (platformStatus.postedAt) dates.push(new Date(platformStatus.postedAt).getTime());
          if (platformStatus.lastFailedAt) dates.push(new Date(platformStatus.lastFailedAt).getTime());
        }
      });
      if (dates.length > 0) {
        // Return the earliest date across all platforms
        return Math.min(...dates);
      }
    }
    // Fallback to postedAt for single-platform posts without platformStatus
    if (post.status === 'posted' && post.postedAt) {
      return new Date(post.postedAt).getTime();
    }
    // If scheduled but not posted, use scheduled date
    if (post.scheduledAt) {
      return new Date(post.scheduledAt).getTime();
    }
    // Otherwise use creation date
    return new Date(post.createdAt || 0).getTime();
  };

  // Helper to insert a post in the correct sorted position
  const insertPostSorted = (newPost, currentPosts) => {
    const newPostDate = getSortDate(newPost);
    // Find the index where this post should be inserted
    let insertIndex = currentPosts.findIndex(post => getSortDate(post) < newPostDate);
    if (insertIndex === -1) {
      // No posts found with earlier date, append to end
      return [...currentPosts, newPost];
    }
    const newPosts = [...currentPosts];
    newPosts.splice(insertIndex, 0, newPost);
    return newPosts;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'In less than an hour';
    if (diffHours < 24) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString();
  };

  const formatShortDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    return `${month}/${day} ${hours}:${minutes}${ampm}`;
  };

  const getTimeDisplay = (post) => {
    const now = new Date();

    // Posts that have been posted (matched)
    if (post.status === 'posted' && post.postedAt) {
      return {
        text: formatShortDateTime(post.postedAt),
        color: 'green'
      };
    }

    // Posts in "posting" state (waiting to be matched)
    if (post.status === 'posting') {
      return {
        text: 'Posting...',
        color: 'grey'
      };
    }

    // Scheduled posts
    if (post.scheduledAt) {
      const scheduledDate = new Date(post.scheduledAt);
      const isPast = scheduledDate < now;

      if (isPast) {
        // Missed/delayed post
        return {
          text: formatShortDateTime(post.scheduledAt),
          color: 'red'
        };
      } else {
        // Future scheduled post
        return {
          text: formatShortDateTime(post.scheduledAt),
          color: null
        };
      }
    }

    // Fallback
    return {
      text: 'Not scheduled',
      color: 'grey'
    };
  };

  // Get per-platform time display for multi-platform posts
  const getPerPlatformTimeDisplay = (post) => {
    if (!post.platformStatus || !isMultiPlatform(post)) {
      return null; // Use existing getTimeDisplay for single-platform posts
    }

    const platforms = getPostPlatforms(post);
    const platformTimes = [];

    for (const platform of platforms) {
      const platformData = post.platformStatus[platform];
      if (!platformData) continue;

      const platformName = platform === 'youtube_shorts' ? 'YouTube' :
        platform.charAt(0).toUpperCase() + platform.slice(1);

      let timeInfo = null;

      if (platformData.status === 'posted' && platformData.postedAt) {
        timeInfo = {
          text: `Posted ${formatShortDateTime(platformData.postedAt)}`,
          color: 'green',
          status: 'posted'
        };
      } else if (platformData.status === 'posting') {
        timeInfo = {
          text: 'Posting...',
          color: 'grey',
          status: 'posting'
        };
      } else if (platformData.status === 'failed') {
        timeInfo = {
          text: 'Failed',
          color: 'red',
          status: 'failed'
        };
      } else if (post.scheduledAt) {
        // Show scheduled time for pending platforms
        timeInfo = {
          text: `Scheduled ${formatShortDateTime(post.scheduledAt)}`,
          color: null,
          status: 'pending'
        };
      }

      if (timeInfo) {
        platformTimes.push({ platform: platformName, ...timeInfo });
      }
    }

    return platformTimes;
  };

  // Get display text for post status, considering partial states for multi-platform posts
  const getStatusDisplayText = (post) => {
    // For multi-platform posts, show more descriptive status
    if (isMultiPlatform(post) && post.platformStatus) {
      const platforms = getPostPlatforms(post);
      const statuses = platforms.map(p => post.platformStatus?.[p]?.status).filter(Boolean);

      const postedCount = statuses.filter(s => s === 'posted').length;
      const pendingCount = statuses.filter(s => s === 'pending' || s === 'posting').length;
      const failedCount = statuses.filter(s => s === 'failed').length;
      const totalCount = platforms.length;

      // All posted = Posted
      if (postedCount === totalCount) return 'Posted';
      // Some posted, some not = Partial
      if (postedCount > 0 && (pendingCount > 0 || failedCount > 0)) return `Partial (${postedCount}/${totalCount})`;
      // All failed = Failed
      if (failedCount === totalCount) return 'Failed';
      // For everything else (all pending but not started posting yet), use overall status
      // This correctly distinguishes between "approved" (scheduled) and "pending" (actively posting)
      return post.status === 'posting' ? 'Posting...' : post.status;
    }

    // For single-platform or legacy posts
    if (post.status === 'partial_posted') return 'Partial';
    if (post.status === 'posting') return 'Posting...';
    return post.status;
  };

  // Check if post is multi-platform
  const isMultiPlatform = (post) => {
    return post.platforms && Array.isArray(post.platforms) && post.platforms.length > 1;
  };

  // Check if post content can be edited (caption, hashtags, etc.)
  const canEditContent = (post) => {
    // Allow editing for draft, ready, rejected posts
    if (['draft', 'ready', 'rejected', 'generating'].includes(post.status)) {
      return true;
    }
    // Don't allow editing once approved, scheduled, posting, or posted
    return false;
  };

  // Check if post platforms can be edited (add/remove platforms)
  const canEditPlatforms = (post) => {
    // Allow platform edits for any post that hasn't fully completed posting
    // Check if there's at least one platform that hasn't posted yet
    if (!post.platformStatus) return false;

    const platforms = getPostPlatforms(post);
    const hasPendingPlatforms = platforms.some(p => {
      const status = post.platformStatus[p]?.status;
      return status === 'pending' || status === 'failed';
    });

    return hasPendingPlatforms;
  };

  // Get platforms for a post (handles both new platforms array and legacy platform field)
  const getPostPlatforms = (post) => {
    if (post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0) {
      return post.platforms;
    }
    return post.platform ? [post.platform] : [];
  };

  // Get platform status for a post
  const getPlatformStatus = (post, platform) => {
    if (post.platformStatus && post.platformStatus[platform]) {
      return post.platformStatus[platform].status;
    }
    // For legacy single-platform posts, infer from overall status
    if (post.status === 'posted' && post.platform === platform) return 'posted';
    if (post.status === 'failed' && post.platform === platform) return 'failed';
    return 'pending';
  };

  const getPostedLink = (post) => {
    const platforms = getPostPlatforms(post);
    const isMultiPlatform = platforms.length > 1;

    if (isMultiPlatform) {
      // For multi-platform posts, return links for each platform
      const links = [];

      platforms.forEach(platform => {
        const platformData = post.platformStatus?.[platform];
        const shareUrl = platformData?.shareUrl || platformData?.permalink;

        // Also check legacy fields as fallback
        let url = shareUrl;
        if (!url) {
          if (platform === 'tiktok') url = post.tiktokShareUrl;
          if (platform === 'instagram') url = post.instagramPermalink;
          if (platform === 'youtube_shorts') url = post.youtubeUrl;
        }

        if (url) {
          const label = platform === 'tiktok' ? 'TikTok' :
                       platform === 'instagram' ? 'Instagram' :
                       platform === 'youtube_shorts' ? 'YouTube' : platform;
          links.push(
            <PostedLink
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={`View on ${label}`}
            >
              🔗 {label}
            </PostedLink>
          );
        }
      });

      return links.length > 0 ? <PostedLinksContainer>{links}</PostedLinksContainer> : null;
    }

    // Single-platform posts (legacy behavior)
    let url = null;
    let label = '';

    if (post.platform === 'tiktok' && post.tiktokShareUrl) {
      url = post.tiktokShareUrl;
      label = 'View on TikTok';
    } else if (post.platform === 'instagram' && post.instagramPermalink) {
      url = post.instagramPermalink;
      label = 'View on Instagram';
    } else if (post.platform === 'youtube_shorts' && post.youtubeUrl) {
      url = post.youtubeUrl;
      label = 'View on YouTube';
    }

    if (url) {
      return <PostedLink href={url} target="_blank" rel="noopener noreferrer">🔗 {label}</PostedLink>;
    }
    return null;
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatMetric = (value) => {
    if (!value && value !== 0) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatHistoryTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActionIcon = (action) => {
    const icons = {
      approved: '✅',
      rejected: '❌',
      regenerated: '🔄',
      edited: '✏️'
    };
    return icons[action] || '📌';
  };

  const getActionLabel = (action) => {
    const labels = {
      approved: 'Approved',
      rejected: 'Rejected',
      regenerated: 'Regenerated',
      edited: 'Edited'
    };
    return labels[action] || action;
  };

  // Helper to get platform-specific hashtags from a post
  // Handles both new platform-specific structure and legacy array format
  const getPostHashtags = (post) => {
    if (!post.hashtags) return [];

    // New platform-specific structure
    if (typeof post.hashtags === 'object' && !Array.isArray(post.hashtags)) {
      const platformKey = post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform;
      return post.hashtags[platformKey] || post.hashtags.tiktok || [];
    }

    // Legacy array format
    return post.hashtags || [];
  };

  // Helper to get Tier 2 script from post
  const getTier2Script = (post) => {
    if (!post.tierParameters) return null;
    // tierParameters is serialized as plain object from backend
    return post.tierParameters.script || null;
  };

  // Helper to create platform-specific hashtags structure when saving
  const createPlatformSpecificHashtags = (post, hashtagsArray) => {
    // Check if post already has platform-specific structure
    const hasPlatformStructure = post.hashtags &&
      typeof post.hashtags === 'object' &&
      !Array.isArray(post.hashtags);

    if (hasPlatformStructure) {
      // Update only the platform-specific hashtags
      const platformKey = post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform;
      return {
        ...post.hashtags,
        [platformKey]: hashtagsArray
      };
    } else {
      // Create new platform-specific structure from legacy format
      const platformKey = post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform;
      return {
        tiktok: platformKey === 'tiktok' ? hashtagsArray : (post.hashtags || []),
        instagram: platformKey === 'instagram' ? hashtagsArray : [],
        youtube_shorts: platformKey === 'youtube_shorts' ? hashtagsArray : []
      };
    }
  };

  // Helper to get selected platforms from post
  const getSelectedPlatforms = (post) => {
    // Handle new platforms array format
    if (post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0) {
      return post.platforms;
    }
    // Handle legacy single platform format
    if (post.platform) {
      return [post.platform === 'youtube_shorts' ? 'youtube_shorts' : post.platform];
    }
    // Default to all platforms if not specified
    return ['tiktok', 'instagram', 'youtube_shorts'];
  };

  // Fetch stories for post creation
  const fetchStories = async () => {
    try {
      const response = await fetch('/api/content/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data.data?.stories || []);
      } else {
        // Fallback to empty array if endpoint doesn't exist yet
        setStories([]);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setStories([]);
    }
  };

  // Open create post modal
  const handleOpenCreatePost = async () => {
    await fetchStories();
    setCreatePostModal(true);
  };

  // Handle post created
  const handlePostCreated = (result) => {
    if (result.success) {
      // SSE will handle the post update - no full refresh needed
      // The backend sends post.created event which triggers handleSsePostCreated
    }
    setCreatePostModal(false);
  };

  // Handle generate video button click
  const handleGenerateVideo = (post) => {
    setSelectedPostForVideo(post);
    setGenerateVideoModal(true);
  };

  // Handle video generated
  const handleVideoGenerated = (result) => {
    if (result.success) {
      // SSE will handle the post update - no full refresh needed
      // The backend sends post.updated event which triggers handleSsePostUpdated
    }
    setGenerateVideoModal(false);
    setSelectedPostForVideo(null);
  };

  // Handle regenerate video button click
  const handleRegenerateVideo = (post) => {
    setSelectedPostForVideo(post);
    setRegenerateVideoModal(true);
  };

  // Handle video regenerated
  const handleVideoRegenerated = (progressData) => {
    // Check if video generation completed successfully
    // progressData has status, progress, videoPath, etc. (not a 'success' property)
    if (progressData?.status === 'ready' || progressData?.progress >= 100 || progressData?.videoPath) {
      // Update selectedVideo directly with the new videoPath for immediate UI update
      if (selectedVideo && progressData.videoPath) {
        setSelectedVideo(prev => ({
          ...prev,
          videoPath: progressData.videoPath,
          status: 'ready'
        }));
      }
      // SSE will handle the post update - no full refresh needed
    }
    setRegenerateVideoModal(false);
    setSelectedPostForVideo(null);
  };

  const formatScheduledTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;

    if (diffMs < 0) {
      return {
        formatted: date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        countdown: 'Past due',
        isPast: true
      };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdownText = '';
    if (diffDays > 0) {
      countdownText = diffDays + 'd ' + diffHours + 'h ' + diffMinutes + 'm';
    } else if (diffHours > 0) {
      countdownText = diffHours + 'h ' + diffMinutes + 'm';
    } else if (diffMinutes > 0) {
      countdownText = diffMinutes + ' minutes';
    } else {
      countdownText = 'Less than 1 minute';
    }

    return {
      formatted: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      countdown: countdownText,
      isPast: false
    };
  };

  const getTimezone = () => {
    const date = new Date();
    const abbreviation = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ')[2];
    return abbreviation || 'Local Time';
  };

  // Convert UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
  const utcToLocalDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert datetime-local value (local time) to UTC ISO string
  const localDateTimeLocalToUtc = (dateTimeLocalValue) => {
    if (!dateTimeLocalValue) return null;
    const date = new Date(dateTimeLocalValue);
    return date.toISOString();
  };

  const handleStartReschedule = () => {
    setRescheduleMode(true);
    const defaultTime = selectedVideo.scheduledAt || new Date(Date.now() + 3600000).toISOString();
    // Convert UTC to local datetime-local format
    setNewScheduledTime(utcToLocalDateTimeLocal(defaultTime));
  };

  const handleCancelReschedule = () => {
    setRescheduleMode(false);
    setNewScheduledTime('');
  };

  const handleConfirmReschedule = async () => {
    if (!newScheduledTime) return;

    try {
      const utcTime = localDateTimeLocalToUtc(newScheduledTime);
      const response = await fetch('/api/content/posts/' + selectedVideo._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: utcTime })
      });

      if (response.ok) {
        setSelectedVideo({ ...selectedVideo, scheduledAt: utcTime });
        fetchPosts();
        setRescheduleMode(false);
        setNewScheduledTime('');
        alert('Scheduled time updated!');
      } else {
        const error = await response.json();
        alert('Failed to update: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      const utcTime = localDateTimeLocalToUtc(newScheduledTime);
      setSelectedVideo({ ...selectedVideo, scheduledAt: utcTime });
      setRescheduleMode(false);
      setNewScheduledTime('');
      alert('Updated locally');
    }
  };

  const handleStartSchedule = () => {
    setScheduleMode(true);
    const defaultTime = new Date(Date.now() + 3600000); // Default 1 hour from now
    // Convert local time to datetime-local format
    setScheduledTimeForApproval(utcToLocalDateTimeLocal(defaultTime.toISOString()));
  };

  const handleCancelSchedule = () => {
    setScheduleMode(false);
    setScheduledTimeForApproval('');
  };

  const handleApproveAndSchedule = async () => {
    if (!selectedVideo || !scheduledTimeForApproval) return;

    try {
      // First approve the post
      const approveResponse = await fetch(`/api/content/posts/${selectedVideo._id}/approve`, {
        method: 'POST'
      });

      if (!approveResponse.ok) {
        throw new Error('Failed to approve post');
      }

      // Convert local datetime-local value to UTC
      const utcTime = localDateTimeLocalToUtc(scheduledTimeForApproval);

      // Then schedule it
      const scheduleResponse = await fetch(`/api/content/posts/${selectedVideo._id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: utcTime })
      });

      if (!scheduleResponse.ok) {
        throw new Error('Failed to schedule post');
      }

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'scheduled', scheduledAt: utcTime }
            : post
        )
      );

      // Update selected video
      setSelectedVideo(prev => ({
        ...prev,
        status: 'scheduled',
        scheduledAt: utcTime
      }));

      setScheduleMode(false);
      setScheduledTimeForApproval('');
      fetchPosts();
      alert('✅ Post approved and scheduled successfully!');
    } catch (err) {
      console.error('Error approving and scheduling post:', err);
      // Fallback: at least approve locally
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'approved' }
            : post
        )
      );
      setSelectedVideo(prev => ({ ...prev, status: 'approved' }));
      alert('⚠️ Approved (backend not connected for scheduling)');
    }
  };

  useEffect(() => {
    if (!selectedVideo || !selectedVideo.scheduledAt) return;

    const updateCountdown = () => {
      const timeInfo = formatScheduledTime(selectedVideo.scheduledAt);
      setCountdown(timeInfo.countdown);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [selectedVideo]);

    const handleVideoPreview = (post) => {
    // Open modal for any post to show details, caption, and hashtags
    // Video/image will display if path exists, otherwise shows placeholder
    setSelectedVideo(post);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
    setUploadProgress(null);
    stopPollingUploadProgress();
  };

  const handleThumbnailClick = (post) => {
    if (post.contentType === 'video' || post.contentType === 'image') {
      handleVideoPreview(post);
    }
  };

  // Upload progress handlers
  const startPollingUploadProgress = (postId) => {
    // Clear any existing interval
    if (progressPollInterval) {
      clearInterval(progressPollInterval);
    }

    // Poll every 500ms for progress updates
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tiktok/upload-progress/${postId}`);
        const data = await response.json();

        if (data.success) {
          setUploadProgress(data.data.uploadProgress);

          // Stop polling if upload is complete or failed
          if (data.data.uploadProgress.status === 'completed' ||
              data.data.uploadProgress.status === 'failed') {
            clearInterval(interval);
            setProgressPollInterval(null);

            // Refresh posts to get updated status
            fetchPosts();
          }
        }
      } catch (err) {
        console.error('Error polling upload progress:', err);
      }
    }, 500);

    setProgressPollInterval(interval);
  };

  const stopPollingUploadProgress = () => {
    if (progressPollInterval) {
      clearInterval(progressPollInterval);
      setProgressPollInterval(null);
    }
  };

  const handlePostToTikTok = async () => {
    if (!selectedVideo || selectedVideo.status !== 'approved') {
      alert('Please approve the post first');
      return;
    }

    try {
      // Initialize upload progress
      setUploadProgress({
        status: 'initializing',
        progress: 0,
        stage: 'Starting upload...'
      });

      // Start the upload
      const response = await fetch(`/api/tiktok/post/${selectedVideo._id}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to post to TikTok');
      }

      // Start polling for progress updates
      startPollingUploadProgress(selectedVideo._id);

      alert('✅ Posting to TikTok started! Check progress below.');
    } catch (err) {
      console.error('Error posting to TikTok:', err);
      setUploadProgress({
        status: 'failed',
        progress: 0,
        stage: 'Upload failed',
        errorMessage: err.message
      });
      alert(`❌ Error posting to TikTok: ${err.message}`);
    }
  };

  const handlePostToInstagram = async () => {
    if (!selectedVideo || selectedVideo.status !== 'approved') {
      alert('Please approve the post first');
      return;
    }

    try {
      // Initialize upload progress
      setUploadProgress({
        status: 'initializing',
        progress: 0,
        stage: 'Starting Instagram upload...'
      });

      // Start the upload using EventSource for SSE
      const eventSource = new EventSource(`/api/instagram/post/${selectedVideo._id}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.stage === 'completed') {
          setUploadProgress({
            status: 'completed',
            progress: 100,
            stage: 'Posted successfully!',
            mediaId: data.mediaId
          });

          // Update local state
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === selectedVideo._id
                ? { ...post, status: 'posted', postedAt: new Date().toISOString(), instagramPostId: data.mediaId }
                : post
            )
          );

          setSelectedVideo(prev => ({
            ...prev,
            status: 'posted',
            postedAt: new Date().toISOString(),
            instagramPostId: data.mediaId
          }));

          alert('✅ Successfully posted to Instagram!');
          eventSource.close();
        } else if (data.stage === 'failed') {
          setUploadProgress({
            status: 'failed',
            progress: 0,
            stage: 'Upload failed',
            errorMessage: data.error
          });
          alert(`❌ Error posting to Instagram: ${data.error}`);
          eventSource.close();
        } else {
          // Progress update
          setUploadProgress({
            status: 'uploading',
            progress: data.progress || 0,
            stage: data.stage || 'Uploading...'
          });
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        setUploadProgress({
          status: 'failed',
          progress: 0,
          stage: 'Upload failed',
          errorMessage: 'Connection error'
        });
        alert('❌ Error posting to Instagram: Connection error');
        eventSource.close();
      };

      // Store eventSource for cleanup
      window.currentInstagramEventSource = eventSource;

      alert('✅ Posting to Instagram started! Check progress below.');
    } catch (err) {
      console.error('Error posting to Instagram:', err);
      setUploadProgress({
        status: 'failed',
        progress: 0,
        stage: 'Upload failed',
        errorMessage: err.message
      });
      alert(`❌ Error posting to Instagram: ${err.message}`);
    }
  };

  const handleExportForManual = async () => {
    if (!selectedVideo) return;

    try {
      const response = await fetch(`http://localhost:3004/api/content/posts/${selectedVideo._id}/export`);

      if (!response.ok) {
        throw new Error('Failed to export post');
      }

      const result = await response.json();

      if (result.success) {
        setExportModal({
          isOpen: true,
          data: result.data
        });
      } else {
        alert(`❌ Error exporting post: ${result.error}`);
      }
    } catch (err) {
      console.error('Error exporting post:', err);
      alert(`❌ Error exporting post: ${err.message}`);
    }
  };

  const handleMarkAsManuallyPosted = async () => {
    if (!selectedVideo) return;

    const postedUrl = prompt('Enter the URL of the post (optional):');
    const notes = prompt('Add any notes about this post (optional):');

    try {
      const response = await fetch(`http://localhost:3004/api/content/posts/${selectedVideo._id}/manual-posted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postedUrl: postedUrl || null,
          notes: notes || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to mark as manually posted');
      }

      const result = await response.json();

      if (result.success) {
        // Update local state
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === selectedVideo._id
              ? { ...post, status: 'posted', postedAt: new Date().toISOString(), postedUrl: postedUrl || null }
              : post
          )
        );

        setSelectedVideo(prev => ({
          ...prev,
          status: 'posted',
          postedAt: new Date().toISOString(),
          postedUrl: postedUrl || null
        }));

        alert('✅ Post marked as manually posted!');
        setExportModal({ isOpen: false, data: null });
      } else {
        alert(`❌ Error marking as manually posted: ${result.error}`);
      }
    } catch (err) {
      console.error('Error marking as manually posted:', err);
      alert(`❌ Error marking as manually posted: ${err.message}`);
    }
  };

  const handleApprove = async () => {
    if (!selectedVideo) return;

    try {
      // Try API call first
      const response = await fetch(`/api/content/posts/${selectedVideo._id}/approve`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to approve post');
      }

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'approved' }
            : post
        )
      );

      // Update selected video
      setSelectedVideo(prev => ({ ...prev, status: 'approved' }));

      alert('✅ Post approved successfully!');
    } catch (err) {
      console.error('Error approving post:', err);
      // For development, update local state anyway
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'approved' }
            : post
        )
      );
      setSelectedVideo(prev => ({ ...prev, status: 'approved' }));
      alert('✅ Post approved! (Note: Backend not connected)');
    }
  };

  const handleReject = () => {
    if (!selectedVideo) return;
    // Open the rejection modal
    setRejectModal({
      isOpen: true,
      reason: '',
      blacklistStory: false
    });
  };

  const handleCloseRejectModal = () => {
    setRejectModal({
      isOpen: false,
      reason: '',
      blacklistStory: false
    });
  };

  const handleConfirmReject = async () => {
    if (!selectedVideo || !rejectModal.reason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    try {
      // Try API call first for rejection
      const rejectResponse = await fetch(`/api/content/posts/${selectedVideo._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectModal.reason })
      });

      if (!rejectResponse.ok) {
        throw new Error('Failed to reject post');
      }

      // If blacklist is checked, call blacklist API
      if (rejectModal.blacklistStory && selectedVideo.storyId) {
        try {
          const blacklistResponse = await fetch('/api/blacklist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storyId: selectedVideo.storyId,
              reason: rejectModal.reason,
              blacklistedBy: 'user'
            })
          });

          if (blacklistResponse.ok) {
            console.log('Story added to blacklist successfully');
          } else {
            console.warn('Failed to add story to blacklist, but post was rejected');
          }
        } catch (blacklistErr) {
          console.error('Error blacklisting story:', blacklistErr);
          // Continue even if blacklist fails
        }
      }

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'rejected' }
            : post
        )
      );

      handleCloseRejectModal();
      handleCloseModal();

      if (rejectModal.blacklistStory) {
        alert('❌ Post rejected and story blacklisted.');
      } else {
        alert('❌ Post rejected.');
      }
    } catch (err) {
      console.error('Error rejecting post:', err);
      // For development, update local state anyway
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'rejected' }
            : post
        )
      );
      handleCloseRejectModal();
      handleCloseModal();
      alert('❌ Post rejected! (Note: Backend not connected)');
    }
  };

  // Duplicate handler
  const handleDuplicate = async () => {
    if (!selectedVideo) return;

    const confirmed = window.confirm(
      'Create a duplicate of this post for regeneration?\n\n' +
      'The duplicate will:\n' +
      '• Have "draft" status\n' +
      '• Be scheduled for tomorrow\n' +
      '• Have the same story and content\n' +
      '• Be ready for regeneration with new variations'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/content/posts/${selectedVideo._id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate post');
      }

      const result = await response.json();

      if (result.success) {
        // Add the duplicated post in the correct sorted position
        setPosts(prevPosts => insertPostSorted(result.data, prevPosts));

        alert('✅ Post duplicated successfully!\n\nThe new post has been added to your library with "draft" status.');
        handleCloseModal();
      } else {
        alert(`❌ Error duplicating post: ${result.error}`);
      }
    } catch (err) {
      console.error('Error duplicating post:', err);
      alert('❌ Failed to duplicate post. Please try again.');
    }
  };

  // Delete handlers
  const handleDelete = () => {
    if (!selectedVideo) return;
    setDeleteModal({
      isOpen: true,
      postToDelete: selectedVideo
    });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      postToDelete: null
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.postToDelete) return;

    try {
      const response = await fetch(`/api/content/posts/${deleteModal.postToDelete._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      const result = await response.json();

      if (result.success) {
        // Remove the deleted post from local state
        setPosts(prevPosts =>
          prevPosts.filter(post => post._id !== deleteModal.postToDelete._id)
        );

        // Update pagination count
        setPagination(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));

        alert('✅ Post deleted successfully!');
        handleCloseModal();
        handleCloseDeleteModal();
      } else {
        alert(`❌ Error deleting post: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('❌ Failed to delete post. Please try again.');
    }
  };

  // Regenerate handlers
  const handleRegenerate = () => {
    if (!selectedVideo) return;
    setRegenerateModal({
      isOpen: true,
      feedback: ''
    });
  };

  const handleCloseRegenerateModal = () => {
    setRegenerateModal({
      isOpen: false,
      feedback: ''
    });
  };

  const handleConfirmRegenerate = async () => {
    if (!selectedVideo) {
      alert('No content selected for regeneration.');
      return;
    }

    try {
      console.log('🔄 Requesting content regeneration with feedback:', regenerateModal.feedback);

      // Call the regenerate API endpoint
      const response = await fetch(`/api/content/${selectedVideo._id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback: regenerateModal.feedback
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Regeneration successful:', result);

        // Update the post in the local state
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === selectedVideo._id
              ? { ...post, ...result.post, status: 'draft' }
              : post
          )
        );

        // Update selectedVideo if it's the same post
        if (selectedVideo._id === result.post._id) {
          setSelectedVideo(result.post);
        }

        handleCloseRegenerateModal();
        handleCloseModal();

        alert('✅ Content regeneration requested! New content will be generated shortly.');
      } else {
        throw new Error('Failed to request regeneration');
      }
    } catch (error) {
      console.error('❌ Error requesting regeneration:', error);

      // For development: show success message anyway
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'draft' }
            : post
        )
      );

      handleCloseRegenerateModal();
      handleCloseModal();

      alert('✅ Regeneration requested! (Note: Backend not connected)\n\nFeedback: ' + regenerateModal.feedback);
    }
  };

  // Manual TikTok match handlers
  const handleOpenManualMatchDialog = () => {
    if (!selectedVideo) return;

    setManualMatchDialog({
      isOpen: true,
      postId: selectedVideo._id,
      postCaption: selectedVideo.caption
    });
  };

  const handleCloseManualMatchDialog = () => {
    setManualMatchDialog({
      isOpen: false,
      postId: null,
      postCaption: null
    });
  };

  const handleManualMatchSuccess = (data) => {
    // Refresh the posts to get updated data
    fetchPosts();
  };

  // Generate Tier 1 Video handler
  const handleGenerateTier1Video = async () => {
    if (!selectedVideo) {
      alert('No content selected for video generation.');
      return;
    }

    const storyId = selectedVideo.storyId;
    if (!storyId) {
      alert('This post is not associated with a story. Cannot generate video.');
      return;
    }

    if (!confirm('Generate a Tier 1 Enhanced Static video for this story?\n\nThis will:\n- Generate an AI image from the story\n- Create narration with TTS\n- Add video effects (Ken Burns, text overlay)\n- Mix with background music\n\nEstimated time: 1-2 minutes')) {
      return;
    }

    try {
      const response = await fetch('/api/tiered-video/generate-tier1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: storyId,
          caption: selectedVideo.caption || '',
          hook: selectedVideo.hook || '',
          platform: selectedVideo.platform || 'tiktok',
          createPost: true
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Tier 1 video generated successfully!\n\nVideo saved to: ${result.data.videoPath}\nDuration: ${result.data.duration.toFixed(1)}s`);
        // Refresh the posts list
        fetchPosts();
        handleCloseModal();
      } else {
        throw new Error(result.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('❌ Error generating video:', error);
      alert(`❌ Failed to generate video: ${error.message}\n\nPlease check:\n1. RunPod API keys are configured\n2. Story has valid content\n3. FFmpeg is available`);
    }
  };

  // Edit mode handlers
  const handleStartEdit = () => {
    if (!selectedVideo) return;
    setEditMode(true);
    setEditedCaption(selectedVideo.caption || '');

    // Load platform-specific hashtags
    if (selectedVideo.hashtags) {
      if (Array.isArray(selectedVideo.hashtags)) {
        // Legacy format - same hashtags for all platforms
        const hashtagsStr = selectedVideo.hashtags.join(', ');
        setEditedHashtags({
          tiktok: hashtagsStr,
          instagram: hashtagsStr,
          youtube_shorts: hashtagsStr
        });
      } else if (typeof selectedVideo.hashtags === 'object') {
        // Platform-specific structure
        setEditedHashtags({
          tiktok: (selectedVideo.hashtags.tiktok || []).join(', '),
          instagram: (selectedVideo.hashtags.instagram || []).join(', '),
          youtube_shorts: (selectedVideo.hashtags.youtube_shorts || []).join(', ')
        });
      }
    } else {
      // Default hashtags (without "#" - will be added when posting)
      setEditedHashtags({
        tiktok: 'blushapp, romance, storytime',
        instagram: 'blushapp, romance, storytime',
        youtube_shorts: 'blushapp, romance, storytime'
      });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedCaption('');
    setEditedHashtags({
      tiktok: '',
      instagram: '',
      youtube_shorts: ''
    });
  };

  // Platform editing handlers
  const handleEditPlatforms = () => {
    setPlatformEditMode(true);
  };

  const handleTogglePlatform = async (platform, isSelected) => {
    if (!selectedVideo) return;

    const currentPlatforms = getPostPlatforms(selectedVideo);

    if (isSelected) {
      // Add platform if not already present
      if (!currentPlatforms.includes(platform)) {
        await updatePostPlatforms(selectedVideo._id, [...currentPlatforms, platform]);
      }
    } else {
      // Remove platform (only if not posted/posting)
      const platformData = selectedVideo.platformStatus?.[platform];
      if (platformData?.status === 'posted' || platformData?.status === 'posting') {
        alert(`Cannot remove ${platform} - already ${platformData.status}`);
        return;
      }

      const updatedPlatforms = currentPlatforms.filter(p => p !== platform);
      if (updatedPlatforms.length === 0) {
        alert('At least one platform must be selected');
        return;
      }
      await updatePostPlatforms(selectedVideo._id, updatedPlatforms);
    }
  };

  const updatePostPlatforms = async (postId, newPlatforms) => {
    try {
      const response = await fetch(`/api/content/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: newPlatforms })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update platforms');
      }

      const result = await response.json();
      alert('Platforms updated successfully');
      // Refresh posts
      fetchPosts();
      setSelectedVideo(result.data);
    } catch (error) {
      console.error('Error updating platforms:', error);
      alert(`Failed to update platforms: ${error.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedVideo) return;

    try {
      // Convert comma-separated strings back to arrays for each platform
      // Strip "#" from user input before sending to backend
      const updatedHashtags = {
        tiktok: editedHashtags.tiktok
          ? editedHashtags.tiktok.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
          : [],
        instagram: editedHashtags.instagram
          ? editedHashtags.instagram.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
          : [],
        youtube_shorts: editedHashtags.youtube_shorts
          ? editedHashtags.youtube_shorts.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
          : []
      };

      // Preserve existing hashtags for platforms not being edited
      if (selectedVideo.hashtags && typeof selectedVideo.hashtags === 'object') {
        if (!updatedHashtags.tiktok.length) updatedHashtags.tiktok = selectedVideo.hashtags.tiktok || [];
        if (!updatedHashtags.instagram.length) updatedHashtags.instagram = selectedVideo.hashtags.instagram || [];
        if (!updatedHashtags.youtube_shorts.length) updatedHashtags.youtube_shorts = selectedVideo.hashtags.youtube_shorts || [];
      }

      // Try API call first (uses Vite proxy)
      const response = await fetch(`/api/content/posts/${selectedVideo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: editedCaption,
          hashtags: updatedHashtags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, caption: editedCaption, hashtags: updatedHashtags }
            : post
        )
      );

      // Update selected video
      setSelectedVideo(prev => ({
        ...prev,
        caption: editedCaption,
        hashtags: updatedHashtags
      }));

      alert('✅ Changes saved successfully!');
      setEditMode(false);
    } catch (err) {
      console.error('Error saving post:', err);
      // For development, update local state anyway
      const updatedHashtags = {
        tiktok: editedHashtags.tiktok
          ? editedHashtags.tiktok.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
          : [],
        instagram: editedHashtags.instagram
          ? editedHashtags.instagram.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
          : [],
        youtube_shorts: editedHashtags.youtube_shorts
          ? editedHashtags.youtube_shorts.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
          : []
      };
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, caption: editedCaption, hashtags: updatedHashtags }
            : post
        )
      );
      setSelectedVideo(prev => ({
        ...prev,
        caption: editedCaption,
        hashtags: updatedHashtags
      }));
      alert('✅ Changes saved! (Note: Backend not connected)');
      setEditMode(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedVideo) return;

    // For now, show a message that download functionality requires actual video files
    // In production, this would download the video/image file from the server
    const filePath = selectedVideo.videoPath || selectedVideo.imagePath;

    if (!filePath) {
      alert('⚠️ No media file available for download.\n\nThis post was created without an actual video/image file. In production, generated content would be stored locally and available for download.');
      return;
    }

    // Create a download link using the existing /api/storage/file/* endpoint
    try {
      const response = await fetch(`/api/storage/file/${filePath}`);

      if (!response.ok) {
        throw new Error('File not found on server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || `content-${selectedVideo._id}.${selectedVideo.contentType === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('✅ Download started!');
    } catch (err) {
      console.error('Download error:', err);
      alert('⚠️ Download failed: File not available on server\n\nThe file path was: ' + filePath + '\n\nIn production, files would be stored in the local storage directory and served via the API.');
    }
  };

  // Bulk Action Handlers
  const handleToggleSelect = (postId) => {
    setBulkSelected(prev => {
      if (prev.includes(postId)) {
        return prev.filter(id => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setBulkSelected([]);
    } else {
      setBulkSelected(posts.map(post => post._id));
    }
    setSelectAll(!selectAll);
  };

  const handleClearSelection = () => {
    setBulkSelected([]);
    setSelectAll(false);
  };

  const handleBulkDelete = async () => {
    if (bulkSelected.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${bulkSelected.length} post(s)?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/content/posts/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bulkSelected })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        handleClearSelection();
        fetchPosts();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(`❌ Error deleting posts: ${err.message}`);
    }
  };

  const handleBulkApprove = async () => {
    if (bulkSelected.length === 0) return;

    try {
      const response = await fetch('/api/content/posts/bulk/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bulkSelected })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        handleClearSelection();
        fetchPosts();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Bulk approve error:', err);
      alert(`❌ Error approving posts: ${err.message}`);
    }
  };

  const handleBulkReject = async () => {
    if (bulkSelected.length === 0) return;

    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      const response = await fetch('/api/content/posts/bulk/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bulkSelected, reason })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        handleClearSelection();
        fetchPosts();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Bulk reject error:', err);
      alert(`❌ Error rejecting posts: ${err.message}`);
    }
  };

  const handleBulkExport = async () => {
    if (bulkSelected.length === 0) return;

    try {
      const response = await fetch('/api/content/posts/bulk/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bulkSelected })
      });

      const result = await response.json();

      if (result.success) {
        // Download as JSON file
        const dataStr = JSON.stringify(result.data.posts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulk-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`✅ Exported ${result.data.exportCount} posts`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Bulk export error:', err);
      alert(`❌ Error exporting posts: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <LibraryContainer>
        <Header>
          <Title>Content Library</Title>
        </Header>
        <LoadingSpinner
          variant="circular"
          size="large"
          text="Loading content..."
          color="#e94560"
        />
      </LibraryContainer>
    );
  }

  return (
    <LibraryContainer>
      <Header>
        <Title>Content Library</Title>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <CreatePostButton onClick={handleOpenCreatePost}>+ Create Post</CreatePostButton>
          <Button onClick={fetchPosts}>🔄 Refresh</Button>
        </div>
      </Header>

      <FilterBar>
        <SearchInput
          type="text"
          placeholder="Search by title or story name..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />

        <FilterSelect
          value={filters.platform}
          onChange={(e) => handleFilterChange('platform', e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube_shorts">YouTube Shorts</option>
        </FilterSelect>

        <FilterSelect
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="posted">Posted</option>
          <option value="rejected">Rejected</option>
        </FilterSelect>

        <FilterSelect
          value={filters.tier}
          onChange={(e) => handleFilterChange('tier', e.target.value)}
        >
          <option value="all">All Tiers</option>
          <option value="tier_1">Tier 1 (AI Video)</option>
          <option value="tier_2">Tier 2 (AI Avatar)</option>
          <option value="tier_3">Tier 3 (Full Production)</option>
        </FilterSelect>

        <DateFilterContainer>
          <DateFilterButton
            $active={filters.dateRange === 'all'}
            onClick={() => handleFilterChange('dateRange', 'all')}
          >
            All Time
          </DateFilterButton>
          <DateFilterButton
            $active={filters.dateRange === '7days'}
            onClick={() => handleFilterChange('dateRange', '7days')}
          >
            Last 7 Days
          </DateFilterButton>
          <DateFilterButton
            $active={filters.dateRange === '30days'}
            onClick={() => handleFilterChange('dateRange', '30days')}
          >
            Last 30 Days
          </DateFilterButton>
          <DateFilterButton
            $active={filters.dateRange === '90days'}
            onClick={() => handleFilterChange('dateRange', '90days')}
          >
            Last 90 Days
          </DateFilterButton>
          <DateFilterButton
            $active={filters.dateRange === 'custom'}
            onClick={() => handleFilterChange('dateRange', 'custom')}
          >
            Custom
          </DateFilterButton>
        </DateFilterContainer>

        {filters.dateRange === 'custom' && (
          <DateFilterContainer>
            <DateInput
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
              placeholder="Start Date"
            />
            <span style={{ color: '#a0a0a0' }}>to</span>
            <DateInput
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
              placeholder="End Date"
            />
          </DateFilterContainer>
        )}
      </FilterBar>

      {/* Select All Checkbox */}
      {posts.length > 0 && (
        <SelectAllContainer>
          <BulkCheckbox
            type="checkbox"
            checked={selectAll}
            onChange={handleToggleSelectAll}
          />
          <span>Select All ({posts.length} posts)</span>
        </SelectAllContainer>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar $visible={bulkSelected.length > 0}>
        <BulkActionsInfo>
          {bulkSelected.length} post{bulkSelected.length !== 1 ? 's' : ''} selected
          <BulkActionsCount>{bulkSelected.length}</BulkActionsCount>
        </BulkActionsInfo>
        <BulkActionButton $action="approve" onClick={handleBulkApprove}>
          ✅ Approve All
        </BulkActionButton>
        <BulkActionButton $action="reject" onClick={handleBulkReject}>
          ❌ Reject All
        </BulkActionButton>
        <BulkActionButton $action="export" onClick={handleBulkExport}>
          📤 Export All
        </BulkActionButton>
        <BulkActionButton $action="delete" onClick={handleBulkDelete}>
          🗑️ Delete All
        </BulkActionButton>
        <BulkActionsClear onClick={handleClearSelection}>
          Clear Selection
        </BulkActionsClear>
      </BulkActionsBar>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid #dc3545',
          borderRadius: '6px',
          color: '#ff6b6b'
        }}>
          ⚠️ Using mock data - Backend disconnected: {error}
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState>
          <h3>No content found</h3>
          <p>Try adjusting your filters or generate some content</p>
        </EmptyState>
      ) : (
        <>
          <ContentGrid>
            {posts.map(post => (
              <ContentCard key={post._id} $selected={bulkSelected.includes(post._id)}>
                <CheckboxContainer>
                  <BulkCheckbox
                    type="checkbox"
                    checked={bulkSelected.includes(post._id)}
                    onChange={() => handleToggleSelect(post._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </CheckboxContainer>
                <ThumbnailContainer onClick={() => handleThumbnailClick(post)}>
                  <Thumbnail platform={post.platform} $thumbnail={post.thumbnailPath}>
                    {!post.thumbnailPath && '📹'}
                  </Thumbnail>
                  {isMultiPlatform(post) ? (
                    <>
                      <MultiPlatformIndicator>
                        <MultiPlatformBadge>{getPostPlatforms(post).length}</MultiPlatformBadge>
                      </MultiPlatformIndicator>
                      <StatusBadge status={post.status}>
                        {getStatusDisplayText(post)}
                      </StatusBadge>
                    </>
                  ) : (
                    <StatusBadge status={post.status}>
                      {getStatusDisplayText(post)}
                    </StatusBadge>
                  )}
                  {post.contentTier && (
                    <TierBadge tier={post.contentTier}>
                      {post.contentTier === 'tier_1' ? '🎬 T1' : post.contentTier === 'tier_2' ? '🎭 T2' : post.contentTier === 'tier_3' ? '🎞️ T3' : post.contentTier}
                    </TierBadge>
                  )}
                  {/* Platform icons indicator with status dots */}
                  <PlatformIcons>
                    {getPostPlatforms(post).map(platform => {
                      const platformData = post.platformStatus?.[platform];
                      const platformStatus = platformData?.status || 'pending';
                      return (
                        <PlatformIconBadge key={platform} $platform={platform}>
                          {platform === 'tiktok' && <TikTokIcon />}
                          {platform === 'instagram' && <InstagramIcon />}
                          {platform === 'youtube_shorts' && <YouTubeIcon />}
                          <PlatformStatusDot
                            status={platformStatus}
                            title={`${platform}: ${platformStatus}`}
                          />
                        </PlatformIconBadge>
                      );
                    })}
                  </PlatformIcons>
                  {post.status === 'generating' && (
                    <GeneratingProgress>
                      <GeneratingProgressBar>
                        <GeneratingProgressFill $percent={post.videoGenerationProgress?.progress || 0} />
                      </GeneratingProgressBar>
                      <GeneratingStatusText>
                        {post.videoGenerationProgress?.currentStep || 'Generating...'} ({Math.round(post.videoGenerationProgress?.progress || 0)}%)
                      </GeneratingStatusText>
                    </GeneratingProgress>
                  )}
                </ThumbnailContainer>

                <CardContent>
                  <CardTitle title={post.title}>
                    {post.title}
                  </CardTitle>

                  {post.storyName && (
                    <StoryName>
                      📖 {post.storyName}
                    </StoryName>
                  )}

                  {/* Platform status list for multi-platform posts */}
                  {isMultiPlatform(post) && (
                    <PlatformStatusList>
                      {getPostPlatforms(post).map(platform => {
                        const platformData = post.platformStatus?.[platform];
                        const platformStatus = platformData?.status || 'pending';
                        const platformName = platform === 'youtube_shorts' ? 'YT' :
                          platform === 'tiktok' ? 'TT' :
                          platform === 'instagram' ? 'IG' : platform;
                        return (
                          <PlatformStatusItem key={platform} $status={platformStatus}>
                            {platformName}: {platformStatus}
                          </PlatformStatusItem>
                        );
                      })}
                    </PlatformStatusList>
                  )}
                  <CardMeta>
                    {/* For multi-platform posts, show per-platform times */}
                    {(() => {
                      const perPlatformTimes = getPerPlatformTimeDisplay(post);
                      if (perPlatformTimes && perPlatformTimes.length > 0) {
                        return (
                          <ScheduledTime>
                            <PerPlatformTimeContainer>
                              {perPlatformTimes.map(({ platform, text, color, status }) => (
                                <PerPlatformTimeItem key={platform} $color={color}>
                                  🕒 <PlatformTimeLabel>{platform}:</PlatformTimeLabel> {text}
                                </PerPlatformTimeItem>
                              ))}
                            </PerPlatformTimeContainer>
                          </ScheduledTime>
                        );
                      }

                      // Fallback to single time display
                      const timeDisplay = getTimeDisplay(post);
                      return (
                        <ScheduledTime>
                          🕒 <TimeLabel $color={timeDisplay.color}>{timeDisplay.text}</TimeLabel>
                        </ScheduledTime>
                      );
                    })()}
                  </CardMeta>

                  {/* Posted content link and stats */}
                  {(() => {
                    const platforms = getPostPlatforms(post);

                    // Check if ANY platform is posted (regardless of overall status) - FIX for partial posting
                    const postedPlatforms = platforms.filter(p =>
                      post.platformStatus?.[p]?.status === 'posted'
                    );
                    const hasPostedPlatforms = postedPlatforms.length > 0;

                    // Check for aggregate metrics (improved condition to catch all metric types)
                    const hasAggregateMetrics = post.performanceMetrics && (
                      post.performanceMetrics.views > 0 ||
                      post.performanceMetrics.likes > 0 ||
                      post.performanceMetrics.comments > 0 ||
                      post.performanceMetrics.shares > 0 ||
                      post.performanceMetrics.saved > 0
                    );

                    // Show metrics section if ANY platform is posted OR if there are aggregate metrics
                    const shouldShowMetricsSection = hasPostedPlatforms || hasAggregateMetrics;

                    if (!shouldShowMetricsSection) return null;

                    return (
                      <>
                        {getPostedLink(post)}

                        {(() => {
                          // Check if post has per-platform metrics in platformStatus
                          const hasPerPlatformMetrics = post.platformStatus &&
                            Object.keys(post.platformStatus).some(key => platforms.includes(key));

                          // Always show per-platform stats if platformStatus exists (even for single-platform posts)
                          if (hasPerPlatformMetrics) {
                            return (
                              <PerPlatformStats>
                                {platforms.map(platform => {
                                  const platformData = post.platformStatus?.[platform];
                                  const metrics = platformData?.performanceMetrics;
                                  const isPosted = platformData?.status === 'posted';

                                  // Only show platforms that have been posted OR have metrics
                                  // This allows showing metrics for partially posted posts
                                  if (!isPosted && (!metrics || (metrics.views || 0) === 0)) return null;

                                  const platformName = platform === 'youtube_shorts' ? 'YouTube' :
                                    platform.charAt(0).toUpperCase() + platform.slice(1);

                                  return (
                                    <PlatformStatsRow key={platform}>
                                      <PlatformStatsLabel>
                                        {platform === 'tiktok' && <TikTokIcon />}
                                        {platform === 'instagram' && <InstagramIcon />}
                                        {platform === 'youtube_shorts' && <YouTubeIcon />}
                                        {platformName}
                                      </PlatformStatsLabel>
                                      <PlatformMetrics>
                                        {metrics && (metrics.views > 0 || metrics.likes > 0 || metrics.comments > 0 || metrics.shares > 0) ? (
                                          <>
                                            <span>👁️ <span className="stat-value">{formatNumber(metrics.views || 0)}</span></span>
                                            <span>❤️ <span className="stat-value">{formatNumber(metrics.likes || 0)}</span></span>
                                            {(metrics.comments || 0) > 0 && (
                                              <span>💬 <span className="stat-value">{formatNumber(metrics.comments)}</span></span>
                                            )}
                                            {(metrics.shares || 0) > 0 && (
                                              <span>🔗 <span className="stat-value">{formatNumber(metrics.shares)}</span></span>
                                            )}
                                          </>
                                        ) : (
                                          <span style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>
                                            {isPosted ? 'Fetching...' : 'Pending'}
                                          </span>
                                        )}
                                      </PlatformMetrics>
                                    </PlatformStatsRow>
                                  );
                                })}
                              </PerPlatformStats>
                            );
                          }

                          // Fallback to aggregate metrics for legacy posts without platformStatus
                          if (hasAggregateMetrics) {
                            // Show aggregate stats for single-platform or legacy posts
                            return (
                              <StatsRow>
                                <StatItem>👁️ <span className="stat-value">{formatNumber(post.performanceMetrics.views)}</span></StatItem>
                                <StatItem>❤️ <span className="stat-value">{formatNumber(post.performanceMetrics.likes)}</span></StatItem>
                                {post.performanceMetrics.comments > 0 && (
                                  <StatItem>💬 <span className="stat-value">{formatNumber(post.performanceMetrics.comments)}</span></StatItem>
                                )}
                                {post.performanceMetrics.shares > 0 && (
                                  <StatItem>🔗 <span className="stat-value">{formatNumber(post.performanceMetrics.shares)}</span></StatItem>
                                )}
                              </StatsRow>
                            );
                          }
                          return null;
                        })()}
                      </>
                    );
                  })()}

                  {/* Tier 2 script preview */}
                  {post.contentTier === 'tier_2' && !post.videoPath && (
                    <ScriptPreview>
                      <ScriptLabel>Avatar Script</ScriptLabel>
                      {getTier2Script(post) ? (
                        <div>{getTier2Script(post).substring(0, 150)}...</div>
                      ) : (
                        <NoScriptMessage>No script available. Click "Edit Details" to add one.</NoScriptMessage>
                      )}
                    </ScriptPreview>
                  )}

                  <CardActions>
                    <ActionButton onClick={() => handleThumbnailClick(post)}>
                      {post.contentType === 'video' ? '▶ Play' : 'View'}
                    </ActionButton>
                    {post.contentTier === 'tier_2' ? (
                      <>
                        {!post.videoPath && (
                          <ActionButton onClick={() => {
                            setSelectedPostForTier2Upload(post);
                            setTier2UploadModal(true);
                          }}>📤 Upload Video</ActionButton>
                        )}
                        <ActionButton onClick={() => {
                          setSelectedPostForTier2Edit(post);
                          setEditTier2Modal(true);
                        }}>✏️ Edit Details</ActionButton>
                        {/* View button for posts with video */}
                        {post.videoPath && (
                          <ActionButton onClick={() => {
                            setSelectedVideo(post);
                            setEditMode(false);
                            setEditedCaption('');
                            setEditedHashtags([]);
                          }}>View</ActionButton>
                        )}
                      </>
                    ) : (
                      <ActionButton onClick={() => {
                        setSelectedVideo(post);
                        setEditMode(false);  // View mode, not edit mode
                        setEditedCaption('');
                        setEditedHashtags([]);
                      }}>Edit</ActionButton>
                    )}
                  </CardActions>
                </CardContent>
              </ContentCard>
            ))}
          </ContentGrid>

          {selectedVideo && (
            <ModalOverlay onClick={handleCloseModal}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                {/* Close button positioned absolutely */}
                <CloseButton onClick={handleCloseModal}>✕ Close</CloseButton>

                {/* Video/Image section - left side on wide screens */}
                <ModalVideoSection>
                  {selectedVideo.contentType === 'video' ? (
                    selectedVideo.videoPath ? (
                      <VideoContainer>
                        <VideoPlayer
                          key={selectedVideo.videoPath}  // Force remount when videoPath changes
                          src={selectedVideo.videoPath}
                          controls
                          autoPlay
                          onError={(e) => {
                            console.error('Video error:', e);
                            alert('Failed to load video. The video file may not exist yet.');
                          }}
                        />
                      </VideoContainer>
                    ) : (
                      <VideoContainer>
                        <VideoPlaceholder>
                          🎬 Video not generated yet
                        </VideoPlaceholder>
                      </VideoContainer>
                    )
                  ) : (
                    selectedVideo.imagePath ? (
                      <ImageContainer>
                        <ImagePreview
                          src={selectedVideo.imagePath}
                          alt={selectedVideo.title || 'Content preview'}
                          onError={(e) => {
                            console.error('Image error:', e);
                            alert('Failed to load image. The image file may not exist yet.');
                          }}
                        />
                      </ImageContainer>
                    ) : (
                      <ImageContainer>
                        <VideoPlaceholder>
                          📷 Image not generated yet
                        </VideoPlaceholder>
                      </ImageContainer>
                    )
                  )}
                </ModalVideoSection>

                {/* Details section - right side on wide screens */}
                <ModalDetailsSection>
                  <ModalInfo>
                  <ModalTitle>{selectedVideo.title}</ModalTitle>
                  <PostIdBadge>ID: {selectedVideo._id}</PostIdBadge>

                  {/* Scheduled Time Section */}
                  {selectedVideo.scheduledAt && (
                    <ScheduledTimeSection>
                      <ScheduledTimeInfo>
                        <ScheduledTimeHeader>
                          📅 Scheduled Posting Time
                        </ScheduledTimeHeader>
                        <ScheduledTimeDisplay>
                          🕐 {formatScheduledTime(selectedVideo.scheduledAt).formatted}
                        </ScheduledTimeDisplay>
                        {countdown && (
                          <CountdownTimer>
                            ⏱️ Posting in {countdown}
                          </CountdownTimer>
                        )}
                        <TimezoneDisplay>
                          🌍 {getTimezone()}
                        </TimezoneDisplay>
                      </ScheduledTimeInfo>
                      {selectedVideo.status !== 'posted' && selectedVideo.status !== 'rejected' && (
                        <RescheduleButton onClick={handleStartReschedule} disabled={rescheduleMode}>
                          📅 Reschedule
                        </RescheduleButton>
                      )}
                    </ScheduledTimeSection>
                  )}

                  {rescheduleMode && (
                    <DateTimePickerContainer $visible={rescheduleMode}>
                      <DateTimePickerRow>
                        <label style={{ color: '#eaeaea', fontWeight: '600' }}>New Date & Time:</label>
                        <DateTimeInput
                          type="datetime-local"
                          value={newScheduledTime}
                          onChange={(e) => setNewScheduledTime(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <ConfirmRescheduleButton onClick={handleConfirmReschedule}>
                          ✅ Confirm
                        </ConfirmRescheduleButton>
                        <CancelRescheduleButton onClick={handleCancelReschedule}>
                          ✖ Cancel
                        </CancelRescheduleButton>
                      </DateTimePickerRow>
                    </DateTimePickerContainer>
                  )}

                  {/* Schedule Mode UI */}
                  {scheduleMode && (
                    <DateTimePickerContainer $visible={scheduleMode}>
                      <DateTimePickerRow>
                        <label style={{ color: '#eaeaea', fontWeight: '600' }}>📅 Schedule for:</label>
                        <DateTimeInput
                          type="datetime-local"
                          value={scheduledTimeForApproval}
                          onChange={(e) => setScheduledTimeForApproval(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <ConfirmScheduleButton onClick={handleApproveAndSchedule}>
                          ✅ Confirm & Schedule
                        </ConfirmScheduleButton>
                        <CancelScheduleButton onClick={handleCancelSchedule}>
                          ✖ Cancel
                        </CancelScheduleButton>
                      </DateTimePickerRow>
                    </DateTimePickerContainer>
                  )}

                  {/* Edit Mode UI */}
                  {editMode ? (
                    <>
                      <EditActionsRow>
                        <EditButton onClick={handleCancelEdit}>✖ Cancel Edit</EditButton>
                        <SaveButton onClick={handleSaveEdit}>💾 Save Changes</SaveButton>
                      </EditActionsRow>

                      <label style={{display: 'block', marginBottom: '0.5rem', color: '#eaeaea', fontWeight: '500'}}>
                        Caption
                      </label>
                      <EditCaptionTextarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        placeholder="Enter caption for this post..."
                      />

                      <label style={{display: 'block', marginTop: '1rem', marginBottom: '0.5rem', color: '#eaeaea', fontWeight: '500'}}>
                        Hashtags (comma separated)
                      </label>

                      {getSelectedPlatforms(selectedVideo).map(platform => (
                        <div key={platform} style={{ marginBottom: '0.75rem' }}>
                          <label style={{ fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.25rem', display: 'block' }}>
                            {platform === 'youtube_shorts' ? '▶️ YouTube Shorts' :
                             platform === 'tiktok' ? '🎵 TikTok' :
                             platform === 'instagram' ? '📸 Instagram' : platform}
                          </label>
                          <EditCaptionTextarea
                            value={editedHashtags[platform] || ''}
                            onChange={(e) => setEditedHashtags(prev => ({ ...prev, [platform]: e.target.value }))}
                            placeholder="romance, storytime, blushapp"
                            rows={1}
                            style={{ minHeight: '40px', fontSize: '0.9rem' }}
                          />
                        </div>
                      ))}
                    </>
                  ) : platformEditMode ? (
                    <>
                      {/* Platform Edit Mode UI */}
                      <EditActionsRow>
                        <EditButton onClick={() => setPlatformEditMode(false)}>✖ Cancel</EditButton>
                      </EditActionsRow>

                      <PlatformEditContainer>
                        <PlatformEditLabel>Select Platforms to Post:</PlatformEditLabel>
                        {['tiktok', 'instagram', 'youtube_shorts'].map(platform => {
                          const platformData = selectedVideo.platformStatus?.[platform];
                          const isPosted = platformData?.status === 'posted';
                          const isPosting = platformData?.status === 'posting';
                          const isSelected = getPostPlatforms(selectedVideo).includes(platform);

                          return (
                            <PlatformEditItem key={platform}>
                              <PlatformEditCheckbox
                                type="checkbox"
                                id={`platform-${platform}`}
                                checked={isSelected}
                                disabled={isPosted || isPosting}
                                onChange={(e) => handleTogglePlatform(platform, e.target.checked)}
                              />
                              <PlatformEditLabel htmlFor={`platform-${platform}`}>
                                {platform === 'youtube_shorts' ? 'YouTube Shorts' :
                                 platform.charAt(0).toUpperCase() + platform.slice(1)}
                                {isPosted && ' ✅'}
                                {isPosting && ' 🔄'}
                                {!isPosted && !isPosting && platformData?.status === 'failed' && ' ❌'}
                              </PlatformEditLabel>
                            </PlatformEditItem>
                          );
                        })}
                      </PlatformEditContainer>
                    </>
                  ) : (
                    <>
                      {/* View Mode UI */}
                      {selectedVideo.caption && (
                        <ModalCaption>{selectedVideo.caption}</ModalCaption>
                      )}
                      {selectedVideo.hashtags && (
                        <HashtagPlatformsContainer>
                          {Object.entries(selectedVideo.hashtags).filter(([platform, tags]) =>
                            platform !== 'youtube_shorts' ? platform : ['tiktok', 'instagram', 'youtube_shorts'].includes(platform)
                          ).map(([platform, tags]) => (
                            tags && tags.length > 0 && (
                              <HashtagPlatformSection key={platform}>
                                <PlatformLabel>
                                  {platform === 'youtube_shorts' ? '▶️ YouTube Shorts' :
                                   platform === 'tiktok' ? '🎵 TikTok' :
                                   platform === 'instagram' ? '📸 Instagram' : platform}
                                </PlatformLabel>
                                <ModalHashtags>
                                  {tags.map((tag, index) => (
                                    <Hashtag key={index}>{tag}</Hashtag>
                                  ))}
                                </ModalHashtags>
                              </HashtagPlatformSection>
                            )
                          ))}
                        </HashtagPlatformsContainer>
                      )}
                    </>
                  )}

                  {selectedVideo.status === 'posted' && selectedVideo.performanceMetrics && (
                    <PerformanceMetrics>
                      <MetricsTitle>Performance Metrics</MetricsTitle>
                      <MetricsGrid>
                        <MetricItem>
                          <MetricLabel>Views</MetricLabel>
                          <MetricValue>{formatMetric(selectedVideo.performanceMetrics.views)}</MetricValue>
                        </MetricItem>
                        <MetricItem>
                          <MetricLabel>Likes</MetricLabel>
                          <MetricValue>{formatMetric(selectedVideo.performanceMetrics.likes)}</MetricValue>
                        </MetricItem>
                        <MetricItem>
                          <MetricLabel>Comments</MetricLabel>
                          <MetricValue>{formatMetric(selectedVideo.performanceMetrics.comments)}</MetricValue>
                        </MetricItem>
                        <MetricItem>
                          <MetricLabel>Shares</MetricLabel>
                          <MetricValue>{formatMetric(selectedVideo.performanceMetrics.shares)}</MetricValue>
                        </MetricItem>
                        <EngagementRate>
                          <EngagementLabel>Engagement Rate</EngagementLabel>
                          <EngagementValue $rate={selectedVideo.performanceMetrics.engagementRate}>
                            {selectedVideo.performanceMetrics.engagementRate?.toFixed(2) || '0.00'}%
                          </EngagementValue>
                        </EngagementRate>
                      </MetricsGrid>
                    </PerformanceMetrics>
                  )}

                  {/* Approval History Section */}
                  {selectedVideo.approvalHistory && selectedVideo.approvalHistory.length > 0 && (
                    <ApprovalHistory>
                      <ApprovalHistoryTitle>Approval History</ApprovalHistoryTitle>
                      <ApprovalHistoryList>
                        {selectedVideo.approvalHistory.slice().reverse().map((historyItem, index) => (
                          <ApprovalHistoryItem key={index} $action={historyItem.action}>
                            <ApprovalHistoryIcon>
                              {getActionIcon(historyItem.action)}
                            </ApprovalHistoryIcon>
                            <ApprovalHistoryContent>
                              <ApprovalHistoryAction $action={historyItem.action}>
                                {getActionLabel(historyItem.action)}
                              </ApprovalHistoryAction>
                              <ApprovalHistoryUser>
                                by {historyItem.userId || 'Founder'}
                              </ApprovalHistoryUser>
                              <ApprovalHistoryTime>
                                {formatHistoryTimestamp(historyItem.timestamp)}
                              </ApprovalHistoryTime>
                              {historyItem.details && (
                                <ApprovalHistoryDetails>
                                  {historyItem.details.reason && (
                                    <ApprovalHistoryDetail>
                                      <strong>Reason:</strong> {historyItem.details.reason}
                                    </ApprovalHistoryDetail>
                                  )}
                                  {historyItem.details.feedback && (
                                    <ApprovalHistoryDetail>
                                      <strong>Feedback:</strong> {historyItem.details.feedback}
                                    </ApprovalHistoryDetail>
                                  )}
                                  {historyItem.details.previousCaption && (
                                    <ApprovalHistoryDetail>
                                      <strong>Previous caption:</strong> {historyItem.details.previousCaption.substring(0, 100)}
                                      {historyItem.details.previousCaption.length > 100 ? '...' : ''}
                                    </ApprovalHistoryDetail>
                                  )}
                                </ApprovalHistoryDetails>
                              )}
                            </ApprovalHistoryContent>
                          </ApprovalHistoryItem>
                        ))}
                      </ApprovalHistoryList>
                    </ApprovalHistory>
                  )}

                  {/* Show action buttons for non-rejected posts */}
                  {selectedVideo.status !== 'rejected' && !scheduleMode && (
                    <ModalActions>
                      {/* Tier indicator for context */}
                      <TierBadgeInActions tier={selectedVideo.contentTier}>
                        {selectedVideo.contentTier === 'tier_1' ? '🎬 Tier 1 (AI Video)' :
                         selectedVideo.contentTier === 'tier_2' ? '🎭 Tier 2 (AI Avatar)' :
                         selectedVideo.contentTier === 'tier_3' ? '🎞️ Tier 3 (Full Production)' :
                         selectedVideo.contentTier}
                      </TierBadgeInActions>

                      {/* POST TO PLATFORM - shown for approved posts */}
                      {selectedVideo.status === 'approved' && selectedVideo.platform === 'tiktok' && (
                        <PostToTikTokButton
                          onClick={handlePostToTikTok}
                          disabled={uploadProgress && uploadProgress.status === 'uploading'}
                        >
                          {uploadProgress && uploadProgress.status === 'uploading'
                            ? '📤 Posting...'
                            : '📤 Post to TikTok'}
                        </PostToTikTokButton>
                      )}
                      {selectedVideo.status === 'approved' && selectedVideo.platform === 'instagram' && (
                        <PostToInstagramButton
                          onClick={handlePostToInstagram}
                          disabled={uploadProgress && uploadProgress.status === 'uploading'}
                        >
                          {uploadProgress && uploadProgress.status === 'uploading'
                            ? '📤 Posting...'
                            : '📤 Post to Instagram'}
                        </PostToInstagramButton>
                      )}

                      {/* MANUAL TIKTOK MATCH - shown for posts stuck in 'posting' status */}
                      {(selectedVideo.status === 'posting' || selectedVideo.platformStatus?.tiktok?.status === 'posting') &&
                       (selectedVideo.platform === 'tiktok' || selectedVideo.platforms?.includes('tiktok')) && (
                        <ManualMatchButton onClick={handleOpenManualMatchDialog}>
                          <FaLink /> Match TikTok Video
                        </ManualMatchButton>
                      )}

                      {/* GENERATE VIDEO - only for Tier 1 */}
                      {selectedVideo.contentTier === 'tier_1' && (
                        <GenerateVideoButton onClick={() => handleGenerateVideo(selectedVideo)}>
                          🎬 Generate Video
                        </GenerateVideoButton>
                      )}

                      {/* TIER 2: Generate/Upload Avatar Video */}
                      {selectedVideo.contentTier === 'tier_2' && !selectedVideo.videoPath && (
                        <>
                          <GenerateVideoButton onClick={() => {
                            setSelectedPostForTier2Upload(selectedVideo);
                            setTier2UploadModal(true);
                          }}>
                            🎭 Generate Avatar
                          </GenerateVideoButton>
                          <GenerateVideoButton onClick={() => {
                            setSelectedPostForTier2Upload(selectedVideo);
                            setTier2UploadModal(true);
                          }}>
                            📤 Upload Video
                          </GenerateVideoButton>
                        </>
                      )}

                      {/* EDIT button - only show when NOT in edit mode AND content is editable */}
                      {!editMode && canEditContent(selectedVideo) && (
                        <EditButton onClick={handleStartEdit}>✏️ Edit Caption/Tags</EditButton>
                      )}

                      {/* EDIT PLATFORMS button - show when platforms can be modified */}
                      {!editMode && !platformEditMode && canEditPlatforms(selectedVideo) && (
                        <EditButton onClick={handleEditPlatforms}>🔧 Edit Platforms</EditButton>
                      )}

                      {/* REGENERATE - available for all tiers, including in edit mode */}
                      <RegenerateButton onClick={() => handleRegenerateVideo(selectedVideo)}>
                        🔄 Regenerate
                      </RegenerateButton>

                      {/* DUPLICATE - available for all tiers except posted */}
                      {selectedVideo.status !== 'posted' && (
                        <DuplicateButton onClick={handleDuplicate}>
                          📋 Duplicate
                        </DuplicateButton>
                      )}

                      {/* APPROVE - for draft/ready posts */}
                      {(selectedVideo.status === 'draft' || selectedVideo.status === 'ready') && (
                        <ApproveButton onClick={handleApprove}>
                          ✅ Approve
                        </ApproveButton>
                      )}

                      {/* SCHEDULE - for draft/ready posts */}
                      {(selectedVideo.status === 'draft' || selectedVideo.status === 'ready') && (
                        <ScheduleButton onClick={handleStartSchedule}>
                          📅 Schedule
                        </ScheduleButton>
                      )}

                      {/* EXPORT FOR MANUAL - for approved posts */}
                      {selectedVideo.status === 'approved' && (
                        <ExportButton onClick={handleExportForManual}>
                          📥 Export for Manual
                        </ExportButton>
                      )}

                      {/* REJECT - for draft/ready/approved posts */}
                      {(selectedVideo.status === 'draft' || selectedVideo.status === 'ready' || selectedVideo.status === 'approved') && (
                        <RejectButton onClick={handleReject}>
                          ❌ Reject
                        </RejectButton>
                      )}

                      {/* DELETE - available for all tiers */}
                      <DeleteButton onClick={handleDelete}>
                        🗑️ Delete
                      </DeleteButton>
                    </ModalActions>
                  )}

                  {/* Edit Mode UI - show caption/hashtag editor with action buttons */}
                  {editMode && (
                    <>
                      <EditActionsRow>
                        <EditButton onClick={handleCancelEdit}>✖ Cancel Edit</EditButton>
                        <SaveButton onClick={handleSaveEdit}>💾 Save Changes</SaveButton>
                      </EditActionsRow>
                    </>
                  )}

                  {/* Schedule Mode Actions */}
                  {scheduleMode && (
                    <ModalActions>
                      <TierBadgeInActions tier={selectedVideo.contentTier}>
                        {selectedVideo.contentTier === 'tier_1' ? '🎬 Tier 1 (AI Video)' :
                         selectedVideo.contentTier === 'tier_2' ? '🎭 Tier 2 (AI Avatar)' :
                         selectedVideo.contentTier === 'tier_3' ? '🎞️ Tier 3 (Full Production)' :
                         selectedVideo.contentTier}
                      </TierBadgeInActions>

                      {/* Tier 1: Generate Video */}
                      {selectedVideo.contentTier === 'tier_1' && (
                        <GenerateVideoButton onClick={() => handleGenerateVideo(selectedVideo)}>
                          🎬 Generate Video
                        </GenerateVideoButton>
                      )}

                      <EditButton onClick={handleStartEdit}>✏️ Edit Caption/Tags</EditButton>
                      {canEditPlatforms(selectedVideo) && (
                        <EditButton onClick={handleEditPlatforms}>🔧 Edit Platforms</EditButton>
                      )}
                      <RegenerateButton onClick={() => handleRegenerateVideo(selectedVideo)}>
                        🔄 Regenerate
                      </RegenerateButton>
                      <DuplicateButton onClick={handleDuplicate}>
                        📋 Duplicate
                      </DuplicateButton>
                      <ApproveButton onClick={handleApprove}>
                        ✅ Approve Now
                      </ApproveButton>
                      <CancelButton onClick={handleCancelSchedule}>
                        ✖ Cancel Schedule
                      </CancelButton>
                    </ModalActions>
                  )}

                  {/* Show edit/download buttons for posted posts when not in edit mode */}
                  {selectedVideo.status === 'posted' && !editMode && !platformEditMode && (
                    <ModalActions>
                      {canEditContent(selectedVideo) && (
                        <EditButton onClick={handleStartEdit}>✏️ Edit Caption/Tags</EditButton>
                      )}
                      {canEditPlatforms(selectedVideo) && (
                        <EditButton onClick={handleEditPlatforms}>🔧 Edit Platforms</EditButton>
                      )}
                      <DownloadButton onClick={handleDownload}>📥 Download Content</DownloadButton>
                      <DeleteButton onClick={handleDelete}>
                        🗑️ Delete
                      </DeleteButton>
                    </ModalActions>
                  )}

                  {/* Upload Progress Display */}
                  {uploadProgress && (
                    <UploadProgressContainer>
                      <UploadProgressHeader>
                        <UploadProgressTitle>
                          📤 Upload to {selectedVideo.platform === 'instagram' ? 'Instagram' : 'TikTok'}
                        </UploadProgressTitle>
                        <UploadProgressPercentage>
                          {uploadProgress.progress}%
                        </UploadProgressPercentage>
                      </UploadProgressHeader>
                      <UploadProgressBar>
                        <UploadProgressFill $progress={uploadProgress.progress} />
                      </UploadProgressBar>
                      <UploadProgressStage>
                        {uploadProgress.stage || 'Initializing...'}
                      </UploadProgressStage>
                      {uploadProgress.status === 'completed' && (
                        <div style={{color: '#00d26a', marginTop: '0.5rem', fontSize: '0.9rem'}}>
                          ✅ Successfully posted to {selectedVideo.platform === 'instagram' ? 'Instagram' : 'TikTok'}!
                        </div>
                      )}
                      {uploadProgress.status === 'failed' && (
                        <div style={{color: '#ff4757', marginTop: '0.5rem', fontSize: '0.9rem'}}>
                          ❌ Upload failed: {uploadProgress.errorMessage || 'Unknown error'}
                        </div>
                      )}
                    </UploadProgressContainer>
                  )}
                </ModalInfo>
                </ModalDetailsSection>
              </ModalContent>
            </ModalOverlay>
          )}

          {/* Rejection Modal */}
          {rejectModal.isOpen && (
            <RejectModalOverlay onClick={handleCloseRejectModal}>
              <RejectModalContent onClick={(e) => e.stopPropagation()}>
                <RejectModalTitle>❌ Reject Content</RejectModalTitle>

                <RejectModalLabel htmlFor="reject-reason">
                  Rejection Reason <span style={{color: '#e94560'}}>*</span>
                </RejectModalLabel>
                <RejectModalTextarea
                  id="reject-reason"
                  placeholder="Please explain why this content is being rejected... (e.g., Low quality, inappropriate content, poor engagement potential)"
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  autoFocus
                />

                <RejectModalCheckbox>
                  <input
                    type="checkbox"
                    checked={rejectModal.blacklistStory}
                    onChange={(e) => setRejectModal(prev => ({ ...prev, blacklistStory: e.target.checked }))}
                  />
                  <RejectModalCheckboxLabel>
                    <strong>🚫 Blacklist this story</strong>
                    <div>Prevent this story from being used for future content generation</div>
                    {rejectModal.blacklistStory && (
                      <RejectModalWarning>
                        ⚠️ This story will not be used for any future content. This action helps AI learn what content to avoid.
                      </RejectModalWarning>
                    )}
                  </RejectModalCheckboxLabel>
                </RejectModalCheckbox>

                <RejectModalActions>
                  <RejectModalButton className="cancel" onClick={handleCloseRejectModal}>
                    Cancel
                  </RejectModalButton>
                  <RejectModalButton
                    className="confirm"
                    onClick={handleConfirmReject}
                    disabled={!rejectModal.reason.trim()}
                  >
                    Reject {rejectModal.blacklistStory && '& Blacklist'}
                  </RejectModalButton>
                </RejectModalActions>
              </RejectModalContent>
            </RejectModalOverlay>
          )}

          {/* Regenerate Modal */}
          {regenerateModal.isOpen && (
            <RegenerateModalOverlay onClick={handleCloseRegenerateModal}>
              <RegenerateModalContent onClick={(e) => e.stopPropagation()}>
                <RegenerateModalTitle>🔄 Regenerate Content</RegenerateModalTitle>

                <RegenerateModalLabel htmlFor="regenerate-feedback">
                  Feedback for regeneration <span style={{color: '#e94560'}}>*</span>
                </RegenerateModalLabel>
                <RegenerateModalTextarea
                  id="regenerate-feedback"
                  placeholder="Please provide feedback on what should be improved... (e.g., Make it more engaging, Change the hook, Different style, Better visuals)"
                  value={regenerateModal.feedback}
                  onChange={(e) => setRegenerateModal(prev => ({ ...prev, feedback: e.target.value }))}
                  autoFocus
                />

                <RegenerateModalInfo>
                  <strong>💡 What happens next:</strong><br /><br />
                  Your feedback will be used to generate new content for this story. The AI will consider your suggestions to create improved content that better matches your vision. This typically takes 1-2 minutes.
                </RegenerateModalInfo>

                <RegenerateModalActions>
                  <RegenerateModalButton className="cancel" onClick={handleCloseRegenerateModal}>
                    Cancel
                  </RegenerateModalButton>
                  <RegenerateModalButton
                    className="confirm"
                    onClick={handleConfirmRegenerate}
                    disabled={!regenerateModal.feedback.trim()}
                  >
                    🔄 Regenerate Content
                  </RegenerateModalButton>
                </RegenerateModalActions>
              </RegenerateModalContent>
            </RegenerateModalOverlay>
          )}

          {/* Export for Manual Posting Modal */}
          {exportModal.isOpen && exportModal.data && (
            <InstructionsModal onClick={() => setExportModal({ isOpen: false, data: null })}>
              <InstructionsContent onClick={(e) => e.stopPropagation()}>
                <CloseInstructionsButton onClick={() => setExportModal({ isOpen: false, data: null })}>
                  ✕
                </CloseInstructionsButton>

                <InstructionsTitle>{exportModal.data.instructions.title}</InstructionsTitle>

                <div style={{marginBottom: '1.5rem'}}>
                  <strong style={{color: '#667eea', fontSize: '1.1rem'}}>📦 Content Bundle:</strong>
                  <div style={{marginTop: '0.5rem', color: '#eaeaea'}}>
                    <div>🎬 Video: <code style={{background: '#16213e', padding: '0.25rem 0.5rem', borderRadius: '4px'}}>{exportModal.data.post.videoPath || 'N/A'}</code></div>
                    <div style={{marginTop: '0.5rem'}}>📝 Caption & Hashtags:</div>
                  </div>
                </div>

                <CaptionBox>
                  {exportModal.data.bundle.captionText}
                </CaptionBox>

                <div style={{marginTop: '1.5rem'}}>
                  <strong style={{color: '#667eea', fontSize: '1.1rem'}}>📋 Posting Instructions:</strong>
                </div>

                <InstructionsList>
                  {exportModal.data.instructions.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </InstructionsList>

                <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                  <ManualPostedButton onClick={handleMarkAsManuallyPosted}>
                    ✅ Mark as Manually Posted
                  </ManualPostedButton>
                </div>
              </InstructionsContent>
            </InstructionsModal>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModal.isOpen && (
            <DeleteModalOverlay onClick={handleCloseDeleteModal}>
              <DeleteModalContent onClick={(e) => e.stopPropagation()}>
                <DeleteModalTitle>🗑️ Delete Content</DeleteModalTitle>

                <DeleteModalText>
                  Are you sure you want to delete this content? This action cannot be undone.
                </DeleteModalText>

                <DeleteModalWarning>
                  <strong>⚠️ Warning:</strong><br />
                  This will permanently delete:<br />
                  • Video/image files<br />
                  • Caption and hashtags<br />
                  • All post metadata<br />
                  • Performance history<br />
                  <br />
                  This action cannot be undone!
                </DeleteModalWarning>

                <DeleteModalActions>
                  <DeleteModalButton className="cancel" onClick={handleCloseDeleteModal}>
                    Cancel
                  </DeleteModalButton>
                  <DeleteModalButton
                    className="confirm"
                    onClick={handleConfirmDelete}
                  >
                    🗑️ Delete Forever
                  </DeleteModalButton>
                </DeleteModalActions>
              </DeleteModalContent>
            </DeleteModalOverlay>
          )}

          {pagination.total > pagination.limit && (
            <Pagination>
              <PaginationButton
                onClick={handlePreviousPage}
                disabled={pagination.page === 1}
              >
                ← Previous
              </PaginationButton>

              <PageInfo>
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                ({pagination.total} total)
              </PageInfo>

              <PaginationButton
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
              >
                Next →
              </PaginationButton>
            </Pagination>
          )}
        </>
      )}

      {/* New Modals */}
      <CreatePostModal
        isOpen={createPostModal}
        onClose={() => {
          setCreatePostModal(false);
          // No refresh needed - SSE will handle updates if post was created
        }}
        onSave={handlePostCreated}
        stories={stories}
      />

      <GenerateVideoOptions
        isOpen={generateVideoModal}
        onClose={() => {
          setGenerateVideoModal(false);
          setSelectedPostForVideo(null);
          // No refresh needed - SSE will handle updates if video was generated
        }}
        onGenerate={handleVideoGenerated}
        post={selectedPostForVideo}
      />

      <RegenerateVideoModal
        isOpen={regenerateVideoModal}
        onClose={() => {
          setRegenerateVideoModal(false);
          setSelectedPostForVideo(null);
          // No refresh needed - SSE will handle updates if video was regenerated
        }}
        onRegenerate={handleVideoRegenerated}
        post={selectedPostForVideo}
      />

      {/* Tier 2 Video Upload Modal */}
      {tier2UploadModal && selectedPostForTier2Upload && (
        <Tier2VideoUpload
          isOpen={tier2UploadModal}
          onClose={() => {
            setTier2UploadModal(false);
            setSelectedPostForTier2Upload(null);
            // No refresh needed - SSE will handle updates
          }}
          post={selectedPostForTier2Upload}
          onUploadComplete={() => {
            setTier2UploadModal(false);
            setSelectedPostForTier2Upload(null);
            // No refresh needed - SSE will handle updates
          }}
        />
      )}

      {/* Tier 2 Edit Modal */}
      {editTier2Modal && selectedPostForTier2Edit && (
        <EditTier2PostModal
          isOpen={editTier2Modal}
          onClose={() => {
            setEditTier2Modal(false);
            setSelectedPostForTier2Edit(null);
          }}
          post={selectedPostForTier2Edit}
          onSave={() => {
            setEditTier2Modal(false);
            setSelectedPostForTier2Edit(null);
            fetchPosts(); // Refresh the grid to show updated hashtags
          }}
        />
      )}

      {/* Manual TikTok Match Dialog */}
      <ManualTikTokMatchDialog
        postId={manualMatchDialog.postId}
        postCaption={manualMatchDialog.postCaption}
        isOpen={manualMatchDialog.isOpen}
        onClose={handleCloseManualMatchDialog}
        onSuccess={handleManualMatchSuccess}
      />
    </LibraryContainer>
  );
}

export default ContentLibrary;
