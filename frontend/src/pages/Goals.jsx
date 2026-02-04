import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#e94560'};
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
`;

const GoalsGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const GoalCard = styled.div`
  background: #16213e;
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'active': return '#4caf50';
      case 'at_risk': return '#ff9800';
      case 'achieved': return '#2196f3';
      case 'missed': return '#f44336';
      default: return '#2d3561';
    }
  }};
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const GoalName = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  color: #eaeaea;
`;

const GoalType = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
  background: ${props => {
    switch (props.$type) {
      case 'revenue': return 'rgba(76, 175, 80, 0.2)';
      case 'growth': return 'rgba(33, 150, 243, 0.2)';
      case 'engagement': return 'rgba(255, 152, 0, 0.2)';
      case 'brand': return 'rgba(156, 39, 176, 0.2)';
      default: return 'rgba(158, 158, 158, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'revenue': return '#4caf50';
      case 'growth': return '#2196f3';
      case 'engagement': return '#ff9800';
      case 'brand': return '#9c27b0';
      default: return '#9e9e9e';
    }
  }};
  margin-left: 0.5rem;
`;

const GoalStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
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
        return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      case 'missed':
        return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      case 'cancelled':
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
      default:
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const GoalDescription = styled.p`
  color: #a0a0a0;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  line-height: 1.5;
`;

const GoalMetrics = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const Metric = styled.div`
  display: flex;
  flex-direction: column;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricValue = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: #eaeaea;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: #2d3561;
  border-radius: 3px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.$percent >= 100) return 'linear-gradient(90deg, #4caf50, #8bc34a)';
    if (props.$percent >= 80) return 'linear-gradient(90deg, #2196f3, #03a9f4)';
    if (props.$percent >= 50) return 'linear-gradient(90deg, #ff9800, #ffb74d)';
    if (props.$percent < 30 && props.$percent > 0) return 'linear-gradient(90deg, #f44336, #ef5350)';
    return 'linear-gradient(90deg, #e94560, #7b2cbf)';
  }};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const TrajectoryIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
`;

const TrajectoryDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$trend) {
      case 'ahead': return '#4caf50';
      case 'behind': return '#f44336';
      case 'on_track': return '#2196f3';
      default: return '#9e9e9e';
    }
  }};
`;

const TrajectoryText = styled.span`
  color: ${props => {
    switch (props.$trend) {
      case 'ahead': return '#4caf50';
      case 'behind': return '#f44336';
      case 'on_track': return '#2196f3';
      default: return '#9e9e9e';
    }
  }};
  font-weight: 500;
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
`;

const ModalContent = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #eaeaea;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.6rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

const Textarea = styled.textarea`
  padding: 0.6rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }
`;

const Row = styled.div`
  display: flex;
  gap: 1rem;
`;

const MilestoneList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const MilestoneItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(233, 69, 96, 0.1);
  border-radius: 6px;
`;

const MilestoneCheckbox = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${props => props.$achieved ? '#4caf50' : '#2d3561'};
  background: ${props => props.$achieved ? '#4caf50' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
`;

const LinkedStrategies = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const LinkedStrategyItem = styled.div`
  padding: 0.5rem 0.75rem;
  background: #16213e;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #eaeaea;
`;

const DetailContainer = styled.div`
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
`;

const DetailHeader = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`;

const DetailTitle = styled.h1`
  font-size: 1.75rem;
  margin: 0 0 0.5rem 0;
  color: #eaeaea;
`;

const DetailMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 1rem;
`;

const Tag = styled.span`
  padding: 0.3rem 0.75rem;
  background: rgba(123, 44, 191, 0.2);
  color: #b388ff;
  border-radius: 16px;
  font-size: 0.8rem;
`;

const Section = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #eaeaea;
  font-size: 1.1rem;
`;

const ProgressSection = styled.div`
  margin-top: 1rem;
`;

const ProgressRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;

  &:hover {
    background: #16213e;
    border-color: #e94560;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #2d3561;
`;

function GoalsList() {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'all', type: 'all' });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGoals();
    fetchStats();
  }, [filter]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.type !== 'all') params.append('type', filter.type);

      const response = await fetch(`/api/tina/goals?${params}`);
      const data = await response.json();

      if (data.success) {
        setGoals(data.data);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/goals/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const goalData = {
      name: formData.get('name'),
      description: formData.get('description'),
      type: formData.get('type'),
      targetValue: parseFloat(formData.get('targetValue')),
      targetDate: formData.get('targetDate'),
      startValue: parseFloat(formData.get('startValue')) || 0,
      checkInFrequency: formData.get('checkInFrequency'),
      priority: parseInt(formData.get('priority')) || 5
    };

    try {
      const response = await fetch('/api/tina/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData)
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        fetchGoals();
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const filteredGoals = goals.filter(g => {
    if (search) {
      const searchLower = search.toLowerCase();
      return g.name.toLowerCase().includes(searchLower) ||
             (g.description && g.description.toLowerCase().includes(searchLower));
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>Marketing Goals</Title>
        <Actions>
          <Button onClick={() => setShowModal(true)}>+ New Goal</Button>
        </Actions>
      </Header>

      {stats && (
        <StatsRow>
          <StatCard>
            <StatValue>{stats.total || 0}</StatValue>
            <StatLabel>Total Goals</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#4caf50">{stats.active || 0}</StatValue>
            <StatLabel>Active</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#ff9800">{stats.atRisk || 0}</StatValue>
            <StatLabel>At Risk</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#2196f3">{stats.achieved || 0}</StatValue>
            <StatLabel>Achieved</StatLabel>
          </StatCard>
        </StatsRow>
      )}

      <FilterBar>
        <FilterSelect
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="at_risk">At Risk</option>
          <option value="achieved">Achieved</option>
          <option value="missed">Missed</option>
        </FilterSelect>

        <FilterSelect
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
        >
          <option value="all">All Types</option>
          <option value="revenue">Revenue</option>
          <option value="growth">Growth</option>
          <option value="engagement">Engagement</option>
          <option value="brand">Brand</option>
          <option value="experiment">Experiment</option>
          <option value="custom">Custom</option>
        </FilterSelect>

        <SearchInput
          type="text"
          placeholder="Search goals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FilterBar>

      {filteredGoals.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>🎯</EmptyStateIcon>
          <h3>No goals found</h3>
          <p>Create your first marketing goal to track progress toward your objectives</p>
        </EmptyState>
      ) : (
        <GoalsGrid>
          {filteredGoals.map(goal => {
            const daysRemaining = Math.max(0, Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)));
            const trajectoryTrend = goal.trajectory?.trend || 'unknown';

            return (
              <GoalCard
                key={goal._id}
                $status={goal.status}
                onClick={() => navigate(`/tina/goals/${goal._id}`)}
              >
                <GoalHeader>
                  <GoalName>
                    {goal.name}
                    <GoalType $type={goal.type}>{goal.type}</GoalType>
                  </GoalName>
                  <GoalStatus $status={goal.status}>
                    {goal.status.replace('_', ' ')}
                  </GoalStatus>
                </GoalHeader>

                {goal.description && (
                  <GoalDescription>{goal.description}</GoalDescription>
                )}

                <GoalMetrics>
                  <Metric>
                    <MetricLabel>Target</MetricLabel>
                    <MetricValue>{goal.targetValue.toLocaleString()}</MetricValue>
                  </Metric>
                  <Metric>
                    <MetricLabel>Current</MetricLabel>
                    <MetricValue>{goal.currentValue?.toLocaleString() || 0}</MetricValue>
                  </Metric>
                  <Metric>
                    <MetricLabel>Progress</MetricLabel>
                    <MetricValue>{Math.min(100, Math.max(0, goal.progressPercent || 0)).toFixed(0)}%</MetricValue>
                  </Metric>
                  <Metric>
                    <MetricLabel>Days Left</MetricLabel>
                    <MetricValue>{daysRemaining}</MetricValue>
                  </Metric>
                </GoalMetrics>

                <ProgressBar>
                  <ProgressFill $percent={goal.progressPercent || 0} style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent || 0))}%` }} />
                </ProgressBar>

                <TrajectoryIndicator>
                  <TrajectoryDot $trend={trajectoryTrend}>
                    {trajectoryTrend === 'ahead' ? '↑' : trajectoryTrend === 'behind' ? '↓' : trajectoryTrend === 'on_track' ? '→' : '?'}
                  </TrajectoryDot>
                  <TrajectoryText $trend={trajectoryTrend}>
                    {trajectoryTrend === 'ahead' ? 'Ahead of schedule' :
                     trajectoryTrend === 'behind' ? 'Behind schedule' :
                     trajectoryTrend === 'on_track' ? 'On track' : 'Unknown'}
                  </TrajectoryText>
                </TrajectoryIndicator>
              </GoalCard>
            );
          })}
        </GoalsGrid>
      )}

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Create New Goal</ModalTitle>
            <Form onSubmit={handleCreate}>
              <FormGroup>
                <Label>Goal Name *</Label>
                <Input name="name" required placeholder="e.g., Reach $10,000 MRR" />
              </FormGroup>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Type *</Label>
                  <FilterSelect name="type" defaultValue="custom">
                    <option value="revenue">Revenue</option>
                    <option value="growth">Growth</option>
                    <option value="engagement">Engagement</option>
                    <option value="brand">Brand</option>
                    <option value="experiment">Experiment</option>
                    <option value="custom">Custom</option>
                  </FilterSelect>
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Target Value *</Label>
                  <Input name="targetValue" type="number" required placeholder="Target number" />
                </FormGroup>
              </Row>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Target Date *</Label>
                  <Input name="targetDate" type="date" required />
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Starting Value</Label>
                  <Input name="startValue" type="number" placeholder="0" />
                </FormGroup>
              </Row>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Check-in Frequency</Label>
                  <FilterSelect name="checkInFrequency" defaultValue="weekly">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </FilterSelect>
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Priority (1-10)</Label>
                  <Input name="priority" type="number" min="1" max="10" defaultValue="5" />
                </FormGroup>
              </Row>

              <FormGroup>
                <Label>Description</Label>
                <Textarea name="description" placeholder="Describe this goal and why it matters..." />
              </FormGroup>

              <Actions>
                <Button type="button" $variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Goal</Button>
              </Actions>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const fetchGoal = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tina/goals/${id}`);
      const data = await response.json();

      if (data.success) {
        setGoal(data.data);
      }
    } catch (error) {
      console.error('Error fetching goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      const response = await fetch(`/api/tina/goals/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setGoal(data.data);
      }
    } catch (error) {
      console.error(`Error ${action}ing goal:`, error);
    }
  };

  const handleUpdateProgress = async () => {
    const newValue = prompt('Enter current value:', goal.currentValue);
    if (newValue !== null) {
      const value = parseFloat(newValue);
      if (!isNaN(value)) {
        await handleAction('update-progress');

        try {
          const response = await fetch(`/api/tina/goals/${id}/update-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentValue: value })
          });

          const data = await response.json();
          if (data.success) {
            setGoal(data.data);
          }
        } catch (error) {
          console.error('Error updating progress:', error);
        }
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!goal) {
    return (
      <Container>
        <EmptyState>
          <EmptyStateIcon>🔍</EmptyStateIcon>
          <h3>Goal not found</h3>
          <Button onClick={() => navigate('/tina/goals')}>Back to Goals</Button>
        </EmptyState>
      </Container>
    );
  }

  const daysRemaining = Math.max(0, Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)));
  const trajectoryTrend = goal.trajectory?.trend || 'unknown';

  return (
    <DetailContainer>
      <BackButton onClick={() => navigate('/tina/goals')}>
        ← Back to Goals
      </BackButton>

      <DetailHeader>
        <DetailHeader>
          <DetailTitle>
            {goal.name}
            <GoalType $type={goal.type} style={{ marginLeft: '1rem' }}>
              {goal.type}
            </GoalType>
          </DetailTitle>
          <DetailMeta>
            <GoalStatus $status={goal.status}>
              {goal.status.replace('_', ' ')}
            </GoalStatus>
            {goal.priority && <Tag>Priority: {goal.priority}</Tag>}
            {goal.checkInFrequency && <Tag>{goal.checkInFrequency} check-in</Tag>}
          </DetailMeta>
        </DetailHeader>

        <ActionButtons>
          {goal.status === 'draft' && (
            <Button onClick={() => handleAction('activate')}>Activate Goal</Button>
          )}
          {goal.status === 'active' && (
            <>
              <Button onClick={handleUpdateProgress}>Update Progress</Button>
              <Button onClick={() => handleAction('cancel')} $variant="secondary">Cancel Goal</Button>
            </>
          )}
          {goal.status === 'at_risk' && (
            <>
              <Button onClick={handleUpdateProgress}>Update Progress</Button>
              <Button onClick={() => handleAction('acknowledge-alert')} $variant="secondary">Acknowledge Alert</Button>
            </>
          )}
          {['active', 'at_risk'].includes(goal.status) && (
            <Button onClick={() => handleAction('mark-achieved')} $variant="secondary">Mark Achieved</Button>
          )}
        </ActionButtons>
      </DetailHeader>

      {goal.description && (
        <Section>
          <SectionTitle>Description</SectionTitle>
          <p style={{ color: '#a0a0a0', margin: 0 }}>{goal.description}</p>
        </Section>
      )}

      <Section>
        <SectionTitle>Progress</SectionTitle>
        <ProgressSection>
          <ProgressRow>
            <span style={{ color: '#a0a0a0' }}>Progress</span>
            <span style={{ color: '#eaeaea' }}>
              {goal.currentValue?.toLocaleString() || 0} / {goal.targetValue.toLocaleString()}
            </span>
          </ProgressRow>
          <ProgressBar>
            <ProgressFill $percent={goal.progressPercent || 0} style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent || 0))}%` }} />
          </ProgressBar>
          <ProgressRow style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
              Started from {goal.startValue?.toLocaleString() || 0}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#eaeaea', fontWeight: 600 }}>
              {Math.min(100, Math.max(0, goal.progressPercent || 0)).toFixed(0)}% Complete
            </span>
          </ProgressRow>
        </ProgressSection>

        <TrajectoryIndicator>
          <TrajectoryDot $trend={trajectoryTrend}>
            {trajectoryTrend === 'ahead' ? '↑' : trajectoryTrend === 'behind' ? '↓' : trajectoryTrend === 'on_track' ? '→' : '?'}
          </TrajectoryDot>
          <TrajectoryText $trend={trajectoryTrend}>
            {trajectoryTrend === 'ahead' ? 'Ahead of schedule' :
             trajectoryTrend === 'behind' ? 'Behind schedule' :
             trajectoryTrend === 'on_track' ? 'On track' : 'Unknown trajectory'}
          </TrajectoryText>
        </TrajectoryIndicator>

        <ProgressRow style={{ marginTop: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
            Target Date
          </span>
          <span style={{ fontSize: '0.85rem', color: '#eaeaea' }}>
            {new Date(goal.targetDate).toLocaleDateString()} ({daysRemaining} days remaining)
          </span>
        </ProgressRow>
      </Section>

      {goal.milestones && goal.milestones.length > 0 && (
        <Section>
          <SectionTitle>Milestones</SectionTitle>
          <MilestoneList>
            {goal.milestones.map((milestone, idx) => (
              <MilestoneItem key={idx}>
                <MilestoneCheckbox $achieved={milestone.achieved}>
                  {milestone.achieved ? '✓' : ''}
                </MilestoneCheckbox>
                <div>
                  <div style={{ fontWeight: 500, color: '#eaeaea' }}>
                    {milestone.name}
                  </div>
                  {milestone.targetValue !== undefined && (
                    <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                      Target: {milestone.targetValue}
                      {milestone.targetDate && ` by ${new Date(milestone.targetDate).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
              </MilestoneItem>
            ))}
          </MilestoneList>
        </Section>
      )}

      {goal.linkedStrategies && goal.linkedStrategies.length > 0 && (
        <Section>
          <SectionTitle>Linked Strategies</SectionTitle>
          <LinkedStrategies>
            {goal.linkedStrategies.map(strategy => (
              <LinkedStrategyItem key={strategy.strategyId}>
                🎯 {strategy.name} ({strategy.status})
              </LinkedStrategyItem>
            ))}
          </LinkedStrategies>
        </Section>
      )}

      {goal.notes && goal.notes.length > 0 && (
        <Section>
          <SectionTitle>Notes</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {goal.notes.map((note, idx) => (
              <div key={idx} style={{
                background: '#16213e',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}>
                <div style={{ color: '#a0a0a0', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  {note.addedBy} • {new Date(note.addedAt).toLocaleString()}
                </div>
                <div style={{ color: '#eaeaea' }}>{note.content}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {goal.alerts && goal.alerts.filter(a => !a.acknowledged).length > 0 && (
        <Section>
          <SectionTitle>Active Alerts</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {goal.alerts.filter(a => !a.acknowledged).map((alert, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                background: alert.severity === 'critical' ? 'rgba(244, 67, 54, 0.2)' :
                               alert.severity === 'warning' ? 'rgba(255, 152, 0, 0.2)' :
                               'rgba(33, 150, 243, 0.2)'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {alert.type.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{ color: '#eaeaea' }}>{alert.message}</div>
                <div style={{ fontSize: '0.75rem', color: '#a0a0a0', marginTop: '0.25rem' }}>
                  {new Date(alert.triggeredAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </DetailContainer>
  );
}

export default function Goals() {
  const { id } = useParams();

  return id ? <GoalDetail /> : <GoalsList />;
}
