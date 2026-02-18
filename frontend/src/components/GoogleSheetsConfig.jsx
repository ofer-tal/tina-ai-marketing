/**
 * Google Sheets Configuration Component
 *
 * Provides UI for connecting Google Sheets for TikTok auto-posting via Buffer/Zapier.
 * This allows automated posting workflow: S3 upload → Google Sheets → Zapier → Buffer → TikTok
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoadingSpinner from './LoadingSpinner.jsx';

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

const SheetsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const SheetTag = styled.span`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #eaeaea;
`;

const DevModeBadge = styled.span`
  background: ${props => props.$enabled ? '#f59e0b' : '#6b7280'};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 0.5rem;
`;

function GoogleSheetsConfig() {
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const [refreshResult, setRefreshResult] = useState(null);

  useEffect(() => {
    checkConnectionStatus();
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
        checkConnectionStatus();
        fetchSheets();
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
      const response = await fetch('/api/google/authorize-url');
      const data = await response.json();
      if (data.success) {
        setAuthUrl(data.data.authorizationUrl);
      }
    } catch (err) {
      console.error('Failed to fetch auth URL:', err);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/google/connection-status');
      const data = await response.json();

      if (data.success) {
        setConnectionInfo(data.data);
        setConnectionStatus(data.data.connected ? 'connected' : 'idle');
      } else {
        setError(data.error || 'Failed to check connection status');
        setConnectionStatus('error');
      }
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSheets = async () => {
    try {
      const response = await fetch('/api/google/sheets');
      const data = await response.json();

      if (data.success) {
        setSheets(data.sheets || []);
      } else {
        setError(data.error || 'Failed to fetch sheets');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setRefreshResult(null);
      setConnectionStatus('testing');

      const response = await fetch('/api/google/test-connection');
      const data = await response.json();

      if (data.success) {
        setConnectionStatus('connected');
        await checkConnectionStatus();
        await fetchSheets();
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

  const testTokenRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setRefreshResult(null);

      const response = await fetch('/api/google/test-refresh', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setRefreshResult({
          success: true,
          message: data.message,
          data: data.data
        });
        // Refresh connection status to show updated token info
        await checkConnectionStatus();
      } else {
        setError(data.error || 'Token refresh failed');
        setRefreshResult({
          success: false,
          error: data.error
        });
      }
    } catch (err) {
      setError(err.message);
      setRefreshResult({
        success: false,
        error: err.message
      });
    } finally {
      setLoading(false);
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

  const handleAuthorize = () => {
    if (authUrl) {
      window.open(authUrl, '_blank', 'width=600,height=700');
    }
  };

  const checkForOAuthResult = () => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get('google');
    const message = params.get('message');

    if (googleStatus === 'success') {
      window.history.replaceState({}, '', '/settings');
      checkConnectionStatus();
      fetchSheets();
      setError(null);
      setConnectionStatus('connected');
      alert(message || 'Google Sheets connected successfully!');
    } else if (googleStatus === 'error') {
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
          <Icon>📊</Icon>
          Google Sheets Connection
          <DevModeBadge $enabled={connectionInfo?.devMode}>
            {connectionInfo?.devMode ? 'DEV MODE' : 'PRODUCTION'}
          </DevModeBadge>
        </Title>
        <StatusBadge $status={connectionStatus}>
          {getStatusText()}
        </StatusBadge>
      </Header>

      {connectionInfo && (
        <Section>
          <SectionTitle>📊 Current Status</SectionTitle>
          <StatusGrid>
            <StatusItem>
              <StatusLabel>Connected</StatusLabel>
              <StatusValue>
                {connectionInfo.connected ? '✓ Yes' : '✗ No'}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Spreadsheet ID</StatusLabel>
              <StatusValue>
                {connectionInfo.spreadsheetId ? connectionInfo.spreadsheetId.substring(0, 12) + '...' : 'N/A'}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Available Sheets</StatusLabel>
              <StatusValue>
                {connectionInfo.availableSheets?.length || 0} configured
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Dev Mode</StatusLabel>
              <StatusValue>
                {connectionInfo.devMode ? '🧪 Enabled (writes to test sheet)' : '🌍 Production'}
              </StatusValue>
            </StatusItem>
          </StatusGrid>

          {connectionInfo.availableSheets && connectionInfo.availableSheets.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <StatusLabel>Production Sheets:</StatusLabel>
              <SheetsList>
                {connectionInfo.availableSheets.map((sheet, i) => (
                  <SheetTag key={i}>{sheet}</SheetTag>
                ))}
              </SheetsList>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#a0a0a0' }}>
                Test Sheet: <CodeBlock>{connectionInfo.testSheet}</CodeBlock>
              </div>
            </div>
          )}

          {sheets.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <StatusLabel>All Sheets in Spreadsheet:</StatusLabel>
              <SheetsList>
                {sheets.map((sheet, i) => (
                  <SheetTag key={i}>{sheet.title}</SheetTag>
                ))}
              </SheetsList>
            </div>
          )}
        </Section>
      )}

      <Section>
        <SectionTitle>🧪 Authentication & Testing</SectionTitle>
        <Button
          onClick={handleAuthorize}
          disabled={loading || !authUrl}
          style={{ marginRight: '1rem' }}
        >
          🔐 Connect Google Account
        </Button>
        <SecondaryButton
          onClick={testConnection}
          disabled={loading}
        >
          🔄 Test Connection
        </SecondaryButton>
        <SecondaryButton
          onClick={testTokenRefresh}
          disabled={loading || !connectionInfo?.connected}
        >
          🔑 Test Token Refresh
        </SecondaryButton>
        <SecondaryButton
          onClick={fetchSheets}
          disabled={loading || !connectionInfo?.connected}
        >
          📋 Refresh Sheets
        </SecondaryButton>

        {error && (
          <ErrorMessage>
            <strong>Error:</strong> {error}
          </ErrorMessage>
        )}

        {refreshResult && (
          <>
            {refreshResult.success ? (
              <SuccessMessage>
                <strong>✓ Token Refresh Test Successful!</strong><br />
                {refreshResult.message}<br />
                <small style={{ marginTop: '0.5rem', display: 'block', opacity: 0.9 }}>
                  Token changed: {refreshResult.data.tokenChanged ? '✓ Yes' : '✗ No'} |
                  Expires in: {refreshResult.data.expiresIn ? `${Math.floor(refreshResult.data.expiresIn / 60)} minutes` : 'Unknown'}
                </small>
              </SuccessMessage>
            ) : (
              <ErrorMessage>
                <strong>Token Refresh Failed:</strong> {refreshResult.error}
              </ErrorMessage>
            )}
          </>
        )}

        {connectionStatus === 'connected' && !error && (
          <SuccessMessage>
            ✓ Google Sheets connected successfully! This connection is used for Google Sheets integration only.
          </SuccessMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>📋 Setup Instructions</SectionTitle>
        <InstructionList>
          <InstructionItem>
            <strong>Enable Google Sheets API:</strong>{' '}
            Go to <Link href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</Link>, select your project, and enable the <CodeBlock>Google Sheets API</CodeBlock>.
          </InstructionItem>
          <InstructionItem>
            <strong>Create Your Spreadsheet:</strong>{' '}
            Create a new Google Sheet with tabs for each Zapier account (e.g., <CodeBlock>Sheet1</CodeBlock>, <CodeBlock>Sheet2</CodeBlock>).
          </InstructionItem>
          <InstructionItem>
            <strong>Get Spreadsheet ID:</strong>{' '}
            From the URL <CodeBlock>https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit</CodeBlock>, copy the ID and add it to your <CodeBlock>.env</CodeBlock> as <CodeBlock>GOOGLE_SHEETS_SPREADSHEET_ID</CodeBlock>.
          </InstructionItem>
          <InstructionItem>
            <strong>Configure Sheet Names:</strong>{' '}
            Add your sheet names to <CodeBlock>GOOGLE_SHEETS_TAB_NAMES</CodeBlock> (comma-separated).
          </InstructionItem>
          <InstructionItem>
            <strong>Set Up Test Sheet:</strong>{' '}
            Create a test sheet tab (e.g., <CodeBlock>tests</CodeBlock>) and set <CodeBlock>GOOGLE_SHEETS_TEST_TAB=tests</CodeBlock>.
          </InstructionItem>
          <InstructionItem>
            <strong>Enable Dev Mode:</strong>{' '}
            Set <CodeBlock>GOOGLE_SHEETS_DEV_MODE=true</CodeBlock> to route writes to the test sheet (safe for development).
          </InstructionItem>
          <InstructionItem>
            <strong>Connect Google Account:</strong>{' '}
            Click <strong>🔐 Connect Google Account</strong> to authorize the Google Sheets integration. (YouTube has its own separate connection below.)
          </InstructionItem>
        </InstructionList>
      </Section>

      <Section>
        <SectionTitle>⚠️ Important Notes</SectionTitle>
        <InstructionList>
          <InstructionItem>
            This is the <strong>Google Sheets OAuth connection</strong> - used only for Google Sheets integration.
          </InstructionItem>
          <InstructionItem>
            <strong>Dev Mode</strong> routes all writes to the test sheet - safe for development without triggering Zapier.
          </InstructionItem>
          <InstructionItem>
            The Zapier→Buffer→TikTok flow can take <strong>up to 30 minutes</strong> after a row is appended.
          </InstructionItem>
          <InstructionItem>
            Row format for Zapier: Column A = Video URL, Column B = Caption with Hashtags.
          </InstructionItem>
        </InstructionList>
      </Section>
    </Container>
  );
}

export default GoogleSheetsConfig;
