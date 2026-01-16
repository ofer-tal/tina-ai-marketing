import { useState } from 'react';
import styled from 'styled-components';
import Breadcrumbs from '../components/Breadcrumbs';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: ${props => props.theme?.colors?.text || '#eaeaea'};
`;

const Description = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#a0a0a0'};
  margin-bottom: 2rem;
`;

const TestCard = styled.div`
  background: ${props => props.theme?.colors?.surface || '#16213e'};
  border: 1px solid ${props => props.theme?.colors?.border || '#2d3561'};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const TestButton = styled.button`
  background: ${props => props.$variant === 'danger' ? '#e94560' : '#7b2cbf'};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  margin-right: 1rem;
  margin-bottom: 1rem;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusDisplay = styled.div`
  background: ${props => props.theme?.colors?.background || '#1a1a2e'};
  border: 1px solid ${props => props.theme?.colors?.border || '#2d3561'};
  border-radius: 4px;
  padding: 1rem;
  margin-top: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
`;

const InfoText = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#a0a0a0'};
  margin: 0.5rem 0;
  font-size: 0.875rem;
`;

const DatabaseTestPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const testDatabaseHealth = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/database-status/health');
      const data = await response.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setStatus(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseStatus = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/database-status/status');
      const data = await response.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setStatus(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseHistory = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/database-status/history?limit=10');
      const data = await response.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setStatus(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Breadcrumbs />
      <Title>Database Connection Error Handling Test</Title>
      <Description>
        Test the database connection error handling feature. This page allows you to verify that
        database connection errors are caught, reconnection is attempted, and user notifications are shown.
      </Description>

      <TestCard>
        <h3>Database Status Tests</h3>
        <InfoText>Test the various database status endpoints and verify error handling.</InfoText>

        <div style={{ marginTop: '1rem' }}>
          <TestButton onClick={testDatabaseHealth} disabled={loading}>
            Check Database Health
          </TestButton>
          <TestButton onClick={testDatabaseStatus} disabled={loading}>
            Get Database Status
          </TestButton>
          <TestButton onClick={testDatabaseHistory} disabled={loading}>
            Get Connection History
          </TestButton>
        </div>

        {status && (
          <StatusDisplay>
            {status}
          </StatusDisplay>
        )}
      </TestCard>

      <TestCard>
        <h3>Expected Behavior</h3>
        <InfoText>✅ When database is connected: No banner shown</InfoText>
        <InfoText>✅ When database disconnects: Yellow banner shown "Database Connection Lost"</InfoText>
        <InfoText>✅ After multiple failures: Red banner shown with failure count</InfoText>
        <InfoText>✅ On reconnection: Green banner shown "Database Connection Recovered"</InfoText>
        <InfoText>✅ Banner polls every 15 seconds for status updates</InfoText>
        <InfoText>✅ Banner can be dismissed by clicking "Dismiss" button</InfoText>
      </TestCard>

      <TestCard>
        <h3>Feature Verification Steps</h3>
        <InfoText>1. Database connection fails - ✅ Event listeners catch disconnection</InfoText>
        <InfoText>2. Catch connection error - ✅ Error event listener handles errors</InfoText>
        <InfoText>3. Attempt reconnection - ✅ Auto-reconnection with 5s delay</InfoText>
        <InfoText>4. Show user error if persistent - ✅ DatabaseStatusBanner shows notifications</InfoText>
        <InfoText>5. Log all connection attempts - ✅ Connection history logged in database service</InfoText>
      </TestCard>
    </Container>
  );
};

export default DatabaseTestPage;
