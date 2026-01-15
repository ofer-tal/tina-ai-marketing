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
import TodoSidebar from './components/TodoSidebar';

const AppContainer = styled.div`
  min-height: 100vh;
  background: #1a1a2e;
  color: #eaeaea;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
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
  background: #16213e;
  border-right: 1px solid #2d3561;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SidebarNavLink = styled(Link)`
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #eaeaea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #e94560;
    border-color: #e94560;
    transform: translateX(4px);
  }

  &.active {
    background: #e94560;
    border-color: #e94560;
  }
`;

const MainContentArea = styled.main`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const PageContent = styled.div`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  max-width: calc(100vw - 520px); // Subtract sidebar and todo sidebar
`;

const Header = styled.header`
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2d3561;
`;

const HeaderLeft = styled.div`
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: #a0a0a0;
  font-size: 1.1rem;
  margin: 0;
`;

const Nav = styled.nav`
  display: flex;
  gap: 1rem;
`;

const NavLink = styled(Link)`
  padding: 0.75rem 1.5rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    border-color: #e94560;
    transform: translateY(-2px);
  }

  &.active {
    background: #e94560;
    border-color: #e94560;
  }
`;

const Content = styled.main`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const WelcomeCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;

  &:hover {
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  color: #e94560;
`;

const CardText = styled.p`
  line-height: 1.6;
  color: #eaeaea;
  margin-bottom: 1rem;
`;

const StatusList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
`;

const StatusItem = styled.li`
  padding: 0.5rem 0;
  color: #a0a0a0;

  &::before {
    content: '✓ ';
    color: #00d26a;
    font-weight: bold;
    margin-right: 0.5rem;
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
