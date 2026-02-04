import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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
  align-items: center;
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 6px;
  color: ${cssVar('--color-text')};
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

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToggleLabel = styled.span`
  font-size: 0.9rem;
  color: ${cssVar('--color-text-secondary')};
`;

const Toggle = styled.button`
  width: 44px;
  height: 24px;
  background: ${props => props.$checked ? '#e94560' : '#2d3561'};
  border: none;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: ${props => props.$checked ? '23px' : '3px'};
    transition: left 0.2s;
  }
`;

const LearningsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const LearningCard = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  ${props => !props.$isValid && `
    opacity: 0.6;
    border-style: dashed;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const CategoryBadge = styled.span`
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${props => {
    const bgColors = {
      content: 'rgba(233, 69, 96, 0.2)',
      timing: 'rgba(156, 39, 176, 0.2)',
      hashtags: 'rgba(76, 175, 80, 0.2)',
      format: 'rgba(33, 150, 243, 0.2)',
      platform: 'rgba(255, 152, 0, 0.2)',
      audience: 'rgba(0, 188, 212, 0.2)',
      creative: 'rgba(255, 87, 34, 0.2)',
      copy: 'rgba(121, 85, 72, 0.2)',
      general: 'rgba(158, 158, 158, 0.2)'
    };
    return bgColors[props.$category] || bgColors.general;
  }};
  color: ${props => {
    const colors = {
      content: '#e94560',
      timing: '#9c27b0',
      hashtags: '#4caf50',
      format: '#2196f3',
      platform: '#ff9800',
      audience: '#00bcd4',
      creative: '#ff5722',
      copy: '#795548',
      general: '#9e9e9e'
    };
    return colors[props.$category] || '#9e9e9e';
  }};
`;

const ValidationBadge = styled.span`
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;

  ${props => props.$validated
    ? `background: rgba(76, 175, 80, 0.2); color: #4caf50;`
    : `background: rgba(244, 67, 54, 0.2); color: #f44336;`}
`;

const PatternText = styled.p`
  color: ${cssVar('--color-text')};
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0.5rem 0 1rem 0;
`;

const ConfidenceMeter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const ConfidenceLabel = styled.span`
  font-size: 0.8rem;
  color: ${cssVar('--color-text-secondary')};
`;

const ConfidenceBar = styled.div`
  flex: 1;
  height: 8px;
  background: ${cssVar('--color-border')};
  border-radius: 4px;
  overflow: hidden;
`;

const ConfidenceFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => {
    if (props.$percent >= 80) return '#00e676';
    if (props.$percent >= 60) return '#4caf50';
    if (props.$percent >= 40) return '#ffc107';
    return '#f44336';
  }};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ConfidenceValue = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 35px;
  text-align: right;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  font-size: 0.8rem;
  color: ${cssVar('--color-text-secondary')};
`;

const MetaLabel = styled.span`
  opacity: 0.7;
`;

const StrengthIndicator = styled.span`
  font-weight: 600;
  color: ${props => {
    if (props.$strength >= 7) return '#00e676';
    if (props.$strength >= 5) return '#4caf50';
    if (props.$strength >= 3) return '#ffc107';
    return '#f44336';
  }};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${cssVar('--color-border')};
`;

const ActionButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 4px;
  color: ${cssVar('--color-text')};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    color: #e94560;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${cssVar('--color-text-secondary')};
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

export default function Learnings() {
  const navigate = useNavigate();
  const [learnings, setLearnings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    category: '',
    minConfidence: 0,
    isValid: true
  });

  useEffect(() => {
    fetchLearnings();
    fetchStats();
  }, [filter]);

  const fetchLearnings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.minConfidence > 0) params.append('minConfidence', filter.minConfidence);
      params.append('isValid', filter.isValid.toString());

      const response = await fetch(`/api/tina/learnings?${params}`);
      const data = await response.json();

      if (data.success) {
        setLearnings(data.data);
      }
    } catch (error) {
      console.error('Error fetching learnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/learnings/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleValidate = async (id) => {
    try {
      const response = await fetch(`/api/tina/learnings/${id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        fetchLearnings();
        fetchStats();
      }
    } catch (error) {
      console.error('Error validating learning:', error);
    }
  };

  const handleInvalidate = async (id) => {
    try {
      const response = await fetch(`/api/tina/learnings/${id}/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manually invalidated via UI' })
      });
      if (response.ok) {
        fetchLearnings();
        fetchStats();
      }
    } catch (error) {
      console.error('Error invalidating learning:', error);
    }
  };

  const getStrengthLabel = (strength) => {
    if (strength >= 8) return 'Strong';
    if (strength >= 5) return 'Moderate';
    return 'Weak';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>Tina's Learnings</Title>
      </Header>

      {stats && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <span style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
            Total: {stats.total} | Validated: {stats.validated} | Actionable: {stats.actionable}
          </span>
        </div>
      )}

      <FilterBar>
        <FilterSelect
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="content">Content</option>
          <option value="timing">Timing</option>
          <option value="hashtags">Hashtags</option>
          <option value="format">Format</option>
          <option value="platform">Platform</option>
          <option value="audience">Audience</option>
          <option value="creative">Creative</option>
          <option value="copy">Copy</option>
          <option value="general">General</option>
        </FilterSelect>

        <FilterSelect
          value={filter.minConfidence}
          onChange={(e) => setFilter({ ...filter, minConfidence: parseInt(e.target.value) })}
        >
          <option value="0">All Confidence Levels</option>
          <option value="70">High (70%+)</option>
          <option value="50">Medium (50%+)</option>
          <option value="30">Low (30%+)</option>
        </FilterSelect>

        <ToggleContainer>
          <ToggleLabel>Show Validated Only</ToggleLabel>
          <Toggle
            $checked={filter.isValid}
            onClick={() => setFilter({ ...filter, isValid: !filter.isValid })}
          />
        </ToggleContainer>
      </FilterBar>

      {learnings.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>💡</EmptyStateIcon>
          <h3>No learnings found</h3>
          <p>Tina will accumulate learnings as experiments complete and patterns emerge.</p>
        </EmptyState>
      ) : (
        <LearningsGrid>
          {learnings.map(learning => (
            <LearningCard
              key={learning._id}
              $isValid={learning.isValid}
            >
              <CardHeader>
                <CategoryBadge $category={learning.category}>
                  {learning.category}
                </CategoryBadge>
                <ValidationBadge $validated={learning.isValid}>
                  {learning.isValid ? 'Validated' : 'Invalid'}
                </ValidationBadge>
              </CardHeader>

              <ConfidenceMeter>
                <ConfidenceLabel>Confidence</ConfidenceLabel>
                <ConfidenceBar>
                  <ConfidenceFill $percent={learning.confidence} />
                </ConfidenceBar>
                <ConfidenceValue>{Math.round(learning.confidence)}%</ConfidenceValue>
              </ConfidenceMeter>

              <PatternText>{learning.pattern}</PatternText>

              <MetaRow>
                <MetaItem>
                  <MetaLabel>Strength:</MetaLabel>{' '}
                  <StrengthIndicator $strength={learning.strength}>
                    {getStrengthLabel(learning.strength)}
                  </StrengthIndicator>
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Evidence:</MetaLabel> {learning.evidence?.length || 0}
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Type:</MetaLabel> {learning.patternType}
                </MetaItem>
              </MetaRow>

              {learning.actionTaken && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#a0a0a0' }}>
                  <MetaLabel>Action:</MetaLabel> {learning.actionTaken}
                </div>
              )}

              <ActionButtons>
                {learning.isValid ? (
                  <ActionButton
                    onClick={(e) => { e.stopPropagation(); handleInvalidate(learning._id); }}
                  >
                    Invalidate
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={(e) => { e.stopPropagation(); handleValidate(learning._id); }}
                  >
                    Validate
                  </ActionButton>
                )}
              </ActionButtons>
            </LearningCard>
          ))}
        </LearningsGrid>
      )}
    </Container>
  );
}
