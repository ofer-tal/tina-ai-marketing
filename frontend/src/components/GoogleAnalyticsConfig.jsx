/**
 * Google Analytics Configuration Component
 *
 * Provides UI for configuring and testing Google Analytics 4 integration.
 * Displays connection status and allows testing API connectivity.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h3`
  font-size: 1.25rem;
  margin: 0;
  color: #e94560;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Icon = styled.span`
  font-size: 1.5rem;
`;

const StatusBadge = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'connected': return '#10b981';
      case 'error': return '#ef4444';
      case 'testing': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: ${props => props.$pulsing ? 'pulse 1.5s ease-in-out infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const ConfigSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: #a0a0a0;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ConfigItem = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const ConfigLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const ConfigValue = styled.div`
  font-size: 0.875rem;
  color: ${props => props.$configured ? '#00d26a' : '#f8312f'};
  font-weight: 500;
  word-break: break-all;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => {
    if (props.$variant === 'secondary') return '#2d3561';
    return '#e94560';
  }};
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const InfoBox = styled.div`
  background: ${props => props.$type === 'error' ? 'rgba(248, 49, 47, 0.1)' : 'rgba(0, 210, 106, 0.1)'};
  border: 1px solid ${props => props.$type === 'error' ? '#f8312f' : '#00d26a'};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: ${props => props.$type === 'error' ? '#f8312f' : '#00d26a'};
`;

const Instructions = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
`;

const InstructionsTitle = styled.h5`
  font-size: 0.875rem;
  color: #e94560;
  margin: 0 0 0.75rem 0;
`;

const InstructionsList = styled.ol`
  margin: 0;
  padding-left: 1.5rem;
  font-size: 0.875rem;
  color: #a0a0a0;

  li {
    margin-bottom: 0.5rem;
  }
`;

const GoogleAnalyticsConfig = () => {
  const [status, setStatus] = useState('disconnected');
  const [config, setConfig] = useState(null);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/googleAnalytics/config');
      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setStatus(data.data.authenticated ? 'connected' : 'disconnected');
      }
    } catch (error) {
      console.error('Failed to fetch Google Analytics config:', error);
      setStatus('error');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setStatus('testing');
    setMessage(null);

    try {
      const response = await fetch('/api/googleAnalytics/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        setStatus('connected');
        setMessage({
          type: 'success',
          text: 'Successfully connected to Google Analytics!'
        });
      } else {
        setStatus('error');
        setMessage({
          type: 'error',
          text: data.error || 'Connection failed'
        });
      }
    } catch (error) {
      setStatus('error');
      setMessage({
        type: 'error',
        text: 'Failed to test connection: ' + error.message
      });
    } finally {
      setTesting(false);
      await fetchConfig();
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'testing': return 'Testing...';
      case 'error': return 'Error';
      default: return 'Not Connected';
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Icon>📊</Icon>
          Google Analytics Integration
        </Title>
        <StatusBadge $status={status}>
          <StatusDot $pulsing={status === 'testing'} />
          {getStatusLabel()}
        </StatusBadge>
      </Header>

      <ConfigSection>
        <SectionTitle>Configuration Status</SectionTitle>
        <ConfigGrid>
          <ConfigItem>
            <ConfigLabel>Property ID</ConfigLabel>
            <ConfigValue $configured={config?.propertyId}>
              {config?.propertyId || 'Not configured'}
            </ConfigValue>
          </ConfigItem>

          <ConfigItem>
            <ConfigLabel>View ID (Universal Analytics)</ConfigLabel>
            <ConfigValue $configured={config?.viewId}>
              {config?.viewId || 'Not configured'}
            </ConfigValue>
          </ConfigItem>

          <ConfigItem>
            <ConfigLabel>Credentials File</ConfigLabel>
            <ConfigValue $configured={config?.credentialsPath}>
              {config?.credentialsPath ? 'Configured' : 'Not configured'}
            </ConfigValue>
          </ConfigItem>

          <ConfigItem>
            <ConfigLabel>Authentication</ConfigLabel>
            <ConfigValue $configured={config?.authenticated}>
              {config?.authenticated ? 'Authenticated' : 'Not authenticated'}
            </ConfigValue>
          </ConfigItem>
        </ConfigGrid>
      </ConfigSection>

      <ButtonGroup>
        <Button
          onClick={testConnection}
          disabled={testing || !config}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button
          $variant="secondary"
          onClick={fetchConfig}
          disabled={testing}
        >
          Refresh Status
        </Button>
      </ButtonGroup>

      {message && (
        <InfoBox $type={message.type}>
          {message.text}
        </InfoBox>
      )}

      <Instructions>
        <InstructionsTitle>Setup Instructions</InstructionsTitle>
        <InstructionsList>
          <li>Create a Google Analytics 4 property for your application</li>
          <li>Note your Property ID from the Admin panel</li>
          <li>Create a service account in Google Cloud Console</li>
          <li>Download the service account JSON credentials file</li>
          <li>Add the service account email to your GA4 property with Viewer permissions</li>
          <li>Set GOOGLE_ANALYTICS_PROPERTY_ID in your environment</li>
          <li>Set GOOGLE_ANALYTICS_CREDENTIALS to the path to your JSON file</li>
          <li>Click "Test Connection" to verify the setup</li>
        </InstructionsList>
      </Instructions>
    </Container>
  );
};

export default GoogleAnalyticsConfig;
