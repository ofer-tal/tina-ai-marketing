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

const StrategiesGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const StrategyCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const StrategyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const StrategyName = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  color: #eaeaea;
`;

const StrategyStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${props => {
    switch (props.$status) {
      case 'active':
        return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'completed':
        return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      case 'paused':
        return `background: rgba(255, 193, 7, 0.2); color: #ffc107;`;
      case 'cancelled':
      case 'failed':
        return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      default:
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const StrategyLevel = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  background: ${props => props.$level === 'broad' ? 'rgba(123, 44, 191, 0.2)' : 'rgba(0, 150, 136, 0.2)'};
  color: ${props => props.$level === 'broad' ? '#7b2cbf' : '#009688'};
  margin-left: 0.5rem;
`;

const StrategyDescription = styled.p`
  color: #a0a0a0;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  line-height: 1.5;
`;

const StrategyHypothesis = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border-left: 3px solid #e94560;
  padding: 0.75rem;
  border-radius: 0 4px 4px 0;
  margin: 0.75rem 0;
  font-size: 0.85rem;
  color: #eaeaea;
`;

const StrategyMetrics = styled.div`
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
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 3px;
  transition: width 0.3s ease;
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

function StrategiesList() {
  const [strategies, setStrategies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'all', level: 'all', category: '' });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStrategies();
    fetchStats();
  }, [filter]);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.level !== 'all') params.append('level', filter.level);
      if (filter.category) params.append('category', filter.category);

      const response = await fetch(`/api/tina/strategies?${params}`);
      const data = await response.json();

      if (data.success) {
        setStrategies(data.data);
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/strategies/stats');
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

    const strategyData = {
      name: formData.get('name'),
      description: formData.get('description'),
      hypothesis: formData.get('hypothesis'),
      successMetric: formData.get('successMetric'),
      targetValue: parseFloat(formData.get('targetValue')),
      currentBaseline: parseFloat(formData.get('currentBaseline')) || 0,
      level: formData.get('level'),
      category: formData.get('category'),
      priority: parseInt(formData.get('priority')) || 5
    };

    try {
      const response = await fetch('/api/tina/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData)
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        fetchStrategies();
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
    }
  };

  const filteredStrategies = strategies.filter(s => {
    if (search) {
      const searchLower = search.toLowerCase();
      return s.name.toLowerCase().includes(searchLower) ||
             s.hypothesis.toLowerCase().includes(searchLower);
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>Marketing Strategies</Title>
        <Actions>
          <Button onClick={() => setShowModal(true)}>+ New Strategy</Button>
        </Actions>
      </Header>

      {stats && (
        <StatsRow>
          <StatCard>
            <StatValue>{stats.total || 0}</StatValue>
            <StatLabel>Total Strategies</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#4caf50">{stats.active || 0}</StatValue>
            <StatLabel>Active</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#2196f3">{stats.completed || 0}</StatValue>
            <StatLabel>Completed</StatLabel>
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
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </FilterSelect>

        <FilterSelect
          value={filter.level}
          onChange={(e) => setFilter({ ...filter, level: e.target.value })}
        >
          <option value="all">All Levels</option>
          <option value="broad">Broad</option>
          <option value="specific">Specific</option>
        </FilterSelect>

        <FilterSelect
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="growth">Growth</option>
          <option value="engagement">Engagement</option>
          <option value="brand">Brand</option>
          <option value="revenue">Revenue</option>
          <option value="content">Content</option>
          <option value="ads">Ads</option>
        </FilterSelect>

        <SearchInput
          type="text"
          placeholder="Search strategies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FilterBar>

      {filteredStrategies.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>📋</EmptyStateIcon>
          <h3>No strategies found</h3>
          <p>Create your first marketing strategy to get started</p>
        </EmptyState>
      ) : (
        <StrategiesGrid>
          {filteredStrategies.map(strategy => {
            const progress = strategy.targetValue > 0 && strategy.currentBaseline !== undefined
              ? Math.round(((strategy.currentValue - strategy.currentBaseline) / (strategy.targetValue - strategy.currentBaseline)) * 100)
              : 0;

            return (
              <StrategyCard
                key={strategy._id}
                onClick={() => navigate(`/tina/strategies/${strategy._id}`)}
              >
                <StrategyHeader>
                  <StrategyName>
                    {strategy.name}
                    <StrategyLevel $level={strategy.level}>
                      {strategy.level}
                    </StrategyLevel>
                  </StrategyName>
                  <StrategyStatus $status={strategy.status}>
                    {strategy.status}
                  </StrategyStatus>
                </StrategyHeader>

                {strategy.description && (
                  <StrategyDescription>{strategy.description}</StrategyDescription>
                )}

                <StrategyHypothesis>
                  <strong>Hypothesis:</strong> {strategy.hypothesis}
                </StrategyHypothesis>

                <StrategyMetrics>
                  <Metric>
                    <MetricLabel>Metric</MetricLabel>
                    <MetricValue>{strategy.successMetric}</MetricValue>
                  </Metric>
                  <Metric>
                    <MetricLabel>Target</MetricLabel>
                    <MetricValue>{strategy.targetValue.toLocaleString()}</MetricValue>
                  </Metric>
                  <Metric>
                    <MetricLabel>Current</MetricLabel>
                    <MetricValue>{strategy.currentValue?.toLocaleString() || 0}</MetricValue>
                  </Metric>
                  <Metric>
                    <MetricLabel>Progress</MetricLabel>
                    <MetricValue>{Math.min(100, Math.max(0, progress))}%</MetricValue>
                  </Metric>
                </StrategyMetrics>

                {strategy.targetValue > 0 && (
                  <ProgressBar>
                    <ProgressFill style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                  </ProgressBar>
                )}
              </StrategyCard>
            );
          })}
        </StrategiesGrid>
      )}

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Create New Strategy</ModalTitle>
            <Form onSubmit={handleCreate}>
              <FormGroup>
                <Label>Name *</Label>
                <Input name="name" required placeholder="Strategy name" />
              </FormGroup>

              <FormGroup>
                <Label>Hypothesis *</Label>
                <Textarea name="hypothesis" required placeholder="What do you believe will happen?" />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <Textarea name="description" placeholder="Detailed description (optional)" />
              </FormGroup>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Success Metric *</Label>
                  <Input name="successMetric" required placeholder="e.g., followers, revenue" />
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Target Value *</Label>
                  <Input name="targetValue" type="number" required placeholder="Target number" />
                </FormGroup>
              </Row>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Current Baseline</Label>
                  <Input name="currentBaseline" type="number" placeholder="Starting value" />
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Level</Label>
                  <FilterSelect name="level" defaultValue="broad">
                    <option value="broad">Broad (Parent)</option>
                    <option value="specific">Specific (Child)</option>
                  </FilterSelect>
                </FormGroup>
              </Row>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Category</Label>
                  <FilterSelect name="category" defaultValue="general">
                    <option value="general">General</option>
                    <option value="growth">Growth</option>
                    <option value="engagement">Engagement</option>
                    <option value="brand">Brand</option>
                    <option value="revenue">Revenue</option>
                    <option value="content">Content</option>
                    <option value="ads">Ads</option>
                  </FilterSelect>
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Priority (1-10)</Label>
                  <Input name="priority" type="number" min="1" max="10" defaultValue="5" />
                </FormGroup>
              </Row>

              <Actions>
                <Button type="button" $variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Strategy</Button>
              </Actions>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

function StrategyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategy();
  }, [id]);

  const fetchStrategy = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tina/strategies/${id}`);
      const data = await response.json();

      if (data.success) {
        setStrategy(data.data);
      }
    } catch (error) {
      console.error('Error fetching strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      const response = await fetch(`/api/tina/strategies/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setStrategy(data.data);
      }
    } catch (error) {
      console.error(`Error ${action}ing strategy:`, error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!strategy) {
    return (
      <Container>
        <EmptyState>
          <EmptyStateIcon>🔍</EmptyStateIcon>
          <h3>Strategy not found</h3>
          <Button onClick={() => navigate('/tina/strategies')}>Back to Strategies</Button>
        </EmptyState>
      </Container>
    );
  }

  const progress = strategy.progress || {
    baseline: strategy.currentBaseline || 0,
    current: strategy.currentValue || 0,
    target: strategy.targetValue,
    progressPercent: strategy.targetValue > 0 && strategy.currentBaseline !== undefined
      ? Math.round(((strategy.currentValue - strategy.currentBaseline) / (strategy.targetValue - strategy.currentBaseline)) * 100)
      : 0
  };

  return (
    <DetailContainer>
      <BackButton onClick={() => navigate('/tina/strategies')}>
        ← Back to Strategies
      </BackButton>

      <DetailHeader>
        <DetailHeader>
          <DetailTitle>
            {strategy.name}
            <StrategyLevel $level={strategy.level} style={{ marginLeft: '1rem' }}>
              {strategy.level}
            </StrategyLevel>
          </DetailTitle>
          <DetailMeta>
            <StrategyStatus $status={strategy.status}>
              {strategy.status}
            </StrategyStatus>
            {strategy.category && <Tag>{strategy.category}</Tag>}
            {strategy.priority && <Tag>Priority: {strategy.priority}</Tag>}
          </DetailMeta>
        </DetailHeader>

        <ActionButtons>
          {strategy.status === 'draft' && (
            <Button onClick={() => handleAction('approve')}>Approve</Button>
          )}
          {strategy.status === 'active' && (
            <Button onClick={() => handleAction('pause')} $variant="secondary">Pause</Button>
          )}
          {strategy.status === 'paused' && (
            <Button onClick={() => handleAction('resume')}>Resume</Button>
          )}
          {['draft', 'active', 'paused'].includes(strategy.status) && (
            <Button onClick={() => handleAction('cancel')} $variant="secondary">Cancel</Button>
          )}
          {['active', 'paused'].includes(strategy.status) && (
            <Button onClick={() => navigate(`/tina/strategies/${id}/complete`)}>Complete</Button>
          )}
        </ActionButtons>
      </DetailHeader>

      {strategy.description && (
        <Section>
          <SectionTitle>Description</SectionTitle>
          <p style={{ color: '#a0a0a0', margin: 0 }}>{strategy.description}</p>
        </Section>
      )}

      <Section>
        <SectionTitle>Hypothesis</SectionTitle>
        <div style={{
          background: 'rgba(233, 69, 96, 0.1)',
          borderLeft: '3px solid #e94560',
          padding: '1rem',
          borderRadius: '0 4px 4px 0',
          color: '#eaeaea'
        }}>
          {strategy.hypothesis}
        </div>
      </Section>

      <Section>
        <SectionTitle>Progress</SectionTitle>
        <ProgressSection>
          <ProgressRow>
            <span style={{ color: '#a0a0a0' }}>{strategy.successMetric}</span>
            <span style={{ color: '#eaeaea' }}>
              {progress.current} / {progress.target}
            </span>
          </ProgressRow>
          <ProgressBar>
            <ProgressFill style={{ width: `${Math.min(100, Math.max(0, progress.progressPercent))}%` }} />
          </ProgressBar>
          <ProgressRow style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
              Started from {progress.baseline}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#eaeaea', fontWeight: 600 }}>
              {Math.min(100, Math.max(0, progress.progressPercent))}% Complete
            </span>
          </ProgressRow>
        </ProgressSection>
      </Section>

      {strategy.timeframe && (strategy.timeframe.start || strategy.timeframe.end) && (
        <Section>
          <SectionTitle>Timeframe</SectionTitle>
          <p style={{ color: '#a0a0a0', margin: 0 }}>
            {strategy.timeframe.start && new Date(strategy.timeframe.start).toLocaleDateString()}
            {strategy.timeframe.start && strategy.timeframe.end && ' → '}
            {strategy.timeframe.end && new Date(strategy.timeframe.end).toLocaleDateString()}
          </p>
        </Section>
      )}

      {strategy.notes && strategy.notes.length > 0 && (
        <Section>
          <SectionTitle>Notes</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {strategy.notes.map((note, idx) => (
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

      {strategy.statusHistory && strategy.statusHistory.length > 0 && (
        <Section>
          <SectionTitle>Status History</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {strategy.statusHistory.map((entry, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid #2d3561'
              }}>
                <span style={{ color: '#eaeaea' }}>{entry.status}</span>
                <span style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>
                  {new Date(entry.changedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </DetailContainer>
  );
}

export default function Strategies() {
  const { id } = useParams();

  return id ? <StrategyDetail /> : <StrategiesList />;
}
