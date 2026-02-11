import React, { useState, useEffect, useRef } from 'react';
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
`;

const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
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

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

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
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
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

const PlatformIcon = styled.span`
  font-size: 1.2rem;
  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
`;

// Social platform icons using react-icons
const TikTokIcon = () => <FaTiktok />;
const InstagramIcon = () => <FaInstagram />;
const YouTubeIcon = () => <FaYoutube />;

const VoiceSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
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

const StorySelector = styled.div`
  position: relative;
`;

const StorySearchInput = styled(FormInput)`
  padding-right: 3rem;
`;

const StoryDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  margin-top: 0.25rem;
  display: ${props => props.$visible ? 'block' : 'none'};
  z-index: 10;
`;

const StoryOption = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #2d3561;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #2d3561;
  }
`;

const StoryOptionTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
`;

const StoryOptionMeta = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
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

  &:hover {
    border-color: #e94560;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #e94560;
  }
`;

const PreviewSection = styled.div`
  padding: 1rem;
  background: #0f182e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  margin-top: 1rem;
`;

const PreviewTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.75rem;
`;

const PreviewContent = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const PreviewCaption = styled.div`
  margin-bottom: 0.5rem;
`;

const PreviewHashtags = styled.div`
  color: #7b2cbf;
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

  &.save {
    background: #7b2cbf;
    color: white;

    &:hover {
      background: #8b3fd1;
    }
  }

  &.generate {
    background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
    color: white;

    &:hover {
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
  color: #a0a0a0;
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

const InfoMessage = styled.div`
  padding: 0.75rem;
  background: rgba(123, 44, 191, 0.1);
  border-left: 3px solid #7b2cbf;
  border-radius: 4px;
  color: #b3a0d9;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

// Video Generation Progress Components
const VideoProgressSection = styled.div`
  padding: 1rem;
  background: #1e2a4a;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #e94560;
`;

const VideoProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const VideoProgressTitle = styled.div`
  font-weight: 600;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VideoProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #2d3561;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const VideoProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #e94560 0%, #7b2cbf 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  animation: shimmer 1.5s ease-in-out infinite;

  @keyframes shimmer {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
`;

const VideoProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const TierSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
`;

const TierOption = styled.label`
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

  &:hover {
    border-color: #e94560;
  }

  input[type="radio"] {
    display: none;
  }
`;

const TierIcon = styled.div`
  font-size: 2rem;
`;

const TierName = styled.div`
  font-weight: 600;
  color: #eaeaea;
  font-size: 1rem;
`;

const TierDesc = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const AnimationSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const AnimationOption = styled.label`
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

const TierPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: #0f182e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  text-align: center;
`;

const TierPlaceholderIcon = styled.div`
  font-size: 3rem;
  opacity: 0.7;
`;

const TierPlaceholderText = styled.div`
  font-weight: 600;
  color: #eaeaea;
  font-size: 1rem;
`;

const TierPlaceholderDetail = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

// Tier 2 AI Avatar styles
const AvatarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const AvatarOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: ${props => props.$selected ? '#1e2a4a' : '#0f182e'};
  border: 2px solid ${props => props.$selected ? '#e94560' : '#2d3561'};
  border-radius: 12px;
  cursor: ${props => props.$cursor || 'pointer'};
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const AvatarImage = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #2d3561;
`;

const AvatarInfo = styled.div`
  text-align: center;
`;

const AvatarName = styled.div`
  font-weight: 600;
  color: #eaeaea;
  font-size: 0.95rem;
`;

const AvatarDesc = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
`;

const ScriptCharCount = styled.div`
  text-align: right;
  font-size: 0.8rem;
  color: ${props => props.$warning ? '#e94560' : '#a0a0a0'};
  margin-top: 0.5rem;
`;

const Tier2Notice = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 8px;
`;

const NoticeIcon = styled.div`
  font-size: 1.25rem;
`;

const NoticeText = styled.div`
  font-size: 0.9rem;
  color: #eaeaea;
  line-height: 1.4;
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

// Platform-specific hashtag input styles
const PlatformHashtagsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PlatformHashtagWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PlatformLabel = styled.div`
  min-width: 100px;
  font-weight: 600;
  color: #eaeaea;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PresetSlide = styled.span`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #2d3561;
  border-radius: 4px;
  color: #eaeaea;
`;

// Platform configurations
const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: <TikTokIcon /> },
  { id: 'instagram', name: 'Instagram', icon: <InstagramIcon /> },
  { id: 'youtube_shorts', name: 'YouTube Shorts', icon: <YouTubeIcon /> }
];

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

function CreatePostModal({ isOpen, onClose, onSave, stories = [] }) {
  const pollingIntervalRef = useRef(null);
  const createdPostIdsRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['tiktok']);
  const [selectedStory, setSelectedStory] = useState(null);
  const [storySearch, setStorySearch] = useState('');
  const [showStoryDropdown, setShowStoryDropdown] = useState(false);
  const [caption, setCaption] = useState('');
  const [hook, setHook] = useState('');
  // Platform-specific hashtags - object with keys for each platform
  const [hashtags, setHashtags] = useState({
    tiktok: '#blushapp #romance #storytime #fyp #viral',
    instagram: '',
    youtube_shorts: ''
  });
  const [preset, setPreset] = useState('triple_visual');
  const [voice, setVoice] = useState('female_1');
  const [contentTier, setContentTier] = useState('tier_1');
  const [animationStyle, setAnimationStyle] = useState('ken_burns'); // for tier_1
  const [generateVideo, setGenerateVideo] = useState(false);
  const [allStories, setAllStories] = useState([]);
  const [filteredStories, setFilteredStories] = useState([]);
  const [isFetchingStories, setIsFetchingStories] = useState(false);

  // Music selection state
  const [allMusic, setAllMusic] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [isFetchingMusic, setIsFetchingMusic] = useState(false);

  // Tier 2 AI Avatar state
  const [allAvatars, setAllAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [script, setScript] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isFetchingAvatars, setIsFetchingAvatars] = useState(false);

  // Video generation progress state
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoProgressStep, setVideoProgressStep] = useState('');
  const [showVideoProgress, setShowVideoProgress] = useState(false);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Fetch stories and music when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStories();
      fetchMusic();
      fetchAvatars();
    }
  }, [isOpen]);

  const fetchStories = async (searchTerm = '') => {
    setIsFetchingStories(true);
    try {
      const url = new URL('/api/content/stories/list', window.location.origin);
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }
      url.searchParams.append('limit', '50'); // Get more for better search

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        const storiesData = data.data?.stories || data.stories || [];
        setAllStories(storiesData);
        setFilteredStories(storiesData.slice(0, 10)); // Show top 10 initially
      } else {
        setAllStories([]);
        setFilteredStories([]);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      // Fallback to prop stories
      setAllStories(stories);
      setFilteredStories(stories.slice(0, 10));
    } finally {
      setIsFetchingStories(false);
    }
  };

  // Fetch available music tracks
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

  // Fetch available AI avatars for tier_2
  const fetchAvatars = async () => {
    setIsFetchingAvatars(true);
    try {
      const response = await fetch('/api/ai-avatars/active');
      if (response.ok) {
        const data = await response.json();
        setAllAvatars(data.data.avatars || []);
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
      setAllAvatars([]);
    } finally {
      setIsFetchingAvatars(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (storySearch.trim() !== '') {
        fetchStories(storySearch.trim());
      } else {
        // When empty, just show top 10 from all stories
        fetchStories('');
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [storySearch]);

  const handlePlatformToggle = (platformId) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        // Don't allow deselecting if it's the only one
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const handleSelectStory = (story) => {
    setSelectedStory(story);
    setStorySearch(story.name || story.title);
    setShowStoryDropdown(false);

    // Auto-generate video title from story name (can be overridden)
    if (!videoTitle) {
      setVideoTitle(story.name || story.title);
    }

    // Auto-generate caption preview
    if (!caption) {
      setCaption(`Check out this amazing ${story.category} story! "${story.name || story.title}" 💕`);
    }

    // Auto-generate hook preview
    if (!hook) {
      setHook('You won\'t believe what happens next...');
    }

    // Auto-generate hashtags preview (only for TikTok by default)
    if (!hashtags.tiktok) {
      setHashtags(prev => ({
        ...prev,
        tiktok: '#blushapp #romance #storytime #fyp #viral'
      }));
    }
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    // Story is required for tier_1, optional for tier_2
    if (contentTier !== 'tier_2' && !selectedStory) {
      setError('Please select a story');
      return;
    }
    // For tier_2, either story or title is required
    if (contentTier === 'tier_2' && !selectedStory && !videoTitle) {
      setError('Please select a story or enter a video title');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    // Tier 2 specific validation
    if (contentTier === 'tier_2') {
      if (!selectedAvatar) {
        setError('Please select an AI avatar for Tier 2 posts');
        return;
      }
      if (!script || script.trim().length === 0) {
        setError('Please enter a script for the AI avatar');
        return;
      }
    }

    // Build platform-specific hashtags object
    // Parse hashtags for each platform (space or comma separated, add # if missing)
    const defaultHashtags = ['#blushapp', '#romance', '#storytime', '#fyp', '#viral'];

    const parseHashtags = (hashtagString) => {
      if (!hashtagString || !hashtagString.trim()) return defaultHashtags;
      return hashtagString
        .split(/[\s,]+/)
        .map(h => h.trim())
        .filter(h => h.length > 0)
        .map(h => h.startsWith('#') ? h : `#${h}`);
    };

    const platformHashtags = {};
    selectedPlatforms.forEach(platform => {
      const platformHashtagString = hashtags[platform] || hashtags.tiktok || '';
      platformHashtags[platform] = parseHashtags(platformHashtagString);
    });

    // For backward compatibility, also provide hashtags array for first platform
    const finalHashtags = platformHashtags[selectedPlatforms[0]] || defaultHashtags;

    // Build tier parameters based on selected tier
    const tierParameters = {};
    if (contentTier === 'tier_1') {
      tierParameters.animationStyle = animationStyle;
      tierParameters.preset = preset;
    } else if (contentTier === 'tier_2') {
      tierParameters.avatarId = selectedAvatar.id;
      tierParameters.script = script;
    }

    const postData = {
      storyId: selectedStory?.id || null,
      title: videoTitle || selectedStory?.name || 'Untitled Post',
      platforms: selectedPlatforms,
      caption: caption || (selectedStory ? `Check out this amazing ${selectedStory.category} story!` : 'Join the conversation! 💕'),
      hook: hook || 'You won\'t believe what happens next...',
      hashtags: platformHashtags, // Send platform-specific hashtags
      contentType: 'video',
      contentTier,
      tierParameters,
      voice: contentTier === 'tier_1' ? voice : undefined,
      preset: contentTier === 'tier_1' ? preset : undefined,
      generateVideo: contentTier === 'tier_1' ? generateVideo : false,
      musicId: selectedMusic?.id || null,
      // Tier 2 specific params
      avatarId: contentTier === 'tier_2' ? selectedAvatar.id : undefined,
      script: contentTier === 'tier_2' ? script : undefined
    };

    setLoading(true);

    try {
      const response = await fetch('/api/content/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      const result = await response.json();

      if (contentTier === 'tier_2') {
        // Tier 2: No video generation, close after creation
        onSave?.(result);
        handleClose();
      } else if (generateVideo && result.data?.posts) {
        // Video generation requested, show progress
        const createdPosts = result.data.posts;
        createdPostIdsRef.current = createdPosts.map(p => p._id || p.id);
        setShowVideoProgress(true);
        setVideoProgress(0);
        setVideoProgressStep('Initializing...');

        // Poll for progress
        pollVideoProgress(createdPosts.map(p => p._id || p.id));
      } else {
        // No video generation, just close
        onSave?.(result);
        handleClose();
      }
    } catch (err) {
      console.error('Error creating post:', err);
      // For development, still proceed with optimistic save
      postData.id = Date.now().toString();
      postData.status = 'draft';
      postData.scheduledAt = new Date().toISOString();
      onSave?.({ success: true, posts: [postData] });
      handleClose();
    } finally {
      if (!generateVideo) {
        setLoading(false);
      }
    }
  };

  const pollVideoProgress = (postIds) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      let allComplete = true;
      let totalProgress = 0;
      let currentStep = '';

      for (const postId of postIds) {
        try {
          const response = await fetch(`/api/tiered-video/progress/${postId}`);
          if (response.ok) {
            const data = await response.json();
            const progressData = data.data;

            totalProgress += progressData.progress || 0;
            if (progressData.currentStep) {
              currentStep = progressData.currentStep;
            }

            if (progressData.status === 'generating' || (progressData.progress || 0) < 100) {
              allComplete = false;
            }

            if (progressData.errorMessage) {
              setError(`Video generation failed: ${progressData.errorMessage}`);
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
              setLoading(false);
              setShowVideoProgress(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error polling video progress:', err);
        }
      }

      const avgProgress = Math.round(totalProgress / postIds.length);
      setVideoProgress(avgProgress);
      setVideoProgressStep(currentStep || 'Processing...');

      if (allComplete && avgProgress >= 99) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setVideoProgress(100);
        setVideoProgressStep('Complete!');
        setLoading(false);

        setTimeout(() => {
          setShowVideoProgress(false);
          onSave?.({ success: true });
          handleClose();
        }, 1500);
      }
    }, 1500); // Poll every 1.5 seconds
  };

  const handleClose = () => {
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setSelectedStory(null);
    setStorySearch('');
    setCaption('');
    setHook('');
    setHashtags('');
    setPreset('triple_visual');
    setVoice('female_1');
    setContentTier('tier_1');
    setAnimationStyle('ken_burns');
    setGenerateVideo(false);
    setSelectedPlatforms(['tiktok']);
    setAllStories([]);
    setFilteredStories([]);
    setSelectedMusic(null);
    setShowStoryDropdown(false);
    setError(null);
    setVideoProgress(0);
    setVideoProgressStep('');
    setShowVideoProgress(false);
    setLoading(false);
    // Reset tier_2 state
    setSelectedAvatar(null);
    setScript('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Create New Post</ModalTitle>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </ModalHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Video Generation Progress */}
        {showVideoProgress && (
          <VideoProgressSection>
            <VideoProgressHeader>
              <VideoProgressTitle>
                🎬 Generating Video...
              </VideoProgressTitle>
              <VideoProgressTitle>
                {Math.round(videoProgress)}%
              </VideoProgressTitle>
            </VideoProgressHeader>
            <VideoProgressBar>
              <VideoProgressFill $percent={videoProgress} />
            </VideoProgressBar>
            <VideoProgressText>
              <span>{videoProgressStep}</span>
            </VideoProgressText>
          </VideoProgressSection>
        )}

        {/* Story Selection - Required for tier_1, Optional for tier_2 */}
        {contentTier !== 'tier_2' && (
          <FormSection>
            <FormLabel>
              Select Story <FormLabelRequired>*</FormLabelRequired>
            </FormLabel>
            <StorySelector>
              <StorySearchInput
                type="text"
                placeholder="Search stories by title or category..."
                value={storySearch}
                onChange={(e) => {
                  setStorySearch(e.target.value);
                  setShowStoryDropdown(true);
                }}
                onFocus={() => setShowStoryDropdown(true)}
              />
              {showStoryDropdown && (
                <StoryDropdown $visible={showStoryDropdown}>
                  {isFetchingStories ? (
                    <StoryOption style={{ cursor: 'default', justifyContent: 'center' }}>
                      <StoryOptionTitle>Loading stories...</StoryOptionTitle>
                    </StoryOption>
                  ) : filteredStories.length === 0 ? (
                    <StoryOption style={{ cursor: 'default', justifyContent: 'center' }}>
                      <StoryOptionTitle>No stories found</StoryOptionTitle>
                    </StoryOption>
                  ) : (
                    filteredStories.map(story => (
                      <StoryOption
                        key={story.id}
                        onClick={() => handleSelectStory(story)}
                      >
                        <StoryOptionTitle>{story.name || story.title || 'Untitled Story'}</StoryOptionTitle>
                        <StoryOptionMeta>
                          {story.category || 'Other'} • Spice: {story.spiciness ?? 0}/3
                        </StoryOptionMeta>
                      </StoryOption>
                    ))
                  )}
                </StoryDropdown>
              )}
            </StorySelector>
          </FormSection>
        )}

        {/* Video Title Input - For tier_2 without story */}
        {contentTier === 'tier_2' && (
          <FormSection>
            <FormLabel>
              Video Title {!selectedStory ? <FormLabelRequired>*</FormLabelRequired> : '(optional - defaults to story name)'}
            </FormLabel>
            <FormInput
              type="text"
              placeholder="Enter a title for this video (e.g., What's Your Favorite Romance Trope?)"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
            />
            <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '0.5rem' }}>
              {selectedStory
                ? 'Story is selected. Title will default to story name if left empty.'
                : 'Create an engagement video without a story. Enter a catchy title!'}
            </div>
          </FormSection>
        )}

        {/* Optional Story Selection for tier_2 */}
        {contentTier === 'tier_2' && (
          <FormSection>
            <FormLabel>
              Optional: Link to a Story
            </FormLabel>
            <StorySelector>
              <StorySearchInput
                type="text"
                placeholder="Search stories to link (optional)..."
                value={storySearch}
                onChange={(e) => {
                  setStorySearch(e.target.value);
                  setShowStoryDropdown(true);
                }}
                onFocus={() => setShowStoryDropdown(true)}
              />
              {showStoryDropdown && (
                <StoryDropdown $visible={showStoryDropdown}>
                  {isFetchingStories ? (
                    <StoryOption style={{ cursor: 'default', justifyContent: 'center' }}>
                      <StoryOptionTitle>Loading stories...</StoryOptionTitle>
                    </StoryOption>
                  ) : filteredStories.length === 0 ? (
                    <StoryOption style={{ cursor: 'default', justifyContent: 'center' }}>
                      <StoryOptionTitle>No stories found</StoryOptionTitle>
                    </StoryOption>
                  ) : (
                    filteredStories.map(story => (
                      <StoryOption
                        key={story.id}
                        onClick={() => handleSelectStory(story)}
                      >
                        <StoryOptionTitle>{story.name || story.title || 'Untitled Story'}</StoryOptionTitle>
                        <StoryOptionMeta>
                          {story.category || 'Other'} • Spice: {story.spiciness ?? 0}/3
                        </StoryOptionMeta>
                      </StoryOption>
                    ))
                  )}
                </StoryDropdown>
              )}
            </StorySelector>
            <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '0.5rem' }}>
              {selectedStory
                ? `Linked to: ${selectedStory.name || selectedStory.title}`
                : 'No story linked - this will be a general engagement video'}
            </div>
          </FormSection>
        )}

        {/* Platform Selection */}
        <FormSection>
          <FormLabel>
            Target Platforms <FormLabelRequired>*</FormLabelRequired>
          </FormLabel>
          <PlatformSelector>
            {PLATFORMS.map(platform => (
              <PlatformOption
                key={platform.id}
                $selected={selectedPlatforms.includes(platform.id)}
                onClick={() => handlePlatformToggle(platform.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => handlePlatformToggle(platform.id)}
                />
                <PlatformIcon>{platform.icon}</PlatformIcon>
                {platform.name}
              </PlatformOption>
            ))}
          </PlatformSelector>
        </FormSection>

        {/* Caption Input */}
        <FormSection>
          <FormLabel>Caption</FormLabel>
          <FormTextarea
            placeholder="Enter caption or auto-generate..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </FormSection>

        {/* Hook Input */}
        <FormSection>
          <FormLabel>Hook</FormLabel>
          <FormInput
            type="text"
            placeholder="Opening hook text..."
            value={hook}
            onChange={(e) => setHook(e.target.value)}
          />
        </FormSection>

        {/* Hashtags Input */}
        <FormSection>
          <FormLabel>Hashtags</FormLabel>
          <PlatformHashtagsSection>
            {selectedPlatforms.length === 1 ? (
              // Single platform - show one input
              <PlatformHashtagWrapper>
                <FormInput
                  type="text"
                  placeholder="#hashtag1 #hashtag2..."
                  value={hashtags[selectedPlatforms[0]] || ''}
                  onChange={(e) => setHashtags(prev => ({
                    ...prev,
                    [selectedPlatforms[0]]: e.target.value
                  }))}
                />
              </PlatformHashtagWrapper>
            ) : (
              // Multiple platforms - show platform-specific inputs
              selectedPlatforms.map(platform => (
                <PlatformHashtagWrapper key={platform}>
                  <PlatformLabel>
                    {platform === 'tiktok' && '🎵 TikTok'}
                    {platform === 'instagram' && '📸 Instagram'}
                    {platform === 'youtube_shorts' && '▶️ YouTube'}
                  </PlatformLabel>
                  <FormInput
                    type="text"
                    placeholder={`#hashtag1 #hashtag2...`}
                    value={hashtags[platform] || ''}
                    onChange={(e) => setHashtags(prev => ({
                      ...prev,
                      [platform]: e.target.value
                    }))}
                  />
                </PlatformHashtagWrapper>
              ))
            )}
          </PlatformHashtagsSection>
        </FormSection>

        {/* Content Tier Selection */}
        <FormSection>
          <FormLabel>Content Tier</FormLabel>
          <TierSelector>
            <TierOption
              $selected={contentTier === 'tier_1'}
              onClick={() => !loading && setContentTier('tier_1')}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <input
                type="radio"
                name="tier"
                checked={contentTier === 'tier_1'}
                onChange={() => setContentTier('tier_1')}
                disabled={loading}
              />
              <div>
                <TierIcon>🎬</TierIcon>
                <TierName>Tier 1</TierName>
                <TierDesc>AI Image + TTS + Effects</TierDesc>
              </div>
            </TierOption>
            <TierOption
              $selected={contentTier === 'tier_2'}
              onClick={() => !loading && setContentTier('tier_2')}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <input
                type="radio"
                name="tier"
                checked={contentTier === 'tier_2'}
                onChange={() => setContentTier('tier_2')}
                disabled={loading}
              />
              <div>
                <TierIcon>🎭</TierIcon>
                <TierName>Tier 2</TierName>
                <TierDesc>AI Avatar Video</TierDesc>
              </div>
            </TierOption>
            <TierOption
              $selected={contentTier === 'tier_3'}
              onClick={() => !loading && setContentTier('tier_3')}
              style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: 0.5 }}
            >
              <input
                type="radio"
                name="tier"
                checked={contentTier === 'tier_3'}
                onChange={() => setContentTier('tier_3')}
                disabled={loading}
              />
              <div>
                <TierIcon>🎞️</TierIcon>
                <TierName>Tier 3</TierName>
                <TierDesc>Full AI Video (Coming Soon)</TierDesc>
              </div>
            </TierOption>
          </TierSelector>
        </FormSection>

        {/* Tier-Specific Parameters */}
        {contentTier === 'tier_1' && (
          <FormSection>
            <FormLabel>Animation Style</FormLabel>
            <AnimationSelector>
              <AnimationOption
                $selected={animationStyle === 'ken_burns'}
                onClick={() => !loading && setAnimationStyle('ken_burns')}
              >
                <input
                  type="radio"
                  name="animation"
                  checked={animationStyle === 'ken_burns'}
                  onChange={() => setAnimationStyle('ken_burns')}
                  disabled={loading}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#eaeaea' }}>Ken Burns Zoom</div>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                    Gentle zoom in/out effect
                  </div>
                </div>
              </AnimationOption>
              <AnimationOption
                $selected={animationStyle === 'pan'}
                onClick={() => !loading && setAnimationStyle('pan')}
              >
                <input
                  type="radio"
                  name="animation"
                  checked={animationStyle === 'pan'}
                  onChange={() => setAnimationStyle('pan')}
                  disabled={loading}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#eaeaea' }}>Pan</div>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                    Slow panning movement
                  </div>
                </div>
              </AnimationOption>
              <AnimationOption
                $selected={animationStyle === 'static'}
                onClick={() => !loading && setAnimationStyle('static')}
              >
                <input
                  type="radio"
                  name="animation"
                  checked={animationStyle === 'static'}
                  onChange={() => setAnimationStyle('static')}
                  disabled={loading}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#eaeaea' }}>Static</div>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                    No animation, text overlay only
                  </div>
                </div>
              </AnimationOption>
            </AnimationSelector>
          </FormSection>
        )}

        {/* Tier 2 AI Avatar parameters */}
        {contentTier === 'tier_2' && (
          <>
            <FormSection>
              <FormLabel>
                Select AI Avatar
                <FormLabelRequired>*</FormLabelRequired>
              </FormLabel>
              {isFetchingAvatars ? (
                <div style={{ color: '#a0a0a0', padding: '1rem' }}>Loading avatars...</div>
              ) : allAvatars.length === 0 ? (
                <div style={{ color: '#e94560', padding: '1rem' }}>
                  No avatars available. Please create an avatar in the AI Avatars page first.
                </div>
              ) : (
                <AvatarGrid>
                  {allAvatars.map(avatar => (
                    <AvatarOption
                      key={avatar.id}
                      $selected={selectedAvatar?.id === avatar.id}
                      onClick={() => !loading && setSelectedAvatar(avatar)}
                    >
                      {avatar.imageUrl && (
                        <AvatarImage src={avatar.imageUrl} alt={avatar.name} />
                      )}
                      <AvatarInfo>
                        <AvatarName>{avatar.name}</AvatarName>
                        <AvatarDesc>{avatar.description || avatar.style}</AvatarDesc>
                      </AvatarInfo>
                    </AvatarOption>
                  ))}
                </AvatarGrid>
              )}
            </FormSection>

            <FormSection>
              <FormLabel>
                Script for Avatar
                <FormLabelRequired>*</FormLabelRequired>
              </FormLabel>
              <FormTextarea
                placeholder="Enter the script that the AI avatar will speak..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                disabled={loading}
                rows={6}
              />
              <ScriptCharCount $warning={script.length > 500}>
                {script.length} characters
              </ScriptCharCount>
            </FormSection>

            <FormSection>
              <Tier2Notice>
                <NoticeIcon>ℹ️</NoticeIcon>
                <NoticeText>
                  Tier 2 posts require manual video upload. After creating the post,
                  you'll need to generate the video using HeyGen and upload it via the Content Library.
                </NoticeText>
              </Tier2Notice>
            </FormSection>
          </>
        )}
        {contentTier === 'tier_3' && (
          <FormSection>
            <TierPlaceholder>
              <TierPlaceholderIcon>🎞️</TierPlaceholderIcon>
              <TierPlaceholderText>
                Tier 3 (Full AI Video) parameters coming soon...
              </TierPlaceholderText>
              <TierPlaceholderDetail>
                Will include options for video duration, scene complexity, and production quality
              </TierPlaceholderDetail>
            </TierPlaceholder>
          </FormSection>
        )}

        {/* Video Style Preset */}
        <FormSection>
          <FormLabel>Video Style Preset</FormLabel>
          <PresetSelector>
            {PRESETS.map(p => (
              <PresetOption
                key={p.id}
                $selected={preset === p.id}
                onClick={() => setPreset(p.id)}
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
          <FormLabel>Voice</FormLabel>
          <VoiceSelector>
            {VOICES.map(v => (
              <VoiceOption
                key={v.id}
                $selected={voice === v.id}
                onClick={() => setVoice(v.id)}
              >
                <input
                  type="radio"
                  name="voice"
                  checked={voice === v.id}
                  onChange={() => setVoice(v.id)}
                />
                <VoiceIcon>{v.icon}</VoiceIcon>
                {v.name}
              </VoiceOption>
            ))}
          </VoiceSelector>
        </FormSection>

        {/* Music Selection */}
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
                  <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{track.name}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{track.style} • {track.duration ? Math.round(track.duration) + 's' : 'N/A'}</div>
                </div>
              </MusicOption>
            ))}
          </MusicSelector>
        </FormSection>

        {/* Generate Video Checkbox */}
        <FormSection>
          <CheckboxWrapper>
            <input
              type="checkbox"
              checked={generateVideo}
              onChange={(e) => setGenerateVideo(e.target.checked)}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#eaeaea' }}>
                Generate Video Now
              </div>
              <div style={{ fontSize: '0.9rem', color: '#a0a0a0' }}>
                {generateVideo
                  ? 'Video will be generated immediately (~$0.01-0.05 per post)'
                  : 'Save as draft, generate video later'}
              </div>
            </div>
          </CheckboxWrapper>
        </FormSection>

        {/* Preview */}
        {selectedStory && (
          <PreviewSection>
            <PreviewTitle>Preview</PreviewTitle>
            <PreviewContent>
              <PreviewCaption>
                <strong>Hook:</strong> {hook || 'You won\'t believe what happens next...'}
              </PreviewCaption>
              <PreviewCaption>
                <strong>Caption:</strong> {caption || `Check out this amazing ${selectedStory.category} story!`}
              </PreviewCaption>
              <PreviewHashtags>
                {selectedPlatforms.length === 1
                  ? (hashtags[selectedPlatforms[0]] || hashtags.tiktok || '#blushapp #romance #storytime').split(' ').map((tag, i) => (
                      <span key={i}>{tag} </span>
                    ))
                  : selectedPlatforms.map(platform => (
                      <div key={platform}>
                        <strong>{platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'YouTube'}:</strong>{' '}
                        {(hashtags[platform] || hashtags.tiktok || '#blushapp #romance').split(' ').map((tag, i) => (
                          <span key={i}>{tag} </span>
                        ))}
                      </div>
                    ))
                }
              </PreviewHashtags>
            </PreviewContent>
          </PreviewSection>
        )}

        {/* Estimated Cost */}
        {generateVideo && (
          <InfoMessage>
            💰 Estimated cost: ~${(() => {
              const presetConfig = PRESETS.find(p => p.id === preset) || PRESETS[0];
              const imageCost = presetConfig.imageCount * 0.005;
              const ttsCost = 0.002;
              const musicCost = 0.01;
              const perVideoCost = imageCost + ttsCost + musicCost;
              return (perVideoCost * selectedPlatforms.length).toFixed(3);
            })()} for {selectedPlatforms.length} video(s)
          </InfoMessage>
        )}

        {/* Action Buttons */}
        <ActionButtons>
          <Button className="cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="save" onClick={handleSave} disabled={loading}>
            {loading ? (
              <LoadingSpinner>
                <Spinner />
                Saving...
              </LoadingSpinner>
            ) : (
              'Save as Draft'
            )}
          </Button>
          <Button className="generate" onClick={handleSave} disabled={loading}>
            {loading ? (
              <LoadingSpinner>
                <Spinner />
                Generating...
              </LoadingSpinner>
            ) : (
              'Generate & Save'
            )}
          </Button>
        </ActionButtons>
      </ModalContent>
    </ModalOverlay>
  );
}

export default CreatePostModal;
