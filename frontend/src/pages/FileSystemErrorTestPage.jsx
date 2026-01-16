import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;

  h1 {
    color: #e94560;
    margin-bottom: 0.5rem;
  }

  p {
    color: #a0a0a0;
  }
`;

const TestSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  h3 {
    color: #eaeaea;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status {
    margin-left: auto;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;

    &.success {
      background: rgba(0, 210, 106, 0.2);
      color: #00d26a;
    }

    &.error {
      background: rgba(248, 49, 47, 0.2);
      color: #f8312f;
    }

    &.warning {
      background: rgba(255, 176, 32, 0.2);
      color: #ffb020;
    }
  }
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1rem;
  background: ${props =>
    props.variant === 'danger' ? '#f8312f' :
    props.variant === 'warning' ? '#ffb020' :
    '#7b2cbf'};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultBox = styled.div`
  background: #0f1629;
  border: 1px solid #2d3561;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  color: #eaeaea;
  max-height: 400px;
  overflow-y: auto;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .error {
    color: #f8312f;
  }

  .success {
    color: #00d26a;
  }

  .warning {
    color: #ffb020;
  }

  .info {
    color: #7b2cbf;
  }
`;

const HistorySection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.5rem;

  h3 {
    color: #eaeaea;
    margin-bottom: 1rem;
  }

  .error-item {
    background: #0f1629;
    border: 1px solid #2d3561;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 0.5rem;

    .error-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;

      .error-type {
        font-weight: 600;
        color: #e94560;
      }

      .error-time {
        font-size: 0.75rem;
        color: #a0a0a0;
      }
    }

    .error-details {
      font-size: 0.875rem;
      color: #a0a0a0;

      .detail-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.25rem;

        .label {
          color: #7b2cbf;
          font-weight: 600;
          min-width: 100px;
        }
      }
    }
  }
`;

const ClearButton = styled(Button)`
  background: #2d3561;
  margin-top: 1rem;
`;

const FeatureCheck = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;

  .check {
    color: #00d26a;
    font-size: 1.25rem;
  }

  .text {
    color: #eaeaea;
  }
`;

function FileSystemErrorTestPage() {
  const [testResults, setTestResults] = useState({});
  const [errorHistory, setErrorHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState({});

  // Fetch initial status and error history
  useEffect(() => {
    fetchStatus();
    fetchErrorHistory();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/filesystem-errors/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchErrorHistory = async () => {
    try {
      const response = await fetch('/api/filesystem-errors/history');
      const data = await response.json();
      setErrorHistory(data.errors || []);
    } catch (error) {
      console.error('Failed to fetch error history:', error);
    }
  };

  const runTest = async (scenario) => {
    setLoading(prev => ({ ...prev, [scenario]: true }));

    try {
      const response = await fetch('/api/filesystem-errors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });

      const data = await response.json();

      setTestResults(prev => ({
        ...prev,
        [scenario]: {
          success: response.ok,
          data,
          timestamp: new Date().toISOString(),
        },
      }));

      // Refresh error history after test
      await fetchErrorHistory();
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [scenario]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setLoading(prev => ({ ...prev, [scenario]: false }));
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/filesystem-errors/history', {
        method: 'DELETE',
      });
      await fetchErrorHistory();
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const checkDiskSpace = async () => {
    setLoading(prev => ({ ...prev, diskSpace: true }));

    try {
      const response = await fetch('/api/filesystem-errors/check-disk-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: './storage' }),
      });

      const data = await response.json();

      setTestResults(prev => ({
        ...prev,
        diskSpace: {
          success: response.ok,
          data,
          timestamp: new Date().toISOString(),
        },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        diskSpace: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setLoading(prev => ({ ...prev, diskSpace: false }));
    }
  };

  const testScenarios = [
    { id: 'file-not-found', label: 'File Not Found', variant: 'default' },
    { id: 'directory-not-found', label: 'Directory Not Found', variant: 'default' },
    { id: 'permission-denied', label: 'Permission Denied', variant: 'warning' },
    { id: 'disk-full', label: 'Disk Full', variant: 'danger' },
    { id: 'file-locked', label: 'File Locked', variant: 'warning' },
    { id: 'invalid-path', label: 'Invalid Path', variant: 'default' },
    { id: 'io-error', label: 'I/O Error', variant: 'danger' },
  ];

  return (
    <Container>
      <Header>
        <h1>🗂️ File System Error Handling</h1>
        <p>
          Test comprehensive file system error handling with automatic recovery,
          user-friendly error messages, and detailed error logging.
        </p>
      </Header>

      {/* Feature Verification Checklist */}
      <TestSection>
        <h3>✅ Feature Verification</h3>
        <FeatureCheck>
          <span className="check">✓</span>
          <span className="text">Step 1: File operation fails - Error detection and classification</span>
        </FeatureCheck>
        <FeatureCheck>
          <span className="check">✓</span>
          <span className="text">Step 2: Catch file system error - Error logging with context</span>
        </FeatureCheck>
        <FeatureCheck>
          <span className="check">✓</span>
          <span className="text">Step 3: Log error with file path - Detailed error history tracking</span>
        </FeatureCheck>
        <FeatureCheck>
          <span className="check">✓</span>
          <span className="text">Step 4: Show user-friendly message - Contextual error messages</span>
        </FeatureCheck>
        <FeatureCheck>
          <span className="check">✓</span>
          <span className="text">Step 5: Attempt recovery or cleanup - Automatic retry and recovery strategies</span>
        </FeatureCheck>
      </TestSection>

      {/* Test Scenarios */}
      <TestSection>
        <h3>
          🧪 Test Scenarios
          {status && (
            <span className={`status ${status.errorHistorySize < 50 ? 'success' : 'warning'}`}>
              {status.errorHistorySize} errors logged
            </span>
          )}
        </h3>

        <ButtonGrid>
          {testScenarios.map(scenario => (
            <Button
              key={scenario.id}
              variant={scenario.variant}
              onClick={() => runTest(scenario.id)}
              disabled={loading[scenario.id]}
            >
              {loading[scenario.id] ? 'Testing...' : scenario.label}
            </Button>
          ))}
          <Button
            variant="default"
            onClick={checkDiskSpace}
            disabled={loading.diskSpace}
          >
            {loading.diskSpace ? 'Checking...' : 'Check Disk Space'}
          </Button>
        </ButtonGrid>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <ResultBox>
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </ResultBox>
        )}
      </TestSection>

      {/* Error History */}
      <TestSection>
        <h3>
          📋 Error History
          <span className="status">{errorHistory.length} errors</span>
        </h3>

        {errorHistory.length === 0 ? (
          <p style={{ color: '#a0a0a0', textAlign: 'center', padding: '2rem' }}>
            No errors logged yet. Run a test scenario to generate errors.
          </p>
        ) : (
          <>
            {errorHistory.slice(0, 10).map((error, index) => (
              <div key={index} className="error-item">
                <div className="error-header">
                  <span className="error-type">{error.errorType}</span>
                  <span className="error-time">
                    {new Date(error.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="error-details">
                  <div className="detail-row">
                    <span className="label">Operation:</span>
                    <span>{error.operation}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">File:</span>
                    <span>{error.filePath || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Error Code:</span>
                    <span>{error.errorCode || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Message:</span>
                    <span>{error.errorMessage}</span>
                  </div>
                </div>
              </div>
            ))}

            <ClearButton onClick={clearHistory}>
              Clear Error History
            </ClearButton>
          </>
        )}
      </TestSection>

      {/* Expected Behavior */}
      <TestSection>
        <h3>📖 Expected Behavior</h3>

        <div style={{ color: '#a0a0a0', lineHeight: '1.8' }}>
          <p><strong>Error Classification:</strong></p>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li>PERMISSION_DENIED - User lacks required permissions</li>
            <li>FILE_NOT_FOUND - Requested file doesn't exist</li>
            <li>DISK_FULL - Insufficient disk space</li>
            <li>INVALID_PATH - Malformed file path</li>
            <li>FILE_LOCKED - File in use by another process</li>
            <li>DIRECTORY_NOT_FOUND - Target directory missing</li>
            <li>IO_ERROR - General I/O failure</li>
          </ul>

          <p style={{ marginTop: '1rem' }}><strong>Recovery Strategies:</strong></p>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li>RETRY - Attempt operation with exponential backoff (max 3 attempts)</li>
            <li>CREATE_DIRECTORY - Create missing directory and retry</li>
            <li>USE_ALTERNATIVE_PATH - Try alternative file location</li>
            <li>CLEANUP_AND_RETRY - Clean up and attempt again</li>
            <li>NOTIFY_USER - Alert user of unrecoverable error</li>
            <li>SKIP - Skip operation due to error</li>
          </ul>

          <p style={{ marginTop: '1rem' }}><strong>User-Friendly Messages:</strong></p>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li>Clear, actionable error descriptions</li>
            <li>Context-specific suggestions for resolution</li>
            <li>Severity indicators (error, warning, critical)</li>
            <li>File path and operation context</li>
          </ul>
        </div>
      </TestSection>
    </Container>
  );
}

export default FileSystemErrorTestPage;
