import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const LibraryContainer = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  min-width: 250px;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

const Button = styled.button`
  padding: 0.5rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    transform: none;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ContentCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.15);
  }
`;

const ThumbnailContainer = styled.div`
  width: 100%;
  aspect-ratio: 9/16;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const Thumbnail = styled.div`
  width: 100%;
  height: 100%;
  background: ${props => {
    const gradients = {
      tiktok: 'linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)',
      instagram: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
      youtube_shorts: 'linear-gradient(135deg, #ff0000 0%, #282828 100%)'
    };
    return gradients[props.platform] || 'linear-gradient(135deg, #e94560 0%, #7b2cbf 100%)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
`;

const StatusBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    const colors = {
      draft: '#6c757d',
      ready: '#17a2b8',
      approved: '#28a745',
      scheduled: '#007bff',
      posted: '#00d26a',
      failed: '#dc3545',
      rejected: '#ff6b6b'
    };
    return colors[props.status] || '#6c757d';
  }};
  color: white;
`;

const PlatformIcon = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`;

const CardContent = styled.div`
  padding: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  color: #eaeaea;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const ScheduledTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const StoryName = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 0.4rem 0.8rem;
  background: #2d3561;
  border: none;
  border-radius: 4px;
  color: #eaeaea;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: #a0a0a0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;

  h3 {
    margin: 0 0 0.5rem 0;
    color: #eaeaea;
  }

  p {
    margin: 0;
    color: #a0a0a0;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
`;

const PaginationButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.disabled ? '#2d3561' : '#16213e'};
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: ${props => props.disabled ? '#6c757d' : '#eaeaea'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #e94560;
    border-color: #e94560;
  }
`;

const PageInfo = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
`;

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
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModalInfo = styled.div`
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 600px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  color: #eaeaea;
  font-size: 1.2rem;
`;

const ModalCaption = styled.p`
  margin: 0 0 1rem 0;
  color: #c0c0c0;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const ModalHashtags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Hashtag = styled.span`
  padding: 0.25rem 0.75rem;
  background: #2d3561;
  border-radius: 16px;
  color: #e94560;
  font-size: 0.85rem;
  font-weight: 500;
`;

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
`;

const VideoPlayer = styled.video`
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
`;

const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
`;

const CloseButton = styled.button`
  position: absolute;
  top: -40px;
  right: 0;
  padding: 0.5rem 1rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: scale(1.05);
  }
`;

const PlayButton = styled.button`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  background: rgba(233, 69, 96, 0.9);
  border: 3px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  opacity: 0;
  pointer-events: none;

  ${ThumbnailContainer}:hover & {
    opacity: 1;
    pointer-events: auto;
  }

  &:hover {
    background: rgba(233, 69, 96, 1);
    transform: translate(-50%, -50%) scale(1.1);
  }

  &::after {
    content: '▶';
    color: white;
    font-size: 1.5rem;
    margin-left: 4px;
  }
`;

const VideoIndicator = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

function ContentLibrary() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    platform: 'all',
    status: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false
  });
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [filters, pagination.page]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', pagination.limit);
      params.append('skip', (pagination.page - 1) * pagination.limit);

      // Try to fetch from API
      const response = await fetch(`http://localhost:3001/api/content/posts?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.data.posts || []);
      setPagination(prev => ({
        ...prev,
        total: data.data.pagination?.total || 0,
        hasMore: data.data.pagination?.hasMore || false
      }));

    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);

      // Use mock data if API fails (for development)
      let mockPosts = generateMockPosts();

      // Apply filters to mock data
      if (filters.platform !== 'all') {
        mockPosts = mockPosts.filter(post => post.platform === filters.platform);
      }
      if (filters.status !== 'all') {
        mockPosts = mockPosts.filter(post => post.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        mockPosts = mockPosts.filter(post =>
          post.title.toLowerCase().includes(searchLower) ||
          post.storyName.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination to mock data
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedPosts = mockPosts.slice(startIndex, endIndex);

      setPosts(paginatedPosts);
      setPagination(prev => ({
        ...prev,
        total: mockPosts.length,
        hasMore: endIndex < mockPosts.length
      }));
    } finally {
      setLoading(false);
    }
  };

  const generateMockPosts = () => {
    const platforms = ['tiktok', 'instagram', 'youtube_shorts'];
    const statuses = ['draft', 'ready', 'approved', 'scheduled', 'posted'];
    const stories = [
      'The Billionaire\'s Secret Baby',
      'Falling for the CEO',
      'Wedding Night Surprise',
      'The Mafia Don\'s Lover',
      'Summer Romance in Paris'
    ];

    return Array.from({ length: 8 }, (_, i) => {
      const isImage = i % 3 === 2; // Every 3rd post is an image
      return {
        _id: `mock_${i}`,
        title: `${stories[i % stories.length]} - Part ${Math.floor(i / 5) + 1}`,
        platform: platforms[i % platforms.length],
        status: statuses[i % statuses.length],
        contentType: isImage ? 'image' : 'video',
        videoPath: !isImage && i % 2 === 0 ? 'https://www.w3schools.com/html/mov_bbb.mp4' : null,
        imagePath: isImage ? 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&h=1200&fit=crop' : null, // Sample image for testing
        scheduledAt: new Date(Date.now() + i * 3600000).toISOString(),
        storyName: stories[i % stories.length],
        storyCategory: 'Romance',
        caption: 'Amazing story you need to read! 📚❤️ #romance #books',
        hashtags: ['#romance', '#books', '#reading', '#lovestory']
      };
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'In less than an hour';
    if (diffHours < 24) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString();
  };

  const getPlatformEmoji = (platform) => {
    const emojis = {
      tiktok: '🎵',
      instagram: '📷',
      youtube_shorts: '▶️'
    };
    return emojis[platform] || '📱';
  };

  const handleVideoPreview = (post) => {
    if (post.contentType === 'video' && post.videoPath) {
      setSelectedVideo(post);
    } else if (post.contentType === 'image' && post.imagePath) {
      setSelectedVideo(post);
    }
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  const handleThumbnailClick = (post) => {
    if (post.contentType === 'video' || post.contentType === 'image') {
      handleVideoPreview(post);
    }
  };

  if (loading) {
    return (
      <LibraryContainer>
        <Header>
          <Title>Content Library</Title>
        </Header>
        <LoadingSpinner>
          <div>⏳ Loading content...</div>
        </LoadingSpinner>
      </LibraryContainer>
    );
  }

  return (
    <LibraryContainer>
      <Header>
        <Title>Content Library</Title>
        <Button onClick={fetchPosts}>🔄 Refresh</Button>
      </Header>

      <FilterBar>
        <SearchInput
          type="text"
          placeholder="Search by title or story name..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />

        <FilterSelect
          value={filters.platform}
          onChange={(e) => handleFilterChange('platform', e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube_shorts">YouTube Shorts</option>
        </FilterSelect>

        <FilterSelect
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="posted">Posted</option>
          <option value="rejected">Rejected</option>
        </FilterSelect>
      </FilterBar>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid #dc3545',
          borderRadius: '6px',
          color: '#ff6b6b'
        }}>
          ⚠️ Using mock data - Backend disconnected: {error}
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState>
          <h3>No content found</h3>
          <p>Try adjusting your filters or generate some content</p>
        </EmptyState>
      ) : (
        <>
          <ContentGrid>
            {posts.map(post => (
              <ContentCard key={post._id}>
                <ThumbnailContainer onClick={() => handleThumbnailClick(post)}>
                  <Thumbnail platform={post.platform}>
                    {getPlatformEmoji(post.platform)}
                  </Thumbnail>
                  <StatusBadge status={post.status}>
                    {post.status}
                  </StatusBadge>
                  <PlatformIcon>
                    {getPlatformEmoji(post.platform)}
                  </PlatformIcon>
                  {post.contentType === 'video' && (
                    <>
                      <VideoIndicator>🎬 Video</VideoIndicator>
                      <PlayButton />
                    </>
                  )}
                  {post.contentType === 'image' && (
                    <VideoIndicator>🖼️ Image</VideoIndicator>
                  )}
                </ThumbnailContainer>

                <CardContent>
                  <CardTitle title={post.title}>
                    {post.title}
                  </CardTitle>

                  <StoryName>
                    📖 {post.storyName}
                  </StoryName>

                  <CardMeta>
                    <ScheduledTime>
                      🕒 {formatDate(post.scheduledAt)}
                    </ScheduledTime>
                  </CardMeta>

                  <CardActions>
                    <ActionButton onClick={() => handleThumbnailClick(post)}>
                      {post.contentType === 'video' ? '▶ Play' : 'View'}
                    </ActionButton>
                    <ActionButton>Edit</ActionButton>
                  </CardActions>
                </CardContent>
              </ContentCard>
            ))}
          </ContentGrid>

          {selectedVideo && (
            <ModalOverlay onClick={handleCloseModal}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <CloseButton onClick={handleCloseModal}>✕ Close</CloseButton>
                {selectedVideo.contentType === 'video' ? (
                  <VideoContainer>
                    <VideoPlayer
                      src={selectedVideo.videoPath}
                      controls
                      autoPlay
                      onError={(e) => {
                        console.error('Video error:', e);
                        alert('Failed to load video. The video file may not exist yet.');
                      }}
                    />
                  </VideoContainer>
                ) : (
                  <ImageContainer>
                    <ImagePreview
                      src={selectedVideo.imagePath}
                      alt={selectedVideo.title || 'Content preview'}
                      onError={(e) => {
                        console.error('Image error:', e);
                        alert('Failed to load image. The image file may not exist yet.');
                      }}
                    />
                  </ImageContainer>
                )}
                <ModalInfo>
                  <ModalTitle>{selectedVideo.title}</ModalTitle>
                  {selectedVideo.caption && (
                    <ModalCaption>{selectedVideo.caption}</ModalCaption>
                  )}
                  {selectedVideo.hashtags && selectedVideo.hashtags.length > 0 && (
                    <ModalHashtags>
                      {selectedVideo.hashtags.map((tag, index) => (
                        <Hashtag key={index}>{tag}</Hashtag>
                      ))}
                    </ModalHashtags>
                  )}
                </ModalInfo>
              </ModalContent>
            </ModalOverlay>
          )}

          {pagination.total > pagination.limit && (
            <Pagination>
              <PaginationButton
                onClick={handlePreviousPage}
                disabled={pagination.page === 1}
              >
                ← Previous
              </PaginationButton>

              <PageInfo>
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                ({pagination.total} total)
              </PageInfo>

              <PaginationButton
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
              >
                Next →
              </PaginationButton>
            </Pagination>
          )}
        </>
      )}
    </LibraryContainer>
  );
}

export default ContentLibrary;
