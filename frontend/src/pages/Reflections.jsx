import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const YearFilter = styled.select`
  padding: 0.5rem 1rem;
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 6px;
  color: ${cssVar('--color-text')};
  font-size: 0.9rem;
  cursor: pointer;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 8px;
  padding: 1rem;
  min-width: 120px;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${cssVar('--color-text-secondary')};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#e94560'};
`;

const ReflectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 1.5rem;
`;

const ReflectionCard = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${props => {
    switch (props.$sentiment) {
      case 'very_positive': return '#4caf50';
      case 'positive': return '#8bc34a';
      case 'neutral': return props.$status === 'completed' ? '#2196f3' : '#9e9e9e';
      case 'negative': return '#ff9800';
      case 'very_negative': return '#f44336';
      default: return '#9e9e9e';
    }
  }};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const ReflectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ReflectionTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${cssVar('--color-text')};
`;

const StatusBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.$status) {
      case 'completed': return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'draft': return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
      case 'archived': return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
      default: return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const WeekInfo = styled.div`
  font-size: 0.85rem;
  color: ${cssVar('--color-text-secondary')};
  margin-bottom: 1rem;
`;

const ScoreBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${cssVar('--color-border')};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ScoreFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => {
    if (props.$percent >= 80) return '#4caf50';
    if (props.$percent >= 65) return '#8bc34a';
    if (props.$percent >= 35) return '#2196f3';
    if (props.$percent >= 20) return '#ff9800';
    return '#f44336';
  }};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const SectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SectionItem = styled.div`
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 0.9rem;
`;

const SectionItemTitle = styled.div`
  font-weight: 600;
  color: ${cssVar('--color-text')};
  margin-bottom: 0.25rem;
`;

const SectionItemContent = styled.div`
  color: ${cssVar('--color-text-secondary')};
  font-size: 0.85rem;
`;

const RecommendationsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const RecommendationTag = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;

  ${props => {
    switch (props.$type) {
      case 'continue': return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'start': return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      case 'stop': return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      case 'improve': return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
      default: return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${cssVar('--color-text-secondary')};
`;

const DetailPanel = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
`;

const DetailSection = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #e0e0e0;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
`;

const MetricCard = styled.div`
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
`;

const MetricName = styled.div`
  font-size: 0.75rem;
  color: ${cssVar('--color-text-secondary')};
  margin-bottom: 0.25rem;
`;

const MetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${cssVar('--color-text')};
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 6px;
  color: ${cssVar('--color-text')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    color: #e94560;
  }
`;

export default function Reflections() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [reflections, setReflections] = useState([]);
  const [selectedReflection, setSelectedReflection] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchReflectionDetail(id);
    } else {
      fetchReflections();
      fetchStats();
    }
  }, [currentYear, id]);

  const fetchReflections = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tina/reflections?year=${currentYear}`);
      const data = await response.json();
      if (data.success) {
        setReflections(data.data);
      }
    } catch (error) {
      console.error('Error fetching reflections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/reflections/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching reflection stats:', error);
    }
  };

  const fetchReflectionDetail = async (reflectionId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tina/reflections/${reflectionId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedReflection(data.data);
      }
    } catch (error) {
      console.error('Error fetching reflection detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReflectionClick = (reflection) => {
    navigate(`/tina/reflections/${reflection._id}`);
  };

  const handleBack = () => {
    navigate('/tina/reflections');
    setSelectedReflection(null);
  };

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment) {
      case 'very_positive': return '😊';
      case 'positive': return '🙂';
      case 'neutral': return '😐';
      case 'negative': return '😟';
      case 'very_negative': return '😞';
      default: return '😐';
    }
  };

  const getSentimentLabel = (sentiment) => {
    return sentiment.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) return <LoadingSpinner />;

  // Show detail view if a reflection is selected
  if (id && selectedReflection) {
    return (
      <Container>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BackButton onClick={handleBack}>← Back</BackButton>
            <Title>Week {selectedReflection.weekNumber} Reflection</Title>
            <StatusBadge $status={selectedReflection.status}>{selectedReflection.status}</StatusBadge>
          </div>
          <div style={{ fontSize: '1.5rem' }}>
            {getSentimentEmoji(selectedReflection.sentiment)}
          </div>
        </Header>

        <DetailPanel>
          <DetailSection>
            <DetailTitle>Week Information</DetailTitle>
            <WeekInfo>
              Week {selectedReflection.weekNumber}, {selectedReflection.year} |{' '}
              {new Date(selectedReflection.weekRange.start).toLocaleDateString()} - {new Date(selectedReflection.weekRange.end).toLocaleDateString()}
            </WeekInfo>
            <ScoreBar>
              <ScoreFill $percent={selectedReflection.overallScore || 50} />
            </ScoreBar>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Score: {selectedReflection.overallScore}/100</span>
              <span>{getSentimentLabel(selectedReflection.sentiment)}</span>
            </div>
          </DetailSection>

          {selectedReflection.sections && selectedReflection.sections.length > 0 && (
            <DetailSection>
              <DetailTitle>Reflection Sections</DetailTitle>
              <SectionList>
                {selectedReflection.sections.map((section, i) => (
                  <SectionItem key={i}>
                    <SectionItemTitle>{section.title}</SectionItemTitle>
                    <SectionItemContent>{section.content}</SectionItemContent>
                  </SectionItem>
                ))}
              </SectionList>
            </DetailSection>
          )}

          {selectedReflection.metrics && selectedReflection.metrics.length > 0 && (
            <DetailSection>
              <DetailTitle>Metrics</DetailTitle>
              <MetricsGrid>
                {selectedReflection.metrics.map((metric, i) => (
                  <MetricCard key={i}>
                    <MetricName>{metric.name}</MetricName>
                    <MetricValue>
                      {metric.value} / {metric.target}
                    </MetricValue>
                  </MetricCard>
                ))}
              </MetricsGrid>
            </DetailSection>
          )}

          {selectedReflection.summary && (
            <DetailSection>
              <DetailTitle>Summary</DetailTitle>
              <div style={{ color: cssVar('--color-text-secondary') }}>
                {selectedReflection.summary}
              </div>
            </DetailSection>
          )}

          {(selectedReflection.continueDoing?.length > 0 ||
            selectedReflection.stopDoing?.length > 0 ||
            selectedReflection.startDoing?.length > 0 ||
            selectedReflection.improvementAreas?.length > 0) && (
            <DetailSection>
              <DetailTitle>Recommendations</DetailTitle>
              <RecommendationsList>
                {selectedReflection.continueDoing?.map((item, i) => (
                  <RecommendationTag key={`c-${i}`} $type="continue">
                    ✓ {item}
                  </RecommendationTag>
                ))}
                {selectedReflection.stopDoing?.map((item, i) => (
                  <RecommendationTag key={`s-${i}`} $type="stop">
                    ✗ {item}
                  </RecommendationTag>
                ))}
                {selectedReflection.startDoing?.map((item, i) => (
                  <RecommendationTag key={`st-${i}`} $type="start">
                    → {item}
                  </RecommendationTag>
                ))}
                {selectedReflection.improvementAreas?.map((item, i) => (
                  <RecommendationTag key={`i-${i}`} $type="improve">
                    ↑ {item}
                  </RecommendationTag>
                ))}
              </RecommendationsList>
            </DetailSection>
          )}

          {selectedReflection.nextWeekPriorities && selectedReflection.nextWeekPriorities.length > 0 && (
            <DetailSection>
              <DetailTitle>Next Week Priorities</DetailTitle>
              <SectionList>
                {selectedReflection.nextWeekPriorities.map((priority, i) => (
                  <SectionItem key={i}>
                    {i + 1}. {priority}
                  </SectionItem>
                ))}
              </SectionList>
            </DetailSection>
          )}

          {selectedReflection.questionsForFounder && selectedReflection.questionsForFounder.length > 0 && (
            <DetailSection>
              <DetailTitle>Questions for Founder</DetailTitle>
              <SectionList>
                {selectedReflection.questionsForFounder.map((q, i) => (
                  <SectionItem key={i}>
                    <SectionItemTitle>Q{i + 1}: {q.question}</SectionItemTitle>
                    {q.context && (
                      <SectionItemContent>Context: {q.context}</SectionItemContent>
                    )}
                    {q.relatedTo && q.relatedTo !== 'general' && (
                      <SectionItemContent style={{ fontSize: '0.75rem', color: '#888' }}>
                        Related to: {q.relatedTo}
                      </SectionItemContent>
                    )}
                  </SectionItem>
                ))}
              </SectionList>
            </DetailSection>
          )}
        </DetailPanel>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Weekly Reflections</Title>
        <YearFilter
          value={currentYear}
          onChange={(e) => setCurrentYear(parseInt(e.target.value))}
        >
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
        </YearFilter>
      </Header>

      {stats && (
        <StatsRow>
          <StatCard>
            <StatLabel>Total</StatLabel>
            <StatValue>{stats.total || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>This Year</StatLabel>
            <StatValue>{stats.thisYear || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Avg Score</StatLabel>
            <StatValue $color="#2196f3">{Math.round(stats.avgOverallScore || 0)}</StatValue>
          </StatCard>
        </StatsRow>
      )}

      {reflections.length === 0 ? (
        <EmptyState>
          <h3>No reflections found for {currentYear}</h3>
          <p>Weekly reflections are generated automatically every Sunday.</p>
        </EmptyState>
      ) : (
        <ReflectionsGrid>
          {reflections.map(reflection => (
            <ReflectionCard
              key={reflection._id}
              $sentiment={reflection.sentiment}
              $status={reflection.status}
              onClick={() => handleReflectionClick(reflection)}
            >
              <ReflectionHeader>
                <ReflectionTitle>Week {reflection.weekNumber}</ReflectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <StatusBadge $status={reflection.status}>{reflection.status}</StatusBadge>
                  <span style={{ fontSize: '1.25rem' }}>
                    {getSentimentEmoji(reflection.sentiment)}
                  </span>
                </div>
              </ReflectionHeader>

              <WeekInfo>
                {new Date(reflection.weekRange.start).toLocaleDateString()} - {new Date(reflection.weekRange.end).toLocaleDateString()}
              </WeekInfo>

              <ScoreBar>
                <ScoreFill $percent={reflection.overallScore || 50} />
              </ScoreBar>

              {reflection.sections && reflection.sections.length > 0 && (
                <SectionList>
                  {reflection.sections.slice(0, 3).map((section, i) => (
                    <SectionItem key={i}>
                      <SectionItemTitle>{section.title}</SectionItemTitle>
                      <SectionItemContent>
                        {section.content.length > 80
                          ? section.content.substring(0, 80) + '...'
                          : section.content}
                      </SectionItemContent>
                    </SectionItem>
                  ))}
                </SectionList>
              )}

              {reflection.summary && (
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#a0a0a0' }}>
                  {reflection.summary.length > 120
                    ? reflection.summary.substring(0, 120) + '...'
                    : reflection.summary}
                </div>
              )}
            </ReflectionCard>
          ))}
        </ReflectionsGrid>
      )}
    </Container>
  );
}
