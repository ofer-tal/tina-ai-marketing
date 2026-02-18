/**
 * YouTube Configuration Component
 *
 * Provides UI for connecting YouTube for video posting.
 * This allows direct posting to YouTube Shorts from the marketing dashboard.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
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
`;

const Section = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  font-size: 1rem;
  margin: 0 0 0.75rem 0;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatusItem = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
`;

const StatusLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const StatusValue = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  font-weight: 500;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: #16213e;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const InstructionList = styled.ol`
  margin: 0;
  padding-left: 1.5rem;
  color: #eaeaea;
  font-size: 0.875rem;
  line-height: 1.6;
`;

const InstructionItem = styled.li`
  margin-bottom: 0.75rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CodeBlock = styled.code`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: #e94560;
`;

const Link = styled.a`
  color: #7b2cbf;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 1rem;
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  border-radius: 8px;
  padding: 1rem;
  color: #10b981;
  font-size: 0.875rem;
  margin-top: 1rem;
`;

const ChannelInfo = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const ChannelTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const ChannelDetail = styled.div`
  font-size: 0.875rem;
  color: #a0a0a0;
`;

function YouTubeConfig() {
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [channelInfo, setChannelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    fetchAuthUrl();
    checkConnectionStatus();
    setupOAuthMessageListener();
  }, []);

  const fetchAuthUrl = async () => {
    try {
      const response = await fetch('/api/youtube/authorize-url');
      const data = await response.json();
      if (data.success) {
        setAuthUrl(data.data.authorizationUrl);
      }
    } catch (err) {
      console.error('Failed to fetch YouTube auth URL:', err);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/youtube/test-connection');
      const data = await response.json();
      if (data.success) {
        setConnectionStatus('connected');
        setChannelInfo(data.channel || data.data?.channel);
      } else {
        setConnectionStatus('error');
        setError(data.error || 'Connection test failed');
      }
    } catch (err) {
      setConnectionStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const setupOAuthMessageListener = () => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'youtube-oauth-success') {
        setConnectionStatus('connected');
        checkConnectionStatus();
      } else if (event.data.type === 'youtube-oauth-error') {
        setConnectionStatus('error');
        setError(event.data.message || 'Authentication failed');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  };

  const handleAuthorize = () => {
    if (!authUrl) return;
    window.open(authUrl, '_blank', 'width=600,height=700');
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setTestResults(null);
    setError(null);
    try {
      const response = await fetch('/api/youtube/test-connection', { method: 'POST' });
      const data = await response.json();

      setTestResults(data.data || {});

      if (data.success) {
        setConnectionStatus('connected');
        setChannelInfo(data.data?.oauth?.channel || data.channel);
      } else {
        setConnectionStatus('error');
        setError(data.error || 'Connection test failed');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err.message || 'Connection test failed');
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✓ Connected';
      case 'error': return '✗ Error';
      case 'testing': return 'Testing...';
      default: return 'Not Connected';
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Icon>📺</Icon>
          YouTube Connection
        </Title>
        <StatusBadge $status={connectionStatus}>
          {getStatusText()}
        </StatusBadge>
      </Header>

      {channelInfo && connectionStatus === 'connected' && (
        <Section>
          <SectionTitle>📺 Connected Channel</SectionTitle>
          <ChannelInfo>
            <ChannelTitle>{channelInfo.title}</ChannelTitle>
            <ChannelDetail>Channel ID: {channelInfo.id}</ChannelDetail>
            {channelInfo.customUrl && (
              <ChannelDetail>Custom URL: {channelInfo.customUrl}</ChannelDetail>
            )}
          </ChannelInfo>
        </Section>
      )}

      <Section>
        <SectionTitle>🔐 Authentication</SectionTitle>
        <Button
          onClick={handleAuthorize}
          disabled={loading || !authUrl}
          style={{ marginRight: '1rem' }}
        >
          🔐 Connect YouTube Account
        </Button>
        <SecondaryButton
          onClick={testConnection}
          disabled={loading}
        >
          🔄 Test Connection
        </SecondaryButton>

        {error && (
          <ErrorMessage>
            <strong>Error:</strong> {error}
          </ErrorMessage>
        )}

        {testResults && (
          <div style={{ marginTop: '1rem' }}>
            <StatusGrid>
              <StatusItem>
                <StatusLabel>OAuth (Posting)</StatusLabel>
                <StatusValue>
                  {testResults.oauth?.success ? '✓ Connected' : '✗ Failed'}
                </StatusValue>
                {testResults.oauth?.message && (
                  <div style={{ fontSize: '0.75rem', color: '#a0a0a0', marginTop: '0.25rem' }}>
                    {testResults.oauth.message}
                  </div>
                )}
              </StatusItem>
              <StatusItem>
                <StatusLabel>API Key (Metrics)</StatusLabel>
                <StatusValue>
                  {testResults.apiKey?.success ? '✓ Valid' : '⚠ Issue'}
                </StatusValue>
                {testResults.apiKey?.message && (
                  <div style={{ fontSize: '0.75rem', color: '#a0a0a0', marginTop: '0.25rem' }}>
                    {testResults.apiKey.message}
                  </div>
                )}
              </StatusItem>
            </StatusGrid>
            {testResults.oauth?.success && testResults.apiKey?.success && (
              <SuccessMessage style={{ marginTop: '1rem' }}>
                ✓ All systems operational! You can post videos and fetch metrics.
              </SuccessMessage>
            )}
            {testResults.oauth?.success && !testResults.apiKey?.success && (
              <SuccessMessage style={{ marginTop: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b', color: '#f59e0b' }}>
                ⚠ OAuth connected (can post), but metrics won't work without a valid API key.
              </SuccessMessage>
            )}
          </div>
        )}

        {connectionStatus === 'connected' && !error && !testResults && (
          <SuccessMessage>
            ✓ YouTube account connected successfully! You can now post videos directly to YouTube Shorts.
          </SuccessMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>📋 Setup Instructions</SectionTitle>
        <InstructionList>
          <InstructionItem>
            <strong>Enable YouTube Data API v3:</strong>{' '}
            Go to <Link href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</Link>, select your project, and enable the <CodeBlock>YouTube Data API v3</CodeBlock>.
          </InstructionItem>
          <InstructionItem>
            <strong>Create API Key (for metrics):</strong>{' '}
            In Google Cloud Console, create an API key for YouTube Data API v3. Set <CodeBlock>YOUTUBE_API_KEY</CodeBlock> in your environment. This is required for fetching video statistics.
          </InstructionItem>
          <InstructionItem>
            <strong>Configure OAuth Credentials:</strong>{' '}
            Set <CodeBlock>GOOGLE_CLIENT_ID</CodeBlock>, <CodeBlock>GOOGLE_CLIENT_SECRET</CodeBlock>, and <CodeBlock>YOUTUBE_REDIRECT_URI</CodeBlock> in your environment.
          </InstructionItem>
          <InstructionItem>
            <strong>Add Callback URLs:</strong>{' '}
            Add both <CodeBlock>https://bart.shmoop.org:3001/auth/google/callback</CodeBlock> and <CodeBlock>https://bart.shmoop.org:3001/auth/youtube/callback</CodeBlock> to your OAuth client's authorized redirect URIs.
          </InstructionItem>
          <InstructionItem>
            <strong>Connect YouTube Account:</strong>{' '}
            Click <strong>🔐 Connect YouTube Account</strong> to authorize. <strong>Important:</strong> In the Google OAuth dialog, select the <CodeBlock>@BlushApp</CodeBlock> brand account when prompted.
          </InstructionItem>
        </InstructionList>
      </Section>

      <Section>
        <SectionTitle>⚠️ Important Notes</SectionTitle>
        <InstructionList>
          <InstructionItem>
            This is a <strong>dedicated YouTube OAuth connection</strong> - separate from the Google Sheets connection.
          </InstructionItem>
          <InstructionItem>
            <strong>OAuth is required for posting videos</strong> - you must connect your YouTube account to upload content.
          </InstructionItem>
          <InstructionItem>
            <strong>API Key is required for metrics</strong> - set <CodeBlock>YOUTUBE_API_KEY</CodeBlock> to fetch video statistics (views, likes, comments).
          </InstructionItem>
          <InstructionItem>
            When authorizing, <strong>select the @BlushApp brand account</strong> in the Google OAuth dialog (not your personal account).
          </InstructionItem>
        </InstructionList>
      </Section>
    </Container>
  );
}

export default YouTubeConfig;
