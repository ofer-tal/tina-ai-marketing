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

const WelcomeText = styled.p`
  color: ${cssVar('--color-text-secondary')};
  margin: 0;
  font-size: 0.9rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.span`
  font-size: 0.8rem;
  color: ${cssVar('--color-text-secondary')};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatIcon = styled.span`
  font-size: 1.2rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.$color || '#e94560'};
`;

const StatSubtext = styled.div`
  font-size: 0.75rem;
  color: ${cssVar('--color-text-secondary')};
  margin-top: 0.25rem;
`;

const AtRiskIndicator = styled.span`
  color: #ff9800;
  font-weight: 600;
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: ${cssVar('--color-surface')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 12px;
  padding: 1.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: ${cssVar('--color-text')};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardIcon = styled.span`
  font-size: 1.2rem;
`;

const ListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${cssVar('--color-border')};

  &:last-child {
    border-bottom: none;
  }
`;

const ListItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ListItemName = styled.span`
  color: ${cssVar('--color-text')};
  font-weight: 500;
`;

const ListItemMeta = styled.span`
  font-size: 0.8rem;
  color: ${cssVar('--color-text-secondary')};
`;

const StatusBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${props => {
    switch (props.$status) {
      case 'active':
        return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'at_risk':
        return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
      case 'achieved':
        return `background: rgba(0, 230, 118, 0.2); color: #00e676;`;
      case 'draft':
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
      case 'running':
        return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'completed':
        return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      default:
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const UrgencyBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;

  ${props => {
    switch (props.$urgency) {
      case 'critical':
        return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      case 'high':
        return `background: rgba(255, 152, 0, 0.2); color: #ff9800;`;
      case 'medium':
        return `background: rgba(255, 193, 7, 0.2); color: #ffc107;`;
      default:
        return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
    }
  }}
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${cssVar('--color-border')};
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${cssVar('--color-text-secondary')};
`;

const DateTime = styled.div`
  font-size: 0.85rem;
  color: ${cssVar('--color-text-secondary')};
  margin-top: 0.25rem;
`;

export default function TinaDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentObservations, setRecentObservations] = useState([]);
  const [activeStrategies, setActiveStrategies] = useState([]);
  const [runningExperiments, setRunningExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        goalsRes,
        strategiesRes,
        observationsRes,
        experimentsRes
      ] = await Promise.all([
        fetch('/api/tina/goals/stats'),
        fetch('/api/tina/strategies/stats'),
        fetch('/api/tina/observations/pending?limit=5'),
        fetch('/api/tina/experiments?status=running&limit=5')
      ]);

      const goalsData = await goalsRes.json();
      const strategiesData = await strategiesRes.json();
      const observationsData = await observationsRes.json();
      const experimentsData = await experimentsRes.json();

      setStats({
        goals: goalsData.success ? goalsData.data : null,
        strategies: strategiesData.success ? strategiesData.data : null,
        observations: observationsData.success ? observationsData.metadata?.countByUrgency : null,
        experiments: experimentsData.success ? { running: experimentsData.data.length } : null
      });

      if (observationsData.success) {
        setRecentObservations(observationsData.data);
      }

      if (experimentsData.success) {
        setRunningExperiments(experimentsData.data);
      }

      // Fetch active strategies summary
      const activeStratRes = await fetch('/api/tina/strategies?status=active&limit=5');
      if (activeStratRes.ok) {
        const activeStratData = await activeStratRes.json();
        setActiveStrategies(activeStratData.data || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLocalDateTime = () => {
    return new Date().toLocaleString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const activeGoals = stats?.goals?.active || 0;
  const atRiskGoals = stats?.goals?.atRisk || 0;
  const activeStrategiesCount = stats?.strategies?.active || 0;
  const pendingInbox = stats?.observations?.critical || 0 + stats?.observations?.high || 0;

  return (
    <Container>
      <Header>
        <div>
          <Title>Tina Dashboard</Title>
          <WelcomeText>Welcome back! Here's what Tina is thinking about.</WelcomeText>
          <DateTime>{getLocalDateTime()}</DateTime>
        </div>
      </Header>

      <StatsGrid>
        <StatCard onClick={() => navigate('/tina/goals')}>
          <StatHeader>
            <StatLabel>Active Goals</StatLabel>
            <StatIcon>🎯</StatIcon>
          </StatHeader>
          <StatValue $color="#4caf50">{activeGoals}</StatValue>
          {atRiskGoals > 0 && (
            <StatSubtext><AtRiskIndicator>{atRiskGoals} at risk</AtRiskIndicator></StatSubtext>
          )}
        </StatCard>

        <StatCard onClick={() => navigate('/tina/strategies')}>
          <StatHeader>
            <StatLabel>Active Strategies</StatLabel>
            <StatIcon>🎯</StatIcon>
          </StatHeader>
          <StatValue $color="#2196f3">{activeStrategiesCount}</StatValue>
          <StatSubtext>Strategic initiatives in progress</StatSubtext>
        </StatCard>

        <StatCard onClick={() => navigate('/tina/inbox')}>
          <StatHeader>
            <StatLabel>Pending Inbox</StatLabel>
            <StatIcon>📬</StatIcon>
          </StatHeader>
          <StatValue $color={pendingInbox > 0 ? '#ff9800' : '#9e9e9e'}>{pendingInbox}</StatValue>
          <StatSubtext>Items needing attention</StatSubtext>
        </StatCard>

        <StatCard onClick={() => navigate('/tina/experiments')}>
          <StatHeader>
            <StatLabel>Running Experiments</StatLabel>
            <StatIcon>🧪</StatIcon>
          </StatHeader>
          <StatValue $color="#9c27b0">{stats?.experiments?.running || 0}</StatValue>
          <StatSubtext>Active A/B tests</StatSubtext>
        </StatCard>

        <StatCard onClick={() => navigate('/tina/learnings')}>
          <StatHeader>
            <StatLabel>Validated Learnings</StatLabel>
            <StatIcon>💡</StatIcon>
          </StatHeader>
          <StatValue $color="#00e676">-</StatValue>
          <StatSubtext>Patterns Tina has discovered</StatSubtext>
        </StatCard>
      </StatsGrid>

      <TwoColumnLayout>
        <Column>
          <Card>
            <CardTitle>
              <CardIcon>📬</CardIcon>
              Recent Observations
            </CardTitle>
            {recentObservations.length === 0 ? (
              <EmptyState>No pending observations</EmptyState>
            ) : (
              recentObservations.map(obs => (
                <ListItem key={obs._id}>
                  <ListItemLeft>
                    <UrgencyBadge $urgency={obs.urgency}>
                      {obs.urgency}
                    </UrgencyBadge>
                    <div>
                      <ListItemName>{obs.title}</ListItemName>
                      <ListItemMeta>{obs.category}</ListItemMeta>
                    </div>
                  </ListItemLeft>
                  <ListItemMeta>{new Date(obs.createdAt).toLocaleDateString()}</ListItemMeta>
                </ListItem>
              ))
            )}
          </Card>

          <Card>
            <CardTitle>
              <CardIcon>📊</CardIcon>
              Active Strategies
            </CardTitle>
            {activeStrategies.length === 0 ? (
              <EmptyState>No active strategies</EmptyState>
            ) : (
              activeStrategies.map(strat => (
                <ListItem key={strat._id}>
                  <ListItemLeft>
                    <StatusBadge $status={strat.status}>
                      {strat.status}
                    </StatusBadge>
                    <div>
                      <ListItemName>{strat.name}</ListItemName>
                      <ListItemMeta>{strat.successMetric}</ListItemMeta>
                    </div>
                  </ListItemLeft>
                  <ListItemMeta>
                    {Math.round(((strat.currentValue - strat.currentBaseline) / (strat.targetValue - strat.currentBaseline)) * 100) || 0}%
                  </ListItemMeta>
                </ListItem>
              ))
            )}
          </Card>
        </Column>

        <Column>
          <Card>
            <CardTitle>
              <CardIcon>🧪</CardIcon>
              Running Experiments
            </CardTitle>
            {runningExperiments.length === 0 ? (
              <EmptyState>No running experiments</EmptyState>
            ) : (
              runningExperiments.map(exp => (
                <ListItem key={exp._id}>
                  <ListItemLeft>
                    <StatusBadge $status="running">
                      running
                    </StatusBadge>
                    <div>
                      <ListItemName>{exp.name}</ListItemName>
                      <ListItemMeta>{exp.variants?.length || 2} variants</ListItemMeta>
                    </div>
                  </ListItemLeft>
                  <ListItemMeta>
                    {exp.endDate ? new Date(exp.endDate).toLocaleDateString() : '-'}
                  </ListItemMeta>
                </ListItem>
              ))
            )}
          </Card>

          <Card>
            <CardTitle>
              <CardIcon>🎯</CardIcon>
              Goal Progress Summary
            </CardTitle>
            <EmptyState>
              View detailed goals page for milestone progress and trajectory analysis.
            </EmptyState>
          </Card>
        </Column>
      </TwoColumnLayout>
    </Container>
  );
}
