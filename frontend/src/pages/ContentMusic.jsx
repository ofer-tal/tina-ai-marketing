/**
 * Content Music Page
 *
 * Manages the background music library.
 * Users can generate AI music tracks via fal.ai, listen to previews, and delete unused tracks.
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const Title = styled.h1`
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 28px;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const FilterSelect = styled.select`
  padding: 10px 16px;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const GenerateButton = styled.button`
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const MusicGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const MusicCard = styled.div`
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #7b2cbf;
    box-shadow: 0 4px 16px rgba(123, 44, 191, 0.2);
  }
`;

const MusicCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

const MusicName = styled.h3`
  font-size: 16px;
  color: #eaeaea;
  margin: 0;
  flex: 1;
  word-break: break-word;
`;

const MusicStyle = styled.span`
  font-size: 11px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  color: white;
  border-radius: 4px;
  text-transform: capitalize;
  white-space: nowrap;
`;

const MusicPrompt = styled.p`
  font-size: 13px;
  color: #a0a0a0;
  font-style: italic;
  margin: 0;
  line-height: 1.4;
`;

const AudioPlayerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AudioPlayer = styled.audio`
  flex: 1;
  height: 32px;

  &::-webkit-media-controls-panel {
    background: #0f182e;
  }
`;

const MusicMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
`;

const DeleteButton = styled.button`
  background: transparent;
  color: #e94560;
  border: 1px solid #e94560;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    color: white;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #a0a0a0;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #2d3561;
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 8px;
  color: #ff9999;
  margin-bottom: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #a0a0a0;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const STATUS_STYLES = {
  available: { color: '#00d26a', label: 'Available' },
  generating: { color: '#ffaa00', label: 'Generating...' },
  failed: { color: '#e94560', label: 'Failed' },
  archived: { color: '#666', label: 'Archived' }
};

// Style options
const MUSIC_STYLES = [
  { id: 'all', name: 'All Styles' },
  { id: 'romantic', name: 'Romantic' },
  { id: 'dramatic', name: 'Dramatic' },
  { id: 'energetic', name: 'Energetic' },
  { id: 'calm', name: 'Calm' },
  { id: 'mysterious', name: 'Mysterious' },
  { id: 'happy', name: 'Happy' },
  { id: 'melancholic', name: 'Melancholic' },
  { id: 'ambient', name: 'Ambient' }
];

// Modal component for generating music
const GenerateMusicModal = ({ isOpen, onClose, onGenerated }) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('ambient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt, style })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate music');
      }

      onGenerated?.();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setPrompt('');
      setStyle('ambient');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Generate Music Track</ModalTitle>
          <CloseButton onClick={handleClose} disabled={loading}>×</CloseButton>
        </ModalHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <FormLabel>Track Name *</FormLabel>
            <FormInput
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dramatic Build Up"
              disabled={loading}
              required
              maxLength={100}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Style *</FormLabel>
            <FormSelect
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              disabled={loading}
            >
              {MUSIC_STYLES.filter(s => s.id !== 'all').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel>Prompt Description *</FormLabel>
            <FormTextarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the mood and feel of the music... e.g., 'slow build up with emotional climax, suitable for romance story reveal'"
              disabled={loading}
              required
              maxLength={500}
            />
            <CharCount>{prompt.length}/500</CharCount>
          </FormGroup>

          <ModalActions>
            <Button type="button" className="cancel" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="generate" disabled={loading || !name.trim() || !prompt.trim()}>
              {loading ? <SpinnerWrapper><Spinner size="small" /> Generating...</SpinnerWrapper> : 'Generate Track'}
            </Button>
          </ModalActions>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: #16213e;
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-size: 24px;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #e94560;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #eaeaea;
`;

const FormInput = styled.input`
  padding: 10px 12px;
  background: #0f182e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const FormTextarea = styled.textarea`
  padding: 10px 12px;
  background: #0f182e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const FormSelect = styled.select`
  padding: 10px 12px;
  background: #0f182e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const CharCount = styled.div`
  font-size: 11px;
  color: #666;
  text-align: right;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
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
      transform: translateY(-1px);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SpinnerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export default function ContentMusic() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStyle, setFilterStyle] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchTracks();

    // Poll for status updates every 5 seconds when there are generating tracks
    const interval = setInterval(() => {
      const hasGenerating = tracks.some(t => t.status === 'generating');
      if (hasGenerating) {
        fetchTracks(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [filterStyle]);

  const fetchTracks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/music/list');
      if (filterStyle !== 'all') {
        url.searchParams.append('style', filterStyle);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (response.ok) {
        setTracks(data.data.tracks || []);
      } else {
        setError(data.error || 'Failed to fetch music tracks');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this music track?')) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/music/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTracks(prev => prev.filter(t => t.id !== id));
      } else {
        const data = await response.json();
        alert('Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerated = () => {
    fetchTracks();
  };

  const filteredTracks = tracks.filter(t =>
    filterStyle === 'all' || t.style === filterStyle
  );

  return (
    <PageContainer>
      <Header>
        <Title>🎵 Background Music Library</Title>
        <HeaderActions>
          <FilterSelect
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value)}
          >
            {MUSIC_STYLES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </FilterSelect>
          <GenerateButton onClick={() => setShowGenerateModal(true)}>
            <span>+</span> Generate Track
          </GenerateButton>
        </HeaderActions>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingSpinner>
          <Spinner />
          Loading music library...
        </LoadingSpinner>
      ) : filteredTracks.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🎵</EmptyIcon>
          <h3>No music tracks found</h3>
          <p>Generate your first AI background music track to get started!</p>
        </EmptyState>
      ) : (
        <MusicGrid>
          {filteredTracks.map(track => {
            const statusStyle = STATUS_STYLES[track.status] || STATUS_STYLES.available;

            return (
              <MusicCard key={track.id}>
                <MusicCardHeader>
                  <MusicName>{track.name}</MusicName>
                  <MusicStyle>{track.style}</MusicStyle>
                </MusicCardHeader>

                <MusicPrompt>"{track.prompt}"</MusicPrompt>

                {track.status === 'generating' && (
                  <div style={{ color: STATUS_STYLES.generating.color, fontSize: '13px' }}>
                    ⏳ Generating music... (takes ~30 seconds)
                  </div>
                )}

                {track.status === 'failed' && (
                  <div style={{ color: STATUS_STYLES.failed.color, fontSize: '13px' }}>
                    ❌ Generation failed. Try again.
                  </div>
                )}

                {track.status === 'available' && (
                  <AudioPlayerWrapper>
                    <AudioPlayer
                      controls
                      src={track.audioPath}
                    />
                  </AudioPlayerWrapper>
                )}

                <MusicMeta>
                  <span>
                    {track.duration ? `${Math.round(track.duration)}s` : '--'}
                    {' • '}
                    Used {track.timesUsed || 0}x
                  </span>
                  <span style={{ color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                </MusicMeta>

                {track.status === 'available' && (
                  <DeleteButton
                    onClick={() => handleDelete(track.id)}
                    disabled={deletingId === track.id}
                  >
                    {deletingId === track.id ? 'Deleting...' : 'Delete'}
                  </DeleteButton>
                )}
              </MusicCard>
            );
          })}
        </MusicGrid>
      )}

      <GenerateMusicModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={handleGenerated}
      />
    </PageContainer>
  );
}
