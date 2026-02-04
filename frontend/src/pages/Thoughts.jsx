import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
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

const ThoughtTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ThoughtEntry = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid ${props => props.$typeColor || '#9e9e9e'};
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const ThoughtHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ThoughtMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const TypeBadge = styled.span`
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${props => {
    const bgColors = {
      hypothesis: 'rgba(233, 69, 96, 0.2)',
      observation: 'rgba(76, 175, 80, 0.2)',
      analysis: 'rgba(33, 150, 243, 0.2)',
      question: 'rgba(255, 152, 0, 0.2)',
      idea: 'rgba(156, 39, 176, 0.2)',
      conclusion: 'rgba(0, 188, 212, 0.2)',
      decision: 'rgba(121, 85, 72, 0.2)',
      general: 'rgba(158, 158, 158, 0.2)'
    };
    return bgColors[props.$type] || bgColors.general;
  }};
  color: ${props => {
    const colors = {
      hypothesis: '#e94560',
      observation: '#4caf50',
      analysis: '#2196f3',
      question: '#ff9800',
      idea: '#9c27b0',
      conclusion: '#00bcd4',
      decision: '#795548',
      general: '#9e9e9e'
    };
    return colors[props.$type] || '#9e9e9e';
  }};
`;

const Timestamp = styled.span`
  font-size: 0.8rem;
  color: ${cssVar('--color-text-secondary')};
`;

const ConfidenceScore = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    if (props.$score >= 75) return 'rgba(76, 175, 80, 0.2)';
    if (props.$score >= 50) return 'rgba(255, 193, 7, 0.2)';
    return 'rgba(244, 67, 54, 0.2)';
  }};
  color: ${props => {
    if (props.$score >= 75) return '#4caf50';
    if (props.$score >= 50) return '#ffc107';
    return '#f44336';
  }};
`;

const ThoughtContent = styled.div`
  color: ${cssVar('--color-text')};
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const ThoughtDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${cssVar('--color-border')};
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
`;

const DetailLabel = styled.span`
  color: ${cssVar('--color-text-secondary')};
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: ${cssVar('--color-text')};
`;

const DataPoint = styled.span`
  padding: 0.2rem 0.5rem;
  background: ${cssVar('--color-border')};
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
`;

const ActionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(233, 69, 96, 0.1);
  border-radius: 6px;
  font-size: 0.85rem;
  color: #e94560;
`;

const ValidationStatus = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;

  ${props => props.$validated === true
    ? `background: rgba(76, 175, 80, 0.2); color: #4caf50;`
    : props.$validated === false
    ? `background: rgba(244, 67, 54, 0.2); color: #f44336;`
    : `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`}
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

const StatsRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  font-size: 0.9rem;
  color: ${cssVar('--color-text-secondary')};
`;

const StatValue = styled.span`
  font-weight: 600;
  color: ${cssVar('--color-text')};
`;

export default function Thoughts() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    thoughtType: '',
    validated: ''
  });

  useEffect(() => {
    fetchThoughts();
    fetchStats();
  }, [filter]);

  const fetchThoughts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.thoughtType) params.append('thoughtType', filter.thoughtType);
      if (filter.validated !== '') {
        params.append('validated', filter.validated === 'yes' ? 'true' : 'false');
      }
      params.append('limit', '100');

      const response = await fetch(`/api/tina/thoughts?${params}`);
      const data = await response.json();

      if (data.success) {
        setThoughts(data.data);
      }
    } catch (error) {
      console.error('Error fetching thoughts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/thoughts/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

const getTypeColor = (type) => {
  const colors = {
    hypothesis: '#e94560',
    observation: '#4caf50',
    analysis: '#2196f3',
    question: '#ff9800',
    idea: '#9c27b0',
    conclusion: '#00bcd4',
    decision: '#795548',
    general: '#9e9e9e'
  };
  return colors[type] || '#9e9e9e';
};

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>Tina's Thought Log</Title>
      </Header>

      {stats && (
        <StatsRow>
          <StatItem>Total Thoughts: <StatValue>{stats.total}</StatValue></StatItem>
          <StatItem>Validated: <StatValue>{stats.validated}</StatValue></StatItem>
          <StatItem>Actionable: <StatValue>{stats.actionable}</StatValue></StatItem>
          <StatItem>Recent (24h): <StatValue>{stats.recent}</StatValue></StatItem>
        </StatsRow>
      )}

      <FilterBar>
        <FilterSelect
          value={filter.thoughtType}
          onChange={(e) => setFilter({ ...filter, thoughtType: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="hypothesis">Hypotheses</option>
          <option value="observation">Observations</option>
          <option value="analysis">Analysis</option>
          <option value="question">Questions</option>
          <option value="idea">Ideas</option>
          <option value="conclusion">Conclusions</option>
          <option value="decision">Decisions</option>
        </FilterSelect>

        <FilterSelect
          value={filter.validated}
          onChange={(e) => setFilter({ ...filter, validated: e.target.value })}
        >
          <option value="">All Validation Status</option>
          <option value="yes">Validated Only</option>
          <option value="no">Unvalidated Only</option>
        </FilterSelect>
      </FilterBar>

      {thoughts.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>🧠</EmptyStateIcon>
          <h3>No thoughts found</h3>
          <p>Tina's thought log will populate as she makes observations and decisions.</p>
        </EmptyState>
      ) : (
        <ThoughtTimeline>
          {thoughts.map(thought => (
            <ThoughtEntry
              key={thought._id}
              $typeColor={getTypeColor(thought.thoughtType)}
            >
              <ThoughtHeader>
                <ThoughtMeta>
                  <TypeBadge $type={thought.thoughtType}>
                    {thought.thoughtType}
                  </TypeBadge>
                  {thought.validated !== undefined && (
                    <ValidationStatus $validated={thought.validated}>
                      {thought.validated === true
                        ? thought.validationResult?.correct === true ? 'Correct' : 'Incorrect'
                        : 'Pending'}
                    </ValidationStatus>
                  )}
                  {thought.confidence !== undefined && (
                    <ConfidenceScore $score={thought.confidence}>
                      {Math.round(thought.confidence)}%
                    </ConfidenceScore>
                  )}
                </ThoughtMeta>
                <Timestamp>{formatDate(thought.timestamp)}</Timestamp>
              </ThoughtHeader>

              <ThoughtContent>{thought.thought}</ThoughtContent>

              {thought.triggersAction && thought.triggeredAction && (
                <ActionIndicator>
                  <span>⚡</span>
                  <span>Action: {thought.triggeredAction}</span>
                </ActionIndicator>
              )}

              {(thought.dataPoints?.length > 0 || thought.triggers?.length > 0 || thought.category || thought.tags?.length > 0) && (
                <ThoughtDetails>
                  {thought.dataPoints?.length > 0 && (
                    <DetailRow>
                      <DetailLabel>Data Points:</DetailLabel>
                      {thought.dataPoints.map((dp, i) => (
                        <DataPoint key={i}>
                          {dp.type}: {typeof dp.value === 'object' ? JSON.stringify(dp.value) : dp.value}
                        </DataPoint>
                      ))}
                    </DetailRow>
                  )}
                  {thought.category && (
                    <DetailRow>
                      <DetailLabel>Category:</DetailLabel>
                      <DetailValue>{thought.category}</DetailValue>
                    </DetailRow>
                  )}
                  {thought.tags?.length > 0 && (
                    <DetailRow>
                      <DetailLabel>Tags:</DetailLabel>
                      <DetailValue>{thought.tags.join(', ')}</DetailValue>
                    </DetailRow>
                  )}
                </ThoughtDetails>
              )}
            </ThoughtEntry>
          ))}
        </ThoughtTimeline>
      )}
    </Container>
  );
}
