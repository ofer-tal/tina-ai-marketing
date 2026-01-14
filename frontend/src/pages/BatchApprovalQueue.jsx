import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 0;
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

const RefreshButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #d63850;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 250px;
  padding: 0.75rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  &::placeholder {
    color: #666;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const BulkActionsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  opacity: ${props => props.$visible ? 1 : 0.5};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const SelectedCount = styled.span`
  font-weight: 600;
  color: #e94560;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const BulkButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: ${props => props.$variant === 'approve' ? '#00d26a' : props.$variant === 'reject' ? '#e94560' : '#7b2cbf'};
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

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
`;

const QueueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const QueueItem = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: ${props => props.$selected ? '#1e2a4a' : '#16213e'};
  border: ${props => props.$selected ? '2px solid #e94560' : '1px solid #2d3561'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.1);
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  margin-top: 0.5rem;
  cursor: pointer;
  accent-color: #e94560;
`;

const ContentPreview = styled.div`
  flex: 1;
  display: flex;
  gap: 1rem;
`;

const Thumbnail = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
`;

const ContentInfo = styled.div`
  flex: 1;
`;

const ContentTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #eaeaea;
`;

const ContentMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #a0a0a0;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${props => {
    switch (props.$status) {
      case 'draft': return '#3a3a5a';
      case 'ready': return '#0ea5e9';
      case 'approved': return '#00d26a';
      case 'rejected': return '#ef4444';
      case 'scheduled': return '#f59e0b';
      case 'posted': return '#8b5cf6';
      default: return '#3a3a5a';
    }
  }};
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const ContentCaption = styled.p`
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: #a0a0a0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const QuickActionButton = styled.button`
  padding: 0.5rem 1rem;
  background: #2d3561;
  border: 1px solid #3d4571;
  border-radius: 6px;
  color: #eaeaea;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3d4571;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #eaeaea;
`;

const EmptyText = styled.p`
  margin: 0;
  color: #a0a0a0;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

function BatchApprovalQueue() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedPosts, setSelectedPosts] = useState(new Set());

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3010/api/content/posts');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      // API returns { success: true, data: { posts: [...] } }
      const data = result?.data?.posts || result || [];
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Use mock data for development
      setPosts([
        {
          id: 1,
          title: "The Billionaire's Secret Baby - Part 1",
          storyName: "The Billionaire's Secret Baby",
          caption: "Amazing story you need to read! 📚❤️ #romance #books",
          platform: 'tiktok',
          status: 'draft',
          contentType: 'video',
          scheduledFor: new Date(Date.now() + 3600000).toISOString()
        },
        {
          id: 2,
          title: "Falling for the CEO - Part 1",
          storyName: "Falling for the CEO",
          caption: "CEO romance that will make your heart melt! 💕 #romance #ceo",
          platform: 'instagram',
          status: 'ready',
          contentType: 'image',
          scheduledFor: new Date(Date.now() + 7200000).toISOString()
        },
        {
          id: 3,
          title: "Wedding Night Surprise - Part 1",
          storyName: "Wedding Night Surprise",
          caption: "Steamy wedding night content! 🔥 #romance #wedding",
          platform: 'youtube',
          status: 'draft',
          contentType: 'video',
          scheduledFor: new Date(Date.now() + 10800000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectPost = (postId) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const toggleSelectAll = () => {
    const filteredPosts = getFilteredPosts();
    if (selectedPosts.size === filteredPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(filteredPosts.map(p => p.id)));
    }
  };

  const getFilteredPosts = () => {
    return posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) ||
                           post.storyName.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
      return matchesSearch && matchesPlatform;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedPosts.size === 0) return;

    try {
      const promises = Array.from(selectedPosts).map(id =>
        fetch(`http://localhost:3010/api/content/posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        })
      );

      await Promise.all(promises);
      alert(`✅ Approved ${selectedPosts.size} post(s)!`);
      setSelectedPosts(new Set());
      fetchPosts();
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert(`✅ Approved ${selectedPosts.size} post(s)! (Note: Backend not connected)`);
      // Optimistic update for development
      setPosts(posts.map(p =>
        selectedPosts.has(p.id) ? { ...p, status: 'approved' } : p
      ));
      setSelectedPosts(new Set());
    }
  };

  const handleBulkReject = async () => {
    if (selectedPosts.size === 0) return;

    const reason = prompt('Enter rejection reason for all selected posts:');
    if (!reason) return;

    try {
      const promises = Array.from(selectedPosts).map(id =>
        fetch(`http://localhost:3010/api/content/posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected', rejectionReason: reason })
        })
      );

      await Promise.all(promises);
      alert(`❌ Rejected ${selectedPosts.size} post(s)!`);
      setSelectedPosts(new Set());
      fetchPosts();
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      alert(`❌ Rejected ${selectedPosts.size} post(s)! (Note: Backend not connected)`);
      // Optimistic update for development
      setPosts(posts.map(p =>
        selectedPosts.has(p.id) ? { ...p, status: 'rejected' } : p
      ));
      setSelectedPosts(new Set());
    }
  };

  const handleQuickApprove = async (postId) => {
    try {
      await fetch(`http://localhost:3010/api/content/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      fetchPosts();
    } catch (error) {
      console.error('Error approving post:', error);
      // Optimistic update
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
    }
  };

  const handleQuickReject = async (postId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await fetch(`http://localhost:3010/api/content/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason })
      });
      fetchPosts();
    } catch (error) {
      console.error('Error rejecting post:', error);
      // Optimistic update
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'rejected' } : p));
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'tiktok': return '🎵';
      case 'instagram': return '📷';
      case 'youtube': return '▶️';
      default: return '📱';
    }
  };

  const getContentTypeIcon = (type) => {
    return type === 'video' ? '🎬 Video' : '🖼️ Image';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'In less than an hour';
    if (hours === 1) return 'In 1 hour';
    return `In ${hours} hours`;
  };

  const filteredPosts = getFilteredPosts();

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>⏳ Loading approval queue...</LoadingState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>Batch Approval Queue</Title>
        <RefreshButton onClick={fetchPosts}>🔄 Refresh</RefreshButton>
      </Header>

      <FilterBar>
        <SearchInput
          type="text"
          placeholder="Search by title or story name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube Shorts</option>
        </FilterSelect>
      </FilterBar>

      <BulkActionsBar $visible={selectedPosts.size > 0}>
        <SelectedCount>{selectedPosts.size} post(s) selected</SelectedCount>
        <ActionButtons>
          <BulkButton $variant="approve" onClick={handleBulkApprove}>
            ✅ Approve All
          </BulkButton>
          <BulkButton $variant="reject" onClick={handleBulkReject}>
            ❌ Reject All
          </BulkButton>
        </ActionButtons>
      </BulkActionsBar>

      {filteredPosts.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📭</EmptyIcon>
          <EmptyTitle>No posts in queue</EmptyTitle>
          <EmptyText>There are no posts matching your filters.</EmptyText>
        </EmptyState>
      ) : (
        <QueueList>
          {filteredPosts.map(post => (
            <QueueItem
              key={post.id}
              $selected={selectedPosts.has(post.id)}
              onClick={(e) => {
                if (e.target.type !== 'checkbox' && !e.target.closest('button')) {
                  toggleSelectPost(post.id);
                }
              }}
            >
              <Checkbox
                type="checkbox"
                checked={selectedPosts.has(post.id)}
                onChange={() => toggleSelectPost(post.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <ContentPreview>
                <Thumbnail>
                  {getPlatformIcon(post.platform)}
                </Thumbnail>
                <ContentInfo>
                  <ContentTitle>{post.title}</ContentTitle>
                  <ContentMeta>
                    <MetaItem>📖 {post.storyName}</MetaItem>
                    <MetaItem>{getContentTypeIcon(post.contentType)}</MetaItem>
                    <MetaItem>🕒 {formatTime(post.scheduledFor)}</MetaItem>
                    <StatusBadge $status={post.status}>{post.status}</StatusBadge>
                  </ContentMeta>
                  <ContentCaption>{post.caption}</ContentCaption>
                </ContentInfo>
              </ContentPreview>
              <QuickActions>
                <QuickActionButton onClick={() => handleQuickApprove(post.id)}>
                  ✅ Approve
                </QuickActionButton>
                <QuickActionButton onClick={() => handleQuickReject(post.id)}>
                  ❌ Reject
                </QuickActionButton>
              </QuickActions>
            </QueueItem>
          ))}
        </QueueList>
      )}
    </PageContainer>
  );
}

export default BatchApprovalQueue;
