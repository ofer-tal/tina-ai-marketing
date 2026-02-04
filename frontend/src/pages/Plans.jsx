import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const HorizonTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const HorizonTab = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? '#e94560' : 'transparent'};
  border: 1px solid ${props => props.$active ? '#e94560' : cssVar('--color-border')};
  border-radius: 6px;
  color: ${props => props.$active ? 'white' : cssVar('--color-text')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const PlanCard = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'active': return '#4caf50';
      case 'completed': return '#2196f3';
      case 'archived': return '#9e9e9e';
      default: return cssVar('--color-border');
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

const PlanHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PlanTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
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
      case 'active': return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'completed': return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      case 'archived': return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
      case 'draft': return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
      default: return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const Period = styled.div`
  font-size: 0.85rem;
  color: ${cssVar('--color-text-secondary')};
  margin-bottom: 1rem;
`;

const FocusAreas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const FocusAreaTag = styled.span`
  padding: 0.2rem 0.5rem;
  background: rgba(233, 69, 96, 0.1);
  border-radius: 4px;
  font-size: 0.75rem;
  color: #e94560;
`;

const ProgressSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${cssVar('--color-border')};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${cssVar('--color-border')};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  font-size: 0.75rem;
  color: ${cssVar('--color-text-secondary')};
  margin-top: 0.5rem;
`;

const CreateButton = styled.button`
  padding: 0.5rem 1rem;
  background: #e94560;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #d63850;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${cssVar('--color-text-secondary')};
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
  color: #e94560;
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
  color: ${cssVar('--color-text')};
`;

const ActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ActionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
`;

const ActionStatus = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.$status) {
      case 'completed': return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'in_progress': return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      case 'cancelled': return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      case 'skipped': return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
      default: return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
    }
  }}
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

export default function Plans() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentHorizon, setCurrentHorizon] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPlanDetail(id);
    } else {
      fetchPlans();
      fetchStats();
    }
  }, [currentHorizon, id]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const horizon = currentHorizon === 'all' ? '' : `?horizon=${currentHorizon}`;
      const response = await fetch(`/api/tina/plans${horizon}`);
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/plans/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching plan stats:', error);
    }
  };

  const fetchPlanDetail = async (planId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tina/plans/${planId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedPlan(data.data);
      }
    } catch (error) {
      console.error('Error fetching plan detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/tina/plans/create');
  };

  const handlePlanClick = (plan) => {
    navigate(`/tina/plans/${plan._id}`);
  };

  const handleBack = () => {
    navigate('/tina/plans');
    setSelectedPlan(null);
  };

  if (loading) return <LoadingSpinner />;

  // Show detail view if a plan is selected
  if (id && selectedPlan) {
    return (
      <Container>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BackButton onClick={handleBack}>← Back</BackButton>
            <Title>
              {selectedPlan.horizon.charAt(0).toUpperCase() + selectedPlan.horizon.slice(1)} Plan
            </Title>
            <StatusBadge $status={selectedPlan.status}>{selectedPlan.status}</StatusBadge>
          </div>
        </Header>

        <DetailPanel>
          <DetailSection>
            <DetailTitle>Period</DetailTitle>
            <Period>
              {new Date(selectedPlan.period.start).toLocaleDateString()} - {new Date(selectedPlan.period.end).toLocaleDateString()}
            </Period>
          </DetailSection>

          {selectedPlan.focusAreas && selectedPlan.focusAreas.length > 0 && (
            <DetailSection>
              <DetailTitle>Focus Areas ({selectedPlan.focusAreas.length})</DetailTitle>
              <FocusAreas>
                {selectedPlan.focusAreas.map((area, i) => (
                  <FocusAreaTag key={i}>
                    {area.name} (priority: {area.priority})
                  </FocusAreaTag>
                ))}
              </FocusAreas>
            </DetailSection>
          )}

          {selectedPlan.scheduledActions && selectedPlan.scheduledActions.length > 0 && (
            <DetailSection>
              <DetailTitle>Scheduled Actions ({selectedPlan.scheduledActions.length})</DetailTitle>
              <ActionList>
                {selectedPlan.scheduledActions.map((action, i) => (
                  <ActionItem key={i}>
                    <ActionStatus $status={action.status}>{action.status}</ActionStatus>
                    <div>
                      <div>{action.name}</div>
                      {action.description && (
                        <div style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
                          {action.description}
                        </div>
                      )}
                    </div>
                    {action.scheduledFor && (
                      <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#a0a0a0' }}>
                        {new Date(action.scheduledFor).toLocaleDateString()}
                      </div>
                    )}
                  </ActionItem>
                ))}
              </ActionList>
            </DetailSection>
          )}

          {selectedPlan.progress && (
            <DetailSection>
              <DetailTitle>Progress</DetailTitle>
              <ProgressBar>
                <ProgressFill $percent={selectedPlan.progress.percentComplete || 0} />
              </ProgressBar>
              <ProgressText>
                {selectedPlan.progress.actionsCompleted || 0} / {selectedPlan.progress.actionsTotal || 0} actions completed
              </ProgressText>
            </DetailSection>
          )}

          {selectedPlan.kpis && selectedPlan.kpis.length > 0 && (
            <DetailSection>
              <DetailTitle>Key Performance Indicators</DetailTitle>
              <ActionList>
                {selectedPlan.kpis.map((kpi, i) => (
                  <ActionItem key={i}>
                    <div>{kpi.metric}</div>
                    <div style={{ marginLeft: 'auto' }}>
                      {kpi.current} / {kpi.target}
                    </div>
                    <StatusBadge $status={kpi.status}>{kpi.status}</StatusBadge>
                  </ActionItem>
                ))}
              </ActionList>
            </DetailSection>
          )}
        </DetailPanel>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Plans</Title>
        <CreateButton onClick={handleCreate}>+ Create Plan</CreateButton>
      </Header>

      {stats && (
        <StatsRow>
          <StatCard>
            <StatLabel>Total</StatLabel>
            <StatValue>{stats.total || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Active</StatLabel>
            <StatValue>{stats.active || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Weekly</StatLabel>
            <StatValue>{stats.byHorizon?.weekly || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Monthly</StatLabel>
            <StatValue>{stats.byHorizon?.monthly || 0}</StatValue>
          </StatCard>
        </StatsRow>
      )}

      <HorizonTabs>
        <HorizonTab $active={currentHorizon === 'all'} onClick={() => setCurrentHorizon('all')}>
          All
        </HorizonTab>
        <HorizonTab $active={currentHorizon === 'weekly'} onClick={() => setCurrentHorizon('weekly')}>
          Weekly
        </HorizonTab>
        <HorizonTab $active={currentHorizon === 'monthly'} onClick={() => setCurrentHorizon('monthly')}>
          Monthly
        </HorizonTab>
        <HorizonTab $active={currentHorizon === 'quarterly'} onClick={() => setCurrentHorizon('quarterly')}>
          Quarterly
        </HorizonTab>
      </HorizonTabs>

      {plans.length === 0 ? (
        <EmptyState>
          <h3>No plans found</h3>
          <p>Create a plan to organize focus areas and scheduled actions.</p>
        </EmptyState>
      ) : (
        <PlansGrid>
          {plans.map(plan => (
            <PlanCard
              key={plan._id}
              $status={plan.status}
              onClick={() => handlePlanClick(plan)}
            >
              <PlanHeader>
                <PlanTitle>{plan.horizon.charAt(0).toUpperCase() + plan.horizon.slice(1)} Plan</PlanTitle>
                <StatusBadge $status={plan.status}>{plan.status}</StatusBadge>
              </PlanHeader>

              <Period>
                {new Date(plan.period.start).toLocaleDateString()} - {new Date(plan.period.end).toLocaleDateString()}
              </Period>

              {plan.focusAreas && plan.focusAreas.length > 0 && (
                <FocusAreas>
                  {plan.focusAreas.map((area, i) => (
                    <FocusAreaTag key={i}>{area.name}</FocusAreaTag>
                  ))}
                </FocusAreas>
              )}

              <ProgressSection>
                <ProgressBar>
                  <ProgressFill $percent={plan.progress?.percentComplete || 0} />
                </ProgressBar>
                <ProgressText>
                  {plan.progress?.actionsCompleted || 0} / {plan.progress?.actionsTotal || 0} actions completed
                </ProgressText>
              </ProgressSection>
            </PlanCard>
          ))}
        </PlansGrid>
      )}
    </Container>
  );
}
