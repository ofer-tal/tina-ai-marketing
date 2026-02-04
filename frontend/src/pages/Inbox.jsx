import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
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

const TitleWithBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PendingBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    if (props.$count === 0) return 'rgba(158, 158, 158, 0.2)';
    if (props.$count > 0) return '#e94560';
    return '#4caf50';
  }};
  color: ${props => {
    if (props.$count > 0) return 'white';
    return '#a0a0a0';
  }};
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.6rem 1.2rem;
  background: ${props => props.$variant === 'secondary' ? '#16213e' : '#e94560'};
  border: 1px solid ${props => props.$variant === 'secondary' ? '#2d3561' : '#e94560'};
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.$variant === 'secondary' ? '#1f2b4d' : '#ff6b6b'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.2);
  }
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

const ObservationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ObservationCard = styled.div`
  background: #16213e;
  border: 1px solid ${props => {
    switch (props.$urgency) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffc107';
      case 'low': return '#2196f3';
      default: return '#2d3561';
    }
  }};
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const ObservationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const ObservationTitle = styled.h3`
  font-size: 1rem;
  margin: 0;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UrgencyBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${props => {
    switch (props.$urgency) {
      case 'critical':
        return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      case 'high':
        return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
      case 'medium':
        return `background: rgba(255, 193, 7, 0.2); color: #ffc107;`;
      case 'low':
        return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      default:
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const CategoryBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  text-transform: uppercase;
  background: rgba(123, 44, 191, 0.2);
  color: #b388ff;
`;

const ObservationSummary = styled.p`
  color: #eaeaea;
  font-size: 0.95rem;
  margin: 0.5rem 0;
  line-height: 1.5;
`;

const ObservationDetails = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 0.75rem;
  margin: 0.75rem 0;
  font-size: 0.85rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
`;

const DetailLabel = styled.span`
  color: #a0a0a0;
`;

const DetailValue = styled.span`
  color: #eaeaea;
  font-weight: 500;
`;

const ObservationMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #a0a0a0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #2d3561;
`;

const SmallButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.$variant === 'danger' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(233, 69, 96, 0.1)'};
  border: 1px solid ${props => props.$variant === 'danger' ? '#f44336' : '#e94560'};
  border-radius: 4px;
  color: #eaeaea;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$variant === 'danger' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(233, 69, 96, 0.2)'};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const CategoryGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const CategoryHeader = styled.h3`
  font-size: 0.9rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 0.75rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CategoryIcon = styled.span`
  font-size: 1rem;
`;

const SuggestionBox = styled.div`
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
`;

const SuggestionTitle = styled.div`
  font-size: 0.8rem;
  color: #b388ff;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const SuggestionText = styled.div`
  font-size: 0.85rem;
  color: #eaeaea;
`;

const SuggestionButton = styled.button`
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: rgba(123, 44, 191, 0.2);
  border: 1px solid #7b2cbf;
  border-radius: 4px;
  color: #eaeaea;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(123, 44, 191, 0.3);
  }
`;

function getCategoryInfo(category) {
  const info = {
    risk: { icon: '⚠️', label: 'Risks' },
    opportunity: { icon: '💡', label: 'Opportunities' },
    performance: { icon: '📈', label: 'Performance' },
    pattern: { icon: '🔄', label: 'Patterns' },
    milestone: { icon: '🏆', label: 'Milestones' },
    system: { icon: '⚙️', label: 'System' },
    general: { icon: '📌', label: 'General' }
  };
  return info[category] || { icon: '📌', label: category || 'General' };
}

function Inbox() {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ urgency: 'all', category: 'all' });
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchObservations();
  }, [filter]);

  useEffect(() => {
    // Poll for new observations every 30 seconds
    const interval = setInterval(() => {
      fetchPendingCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.urgency !== 'all') params.append('urgency', filter.urgency);
      if (filter.category !== 'all') params.append('category', filter.category);

      const response = await fetch(`/api/tina/observations?${params}`);
      const data = await response.json();

      if (data.success) {
        setObservations(data.data);
      }
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/tina/observations/pending');
      const data = await response.json();
      if (data.success) {
        setPendingCount(data.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      const response = await fetch(`/api/tina/observations/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'founder' })
      });

      if (response.ok) {
        fetchObservations();
        fetchPendingCount();
      }
    } catch (error) {
      console.error('Error acknowledging observation:', error);
    }
  };

  const handleDismiss = async (id) => {
    try {
      const response = await fetch(`/api/tina/observations/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dismissed by user' })
      });

      if (response.ok) {
        fetchObservations();
        fetchPendingCount();
      }
    } catch (error) {
      console.error('Error dismissing observation:', error);
    }
  };

  const handleBulkAcknowledge = async () => {
    if (selectedIds.length === 0) return;

    try {
      const response = await fetch('/api/tina/observations/bulk-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (response.ok) {
        setSelectedIds([]);
        fetchObservations();
        fetchPendingCount();
      }
    } catch (error) {
      console.error('Error in bulk acknowledge:', error);
    }
  };

  const handleExecuteAction = async (observation) => {
    if (!observation.autoExecutable || !observation.actionRequest) return;

    try {
      const response = await fetch(`/api/tina/observations/${observation._id}/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        fetchObservations();
        fetchPendingCount();
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === observations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(observations.map(o => o._id));
    }
  };

  const groupedObservations = observations.reduce((groups, obs) => {
    const category = obs.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(obs);
    return groups;
  }, {});

  const categoryOrder = ['risk', 'opportunity', 'performance', 'pattern', 'milestone', 'system', 'general'];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <TitleWithBadge>
          <Title>Tina's Inbox</Title>
          <PendingBadge $count={pendingCount}>
            {pendingCount} pending
          </PendingBadge>
        </TitleWithBadge>
        <Actions>
          {selectedIds.length > 0 && (
            <Button onClick={handleBulkAcknowledge}>
              Acknowledge Selected ({selectedIds.length})
            </Button>
          )}
        </Actions>
      </Header>

      <FilterBar>
        <FilterSelect
          value={filter.urgency}
          onChange={(e) => setFilter({ ...filter, urgency: e.target.value })}
        >
          <option value="all">All Urgency</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </FilterSelect>

        <FilterSelect
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="all">All Categories</option>
          <option value="risk">Risks</option>
          <option value="opportunity">Opportunities</option>
          <option value="performance">Performance</option>
          <option value="pattern">Patterns</option>
          <option value="milestone">Milestones</option>
        </FilterSelect>

        {observations.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#eaeaea', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={selectedIds.length === observations.length}
              onChange={toggleSelectAll}
            />
            Select All
          </label>
        )}
      </FilterBar>

      {Object.keys(groupedObservations).length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>📭</EmptyStateIcon>
          <h3>Inbox is clear</h3>
          <p>No pending observations from Tina</p>
        </EmptyState>
      ) : (
        categoryOrder.filter(cat => groupedObservations[cat]).map(category => {
          const categoryInfo = getCategoryInfo(category);
          const items = groupedObservations[category];

          return (
            <CategoryGroup key={category}>
              <CategoryHeader>
                <CategoryIcon>{categoryInfo.icon}</CategoryIcon>
                {categoryInfo.label}
                <span style={{ opacity: 0.6, marginLeft: '0.5rem' }}>({items.length})</span>
              </CategoryHeader>

              <ObservationsList>
                {items.map(observation => {
                  const isSelected = selectedIds.includes(observation._id);
                  const createdDate = new Date(observation.createdAt);

                  return (
                    <ObservationCard
                      key={observation._id}
                      $urgency={observation.urgency}
                      style={{
                        opacity: isSelected ? 0.7 : 1,
                        borderLeft: isSelected ? '3px solid #e94560' : undefined
                      }}
                    >
                      <ObservationHeader>
                        <ObservationTitle>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(observation._id)}
                            style={{ marginRight: '0.5rem' }}
                          />
                          {observation.title}
                          <UrgencyBadge $urgency={observation.urgency}>
                            {observation.urgency}
                          </UrgencyBadge>
                          <CategoryBadge>
                            {observation.category}
                          </CategoryBadge>
                        </ObservationTitle>
                      </ObservationHeader>

                      <ObservationSummary>
                        {observation.summary}
                      </ObservationSummary>

                      {observation.details && (
                        <ObservationDetails>
                          {observation.details.metric && (
                            <DetailRow>
                              <DetailLabel>Metric:</DetailLabel>
                              <DetailValue>{observation.details.metric}</DetailValue>
                            </DetailRow>
                          )}
                          {observation.details.value !== undefined && (
                            <DetailRow>
                              <DetailLabel>Value:</DetailLabel>
                              <DetailValue>{observation.details.value}</DetailValue>
                            </DetailRow>
                          )}
                          {observation.details.changePercent !== undefined && (
                            <DetailRow>
                              <DetailLabel>Change:</DetailLabel>
                              <DetailValue style={{
                                color: observation.details.changePercent >= 0 ? '#4caf50' : '#f44336'
                              }}>
                                {observation.details.changePercent >= 0 ? '+' : ''}{observation.details.changePercent.toFixed(1)}%
                              </DetailValue>
                            </DetailRow>
                          )}
                        </ObservationDetails>
                      )}

                      {observation.actionRequest && (
                        <SuggestionBox>
                          <SuggestionTitle>
                            💡 Suggested Action: {observation.actionRequest.type?.replace(/_/g, ' ')}
                          </SuggestionTitle>
                          <SuggestionText>
                            {observation.actionRequest.description}
                          </SuggestionText>
                          <SuggestionButton onClick={() => handleExecuteAction(observation)}>
                            Execute Action
                          </SuggestionButton>
                        </SuggestionBox>
                      )}

                      <ObservationMeta>
                        <span>Created {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString()}</span>
                        {observation.relatedGoalId && <span>• Goal Alert</span>}
                        {observation.relatedStrategyId && <span>• Strategy Alert</span>}
                      </ObservationMeta>

                      <ActionButtons>
                        <SmallButton onClick={() => handleAcknowledge(observation._id)}>
                          ✓ Acknowledge
                        </SmallButton>
                        <SmallButton $variant="danger" onClick={() => handleDismiss(observation._id)}>
                          ✕ Dismiss
                        </SmallButton>
                      </ActionButtons>
                    </ObservationCard>
                  );
                })}
              </ObservationsList>
            </CategoryGroup>
          );
        })
      )}
    </Container>
  );
}

export default Inbox;
