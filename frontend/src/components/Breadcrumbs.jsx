import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';

const BreadcrumbsContainer = styled.nav`
  padding: ${cssVar('--spacing-md')} 0;
  margin-bottom: ${cssVar('--spacing-md')};
`;

const BreadcrumbsList = styled.ol`
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: ${cssVar('--spacing-xs')};
  align-items: center;
`;

const BreadcrumbItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${cssVar('--spacing-xs')};
  font-size: ${cssVar('--font-size-sm')};
`;

const BreadcrumbLink = styled(Link)`
  color: ${props => props.$isCurrent
    ? cssVar('--color-text')
    : cssVar('--color-primary')};
  text-decoration: none;
  font-weight: ${props => props.$isCurrent ? '600' : '500'};
  cursor: ${props => props.$isCurrent ? 'default' : 'pointer'};
  transition: color ${cssVar('--transition-base')};

  &:hover {
    color: ${props => props.$isCurrent
      ? cssVar('--color-text')
      : cssVar('--color-primary-hover')};
  }

  ${props => props.$isCurrent && `
    pointer-events: none;
  `}
`;

const BreadcrumbSeparator = styled.span`
  color: ${cssVar('--color-text-secondary')};
  font-size: ${cssVar('--font-size-xs')};
  user-select: none;
`;

const BreadcrumbIcon = styled.span`
  margin-right: ${cssVar('--spacing-xs')};
  font-size: ${cssVar('--font-size-sm')};
`;

// Route configuration with labels and optional icons
const routeConfig = {
  '/': { label: 'Home', icon: '🏠' },
  '/dashboard': { label: 'Dashboard', icon: '📊' },
  '/dashboard/strategic': { label: 'Strategic', icon: '📈' },
  '/content': { label: 'Content', icon: '📝' },
  '/content/library': { label: 'Library', icon: '📚' },
  '/content/approval': { label: 'Approvals', icon: '✅' },
  '/chat': { label: 'AI Chat', icon: '🤖' },
  '/ads': { label: 'Ads', icon: '📢' },
  '/ads/campaigns': { label: 'Campaigns', icon: '📢' },
  '/ads/revenue-test': { label: 'Revenue Test', icon: '💰' },
  '/revenue': { label: 'Revenue', icon: '💰' },
  '/revenue/weekly': { label: 'Weekly', icon: '📅' },
  '/todos': { label: 'Todos', icon: '✅' },
  '/settings': { label: 'Settings', icon: '⚙️' },
  '/test': { label: 'Test', icon: '🧪' },
  '/test/toasts': { label: 'Toast Test', icon: '🍞' },
  '/test/modals': { label: 'Modal Demo', icon: '🪟' },
  '/test/tabs': { label: 'Tabs Demo', icon: '📑' },
};

// Generate breadcrumbs from current location
function generateBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);

  // Always start with Home
  const breadcrumbs = [
    { path: '/', label: routeConfig['/'].label, icon: routeConfig['/'].icon }
  ];

  // Build up the path segment by segment
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Check if this exact path is in our config
    if (routeConfig[currentPath]) {
      breadcrumbs.push({
        path: currentPath,
        label: routeConfig[currentPath].label,
        icon: routeConfig[currentPath].icon
      });
    } else {
      // For dynamic paths or paths not in config, capitalize the segment
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        path: currentPath,
        label: label,
        icon: null
      });
    }
  });

  return breadcrumbs;
}

function Breadcrumbs({ separator = '/', showIcons = true, maxItems = 4 }) {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show breadcrumbs on the home page
  if (pathname === '/') {
    return null;
  }

  const breadcrumbs = generateBreadcrumbs(pathname);

  // If too many breadcrumbs, show only the first, ellipsis, and last 2
  const displayBreadcrumbs = breadcrumbs.length > maxItems
    ? [
        breadcrumbs[0], // Home
        { ...breadcrumbs[breadcrumbs.length - 2], isOverflow: true }, // Second to last with ellipsis
        breadcrumbs[breadcrumbs.length - 1] // Last
      ]
    : breadcrumbs;

  return (
    <BreadcrumbsContainer aria-label="Breadcrumb navigation">
      <BreadcrumbsList>
        {displayBreadcrumbs.map((crumb, index) => {
          const isCurrent = index === displayBreadcrumbs.length - 1;
          const showSeparator = index < displayBreadcrumbs.length - 1;

          return (
            <BreadcrumbItem key={crumb.path}>
              {crumb.isOverflow && (
                <BreadcrumbSeparator aria-hidden="true">...</BreadcrumbSeparator>
              )}

              <BreadcrumbLink
                to={crumb.path}
                $isCurrent={isCurrent}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {showIcons && crumb.icon && (
                  <BreadcrumbIcon aria-hidden="true">{crumb.icon}</BreadcrumbIcon>
                )}
                {crumb.label}
              </BreadcrumbLink>

              {showSeparator && !crumb.isOverflow && (
                <BreadcrumbSeparator aria-hidden="true">{separator}</BreadcrumbSeparator>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbsList>
    </BreadcrumbsContainer>
  );
}

export default Breadcrumbs;
