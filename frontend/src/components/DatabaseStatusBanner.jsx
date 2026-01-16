import { useState, useEffect } from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998; // Below service status banner
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  ${({ $level }) => {
    switch ($level) {
      case 'critical':
        return `
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
        `;
      case 'severe':
        return `
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        `;
      case 'degraded':
        return `
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        `;
      case 'recovering':
        return `
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        `;
      default:
        return `
          background: transparent;
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

const Details = styled.div`
  font-size: 0.75rem;
  opacity: 0.85;
  margin-top: 0.25rem;
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

const DatabaseStatusBanner = () => {
  const [dbStatus, setDbStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Poll for database status every 15 seconds
    const checkDatabaseStatus = async () => {
      try {
        const response = await fetch('/api/database-status/health');
        const data = await response.json();

        if (data.success && data.data) {
          setDbStatus(data.data);

          // Auto-dismiss if healthy
          if (data.data.healthStatus === 'healthy') {
            setDismissed(true);
          }
        }
      } catch (error) {
        console.error('Failed to check database status:', error);
        // If we can't reach the API, assume database is down
        setDbStatus({
          healthStatus: 'critical',
          message: 'Unable to communicate with database service',
        });
      }
    };

    // Check immediately on mount
    checkDatabaseStatus();

    // Set up polling interval
    const interval = setInterval(checkDatabaseStatus, 15000);

    return () => clearInterval(interval);
  }, []);

  // If no status, healthy, or dismissed, don't show banner
  if (!dbStatus || dbStatus.healthStatus === 'healthy' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  const getIcon = () => {
    switch (dbStatus.healthStatus) {
      case 'critical':
        return '🔴';
      case 'severe':
        return '⚠️';
      case 'degraded':
        return '🟡';
      case 'recovering':
        return '🟢';
      default:
        return '💾';
    }
  };

  const getTitle = () => {
    switch (dbStatus.healthStatus) {
      case 'critical':
        return 'Database Connection Critical';
      case 'severe':
        return 'Database Connection Unstable';
      case 'degraded':
        return 'Database Connection Lost';
      case 'recovering':
        return 'Database Connection Recovered';
      default:
        return 'Database Status';
    }
  };

  const getDetails = () => {
    if (dbStatus.persistentFailures > 0) {
      return `${dbStatus.persistentFailures} consecutive connection failure(s)`;
    }
    return null;
  };

  return (
    <Banner $level={dbStatus.healthStatus}>
      <BannerContent>
        <Icon>{getIcon()}</Icon>
        <MessageContent>
          <Title>{getTitle()}</Title>
          <Message>{dbStatus.message}</Message>
          {getDetails() && <Details>{getDetails()}</Details>}
        </MessageContent>
      </BannerContent>
      <DismissButton onClick={handleDismiss}>
        Dismiss
      </DismissButton>
    </Banner>
  );
};

export default DatabaseStatusBanner;
