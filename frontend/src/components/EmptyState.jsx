import React from 'react';
import styled from 'styled-components';

const EmptyStateContainer = styled.div.withConfig({
  shouldForwardProp: (prop) =>
    !['$size', '$centered'].includes(prop)
})`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$centered ? 'center' : 'flex-start'};
  justify-content: center;
  padding: ${props => {
    switch (props.$size) {
      case 'small':
        return '2rem 1rem';
      case 'large':
        return '6rem 2rem';
      default:
        return '3rem 1.5rem';
    }
  }};
  text-align: ${props => props.$centered ? 'center' : 'left'};
  gap: 1rem;
  min-height: ${props => {
    switch (props.$size) {
      case 'small':
        return '200px';
      case 'large':
        return '500px';
      default:
        return '300px';
    }
  }};
`;

const IconContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$size'
})`
  font-size: ${props => {
    switch (props.$size) {
      case 'small':
        return '2.5rem';
      case 'large':
        return '6rem';
      default:
        return '4rem';
    }
  }};
  margin-bottom: 0.5rem;
  opacity: 0.6;
  transition: opacity 0.3s, transform 0.3s;

  ${EmptyStateContainer}:hover & {
    opacity: 0.8;
    transform: scale(1.05);
  }
`;

const IllustrationContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$size'
})`
  width: ${props => {
    switch (props.$size) {
      case 'small':
        return '80px';
      case 'large':
        return '200px';
      default:
        return '120px';
    }
  }};
  height: ${props => {
    switch (props.$size) {
      case 'small':
        return '80px';
      case 'large':
        return '200px';
      default:
        return '120px';
    }
  }};
  margin-bottom: 1rem;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.1), rgba(123, 44, 191, 0.1));
  border-radius: 50%;
`;

const Title = styled.h3.withConfig({
  shouldForwardProp: (prop) => prop !== '$size'
})`
  font-size: ${props => {
    switch (props.$size) {
      case 'small':
        return '1rem';
      case 'large':
        return '1.75rem';
      default:
        return '1.25rem';
    }
  }};
  font-weight: 600;
  color: #eaeaea;
  margin: 0;
  line-height: 1.4;
`;

const Message = styled.p.withConfig({
  shouldForwardProp: (prop) => prop !== '$size'
})`
  font-size: ${props => {
    switch (props.$size) {
      case 'small':
        return '0.875rem';
      case 'large':
        return '1.125rem';
      default:
        return '1rem';
    }
  }};
  color: #a0a0a0;
  margin: 0;
  max-width: ${props => props.$centered ? '500px' : '100%'};
  line-height: 1.6;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  justify-content: ${props => props.$centered ? 'center' : 'flex-start'};
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})`
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #e94560, #7b2cbf);
          color: white;
          border: none;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
          }
        `;
      case 'secondary':
        return `
          background: transparent;
          color: #e94560;
          border: 2px solid #e94560;
          &:hover {
            background: rgba(233, 69, 96, 0.1);
          }
        `;
      default:
        return `
          background: rgba(233, 69, 96, 0.1);
          color: #e94560;
          border: none;
          &:hover {
            background: rgba(233, 69, 96, 0.2);
          }
        `;
    }
  }}

  &:focus {
    outline: 2px solid #e94560;
    outline-offset: 2px;
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// SVG Illustrations
const Illustrations = {
  noData: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="No data icon">
      <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Search icon">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Folder icon">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Calendar icon">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Inbox icon">
      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chart icon">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  robot: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot icon">
      <path d="M9 3v1m6-1v1M9 20v1m6-1v1M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h.01M15 9h.01M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Star icon">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

/**
 * EmptyState Component
 *
 * Displays helpful empty states when no data is available
 *
 * @param {Object} props
 * @param {string} props.icon - Icon name (search, folder, calendar, inbox, chart, robot, rocket, noData)
 * @param {string} props.illustration - Custom illustration SVG component
 * @param {string} props.title - Main heading text
 * @param {string} props.message - Descriptive message
 * @param {Array} props.actions - Array of action buttons [{label, onClick, variant}]
 * @param {string} props.size - Size variant (small, medium, large)
 * @param {boolean} props.centered - Whether to center content
 * @param {React.ReactNode} props.children - Custom content to display
 */
const EmptyState = ({
  icon = 'noData',
  illustration = null,
  title = 'No Data Found',
  message = 'There is no data to display at this time.',
  actions = [],
  size = 'medium',
  centered = true,
  children
}) => {
  const iconContent = illustration || Illustrations[icon] || Illustrations.noData;

  return (
    <EmptyStateContainer $size={size} $centered={centered}>
      {icon && (
        <IconContainer $size={size}>
          {typeof iconContent === 'string' ? (
            <IllustrationContainer $size={size}>
              {iconContent}
            </IllustrationContainer>
          ) : (
            iconContent
          )}
        </IconContainer>
      )}
      {title && <Title $size={size}>{title}</Title>}
      {message && <Message $size={size}>{message}</Message>}
      {children}
      {actions.length > 0 && (
        <ActionsContainer $centered={centered}>
          {actions.map((action, index) => (
            <ActionButton
              key={index}
              variant={action.variant || 'default'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </ActionButton>
          ))}
        </ActionsContainer>
      )}
    </EmptyStateContainer>
  );
};

export default EmptyState;
