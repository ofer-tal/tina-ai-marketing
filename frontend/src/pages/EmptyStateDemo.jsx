import React, { useState } from 'react';
import styled from 'styled-components';
import EmptyState from '../components/EmptyState';

const DemoContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const DemoSection = styled.section`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: #eaeaea;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e94560;
`;

const DemoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const DemoCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  color: #7b2cbf;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const FullWidthDemo = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 0.625rem 1.25rem;
  background: ${props => props.$active ? 'linear-gradient(135deg, #e94560, #7b2cbf)' : 'rgba(233, 69, 96, 0.1)'};
  color: #eaeaea;
  border: 2px solid #e94560;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: rgba(233, 69, 96, 0.2);
    transform: translateY(-1px);
  }
`;

const EmptyStateDemo = () => {
  const [currentDemo, setCurrentDemo] = useState('all');

  const handleAction = (actionName) => {
    alert(`Action clicked: ${actionName}`);
  };

  const demos = {
    // Basic Empty States
    noData: {
      title: 'No Data Found',
      message: 'There are no items to display at this time.',
      icon: 'noData',
      size: 'medium'
    },
    noSearchResults: {
      title: 'No Results Found',
      message: 'We couldn\'t find anything matching your search query. Try adjusting your filters or search terms.',
      icon: 'search',
      size: 'medium'
    },
    noCampaigns: {
      title: 'No Campaigns Yet',
      message: 'You haven\'t created any marketing campaigns yet. Start your first campaign to reach more customers!',
      icon: 'rocket',
      size: 'large',
      actions: [
        { label: 'Create Campaign', onClick: () => handleAction('create'), variant: 'primary', icon: '🚀' },
        { label: 'Learn More', onClick: () => handleAction('learn'), variant: 'secondary' }
      ]
    },
    noPosts: {
      title: 'No Scheduled Posts',
      message: 'Your content calendar is empty. Generate some engaging content to keep your audience interested!',
      icon: 'calendar',
      size: 'medium',
      actions: [
        { label: 'Generate Content', onClick: () => handleAction('generate'), variant: 'primary' },
        { label: 'View Library', onClick: () => handleAction('library'), variant: 'default' }
      ]
    },
    noNotifications: {
      title: 'All Caught Up!',
      message: 'You have no new notifications. Check back later for updates.',
      icon: 'inbox',
      size: 'small'
    },
    noAnalytics: {
      title: 'No Analytics Data',
      message: 'Analytics data will appear here once you start generating traffic and engagement.',
      icon: 'chart',
      size: 'medium',
      actions: [
        { label: 'Start Campaign', onClick: () => handleAction('start'), variant: 'primary' }
      ]
    },

    // Size Variants
    small: {
      title: 'No Items',
      message: 'Small empty state for compact spaces.',
      icon: 'folder',
      size: 'small'
    },
    medium: {
      title: 'No Items',
      message: 'Medium empty state for standard use cases.',
      icon: 'folder',
      size: 'medium'
    },
    large: {
      title: 'No Items',
      message: 'Large empty state for prominent displays with more visual emphasis.',
      icon: 'folder',
      size: 'large'
    },

    // Alignment Variants
    leftAligned: {
      title: 'Left Aligned Empty State',
      message: 'This empty state is aligned to the left, which works well in cards and sidebars.',
      icon: 'robot',
      size: 'medium',
      centered: false
    },

    // Multiple Actions
    multipleActions: {
      title: 'Setup Required',
      message: 'Before you can use this feature, you need to complete some setup steps.',
      icon: 'rocket',
      size: 'large',
      actions: [
        { label: '🔧 Configure', onClick: () => handleAction('configure'), variant: 'primary' },
        { label: '📖 Read Docs', onClick: () => handleAction('docs'), variant: 'secondary' },
        { label: 'Skip for Now', onClick: () => handleAction('skip'), variant: 'default' }
      ]
    },

    // With Custom Content
    withCustomContent: {
      title: 'Connect Your Account',
      message: 'Link your social media accounts to enable automated posting and analytics.',
      icon: 'robot',
      size: 'large'
    }
  };

  return (
    <DemoContainer>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#eaeaea' }}>
        EmptyState Component Demo
      </h1>

      <Controls>
        <Button $active={currentDemo === 'all'} onClick={() => setCurrentDemo('all')}>
          Show All
        </Button>
        <Button $active={currentDemo === 'basic'} onClick={() => setCurrentDemo('basic')}>
          Basic States
        </Button>
        <Button $active={currentDemo === 'sizes'} onClick={() => setCurrentDemo('sizes')}>
          Size Variants
        </Button>
        <Button $active={currentDemo === 'alignment'} onClick={() => setCurrentDemo('alignment')}>
          Alignment
        </Button>
        <Button $active={currentDemo === 'actions'} onClick={() => setCurrentDemo('actions')}>
          With Actions
        </Button>
        <Button $active={currentDemo === 'custom'} onClick={() => setCurrentDemo('custom')}>
          Custom Content
        </Button>
      </Controls>

      {/* Basic Empty States */}
      {(currentDemo === 'all' || currentDemo === 'basic') && (
        <>
          <SectionTitle>Basic Empty States</SectionTitle>
          <DemoGrid>
            <DemoCard>
              <CardTitle>No Data</CardTitle>
              <EmptyState {...demos.noData} />
            </DemoCard>

            <DemoCard>
              <CardTitle>No Search Results</CardTitle>
              <EmptyState {...demos.noSearchResults} />
            </DemoCard>

            <DemoCard>
              <CardTitle>No Notifications (Small)</CardTitle>
              <EmptyState {...demos.noNotifications} />
            </DemoCard>
          </DemoGrid>

          <FullWidthDemo>
            <CardTitle>No Campaigns (Large with Actions)</CardTitle>
            <EmptyState {...demos.noCampaigns} />
          </FullWidthDemo>
        </>
      )}

      {/* Size Variants */}
      {(currentDemo === 'all' || currentDemo === 'sizes') && (
        <>
          <SectionTitle>Size Variants</SectionTitle>
          <DemoGrid>
            <DemoCard>
              <CardTitle>Small Size</CardTitle>
              <EmptyState {...demos.small} />
            </DemoCard>

            <DemoCard>
              <CardTitle>Medium Size (Default)</CardTitle>
              <EmptyState {...demos.medium} />
            </DemoCard>

            <DemoCard>
              <CardTitle>Large Size</CardTitle>
              <EmptyState {...demos.large} />
            </DemoCard>
          </DemoGrid>
        </>
      )}

      {/* Alignment Variants */}
      {(currentDemo === 'all' || currentDemo === 'alignment') && (
        <>
          <SectionTitle>Alignment Variants</SectionTitle>
          <DemoGrid>
            <DemoCard>
              <CardTitle>Centered (Default)</CardTitle>
              <EmptyState {...demos.noData} />
            </DemoCard>

            <DemoCard>
              <CardTitle>Left Aligned</CardTitle>
              <EmptyState {...demos.leftAligned} />
            </DemoCard>
          </DemoGrid>
        </>
      )}

      {/* With Actions */}
      {(currentDemo === 'all' || currentDemo === 'actions') && (
        <>
          <SectionTitle>Empty States with Actions</SectionTitle>
          <DemoGrid>
            <DemoCard>
              <CardTitle>No Posts (2 Actions)</CardTitle>
              <EmptyState {...demos.noPosts} />
            </DemoCard>

            <DemoCard>
              <CardTitle>No Analytics (1 Action)</CardTitle>
              <EmptyState {...demos.noAnalytics} />
            </DemoCard>
          </DemoGrid>

          <FullWidthDemo>
            <CardTitle>Setup Required (3 Actions)</CardTitle>
            <EmptyState {...demos.multipleActions} />
          </FullWidthDemo>
        </>
      )}

      {/* Custom Content */}
      {(currentDemo === 'all' || currentDemo === 'custom') && (
        <>
          <SectionTitle>Custom Content</SectionTitle>
          <FullWidthDemo>
            <CardTitle>Empty State with Custom Children</CardTitle>
            <EmptyState {...demos.withCustomContent}>
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ color: '#a0a0a0', marginBottom: '1rem' }}>
                  This is custom content rendered as children. You can add any React component here.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['TikTok', 'Instagram', 'YouTube'].map(platform => (
                    <button
                      key={platform}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(233, 69, 96, 0.1)',
                        color: '#e94560',
                        border: '2px solid #e94560',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => alert(`Connect ${platform}`)}
                    >
                      Connect {platform}
                    </button>
                  ))}
                </div>
              </div>
            </EmptyState>
          </FullWidthDemo>
        </>
      )}

      {/* API Documentation */}
      {(currentDemo === 'all') && (
        <>
          <SectionTitle>API Documentation</SectionTitle>
          <FullWidthDemo>
            <pre style={{
              background: '#0f0f1a',
              padding: '1.5rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.875rem',
              color: '#eaeaea',
              lineHeight: '1.6'
            }}>
{`<EmptyState
  icon="noData"           // Icon: noData, search, folder, calendar, inbox, chart, robot, rocket
  title="No Data Found"   // Main heading text
  message="Description"   // Descriptive message
  size="medium"           // Size: small, medium, large
  centered={true}         // Center content (default: true)
  actions={[              // Optional action buttons
    {
      label: "Button",
      onClick: () => {},
      variant: "primary",  // primary, secondary, default
      icon: "🎯"          // Optional icon
    }
  ]}
>
  {/* Optional custom content */}
</EmptyState>`}
            </pre>
          </FullWidthDemo>
        </>
      )}

      {/* Usage Examples */}
      {(currentDemo === 'all') && (
        <>
          <SectionTitle>Feature Checklist</SectionTitle>
          <FullWidthDemo>
            <ul style={{
              color: '#a0a0a0',
              lineHeight: '2',
              listStyle: 'none',
              padding: 0
            }}>
              {[
                '✅ Step 1: Create empty state component',
                '✅ Step 2: Show friendly message',
                '✅ Step 3: Add illustration or icon (8 built-in icons)',
                '✅ Step 4: Include call-to-action (multiple actions supported)',
                '✅ Step 5: Test on various pages (demo page with multiple variants)',
                '✅ 3 size variants: small, medium, large',
                '✅ Centered and left-aligned options',
                '✅ Custom children content support',
                '✅ Action buttons with 3 variants',
                '✅ Smooth hover animations',
                '✅ Full accessibility support',
                '✅ Responsive design'
              ].map((item, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>{item}</li>
              ))}
            </ul>
          </FullWidthDemo>
        </>
      )}
    </DemoContainer>
  );
};

export default EmptyStateDemo;
