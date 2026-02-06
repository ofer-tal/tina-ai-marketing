/**
 * TikTok Sandbox Configuration Component
 *
 * Provides UI for configuring and testing TikTok sandbox app integration.
 * This allows safe testing of TikTok posting without affecting production accounts.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoadingSpinner from './LoadingSpinner.jsx';

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

function TikTokSandboxConfig() {
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [sandboxStatus, setSandboxStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);

  useEffect(() => {
    checkSandboxStatus();
    fetchAuthUrl();
  }, []);

  // Listen for OAuth messages from popup window
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'oauth-success') {
        // OAuth succeeded - refresh status
        checkSandboxStatus();
        // Don't show alert - popup closes automatically
      } else if (event.data.type === 'oauth-error') {
        // OAuth failed
        setError(event.data.message || 'Authentication failed');
        setConnectionStatus('error');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const fetchAuthUrl = async () => {
    try {
      const response = await fetch('/api/tiktok/authorize-url?scopes=video.upload,video.publish');
      const data = await response.json();
      if (data.success) {
        setAuthUrl(data.data.url);
      }
    } catch (err) {
      console.error('Failed to fetch auth URL:', err);
    }
  };

  const checkSandboxStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/tiktok/sandbox-status');
      const data = await response.json();

      if (data.success) {
        setSandboxStatus(data.data);
        setConnectionStatus(data.data.isSandbox ? 'connected' : 'warning');
      } else {
        setError(data.error || 'Failed to check sandbox status');
        setConnectionStatus('error');
      }
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('testing');

      const response = await fetch('/api/tiktok/test-connection');
      const data = await response.json();

      if (data.success) {
        setConnectionStatus('connected');
        // Refresh sandbox status after successful connection
        await checkSandboxStatus();
      } else {
        setError(data.error || 'Connection test failed');
        setConnectionStatus('error');
      }
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✓ Connected';
      case 'error': return '✗ Error';
      case 'testing': return 'Testing...';
      case 'warning': return '⚠ Production Mode';
      default: return 'Not Configured';
    }
  };

  const handleAuthorize = () => {
    if (authUrl) {
      window.open(authUrl, '_blank', 'width=600,height=700');
    }
  };

  const checkForOAuthResult = () => {
    const params = new URLSearchParams(window.location.search);
    const tiktokStatus = params.get('tiktok');
    const message = params.get('message');

    if (tiktokStatus === 'success') {
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
      checkSandboxStatus();
      // Show success message
      setError(null);
      setConnectionStatus('connected');
      // You could show a toast notification here
      alert(message || 'TikTok authentication successful!');
    } else if (tiktokStatus === 'error') {
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
      setError(message || 'Authentication failed');
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    // Only check URL params if not using postMessage (fallback)
    // This handles cases where the callback page fails to close
    checkForOAuthResult();
  }, []);

  return (
    <Container>
      <Header>
        <Title>
          <Icon>🎵</Icon>
          TikTok Sandbox Configuration
        </Title>
        <StatusBadge $status={connectionStatus}>
          {getStatusText()}
        </StatusBadge>
      </Header>

      {sandboxStatus && (
        <Section>
          <SectionTitle>📊 Current Status</SectionTitle>
          <StatusGrid>
            <StatusItem>
              <StatusLabel>Mode</StatusLabel>
              <StatusValue>
                {sandboxStatus.isSandbox ? '🧪 Sandbox' : '🌍 Production'}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Authenticated</StatusLabel>
              <StatusValue>
                {sandboxStatus.authenticated ? '✓ Yes' : '✗ No'}
              </StatusValue>
            </StatusItem>
            {sandboxStatus.userInfo && (
              <>
                <StatusItem>
                  <StatusLabel>Display Name</StatusLabel>
                  <StatusValue>{sandboxStatus.userInfo.display_name || 'N/A'}</StatusValue>
                </StatusItem>
                <StatusItem>
                  <StatusLabel>Username</StatusLabel>
                  <StatusValue>@{sandboxStatus.userInfo.username || 'N/A'}</StatusValue>
                </StatusItem>
              </>
            )}
          </StatusGrid>
        </Section>
      )}

      <Section>
        <SectionTitle>🧪 Authentication & Testing</SectionTitle>
        <Button
          onClick={handleAuthorize}
          disabled={loading || !authUrl}
          style={{ marginRight: '1rem' }}
        >
          🔐 Authorize with TikTok
        </Button>
        <Button
          onClick={testConnection}
          disabled={loading}
        >
          {loading && <LoadingSpinner inline size="small" color="#ffffff" />}
          {loading ? 'Testing...' : '🔄 Test Connection'}
        </Button>

        {error && (
          <ErrorMessage>
            <strong>Error:</strong> {error}
          </ErrorMessage>
        )}

        {connectionStatus === 'connected' && !error && (
          <SuccessMessage>
            ✓ TikTok sandbox connection successful! Your app is properly configured.
          </SuccessMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>📋 Setup Instructions</SectionTitle>
        <InstructionList>
          <InstructionItem>
            <strong>Create TikTok Developer Account:</strong>{' '}
            Visit <Link href="https://developer.tiktok.com" target="_blank" rel="noopener noreferrer">developer.tiktok.com</Link> and sign up for a developer account.
          </InstructionItem>
          <InstructionItem>
            <strong>Create a Sandbox App:</strong>{' '}
            In the TikTok Developer Portal, create a new app and select <CodeBlock>Sandbox</CodeBlock> mode for testing.
          </InstructionItem>
          <InstructionItem>
            <strong>Configure Redirect URIs:</strong>{' '}
            Add <CodeBlock>/auth/tiktok/callback</CodeBlock> to your app's redirect URIs.
          </InstructionItem>
          <InstructionItem>
            <strong>Get Credentials:</strong>{' '}
            Copy your <CodeBlock>App Key</CodeBlock> (Client Key) and <CodeBlock>App Secret</CodeBlock> from the app settings.
          </InstructionItem>
          <InstructionItem>
            <strong>Enter Credentials:</strong>{' '}
            Go to the <strong>TikTok Integration</strong> settings section below and enter your credentials.
          </InstructionItem>
          <InstructionItem>
            <strong>Request Permissions:</strong>{' '}
            Ensure your app has the following permissions:{' '}
            <CodeBlock>video.upload</CodeBlock>, <CodeBlock>video.publish</CodeBlock>, and <CodeBlock>user.info</CodeBlock>.
          </InstructionItem>
          <InstructionItem>
            <strong>Authorize App:</strong>{' '}
            Click the <strong>🔐 Authorize with TikTok</strong> button above to open TikTok's authorization page. Log in with your TikTok account and authorize the app.
          </InstructionItem>
          <InstructionItem>
            <strong>Test Connection:</strong>{' '}
            Use the <strong>Test Sandbox Connection</strong> button above to verify your setup.
          </InstructionItem>
        </InstructionList>
      </Section>

      <Section>
        <SectionTitle>⚠️ Important Notes</SectionTitle>
        <InstructionList>
          <InstructionItem>
            Sandbox apps are for <strong>testing only</strong>. Videos posted in sandbox mode are not visible to the public.
          </InstructionItem>
          <InstructionItem>
            You'll need a TikTok account linked to your developer account to test posting.
          </InstructionItem>
          <InstructionItem>
            Rate limits in sandbox mode may differ from production.
          </InstructionItem>
          <InstructionItem>
            When ready for production, create a production app and update credentials in settings.
          </InstructionItem>
        </InstructionList>
      </Section>
    </Container>
  );
}

export default TikTokSandboxConfig;
