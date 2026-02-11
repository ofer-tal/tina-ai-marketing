/**
 * BookTok Trends Dashboard
 *
 * Displays trending books, topics, tropes, hooks, and hashtags from the BookTok/Bookstagram community.
 * Provides insights for content creation and trend analysis.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  background: rgba(22, 33, 62, 0.5);
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid rgba(45, 53, 97, 0.5);
`;

const Tab = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? '#e94560' : 'transparent'};
  border: none;
  border-radius: 6px;
  color: ${props => props.$active ? '#ffffff' : '#a0a0a0'};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 0.9rem;

  &:hover {
    background: ${props => props.$active ? '#e94560' : 'rgba(233, 69, 96, 0.2)'};
    color: ${props => props.$active ? '#ffffff' : '#eaeaea'};
  }
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #7b2cbf;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not([disabled]) {
    background: #9d4edd;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(45, 53, 97, 0.5);
  border-radius: 12px;
  padding: 1.5rem;
`;

const StatLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: #e94560;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const BookCard = styled.div`
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(45, 53, 97, 0.5);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(233, 69, 96, 0.2);
  }
`;

const BookCover = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const BookInfo = styled.div`
  padding: 1.25rem;
`;

const BookTitle = styled.h3`
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  color: #ffffff;
  line-height: 1.3;
`;

const BookAuthor = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
`;

const BookMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const MetaTag = styled.span`
  padding: 0.25rem 0.75rem;
  background: rgba(123, 44, 191, 0.2);
  border: 1px solid rgba(123, 44, 191, 0.4);
  border-radius: 20px;
  font-size: 0.75rem;
  color: #b8a4e9;
`;

const TrendIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;

  ${props => props.$direction === 'up' && `
    color: #00d26a;
  `}

  ${props => props.$direction === 'down' && `
    color: #e94560;
  `}

  ${props => props.$direction === 'neutral' && `
    color: #a0a0a0;
  `}
`;

const TrendBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const TrendBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560 0%, #7b2cbf 100%);
  width: ${props => props.$percent}%;
  transition: width 0.5s ease;
`;

const HashtagCloud = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.5rem;
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(45, 53, 97, 0.5);
  border-radius: 12px;
`;

const HashtagItem = styled.div`
  padding: 0.75rem 1.25rem;
  background: ${props => {
    if (props.$velocity > 50) return 'rgba(0, 210, 106, 0.15)';
    if (props.$velocity > 20) return 'rgba(123, 44, 191, 0.15)';
    if (props.$velocity < -20) return 'rgba(233, 69, 96, 0.15)';
    return 'rgba(22, 33, 62, 0.5)';
  }};
  border: 1px solid ${props => {
    if (props.$velocity > 50) return 'rgba(0, 210, 106, 0.3)';
    if (props.$velocity > 20) return 'rgba(123, 44, 191, 0.3)';
    if (props.$velocity < -20) return 'rgba(233, 69, 96, 0.3)';
    return 'rgba(45, 53, 97, 0.5)';
  }};
  border-radius: 25px;
  font-size: ${props => {
    if (props.$velocity > 50) return '1rem';
    if (props.$velocity > 20) return '0.95rem';
    return '0.85rem';
  }};
  font-weight: ${props => props.$velocity > 20 ? '600' : '400'};
  color: ${props => {
    if (props.$velocity > 50) return '#00f080';
    if (props.$velocity > 20) return '#b8a4e9';
    if (props.$velocity < -20) return '#ff6b6b';
    return '#a0a0a0';
  }};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
  }
`;

const TropesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
`;

const TropeCard = styled.div`
  padding: 1rem;
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(45, 53, 97, 0.5);
  border-radius: 10px;
  text-align: center;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    background: rgba(233, 69, 96, 0.1);
  }
`;

const TropeName = styled.div`
  font-size: 0.9rem;
  color: #ffffff;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
`;

const TropeCount = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const TABS = [
  { id: 'books', label: 'Books' },
  { id: 'trends', label: 'Trends' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'tropes', label: 'Tropes' }
];

function BookTokTrends() {
  const [activeTab, setActiveTab] = useState('books');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ books: [], trends: [], hashtags: [], tropes: [] });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch books
      const booksRes = await fetch('/api/booktok/books?limit=24');
      if (!booksRes.ok) throw new Error('Failed to fetch books');
      const booksData = await booksRes.json();

      // Fetch trends
      const trendsRes = await fetch('/api/booktok/trends?limit=20');
      if (!trendsRes.ok) throw new Error('Failed to fetch trends');
      const trendsData = await trendsRes.json();

      setData({
        books: booksData.data || [],
        trends: trendsData.data?.trends || [],
        hashtags: [],
        tropes: []
      });
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : 'Network error');
      console.error('Error fetching BookTok data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  // Calculate stats
  const totalBooks = data.books.length;
  const avgTrendScore = totalBooks > 0
    ? Math.round(data.books.reduce((sum, b) => sum + (b.currentTrendScore || 0), 0) / totalBooks)
    : 0;
  const risingTrends = data.trends.filter(t => t.trendDirection === 'rising').length;

  return (
    <Container>
      <Header>
        <Title>📚 BookTok Trends</Title>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <TabContainer>
            {TABS.map(tab => (
              <Tab
                key={tab.id}
                $active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Tab>
            ))}
          </TabContainer>
          <RefreshButton onClick={handleRefresh} disabled={refreshing}>
            🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
          </RefreshButton>
        </div>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatLabel>Total Books Tracked</StatLabel>
          <StatValue>{totalBooks}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Avg Trend Score</StatLabel>
          <StatValue>{avgTrendScore}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Rising Trends</StatLabel>
          <StatValue>{risingTrends}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Data Freshness</StatLabel>
          <StatValue style={{ fontSize: '1.2rem' }}>Live</StatValue>
        </StatCard>
      </StatsGrid>

      {activeTab === 'books' && (
        <ContentGrid>
          {data.books.length > 0 ? data.books.map(book => (
            <BookCard key={book._id}>
              <BookCover>
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={book.title} />
                ) : (
                  <span style={{ fontSize: '3rem' }}>📖</span>
                )}
              </BookCover>
              <BookInfo>
                <BookTitle>{book.title}</BookTitle>
                <BookAuthor>by {book.author}</BookAuthor>
                <BookMeta>
                  <MetaTag>{book.genre || 'Romance'}</MetaTag>
                  {book.spiceLevel > 0 && (
                    <MetaTag>🌶️ {book.spiceLevel}/5</MetaTag>
                  )}
                  <MetaTag>Score: {Math.round(book.currentTrendScore || 0)}</MetaTag>
                </BookMeta>
                <TrendIndicator
                  direction={book.currentTrendScore > 80 ? 'up' : book.currentTrendScore < 50 ? 'down' : 'neutral'}
                >
                  <span>
                    {book.currentTrendScore > 80 ? '📈 Hot'
                      : book.currentTrendScore < 50 ? '📉 Cooling'
                      : '➡️ Stable'}
                  </span>
                  <TrendBarFill $percent={`${book.currentTrendScore || 0}%`} />
                </TrendIndicator>
              </BookInfo>
            </BookCard>
          )) : (
            <EmptyState>
              <EmptyIcon>📚</EmptyIcon>
              <p>No books tracked yet. Data collection will begin soon.</p>
            </EmptyState>
          )}
        </ContentGrid>
      )}

      {activeTab === 'trends' && (
        <ContentGrid>
          {data.trends.length > 0 ? data.trends.map((trend, index) => (
            <BookCard key={`${trend.entityType}-${trend.name}-${index}`}>
              <BookInfo>
                <BookTitle>{trend.name}</BookTitle>
                <BookAuthor>{trend.entityType} • {trend.mentionCount || 0} mentions</BookAuthor>
                <BookMeta>
                  <MetaTag>{trend.trendDirection || 'neutral'}</MetaTag>
                </BookMeta>
                {trend.avgEngagementRate && (
                  <TrendIndicator
                    direction={trend.trendVelocity > 0 ? 'up' : 'down'}
                  >
                    <span>{trend.trendVelocity > 0 ? '↑' : '↓'} {Math.abs(trend.trendVelocity || 0)}%</span>
                  </TrendIndicator>
                )}
                <TrendBarFill $percent={`${Math.min(100, (trend.mentionCount || 0) / 10)}%`} />
              </BookInfo>
            </BookCard>
          )) : (
            <EmptyState>
              <EmptyIcon>📈</EmptyIcon>
              <p>No trend data available yet. Trends are calculated from social media activity.</p>
            </EmptyState>
          )}
        </ContentGrid>
      )}

      {activeTab === 'hashtags' && (
        <HashtagCloud>
          {data.books.length > 0 ? (
            data.books
              .flatMap(b => b.hashtagAssociations || [])
              .concat(['#booktok', '#romancebooks', '#bookrecommendations', '#romancereaders', '#tbr'])
              .filter((h, i, arr) => arr.indexOf(h) === i)
              .map(tag => (
                <HashtagItem key={tag} $velocity={Math.random() * 100 - 50}>
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </HashtagItem>
              ))
          ) : (
            <EmptyState>
              <EmptyIcon>#️⃣</EmptyIcon>
              <p>Hashtag data will be available after processing TikTok posts.</p>
            </EmptyState>
          )}
        </HashtagCloud>
      )}

      {activeTab === 'tropes' && (
        <TropesGrid>
          {data.books.length > 0 ? (
            data.books
              .flatMap(b => b.tropes || [])
              .filter((t, i, arr) => arr.indexOf(t) === i)
              .map(trope => (
                <TropeCard key={trope}>
                  <TropeName>{trope.replace(/_/g, ' ')}</TropeName>
                  <TropeCount>Popular trope</TropeCount>
                </TropeCard>
              ))
          ) : (
            <EmptyState>
              <EmptyIcon>💕</EmptyIcon>
              <p>Trope data will be extracted from book descriptions and social posts.</p>
            </EmptyState>
          )}
        </TropesGrid>
      )}
    </Container>
  );
}

export default BookTokTrends;
