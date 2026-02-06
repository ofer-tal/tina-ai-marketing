import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Container = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const TitleSection = styled.div``;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: #a0a0a0;
  margin: 0;
`;

const RefreshButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${props => props.$spinning && `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    span:first-child {
      animation: spin 1s linear infinite;
    }
  `}
`;

const OverallStatusBanner = styled.div`
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return 'rgba(0, 210, 106, 0.1)';
      case 'warning': return 'rgba(255, 176, 32, 0.1)';
      case 'critical': return 'rgba(248, 49, 47, 0.1)';
      default: return 'rgba(233, 69, 96, 0.1)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.$status) {
      case 'healthy': return '#00d26a';
      case 'warning': return '#ffb020';
      case 'critical': return '#f8312f';
      default: return '#e94560';
    }
  }};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StatusIcon = styled.span`
  font-size: 2rem;
`;

const StatusText = styled.div`
  flex: 1;
`;

const StatusTitle = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: ${props => {
    switch (props.$status) {
      case 'healthy': return '#00d26a';
      case 'warning': return '#ffb020';
      case 'critical': return '#f8312f';
      default: return '#e94560';
    }
  }};
`;

const StatusDescription = styled.p`
  margin: 0;
  color: #a0a0a0;
  font-size: 0.875rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const FullWidthCard = styled.div`
  grid-column: 1 / -1;
`;

const Card = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  color: #e94560;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardIcon = styled.span`
  font-size: 1.25rem;
`;

const CardBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'ok': return 'rgba(0, 210, 106, 0.2)';
      case 'warning': return 'rgba(255, 176, 32, 0.2)';
      case 'error': return 'rgba(248, 49, 47, 0.2)';
      default: return 'rgba(233, 69, 96, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'ok': return '#00d26a';
      case 'warning': return '#ffb020';
      case 'error': return '#f8312f';
      default: return '#e94560';
    }
  }};
`;

const ServiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ServiceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'ok': return 'rgba(0, 210, 106, 0.3)';
      case 'warning': return 'rgba(255, 176, 32, 0.3)';
      case 'error': return 'rgba(248, 49, 47, 0.3)';
      default: return '#2d3561';
    }
  }};
`;

const ServiceName = styled.span`
  font-weight: 500;
  color: #eaeaea;
`;

const ServiceStatus = styled.span`
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => {
    switch (props.$status) {
      case 'ok': return '#00d26a';
      case 'warning': return '#ffb020';
      case 'error': return '#f8312f';
      default: return '#a0a0a0';
    }
  }};
`;

const JobTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const JobHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 0.75rem;
  background: #1a1a2e;
  border-radius: 8px;
  font-weight: 600;
  color: #a0a0a0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const JobRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 0.75rem;
  background: #1a1a2e;
  border-radius: 8px;
  align-items: center;
  font-size: 0.875rem;

  &:hover {
    background: #252540;
  }
`;

const JobName = styled.span`
  color: #eaeaea;
  font-weight: 500;
`;

const JobSchedule = styled.span`
  color: #a0a0a0;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
`;

const JobStatus = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      switch (props.$status) {
        case 'running': return '#00d26a';
        case 'failing': return '#f8312f';
        case 'missed': return '#ffb020';
        default: return '#a0a0a0';
      }
    }};
  }
`;

const JobLastRun = styled.span`
  color: #a0a0a0;
  font-size: 0.75rem;
`;

const JobTriggerButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 4px;
  color: #e94560;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(233, 69, 96, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1a2e;
  }

  &::-webkit-scrollbar-thumb {
    background: #2d3561;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #e94560;
  }
`;

const ErrorItem = styled.div`
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
  border-left: 3px solid ${props => {
    switch (props.$severity) {
      case 'critical': return '#f8312f';
      case 'error': return '#ff6b6b';
      case 'warning': return '#ffb020';
      default: return '#e94560';
    }
  }};
`;

const ErrorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ErrorTitle = styled.span`
  font-weight: 600;
  color: #eaeaea;
`;

const ErrorTime = styled.span`
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const ErrorMessage = styled.p`
  margin: 0;
  color: #b0b0b0;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #a0a0a0;
`;

const EmptyIcon = styled.span`
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const MetricCard = styled.div`
  background: #1a1a2e;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.$color || '#e94560'};
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
`;

function ServiceHealth() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [jobsStatus, setJobsStatus] = useState(null);
  const [overallStatus, setOverallStatus] = useState('unknown');

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch all health data in parallel
      const [healthRes, serviceRes, jobsRes] = await Promise.all([
        fetch('/api/api-health/status'),
        fetch('/api/service-status'),
        fetch('/api/api-health/jobs')
      ]);

      const [healthData, serviceData, jobsData] = await Promise.all([
        healthRes.json(),
        serviceRes.json(),
        jobsRes.json()
      ]);

      setApiHealth(healthData.success ? healthData.data : null);
      setServiceStatus(serviceData.success ? serviceData : null);
      setJobsStatus(jobsData.success ? jobsData.data : null);

      // Calculate overall status
      let status = 'healthy';
      if (healthData.data?.apis) {
        const hasErrors = Object.values(healthData.data.apis).some(api => api.status === 'down');
        const hasWarnings = Object.values(healthData.data.apis).some(api => api.status === 'degraded');
        if (hasErrors) status = 'critical';
        else if (hasWarnings) status = 'warning';
      }
      setOverallStatus(status);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerJob = async (jobName) => {
    try {
      const response = await fetch(`/api/api-health/jobs/${jobName}/trigger`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchData(true);
      }
    } catch (error) {
      console.error('Error triggering job:', error);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getServiceStatus = (service) => {
    if (!apiHealth?.apis?.[service]) return { status: 'unknown', label: 'Unknown' };
    const api = apiHealth.apis[service];
    switch (api.status) {
      case 'up': return { status: 'ok', label: 'Operational' };
      case 'degraded': return { status: 'warning', label: 'Degraded' };
      case 'down': return { status: 'error', label: 'Down' };
      default: return { status: 'unknown', label: 'Unknown' };
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading health data...</LoadingSpinner>
      </Container>
    );
  }

  // Count statuses
  const totalApis = apiHealth?.apis ? Object.keys(apiHealth.apis).length : 0;
  const healthyApis = apiHealth?.apis ? Object.values(apiHealth.apis).filter(a => a.status === 'up').length : 0;
  const totalJobs = jobsStatus?.jobs?.length || 0;
  const activeJobs = jobsStatus?.jobs?.filter(j => j.scheduled).length || 0;

  return (
    <Container>
      <Header>
        <TitleSection>
          <Title>Service Health</Title>
          <Subtitle>Monitor system status, integrations, and scheduled jobs</Subtitle>
        </TitleSection>
        <RefreshButton
          onClick={() => fetchData(true)}
          disabled={refreshing}
          $spinning={refreshing}
        >
          <span>🔄</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </Header>

      <OverallStatusBanner $status={overallStatus}>
        <StatusIcon>
          {overallStatus === 'healthy' ? '✅' : overallStatus === 'warning' ? '⚠️' : '🔴'}
        </StatusIcon>
        <StatusText>
          <StatusTitle $status={overallStatus}>
            {overallStatus === 'healthy' ? 'All Systems Operational' :
             overallStatus === 'warning' ? 'Some Systems Degraded' :
             'Critical Issues Detected'}
          </StatusTitle>
          <StatusDescription>
            {healthyApis} of {totalApis} services operational • {activeJobs} of {totalJobs} jobs active
          </StatusDescription>
        </StatusText>
      </OverallStatusBanner>

      <Grid>
        {/* Quick Stats */}
        <FullWidthCard>
          <MetricGrid>
            <MetricCard>
              <MetricValue $color={healthyApis === totalApis ? '#00d26a' : '#ffb020'}>
                {healthyApis}/{totalApis}
              </MetricValue>
              <MetricLabel>Services Up</MetricLabel>
            </MetricCard>
            <MetricCard>
              <MetricValue $color="#7b2cbf">{activeJobs}</MetricValue>
              <MetricLabel>Active Jobs</MetricLabel>
            </MetricCard>
            <MetricCard>
              <MetricValue $color={jobsStatus?.healthSummary?.failingJobs ? '#f8312f' : '#00d26a'}>
                {jobsStatus?.healthSummary?.failingJobs || 0}
              </MetricValue>
              <MetricLabel>Failing Jobs</MetricLabel>
            </MetricCard>
            <MetricCard>
              <MetricValue $color={serviceStatus?.degradationLevel === 'normal' ? '#00d26a' : '#ffb020'}>
                {serviceStatus?.degradationLevel || 'unknown'}
              </MetricValue>
              <MetricLabel>System Mode</MetricLabel>
            </MetricCard>
          </MetricGrid>
        </FullWidthCard>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle><CardIcon>🔌</CardIcon>Integrations</CardTitle>
            <CardBadge $status={healthyApis === totalApis ? 'ok' : 'warning'}>
              {healthyApis}/{totalApis} OK
            </CardBadge>
          </CardHeader>
          <ServiceList>
            {apiHealth?.apis ? Object.entries(apiHealth.apis).map(([name, api]) => {
              const status = getServiceStatus(name);
              return (
                <ServiceItem key={name} $status={status.status}>
                  <ServiceName>{name}</ServiceName>
                  <ServiceStatus $status={status.status}>
                    {status.label}
                  </ServiceStatus>
                </ServiceItem>
              );
            }) : (
              <EmptyState>
                <EmptyIcon>🔌</EmptyIcon>
                No integration data available
              </EmptyState>
            )}
          </ServiceList>
        </Card>

        {/* Scheduled Jobs */}
        <Card>
          <CardHeader>
            <CardTitle><CardIcon>⏰</CardIcon>Scheduled Jobs</CardTitle>
            <CardBadge $status={jobsStatus?.healthSummary?.failingJobs ? 'error' : 'ok'}>
              {jobsStatus?.healthSummary?.failingJobs || 0} Failing
            </CardBadge>
          </CardHeader>
          <JobTable>
            <JobHeader>
              <div>Job</div>
              <div>Schedule</div>
              <div>Status</div>
              <div>Last Run</div>
              <div>Action</div>
            </JobHeader>
            {jobsStatus?.jobs?.map(job => {
              const lastRun = job.dbRecord?.lastSuccessAt || job.dbRecord?.lastRunAt;
              const isFailing = job.stats?.consecutiveFailures > 0;
              const jobStatus = isFailing ? 'failing' : job.scheduled ? 'running' : 'stopped';
              return (
                <JobRow key={job.name}>
                  <JobName>{job.name}</JobName>
                  <JobSchedule>{job.cronExpression}</JobSchedule>
                  <JobStatus $status={jobStatus}>
                    {job.scheduled ? 'Active' : 'Stopped'}
                    {isFailing && ` (${job.stats.consecutiveFailures} fails)`}
                  </JobStatus>
                  <JobLastRun>{formatTime(lastRun)}</JobLastRun>
                  <JobTriggerButton
                    onClick={() => handleTriggerJob(job.name)}
                    disabled={!job.scheduled}
                  >
                    Run Now
                  </JobTriggerButton>
                </JobRow>
              );
            }) || (
              <EmptyState>
                <EmptyIcon>⏰</EmptyIcon>
                No scheduled jobs
              </EmptyState>
            )}
          </JobTable>
        </Card>

        {/* Recent Errors */}
        <FullWidthCard>
          <CardHeader>
            <CardTitle><CardIcon>🚨</CardIcon>Recent Issues</CardTitle>
            <CardBadge $status="ok">Last 24 Hours</CardBadge>
          </CardHeader>
          <ErrorList>
            {jobsStatus?.healthSummary?.recentFailures?.length > 0 ? (
              jobsStatus.healthSummary.recentFailures.map((failure, idx) => (
                <ErrorItem key={idx} $severity="error">
                  <ErrorHeader>
                    <ErrorTitle>{failure.jobName || 'System'}</ErrorTitle>
                    <ErrorTime>{formatTime(failure.timestamp)}</ErrorTime>
                  </ErrorHeader>
                  <ErrorMessage>{failure.error || failure.reason || 'Unknown error'}</ErrorMessage>
                </ErrorItem>
              ))
            ) : (
              <EmptyState>
                <EmptyIcon>✅</EmptyIcon>
                No recent issues to report
              </EmptyState>
            )}
          </ErrorList>
        </FullWidthCard>

        {/* Scheduler Status */}
        <Card>
          <CardHeader>
            <CardTitle><CardIcon>⚙️</CardIcon>Scheduler Status</CardTitle>
            <CardBadge $status={jobsStatus?.scheduler?.running ? 'ok' : 'error'}>
              {jobsStatus?.scheduler?.running ? 'Running' : 'Stopped'}
            </CardBadge>
          </CardHeader>
          <ServiceList>
            <ServiceItem $status="ok">
              <ServiceName>Status</ServiceName>
              <ServiceStatus $status={jobsStatus?.scheduler?.running ? 'ok' : 'error'}>
                {jobsStatus?.scheduler?.running ? 'Active' : 'Inactive'}
              </ServiceStatus>
            </ServiceItem>
            <ServiceItem $status="ok">
              <ServiceName>Registered Jobs</ServiceName>
              <ServiceStatus $status="ok">{totalJobs}</ServiceStatus>
            </ServiceItem>
            <ServiceItem $status={jobsStatus?.healthSummary?.missedJobs ? 'warning' : 'ok'}>
              <ServiceName>Missed Jobs</ServiceName>
              <ServiceStatus $status={jobsStatus?.healthSummary?.missedJobs ? 'warning' : 'ok'}>
                {jobsStatus?.healthSummary?.missedJobs || 0}
              </ServiceStatus>
            </ServiceItem>
          </ServiceList>
        </Card>

        {/* Service Degradation */}
        <Card>
          <CardHeader>
            <CardTitle><CardIcon>📉</CardIcon>Service Mode</CardTitle>
            <CardBadge $status={serviceStatus?.degradationLevel === 'normal' ? 'ok' : 'warning'}>
              {serviceStatus?.degradationLevel || 'unknown'}
            </CardBadge>
          </CardHeader>
          <ServiceList>
            {serviceStatus?.services ? Object.entries(serviceStatus.services).map(([name, svc]) => (
              <ServiceItem
                key={name}
                $status={svc.available ? 'ok' : 'error'}
              >
                <ServiceName>{name}</ServiceName>
                <ServiceStatus $status={svc.available ? 'ok' : 'error'}>
                  {svc.available ? 'Available' : 'Unavailable'}
                  {svc.degraded && ' (Degraded)'}
                </ServiceStatus>
              </ServiceItem>
            )) : (
              <EmptyState>
                <EmptyIcon>📉</EmptyIcon>
                No service status data
              </EmptyState>
            )}
          </ServiceList>
        </Card>
      </Grid>
    </Container>
  );
}

export default ServiceHealth;
