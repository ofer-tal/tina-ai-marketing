import React, { useState, useEffect, Children, cloneElement, isValidElement } from 'react';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';

// Styled components for Tabs
const TabsContainer = styled.div`
  width: 100%;
`;

const TabsList = styled.div`
  display: flex;
  gap: ${cssVar('--spacing-sm')};
  border-bottom: 2px solid ${cssVar('--color-border')};
  margin-bottom: ${cssVar('--spacing-lg')};
  overflow-x: auto;
  overflow-y: hidden;

  /* Hide scrollbar but keep functionality */
  scrollbar-width: thin;
  scrollbar-color: ${cssVar('--color-border')} transparent;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${cssVar('--color-border')};
    border-radius: 2px;
  }
`;

const TabButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${props => props.$active ? cssVar('--color-primary') : 'transparent'};
  color: ${props => props.$active ? cssVar('--color-primary') : cssVar('--color-text-secondary')};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 1rem;
  cursor: pointer;
  transition: all ${cssVar('--transition-base')};
  white-space: nowrap;
  position: relative;
  outline: none;

  &:hover:not(:disabled) {
    color: ${cssVar('--color-primary-hover')};
    background: ${cssVar('--color-surface')};
  }

  &:focus-visible {
    border-radius: ${cssVar('--radius-sm')} ${cssVar('--radius-sm')} 0 0;
    background: ${cssVar('--color-surface')};
    box-shadow: 0 0 0 2px ${cssVar('--color-primary')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Tab indicator (optional badge/count) */
  .tab-indicator {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: ${cssVar('--color-primary')};
    color: white;
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    font-weight: 600;
  }
`;

const TabPanel = styled.div`
  display: ${props => props.$active ? 'block' : 'none'};
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Add padding if not specified */
  &:empty {
    padding: ${cssVar('--spacing-xl')};
    text-align: center;
    color: ${cssVar('--color-text-secondary')};
  }
`;

/**
 * Tabs Component - Main container
 *
 * @param {string} defaultTab - The default active tab ID
 * @param {string} storageKey - Optional localStorage key for persistence
 * @param {Function} onChange - Callback when tab changes (tabId) => void
 * @param {ReactNode} children - TabItem components
 *
 * @example
 * <Tabs defaultTab="tab1" storageKey="my-tabs" onChange={(id) => console.log(id)}>
 *   <TabItem id="tab1" label="Overview" indicator="3">
 *     <div>Overview content</div>
 *   </TabItem>
 *   <TabItem id="tab2" label="Details">
 *     <div>Details content</div>
 *   </TabItem>
 * </Tabs>
 */
function Tabs({ children, defaultTab, storageKey, onChange }) {
  // Get tab IDs from children
  const tabIds = Children.toArray(children)
    .filter(child => isValidElement(child) && child.type === TabItem)
    .map(child => child.props.id);

  // Initialize active tab from defaultTab or localStorage
  const [activeTab, setActiveTab] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved && tabIds.includes(saved)) {
        return saved;
      }
    }
    return defaultTab || tabIds[0];
  });

  // Persist to localStorage when tab changes
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab, storageKey]);

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, currentIndex) => {
    const tabCount = tabIds.length;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabCount) % tabCount;
        handleTabChange(tabIds[prevIndex]);
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabCount;
        handleTabChange(tabIds[nextIndex]);
        break;
      case 'Home':
        e.preventDefault();
        handleTabChange(tabIds[0]);
        break;
      case 'End':
        e.preventDefault();
        handleTabChange(tabIds[tabCount - 1]);
        break;
      default:
        break;
    }
  };

  return (
    <TabsContainer role="tablist">
      <TabsList role="tablist">
        {Children.map(children, (child, index) => {
          if (!isValidElement(child) || child.type !== TabItem) {
            return null;
          }

          const tabId = child.props.id;
          const isActive = tabId === activeTab;
          const tabIndex = isActive ? 0 : -1;

          return (
            <TabButton
              key={tabId}
              id={`tab-${tabId}`}
              $active={isActive}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tabId}`}
              tabIndex={tabIndex}
              onClick={() => handleTabChange(tabId)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {child.props.label}
              {child.props.indicator && (
                <span className="tab-indicator">{child.props.indicator}</span>
              )}
            </TabButton>
          );
        })}
      </TabsList>

      {Children.map(children, (child) => {
        if (!isValidElement(child) || child.type !== TabItem) {
          return null;
        }

        const tabId = child.props.id;
        const isActive = tabId === activeTab;

        return (
          <TabPanel
            key={tabId}
            id={`panel-${tabId}`}
            $active={isActive}
            role="tabpanel"
            aria-labelledby={`tab-${tabId}`}
            hidden={!isActive}
          >
            {child.props.children}
          </TabPanel>
        );
      })}
    </TabsContainer>
  );
}

/**
 * TabItem Component - Individual tab
 *
 * @param {string} id - Unique identifier for the tab
 * @param {string} label - Display label for the tab button
 * @param {string|number} indicator - Optional badge/count to show on tab
 * @param {boolean} disabled - Whether the tab is disabled
 * @param {ReactNode} children - Content to display when tab is active
 *
 * @example
 * <TabItem id="tab1" label="Overview" indicator="3">
 *   <div>Content here</div>
 * </TabItem>
 */
function TabItem({ id, label, indicator, disabled, children }) {
  // This component doesn't render anything directly
  // It's used as a declarative API for the parent Tabs component
  return null;
}

// Export both components
Tabs.Item = TabItem;

export default Tabs;
