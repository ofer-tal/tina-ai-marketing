import React, { useState } from 'react';
import styled from 'styled-components';
import EmptyState from '../components/EmptyState';
import ErrorAlert from '../components/ErrorAlert';
import { showToast } from '../components/Toast';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
`;

const PageDescription = styled.p`
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
`;

const TestSection = styled.section`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 1rem 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 1rem 0;
`;

const TestButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-secondary);
    transform: translateY(-2px);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;

const InfoBox = styled.div`
  background: rgba(123, 44, 191, 0.1);
  border-left: 4px solid var(--color-secondary);
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
`;

const InfoTitle = styled.h3`
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
`;

const InfoText = styled.p`
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 1rem 0;
  font-size: 0.9rem;
  color: var(--color-text);
`;

const Checklist = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;

  li {
    padding: 0.5rem 0;
    padding-left: 2rem;
    position: relative;

    &::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--color-success);
      font-weight: bold;
    }
  }
`;

/**
 * Screen Reader Test Page
 *
 * This page demonstrates and verifies screen reader support features:
 * 1. ARIA labels on icons and images
 * 2. Alt text for images
 * 3. Live regions for dynamic changes
 * 4. Semantic HTML verification
 * 5. Screen reader announcements
 */
function ScreenReaderTest() {
  const [showAlert, setShowAlert] = useState(false);

  const handleShowToast = (variant, title, message) => {
    showToast(message, {
      variant,
      title,
      duration: 5000
    });
  };

  const handleToggleAlert = () => {
    setShowAlert(prev => !prev);
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Screen Reader Accessibility Test</PageTitle>
        <PageDescription>
          This page demonstrates screen reader support features including ARIA labels,
          live regions, semantic HTML, and proper announcements for dynamic content.
        </PageDescription>
      </PageHeader>

      {/* Test 1: ARIA Labels on Icons */}
      <TestSection>
        <SectionTitle>1. ARIA Labels on Icons</SectionTitle>
        <InfoBox>
          <InfoTitle>What to expect:</InfoTitle>
          <InfoText>
            Screen readers should announce the icon's purpose instead of reading the emoji character.
            Each SVG has role="img" and aria-label describing the icon.
          </InfoText>
        </InfoBox>

        <TestGrid>
          <EmptyState
            icon="search"
            title="Search Icon Test"
            message="Screen reader should say 'Search icon'"
          />
          <EmptyState
            icon="folder"
            title="Folder Icon Test"
            message="Screen reader should say 'Folder icon'"
          />
          <EmptyState
            icon="calendar"
            title="Calendar Icon Test"
            message="Screen reader should say 'Calendar icon'"
          />
          <EmptyState
            icon="chart"
            title="Chart Icon Test"
            message="Screen reader should say 'Chart icon'"
          />
          <EmptyState
            icon="robot"
            title="Robot Icon Test"
            message="Screen reader should say 'Robot icon'"
          />
          <EmptyState
            icon="rocket"
            title="Star Icon Test"
            message="Screen reader should say 'Star icon'"
          />
        </TestGrid>

        <CodeBlock>{`// SVG with ARIA labels
<svg role="img" aria-label="Search icon">
  <circle cx="11" cy="11" r="8" />
  <path d="M21 21l-4.35-4.35" />
</svg>`}</CodeBlock>
      </TestSection>

      {/* Test 2: Live Regions for Dynamic Changes */}
      <TestSection>
        <SectionTitle>2. Live Regions for Dynamic Changes</SectionTitle>
        <InfoBox>
          <InfoTitle>What to expect:</InfoTitle>
          <InfoText>
            When you click the buttons below, screen readers should announce the new content immediately.
            Toasts have aria-live="polite" and errors have aria-live="assertive".
          </InfoText>
        </InfoBox>

        <ButtonGroup>
          <TestButton onClick={() => handleShowToast('success', 'Success!', 'Operation completed successfully')}>
            Show Success Toast
          </TestButton>
          <TestButton onClick={() => handleShowToast('error', 'Error!', 'Something went wrong')}>
            Show Error Toast
          </TestButton>
          <TestButton onClick={() => handleShowToast('warning', 'Warning!', 'Please review your input')}>
            Show Warning Toast
          </TestButton>
          <TestButton onClick={() => handleShowToast('info', 'Info', 'Here is some information')}>
            Show Info Toast
          </TestButton>
        </ButtonGroup>

        {showAlert && (
          <ErrorAlert
            type="error"
            title="Live Region Test"
            message="This alert should be announced immediately by screen readers (aria-live='assertive')"
            onDismiss={handleToggleAlert}
          />
        )}

        <ButtonGroup>
          <TestButton onClick={handleToggleAlert}>
            {showAlert ? 'Hide' : 'Show'} Live Region Alert
          </TestButton>
        </ButtonGroup>

        <CodeBlock>{`// Live region announcements
<ToastItemWrapper
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  Screen reader announces this
</ToastItemWrapper>

<AlertContainer
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  Screen reader interrupts for this
</AlertContainer>`}</CodeBlock>
      </TestSection>

      {/* Test 3: Semantic HTML */}
      <TestSection>
        <SectionTitle>3. Semantic HTML Verification</SectionTitle>
        <InfoBox>
          <InfoTitle>What to expect:</InfoTitle>
          <InfoText>
            This page uses proper semantic HTML elements: nav, main, section, h1-h3 headings,
            and proper landmark roles. Screen readers can navigate by these landmarks.
          </InfoText>
        </InfoBox>

        <Checklist>
          <li>Navigation landmarks (nav elements) for menus</li>
          <li>Main content area (main element)</li>
          <li>Proper heading hierarchy (h1 → h2 → h3)</li>
          <li>Sections with semantic section elements</li>
          <li>Buttons with accessible names</li>
          <li>Links with descriptive text</li>
          <li>Lists for grouped content</li>
          <li>Landmark roles (banner, navigation, main, complementary)</li>
        </Checklist>

        <CodeBlock>{`// Semantic HTML structure
<nav aria-label="Main navigation">
  <a href="/" aria-label="Home">🏠</a>
  <a href="/dashboard" aria-label="Dashboard">📊</a>
</nav>

<main>
  <h1>Page Title</h1>
  <section aria-labelledby="section-1-title">
    <h2 id="section-1-title">Section Title</h2>
  </section>
</main>

<aside aria-label="Sidebar">
  <!-- Complementary content -->
</aside>`}</CodeBlock>
      </TestSection>

      {/* Test 4: Alt Text for Images */}
      <TestSection>
        <SectionTitle>4. Alt Text for Images</SectionTitle>
        <InfoBox>
          <InfoTitle>What to expect:</InfoTitle>
          <InfoText>
            All images (including SVG icons) have descriptive alt text or aria-label attributes.
            Decorative images have aria-hidden="true" to prevent unnecessary announcements.
          </InfoText>
        </InfoBox>

        <TestGrid>
          <div>
            <h4>Informative Image:</h4>
            <EmptyState
              icon="robot"
              title="AI Assistant"
              message="This icon has aria-label='Robot icon' for screen readers"
            />
          </div>
          <div>
            <h4>Decorative Icon:</h4>
            <div style={{padding: '2rem', background: 'var(--color-surface)', borderRadius: '8px'}}>
              <span aria-hidden="true" style={{fontSize: '3rem'}}>✨</span>
              <p style={{marginTop: '1rem'}}>This decorative icon has aria-hidden="true"</p>
            </div>
          </div>
        </TestGrid>

        <CodeBlock>{`// Informative image
<img src="/logo.png" alt="Blush Marketing Logo" />
<svg role="img" aria-label="Robot icon">...</svg>

// Decorative image
<img src="decoration.png" alt="" />
<span aria-hidden="true">✨</span>`}</CodeBlock>
      </TestSection>

      {/* Test 5: Navigation and Interactive Elements */}
      <TestSection>
        <SectionTitle>5. Navigation and Interactive Elements</SectionTitle>
        <InfoBox>
          <InfoTitle>What to expect:</InfoTitle>
          <InfoText>
            All interactive elements have accessible names and clear state indicators.
            Links describe their destination. Buttons indicate their action.
          </InfoText>
        </InfoBox>

        <ButtonGroup>
          <TestButton>Primary Action</TestButton>
          <TestButton onClick={() => alert('Action triggered!')}>
            Interactive Button
          </TestButton>
        </ButtonGroup>

        <nav aria-label="Test navigation" style={{marginTop: '1rem'}}>
          <ul style={{listStyle: 'none', padding: 0, display: 'flex', gap: '1rem'}}>
            <li>
              <a href="#test1" style={{color: 'var(--color-primary)'}}>
                Link with descriptive text
              </a>
            </li>
            <li>
              <a href="#test2" style={{color: 'var(--color-primary)'}}>
                Another clear link
              </a>
            </li>
          </ul>
        </nav>

        <CodeBlock>{`// Accessible links and buttons
<a href="/dashboard" aria-label="Go to Dashboard">
  Dashboard
</a>

<button aria-label="Close dialog" onClick={handleClose}>
  ×
</button>

<button aria-pressed={isPressed} onClick={toggle}>
  Toggle Feature
</button>`}</CodeBlock>
      </TestSection>

      {/* Summary */}
      <TestSection>
        <SectionTitle>Screen Reader Support Summary</SectionTitle>
        <Checklist>
          <li>✓ ARIA labels on all emoji icons in navigation (aria-hidden on emoji, aria-label on link)</li>
          <li>✓ Role="img" and aria-label on all SVG icons</li>
          <li>✓ aria-live="polite" on toasts for non-critical announcements</li>
          <li>✓ aria-live="assertive" on error alerts for immediate announcement</li>
          <li>✓ aria-atomic="true" for complete content announcement</li>
          <li>✓ aria-hidden="true" on decorative icons</li>
          <li>✓ Semantic HTML with proper landmark roles</li>
          <li>✓ Proper heading hierarchy (h1-h6)</li>
          <li>✓ Accessible names on all interactive elements</li>
          <li>✓ aria-current="page" on active navigation links</li>
          <li>✓ aria-label on icon-only buttons</li>
          <li>✓ role="navigation" with aria-label on nav regions</li>
        </Checklist>

        <InfoBox>
          <InfoTitle>Testing with Screen Readers:</InfoTitle>
          <InfoText>
            <strong>NVDA (Windows):</strong> Navigate with Tab key, use NVDA+F1 for element info<br/>
            <strong>JAWS (Windows):</strong> Use Insert+F3 for elements list<br/>
            <strong>VoiceOver (Mac):</strong> Press VO+U for rotor, VO+; for item info<br/>
            <strong>TalkBack (Android):</strong> Explore by touch, use global context menu
          </InfoText>
        </InfoBox>
      </TestSection>
    </PageContainer>
  );
}

export default ScreenReaderTest;
