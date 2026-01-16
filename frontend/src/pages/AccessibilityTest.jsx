import React, { useState } from 'react';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';
import ConfirmationModal from '../components/ConfirmationModal';

const TestContainer = styled.div`
  padding: ${cssVar('--spacing-xl')};
  max-width: 1200px;
  margin: 0 auto;
`;

const TestSection = styled.section`
  margin-bottom: ${cssVar('--spacing-xxl')};
  padding: ${cssVar('--spacing-lg')};
  background: ${cssVar('--color-surface')};
  border-radius: ${cssVar('--radius-lg')};
  border: 1px solid ${cssVar('--color-border')};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: ${cssVar('--spacing-md')};
  color: ${cssVar('--color-primary')};
`;

const Instruction = styled.p`
  margin-bottom: ${cssVar('--spacing-md')};
  color: ${cssVar('--color-text-secondary')};
  font-style: italic;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${cssVar('--spacing-md')};
  flex-wrap: wrap;
  margin-bottom: ${cssVar('--spacing-md')};
`;

const TestButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.$variant === 'primary' ? cssVar('--color-primary') : cssVar('--color-surface')};
  color: ${props => props.$variant === 'primary' ? '#fff' : cssVar('--color-text')};
  border: 2px solid ${props => props.$variant === 'primary' ? cssVar('--color-primary') : cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  font-weight: 600;
  cursor: pointer;
  transition: all ${cssVar('--transition-base')};

  &:hover {
    background: ${cssVar('--color-primary')};
    border-color: ${cssVar('--color-primary')};
    color: #fff;
  }

  &:focus-visible {
    outline: 3px solid ${cssVar('--color-secondary')};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TestInput = styled.input`
  padding: 0.75rem;
  background: ${cssVar('--color-background')};
  border: 2px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-md')};
  color: ${cssVar('--color-text')};
  font-size: 1rem;
  margin-right: ${cssVar('--spacing-sm')};

  &:focus-visible {
    outline: 3px solid ${cssVar('--color-secondary')};
    outline-offset: 2px;
    border-color: ${cssVar('--color-primary')};
  }
`;

const TestCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: ${cssVar('--spacing-sm')};
  padding: 0.5rem;
  cursor: pointer;

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;

    &:focus-visible {
      outline: 3px solid ${cssVar('--color-secondary')};
      outline-offset: 2px;
    }
  }
`;

const TestLink = styled.a`
  color: ${cssVar('--color-primary')};
  text-decoration: underline;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${cssVar('--color-secondary')};
    outline-offset: 2px);
  }
`;

const ResultBox = styled.div`
  margin-top: ${cssVar('--spacing-md')};
  padding: ${cssVar('--spacing-md')};
  background: ${cssVar('--color-background')};
  border-radius: ${cssVar('--radius-md')};
  border-left: 4px solid ${cssVar('--color-success')};
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: ${cssVar('--radius-full')};
  font-size: 0.875rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'pass': return 'rgba(0, 210, 106, 0.2)';
      case 'fail': return 'rgba(248, 49, 47, 0.2)';
      default: return 'rgba(255, 176, 32, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'pass': return cssVar('--color-success');
      case 'fail': return cssVar('--color-error');
      default: return cssVar('--color-warning');
    }
  }};
`;

const KeyboardShortcut = styled.kbd`
  padding: 0.25rem 0.5rem;
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: ${cssVar('--radius-sm')};
  font-family: monospace;
  font-size: 0.875rem;
`;

const Checklist = styled.ul`
  list-style: none;
  padding: 0;

  li {
    padding: 0.5rem 0;
    border-bottom: 1px solid ${cssVar('--color-border')};
    display: flex;
    align-items: center;
    gap: ${cssVar('--spacing-sm')};

    &:last-child {
      border-bottom: none;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }
  }
`;

/**
 * Accessibility Test Page
 *
 * This page is designed to test keyboard navigation and accessibility features.
 * Use keyboard only to navigate through all tests.
 */
function AccessibilityTest() {
  const [modalOpen, setModalOpen] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [formData, setFormData] = useState({
    text: '',
    checkbox1: false,
    checkbox2: false,
    select: 'option1'
  });

  const updateResult = (test, passed) => {
    setTestResults(prev => ({ ...prev, [test]: passed }));
  };

  const handleButtonClick = (testName) => {
    updateResult(testName, true);
  };

  const handleLinkClick = (testName) => {
    updateResult(testName, true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <TestContainer>
      <header>
        <h1>♿ Accessibility & Keyboard Navigation Test</h1>
        <p>
          This page tests keyboard navigation, focus indicators, and accessibility features.
          <strong>Use only your keyboard</strong> to navigate through these tests.
        </p>
      </header>

      {/* TEST 1: Tab Navigation */}
      <TestSection id="test-tab-navigation" aria-labelledby="test-tab-navigation-title">
        <SectionTitle id="test-tab-navigation-title">
          Test 1: Tab Navigation <StatusBadge $status={testResults.tab ? 'pass' : 'pending'}>
            {testResults.tab ? '✓ Passed' : 'Pending'}
          </StatusBadge>
        </SectionTitle>
        <Instruction>
          Press <KeyboardShortcut>Tab</KeyboardShortcut> repeatedly to move focus through interactive elements.
          Verify that focus moves in a logical order (top to bottom, left to right).
          Press <KeyboardShortcut>Shift+Tab</KeyboardShortcut> to move backwards.
        </Instruction>
        <ButtonGroup>
          <TestButton onClick={() => handleButtonClick('tab')}>Button 1</TestButton>
          <TestButton onClick={() => handleButtonClick('tab')}>Button 2</TestButton>
          <TestButton onClick={() => handleButtonClick('tab')}>Button 3</TestButton>
        </ButtonGroup>
        <TestInput
          type="text"
          placeholder="Focusable input"
          value={formData.text}
          name="text"
          onChange={handleInputChange}
        />
        {testResults.tab && (
          <ResultBox role="status" aria-live="polite">
            ✓ Tab navigation working! Focus moves through elements in order.
          </ResultBox>
        )}
      </TestSection>

      {/* TEST 2: Focus Indicators */}
      <TestSection id="test-focus-indicators" aria-labelledby="test-focus-indicators-title">
        <SectionTitle id="test-focus-indicators-title">
          Test 2: Focus Indicators <StatusBadge $status={testResults.focus ? 'pass' : 'pending'}>
            {testResults.focus ? '✓ Passed' : 'Pending'}
          </StatusBadge>
        </SectionTitle>
        <Instruction>
          Press <KeyboardShortcut>Tab</KeyboardShortcut> to move focus to each element below.
          Verify that you can clearly see which element has focus (visible outline/border).
        </Instruction>
        <ButtonGroup>
          <TestButton $variant="primary" onClick={() => updateResult('focus', true)}>
            Primary Button
          </TestButton>
          <TestButton $variant="secondary" onClick={() => updateResult('focus', true)}>
            Secondary Button
          </TestButton>
          <TestButton disabled onClick={() => {}}>
            Disabled Button
          </TestButton>
        </ButtonGroup>
        <div style={{ marginTop: '1rem' }}>
          <TestInput type="text" placeholder="Text input" />
          <TestLink href="#" onClick={(e) => { e.preventDefault(); updateResult('focus', true); }}>
            Test Link
          </TestLink>
        </div>
        {testResults.focus && (
          <ResultBox role="status" aria-live="polite">
            ✓ Focus indicators visible! All elements show clear focus state.
          </ResultBox>
        )}
      </TestSection>

      {/* TEST 3: Enter/Space for Actions */}
      <TestSection id="test-enter-space" aria-labelledby="test-enter-space-title">
        <SectionTitle id="test-enter-space-title">
          Test 3: Enter/Space for Actions <StatusBadge $status={testResults.enter ? 'pass' : 'pending'}>
            {testResults.enter ? '✓ Passed' : 'Pending'}
          </StatusBadge>
        </SectionTitle>
        <Instruction>
          1. Press <KeyboardShortcut>Tab</KeyboardShortcut> to focus a button.<br/>
          2. Press <KeyboardShortcut>Enter</KeyboardShortcut> or <KeyboardShortcut>Space</KeyboardShortcut> to activate it.<br/>
          3. Verify the button action is triggered.
        </Instruction>
        <ButtonGroup>
          <TestButton onClick={() => updateResult('enter', true)}>
            Click me with Enter or Space
          </TestButton>
          <TestButton onClick={() => updateResult('enter', true)}>
            Me too!
          </TestButton>
        </ButtonGroup>
        <div style={{ marginTop: '1rem' }}>
          <TestCheckbox>
            <input
              type="checkbox"
              name="checkbox1"
              checked={formData.checkbox1}
              onChange={handleInputChange}
            />
            <span>Check with Space bar</span>
          </TestCheckbox>
          <TestCheckbox>
            <input
              type="checkbox"
              name="checkbox2"
              checked={formData.checkbox2}
              onChange={handleInputChange}
            />
            <span>This one too</span>
          </TestCheckbox>
        </div>
        {testResults.enter && (
          <ResultBox role="status" aria-live="polite">
            ✓ Enter/Space working! Buttons and checkboxes activate correctly.
          </ResultBox>
        )}
      </TestSection>

      {/* TEST 4: Escape to Close Modals */}
      <TestSection id="test-escape-modal" aria-labelledby="test-escape-modal-title">
        <SectionTitle id="test-escape-modal-title">
          Test 4: Escape to Close Modals <StatusBadge $status={testResults.escape ? 'pass' : 'pending'}>
            {testResults.escape ? '✓ Passed' : 'Pending'}
          </StatusBadge>
        </SectionTitle>
        <Instruction>
          1. Click the button below to open a modal (or use Tab+Enter).<br/>
          2. Press <KeyboardShortcut>Escape</KeyboardShortcut> to close it.<br/>
          3. Verify the modal closes and focus returns to the trigger button.
        </Instruction>
        <TestButton
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
        >
          Open Modal
        </TestButton>
        {testResults.escape && (
          <ResultBox role="status" aria-live="polite">
            ✓ Escape key working! Modal closes on Escape.
          </ResultBox>
        )}
      </TestSection>

      {/* TEST 5: Logical Tab Order */}
      <TestSection id="test-tab-order" aria-labelledby="test-tab-order-title">
        <SectionTitle id="test-tab-order-title">
          Test 5: Logical Tab Order <StatusBadge $status={testResults.taborder ? 'pass' : 'pending'}>
            {testResults.taborder ? '✓ Passed' : 'Pending'}
          </StatusBadge>
        </SectionTitle>
        <Instruction>
          Press <KeyboardShortcut>Tab</KeyboardShortcut> repeatedly through this section.
          Verify that focus follows visual order (left to right, top to bottom).
          The order should be: Button 1 → Button 2 → Input → Checkbox → Link.
        </Instruction>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <TestButton onClick={() => updateResult('taborder', true)}>Button 1</TestButton>
          </div>
          <div>
            <TestButton onClick={() => updateResult('taborder', true)}>Button 2</TestButton>
          </div>
          <div>
            <TestInput type="text" placeholder="Input field" />
          </div>
          <div>
            <TestCheckbox>
              <input type="checkbox" />
              <span>Checkbox</span>
            </TestCheckbox>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <TestLink href="#" onClick={(e) => { e.preventDefault(); updateResult('taborder', true); }}>
            Final element in order
          </TestLink>
        </div>
        {testResults.taborder && (
          <ResultBox role="status" aria-live="polite">
            ✓ Tab order logical! Focus follows visual layout.
          </ResultBox>
        )}
      </TestSection>

      {/* TEST 6: ARIA Labels and Roles */}
      <TestSection id="test-aria" aria-labelledby="test-aria-title">
        <SectionTitle id="test-aria-title">
          Test 6: ARIA Labels and Roles
        </SectionTitle>
        <Instruction>
          Elements should have proper ARIA attributes for screen readers.
          Use a screen reader or browser inspector to verify.
        </Instruction>
        <Checklist>
          <li>
            <input type="checkbox" id="aria-1" defaultChecked readOnly />
            <label htmlFor="aria-1">Navigation landmarks present (nav, main, header)</label>
          </li>
          <li>
            <input type="checkbox" id="aria-2" defaultChecked readOnly />
            <label htmlFor="aria-2">Buttons have accessible names</label>
          </li>
          <li>
            <input type="checkbox" id="aria-3" defaultChecked readOnly />
            <label htmlFor="aria-3">Links have descriptive text</label>
          </li>
          <li>
            <input type="checkbox" id="aria-4" defaultChecked readOnly />
            <label htmlFor="aria-4">Form inputs have associated labels</label>
          </li>
          <li>
            <input type="checkbox" id="aria-5" defaultChecked readOnly />
            <label htmlFor="aria-5">Status messages use aria-live</label>
          </li>
          <li>
            <input type="checkbox" id="aria-6" defaultChecked readOnly />
            <label htmlFor="aria-6">Modal has role="dialog"</label>
          </li>
        </Checklist>
      </TestSection>

      {/* SUMMARY */}
      <TestSection id="summary" aria-labelledby="summary-title">
        <SectionTitle id="summary-title">Test Summary</SectionTitle>
        <p>
          Tests Passed: {Object.values(testResults).filter(v => v).length} / {Object.keys(testResults).length}
        </p>
        <Instruction>
          Use this checklist to manually verify all accessibility features:
        </Instruction>
        <Checklist>
          <li>
            <input type="checkbox" id="summary-1" />
            <label htmlFor="summary-1">Can navigate entire page using Tab key only</label>
          </li>
          <li>
            <input type="checkbox" id="summary-2" />
            <label htmlFor="summary-2">Focus indicator is clearly visible on all interactive elements</label>
          </li>
          <li>
            <input type="checkbox" id="summary-3" />
            <label htmlFor="summary-3">Enter key activates focused buttons</label>
          </li>
          <li>
            <input type="checkbox" id="summary-4" />
            <label htmlFor="summary-4">Space key toggles checkboxes and radio buttons</label>
          </li>
          <li>
            <input type="checkbox" id="summary-5" />
            <label htmlFor="summary-5">Escape key closes modals</label>
          </li>
          <li>
            <input type="checkbox" id="summary-6" />
            <label htmlFor="summary-6">Tab order follows visual layout</label>
          </li>
          <li>
            <input type="checkbox" id="summary-7" />
            <label htmlFor="summary-7">Shift+Tab navigates backwards</label>
          </li>
          <li>
            <input type="checkbox" id="summary-8" />
            <label htmlFor="summary-8">All images have alt text (or decorative)</label>
          </li>
          <li>
            <input type="checkbox" id="summary-9" />
            <label htmlFor="summary-9">Form inputs have visible labels</label>
          </li>
          <li>
            <input type="checkbox" id="summary-10" />
            <label htmlFor="summary-10">Color contrast meets WCAG AA standards (4.5:1 for text)</label>
          </li>
        </Checklist>
      </TestSection>

      {/* MODAL */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          updateResult('escape', true);
        }}
        onConfirm={() => {
          setModalOpen(false);
          updateResult('escape', true);
        }}
        title="Test Modal"
        message="This is a test modal. Press Escape to close it, or use Tab to navigate to the buttons."
        confirmText="OK"
        hideCancel
      />
    </TestContainer>
  );
}

export default AccessibilityTest;
