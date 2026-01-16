import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

// Backdrop overlay
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: 1rem;
`;

// Modal container
const ModalContainer = styled.div`
  background: #16213e;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid #2d3561;
  animation: ${scaleIn} 0.3s ease-out;
`;

// Header with icon and title
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ModalIcon = styled.div`
  font-size: 2rem;
  line-height: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

// Message content
const ModalMessage = styled.p`
  margin: 0 0 1.5rem 0;
  color: #c0c0c0;
  font-size: 1rem;
  line-height: 1.6;
`;

// Detail text (optional)
const ModalDetail = styled.p`
  margin: 0 0 1.5rem 0;
  padding: 0.75rem;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 0.9rem;
  font-weight: 500;
`;

// Button container
const ButtonContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

// Base button styles
const BaseButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  outline: none;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #e94560;
    outline-offset: 2px;
  }
`;

// Cancel button (secondary)
const CancelButton = styled(BaseButton)`
  background: transparent;
  border: 2px solid #2d3561;
  color: #eaeaea;

  &:hover {
    background: #2d3561;
    border-color: #3d4561;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

// Confirm button (primary)
const ConfirmButton = styled(BaseButton).withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})`
  background: ${props => {
    if (props.variant === 'danger') return 'linear-gradient(135deg, #e94560 0%, #f8312f 100%)';
    if (props.variant === 'warning') return 'linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)';
    return 'linear-gradient(135deg, #e94560 0%, #7b2cbf 100%)';
  }};
  color: white;

  &:hover {
    box-shadow: 0 4px 12px ${props => {
      if (props.variant === 'danger') return 'rgba(233, 69, 96, 0.4)';
      if (props.variant === 'warning') return 'rgba(255, 149, 0, 0.4)';
      return 'rgba(233, 69, 96, 0.3)';
    }};
    transform: translateY(-2px);
  }
`;

/**
 * ConfirmationModal Component
 *
 * A reusable modal dialog for confirming actions with backdrop overlay.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed (cancel or ESC)
 * @param {Function} props.onConfirm - Callback when confirm button is clicked
 * @param {string} props.title - Modal title
 * @param {string} props.message - Main message text
 * @param {string} props.detail - Optional detail/warning text
 * @param {string} props.icon - Emoji icon to display (default: ⚠️)
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.variant - Visual variant: 'default' | 'danger' | 'warning'
 * @param {boolean} props.hideCancel - Hide the cancel button (default: false)
 *
 * @example
 * <ConfirmationModal
 *   isOpen={showDeleteModal}
 *   onClose={() => setShowDeleteModal(false)}
 *   onConfirm={() => handleDelete()}
 *   title="Delete this item?"
 *   message="This action cannot be undone."
 *   detail="Item: Example Item Name"
 *   icon="🗑️"
 *   confirmText="Delete"
 *   variant="danger"
 * />
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  icon = '⚠️',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  hideCancel = false
}) => {
  const modalRef = useRef(null);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Focus the confirm button when modal opens
    const timeoutId = setTimeout(() => {
      const confirmBtn = modalRef.current?.querySelector('[data-confirm-button]');
      if (confirmBtn) {
        confirmBtn.focus();
      }
    }, 100);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      clearTimeout(timeoutId);
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle confirm button click
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <ModalOverlay onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <ModalContainer ref={modalRef}>
        <ModalHeader>
          <ModalIcon>{icon}</ModalIcon>
          <ModalTitle id="modal-title">{title}</ModalTitle>
        </ModalHeader>

        <ModalMessage>{message}</ModalMessage>

        {detail && <ModalDetail>{detail}</ModalDetail>}

        <ButtonContainer>
          {!hideCancel && (
            <CancelButton onClick={onClose}>
              {cancelText}
            </CancelButton>
          )}
          <ConfirmButton
            onClick={handleConfirm}
            variant={variant}
            data-confirm-button
          >
            {confirmText}
          </ConfirmButton>
        </ButtonContainer>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ConfirmationModal;
