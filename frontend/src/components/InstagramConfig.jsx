/**
 * Instagram Integration Configuration Component
 *
 * Provides UI for configuring Instagram Graph API integration for Reels posting.
 * Requires Facebook Page + Instagram Business Account setup.
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
      case 'partial': return '#f59e0b';
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
  padding: 0.5rem 1rem;
  background: #2d3561;
  border: 1px solid #3d4a75;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3d4a75;
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

const WarningMessage = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 1rem;
  color: #f59e0b;
  font-size: 0.875rem;
  margin-top: 1rem;
`;

const PermissionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const PermissionBadge = styled.span`
  background: ${props => props.$granted ? '#10b981' : '#ef4444'};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
`;

function InstagramConfig() {
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    checkConnection();
    fetchAuthUrl();
  }, []);

  // Listen for OAuth messages from popup window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'oauth-success') {
        checkConnection();
      } else if (event.data.type === 'oauth-error') {
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
      const response = await fetch('/api/oauth/instagram/authorize-url');
      const data = await response.json();
      if (data.success) {
        setAuthUrl(data.data.authorizationUrl);
      }
    } catch (err) {
      console.error('Failed to fetch auth URL:', err);
    }
  };

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/instagram/test-connection', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setConnectionDetails(data);
        setConnectionStatus(data.authenticated ? 'connected' : 'idle');

        // Fetch permissions if authenticated
        if (data.authenticated) {
          fetchPermissions();
        }
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

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/instagram/permissions');
      const data = await response.json();

      if (data.success) {
        setPermissions(data);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const discoverBusinessAccount = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/instagram/business-account');
      const data = await response.json();

      if (data.success) {
        setConnectionDetails(prev => ({
          ...prev,
          businessAccount: data.businessAccount
        }));
        setConnectionStatus('connected');
      } else {
        setError(data.error || 'Failed to discover business account');
        setConnectionStatus('partial');
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
      case 'partial': return '⚠ Partial Setup';
      default: return 'Not Connected';
    }
  };

  const handleAuthorize = () => {
    if (authUrl) {
      window.open(authUrl, '_blank', 'width=600,height=700');
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Icon>📸</Icon>
          Instagram Integration
        </Title>
        <StatusBadge $status={connectionStatus}>
          {getStatusText()}
        </StatusBadge>
      </Header>

      {connectionDetails && (
        <Section>
          <SectionTitle>📊 Connection Status</SectionTitle>
          <StatusGrid>
            <StatusItem>
              <StatusLabel>Enabled</StatusLabel>
              <StatusValue>
                {connectionDetails.enabled ? '✓ Yes' : '✗ No'}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Authenticated</StatusLabel>
              <StatusValue>
                {connectionDetails.authenticated ? '✓ Yes' : '✗ No'}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Has Credentials</StatusLabel>
              <StatusValue>
                {connectionDetails.hasCredentials ? '✓ Yes' : '✗ No'}
              </StatusValue>
            </StatusItem>
            {connectionDetails.businessAccount && (
              <StatusItem>
                <StatusLabel>Instagram Account</StatusLabel>
                <StatusValue>
                  @{connectionDetails.businessAccount.username || 'Connected'}
                </StatusValue>
              </StatusItem>
            )}
          </StatusGrid>

          {permissions && (
            <div style={{ marginTop: '1rem' }}>
              <StatusLabel>Permissions:</StatusLabel>
              <PermissionsList>
                {permissions.permissions?.map(perm => (
                  <PermissionBadge key={perm.permission} $granted={perm.granted}>
                    {perm.permission}
                  </PermissionBadge>
                ))}
              </PermissionsList>
              {!permissions.hasAllPermissions && (
                <WarningMessage>
                  ⚠️ Missing permissions: {permissions.missingPermissions?.join(', ')}
                </WarningMessage>
              )}
            </div>
          )}
        </Section>
      )}

      <Section>
        <SectionTitle>🔐 Authentication & Testing</SectionTitle>
        <Button
          onClick={handleAuthorize}
          disabled={loading || !authUrl}
          style={{ marginRight: '1rem' }}
        >
          🔐 Authorize with Instagram
        </Button>
        <SecondaryButton
          onClick={checkConnection}
          disabled={loading}
        >
          {loading ? 'Testing...' : '🔄 Test Connection'}
        </SecondaryButton>
        <SecondaryButton
          onClick={discoverBusinessAccount}
          disabled={loading}
          style={{ marginLeft: '1rem' }}
        >
          📱 Discover Business Account
        </SecondaryButton>

        {error && (
          <ErrorMessage>
            <strong>Error:</strong> {error}
          </ErrorMessage>
        )}

        {connectionStatus === 'connected' && !error && (
          <SuccessMessage>
            ✓ Instagram connection successful! You can now post Reels.
          </SuccessMessage>
        )}

        {connectionStatus === 'partial' && !error && (
          <WarningMessage>
            ⚠️ Partial setup: Authenticated but business account not found.
            Make sure your Facebook Page is connected to an Instagram Business account.
          </WarningMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>📋 Setup Instructions</SectionTitle>
        <InstructionList>
          <InstructionItem>
            <strong>Create Facebook App:</strong>{' '}
            Visit <Link href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">developers.facebook.com</Link> and create a new app of type <strong>Business</strong>.
          </InstructionItem>
          <InstructionItem>
            <strong>Add Products:</strong>{' '}
            In your app dashboard, add <strong>Facebook Login</strong> and <strong>Instagram Graph API</strong> products.
          </InstructionItem>
          <InstructionItem>
            <strong>Configure Redirect URI:</strong>{' '}
            Add <CodeBlock>https://localhost:3001/auth/instagram/callback</CodeBlock> to your Facebook Login <strong>Valid OAuth Redirect URIs</strong>.
            (In production, use <CodeBlock>https://your-domain.com/auth/instagram/callback</CodeBlock>)
            <strong>IMPORTANT:</strong> Facebook requires HTTPS redirect URIs. The backend now runs on HTTPS with a self-signed certificate.
            Your browser will show a security warning - click "Advanced" → "Proceed to localhost" to continue.
          </InstructionItem>
          <InstructionItem>
            <strong>Request Permissions:</strong>{' '}
            In App Review → Permissions and Features, add: <CodeBlock>instagram_content_publish</CodeBlock>, <CodeBlock>pages_read_engagement</CodeBlock>, <CodeBlock>pages_show_list</CodeBlock>, <CodeBlock>instagram_manage_insights</CodeBlock>.
            <strong>Note:</strong> <CodeBlock>instagram_basic</CodeBlock> was deprecated in December 2024. Use Instagram Graph API permissions instead.
            Submit for review if you'll use this in production.
          </InstructionItem>
          <InstructionItem>
            <strong>Set Up Facebook Page:</strong>{' '}
            Create a Facebook Page (or use an existing one). This is required - Instagram API posting requires a Facebook Page.
          </InstructionItem>
          <InstructionItem>
            <strong>Convert to Professional Account:</strong>{' '}
            Go to Instagram → Settings → Account → Account Type and switch to <strong>Professional</strong> (Business or Creator) account.
          </InstructionItem>
          <InstructionItem>
            <strong>Connect Instagram to Facebook Page:</strong>{' '}
            Go to Instagram → Settings → Accounts Center → Linked Accounts → Connect your Facebook Page.
            This creates the connection needed for the Instagram Graph API.
          </InstructionItem>
          <InstructionItem>
            <strong>Authorize App:</strong>{' '}
            Click the <strong>🔐 Authorize with Instagram</strong> button, log in with Facebook, and select your Facebook Page.
            This grants the app a Page Access Token which can post to Instagram.
          </InstructionItem>
          <InstructionItem>
            <strong>Discover Business Account:</strong>{' '}
            Click <strong>📱 Discover Business Account</strong> to verify your Instagram Business account is properly connected.
          </InstructionItem>
        </InstructionList>
      </Section>

      <Section>
        <SectionTitle>⚠️ Important Notes</SectionTitle>
        <InstructionList>
          <InstructionItem>
            Instagram Reels can only be posted to <strong>Professional</strong> accounts (Business or Creator), not personal accounts.
          </InstructionItem>
          <InstructionItem>
            A Facebook Page must be connected to your Instagram account before you can post via API.
          </InstructionItem>
          <InstructionItem>
            The video URL must be publicly accessible (the system uploads to S3 automatically before posting).
          </InstructionItem>
          <InstructionItem>
            Reels must be between 15-90 seconds long.
          </InstructionItem>
          <InstructionItem>
            After posting, stats (views, likes, comments) are synced automatically every 30 minutes.
          </InstructionItem>
        </InstructionList>
      </Section>
    </Container>
  );
}

export default InstagramConfig;
