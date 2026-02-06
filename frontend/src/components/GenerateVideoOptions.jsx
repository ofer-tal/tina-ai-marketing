import React, { useState, useEffect } from 'react';
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

const TextInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0f182e;
  border: 2px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
`;

// Music selector styles
const MusicSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
`;

const MusicOption = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
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

const CostDisplay = styled.div`
  padding: 1rem;
  background: linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(233, 69, 96, 0.1) 100%);
  border: 1px solid #7b2cbf;
  border-radius: 8px;
  margin-bottom: 1.5rem;
`;

const CostLabel = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
  margin-bottom: 0.25rem;
`;

const CostValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #eaeaea;
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

  &.generate {
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

// Preset selector styles
const PresetSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const PresetOption = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: ${props => props.$selected ? '#1e2a4a' : '#0f182e'};
  border: 2px solid ${props => props.$selected ? '#e94560' : '#2d3561'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  input[type="radio"] {
    display: none;
  }
`;

const PresetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PresetIcon = styled.span`
  font-size: 1.5rem;
`;

const PresetName = styled.span`
  font-weight: 600;
  color: #eaeaea;
`;

const PresetDesc = styled.span`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const PresetSlides = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

const PresetSlide = styled.span`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #2d3561;
  border-radius: 4px;
  color: #eaeaea;
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

// Preset configurations
const PRESETS = [
  {
    id: 'triple_visual',
    name: 'Triple Visual',
    description: '3 AI images with text overlays',
    icon: '🎬',
    slides: ['Image 1', 'Image 2', 'Image 3'],
    imageCount: 3
  },
  {
    id: 'hook_first',
    name: 'Hook First',
    description: 'Text slide + 2 AI images',
    icon: '📝',
    slides: ['Gradient Hook', 'Image 1', 'Image 2'],
    imageCount: 2
  }
];

// Effect configurations
const EFFECTS = [
  { id: 'kenBurns', name: 'Ken Burns Zoom', description: 'Subtle zoom effect' },
  { id: 'textOverlay', name: 'Text Overlay', description: 'Caption on video' },
  { id: 'vignette', name: 'Vignette', description: 'Dark edges effect' },
  { id: 'fadeIn', name: 'Fade In', description: 'Smooth opening' },
  { id: 'fadeOut', name: 'Fade Out', description: 'Smooth ending' }
];

// Generation steps for progress
const GENERATION_STEPS = [
  'Initializing...',
  'Generating AI image...',
  'Creating narration...',
  'Adding background music...',
  'Processing video effects...',
  'Finalizing video...'
];

function GenerateVideoOptions({
  isOpen,
  onClose,
  onGenerate,
  post = null
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [preset, setPreset] = useState('triple_visual');
  const [voice, setVoice] = useState('female_1');
  const [cta, setCta] = useState('Read more on Blush 🔥');
  const [effects, setEffects] = useState({
    kenBurns: true,
    pan: false,
    textOverlay: true,
    vignette: true,
    fadeIn: true,
    fadeOut: true
  });

  // Music selection state
  const [allMusic, setAllMusic] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [isFetchingMusic, setIsFetchingMusic] = useState(false);

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    if (post?.generationMetadata?.voice) {
      setVoice(post.generationMetadata.voice);
    }
    if (post?.generationMetadata?.preset) {
      setPreset(post.generationMetadata.preset);
    }
    if (post?.generationMetadata?.effects) {
      setEffects(post.generationMetadata.effects);
    }
    if (post?.cta) {
      setCta(post.cta);
    }
  }, [post]);

  // Fetch music tracks when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMusic();
    }
  }, [isOpen]);

  const fetchMusic = async () => {
    setIsFetchingMusic(true);
    try {
      const response = await fetch('/api/music/list');
      if (response.ok) {
        const data = await response.json();
        setAllMusic(data.data.tracks || []);
      }
    } catch (err) {
      console.error('Error fetching music:', err);
      setAllMusic([]);
    } finally {
      setIsFetchingMusic(false);
    }
  };

  const handleEffectToggle = (effectId) => {
    setEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
  };

  const estimateCost = () => {
    const presetConfig = PRESETS.find(p => p.id === preset) || PRESETS[0];
    const imageCost = presetConfig.imageCount * 0.005; // $0.005 per image
    const ttsCost = 0.002;
    const musicCost = selectedMusic ? 0.01 : 0;

    let total = imageCost + ttsCost + musicCost;

    // Add small cost for effects
    const activeEffects = Object.values(effects).filter(v => v).length;
    total += activeEffects * 0.001;

    return total.toFixed(3);
  };

  const simulateProgress = () => {
    let progress = 0;
    let stepIndex = 0;

    setCurrentStep(GENERATION_STEPS[0]);

    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setCurrentStep('Complete!');
      } else {
        const newStepIndex = Math.floor((progress / 100) * GENERATION_STEPS.length);
        if (newStepIndex !== stepIndex && newStepIndex < GENERATION_STEPS.length) {
          stepIndex = newStepIndex;
          setCurrentStep(GENERATION_STEPS[stepIndex]);
        }
      }
      setProgress(Math.min(progress, 100));
    }, 500);
  };

  const handleGenerate = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    setProgress(0);

    // Start progress simulation
    const progressInterval = simulateProgress();

    const options = {
      preset,
      voice,
      cta,
      musicId: selectedMusic?.id || null,
      effects
    };

    try {
      // Use different endpoint based on whether we're regenerating or creating new
      const isRegeneration = post?._id != null;
      const url = isRegeneration
        ? `/api/tiered-video/regenerate/${post._id}`
        : `/api/tiered-video/generate-tier1`;

      const body = isRegeneration
        ? {
            ...options,
            feedback: 'Regenerating video'
          }
        : {
            postId: post?._id,
            storyId: post?.storyId,
            ...options
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('Complete!');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const result = await response.json();
      setSuccess(true);

      setTimeout(() => {
        onGenerate?.(result);
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('Error generating video:', err);
      clearInterval(progressInterval);
      setError(err.message || 'Failed to generate video. Please try again.');
      setLoading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPreset('triple_visual');
      setVoice('female_1');
      setCta('Read more on Blush 🔥');
      setIncludeMusic(true);
      setSelectedMusic(null);
      setEffects({
        kenBurns: true,
        pan: false,
        textOverlay: true,
        vignette: true,
        fadeIn: true,
        fadeOut: true
      });
      setError(null);
      setSuccess(false);
      setProgress(0);
      setCurrentStep('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && !loading && handleClose()}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Video Generation Options</ModalTitle>
          <CloseButton onClick={handleClose} disabled={loading}>×</CloseButton>
        </ModalHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>Video generated successfully!</SuccessMessage>}

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

        {/* Preset Selection */}
        <FormSection>
          <FormLabel>Video Style Preset</FormLabel>
          <PresetSelector>
            {PRESETS.map(p => (
              <PresetOption
                key={p.id}
                $selected={preset === p.id}
                onClick={() => !loading && setPreset(p.id)}
              >
                <input
                  type="radio"
                  name="preset"
                  checked={preset === p.id}
                  onChange={() => setPreset(p.id)}
                  disabled={loading}
                />
                <PresetHeader>
                  <PresetIcon>{p.icon}</PresetIcon>
                  <PresetName>{p.name}</PresetName>
                </PresetHeader>
                <PresetDesc>{p.description}</PresetDesc>
                <PresetSlides>
                  {p.slides.map((s, i) => <PresetSlide key={i}>{s}</PresetSlide>)}
                </PresetSlides>
              </PresetOption>
            ))}
          </PresetSelector>
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

        {/* CTA Input */}
        <FormSection>
          <FormLabel>Call-to-Action (supports emojis 🔥)</FormLabel>
          <TextInput
            type="text"
            value={cta}
            onChange={(e) => !loading && setCta(e.target.value)}
            disabled={loading}
            placeholder="Read more on Blush 🔥"
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
                <div>
                  <div style={{ fontWeight: 600, color: '#eaeaea' }}>{effect.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>{effect.description}</div>
                </div>
              </EffectOption>
            ))}
          </EffectsGrid>
        </FormSection>

        {/* Background Music */}
        <FormSection>
          <FormLabel>Background Music (Optional)</FormLabel>
          <MusicSelector>
            <MusicOption
              $selected={!selectedMusic}
              onClick={() => !loading && setSelectedMusic(null)}
            >
              <input
                type="radio"
                name="music"
                checked={!selectedMusic}
                onChange={() => setSelectedMusic(null)}
                disabled={loading}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>🔇</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>No Music</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Narration only</div>
              </div>
            </MusicOption>
            {allMusic.map(track => (
              <MusicOption
                key={track.id}
                $selected={selectedMusic?.id === track.id}
                onClick={() => !loading && setSelectedMusic(track)}
              >
                <input
                  type="radio"
                  name="music"
                  checked={selectedMusic?.id === track.id}
                  onChange={() => setSelectedMusic(track)}
                  disabled={loading}
                />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px' }}>🎵</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{track.style}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{track.name}</div>
                </div>
              </MusicOption>
            ))}
          </MusicSelector>
        </FormSection>

        {/* Cost Estimate */}
        <CostDisplay>
          <CostLabel>Estimated Cost</CostLabel>
          <CostValue>${estimateCost()}</CostValue>
        </CostDisplay>

        {/* Action Buttons */}
        <ActionButtons>
          <Button className="cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="generate" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <LoadingSpinner>
                <Spinner />
                Generating...
              </LoadingSpinner>
            ) : (
              'Generate Video'
            )}
          </Button>
        </ActionButtons>
      </ModalContent>
    </ModalOverlay>
  );
}

export default GenerateVideoOptions;
