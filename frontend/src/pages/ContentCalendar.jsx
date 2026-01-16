/**
 * Content Calendar Page
 * Manage content calendar for blog/content marketing
 * Features:
 * - Calendar view (week/month)
 * - Add scheduled blog posts
 * - Track content status
 * - Manage publication schedule
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h1 {
    font-size: 28px;
    color: ${cssVar('--color-text')};
    margin: 0 0 4px 0;
  }

  p {
    color: ${cssVar('--color-text-secondary')};
    margin: 0;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props =>
    props.variant === 'primary'
      ? cssVar('--color-primary')
      : props.variant === 'secondary'
        ? cssVar('--color-surface')
        : 'transparent'};
  color: ${props =>
    props.variant === 'primary' || props.variant === 'secondary'
      ? '#fff'
      : cssVar('--color-text')};
  border: ${props =>
    props.variant === 'secondary' ? 'none' : props.variant === 'outline' ? `1px solid ${cssVar('--color-border')}` : 'none'};

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 6px;
  background: ${cssVar('--color-surface')};
  color: ${cssVar('--color-text')};
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${cssVar('--color-primary')};
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ViewToggle = styled.div`
  display: flex;
  background: ${cssVar('--color-surface')};
  border-radius: 6px;
  padding: 4px;
  gap: 4px;
`;

const ToggleButton = styled.button`
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.active ? cssVar('--color-primary') : 'transparent'};
  color: ${props => props.active ? '#fff' : cssVar('--color-text-secondary')};

  &:hover {
    background: ${props => props.active ? cssVar('--color-primary') : cssVar('--color-surface-hover')};
  }
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 8px;
  padding: 16px;
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: ${props => cssVar(props.color || '--color-text')};
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: ${cssVar('--color-text-secondary')};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
`;

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 800px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const DayCard = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 8px;
  padding: 12px;
  min-height: 100px;
  border: 1px solid ${cssVar('--color-border')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${cssVar('--color-primary')};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid ${cssVar('--color-border')};

    .day-name {
      font-size: 13px;
      font-weight: 600;
      color: ${cssVar('--color-text')};
    }

    .day-date {
      font-size: 12px;
      color: ${cssVar('--color-text-secondary')};
    }

    &.today {
      border-bottom-color: ${cssVar('--color-primary')};

      .day-name {
        color: ${cssVar('--color-primary')};
      }
    }
  }

  .post-count {
    font-size: 11px;
    color: ${cssVar('--color-text-secondary')};
    margin-top: 4px;
  }

  .posts-list {
    margin-top: 8px;
  }

  .post-item {
    padding: 6px 8px;
    margin-bottom: 6px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid ${props => cssVar(props.statusColor || '--color-border')};

    &:hover {
      background: ${cssVar('--color-surface-hover')};
    }

    .post-title {
      font-weight: 500;
      color: ${cssVar('--color-text')};
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .post-meta {
      font-size: 10px;
      color: ${cssVar('--color-text-secondary')};
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${cssVar('--color-text-secondary')};

  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    color: ${cssVar('--color-text')};
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${cssVar('--color-background')};
  border-radius: 12px);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    font-size: 20px;
    color: ${cssVar('--color-text')};
    margin: 0;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: ${cssVar('--color-text')};
    margin-bottom: 6px;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${cssVar('--color-border')};
    border-radius: 6px;
    background: ${cssVar('--color-surface')};
    color: ${cssVar('--color-text')};
    font-size: 14px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: ${cssVar('--color-primary')};
    }
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    const colors = {
      draft: { bg: '#6c757d', text: '#fff' },
      review: { bg: '#ffc107', text: '#000' },
      scheduled: { bg: '#17a2b8', text: '#fff' },
      published: { bg: '#28a745', text: '#fff' },
      archived: { bg: '#dc3545', text: '#fff' }
    };
    const color = colors[props.status] || colors.draft;
    return `
      background: ${color.bg};
      color: ${color.text};
    `;
  }}
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: ${cssVar('--color-text-secondary')};
`;

// Helper functions
const getStatusColor = (status) => {
  const colors = {
    draft: '--color-gray',
    review: '#ffc107',
    scheduled: '#17a2b8',
    published: '#28a745',
    archived: '#dc3545'
  };
  return colors[status] || colors.draft;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getDaysArray = (start, end) => {
  const arr = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};

function ContentCalendar() {
  const [view, setView] = useState('month'); // 'week' or 'month'
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [calendarData, setCalendarData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit'
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    status: 'draft',
    contentType: 'blog_post',
    scheduledPublishAt: '',
    keywords: [],
    focusKeyword: ''
  });

  useEffect(() => {
    fetchCalendarData();
    fetchCategories();
  }, [view, currentMonth, filterStatus, filterCategory]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on view
      let startDate, endDate;

      if (view === 'week') {
        const now = new Date(currentMonth);
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Month view - show entire month
        startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const statusParam = filterStatus !== 'all' ? filterStatus : '';
      const categoryParam = filterCategory !== 'all' ? filterCategory : '';

      const response = await fetch(
        `/api/content-calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}&status=${statusParam}&category=${categoryParam}`
      );

      const result = await response.json();

      if (result.success) {
        setCalendarData(result.data.calendar);
        setSummary(result.data.summary);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/content-calendar/categories');
      const result = await response.json();

      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setModalMode('create');
    setFormData({
      ...formData,
      scheduledPublishAt: date.toISOString().slice(0, 16)
    });
    setShowModal(true);
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setModalMode('view');
    setShowModal(true);
  };

  const handleCreatePost = async () => {
    try {
      const response = await fetch('/api/content-calendar/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: formData.focusKeyword ? formData.focusKeyword.split(',').map(k => k.trim()) : []
        })
      });

      const result = await response.json();

      if (result.success) {
        setShowModal(false);
        fetchCalendarData();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleUpdateStatus = async (postId, newStatus) => {
    try {
      const response = await fetch(`/api/content-calendar/posts/${postId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        setShowModal(false);
        fetchCalendarData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePrevPeriod = () => {
    if (view === 'week') {
      const newDate = new Date(currentMonth);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentMonth(newDate);
    } else {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentMonth(newDate);
    }
  };

  const handleNextPeriod = () => {
    if (view === 'week') {
      const newDate = new Date(currentMonth);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentMonth(newDate);
    } else {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentMonth(newDate);
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const renderCalendar = () => {
    if (loading) {
      return <LoadingSpinner>Loading calendar...</LoadingSpinner>;
    }

    if (!calendarData || Object.keys(calendarData).length === 0) {
      return (
        <EmptyState>
          <div className="icon">📅</div>
          <h3>No Content Scheduled</h3>
          <p>Click on a date to add your first blog post to the calendar</p>
        </EmptyState>
      );
    }

    const dates = Object.keys(calendarData).sort();
    const days = dates.map(dateStr => new Date(dateStr));

    const Grid = view === 'week' ? WeekGrid : MonthGrid;

    return (
      <CalendarGrid>
        <Grid>
          {days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const posts = calendarData[dateStr] || [];
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <DayCard
                key={dateStr}
                onClick={() => handleDateClick(date)}
              >
                <div className={`day-header ${isToday ? 'today' : ''}`}>
                  <span className="day-name">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="day-date">
                    {date.getDate()}
                  </span>
                </div>

                <div className="posts-list">
                  {posts.map(post => (
                    <div
                      key={post.id}
                      className="post-item"
                      statusColor={getStatusColor(post.status)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePostClick(post);
                      }}
                    >
                      <div className="post-title">{post.title}</div>
                      <div className="post-meta">
                        <StatusBadge status={post.status}>{post.status}</StatusBadge>
                        {' · ' + (post.category || 'Uncategorized')}
                      </div>
                    </div>
                  ))}
                </div>

                {posts.length === 0 && (
                  <div className="post-count">No posts scheduled</div>
                )}
              </DayCard>
            );
          })}
        </Grid>
      </CalendarGrid>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <Modal onClick={() => setShowModal(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <h2>
              {modalMode === 'create' ? 'Add New Post' :
               modalMode === 'edit' ? 'Edit Post' :
               selectedPost?.title}
            </h2>
            <Button variant="outline" onClick={() => setShowModal(false)}>✕</Button>
          </ModalHeader>

          {modalMode === 'create' && (
            <>
              <FormGroup>
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter post title"
                />
              </FormGroup>

              <FormGroup>
                <label>Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Write your blog content..."
                  rows={6}
                />
              </FormGroup>

              <FormGroup>
                <label>Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  placeholder="Brief summary for social media..."
                  rows={2}
                />
              </FormGroup>

              <FormGroup>
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g., Marketing, Tips, Case Study"
                />
              </FormGroup>

              <FormGroup>
                <label>Focus Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={formData.focusKeyword}
                  onChange={(e) => setFormData({...formData, focusKeyword: e.target.value})}
                  placeholder="e.g., AI marketing, content strategy"
                />
              </FormGroup>

              <FormGroup>
                <label>Content Type</label>
                <select
                  value={formData.contentType}
                  onChange={(e) => setFormData({...formData, contentType: e.target.value})}
                >
                  <option value="blog_post">Blog Post</option>
                  <option value="article">Article</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="case_study">Case Study</option>
                  <option value="announcement">Announcement</option>
                </select>
              </FormGroup>

              <FormGroup>
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="draft">Draft</option>
                  <option value="review">Ready for Review</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </FormGroup>

              <FormGroup>
                <label>Scheduled Publish Date</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledPublishAt}
                  onChange={(e) => setFormData({...formData, scheduledPublishAt: e.target.value})}
                />
              </FormGroup>

              <div style={{display: 'flex', gap: '12px', marginTop: '20px'}}>
                <Button variant="primary" onClick={handleCreatePost}>
                  Create Post
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {modalMode === 'view' && selectedPost && (
            <>
              <div style={{marginBottom: '16px'}}>
                <StatusBadge status={selectedPost.status}>{selectedPost.status}</StatusBadge>
              </div>

              <FormGroup>
                <label>Title</label>
                <div style={{padding: '10px', background: 'var(--color-surface)', borderRadius: '6px'}}>
                  {selectedPost.title}
                </div>
              </FormGroup>

              <FormGroup>
                <label>Category</label>
                <div style={{padding: '10px', background: 'var(--color-surface)', borderRadius: '6px'}}>
                  {selectedPost.category || 'Uncategorized'}
                </div>
              </FormGroup>

              {selectedPost.scheduledPublishAt && (
                <FormGroup>
                  <label>Scheduled For</label>
                  <div style={{padding: '10px', background: 'var(--color-surface)', borderRadius: '6px'}}>
                    {formatDate(selectedPost.scheduledPublishAt)}
                  </div>
                </FormGroup>
              )}

              {selectedPost.wordCount && (
                <FormGroup>
                  <label>Word Count</label>
                  <div style={{padding: '10px', background: 'var(--color-surface)', borderRadius: '6px'}}>
                    {selectedPost.wordCount} words ({selectedPost.readTime} min read)
                  </div>
                </FormGroup>
              )}

              {selectedPost.seoScore && (
                <FormGroup>
                  <label>SEO Score</label>
                  <div style={{padding: '10px', background: 'var(--color-surface)', borderRadius: '6px'}}>
                    {selectedPost.seoScore}/100
                  </div>
                </FormGroup>
              )}

              <div style={{display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap'}}>
                {selectedPost.status === 'draft' && (
                  <Button variant="primary" onClick={() => handleUpdateStatus(selectedPost.id, 'review')}>
                    Mark Ready for Review
                  </Button>
                )}
                {selectedPost.status === 'review' && (
                  <Button variant="primary" onClick={() => handleUpdateStatus(selectedPost.id, 'scheduled')}>
                    Approve & Schedule
                  </Button>
                )}
                {selectedPost.status === 'scheduled' && (
                  <Button variant="primary" onClick={() => handleUpdateStatus(selectedPost.id, 'published')}>
                    Mark Published
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    );
  };

  return (
    <PageContainer>
      <Header>
        <div>
          <h1>📅 Content Calendar</h1>
          <p>Plan and schedule your blog content</p>
        </div>

        <Controls>
          <ViewToggle>
            <ToggleButton active={view === 'week'} onClick={() => setView('week')}>
              Week
            </ToggleButton>
            <ToggleButton active={view === 'month'} onClick={() => setView('month')}>
              Month
            </ToggleButton>
          </ViewToggle>

          <Button variant="outline" onClick={handlePrevPeriod}>
            ← Previous
          </Button>

          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>

          <Button variant="outline" onClick={handleNextPeriod}>
            Next →
          </Button>

          <Button variant="primary" onClick={() => {
            setModalMode('create');
            setFormData({
              ...formData,
              scheduledPublishAt: new Date().toISOString().slice(0, 16)
            });
            setShowModal(true);
          }}>
            + New Post
          </Button>
        </Controls>
      </Header>

      <div style={{marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: 'var(--color-text)'}}>
        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>

      <FilterGroup style={{marginBottom: '20px'}}>
        <label>Filter by Status:</label>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </Select>

        <label style={{marginLeft: '20px'}}>Filter by Category:</label>
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      </FilterGroup>

      {summary && (
        <StatsBar>
          <StatCard>
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">Total</div>
          </StatCard>
          <StatCard color="--color-gray">
            <div className="stat-value">{summary.draft}</div>
            <div className="stat-label">Drafts</div>
          </StatCard>
          <StatCard color="#ffc107">
            <div className="stat-value">{summary.review}</div>
            <div className="stat-label">In Review</div>
          </StatCard>
          <StatCard color="#17a2b8">
            <div className="stat-value">{summary.scheduled}</div>
            <div className="stat-label">Scheduled</div>
          </StatCard>
          <StatCard color="#28a745">
            <div className="stat-value">{summary.published}</div>
            <div className="stat-label">Published</div>
          </StatCard>
        </StatsBar>
      )}

      {renderCalendar()}
      {renderModal()}
    </PageContainer>
  );
}

export default ContentCalendar;
