import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaTiktok, FaLink, FaCheck } from 'react-icons/fa';
import { showSuccessToast, showErrorToast } from './Toast.jsx';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: #16213e;
  border-radius: 16px;
  padding: 2rem;
  max-width: 550px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TitleIcon = styled(FaTiktok)`
  color: #e94560;
  font-size: 1.75rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
  line-height: 1;
  padding: 0.25rem;

  &:hover {
    color: #e94560;
  }
`;

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #eaeaea;
  font-weight: 600;
  font-size: 0.95rem;
`;

const FormLabelRequired = styled.span`
  color: #e94560;
  margin-left: 0.25rem;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  color: #a0a0a0;
  pointer-events: none;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: #1e2a4a;
  border: 1px solid ${props => props.$hasError ? '#ef4444' : '#2d3561'};
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : '#e94560'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(233, 69, 96, 0.1)'};
  }

  &::placeholder {
    color: #666;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoBox = styled.div`
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid #7b2cbf;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const InfoTitle = styled.div`
  color: #eaeaea;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const InfoText = styled.div`
  color: #c0c0c0;
  font-size: 0.85rem;
  line-height: 1.5;
`;

const PostCaptionPreview = styled.div`
  background: rgba(45, 53, 97, 0.5);
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const CaptionLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const CaptionText = styled.div`
  color: #eaeaea;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.$primary && `
    background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
  `}

  ${props => props.$secondary && `
    background: transparent;
    border: 2px solid #2d3561;
    color: #eaeaea;

    &:hover {
      border-color: #e94560;
      color: #e94560;
    }
  `}
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SuccessBox = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  animation: fadeIn 0.3s ease-out;
`;

const SuccessTitle = styled.div`
  color: #22c55e;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
`;

const SuccessMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.span`
  color: #a0a0a0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.span`
  color: #eaeaea;
  font-size: 1.1rem;
  font-weight: 600;
`;

const StyledLink = styled.a`
  color: #7b2cbf;
  text-decoration: none;
  font-size: 0.85rem;

  &:hover {
    text-decoration: underline;
  }
`;

/**
 * ManualTikTokMatchDialog
 *
 * Dialog for manually matching a post to a TikTok video when automatic matching fails.
 */
export default function ManualTikTokMatchDialog({
  postId,
  postCaption,
  isOpen,
  onClose,
  onSuccess
}) {
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTiktokUrl('');
      setError(null);
      setValidationError(null);
      setSuccessData(null);
    }
  }, [isOpen]);

  // Validate input
  useEffect(() => {
    setValidationError(null);

    if (!tiktokUrl.trim()) {
      return;
    }

    const trimmed = tiktokUrl.trim();

    // Check if it's a direct video ID (numeric, 10-20 digits)
    if (/^\d{10,20}$/.test(trimmed)) {
      return; // Valid
    }

    // Check if it's a TikTok URL
    const urlPatterns = [
      /tiktok\.com\/@[\w.-]+\/video\/\d+/,
      /tiktok\.com\/v\/\d+/,
      /vm\.tiktok\.com\/[\w]+/,
    ];

    const isValidUrl = urlPatterns.some(pattern => pattern.test(trimmed));

    if (!isValidUrl) {
      setValidationError('Please enter a valid TikTok URL (e.g., https://www.tiktok.com/@user/video/1234567890) or video ID.');
    }
  }, [tiktokUrl]);

  const isValidInput = tiktokUrl.trim().length > 0 && !validationError;

  const handleSubmit = async () => {
    if (!isValidInput) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tiktok/manual-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId,
          tiktokUrl: tiktokUrl.trim()
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to match video');
      }

      // Show success state
      setSuccessData(result.data);
      showSuccessToast('TikTok video matched successfully!');

      // Call success callback after a delay to show the success state
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.data);
        }
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to match video. Please try again.');
      showErrorToast(err.message || 'Failed to match video');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isValidInput && !loading) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <TitleIcon />
            Manual TikTok Match
          </ModalTitle>
          <CloseButton onClick={handleClose} disabled={loading}>
            ×
          </CloseButton>
        </ModalHeader>

        <InfoBox>
          <InfoTitle>ℹ️ Why is this needed?</InfoTitle>
          <InfoText>
            The automatic video matcher couldn't find this video on TikTok. This can happen when
            there's a timing mismatch between when the post was scheduled and when it was actually posted.
          </InfoText>
        </InfoBox>

        {postCaption && (
          <PostCaptionPreview>
            <CaptionLabel>Post Caption</CaptionLabel>
            <CaptionText>{postCaption}</CaptionText>
          </PostCaptionPreview>
        )}

        {successData ? (
          <SuccessBox>
            <SuccessTitle>
              <FaCheck />
              Successfully matched!
            </SuccessTitle>
            <SuccessMetrics>
              <MetricItem>
                <MetricLabel>Video ID</MetricLabel>
                <MetricValue>{successData.videoId}</MetricValue>
              </MetricItem>
              <MetricItem>
                <MetricLabel>Views</MetricLabel>
                <MetricValue>{successData.views?.toLocaleString() || 0}</MetricValue>
              </MetricItem>
              <MetricItem>
                <MetricLabel>Likes</MetricLabel>
                <MetricValue>{successData.likes?.toLocaleString() || 0}</MetricValue>
              </MetricItem>
              <MetricItem>
                <MetricLabel>Engagement Rate</MetricLabel>
                <MetricValue>{successData.engagementRate?.toFixed(2) || 0}%</MetricValue>
              </MetricItem>
            </SuccessMetrics>
            <div style={{ marginTop: '1rem' }}>
              <StyledLink
                href={successData.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaLink /> View on TikTok
              </StyledLink>
            </div>
          </SuccessBox>
        ) : (
          <>
            <FormSection>
              <FormLabel htmlFor="tiktok-url">
                TikTok URL or Video ID
                <FormLabelRequired>*</FormLabelRequired>
              </FormLabel>
              <InputContainer>
                <InputIcon>
                  <FaLink />
                </InputIcon>
                <FormInput
                  id="tiktok-url"
                  type="text"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://www.tiktok.com/@user/video/7606860514483916045"
                  disabled={loading}
                  $hasError={!!validationError || !!error}
                  autoFocus
                />
              </InputContainer>
              {validationError && (
                <ErrorMessage>⚠️ {validationError}</ErrorMessage>
              )}
              {error && (
                <ErrorMessage>❌ {error}</ErrorMessage>
              )}
            </FormSection>

            <ButtonGroup>
              <Button
                $secondary
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                $primary
                onClick={handleSubmit}
                disabled={loading || !isValidInput}
              >
                {loading && <LoadingSpinner />}
                {loading ? 'Matching...' : 'Match Video'}
              </Button>
            </ButtonGroup>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
}
