import React from 'react';
import styled from 'styled-components';
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast
} from './Toast';

const TestContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.success {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }

  &.error {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  &.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  &.info {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #e94560;
`;

const Description = styled.p`
  color: #a0a0a0;
  margin-bottom: 1rem;
  line-height: 1.6;
`;

const ToastTest = () => {
  return (
    <TestContainer>
      <Title>Toast Notification Test</Title>

      <Section>
        <SectionTitle>Basic Toast Variants</SectionTitle>
        <Description>Click each button to see different toast types:</Description>
        <ButtonGrid>
          <Button
            className="success"
            onClick={() => showSuccessToast('Operation completed successfully!')}
          >
            ✅ Success Toast
          </Button>
          <Button
            className="error"
            onClick={() => showErrorToast('An error occurred. Please try again.')}
          >
            ❌ Error Toast
          </Button>
          <Button
            className="warning"
            onClick={() => showWarningToast('Please review this warning before proceeding.')}
          >
            ⚠️ Warning Toast
          </Button>
          <Button
            className="info"
            onClick={() => showInfoToast('Here is some helpful information for you.')}
          >
            ℹ️ Info Toast
          </Button>
        </ButtonGrid>
      </Section>

      <Section>
        <SectionTitle>Toasts with Titles</SectionTitle>
        <Description>Toasts can have custom titles and durations:</Description>
        <ButtonGrid>
          <Button
            className="success"
            onClick={() => showSuccessToast('Settings have been saved', {
              title: 'Settings Saved',
              duration: 3000
            })}
          >
            🎯 Short Duration (3s)
          </Button>
          <Button
            className="info"
            onClick={() => showInfoToast('Your changes are being processed', {
              title: 'Processing',
              duration: 10000
            })}
          >
            ⏱️ Long Duration (10s)
          </Button>
          <Button
            className="warning"
            onClick={() => showWarningToast('Budget is at 90% capacity', {
              title: 'Budget Alert',
              showProgress: true
            })}
          >
            📊 With Progress Bar
          </Button>
          <Button
            className="success"
            onClick={() => showSuccessToast('File uploaded successfully', {
              title: 'Upload Complete',
              autoDismiss: false
            })}
          >
            🔒 No Auto-Dismiss
          </Button>
        </ButtonGrid>
      </Section>

      <Section>
        <SectionTitle>Multiple Toasts</SectionTitle>
        <Description>Trigger multiple toasts to see them stack:</Description>
        <ButtonGrid>
          <Button
            className="success"
            onClick={() => {
              showSuccessToast('First operation complete', { title: 'Step 1/3' });
              setTimeout(() => {
                showSuccessToast('Second operation complete', { title: 'Step 2/3' });
              }, 500);
              setTimeout(() => {
                showSuccessToast('Third operation complete', { title: 'Step 3/3' });
              }, 1000);
            }}
          >
            📋 Show 3 Toasts
          </Button>
          <Button
            className="info"
            onClick={() => {
              showInfoToast('Processing item 1', { title: 'Queue', duration: 2000 });
              setTimeout(() => showInfoToast('Processing item 2', { title: 'Queue', duration: 2000 }), 300);
              setTimeout(() => showInfoToast('Processing item 3', { title: 'Queue', duration: 2000 }), 600);
              setTimeout(() => showInfoToast('Processing item 4', { title: 'Queue', duration: 2000 }), 900);
              setTimeout(() => showInfoToast('Processing item 5', { title: 'Queue', duration: 2000 }), 1200);
            }}
          >
            🚀 Show 5 Toasts Rapidly
          </Button>
        </ButtonGrid>
      </Section>

      <Section>
        <SectionTitle>Real-World Scenarios</SectionTitle>
        <Description>Common toast use cases:</Description>
        <ButtonGrid>
          <Button
            className="success"
            onClick={() => showSuccessToast('Your changes have been saved', {
              title: 'Settings Saved',
              duration: 4000
            })}
          >
            💾 Settings Saved
          </Button>
          <Button
            className="success"
            onClick={() => showSuccessToast('Dashboard data refreshed', {
              title: 'Refresh Complete',
              duration: 3000
            })}
          >
            🔄 Data Refreshed
          </Button>
          <Button
            className="success"
            onClick={() => showSuccessToast('Exported 150 records to CSV', {
              title: 'Export Complete',
              duration: 4000
            })}
          >
            📥 Export Successful
          </Button>
          <Button
            className="error"
            onClick={() => showErrorToast('Failed to connect to server. Check your connection.', {
              title: 'Connection Error',
              duration: 6000
            })}
          >
            🔌 Connection Failed
          </Button>
          <Button
            className="warning"
            onClick={() => showWarningToast('Marketing budget at 92% capacity', {
              title: 'Budget Warning',
              duration: 8000,
              showProgress: true
            })}
          >
            💰 Budget Alert
          </Button>
          <Button
            className="info"
            onClick={() => showInfoToast('3 posts are pending approval', {
              title: 'Approval Queue',
              duration: 5000
            })}
          >
            ✅ Pending Approvals
          </Button>
        </ButtonGrid>
      </Section>
    </TestContainer>
  );
};

export default ToastTest;
