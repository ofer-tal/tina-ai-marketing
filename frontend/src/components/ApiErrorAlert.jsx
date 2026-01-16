/**
 * ApiErrorAlert Component
 *
 * Displays user-friendly error messages from API errors
 * Maps technical error responses to helpful messages with action suggestions
 *
 * Props:
 * - error: Error object from API response { error, action, technicalDetails, supportLink, timestamp }
 * - onDismiss: Optional callback when dismiss button clicked
 * - showTechnicalDetails: Whether to show technical error details (default: false, true in dev)
 * - onRetry: Optional retry callback
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import ErrorAlert from './ErrorAlert';

const ErrorDetails = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const TechnicalDetails = styled.details`
  margin-top: 0.5rem;

  summary {
    cursor: pointer;
    color: #a0a0a0;
    font-size: 0.875rem;
    user-select: none;

    &:hover {
      color: #eaeaea;
    }

    &::-webkit-details-marker {
      margin-right: 0.5rem;
    }
  }

  div {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: #ff6b6b;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

const Timestamp = styled.div`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #808080;
`;

const SupportLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;

  &:hover {
    color: #60a5fa;
    text-decoration: underline;
  }

  &::before {
    content: '🔗';
  }
`;

const ApiErrorAlert = ({
  error,
  onDismiss,
  showTechnicalDetails = false,
  onRetry = null
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // If no error object provided, don't render
  if (!error) {
    return null;
  }

  // Handle different error formats
  const errorMessage = error.error || error.message || 'An unexpected error occurred';
  const action = error.action || 'Please try again. If the problem persists, contact support.';
  const technicalDetails = error.technicalDetails || error.details || error.stack;
  const supportLink = error.supportLink;
  const timestamp = error.timestamp || new Date().toISOString();
  const requestId = error.requestId;

  // Determine alert type based on error
  const getAlertType = () => {
    const msg = errorMessage.toLowerCase();

    if (msg.includes('timeout') || msg.includes('temporarily')) {
      return 'warning';
    }
    if (msg.includes('not found') || msg.includes('invalid')) {
      return 'warning';
    }
    if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('authentication')) {
      return 'warning';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'warning';
    }

    return 'error';
  };

  const alertType = getAlertType();

  // Build actions array
  const actions = [];

  if (onRetry) {
    actions.push({
      label: 'Try Again',
      onClick: onRetry,
      variant: 'primary'
    });
  }

  // Add "View Settings" action for authentication/credential errors
  const errorMsgLower = errorMessage.toLowerCase();
  if (errorMsgLower.includes('credentials') ||
      errorMsgLower.includes('authentication') ||
      errorMsgLower.includes('api key') ||
      errorMsgLower.includes('unauthorized')) {
    actions.push({
      label: 'View Settings',
      onClick: () => {
        window.location.href = '/settings';
      },
      variant: 'secondary'
    });
  }

  return (
    <ErrorAlert
      type={alertType}
      title="Error"
      message={errorMessage}
      helpText={action}
      onDismiss={onDismiss}
      actions={actions}
      dismissible={!!onDismiss}
    >
      <ErrorDetails>
        {supportLink && (
          <SupportLink
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Help & Support
          </SupportLink>
        )}

        {(showTechnicalDetails || process.env.NODE_ENV === 'development') && technicalDetails && (
          <TechnicalDetails
            open={showDetails}
            onToggle={(e) => {
              setShowDetails(e.target.open);
            }}
          >
            <summary>Technical Details (for debugging)</summary>
            <div>
              {technicalDetails}
              {requestId && `\n\nRequest ID: ${requestId}`}
            </div>
          </TechnicalDetails>
        )}

        <Timestamp>
          Error occurred: {new Date(timestamp).toLocaleString()}
        </Timestamp>
      </ErrorDetails>
    </ErrorAlert>
  );
};

export default ApiErrorAlert;
