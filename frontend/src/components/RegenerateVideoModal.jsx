import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

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
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;

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

const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.75rem 1rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &::placeholder {
    color: #666;
  }
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &::placeholder {
    color: #666;
  }
`;

const VoiceSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
`;

const VoiceOption = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: ${props => props.$selected ? '#1e2a4a' : '#0f182e'};
  border: 2px solid ${props => props.$selected ? '#e94560' : '#2d3561'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:hover {
    border-color: #e94560;
  }

  input[type="radio"] {
    display: none;
  }
`;

const VoiceIcon = styled.span`
  font-size: 2rem;
`;

const VoiceName = styled.span`
  font-size: 0.85rem;
  color: #eaeaea;
`;

const EffectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

const EffectOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${props => props.$enabled ? '#1e2a4a' : '#0f182e'};
  border: 1px solid ${props => props.$enabled ? '#e94560' : '#2d3561'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #e94560;
  }
`;

const ProgressSection = styled.div`
  padding: 1rem;
  background: #1e2a4a;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #2d3561;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560 0%, #7b2cbf 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.$percent}%;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #a0a0a0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.cancel {
    background: #2d3561;
    color: #eaeaea;

    &:hover {
      background: #3d4571;
    }
  }

  &.regenerate {
    background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
    color: white;

    &:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-2px);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #2d3561;
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: rgba(233, 69, 96, 0.1);
  border-left: 3px solid #e94560;
  border-radius: 4px;
  color: #ff9999;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem;
  background: rgba(0, 210, 106, 0.1);
  border-left: 3px solid #00d26a;
  border-radius: 4px;
  color: #00ff9d;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const WarningMessage = styled.div`
  padding: 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  color: #fbbf24;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const CurrentPostInfo = styled.div`
  padding: 1rem;
  background: #1e2a4a;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const PostInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  color: #a0a0a0;
`;

const InfoValue = styled.span`
  color: #eaeaea;
  font-weight: 600;
`;

// Voice configurations
const VOICES = [
  { id: 'female_1', name: 'Female 1', icon: '👩' },
  { id: 'female_2', name: 'Female 2', icon: '👩‍🦰' },
  { id: 'female_3', name: 'Female 3', icon: '👩‍🦳' },
  { id: 'male_1', name: 'Male 1', icon: '👨' },
  { id: 'male_2', name: 'Male 2', icon: '👨‍🦰' },
  { id: 'male_3', name: 'Male 3', icon: '👨‍🦳' }
];

// Effect configurations
const EFFECTS = [
  { id: 'kenBurns', name: 'Ken Burns Zoom' },
  { id: 'pan', name: 'Pan Effect' },
  { id: 'textOverlay', name: 'Text Overlay' },
  { id: 'vignette', name: 'Vignette' },
  { id: 'fadeIn', name: 'Fade In' },
  { id: 'fadeOut', name: 'Fade Out' }
];

// Generation steps for progress
const GENERATION_STEPS = [
  'Initializing regeneration...',
  'Generating AI image...',
  'Creating narration...',
  'Adding background music...',
  'Processing video effects...',
  'Finalizing video...'
];

function RegenerateVideoModal({
  isOpen,
  onClose,
  onRegenerate,
  post = null
}) {
  const pollingIntervalRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [voice, setVoice] = useState('female_1');
  const [hook, setHook] = useState('');
  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('Read more on Blush 🔥');
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [effects, setEffects] = useState({
    kenBurns: true,
    pan: false,
    textOverlay: true,
    vignette: true,
    fadeIn: false,
    fadeOut: false
  });
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (post) {
      setVoice(post.generationMetadata?.voice || 'female_1');
      setHook(post.hook || '');
      setCaption(post.caption || '');
      setCta(post.cta || 'Read more on Blush 🔥');
      setForceRegenerate(false);  // Reset force flag when opening modal
      setError(null);  // Clear any previous errors
      if (post.generationMetadata?.effects) {
        setEffects(post.generationMetadata.effects);
      }
    }
  }, [post]);

  const handleEffectToggle = (effectId) => {
    setEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
  };

  const pollProgress = async (postId) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/tiered-video/progress/${postId}`);
        if (response.ok) {
          const data = await response.json();
          const progressData = data.data;

          setProgress(progressData.progress || 0);
          setCurrentStep(progressData.currentStep || 'Processing...');

          // Check if complete
          if (progressData.status === 'ready' || progressData.progress >= 100) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setProgress(100);
            setCurrentStep('Complete!');
            setLoading(false);
            setSuccess(true);

            setTimeout(() => {
              onRegenerate?.(progressData);
              handleClose();
            }, 1500);
          }

          // Check if failed
          if (progressData.errorMessage) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setError(progressData.errorMessage);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
      }
    }, 1000); // Poll every second
  };

  const handleRegenerate = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    setProgress(0);
    setCurrentStep('Starting...');

    const options = {
      feedback: feedback || 'Regenerating with new parameters',
      voice: voice !== post?.generationMetadata?.voice ? voice : undefined,
      hook: hook !== post?.hook ? hook : undefined,
      caption: caption !== post?.caption ? caption : undefined,
      cta: cta !== post?.cta ? cta : undefined,
      effects,
      force: forceRegenerate  // Pass force flag
    };

    try {
      const response = await fetch(`/api/tiered-video/regenerate/${post._id}?force=${forceRegenerate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      const result = await response.json();

      if (!response.ok) {
        // Special handling for "already in progress" error
        if (result.error?.includes('already in progress') || result.data?.status === 'generating') {
          setError(result.error || 'Video generation already in progress');
          setLoading(false);
          // Don't clear forceRegenerate - user can click "Force Regenerate" button
          return;
        }
        throw new Error(result.error || result.message || `Failed to start video regeneration (${response.status})`);
      }

      // If already generating or conflict, show current progress
      if (response.status === 409 || result.data?.status === 'generating') {
        setProgress(result.data?.progress || 0);
        setCurrentStep(result.data?.currentStep || 'Already generating...');
      }

      // Start polling for progress
      pollProgress(post._id);

    } catch (err) {
      console.error('Error regenerating video:', err);
      setError(err.message || 'Failed to regenerate video. Please try again.');
      setLoading(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  const handleClose = () => {
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!loading) {
      setFeedback('');
      setVoice('female_1');
      setHook('');
      setCaption('');
      setForceRegenerate(false);
      setEffects({
        kenBurns: true,
        pan: false,
        textOverlay: true,
        vignette: true,
        fadeIn: false,
        fadeOut: false
      });
      setError(null);
      setSuccess(false);
      setProgress(0);
      setCurrentStep('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const regenerationCount = post?.regenerationCount || 0;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && !loading && handleClose()}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Regenerate Video</ModalTitle>
          <CloseButton onClick={handleClose} disabled={loading}>×</CloseButton>
        </ModalHeader>

        {/* Current Post Info */}
        {post && (
          <CurrentPostInfo>
            <PostInfoRow>
              <InfoLabel>Post:</InfoLabel>
              <InfoValue>{post.title}</InfoValue>
            </PostInfoRow>
            <PostInfoRow>
              <InfoLabel>Platform:</InfoLabel>
              <InfoValue>{post.platform}</InfoValue>
            </PostInfoRow>
            <PostInfoRow>
              <InfoLabel>Previous Regenerations:</InfoLabel>
              <InfoValue>{regenerationCount}</InfoValue>
            </PostInfoRow>
          </CurrentPostInfo>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>Video regenerated successfully!</SuccessMessage>}

        {/* Progress Section */}
        {loading && (
          <ProgressSection>
            <ProgressText>
              <span>{currentStep}</span>
              <span>{Math.round(progress)}%</span>
            </ProgressText>
            <ProgressBar>
              <ProgressFill $percent={progress} />
            </ProgressBar>
          </ProgressSection>
        )}

        {/* Feedback Input */}
        <FormSection>
          <FormLabel>What should change? (Optional)</FormLabel>
          <FormTextarea
            placeholder="Describe what you want to change... (e.g., 'slower zoom', 'more dramatic voice', 'add more effects')"
            value={feedback}
            onChange={(e) => !loading && setFeedback(e.target.value)}
            disabled={loading}
          />
        </FormSection>

        {/* Voice Selection */}
        <FormSection>
          <FormLabel>Voice Narration</FormLabel>
          <VoiceSelector>
            {VOICES.map(v => (
              <VoiceOption
                key={v.id}
                $selected={voice === v.id}
                onClick={() => !loading && setVoice(v.id)}
              >
                <input
                  type="radio"
                  name="voice"
                  checked={voice === v.id}
                  onChange={() => setVoice(v.id)}
                  disabled={loading}
                />
                <VoiceIcon>{v.icon}</VoiceIcon>
                <VoiceName>{v.name}</VoiceName>
              </VoiceOption>
            ))}
          </VoiceSelector>
        </FormSection>

        {/* Hook Input */}
        <FormSection>
          <FormLabel>New Hook (Optional)</FormLabel>
          <FormInput
            type="text"
            placeholder="Opening hook text..."
            value={hook}
            onChange={(e) => !loading && setHook(e.target.value)}
            disabled={loading}
          />
        </FormSection>

        {/* Caption Input */}
        <FormSection>
          <FormLabel>New Caption (Optional)</FormLabel>
          <FormTextarea
            placeholder="New caption text..."
            value={caption}
            onChange={(e) => !loading && setCaption(e.target.value)}
            disabled={loading}
          />
        </FormSection>

        {/* CTA Input */}
        <FormSection>
          <FormLabel>New Call-to-Action (Optional, supports emojis 🔥)</FormLabel>
          <FormInput
            type="text"
            placeholder="Read more on Blush 🔥"
            value={cta}
            onChange={(e) => !loading && setCta(e.target.value)}
            disabled={loading}
            maxLength={100}
          />
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
            This text appears on the final slide of the video
          </div>
        </FormSection>

        {/* Effects Selection */}
        <FormSection>
          <FormLabel>Video Effects</FormLabel>
          <EffectsGrid>
            {EFFECTS.map(effect => (
              <EffectOption
                key={effect.id}
                $enabled={effects[effect.id]}
                onClick={() => !loading && handleEffectToggle(effect.id)}
              >
                <input
                  type="checkbox"
                  checked={effects[effect.id]}
                  onChange={() => handleEffectToggle(effect.id)}
                  disabled={loading}
                />
                {effect.name}
              </EffectOption>
            ))}
          </EffectsGrid>
        </FormSection>

        {/* Action Buttons */}
        <ActionButtons>
          <Button className="cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {error?.includes('already in progress') && !forceRegenerate ? (
            <Button className="regenerate" onClick={() => { setForceRegenerate(true); setError(null); }} disabled={loading}>
              ⚠️ Force Regenerate
            </Button>
          ) : (
            <Button className="regenerate" onClick={handleRegenerate} disabled={loading}>
              {loading ? (
                <LoadingSpinner>
                  <Spinner />
                  Regenerating...
                </LoadingSpinner>
              ) : forceRegenerate ? (
                '⚡ Force Regenerate'
              ) : (
                '🔄 Regenerate Video'
              )}
            </Button>
          )}
        </ActionButtons>
      </ModalContent>
    </ModalOverlay>
  );
}

export default RegenerateVideoModal;
