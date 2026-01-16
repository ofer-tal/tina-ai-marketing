/**
 * Error Test Page
 * Page to test user-friendly error messages
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import ApiErrorAlert from '../components/ApiErrorAlert';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.h1`
  font-size: 2rem;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const PageDescription = styled.p`
  color: #a0a0a0;
  margin-bottom: 2rem;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const TestButton = styled.button`
  padding: 0.75rem 1rem;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 6px;
  color: #e94560;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(233, 69, 96, 0.2);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &.${props => props.$active} {
    background: #e94560;
    color: #ffffff;
  }
`;

const ErrorDisplay = styled.div`
  margin-top: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #808080;
  font-style: italic;
`;

const testCases = [
  { id: 'network', label: 'Network Error', endpoint: '/api/test-errors/network' },
  { id: 'timeout', label: 'Timeout Error', endpoint: '/api/test-errors/timeout' },
  { id: 'auth', label: 'Authentication Error', endpoint: '/api/test-errors/auth' },
  { id: 'rate-limit', label: 'Rate Limit Error', endpoint: '/api/test-errors/rate-limit' },
  { id: 'database', label: 'Database Error', endpoint: '/api/test-errors/database' },
  { id: 'validation', label: 'Validation Error', endpoint: '/api/test-errors/validation' },
  { id: 'not-found', label: 'Not Found Error', endpoint: '/api/test-errors/not-found' },
  { id: 'content-generation', label: 'Content Generation Error', endpoint: '/api/test-errors/content-generation' },
  { id: 'tiktok-post', label: 'TikTok Post Error', endpoint: '/api/test-errors/tiktok-post' },
  { id: 'budget', label: 'Budget Error', endpoint: '/api/test-errors/budget' },
  { id: 'unknown', label: 'Unknown Error', endpoint: '/api/test-errors/unknown' },
  { id: 'async', label: 'Async Error', endpoint: '/api/test-errors/async' }
];

const ErrorTestPage = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(null);
  const [activeTest, setActiveTest] = useState(null);

  const triggerError = async (testCase) => {
    setActiveTest(testCase.id);
    setLoading(testCase.id);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001${testCase.endpoint}`);

      // The request should fail and throw an error
      if (!response.ok) {
        const data = await response.json();
        throw data; // Throw the error response
      }

      // If we get here, something unexpected happened
      setError({
        error: 'Expected an error but request succeeded',
        action: 'This test endpoint should always return an error',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      // Set the error (either from response or network error)
      setError(err);
    } finally {
      setLoading(null);
    }
  };

  const handleRetry = () => {
    if (activeTest) {
      const testCase = testCases.find(tc => tc.id === activeTest);
      if (testCase) {
        triggerError(testCase);
      }
    }
  };

  const handleDismiss = () => {
    setError(null);
    setActiveTest(null);
  };

  return (
    <PageContainer>
      <PageHeader>🧪 Error Message Testing</PageHeader>
      <PageDescription>
        Test user-friendly error messages for different error types.
        Click any button below to simulate an error and see how it's displayed.
      </PageDescription>

      <ButtonGrid>
        {testCases.map((testCase) => (
          <TestButton
            key={testCase.id}
            onClick={() => triggerError(testCase)}
            disabled={loading !== null}
            $active={activeTest === testCase.id}
          >
            {loading === testCase.id ? '⏳ Loading...' : `🔴 ${testCase.label}`}
          </TestButton>
        ))}
      </ButtonGrid>

      <ErrorDisplay>
        {error ? (
          <ApiErrorAlert
            error={error}
            onDismiss={handleDismiss}
            onRetry={handleRetry}
            showTechnicalDetails={true}
          />
        ) : (
          <EmptyState>
            Click a button above to test error messages
          </EmptyState>
        )}
      </ErrorDisplay>
    </PageContainer>
  );
};

export default ErrorTestPage;
