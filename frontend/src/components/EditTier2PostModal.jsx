import React, { useState } from 'react';
import styled from 'styled-components';
import { FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa';

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
  max-width: 600px;
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

const FormLabelRequired = styled.span`
  color: #e94560;
  margin-left: 0.25rem;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
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

const ScriptCharCount = styled.div`
  text-align: right;
  font-size: 0.8rem;
  color: ${props => props.$warning ? '#e94560' : '#a0a0a0'};
  margin-top: 0.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const Button = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$primary ? `
    background: #e94560;
    color: white;

    &:hover:not(:disabled) {
      background: #ff6b6b;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
    }
  ` : `
    background: #2d3561;
    color: #eaeaea;

    &:hover:not(:disabled) {
      background: #3d4571;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InfoBox = styled.div`
  padding: 1rem;
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  color: #eaeaea;
  font-size: 0.9rem;
`;

const AvatarInfo = styled.div`
  padding: 1rem;
  background: #1e2a4a;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const AvatarImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e94560;
`;

const AvatarDetails = styled.div`
  flex: 1;
`;

const AvatarName = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
`;

const AvatarDesc = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  border-radius: 8px;
  color: #ff6b6b;
  margin-bottom: 1rem;
`;

// SVG Icons for social platforms
const TikTokIcon = () => <FaTiktok />;

const InstagramIcon = () => <FaInstagram />;

const YouTubeIcon = () => <FaYoutube />;

// Platform selector styles
const PlatformSelector = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const PlatformOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${props => props.$selected ? '#1e2a4a' : '#0f182e'};
  border: 2px solid ${props => props.$selected ? '#e94560' : '#2d3561'};
  border-radius: 8px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  &:hover {
    border-color: ${props => props.$disabled ? '#2d3561' : '#e94560'};
  }

  input[type="checkbox"] {
    display: none;
  }

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: <TikTokIcon /> },
  { id: 'instagram', name: 'Instagram', icon: <InstagramIcon /> },
  { id: 'youtube_shorts', name: 'YouTube Shorts', icon: <YouTubeIcon /> }
];

function EditTier2PostModal({ isOpen, onClose, post, onSave }) {
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState({
    tiktok: '',
    instagram: '',
    youtube_shorts: ''
  });
  const [script, setScript] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form data when post changes
  React.useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      setVideoTitle(post.title || '');

      // Get platforms - handle both new platforms array and legacy platform field
      const platforms = post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0
        ? post.platforms
        : post.platform ? [post.platform] : ['tiktok'];
      setSelectedPlatforms(platforms);

      // Handle hashtags - both array and platform-specific object formats
      if (post.hashtags) {
        if (Array.isArray(post.hashtags)) {
          // Legacy format - same hashtags for all platforms
          const hashtagsStr = post.hashtags.join(', ');
          setHashtags({
            tiktok: hashtagsStr,
            instagram: hashtagsStr,
            youtube_shorts: hashtagsStr
          });
        } else if (typeof post.hashtags === 'object') {
          // Platform-specific structure - load hashtags for each platform
          setHashtags({
            tiktok: (post.hashtags.tiktok || []).join(', '),
            instagram: (post.hashtags.instagram || []).join(', '),
            youtube_shorts: (post.hashtags.youtube_shorts || []).join(', ')
          });
        }
      } else {
        // Default hashtags
        setHashtags({
          tiktok: '#blushapp, #romance, #storytime',
          instagram: '#blushapp, #romance, #storytime',
          youtube_shorts: '#blushapp, #romance, #storytime'
        });
      }

      // tierParameters is a plain object from backend
      const scriptValue = post.tierParameters?.script || '';
      setScript(scriptValue);

      setScheduledAt(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '');
    }
  }, [post]);

  const handlePlatformToggle = (platformId) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        // Don't allow deselecting if it's the only platform
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate scheduled time is at least 4 hours in the future
      if (scheduledAt) {
        const newScheduledDate = new Date(scheduledAt);
        const now = new Date();
        const minScheduleTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        if (newScheduledDate < minScheduleTime) {
          setError('Scheduled time must be at least 4 hours in the future');
          setLoading(false);
          return;
        }
      }

      // Build platform-specific hashtags object
      const platformHashtags = {};
      selectedPlatforms.forEach(platform => {
        const hashtagArray = (hashtags[platform] || '')
          .split(',')
          .map(h => h.trim())
          .filter(h => h.length > 0);

        platformHashtags[platform] = hashtagArray.length > 0
          ? hashtagArray
          : ['#blushapp', '#romance', '#storytime'];
      });

      const updateData = {
        platforms: selectedPlatforms,
        title: videoTitle,
        caption,
        hashtags: platformHashtags,
        script,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined
      };

      const response = await fetch(`/api/content/posts/${post._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }

      onSave?.();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen || !post) return null;

  // tierParameters is a plain object from backend (after serialization)
  const avatarName = post.tierParameters?.avatarName || 'AI Avatar';

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Edit Tier 2 Post</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <InfoBox>
          You can edit the caption, hashtags, platforms, and script for this Tier 2 post. Once the video is uploaded, these fields will be locked.
        </InfoBox>

        <AvatarInfo>
          <AvatarImage
            src={`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">🎭</text></svg>`}
            alt="Avatar"
          />
          <AvatarDetails>
            <AvatarName>{avatarName}</AvatarName>
            <AvatarDesc>AI Avatar for this post</AvatarDesc>
          </AvatarDetails>
        </AvatarInfo>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <form onSubmit={handleSubmit}>
          {/* Video Title */}
          <FormSection>
            <FormLabel>Video Title</FormLabel>
            <FormInput
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Enter the title for this video..."
              disabled={loading}
            />
          </FormSection>

          {/* Platform Selection */}
          <FormSection>
            <FormLabel>Platforms</FormLabel>
            <PlatformSelector>
              {PLATFORMS.map(platform => (
                <PlatformOption
                  key={platform.id}
                  $selected={selectedPlatforms.includes(platform.id)}
                  onClick={() => !loading && handlePlatformToggle(platform.id)}
                  $disabled={loading || post.status === 'posted'}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={() => handlePlatformToggle(platform.id)}
                    disabled={loading || post.status === 'posted'}
                  />
                  <span>{platform.icon}</span>
                  <span>{platform.name}</span>
                </PlatformOption>
              ))}
            </PlatformSelector>
            <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '0.5rem' }}>
              {selectedPlatforms.length === 1
                ? 'Post will be published to one platform'
                : `Post will be published to ${selectedPlatforms.length} platforms`
              }
            </div>
          </FormSection>

          <FormSection>
            <FormLabel>Caption</FormLabel>
            <FormTextarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter the caption for this post..."
              rows={3}
              disabled={loading}
            />
          </FormSection>

          <FormSection>
            <FormLabel>Hashtags (comma separated)</FormLabel>
            {selectedPlatforms.map(platform => (
              <div key={platform} style={{ marginBottom: '0.75rem' }}>
                <FormLabel style={{ fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>
                  {platform === 'youtube_shorts' ? 'YouTube Shorts' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  {platform === 'tiktok' && <FormLabelRequired>*</FormLabelRequired>}
                </FormLabel>
                <FormInput
                  type="text"
                  value={hashtags[platform] || ''}
                  onChange={(e) => setHashtags(prev => ({ ...prev, [platform]: e.target.value }))}
                  placeholder="#hashtag1, #hashtag2..."
                  disabled={loading}
                />
              </div>
            ))}
          </FormSection>

          <FormSection>
            <FormLabel>Script for AI Avatar</FormLabel>
            <FormTextarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter the script that the AI avatar will speak..."
              rows={6}
              disabled={loading}
            />
            <ScriptCharCount $warning={script.length > 500}>
              {script.length} characters
            </ScriptCharCount>
          </FormSection>

          <FormSection>
            <FormLabel>Scheduled For</FormLabel>
            <FormInput
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={loading}
            />
            <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '0.5rem' }}>
              Must be at least 4 hours in the future
            </div>
          </FormSection>

          <ButtonGroup>
            <Button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" $primary disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}

export default EditTier2PostModal;
