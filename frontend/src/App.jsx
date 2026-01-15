import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
import Todos from './pages/Todos';
import TodoSidebar from './components/TodoSidebar';
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
  width: 200px;
  background: ${cssVar('--color-surface')};
  border-right: 1px solid ${cssVar('--color-border')};
  padding: ${cssVar('--spacing-md')};
  display: flex;
  flex-direction: column;
  gap: ${cssVar('--spacing-sm')};
`;

const SidebarNavLink = styled(Link)`
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${cssVar('--radius-md')};
  color: ${cssVar('--color-text')};
  text-decoration: none;
  font-weight: 500;
  transition: all ${cssVar('--transition-base')};
  display: flex;
  align-items: center;
  gap: ${cssVar('--spacing-sm')};

  &:hover {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
    transform: translateX(4px);
  }

  &.active {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
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
  max-width: calc(100vw - 520px); // Subtract sidebar and todo sidebar
`;

const Header = styled.header`
  padding: ${cssVar('--spacing-xl')};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${cssVar('--color-border')};
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

function App() {
  return (
    <Router>
      <AppContainer>
        <Header>
          <HeaderLeft>
            <Title>Blush Marketing Operations Center</Title>
            <Subtitle>AI-Powered Marketing Automation for the Blush iPhone App</Subtitle>
          </HeaderLeft>
        </Header>

        <MainLayout>
          <SidebarNav>
            <SidebarNavLink to="/">🏠 Home</SidebarNavLink>
            <SidebarNavLink to="/dashboard">📊 Dashboard</SidebarNavLink>
            <SidebarNavLink to="/dashboard/strategic">📈 Strategic</SidebarNavLink>
            <SidebarNavLink to="/content/library">📝 Content</SidebarNavLink>
            <SidebarNavLink to="/content/approval">✅ Approvals</SidebarNavLink>
            <SidebarNavLink to="/chat">🤖 AI Chat</SidebarNavLink>
            <SidebarNavLink to="/ads/campaigns">📢 Campaigns</SidebarNavLink>
            <SidebarNavLink to="/ads/revenue-test">💰 Revenue</SidebarNavLink>
            <SidebarNavLink to="/revenue/weekly">📅 Weekly</SidebarNavLink>
            <SidebarNavLink to="/settings">⚙️ Settings</SidebarNavLink>
          </SidebarNav>

          <MainContentArea>
            <PageContent>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/strategic" element={<StrategicDashboard />} />
                <Route path="/content/library" element={<ContentLibrary />} />
                <Route path="/content/approval" element={<BatchApprovalQueue />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/ads/campaigns" element={<Campaigns />} />
                <Route path="/ads/revenue-test" element={<RevenueAttributionTest />} />
                <Route path="/revenue/weekly" element={<WeeklyRevenueAggregates />} />
                <Route path="/todos" element={<Todos />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </PageContent>

            <TodoSidebar />
          </MainContentArea>
        </MainLayout>
      </AppContainer>
    </Router>
  );
}

export default App;
