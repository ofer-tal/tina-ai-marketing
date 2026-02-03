/**
 * Tiered Video Configuration Component
 *
 * Provides UI for configuring tiered video generation settings.
 * Allows users to select default tiers, voice preferences, and effects.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { showSuccessToast, showErrorToast } from './Toast';
import LoadingSpinner from './LoadingSpinner.jsx';

const Container = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h3`
  font-size: 1.25rem;
  margin: 0;
  color: #e94560;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Icon = styled.span`
  font-size: 1.5rem;
`;

const StatusBadge = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return '#10b981';
      case 'error': return '#ef4444';
      case 'testing': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
  color: white;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  font-size: 1rem;
  margin: 0 0 1rem 0;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const Card = styled.div`
  background: ${props => props.$selected ? '#1e2a4a' : '#1a1a2e'};
  border: 2px solid ${props => props.$selected ? '#e94560' : '#2d3561'};
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const TierLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${props => {
    switch (props.$tier) {
      case 'tier_1': return '#10b981';
      case 'tier_2': return '#3b82f6';
      case 'tier_3': return '#8b5cf6';
      default: return '#a0a0a0';
    }
  }};
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const TierName = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const TierDescription = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  line-height: 1.4;
  margin-bottom: 0.75rem;
`;

const TierCost = styled.div`
  font-size: 0.9rem;
  color: #e94560;
  font-weight: 600;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #eaeaea;
`;

const Select = styled.select`
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  option {
    background: #16213e;
  }
`;

const EffectToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
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

const EffectLabel = styled.div`
  flex: 1;

  strong {
    display: block;
    color: #eaeaea;
  }

  span {
    display: block;
    font-size: 0.8rem;
    color: #a0a0a0;
    margin-top: 0.25rem;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &.$secondary {
    background: #2d3561;

    &:hover {
      background: #3d4571;
    }
  }
`;

const VoiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const VoiceCard = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: ${props => props.$selected ? '#1e2a4a' : '#1a1a2e'};
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

const VoiceIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const VoiceName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #eaeaea;
`;

const VoiceActor = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
`;

const InfoBox = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const InfoTitle = styled.div`
  font-weight: 600;
  color: #e94560;
  margin-bottom: 0.5rem;
`;

const InfoText = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  line-height: 1.5;
`;

const CostBreakdown = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #2d3561;

  &:last-child {
    border-bottom: none;
  }
`;

const CostLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.875rem;
`;

const CostValue = styled.div`
  color: #eaeaea;
  font-weight: 600;
`;

const TotalCost = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-top: 2px solid #e94560;
  margin-top: 0.5rem;
`;

const voices = [
  { id: 'female_1', name: 'Female 1', actor: 'Rosamund Pike', icon: '👩' },
  { id: 'female_2', name: 'Female 2', actor: 'Jennifer Ikeda', icon: '👩‍🦰' },
  { id: 'female_3', name: 'Female 3', actor: 'Mela Lee', icon: '👩‍🦳' },
  { id: 'male_1', name: 'Male 1', actor: 'Sebastian York', icon: '👨' },
  { id: 'male_2', name: 'Male 2', actor: 'Ray Porter', icon: '👨‍🦱' },
  { id: 'male_3', name: 'Male 3', actor: 'Brian Nishii', icon: '👨‍🦳' },
];

const tiers = [
  {
    id: 'tier_1',
    name: 'Enhanced Static',
    description: 'AI image with motion, narration, and text overlays',
    cost: '0.01-0.05',
    effects: ['Ken Burns zoom', 'Pan', 'Text overlay', 'Vignette']
  },
  {
    id: 'tier_2',
    name: 'AI Avatar',
    description: 'Talking head content with lip-sync',
    cost: '0.10-0.30',
    effects: ['Avatar animation', 'Lip sync', 'Gestures', 'Expressions'],
    disabled: true
  },
  {
    id: 'tier_3',
    name: 'Scene Clips',
    description: 'Full AI-generated video scenes',
    cost: '0.30-1.00',
    effects: ['AI video clips', 'Scene transitions', 'Dynamic motion'],
    disabled: true
  }
];

const effectOptions = [
  { id: 'kenBurns', name: 'Ken Burns Zoom', description: 'Slow zoom in/out effect' },
  { id: 'pan', name: 'Pan', description: 'Subtle horizontal/vertical movement' },
  { id: 'textOverlay', name: 'Text Overlay', description: 'Animated caption text' },
  { id: 'vignette', name: 'Vignette', description: 'Darkened edges for focus' },
  { id: 'fadeIn', name: 'Fade In', description: 'Smooth fade in from black' },
  { id: 'fadeOut', name: 'Fade Out', description: 'Smooth fade out to black' },
];

function TieredVideoConfig() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('tier_1');
  const [selectedVoice, setSelectedVoice] = useState('female_1');
  const [effects, setEffects] = useState({
    kenBurns: true,
    pan: false,
    textOverlay: true,
    vignette: true,
    fadeIn: true,
    fadeOut: true
  });
  const [costEstimate, setCostEstimate] = useState(null);

  useEffect(() => {
    checkHealth();
    fetchCostEstimate();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tiered-video/health');
      const data = await response.json();
      setHealthStatus(data.success ? data.data : { healthy: false });
    } catch (err) {
      setHealthStatus({ healthy: false });
    }
  };

  const fetchCostEstimate = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tiered-video/cost-estimate');
      const data = await response.json();
      if (data.success) {
        setCostEstimate(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cost estimate:', err);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Save tier settings to backend
      const settings = {
        DEFAULT_CONTENT_TIER: selectedTier,
        DEFAULT_VOICE: selectedVoice,
        DEFAULT_VIDEO_EFFECTS: Object.keys(effects).filter(k => effects[k]).join(',')
      };

      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        await fetch(`http://localhost:3001/api/settings/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
      }

      showSuccessToast('Video generation settings saved!', {
        title: 'Settings Saved',
        duration: 3000
      });
    } catch (error) {
      showErrorToast('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/tiered-video/health');
      const data = await response.json();
      if (data.success && data.data.healthy) {
        showSuccessToast('All video generation services are healthy!');
      } else {
        showErrorToast('Some services are not configured properly.');
      }
      checkHealth();
    } catch (error) {
      showErrorToast('Failed to check video services.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Icon>🎬</Icon>
          Tiered Video Generation
        </Title>
        <StatusBadge $status={healthStatus?.healthy ? 'healthy' : 'error'}>
          {healthStatus?.healthy ? '✓ Healthy' : '✗ Not Ready'}
        </StatusBadge>
      </Header>

      {/* Tier Selection */}
      <Section>
        <SectionTitle>📊 Content Tier Selection</SectionTitle>
        <Grid>
          {tiers.map(tier => (
            <Card
              key={tier.id}
              $selected={selectedTier === tier.id}
              onClick={() => !tier.disabled && setSelectedTier(tier.id)}
              style={{ opacity: tier.disabled ? 0.5 : 1, cursor: tier.disabled ? 'not-allowed' : 'pointer' }}
            >
              <TierLabel $tier={tier.id}>
                {tier.disabled && '🔒 '}
                {tier.id.replace('_', ' ')}
              </TierLabel>
              <TierName>{tier.name}</TierName>
              <TierDescription>{tier.description}</TierDescription>
              <TierCost>~${tier.cost} per video</TierCost>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* Voice Selection */}
      <Section>
        <SectionTitle>🎙️ Default Voice Selection</SectionTitle>
        <VoiceGrid>
          {voices.map(voice => (
            <VoiceCard
              key={voice.id}
              $selected={selectedVoice === voice.id}
            >
              <input
                type="radio"
                name="voice"
                value={voice.id}
                checked={selectedVoice === voice.id}
                onChange={() => setSelectedVoice(voice.id)}
              />
              <VoiceIcon>{voice.icon}</VoiceIcon>
              <VoiceName>{voice.name}</VoiceName>
              <VoiceActor>{voice.actor}</VoiceActor>
            </VoiceCard>
          ))}
        </VoiceGrid>
      </Section>

      {/* Effects Selection */}
      <Section>
        <SectionTitle>✨ Video Effects (Tier 1)</SectionTitle>
        <Grid>
          {effectOptions.map(effect => (
            <EffectToggle key={effect.id}>
              <input
                type="checkbox"
                checked={effects[effect.id]}
                onChange={(e) => setEffects(prev => ({ ...prev, [effect.id]: e.target.checked }))}
              />
              <EffectLabel>
                <strong>{effect.name}</strong>
                <span>{effect.description}</span>
              </EffectLabel>
            </EffectToggle>
          ))}
        </Grid>
      </Section>

      {/* Cost Estimate */}
      {costEstimate && (
        <Section>
          <SectionTitle>💰 Cost Estimate per Video</SectionTitle>
          <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '1rem' }}>
            {Object.entries(costEstimate.breakdown || {}).map(([key, value]) => (
              <CostBreakdown key={key}>
                <CostLabel>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CostLabel>
                <CostValue>${value.toFixed(4)}</CostValue>
              </CostBreakdown>
            ))}
            <TotalCost>
              <CostLabel style={{ fontWeight: '600', fontSize: '1rem' }}>Total per Video</CostLabel>
              <CostValue style={{ color: '#e94560', fontSize: '1.1rem' }}>
                ${costEstimate.total.toFixed(4)}
              </CostValue>
            </TotalCost>
          </div>
          <InfoBox>
            <InfoTitle>Monthly Estimate (90 videos)</InfoTitle>
            <InfoText>
              With Tier 1 only: ~${(costEstimate.total * 90).toFixed(2)} / month
            </InfoText>
          </InfoBox>
        </Section>
      )}

      {/* Actions */}
      <Section>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading && <LoadingSpinner inline size="small" color="#ffffff" />}
            {loading ? 'Saving...' : '💾 Save Settings'}
          </Button>
          <Button
            className="$secondary"
            onClick={handleTestConnection}
            disabled={loading}
          >
            {loading ? 'Testing...' : '🔄 Test Services'}
          </Button>
        </div>
      </Section>

      {/* Info */}
      {selectedTier === 'tier_1' && (
        <InfoBox>
          <InfoTitle>Tier 1: Enhanced Static</InfoTitle>
          <InfoText>
            Generates high-quality vertical videos using AI images with smooth Ken Burns effects,
            professional narration, and optional background music. Perfect for TikTok, Instagram Reels,
            and YouTube Shorts.
          </InfoText>
        </InfoBox>
      )}
    </Container>
  );
}

export default TieredVideoConfig;
