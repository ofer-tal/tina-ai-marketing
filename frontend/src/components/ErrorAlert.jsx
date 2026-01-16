/**
 * ErrorAlert Component
 *
 * A reusable error/alert component for displaying user-friendly error messages
 * with different severity levels, helpful text, and dismissal capability.
 *
 * Props:
 * - type: 'error' | 'warning' | 'info' | 'success'
 * - title: Brief title/headline for the alert
 * - message: Detailed error message
 * - onDismiss: Optional callback when dismiss button clicked
 * - actions: Optional array of action buttons {label, onClick, variant}
 * - dismissible: Whether to show dismiss button (default: true)
 */

import React from 'react';
import styled from 'styled-components';

const AlertContainer = styled.div`
  background: ${props => {
    switch (props.$type) {
      case 'error':
        return 'rgba(248, 49, 47, 0.1)';
      case 'warning':
        return 'rgba(255, 176, 32, 0.1)';
      case 'info':
        return 'rgba(59, 130, 246, 0.1)';
      case 'success':
        return 'rgba(0, 210, 106, 0.1)';
      default:
        return 'rgba(248, 49, 47, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'error':
        return '#f8312f';
      case 'warning':
        return '#ffb020';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#00d26a';
      default:
        return '#f8312f';
    }
  }};
  border-left: 4px solid ${props => {
    switch (props.$type) {
      case 'error':
        return '#f8312f';
      case 'warning':
        return '#ffb020';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#00d26a';
      default:
        return '#f8312f';
    }
  }};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const AlertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const AlertIcon = styled.span`
  font-size: 1.25rem;
  margin-right: 0.5rem;
  line-height: 1;
`;

const AlertTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
`;

const AlertTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => {
    switch (props.$type) {
      case 'error':
        return '#f8312f';
      case 'warning':
        return '#ffb020';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#00d26a';
      default:
        return '#f8312f';
    }
  }};
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$type === 'error' ? '#f8312f' : '#a0a0a0'};
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${props => {
      switch (props.$type) {
        case 'error':
          return '#e02c2a';
        case 'warning':
          return '#e6a21c';
        case 'info':
          return '#2563eb';
        case 'success':
          return '#00b85d';
        default:
          return '#e02c2a';
      }
    }};
  }
`;

const AlertMessage = styled.p`
  margin: 0;
  color: #eaeaea;
  line-height: 1.5;
  font-size: 0.95rem;
`;

const AlertHelpText = styled.p`
  margin: 0.5rem 0 0 0;
  color: #a0a0a0;
  font-size: 0.875rem;
  line-height: 1.4;
  font-style: italic;
`;

const AlertActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;

  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: #e94560;
          border-color: #e94560;
          color: #ffffff;
          &:hover {
            background: #d63d56;
            border-color: #d63d56;
          }
        `;
      case 'secondary':
        return `
          background: transparent;
          border-color: #e94560;
          color: #e94560;
          &:hover {
            background: rgba(233, 69, 96, 0.1);
          }
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #eaeaea;
          &:hover {
            background: rgba(255, 255, 255, 0.15);
          }
        `;
    }
  }}
`;

// Helper function to get icon for alert type
const getAlertIcon = (type) => {
  switch (type) {
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'success':
      return '✅';
    default:
      return '❌';
  }
};

const ErrorAlert = ({
  type = 'error',
  title,
  message,
  helpText,
  onDismiss,
  actions = [],
  dismissible = true
}) => {
  // If no title provided, use default based on type
  const displayTitle = title || (
    type === 'error' ? 'Error' :
    type === 'warning' ? 'Warning' :
    type === 'info' ? 'Information' :
    type === 'success' ? 'Success' :
    'Alert'
  );

  return (
    <AlertContainer $type={type} role="alert" aria-live="assertive" aria-atomic="true">
      <AlertHeader>
        <AlertTitleRow>
          <AlertIcon aria-hidden="true">{getAlertIcon(type)}</AlertIcon>
          <AlertTitle $type={type}>{displayTitle}</AlertTitle>
        </AlertTitleRow>
        {dismissible && (
          <DismissButton
            $type={type}
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            ×
          </DismissButton>
        )}
      </AlertHeader>

      {message && (
        <AlertMessage>{message}</AlertMessage>
      )}

      {helpText && (
        <AlertHelpText>{helpText}</AlertHelpText>
      )}

      {actions.length > 0 && (
        <AlertActions>
          {actions.map((action, index) => (
            <ActionButton
              key={index}
              $variant={action.variant || 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </ActionButton>
          ))}
        </AlertActions>
      )}
    </AlertContainer>
  );
};

export default ErrorAlert;
