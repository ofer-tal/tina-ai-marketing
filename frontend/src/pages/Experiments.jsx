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
`;

const StatsRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  min-width: 120px;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#e94560'};
`;

const ExperimentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
`;

const ExperimentCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const ExperimentName = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  color: #eaeaea;
`;

const StatusBadge = styled.span`
  padding: 0.3rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${props => {
    switch (props.$status) {
      case 'draft':
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
      case 'running':
        return `background: rgba(76, 175, 80, 0.2); color: #4caf50;`;
      case 'paused':
        return `background: rgba(255, 193, 7, 0.2); color: #ffc107;`;
      case 'completed':
        return `background: rgba(33, 150, 243, 0.2); color: #2196f3;`;
      case 'cancelled':
        return `background: rgba(244, 67, 54, 0.2); color: #f44336;`;
      case 'inconclusive':
        return `background: rgba(156, 39, 176, 0.2); color: #9c27b0;`;
      default:
        return `background: rgba(158, 158, 158, 0.2); color: #9e9e9e;`;
    }
  }}
`;

const Hypothesis = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border-left: 3px solid #e94560;
  padding: 0.75rem;
  border-radius: 0 4px 4px 0;
  margin: 0.75rem 0;
  font-size: 0.85rem;
  color: #eaeaea;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const ProgressContainer = styled.div`
  margin: 0.75rem 0;
`;

const ProgressRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
  color: #eaeaea;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: #2d3561;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const WinnerBanner = styled.div`
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #4caf50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const VariantTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const VariantTableHeader = styled.thead`
  border-bottom: 1px solid #2d3561;
`;

const VariantTableRow = styled.tr`
  border-bottom: 1px solid #2d3561;
`;

const VariantTableCell = styled.td`
  padding: 0.75rem 0.5rem;
  font-size: 0.9rem;
  color: #eaeaea;

  &:first-child {
    font-weight: 600;
  }
`;

const ControlIndicator = styled.span`
  padding: 0.2rem 0.5rem;
  background: rgba(156, 39, 176, 0.2);
  color: #9c27b0;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const SignificantIndicator = styled.span`
  padding: 0.2rem 0.5rem;
  background: ${props => props.$significant ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)'};
  color: ${props => props.$significant ? '#4caf50' : '#9e9e9e'};
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #2d3561;
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
  min-height: 80px;
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

function ExperimentsList() {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', category: '', platform: '' });

  useEffect(() => {
    fetchExperiments();
    fetchStats();
  }, [filter]);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      if (filter.platform) params.append('platform', filter.platform);

      const response = await fetch(`/api/tina/experiments?${params}`);
      const data = await response.json();

      if (data.success) {
        setExperiments(data.data);
      }
    } catch (error) {
      console.error('Error fetching experiments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tina/experiments/stats');
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

    const experimentData = {
      name: formData.get('name'),
      description: formData.get('description'),
      hypothesis: formData.get('hypothesis'),
      successMetric: formData.get('successMetric'),
      duration: parseInt(formData.get('duration')) || 14,
      category: formData.get('category'),
      platform: formData.get('platform'),
      variants: [
        { name: 'Control', description: 'Baseline approach', isControl: true, allocation: 50 },
        { name: 'Variant A', description: 'Test approach', isControl: false, allocation: 50 }
      ]
    };

    try {
      const response = await fetch('/api/tina/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(experimentData)
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        fetchExperiments();
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating experiment:', error);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const response = await fetch(`/api/tina/experiments/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        fetchExperiments();
        fetchStats();
      }
    } catch (error) {
      console.error(`Error ${action}ing experiment:`, error);
    }
  };

  const getExperimentProgress = (exp) => {
    if (!exp.startDate || !exp.endDate) return 0;
    const now = new Date();
    const start = new Date(exp.startDate);
    const end = new Date(exp.endDate);
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>Experiments</Title>
        <Button onClick={() => setShowModal(true)}>+ New Experiment</Button>
      </Header>

      {stats && (
        <StatsRow>
          <StatCard>
            <StatLabel>Total</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Running</StatLabel>
            <StatValue $color="#4caf50">{stats.running || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Completed</StatLabel>
            <StatValue $color="#2196f3">{stats.completed || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Inconclusive</StatLabel>
            <StatValue $color="#9c27b0">{stats.inconclusive || 0}</StatValue>
          </StatCard>
        </StatsRow>
      )}

      <FilterBar>
        <FilterSelect
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="inconclusive">Inconclusive</option>
        </FilterSelect>

        <FilterSelect
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="content">Content</option>
          <option value="timing">Timing</option>
          <option value="hashtags">Hashtags</option>
          <option value="format">Format</option>
        </FilterSelect>

        <FilterSelect
          value={filter.platform}
          onChange={(e) => setFilter({ ...filter, platform: e.target.value })}
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="general">General</option>
        </FilterSelect>
      </FilterBar>

      {experiments.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>🧪</EmptyStateIcon>
          <h3>No experiments found</h3>
          <p>Create an experiment to test different approaches and learn what works best.</p>
        </EmptyState>
      ) : (
        <ExperimentsGrid>
          {experiments.map(experiment => {
            const progress = getExperimentProgress(experiment);

            return (
              <ExperimentCard
                key={experiment._id}
                onClick={() => navigate(`/tina/experiments/${experiment._id}`)}
              >
                <CardHeader>
                  <ExperimentName>{experiment.name}</ExperimentName>
                  <StatusBadge $status={experiment.status}>
                    {experiment.status}
                  </StatusBadge>
                </CardHeader>

                <Hypothesis>
                  <strong>Hypothesis:</strong> {experiment.hypothesis}
                </Hypothesis>

                <MetaRow>
                  <span>Metric: {experiment.successMetric}</span>
                  <span>{experiment.variants?.length || 2} variants</span>
                  <span>{experiment.duration} days</span>
                </MetaRow>

                {experiment.status === 'running' && (
                  <ProgressContainer>
                    <ProgressRow>
                      <span>{progress}% complete</span>
                      <span>{experiment.endDate ? new Date(experiment.endDate).toLocaleDateString() : '-'}</span>
                    </ProgressRow>
                    <ProgressBar>
                      <ProgressFill style={{ width: `${progress}%` }} />
                    </ProgressBar>
                  </ProgressContainer>
                )}

                {experiment.status === 'completed' && experiment.winningVariant && (
                  <WinnerBanner>
                    🏆 Winner: {experiment.winningVariant}
                  </WinnerBanner>
                )}
              </ExperimentCard>
            );
          })}
        </ExperimentsGrid>
      )}

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Create New Experiment</ModalTitle>
            <Form onSubmit={handleCreate}>
              <FormGroup>
                <Label>Name *</Label>
                <Input name="name" required placeholder="Experiment name" />
              </FormGroup>

              <FormGroup>
                <Label>Hypothesis *</Label>
                <Textarea name="hypothesis" required placeholder="What are we testing?" />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <Textarea name="description" placeholder="Detailed description (optional)" />
              </FormGroup>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Success Metric *</Label>
                  <Input name="successMetric" required placeholder="e.g., engagement_rate" />
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Duration (days)</Label>
                  <Input name="duration" type="number" defaultValue="14" min="1" max="90" />
                </FormGroup>
              </Row>

              <Row>
                <FormGroup style={{ flex: 1 }}>
                  <Label>Category</Label>
                  <FilterSelect name="category" defaultValue="general">
                    <option value="">Select...</option>
                    <option value="content">Content</option>
                    <option value="timing">Timing</option>
                    <option value="hashtags">Hashtags</option>
                    <option value="format">Format</option>
                    <option value="general">General</option>
                  </FilterSelect>
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Platform</Label>
                  <FilterSelect name="platform" defaultValue="general">
                    <option value="">Select...</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="general">General</option>
                  </FilterSelect>
                </FormGroup>
              </Row>

              <ActionButtons>
                <Button type="button" $variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Experiment</Button>
              </ActionButtons>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

function ExperimentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperiment();
  }, [id]);

  const fetchExperiment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tina/experiments/${id}`);
      const data = await response.json();

      if (data.success) {
        setExperiment(data.data);
      }

      // Fetch results
      const resultsRes = await fetch(`/api/tina/experiments/${id}/results`);
      const resultsData = await resultsRes.json();
      if (resultsData.success) {
        setResults(resultsData.data);
      }
    } catch (error) {
      console.error('Error fetching experiment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      const response = await fetch(`/api/tina/experiments/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setExperiment(data.data);
        if (action === 'analyze') {
          fetchExperiment();
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing experiment:`, error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!experiment) {
    return (
      <Container>
        <EmptyState>
          <EmptyStateIcon>🔍</EmptyStateIcon>
          <h3>Experiment not found</h3>
          <Button onClick={() => navigate('/tina/experiments')}>Back to Experiments</Button>
        </EmptyState>
      </Container>
    );
  }

  return (
    <DetailContainer>
      <BackButton onClick={() => navigate('/tina/experiments')}>
        ← Back to Experiments
      </BackButton>

      <DetailHeader>
        <DetailTitle>{experiment.name}</DetailTitle>
        <DetailMeta>
          <StatusBadge $status={experiment.status}>{experiment.status}</StatusBadge>
          {experiment.platform && <span>{experiment.platform}</span>}
          {experiment.category && <span>{experiment.category}</span>}
        </DetailMeta>

        <ActionButtons>
          {experiment.status === 'draft' && (
            <Button onClick={() => handleAction('start')}>Start Experiment</Button>
          )}
          {experiment.status === 'running' && (
            <>
              <Button onClick={() => handleAction('pause')} $variant="secondary">Pause</Button>
              <Button onClick={() => handleAction('complete')}>Complete</Button>
            </>
          )}
          {experiment.status === 'paused' && (
            <Button onClick={() => handleAction('resume')}>Resume</Button>
          )}
          {['draft', 'paused'].includes(experiment.status) && (
            <Button onClick={() => handleAction('cancel')} $variant="secondary">Cancel</Button>
          )}
          {experiment.status === 'completed' && !experiment.winningVariant && (
            <Button onClick={() => handleAction('analyze')}>Analyze Results</Button>
          )}
        </ActionButtons>
      </DetailHeader>

      <Section>
        <SectionTitle>Hypothesis</SectionTitle>
        <p style={{ color: '#eaeaea', margin: 0 }}>{experiment.hypothesis}</p>
        {experiment.description && (
          <p style={{ color: '#a0a0a0', marginTop: '0.5rem' }}>{experiment.description}</p>
        )}
      </Section>

      <Section>
        <SectionTitle>Variants</SectionTitle>
        <VariantTable>
          <VariantTableHeader>
            <tr>
              <th>Name</th>
              <th>Allocation</th>
              <th>Sample Size</th>
              <th>Value ({experiment.successMetric})</th>
            </tr>
          </VariantTableHeader>
          <tbody>
            {experiment.variants?.map((variant, idx) => (
              <VariantTableRow key={idx}>
                <VariantTableCell>
                  {variant.name}
                  {variant.isControl && <ControlIndicator>Control</ControlIndicator>}
                </VariantTableCell>
                <VariantTableCell>{variant.allocation}%</VariantTableCell>
                <VariantTableCell>{variant.sampleSize || 0}</VariantTableCell>
                <VariantTableCell>
                  {variant.metrics?.get(experiment.successMetric) || '-'}
                </VariantTableCell>
              </VariantTableRow>
            ))}
          </tbody>
        </VariantTable>
      </Section>

      {results && experiment.status === 'completed' && (
        <Section>
          <SectionTitle>Results</SectionTitle>
          {results.winner ? (
            <>
              <WinnerBanner>🏆 Winner: {results.winner}</WinnerBanner>
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: '#eaeaea', margin: '0.5rem 0' }}>
                  <strong>Confidence:</strong> {results.analysis?.find(r => r.variantName === results.winner)?.confidence}%
                </p>
                <p style={{ color: '#a0a0a0', margin: '0' }}>
                  <strong>Significant:</strong> {results.analysis?.find(r => r.variantName === results.winner)?.isSignificant ? 'Yes' : 'No'}
                </p>
              </div>
            </>
          ) : (
            <p style={{ color: '#a0a0a0' }}>No clear winner determined yet. Run analysis to get results.</p>
          )}
        </Section>
      )}

      {experiment.learnings && (
        <Section>
          <SectionTitle>Learnings</SectionTitle>
          <p style={{ color: '#eaeaea', margin: 0 }}>{experiment.learnings}</p>
        </Section>
      )}

      {experiment.notes && experiment.notes.length > 0 && (
        <Section>
          <SectionTitle>Notes</SectionTitle>
          {experiment.notes.map((note, idx) => (
            <div key={idx} style={{
              background: '#16213e',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ color: '#a0a0a0', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                {note.addedBy} • {new Date(note.addedAt).toLocaleString()}
              </div>
              <div style={{ color: '#eaeaea' }}>{note.content}</div>
            </div>
          ))}
        </Section>
      )}
    </DetailContainer>
  );
}

export default function Experiments() {
  const { id } = useParams();

  return id ? <ExperimentDetail /> : <ExperimentsList />;
}
