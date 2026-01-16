import { useState, useEffect } from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  ${({ $level }) => {
    switch ($level) {
      case 'warning':
        return `
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        `;
      case 'error':
        return `
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        `;
      default:
        return `
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        `;
    }
  }}

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const Icon = styled.span`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 1rem;
`;

const Message = styled.div`
  font-size: 0.875rem;
  opacity: 0.95;
`;

const DismissButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ServiceStatusBanner = () => {
  const [notification, setNotification] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Poll for service status every 30 seconds
    const checkServiceStatus = async () => {
      try {
        const response = await fetch('/api/service-status/notification');
        const data = await response.json();

        if (data.success && data.notification) {
          setNotification(data.notification);
          setDismissed(false);
        } else {
          setNotification(null);
        }
      } catch (error) {
        console.error('Failed to check service status:', error);
      }
    };

    // Check immediately on mount
    checkServiceStatus();

    // Set up polling interval
    const interval = setInterval(checkServiceStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // If no notification or dismissed, don't show banner
  if (!notification || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '🔴';
      default:
        return 'ℹ️';
    }
  };

  return (
    <Banner $level={notification.type}>
      <BannerContent>
        <Icon>{getIcon()}</Icon>
        <MessageContent>
          <Title>{notification.title}</Title>
          <Message>{notification.message}</Message>
        </MessageContent>
      </BannerContent>
      <DismissButton onClick={handleDismiss}>
        Dismiss
      </DismissButton>
    </Banner>
  );
};

export default ServiceStatusBanner;
