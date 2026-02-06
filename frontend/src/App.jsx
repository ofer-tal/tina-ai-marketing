import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Settings from './pages/Settings';
import ServiceHealth from './pages/ServiceHealth';
import Dashboard from './pages/Dashboard';
import StrategicDashboard from './pages/StrategicDashboard';
import Chat from './pages/Chat';
import ContentLibrary from './pages/ContentLibrary';
import AIAvatars from './pages/AIAvatars';
import BatchApprovalQueue from './pages/BatchApprovalQueue';
import Campaigns from './pages/Campaigns';
import RevenueAttributionTest from './pages/RevenueAttributionTest';
import WeeklyRevenueAggregates from './pages/WeeklyRevenueAggregates';
import MonthlyRevenueAggregates from './pages/MonthlyRevenueAggregates';
import ChannelPerformance from './pages/ChannelPerformance';
import ContentEngagement from './pages/ContentEngagement';
import OptimalPostingTime from './pages/OptimalPostingTime';
import StoryCategories from './pages/StoryCategories';
import HashtagAnalytics from './pages/HashtagAnalytics';
import VideoStyles from './pages/VideoStyles';
import CohortAnalysis from './pages/CohortAnalysis';
import Attribution from './pages/Attribution';
import Forecast from './pages/Forecast';
import AnomalyDetection from './pages/AnomalyDetection';
import ABTestStatistics from './pages/ABTestStatistics';
import ROIOptimization from './pages/ROIOptimization';
import ChurnPrediction from './pages/ChurnPrediction';
import LTVModeling from './pages/LTVModeling';
import ASO from './pages/ASO';
import BlogPostGenerator from './pages/BlogPostGenerator';
import MediumArticleGenerator from './pages/MediumArticleGenerator';
import PressReleaseGenerator from './pages/PressReleaseGenerator';
import SeoContentSuggestions from './pages/SeoContentSuggestions';
import ContentCalendar from './pages/ContentCalendar';
import WebsiteTraffic from './pages/WebsiteTraffic';
import ContentPerformance from './pages/ContentPerformance';
import TrendingTopics from './pages/TrendingTopics';
import ContentMusic from './pages/ContentMusic';
import KeywordRecommendations from './pages/KeywordRecommendations';
import Strategies from './pages/Strategies';
import Goals from './pages/Goals';
import Inbox from './pages/Inbox';
import TinaDashboard from './pages/TinaDashboard';
import Experiments from './pages/Experiments';
import Learnings from './pages/Learnings';
import Thoughts from './pages/Thoughts';
import Plans from './pages/Plans';
import Reflections from './pages/Reflections';
import Todos from './pages/Todos';
import TodoSidebar from './components/TodoSidebar';
import { ToastContainer } from './components/Toast';
import ToastTest from './components/ToastTest';
import ModalDemo from './pages/ModalDemo';
import TabsDemo from './pages/TabsDemo';
import DataTableDemo from './pages/DataTableDemo';
import EmptyStateDemo from './pages/EmptyStateDemo';
import AccessibilityTest from './pages/AccessibilityTest';
import ScreenReaderTest from './pages/ScreenReaderTest';
import ErrorTestPage from './pages/ErrorTestPage';
import DatabaseTestPage from './pages/DatabaseTestPage';
import FileSystemErrorTestPage from './pages/FileSystemErrorTestPage';
import NotFound from './pages/NotFound';
import Breadcrumbs from './components/Breadcrumbs';
import ServiceStatusBanner from './components/ServiceStatusBanner';
import DatabaseStatusBanner from './components/DatabaseStatusBanner';
import { cssVar } from './themeUtils';

const AppContainer = styled.div`
  min-height: 100vh;
  background: ${cssVar('--color-background')};
  color: ${cssVar('--color-text')};
  font-family: ${cssVar('--font-family-sans')};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: flex;
  flex-direction: column;
`;

const MainLayout = styled.div`
  display: flex;
  flex: 1;
  position: relative;
`;

const SidebarNav = styled.nav`
  width: ${props => props.$collapsed ? '60px' : '280px'};
  background: ${cssVar('--color-surface')};
  border-right: 1px solid ${cssVar('--color-border')};
  padding: ${props => props.$collapsed ? cssVar('--spacing-sm') : cssVar('--spacing-md')};
  display: flex;
  flex-direction: column;
  gap: ${cssVar('--spacing-sm')};
  transition: width ${cssVar('--transition-base')};
  position: relative;
  overflow-y: auto;
  max-height: calc(100vh - 100px);

  @media (max-width: 768px) {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    width: 280px;
    z-index: calc(${cssVar('--z-index-fixed')} + 1);
    transform: translateX(${props => props.$mobileOpen ? '0' : '-100%'});
    transition: transform ${cssVar('--transition-base')};
    padding: ${cssVar('--spacing-md')};
  }
`;

// Quick Actions Container (sidebar - hidden on large screens)
const QuickActions = styled.div`
  display: ${props => props.$collapsed ? 'none' : 'flex'};
  flex-direction: column;
  gap: ${cssVar('--spacing-xs')};
  padding: ${cssVar('--spacing-sm')};
  background: ${cssVar('--color-primary')};
  border-radius: ${cssVar('--radius-md')};
  margin-bottom: ${cssVar('--spacing-md')};

  @media (min-width: 1024px) {
    display: none;
  }
`;

const QuickActionsLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 ${cssVar('--spacing-xs')};
`;

const QuickActionButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem ${cssVar('--spacing-sm')};
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: ${cssVar('--radius-sm')};
  color: white;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all ${cssVar('--transition-fast')};
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateX(2px);
  }

  .badge {
    background: ${cssVar('--color-accent')};
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }
`;

// Navigation Section (collapsible)
const NavSection = styled.div`
  margin-bottom: ${cssVar('--spacing-xs')};
`;

const NavSectionHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$collapsed ? 'center' : 'space-between'};
  padding: ${props => props.$collapsed ? '0.5rem' : '0.75rem'};
  background: ${props => props.$open ? 'rgba(233, 69, 96, 0.1)' : 'transparent'};
  border: ${props => props.$open ? '1px solid rgba(233, 69, 96, 0.3)' : '1px solid transparent'};
  border-radius: ${cssVar('--radius-md')};
  color: ${props => props.$open ? cssVar('--color-primary') : cssVar('--color-text-secondary')};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all ${cssVar('--transition-base')};
  margin-bottom: ${props => props.$collapsed ? '0' : props.$open ? cssVar('--spacing-xs') : '0'};

  &:hover {
    background: ${props => props.$collapsed ? 'transparent' : 'rgba(233, 69, 96, 0.08)'};
    color: ${cssVar('--color-primary')};
    border-color: ${props => props.$open ? 'rgba(233, 69, 96, 0.5)' : 'rgba(233, 69, 96, 0.2)'};
  }

  .chevron {
    transition: transform ${cssVar('--transition-base')};
    transform: rotate(${props => props.$open ? '180deg' : '0deg'});
    font-size: 0.7rem;
    opacity: ${props => props.$open ? '1' : '0.7'};
  }

  .icon {
    font-size: 1rem;
    opacity: ${props => props.$collapsed ? '1' : '0.8'};
  }

  .label {
    display: ${props => props.$collapsed ? 'none' : 'block'};
  }
`;

const NavSectionContent = styled.div`
  display: ${props => props.$open ? 'block' : 'none'};
  padding-left: ${props => props.$collapsed ? '0' : cssVar('--spacing-sm')};

  @media (max-width: 768px) {
    padding-left: ${cssVar('--spacing-sm')};
  }
`;

const SidebarNavLink = styled(Link)`
  padding: ${props => props.$collapsed ? '0.5rem' : '0.6rem 0.75rem'};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${cssVar('--radius-md')};
  color: ${cssVar('--color-text')};
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all ${cssVar('--transition-base')};
  display: flex;
  align-items: center;
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};
  gap: ${cssVar('--spacing-sm')};
  white-space: nowrap;
  overflow: hidden;
  min-height: 40px;

  &:hover {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
    transform: ${props => props.$collapsed ? 'none' : 'translateX(2px)'};
  }

  &.active {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
  }

  span.label {
    opacity: ${props => props.$collapsed ? '0' : '1'};
  }

  span.icon {
    font-size: 1rem;
    min-width: 20px;
    text-align: center;
  }
`;

// Chat Panel
const ChatPanelToggle = styled.button`
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 80px;
  background: ${cssVar('--color-primary')};
  border: none;
  border-radius: ${cssVar('--radius-md')} 0 0 ${cssVar('--radius-md')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${cssVar('--transition-base')};
  z-index: ${cssVar('--z-index-sticky')};
  color: white;
  font-size: 1.2rem;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);

  &:hover {
    background: ${cssVar('--color-primary-hover')};
    width: 36px;
  }

  @media (max-width: 768px) {
    width: 40px;
    height: 48px;
    top: auto;
    bottom: 80px;
    transform: none;
    border-radius: ${cssVar('--radius-md')} 0 0 ${cssVar('--radius-md')};
  }
`;

const ChatPanel = styled.aside`
  position: fixed;
  right: 0;
  top: 0;
  width: ${props => props.$width}px;
  height: 100vh;
  background: ${cssVar('--color-surface')};
  border-left: 1px solid ${cssVar('--color-border')};
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  transform: translateX(${props => props.$open ? '0' : '100%'});
  transition: transform ${cssVar('--transition-base')}, width 0.05s ease-out;
  z-index: calc(${cssVar('--z-index-fixed')} + 2);
  display: flex;
  flex-direction: column;
  min-width: 320px;
  max-width: 80vw;

  ${props => props.$isResizing && `
    transition: none;
    user-select: none;
  `}

  @media (max-width: 768px) {
    width: 100% !important;
    min-width: 100%;
  }
`;

const ChatResizeHandle = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  background: transparent;
  transition: background ${cssVar('--transition-fast')};
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 40px;
    background: ${cssVar('--color-border')};
    border-radius: 1px;
    opacity: 0.5;
    transition: all ${cssVar('--transition-fast')};
  }

  &:hover::before {
    background: ${cssVar('--color-primary')};
    width: 3px;
    left: 1.5px;
    opacity: 1;
    box-shadow: 0 0 8px ${cssVar('--color-primary')};
  }

  &:hover {
    background: rgba(233, 69, 96, 0.05);
  }

  ${props => props.$isResizing && `
    background: rgba(233, 69, 96, 0.1);
    cursor: ew-resize;

    &::before {
      background: ${cssVar('--color-primary')};
      opacity: 1;
    }
  `}

  @media (max-width: 768px) {
    display: none;
  }
`;

const ChatPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${cssVar('--spacing-md')};
  border-bottom: 1px solid ${cssVar('--color-border')};
  background: ${cssVar('--color-primary')};
  color: white;
`;

const ChatPanelTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: ${cssVar('--spacing-sm')};
`;

const ChatPanelClose = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: ${cssVar('--radius-sm')};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  transition: background ${cssVar('--transition-fast')};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ChatPanelContent = styled.div`
  flex: 1;
  overflow: hidden;
`;

const MainContentArea = styled.main`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const PageContent = styled.div`
  flex: 1;
  padding: ${cssVar('--spacing-xl')};
  overflow-y: auto;
  max-width: calc(100vw - ${props => props.$sidebarCollapsed ? '60px' : '280px'});
  transition: max-width ${cssVar('--transition-base')};

  @media (max-width: 768px) {
    max-width: 100vw;
    padding: ${cssVar('--spacing-md')};
  }
`;

const BreadcrumbsWrapper = styled.div`
  margin-bottom: ${cssVar('--spacing-md')};
`;

const Header = styled.header`
  padding: ${cssVar('--spacing-xl')};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${cssVar('--color-border')};
`;

const SidebarToggle = styled.button`
  position: fixed;
  left: ${props => props.$collapsed ? '60px' : '280px'};
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: ${cssVar('--color-primary')};
  border: none;
  border-radius: 0 ${cssVar('--radius-md')} ${cssVar('--radius-md')} 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: left ${cssVar('--transition-base')};
  z-index: ${cssVar('--z-index-sticky')};
  color: white;
  font-size: 1.2rem;

  &:hover {
    background: ${cssVar('--color-primary-hover')};
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  position: fixed;
  top: ${cssVar('--spacing-md')};
  left: ${cssVar('--spacing-md')};
  z-index: ${cssVar('--z-index-fixed')};
  background: ${cssVar('--color-surface')};
  border: 2px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  padding: 0.75rem;
  cursor: pointer;
  min-width: 48px;
  min-height: 48px;
  font-size: 1.5rem;
  align-items: center;
  justify-content: center;
  transition: all ${cssVar('--transition-base')};

  &:hover {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileOverlay = styled.div`
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${props => props.$open ? cssVar('--z-index-fixed') : '-1'};
  opacity: ${props => props.$open ? '1' : '0'};
  transition: opacity ${cssVar('--transition-base')};
  pointer-events: ${props => props.$open ? 'auto' : 'none'};

  @media (max-width: 768px) {
    display: block;
  }
`;

const HeaderLeft = styled.div`
  text-align: center;
`;

const HeaderRight = styled.div`
  display: none;
  align-items: center;
  gap: ${cssVar('--spacing-md')};

  @media (min-width: 1024px) {
    display: flex;
  }
`;

const HeaderQuickActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${cssVar('--spacing-sm')};
  padding: ${cssVar('--spacing-sm')} ${cssVar('--spacing-md')};
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-lg')};
`;

const HeaderQuickActionLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem ${cssVar('--spacing-md')};
  background: transparent;
  border: none;
  border-radius: ${cssVar('--radius-md')};
  color: ${cssVar('--color-text-secondary')};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all ${cssVar('--transition-fast')};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(233, 69, 96, 0.1);
    color: ${cssVar('--color-primary')};
  }

  &.active {
    background: rgba(233, 69, 96, 0.15);
    color: ${cssVar('--color-primary')};
  }

  .badge {
    background: ${cssVar('--color-primary')};
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  background: ${cssVar('--gradient-primary')};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  color: ${cssVar('--color-text-secondary')};
  font-size: 1rem;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const WelcomeCard = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-lg')};
  padding: ${cssVar('--spacing-xl')};
  margin-bottom: ${cssVar('--spacing-xl')};
  transition: box-shadow ${cssVar('--transition-base')};

  &:hover {
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const CardTitle = styled.h2`
  font-size: ${cssVar('--font-size-2xl')};
  margin: 0 0 ${cssVar('--spacing-md')} 0;
  color: ${cssVar('--color-primary')};
`;

const CardText = styled.p`
  line-height: 1.6;
  color: ${cssVar('--color-text')};
  margin-bottom: ${cssVar('--spacing-md')};
`;

const StatusList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${cssVar('--spacing-md')} 0 0 0;
`;

const StatusItem = styled.li`
  padding: ${cssVar('--spacing-sm')} 0;
  color: ${cssVar('--color-text-secondary')};

  &::before {
    content: '✓ ';
    color: ${cssVar('--color-success')};
    font-weight: bold;
    margin-right: ${cssVar('--spacing-sm')};
  }
`;

// Navigation sections configuration
const NAV_SECTIONS = [
  {
    id: 'dashboard',
    icon: '⧉',
    label: 'Dashboard',
    items: [
      { path: '/', icon: '⌂', label: 'Home' },
      { path: '/dashboard', icon: '◫', label: 'Tactical' },
      { path: '/dashboard/strategic', icon: '⇶', label: 'Strategic' },
    ]
  },
  {
    id: 'content',
    icon: '◐',
    label: 'Content',
    items: [
      { path: '/content/library', icon: '◫', label: 'All Content' },
      { path: '/content/approval', icon: '✓', label: 'Approvals' },
      { path: '/content/avatars', icon: '🎭', label: 'AI Avatars' },
      { path: '/content/music', icon: '🎵', label: 'Music' },
      { path: '/content/calendar', icon: '◷', label: 'Calendar' },
    ]
  },
  {
    id: 'generators',
    icon: '✎',
    label: 'Generators',
    items: [
      { path: '/content/blog-generator', icon: '◫', label: 'Blog Posts' },
      { path: '/content/medium-generator', icon: '▥', label: 'Medium Articles' },
      { path: '/content/press-release', icon: '◉', label: 'Press Releases' },
      { path: '/content/seo-suggestions', icon: '⌕', label: 'SEO Ideas' },
      { path: '/content/trending-topics', icon: '▲', label: 'Trending' },
      { path: '/content/keyword-recommendations', icon: '◈', label: 'Keywords' },
    ]
  },
  {
    id: 'analytics',
    icon: '▤',
    label: 'Analytics',
    items: [
      { path: '/analytics/channels', icon: '◎', label: 'Channel Performance' },
      { path: '/analytics/engagement', icon: '♥', label: 'Engagement' },
      { path: '/analytics/posting-times', icon: '⏱', label: 'Best Times' },
      { path: '/analytics/content-performance', icon: '⧉', label: 'Content Performance' },
      { path: '/analytics/website-traffic', icon: '◎', label: 'Website Traffic' },
    ]
  },
  {
    id: 'insights',
    icon: '◉',
    label: 'Insights',
    items: [
      { path: '/analytics/categories', icon: '◫', label: 'Story Categories' },
      { path: '/analytics/hashtags', icon: '#', label: 'Hashtags' },
      { path: '/analytics/video-styles', icon: '▣', label: 'Video Styles' },
      { path: '/analytics/cohort-analysis', icon: '👥', label: 'Cohorts' },
    ]
  },
  {
    id: 'advanced',
    icon: '⚡',
    label: 'Advanced',
    items: [
      { path: '/analytics/attribution', icon: '◎', label: 'Attribution' },
      { path: '/analytics/forecast', icon: '◆', label: 'Forecast' },
      { path: '/analytics/anomaly-detection', icon: '⚠', label: 'Anomaly Detection' },
      { path: '/analytics/roi-optimization', icon: '◆', label: 'ROI Opt' },
      { path: '/analytics/churn-prediction', icon: '▼', label: 'Churn' },
      { path: '/analytics/ab-test-statistics', icon: '⚗', label: 'A/B Tests' },
      { path: '/analytics/ltv-modeling', icon: '◆', label: 'LTV' },
    ]
  },
  {
    id: 'aso',
    icon: '◈',
    label: 'ASO',
    items: [
      { path: '/aso', icon: '⌕', label: 'Keyword Tracking' },
    ]
  },
  {
    id: 'tina',
    icon: '🧠',
    label: 'Tina AI',
    items: [
      { path: '/tina', icon: '🏠', label: 'Dashboard' },
      { path: '/tina/strategies', icon: '🎯', label: 'Strategies' },
      { path: '/tina/goals', icon: '🎯', label: 'Goals' },
      { path: '/tina/experiments', icon: '🧪', label: 'Experiments' },
      { path: '/tina/learnings', icon: '💡', label: 'Learnings' },
      { path: '/tina/plans', icon: '📋', label: 'Plans' },
      { path: '/tina/reflections', icon: '📝', label: 'Reflections' },
      { path: '/tina/thoughts', icon: '🧠', label: 'Thoughts' },
      { path: '/tina/inbox', icon: '📬', label: 'Inbox' },
    ]
  },
  {
    id: 'ads',
    icon: '◉',
    label: 'Ads',
    items: [
      { path: '/ads', icon: '◉', label: 'Campaigns' },
      { path: '/ads/revenue-test', icon: '◆', label: 'Revenue Test' },
    ]
  },
];

function HomePage() {
  return (
    <WelcomeCard>
      <CardTitle>Welcome to Blush Marketing</CardTitle>
      <CardText>
        This AI-powered marketing operations center proactively manages social media content,
        ASO optimization, paid ad campaigns, and strategic decision-making to grow the
        Blush app from $300-500/month MRR to $10,000/month.
      </CardText>

      <CardText>
        The system is currently being initialized. Check back soon for:
      </CardText>

      <StatusList>
        <StatusItem>Tactical dashboard with real-time metrics</StatusItem>
        <StatusItem>AI-powered strategy recommendations</StatusItem>
        <StatusItem>Automated content generation and posting</StatusItem>
        <StatusItem>ASO keyword tracking and optimization</StatusItem>
        <StatusItem>Paid ads management with budget controls</StatusItem>
        <StatusItem>Revenue tracking and analytics</StatusItem>
      </StatusList>
    </WelcomeCard>
  );
}

// Sidebar component with grouped navigation
function Sidebar({ collapsed, onToggle, mobileOpen, onMobileToggle, chatOpen, onChatToggle, chatDrawerWidth, onDrawerResizeStart, isResizingDrawer }) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('navSections');
    return saved ? JSON.parse(saved) : { content: true, analytics: true };
  });

  // Persist section state
  useEffect(() => {
    localStorage.setItem('navSections', JSON.stringify(openSections));
  }, [openSections]);

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      onMobileToggle(false);
    }
  };

  // Get all paths to find active route
  const allPaths = NAV_SECTIONS.flatMap(section => section.items).map(item => item.path);
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <MobileOverlay
        $open={mobileOpen}
        onClick={() => onMobileToggle(false)}
        aria-hidden="true"
      />
      <MobileMenuButton
        onClick={() => onMobileToggle(!mobileOpen)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? '✕' : '☰'}
      </MobileMenuButton>
      <SidebarNav
        $collapsed={collapsed}
        $mobileOpen={mobileOpen}
        aria-label="Main navigation"
      >
        {/* Quick Actions */}
        {!collapsed && (
          <QuickActions>
            <QuickActionsLabel>Quick Actions</QuickActionsLabel>
            <QuickActionButton to="/content/approval" onClick={handleNavClick}>
              <span>✓ Approve Content</span>
              <span className="badge">3</span>
            </QuickActionButton>
            <QuickActionButton to="/dashboard" onClick={handleNavClick}>
              <span>⧉ Dashboard</span>
            </QuickActionButton>
            <QuickActionButton to="/content/library" onClick={handleNavClick}>
              <span>◫ All Content</span>
            </QuickActionButton>
            <QuickActionButton to="/chat" onClick={(e) => { e.preventDefault(); onChatToggle(!chatOpen); }}>
              <span>◈ Open AI Chat</span>
            </QuickActionButton>
          </QuickActions>
        )}

        {/* Navigation Sections */}
        {NAV_SECTIONS.map(section => (
          <NavSection key={section.id}>
            <NavSectionHeader
              $collapsed={collapsed}
              $open={!collapsed && openSections[section.id]}
              onClick={() => !collapsed && toggleSection(section.id)}
              aria-label={`${collapsed ? '' : openSections[section.id] ? 'Collapse' : 'Expand'} ${section.label}`}
              aria-expanded={!collapsed && openSections[section.id]}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '8px' }}>
                <span className="icon">{section.icon}</span>
                <span className="label">{section.label}</span>
              </span>
              {!collapsed && (
                <span className="chevron">▶</span>
              )}
            </NavSectionHeader>
            <NavSectionContent $open={!collapsed && openSections[section.id]}>
              {section.items.map(item => (
                <SidebarNavLink
                  key={item.path}
                  to={item.path}
                  $collapsed={collapsed}
                  className={isActive(item.path) ? 'active' : ''}
                  onClick={handleNavClick}
                  aria-label={item.label}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </SidebarNavLink>
              ))}
            </NavSectionContent>
          </NavSection>
        ))}

        {/* Bottom links */}
        <NavSection style={{ marginTop: 'auto' }}>
          <NavSectionContent $open={!collapsed}>
            <SidebarNavLink
              to="/todos"
              $collapsed={collapsed}
              className={isActive('/todos') ? 'active' : ''}
              onClick={handleNavClick}
            >
              <span className="icon">📋</span>
              <span className="label">Todos</span>
            </SidebarNavLink>
            <SidebarNavLink
              to="/settings"
              $collapsed={collapsed}
              className={isActive('/settings') ? 'active' : ''}
              onClick={handleNavClick}
            >
              <span className="icon">⚙️</span>
              <span className="label">Settings</span>
            </SidebarNavLink>
            <SidebarNavLink
              to="/service-health"
              $collapsed={collapsed}
              className={isActive('/service-health') ? 'active' : ''}
              onClick={handleNavClick}
            >
              <span className="icon">🏥</span>
              <span className="label">Health</span>
            </SidebarNavLink>
          </NavSectionContent>
        </NavSection>
      </SidebarNav>
      <SidebarToggle
        $collapsed={collapsed}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '▶' : '◀'}
      </SidebarToggle>

      {/* Chat Panel Toggle */}
      <ChatPanelToggle
        onClick={() => onChatToggle(!chatOpen)}
        aria-label={chatOpen ? 'Close AI Chat' : 'Open AI Chat'}
        aria-expanded={chatOpen}
      >
        💬
      </ChatPanelToggle>

      {/* Chat Panel */}
      <ChatPanel
        $open={chatOpen}
        $width={chatDrawerWidth}
        $isResizing={isResizingDrawer}
        aria-label="AI Chat Panel"
      >
        <ChatResizeHandle
          $isResizing={isResizingDrawer}
          onMouseDown={onDrawerResizeStart}
          aria-label="Resize chat panel"
        />
        <ChatPanelContent>
          <Chat onClose={() => onChatToggle(false)} />
        </ChatPanelContent>
      </ChatPanel>
    </>
  );
}

// Wrapper component to add breadcrumbs to pages
function PageWithBreadcrumbs({ children }) {
  return (
    <>
      <BreadcrumbsWrapper>
        <Breadcrumbs />
      </BreadcrumbsWrapper>
      {children}
    </>
  );
}

// Helper to calculate initial drawer width based on screen size
const getInitialDrawerWidth = () => {
  const saved = localStorage.getItem('chatDrawerWidth');
  if (saved) {
    const width = parseInt(saved, 10);
    // Validate the saved width is within reasonable bounds
    if (width >= 320 && width <= window.innerWidth * 0.8) {
      return width;
    }
  }

  // Default responsive width based on screen size
  const screenWidth = window.innerWidth;
  if (screenWidth >= 1920) return 600;      // Very wide screens
  if (screenWidth >= 1440) return 500;      // Wide screens
  if (screenWidth >= 1200) return 450;      // Laptops
  return 400;                                // Smaller screens
};

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDrawerWidth, setChatDrawerWidth] = useState(() => getInitialDrawerWidth());
  const [isResizingDrawer, setIsResizingDrawer] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('chatDrawerWidth', chatDrawerWidth.toString());
  }, [chatDrawerWidth]);

  // Handle drawer resize
  const handleDrawerResizeStart = (e) => {
    e.preventDefault();
    setIsResizingDrawer(true);

    const startX = e.clientX;
    const startWidth = chatDrawerWidth;

    const handleMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX; // Negative because we're resizing from left
      const newWidth = Math.max(320, Math.min(window.innerWidth * 0.8, startWidth + deltaX));
      setChatDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingDrawer(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const toggleMobileMenu = (isOpen) => {
    setMobileMenuOpen(isOpen);
  };

  const toggleChat = (isOpen) => {
    setChatOpen(isOpen);
  };

  return (
    <Router>
      <AppContainer>
        <DatabaseStatusBanner />
        <ServiceStatusBanner />
        <Header>
          <HeaderLeft>
            <Title>Blush Marketing Operations Center</Title>
            <Subtitle>AI-Powered Marketing Automation for the Blush iPhone App</Subtitle>
          </HeaderLeft>
          <HeaderRight>
            <HeaderQuickActions>
              <HeaderQuickActionLink to="/content/approval">
                <span>✓</span> Approve <span className="badge">3</span>
              </HeaderQuickActionLink>
              <HeaderQuickActionLink to="/dashboard">
                <span>⧉</span> Dashboard
              </HeaderQuickActionLink>
              <HeaderQuickActionLink to="/content/library">
                <span>◫</span> Content
              </HeaderQuickActionLink>
              <HeaderQuickActionLink to="/chat" onClick={(e) => { e.preventDefault(); toggleChat(!chatOpen); }}>
                <span>◈</span> Chat
              </HeaderQuickActionLink>
            </HeaderQuickActions>
          </HeaderRight>
        </Header>

        <MainLayout>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            mobileOpen={mobileMenuOpen}
            onMobileToggle={toggleMobileMenu}
            chatOpen={chatOpen}
            onChatToggle={toggleChat}
            chatDrawerWidth={chatDrawerWidth}
            onDrawerResizeStart={handleDrawerResizeStart}
            isResizingDrawer={isResizingDrawer}
          />

          <MainContentArea>
            <PageContent $sidebarCollapsed={sidebarCollapsed}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<PageWithBreadcrumbs><Dashboard /></PageWithBreadcrumbs>} />
                <Route path="/dashboard/strategic" element={<PageWithBreadcrumbs><StrategicDashboard /></PageWithBreadcrumbs>} />
                <Route path="/aso" element={<PageWithBreadcrumbs><ASO /></PageWithBreadcrumbs>} />
                <Route path="/analytics/channels" element={<PageWithBreadcrumbs><ChannelPerformance /></PageWithBreadcrumbs>} />
                <Route path="/analytics/engagement" element={<PageWithBreadcrumbs><ContentEngagement /></PageWithBreadcrumbs>} />
                <Route path="/analytics/posting-times" element={<PageWithBreadcrumbs><OptimalPostingTime /></PageWithBreadcrumbs>} />
                <Route path="/analytics/categories" element={<PageWithBreadcrumbs><StoryCategories /></PageWithBreadcrumbs>} />
                <Route path="/analytics/hashtags" element={<PageWithBreadcrumbs><HashtagAnalytics /></PageWithBreadcrumbs>} />
                <Route path="/analytics/video-styles" element={<PageWithBreadcrumbs><VideoStyles /></PageWithBreadcrumbs>} />
                <Route path="/analytics/cohort-analysis" element={<PageWithBreadcrumbs><CohortAnalysis /></PageWithBreadcrumbs>} />
                <Route path="/analytics/attribution" element={<PageWithBreadcrumbs><Attribution /></PageWithBreadcrumbs>} />
                <Route path="/analytics/forecast" element={<PageWithBreadcrumbs><Forecast /></PageWithBreadcrumbs>} />
                <Route path="/analytics/anomaly-detection" element={<PageWithBreadcrumbs><AnomalyDetection /></PageWithBreadcrumbs>} />
                <Route path="/analytics/roi-optimization" element={<PageWithBreadcrumbs><ROIOptimization /></PageWithBreadcrumbs>} />
                <Route path="/analytics/churn-prediction" element={<PageWithBreadcrumbs><ChurnPrediction /></PageWithBreadcrumbs>} />
                <Route path="/analytics/ab-test-statistics" element={<PageWithBreadcrumbs><ABTestStatistics /></PageWithBreadcrumbs>} />
                <Route path="/analytics/ltv-modeling" element={<PageWithBreadcrumbs><LTVModeling /></PageWithBreadcrumbs>} />
                <Route path="/content/blog-generator" element={<PageWithBreadcrumbs><BlogPostGenerator /></PageWithBreadcrumbs>} />
                <Route path="/content/medium-generator" element={<PageWithBreadcrumbs><MediumArticleGenerator /></PageWithBreadcrumbs>} />
                <Route path="/content/press-release" element={<PageWithBreadcrumbs><PressReleaseGenerator /></PageWithBreadcrumbs>} />
                <Route path="/content/seo-suggestions" element={<PageWithBreadcrumbs><SeoContentSuggestions /></PageWithBreadcrumbs>} />
                <Route path="/content/calendar" element={<PageWithBreadcrumbs><ContentCalendar /></PageWithBreadcrumbs>} />
                <Route path="/analytics/website-traffic" element={<PageWithBreadcrumbs><WebsiteTraffic /></PageWithBreadcrumbs>} />
                <Route path="/analytics/content-performance" element={<PageWithBreadcrumbs><ContentPerformance /></PageWithBreadcrumbs>} />
                <Route path="/content/trending-topics" element={<PageWithBreadcrumbs><TrendingTopics /></PageWithBreadcrumbs>} />
                <Route path="/content/keyword-recommendations" element={<PageWithBreadcrumbs><KeywordRecommendations /></PageWithBreadcrumbs>} />
                <Route path="/content/library" element={<PageWithBreadcrumbs><ContentLibrary /></PageWithBreadcrumbs>} />
                <Route path="/content/avatars" element={<PageWithBreadcrumbs><AIAvatars /></PageWithBreadcrumbs>} />
                <Route path="/content/approval" element={<PageWithBreadcrumbs><BatchApprovalQueue /></PageWithBreadcrumbs>} />
                <Route path="/content/music" element={<PageWithBreadcrumbs><ContentMusic /></PageWithBreadcrumbs>} />
                <Route path="/chat" element={<PageWithBreadcrumbs><Chat /></PageWithBreadcrumbs>} />
                <Route path="/ads" element={<PageWithBreadcrumbs><Campaigns /></PageWithBreadcrumbs>} />
                <Route path="/ads/campaigns" element={<PageWithBreadcrumbs><Campaigns /></PageWithBreadcrumbs>} />
                <Route path="/ads/revenue-test" element={<PageWithBreadcrumbs><RevenueAttributionTest /></PageWithBreadcrumbs>} />
                <Route path="/revenue/weekly" element={<PageWithBreadcrumbs><WeeklyRevenueAggregates /></PageWithBreadcrumbs>} />
                <Route path="/revenue/monthly" element={<PageWithBreadcrumbs><MonthlyRevenueAggregates /></PageWithBreadcrumbs>} />
                <Route path="/tina/strategies" element={<PageWithBreadcrumbs><Strategies /></PageWithBreadcrumbs>} />
                <Route path="/tina/strategies/:id" element={<PageWithBreadcrumbs><Strategies /></PageWithBreadcrumbs>} />
                <Route path="/tina/goals" element={<PageWithBreadcrumbs><Goals /></PageWithBreadcrumbs>} />
                <Route path="/tina/goals/:id" element={<PageWithBreadcrumbs><Goals /></PageWithBreadcrumbs>} />
                <Route path="/tina" element={<PageWithBreadcrumbs><TinaDashboard /></PageWithBreadcrumbs>} />
                <Route path="/tina/learnings" element={<PageWithBreadcrumbs><Learnings /></PageWithBreadcrumbs>} />
                <Route path="/tina/thoughts" element={<PageWithBreadcrumbs><Thoughts /></PageWithBreadcrumbs>} />
                <Route path="/tina/inbox" element={<PageWithBreadcrumbs><Inbox /></PageWithBreadcrumbs>} />
                <Route path="/tina/experiments" element={<PageWithBreadcrumbs><Experiments /></PageWithBreadcrumbs>} />
                <Route path="/tina/experiments/:id" element={<PageWithBreadcrumbs><Experiments /></PageWithBreadcrumbs>} />
                <Route path="/tina/plans" element={<PageWithBreadcrumbs><Plans /></PageWithBreadcrumbs>} />
                <Route path="/tina/plans/:id" element={<PageWithBreadcrumbs><Plans /></PageWithBreadcrumbs>} />
                <Route path="/tina/reflections" element={<PageWithBreadcrumbs><Reflections /></PageWithBreadcrumbs>} />
                <Route path="/tina/reflections/:id" element={<PageWithBreadcrumbs><Reflections /></PageWithBreadcrumbs>} />
                <Route path="/todos" element={<PageWithBreadcrumbs><Todos /></PageWithBreadcrumbs>} />
                <Route path="/settings" element={<PageWithBreadcrumbs><Settings /></PageWithBreadcrumbs>} />
                <Route path="/service-health" element={<PageWithBreadcrumbs><ServiceHealth /></PageWithBreadcrumbs>} />
                <Route path="/test/toasts" element={<PageWithBreadcrumbs><ToastTest /></PageWithBreadcrumbs>} />
                <Route path="/test/modals" element={<PageWithBreadcrumbs><ModalDemo /></PageWithBreadcrumbs>} />
                <Route path="/test/tabs" element={<PageWithBreadcrumbs><TabsDemo /></PageWithBreadcrumbs>} />
                <Route path="/test/tables" element={<PageWithBreadcrumbs><DataTableDemo /></PageWithBreadcrumbs>} />
                <Route path="/test/empty-states" element={<PageWithBreadcrumbs><EmptyStateDemo /></PageWithBreadcrumbs>} />
                <Route path="/test/errors" element={<PageWithBreadcrumbs><ErrorTestPage /></PageWithBreadcrumbs>} />
                <Route path="/test/database" element={<PageWithBreadcrumbs><DatabaseTestPage /></PageWithBreadcrumbs>} />
                <Route path="/test/filesystem" element={<PageWithBreadcrumbs><FileSystemErrorTestPage /></PageWithBreadcrumbs>} />
                <Route path="/test/accessibility" element={<PageWithBreadcrumbs><AccessibilityTest /></PageWithBreadcrumbs>} />
                <Route path="/test/screen-reader" element={<PageWithBreadcrumbs><ScreenReaderTest /></PageWithBreadcrumbs>} />
                {/* 404 - Must be last route with wildcard path */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageContent>

            <TodoSidebar />
          </MainContentArea>
        </MainLayout>

        <ToastContainer />
      </AppContainer>
    </Router>
  );
}

export default App;
