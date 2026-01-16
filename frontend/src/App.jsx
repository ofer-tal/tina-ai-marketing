import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import StrategicDashboard from './pages/StrategicDashboard';
import Chat from './pages/Chat';
import ContentLibrary from './pages/ContentLibrary';
import BatchApprovalQueue from './pages/BatchApprovalQueue';
import Campaigns from './pages/Campaigns';
import RevenueAttributionTest from './pages/RevenueAttributionTest';
import WeeklyRevenueAggregates from './pages/WeeklyRevenueAggregates';
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
import BlogPostGenerator from './pages/BlogPostGenerator';
import MediumArticleGenerator from './pages/MediumArticleGenerator';
import PressReleaseGenerator from './pages/PressReleaseGenerator';
import SeoContentSuggestions from './pages/SeoContentSuggestions';
import ContentCalendar from './pages/ContentCalendar';
import WebsiteTraffic from './pages/WebsiteTraffic';
import ContentPerformance from './pages/ContentPerformance';
import TrendingTopics from './pages/TrendingTopics';
import KeywordRecommendations from './pages/KeywordRecommendations';
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
`;

const SidebarNav = styled.nav`
  width: ${props => props.$collapsed ? '60px' : '200px'};
  background: ${cssVar('--color-surface')};
  border-right: 1px solid ${cssVar('--color-border')};
  padding: ${props => props.$collapsed ? cssVar('--spacing-sm') : cssVar('--spacing-md')};
  display: flex;
  flex-direction: column;
  gap: ${cssVar('--spacing-sm')};
  transition: width ${cssVar('--transition-base')};
  position: relative;

  @media (max-width: 768px) {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: ${cssVar('--z-index-fixed')};
    transform: translateX(${props => props.$collapsed ? '-100%' : '0'});
    transition: transform ${cssVar('--transition-base')};
  }
`;

const SidebarNavLink = styled(Link)`
  padding: ${props => props.$collapsed ? '0.75rem' : '0.75rem 1rem'};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${cssVar('--radius-md')};
  color: ${cssVar('--color-text')};
  text-decoration: none;
  font-weight: 500;
  transition: all ${cssVar('--transition-base')};
  display: flex;
  align-items: center;
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};
  gap: ${cssVar('--spacing-sm')};
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
    transform: ${props => props.$collapsed ? 'none' : 'translateX(4px)'};
  }

  &.active {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
  }

  span {
    opacity: ${props => props.$collapsed ? '0' : '1'};
    transition: opacity ${cssVar('--transition-base')};
  }
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
  max-width: calc(100vw - ${props => props.$sidebarCollapsed ? '380px' : '520px'}); // Subtract sidebar and todo sidebar

  @media (max-width: 768px) {
    max-width: 100vw;
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
  left: ${props => props.$collapsed ? '60px' : '200px'};
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

const HeaderLeft = styled.div`
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  background: ${cssVar('--gradient-primary')};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: ${cssVar('--color-text-secondary')};
  font-size: 1.1rem;
  margin: 0;
`;

const Nav = styled.nav`
  display: flex;
  gap: ${cssVar('--spacing-md')};
`;

const NavLink = styled(Link)`
  padding: 0.75rem 1.5rem;
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  color: ${cssVar('--color-text')};
  text-decoration: none;
  font-weight: 500;
  transition: all ${cssVar('--transition-base')};

  &:hover {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
    transform: translateY(-2px);
  }

  &.active {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
  }
`;

const Content = styled.main`
  padding: ${cssVar('--spacing-xl')};
  max-width: 1200px;
  margin: 0 auto;
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

// Sidebar component with collapse functionality
function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/dashboard/strategic', icon: '📈', label: 'Strategic' },
    { path: '/analytics/channels', icon: '🎯', label: 'Channels' },
    { path: '/analytics/engagement', icon: '🔍', label: 'Engagement' },
    { path: '/analytics/posting-times', icon: '⏰', label: 'Best Times' },
    { path: '/analytics/categories', icon: '📚', label: 'Categories' },
    { path: '/analytics/hashtags', icon: '#️⃣', label: 'Hashtags' },
    { path: '/analytics/video-styles', icon: '🎬', label: 'Video Styles' },
    { path: '/analytics/cohort-analysis', icon: '📊', label: 'Cohorts' },
    { path: '/analytics/attribution', icon: '🎯', label: 'Attribution' },
    { path: '/analytics/forecast', icon: '🔮', label: 'Forecast' },
    { path: '/analytics/anomaly-detection', icon: '🔍', label: 'Anomaly Detection' },
    { path: '/analytics/roi-optimization', icon: '💰', label: 'ROI Optimization' },
    { path: '/analytics/churn-prediction', icon: '📉', label: 'Churn Prediction' },
    { path: '/analytics/ab-test-statistics', icon: '📈', label: 'A/B Test Stats' },
    { path: '/analytics/ltv-modeling', icon: '💎', label: 'LTV Modeling' },
    { path: '/content/blog-generator', icon: '✍️', label: 'Blog Generator' },
    { path: '/content/medium-generator', icon: '📰', label: 'Medium Articles' },
    { path: '/content/press-release', icon: '📰', label: 'Press Releases' },
    { path: '/content/seo-suggestions', icon: '🔍', label: 'SEO Suggestions' },
    { path: '/content/calendar', icon: '📅', label: 'Calendar' },
    { path: '/analytics/website-traffic', icon: '🌐', label: 'Traffic' },
    { path: '/analytics/content-performance', icon: '📊', label: 'Performance' },
    { path: '/content/trending-topics', icon: '🔥', label: 'Trending Topics' },
    { path: '/content/keyword-recommendations', icon: '🔍', label: 'Keywords' },
    { path: '/content/library', icon: '📝', label: 'Content' },
    { path: '/content/approval', icon: '✅', label: 'Approvals' },
    { path: '/chat', icon: '🤖', label: 'AI Chat' },
    { path: '/ads/campaigns', icon: '📢', label: 'Campaigns' },
    { path: '/ads/revenue-test', icon: '💰', label: 'Revenue' },
    { path: '/revenue/weekly', icon: '📅', label: 'Weekly' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <>
      <SidebarNav $collapsed={collapsed} aria-label="Main navigation">
        {menuItems.map(item => (
          <SidebarNavLink
            key={item.path}
            to={item.path}
            $collapsed={collapsed}
            className={location.pathname === item.path ? 'active' : ''}
            aria-label={item.label}
            aria-current={location.pathname === item.path ? 'page' : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </SidebarNavLink>
        ))}
      </SidebarNav>
      <SidebarToggle
        $collapsed={collapsed}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '▶' : '◀'}
      </SidebarToggle>
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

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
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
        </Header>

        <MainLayout>
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

          <MainContentArea>
            <PageContent $sidebarCollapsed={sidebarCollapsed}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<PageWithBreadcrumbs><Dashboard /></PageWithBreadcrumbs>} />
                <Route path="/dashboard/strategic" element={<PageWithBreadcrumbs><StrategicDashboard /></PageWithBreadcrumbs>} />
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
                <Route path="/content/approval" element={<PageWithBreadcrumbs><BatchApprovalQueue /></PageWithBreadcrumbs>} />
                <Route path="/chat" element={<PageWithBreadcrumbs><Chat /></PageWithBreadcrumbs>} />
                <Route path="/ads/campaigns" element={<PageWithBreadcrumbs><Campaigns /></PageWithBreadcrumbs>} />
                <Route path="/ads/revenue-test" element={<PageWithBreadcrumbs><RevenueAttributionTest /></PageWithBreadcrumbs>} />
                <Route path="/revenue/weekly" element={<PageWithBreadcrumbs><WeeklyRevenueAggregates /></PageWithBreadcrumbs>} />
                <Route path="/todos" element={<PageWithBreadcrumbs><Todos /></PageWithBreadcrumbs>} />
                <Route path="/settings" element={<PageWithBreadcrumbs><Settings /></PageWithBreadcrumbs>} />
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
