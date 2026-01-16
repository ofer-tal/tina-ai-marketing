import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { cssVar } from '../themeUtils';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: ${cssVar('--spacing-xl')};
`;

const ErrorCode = styled.h1`
  font-size: 8rem;
  font-weight: 700;
  margin: 0;
  background: ${cssVar('--gradient-primary')};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
`;

const Title = styled.h2`
  font-size: ${cssVar('--font-size-3xl')};
  margin: ${cssVar('--spacing-lg')} 0 ${cssVar('--spacing-md')} 0;
  color: ${cssVar('--color-text')};
`;

const Message = styled.p`
  font-size: ${cssVar('--font-size-lg')};
  color: ${cssVar('--color-text-secondary')};
  margin-bottom: ${cssVar('--spacing-xl')};
  max-width: 500px;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${cssVar('--spacing-md')};
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled(Link)`
  padding: 0.875rem 2rem;
  background: ${props => props.$primary ? cssVar('--color-primary') : cssVar('--color-surface')};
  border: 2px solid ${props => props.$primary ? cssVar('--color-primary') : cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  color: ${props => props.$primary ? 'white' : cssVar('--color-text')};
  text-decoration: none;
  font-weight: 600;
  transition: all ${cssVar('--transition-base')};
  display: inline-flex;
  align-items: center;
  gap: ${cssVar('--spacing-sm')};

  &:hover {
    background: ${props => props.$primary ? cssVar('--color-primary-hover') : cssVar('--color-primary')};
    border-color: ${props => props.$primary ? cssVar('--color-primary-hover') : cssVar('--color-primary')};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Icon = styled.span`
  font-size: 1.2rem;
`;

const SuggestionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${cssVar('--spacing-xl')} 0 0 0;
  text-align: left;
  max-width: 400px;
`;

const SuggestionItem = styled.li`
  margin-bottom: ${cssVar('--spacing-sm')};
  color: ${cssVar('--color-text-secondary')};

  &::before {
    content: '→';
    color: ${cssVar('--color-primary')};
    margin-right: ${cssVar('--spacing-sm')};
    font-weight: bold;
  }
`;

const SuggestionLink = styled(Link)`
  color: ${cssVar('--color-text')};
  text-decoration: none;
  font-weight: 500;
  transition: color ${cssVar('--transition-base')};

  &:hover {
    color: ${cssVar('--color-primary')};
  }
`;

function NotFound() {
  // Common pages that users might be looking for
  const commonPages = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/content/library', label: 'Content Library' },
    { path: '/content/approval', label: 'Approvals' },
    { path: '/chat', label: 'AI Chat' },
    { path: '/ads/campaigns', label: 'Campaigns' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <NotFoundContainer>
      <ErrorCode>404</ErrorCode>
      <Title>Page Not Found</Title>
      <Message>
        Oops! The page you're looking for doesn't exist. It might have been moved,
        deleted, or perhaps you mistyped the URL.
      </Message>

      <ButtonGroup>
        <Button to="/" $primary={true}>
          <Icon>🏠</Icon>
          Go Home
        </Button>
        <Button to="/dashboard" $primary={false}>
          <Icon>📊</Icon>
          Dashboard
        </Button>
      </ButtonGroup>

      <SuggestionList>
        <SuggestionItem>
          <SuggestionLink to="/dashboard">View Dashboard</SuggestionLink>
        </SuggestionItem>
        <SuggestionItem>
          <SuggestionLink to="/content/library">Browse Content Library</SuggestionLink>
        </SuggestionItem>
        <SuggestionItem>
          <SuggestionLink to="/content/approval">Review Pending Approvals</SuggestionLink>
        </SuggestionItem>
        <SuggestionItem>
          <SuggestionLink to="/chat">Chat with AI Assistant</SuggestionLink>
        </SuggestionItem>
        <SuggestionItem>
          <SuggestionLink to="/settings">Configure Settings</SuggestionLink>
        </SuggestionItem>
      </SuggestionList>
    </NotFoundContainer>
  );
}

export default NotFound;
