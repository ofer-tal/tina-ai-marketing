import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import Settings from './pages/Settings';

const AppContainer = styled.div`
  min-height: 100vh;
  background: #1a1a2e;
  color: #eaeaea;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
          <Nav>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </Nav>
        </Header>

        <Content>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </AppContainer>
    </Router>
  );
}

export default App;
