import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import styled from 'styled-components';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const Container = styled.div`
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const Subtitle = styled.p`
  color: #a0a0a0;
  margin: 5px 0 0 0;
  font-size: 14px;
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const Card = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #3a3a3a;
`;

const CardLabel = styled.div`
  color: #a0a0a0;
  font-size: 14px;
  margin-bottom: 8px;
`;

const CardValue = styled.div.withConfig({
  shouldForwardProp: (prop) => !['color'].includes(prop)
})`
  font-size: 32px;
  font-weight: 600;
  color: ${props => props.color || '#ffffff'};
`;

const CardChange = styled.div.withConfig({
  shouldForwardProp: (prop) => !['positive'].includes(prop)
})`
  font-size: 12px;
  margin-top: 8px;
  color: ${props => props.positive ? '#4ade80' : '#f87171'};
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(Card)`
  min-height: 400px;
`;

const ChartHeading = styled.h3`
  color: #ffffff;
  font-size: 18px;
  margin-bottom: 20px;
`;

const TableContainer = styled(Card)`
  margin-bottom: 30px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 12px;
  color: #a0a0a0;
  font-size: 14px;
  border-bottom: 1px solid #3a3a3a;
`;

const TableCell = styled.td`
  padding: 12px;
  border-bottom: 1px solid #3a3a3a;
  color: #ffffff;
  font-size: 14px;
`;

const RiskBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => !['level'].includes(prop)
})`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    if (props.level === 'high') return '#dc2626';
    if (props.level === 'medium') return '#f59e0b';
    return '#10b981';
  }};
  color: #ffffff;
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['primary'].includes(prop)
})`
  background: ${props => props.primary ? '#6366f1' : '#3a3a3a'};
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-right: 10px;

  &:hover {
    background: ${props => props.primary ? '#4f46e5' : '#4a4a4a'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #a0a0a0;
`;

const ErrorMessage = styled.div`
  background: #dc2626;
  color: #ffffff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const InsightsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const InsightCard = styled(Card).withConfig({
  shouldForwardProp: (prop) => !['color'].includes(prop)
})`
  border-left: 4px solid ${props => props.color || '#6366f1'};
`;

const InsightTitle = styled.h4`
  color: #ffffff;
  font-size: 16px;
  margin-bottom: 10px;
`;

const InsightDescription = styled.p`
  color: #a0a0a0;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
`;

const ChurnPrediction = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/churn-prediction/dashboard');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch churn prediction data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskDistributionChart = () => {
    if (!dashboardData?.scores) return null;

    return {
      labels: ['High Risk', 'Medium Risk', 'Low Risk'],
      datasets: [{
        data: [
          dashboardData.scores.statistics.highRisk,
          dashboardData.scores.statistics.mediumRisk,
          dashboardData.scores.statistics.lowRisk
        ],
        backgroundColor: ['#dc2626', '#f59e0b', '#10b981'],
        borderWidth: 0
      }]
    };
  };

  const getChurnTrendChart = () => {
    if (!dashboardData?.patterns) return null;

    return {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Churn Rate',
        data: [2.5, 3.2, 2.8, 3.5],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  };

  const getIndicatorChart = () => {
    if (!dashboardData?.indicators) return null;

    return {
      labels: dashboardData.indicators.indicators.slice(0, 5).map(i =>
        i.indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [{
        label: 'Correlation Strength',
        data: dashboardData.indicators.indicators.slice(0, 5).map(i => parseFloat(i.correlation)),
        backgroundColor: [
          '#6366f1',
          '#8b5cf6',
          '#a855f7',
          '#d946ef',
          '#ec4899'
        ],
        borderWidth: 0
      }]
    };
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading churn prediction data...</LoadingSpinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
        <Button onClick={fetchDashboardData}>Retry</Button>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>Churn Prediction</Title>
          <Subtitle>Predict user churn and identify at-risk users</Subtitle>
        </div>
        <Button primary onClick={fetchDashboardData}>Refresh Data</Button>
      </Header>

      {dashboardData?.summary && (
        <>
          <SummaryCards>
            <Card>
              <CardLabel>Total Users Scored</CardLabel>
              <CardValue>{dashboardData.summary.totalUsersScored || 0}</CardValue>
            </Card>

            <Card>
              <CardLabel>High Risk Users</CardLabel>
              <CardValue color="#dc2626">{dashboardData.summary.highRiskUsers || 0}</CardValue>
              <CardChange positive={false}>
                {((dashboardData.summary.highRiskUsers / dashboardData.summary.totalUsersScored) * 100).toFixed(1)}% of total
              </CardChange>
            </Card>

            <Card>
              <CardLabel>Medium Risk Users</CardLabel>
              <CardValue color="#f59e0b">{dashboardData.summary.mediumRiskUsers || 0}</CardValue>
              <CardChange positive={false}>
                {((dashboardData.summary.mediumRiskUsers / dashboardData.summary.totalUsersScored) * 100).toFixed(1)}% of total
              </CardChange>
            </Card>

            <Card>
              <CardLabel>Average Churn Score</CardLabel>
              <CardValue>{(dashboardData.summary.avgChurnScore * 100).toFixed(0)}%</CardValue>
            </Card>

            <Card>
              <CardLabel>Critical Users</CardLabel>
              <CardValue color="#dc2626">{dashboardData.summary.criticalUsers || 0}</CardValue>
              <CardChange positive={false}>Require immediate attention</CardChange>
            </Card>

            <Card>
              <CardLabel>Model Accuracy</CardLabel>
              <CardValue color="#10b981">{dashboardData.summary.modelAccuracy}</CardValue>
            </Card>

            <Card>
              <CardLabel>Potential Monthly Revenue Loss</CardLabel>
              <CardValue color="#dc2626">${dashboardData.summary.potentialRevenueLoss?.monthly || '0.00'}</CardValue>
            </Card>

            <Card>
              <CardLabel>Potential Annual Revenue Loss</CardLabel>
              <CardValue color="#dc2626">${dashboardData.summary.potentialRevenueLoss?.annually || '0.00'}</CardValue>
            </Card>
          </SummaryCards>

          <ChartsGrid>
            <ChartCard>
              <ChartHeading>Risk Distribution</ChartHeading>
              <Doughnut
                data={getRiskDistributionChart()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#ffffff' }
                    }
                  }
                }}
              />
            </ChartCard>

            <ChartCard>
              <ChartHeading>Top Churn Indicators</ChartHeading>
              <Bar
                data={getIndicatorChart()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: '#3a3a3a' },
                      ticks: { color: '#ffffff' }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: '#ffffff', maxRotation: 45 }
                    }
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            </ChartCard>
          </ChartsGrid>

          {dashboardData?.atRisk?.users && (
            <TableContainer>
              <ChartHeading>At-Risk Users Requiring Attention</ChartHeading>
              <Table>
                <thead>
                  <tr>
                    <TableHeader>User ID</TableHeader>
                    <TableHeader>Churn Score</TableHeader>
                    <TableHeader>Risk Level</TableHeader>
                    <TableHeader>Subscription Tier</TableHeader>
                    <TableHeader>Stories Read</TableHeader>
                    <TableHeader>Last Activity</TableHeader>
                    <TableHeader>Risk Factors</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.atRisk.users.slice(0, 20).map((user, index) => (
                    <tr key={index}>
                      <TableCell>{user.userId}</TableCell>
                      <TableCell>{(user.churnScore * 100).toFixed(0)}%</TableCell>
                      <TableCell>
                        <RiskBadge level={user.riskLevel}>{user.riskLevel}</RiskBadge>
                      </TableCell>
                      <TableCell>{user.subscriptionTier}</TableCell>
                      <TableCell>{user.totalStoriesRead}</TableCell>
                      <TableCell>
                        {new Date(user.lastActivityDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.factors.map(f => f.factor).join(', ')}
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          )}

          {dashboardData?.atRisk?.insights && (
            <>
              <ChartHeading style={{ marginBottom: '20px' }}>Churn Insights & Recommendations</ChartHeading>
              <InsightsContainer>
                {dashboardData.atRisk.insights.topRiskFactors?.map((factor, index) => (
                  <InsightCard key={index} color="#dc2626">
                    <InsightTitle>{factor.factor.replace(/_/g, ' ').toUpperCase()}</InsightTitle>
                    <InsightDescription>
                      Affects {factor.count} users ({factor.percentage}% of at-risk users)
                    </InsightDescription>
                  </InsightCard>
                ))}

                {dashboardData.atRisk.insights.quickWins?.map((win, index) => (
                  <InsightCard key={index} color="#10b981">
                    <InsightTitle>Quick Win: {win.action}</InsightTitle>
                    <InsightDescription>
                      <strong>Expected Impact:</strong> {win.expectedImpact}<br/>
                      <strong>Effort:</strong> {win.effort}<br/>
                      <strong>Target Users:</strong> {win.userCount}
                    </InsightDescription>
                  </InsightCard>
                ))}
              </InsightsContainer>
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default ChurnPrediction;
