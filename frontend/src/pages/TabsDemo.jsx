import React, { useState } from 'react';
import styled from 'styled-components';
import Tabs from '../components/Tabs';
import { cssVar } from '../themeUtils';

const DemoContainer = styled.div`
  padding: ${cssVar('--spacing-xl')};
  max-width: 1200px;
  margin: 0 auto;
`;

const DemoSection = styled.section`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  background: ${cssVar('--gradient-primary')};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SectionDescription = styled.p`
  color: ${cssVar('--color-text-secondary')};
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

const CodeBlock = styled.pre`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  padding: ${cssVar('--spacing-md')};
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: ${cssVar('--color-text-secondary')};
  margin-top: ${cssVar('--spacing-md')};
`;

const ContentBox = styled.div`
  padding: ${cssVar('--spacing-lg')};
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  min-height: 200px;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    padding: 0.5rem 0;
    border-bottom: 1px solid ${cssVar('--color-border')};

    &:last-child {
      border-bottom: none;
    }

    &:before {
      content: '✓ ';
      color: ${cssVar('--color-success', '#10b981')};
      font-weight: bold;
      margin-right: 0.5rem;
    }
  }
`;

function TabsDemo() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DemoContainer>
      <h1>Tabs Component Demo</h1>
      <p>
        This page demonstrates the Tabs component with all features including
        keyboard navigation, localStorage persistence, and indicators.
      </p>

      {/* Example 1: Basic Tabs */}
      <DemoSection>
        <SectionTitle>1. Basic Tabs</SectionTitle>
        <SectionDescription>
          Simple tab navigation with smooth transitions and keyboard support.
        </SectionDescription>

        <Tabs
          defaultTab="overview"
          onChange={(id) => setActiveTab(id)}
        >
          <Tabs.Item id="overview" label="Overview">
            <ContentBox>
              <h3>Overview Tab Content</h3>
              <p>This is the overview section. Use arrow keys to navigate between tabs.</p>
              <FeatureList>
                <li>Tab component created ✓</li>
                <li>Tab indicators (bottom border) ✓</li>
                <li>Content switches on click ✓</li>
                <li>Active state: {activeTab} ✓</li>
              </FeatureList>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="features" label="Features">
            <ContentBox>
              <h3>Features Tab Content</h3>
              <p>The Tabs component supports:</p>
              <FeatureList>
                <li>Keyboard navigation (Arrow keys, Home, End)</li>
                <li>localStorage persistence</li>
                <li>Optional indicators (badges)</li>
                <li>Disabled tabs</li>
                <li>Smooth animations</li>
                <li>Accessibility (ARIA attributes)</li>
              </FeatureList>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="usage" label="Usage">
            <ContentBox>
              <h3>Usage Tab Content</h3>
              <p>Import and use the Tabs component:</p>
              <CodeBlock>{`import Tabs from './components/Tabs';

<Tabs defaultTab="tab1" storageKey="my-tabs">
  <Tabs.Item id="tab1" label="Tab 1">
    <div>Content 1</div>
  </Tabs.Item>
  <Tabs.Item id="tab2" label="Tab 2">
    <div>Content 2</div>
  </Tabs.Item>
</Tabs>`}</CodeBlock>
            </ContentBox>
          </Tabs.Item>
        </Tabs>
      </DemoSection>

      {/* Example 2: Tabs with Indicators */}
      <DemoSection>
        <SectionTitle>2. Tabs with Indicators</SectionTitle>
        <SectionDescription>
          Tabs can show badges/count indicators to draw attention to specific tabs.
        </SectionDescription>

        <Tabs defaultTab="notifications" storageKey="demo-tabs-indicators">
          <Tabs.Item id="notifications" label="Notifications" indicator="5">
            <ContentBox>
              <h3>Notifications (5)</h3>
              <p>You have 5 new notifications.</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="messages" label="Messages" indicator="12">
            <ContentBox>
              <h3>Messages (12)</h3>
              <p>You have 12 unread messages.</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="tasks" label="Tasks" indicator="3">
            <ContentBox>
              <h3>Tasks (3)</h3>
              <p>You have 3 pending tasks.</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="settings" label="Settings">
            <ContentBox>
              <h3>Settings</h3>
              <p>Configure your preferences here.</p>
            </ContentBox>
          </Tabs.Item>
        </Tabs>
      </DemoSection>

      {/* Example 3: Persistent Tabs */}
      <DemoSection>
        <SectionTitle>3. Persistent Tabs (with localStorage)</SectionTitle>
        <SectionDescription>
          These tabs remember your selection. Refresh the page and the active tab will persist.
          <strong> Try switching tabs and refreshing the page!</strong>
        </SectionDescription>

        <Tabs
          defaultTab="profile"
          storageKey="demo-tabs-persistent"
          onChange={(id) => console.log('Tab changed to:', id)}
        >
          <Tabs.Item id="profile" label="Profile">
            <ContentBox>
              <h3>Profile Settings</h3>
              <p>Your profile information and preferences.</p>
              <p>Current selection is saved to localStorage with key: <code>demo-tabs-persistent</code></p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="security" label="Security">
            <ContentBox>
              <h3>Security Settings</h3>
              <p>Password, two-factor authentication, and session management.</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="billing" label="Billing">
            <ContentBox>
              <h3>Billing Information</h3>
              <p>Payment methods, invoices, and subscription details.</p>
            </ContentBox>
          </Tabs.Item>
        </Tabs>
      </DemoSection>

      {/* Example 4: Keyboard Navigation */}
      <DemoSection>
        <SectionTitle>4. Keyboard Navigation</SectionTitle>
        <SectionDescription>
          Use these keyboard shortcuts to navigate tabs:
        </SectionDescription>

        <ContentBox>
          <FeatureList>
            <li><strong>Arrow Left</strong> - Move to previous tab</li>
            <li><strong>Arrow Right</strong> - Move to next tab</li>
            <li><strong>Home</strong> - Jump to first tab</li>
            <li><strong>End</strong> - Jump to last tab</li>
            <li><strong>Enter/Space</strong> - Select focused tab (when using arrow keys)</li>
          </FeatureList>
          <p style={{ marginTop: '1rem', color: cssVar('--color-text-secondary') }}>
            Try it! Click on a tab below and use arrow keys to navigate.
          </p>
        </ContentBox>

        <br />

        <Tabs defaultTab="tab1">
          <Tabs.Item id="tab1" label="Tab 1">
            <ContentBox>
              <h3>Tab 1 Content</h3>
              <p>Use arrow keys to navigate between tabs.</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="tab2" label="Tab 2">
            <ContentBox>
              <h3>Tab 2 Content</h3>
              <p>Keyboard navigation is fully accessible.</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="tab3" label="Tab 3">
            <ContentBox>
              <h3>Tab 3 Content</h3>
              <p>Try pressing Home or End keys!</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="tab4" label="Tab 4">
            <ContentBox>
              <h3>Tab 4 Content</h3>
              <p>All ARIA attributes are properly set.</p>
            </ContentBox>
          </Tabs.Item>
        </Tabs>
      </DemoSection>

      {/* Example 5: Integration Example */}
      <DemoSection>
        <SectionTitle>5. Real-World Integration Example</SectionTitle>
        <SectionDescription>
          How tabs might be used in the actual application:
        </SectionDescription>

        <Tabs defaultTab="campaigns" storageKey="marketing-dashboard">
          <Tabs.Item id="campaigns" label="Campaigns" indicator="3">
            <ContentBox>
              <h3>Active Campaigns</h3>
              <p>Summer Romance - TikTok Ads</p>
              <p>Spicy Stories - Instagram Reels</p>
              <p>Romantic Audiobooks - YouTube Shorts</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="analytics" label="Analytics">
            <ContentBox>
              <h3>Performance Analytics</h3>
              <p>Views: 1.2M</p>
              <p>Engagement Rate: 8.5%</p>
              <p>Conversions: 45,000</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="revenue" label="Revenue">
            <ContentBox>
              <h3>Revenue Tracking</h3>
              <p>MRR: $425</p>
              <p>Target: $400</p>
              <p>Growth: +6.3%</p>
            </ContentBox>
          </Tabs.Item>

          <Tabs.Item id="settings" label="Settings">
            <ContentBox>
              <h3>Campaign Settings</h3>
              <p>Budget allocations, targeting, and scheduling.</p>
            </ContentBox>
          </Tabs.Item>
        </Tabs>
      </DemoSection>
    </DemoContainer>
  );
}

export default TabsDemo;
