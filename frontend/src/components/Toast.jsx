import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

// Toast Container Styles
const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
  width: 100%;
  pointer-events: none;

  @media (max-width: 768px) {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
`;

const LiveRegion = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

// Toast Item Styles
const ToastItemWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: ${props => {
    switch (props.$variant) {
      case 'success': return '#0d5f2f';
      case 'error': return '#7f1d1d';
      case 'warning': return '#78350f';
      case 'info': return '#1e3a5f';
      default: return '#1e3a5f';
    }
  }};
  border-left: 4px solid ${props => {
    switch (props.$variant) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#3b82f6';
    }
  }};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
  transition: all 0.3s ease;
  pointer-events: auto;
  position: relative;
  overflow: hidden;

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  &.${props => props.$isRemoving ? 'removing' : ''} {
    animation: slideOut 0.3s ease-out forwards;
  }

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }
`;

const ToastIcon = styled.div`
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
`;

const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ToastTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #ffffff;
  margin-bottom: 4px;
  line-height: 1.4;
`;

const ToastMessage = styled.div`
  font-size: 13px;
  color: #e0e0e0;
  line-height: 1.5;
  word-wrap: break-word;
`;

const ToastClose = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
`;

const ToastProgress = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg,
    ${props => {
      switch (props.$variant) {
        case 'success': return '#22c55e';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        case 'info': return '#3b82f6';
        default: return '#3b82f6';
      }
    }},
    ${props => {
      switch (props.$variant) {
        case 'success': return '#16a34a';
        case 'error': return '#dc2626';
        case 'warning': return '#d97706';
        case 'info': return '#2563eb';
        default: return '#2563eb';
      }
    }}
  );
  border-radius: 0 0 8px 8px;
  animation: progress ${props => props.$duration}ms linear;
  transform-origin: left;

  @keyframes progress {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }
`;

// Toast Component
const Toast = ({ toast, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (toast.autoDismiss !== false) {
      const duration = toast.duration || 5000;
      const timer = setTimeout(() => {
        handleRemove();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleRemove = () => {
    if (!isRemoving) {
      setIsRemoving(true);
      setTimeout(() => {
        onRemove(toast.id);
      }, 300);
    }
  };

  const getIcon = () => {
    switch (toast.variant) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <ToastItemWrapper
      $variant={toast.variant}
      $isRemoving={isRemoving}
      className={isRemoving ? 'removing' : ''}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {toast.showProgress && (
        <ToastProgress $variant={toast.variant} $duration={toast.duration || 5000} aria-hidden="true" />
      )}
      <ToastIcon aria-hidden="true">{getIcon()}</ToastIcon>
      <ToastContent>
        {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
        <ToastMessage>{toast.message}</ToastMessage>
      </ToastContent>
      <ToastClose onClick={handleRemove} aria-label="Close notification">
        ×
      </ToastClose>
    </ToastItemWrapper>
  );
};

// Toast Container Component with State Management
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Listen for custom toast events
    const handleShowToast = (event) => {
      const toast = {
        id: Date.now() + Math.random(),
        ...event.detail
      };
      setToasts(prev => [...prev, toast]);
    };

    window.addEventListener('show-toast', handleShowToast);

    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  const handleRemove = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContainerWrapper role="region" aria-live="polite" aria-label="Notifications">
      <LiveRegion aria-live="assertive" aria-atomic="true">
        {toasts.length > 0 && `${toasts.length} notification${toasts.length > 1 ? 's' : ''} available`}
      </LiveRegion>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={handleRemove}
        />
      ))}
    </ToastContainerWrapper>
  );
};

// Helper function to show toasts
export const showToast = (message, options = {}) => {
  const event = new CustomEvent('show-toast', {
    detail: {
      message,
      variant: options.variant || 'success',
      title: options.title,
      duration: options.duration || 5000,
      autoDismiss: options.autoDismiss !== false,
      showProgress: options.showProgress !== false
    }
  });

  window.dispatchEvent(event);
};

// Convenience functions
export const showSuccessToast = (message, options = {}) => {
  showToast(message, { ...options, variant: 'success' });
};

export const showErrorToast = (message, options = {}) => {
  showToast(message, { ...options, variant: 'error' });
};

export const showWarningToast = (message, options = {}) => {
  showToast(message, { ...options, variant: 'warning' });
};

export const showInfoToast = (message, options = {}) => {
  showToast(message, { ...options, variant: 'info' });
};

export default Toast;
