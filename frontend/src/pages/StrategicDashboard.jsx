import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const DashboardContainer = styled.div`
  width: 100%;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const DateRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #16213e;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const DateButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? '#e94560' : 'transparent'};
  border: none;
  border-radius: 6px;
  color: ${props => props.$active ? '#ffffff' : '#a0a0a0'};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? '#e94560' : '#2d3561'};
    color: ${props => props.$active ? '#ffffff' : '#eaeaea'};
  }
`;

const ChartContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const ChartTitle = styled.h2`
  font-size: 1.25rem;
  color: #eaeaea;
  margin: 0 0 1rem 0;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const MetricLabel = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.$positive ? '#00d26a' : props.$positive === false ? '#e94560' : '#eaeaea'};
`;

const MetricChange = styled.div`
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${props => props.$positive ? '#00d26a' : props.$negative ? '#e94560' : '#a0a0a0'};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const ErrorState = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid #e94560;
  border-radius: 8px;
  padding: 1rem;
  color: #e94560;
  margin-bottom: 1rem;
`;

function StrategicDashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [mrrData, setMrrData] = useState(null);
  const [userGrowthData, setUserGrowthData] = useState(null);
  const [cacData, setCacData] = useState(null);
  const [acquisitionData, setAcquisitionData] = useState(null);
  const [revenueSpendData, setRevenueSpendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMrrTrend();
    fetchUserGrowth();
    fetchCacTrend();
    fetchAcquisitionSplit();
    fetchRevenueSpendTrend();
  }, [dateRange]);

  const fetchMrrTrend = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/mrr-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMrrData(data);
    } catch (err) {
      console.error('Failed to fetch MRR trend:', err);
      setError('Failed to load MRR trend data. Please try again later.');
      // Set mock data for development
      const mockData = generateMockMrrData(dateRange);
      setMrrData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const response = await fetch(`/api/dashboard/user-growth?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUserGrowthData(data);
    } catch (err) {
      console.error('Failed to fetch user growth data:', err);
      // Set mock data for development
      const mockData = generateMockUserGrowthData(dateRange);
      setUserGrowthData(mockData);
    }
  };

  const fetchCacTrend = async () => {
    try {
      const response = await fetch(`/api/dashboard/cac-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCacData(data);
    } catch (err) {
      console.error('Failed to fetch CAC trend data:', err);
      // Set mock data for development
      const mockData = generateMockCacData(dateRange);
      setCacData(mockData);
    }
  };

  const fetchAcquisitionSplit = async () => {
    try {
      const response = await fetch(`/api/dashboard/acquisition-split?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAcquisitionData(data);
    } catch (err) {
      console.error('Failed to fetch acquisition split data:', err);
      // Set mock data for development
      const mockData = generateMockAcquisitionData(dateRange);
      setAcquisitionData(mockData);
    }
  };

  const fetchRevenueSpendTrend = async () => {
    try {
      const response = await fetch(`/api/dashboard/revenue-spend-trend?range=${dateRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRevenueSpendData(data);
    } catch (err) {
      console.error('Failed to fetch revenue vs spend trend:', err);
      // Set mock data for development
      const mockData = generateMockRevenueSpendData(dateRange);
      setRevenueSpendData(mockData);
    }
  };

  const generateMockRevenueSpendData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let dailyRevenue = 15; // ~$450/month initially
    let dailySpend = 45; // High initial spend

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate revenue growth
      const revenueGrowth = 0.5 + (Math.random() * 1.5);
      dailyRevenue += revenueGrowth;

      // Simulate spend optimization
      if (i < days * 0.3) {
        dailySpend -= 0.3 + (Math.random() * 0.5);
      } else {
        dailySpend += (Math.random() - 0.5) * 2;
      }

      dailySpend = Math.max(dailySpend, 15);

      const revenueVariation = (Math.random() - 0.5) * 3;
      const spendVariation = (Math.random() - 0.5) * 5;

      dailyRevenue = Math.max(dailyRevenue + revenueVariation, 10);
      dailySpend = Math.max(dailySpend + spendVariation, 10);

      const monthlyRevenue = Math.round(dailyRevenue * 30);
      const monthlySpend = Math.round(dailySpend * 30);

      data.push({
        date: date.toISOString().split('T')[0],
        revenue: monthlyRevenue,
        spend: monthlySpend,
        profit: monthlyRevenue - monthlySpend
      });
    }

    const latest = data[data.length - 1];
    const previous = data[Math.floor(data.length / 2)];
    const revenueChange = ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1);
    const spendChange = ((latest.spend - previous.spend) / previous.spend * 100).toFixed(1);
    const profitMargin = ((latest.profit / latest.revenue) * 100).toFixed(1);

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
    const avgProfitMargin = ((totalRevenue - totalSpend) / totalRevenue * 100).toFixed(1);

    return {
      data,
      summary: {
        current: {
          revenue: latest.revenue,
          spend: latest.spend,
          profit: latest.profit,
          profitMargin: parseFloat(profitMargin)
        },
        previous: {
          revenue: previous.revenue,
          spend: previous.spend,
          profit: previous.profit
        },
        change: {
          revenue: parseFloat(revenueChange),
          spend: parseFloat(spendChange)
        },
        averages: {
          revenue: Math.round(totalRevenue / data.length),
          spend: Math.round(totalSpend / data.length),
          profitMargin: parseFloat(avgProfitMargin)
        },
        totalProfit: totalRevenue - totalSpend
      }
    };
  };

  const generateMockMrrData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let currentMrr = 300;
    const targetMrr = 10000;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate growth with some randomness
      const growth = (targetMrr - currentMrr) / (days - i + 1);
      const randomFactor = (Math.random() - 0.4) * 50;
      currentMrr = Math.max(300, currentMrr + growth + randomFactor);

      data.push({
        date: date.toISOString().split('T')[0],
        mrr: Math.round(currentMrr),
        target: Math.round(targetMrr * (i / days))
      });
    }

    const current = data[data.length - 1].mrr;
    const previous = data[Math.max(0, data.length - 8)].mrr; // 7 days ago
    const change = ((current - previous) / previous * 100).toFixed(1);

    return {
      data,
      summary: {
        current: Math.round(current),
        previous: Math.round(previous),
        change: parseFloat(change),
        trend: current >= previous ? 'up' : 'down'
      }
    };
  };

  const generateMockUserGrowthData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let cumulativeUsers = 850;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const baseGrowth = 15;
      const acceleration = (i / days) * 20;
      const randomFactor = (Math.random() - 0.5) * 10;
      const newUsers = Math.max(0, Math.round(baseGrowth + acceleration + randomFactor));

      cumulativeUsers += newUsers;

      data.push({
        date: date.toISOString().split('T')[0],
        users: cumulativeUsers,
        newUsers: newUsers
      });
    }

    const current = data[data.length - 1].users;
    const previousIndex = Math.max(0, data.length - 8);
    const previous = data[previousIndex].users;
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    const totalNewUsers = data.reduce((sum, day) => sum + day.newUsers, 0);
    const avgDailyNewUsers = Math.round(totalNewUsers / days);

    return {
      data,
      summary: {
        current: current,
        previous: previous,
        change: change,
        changePercent: parseFloat(changePercent),
        avgDailyNewUsers: avgDailyNewUsers,
        trend: change >= 0 ? 'up' : 'down'
      }
    };
  };

  const generateMockCacData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let cac = 45.00;
    const targetCac = 15.00;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const progress = i / days;
      const optimization = (cac - targetCac) * (1 - Math.pow(progress, 0.5));
      const randomFactor = (Math.random() - 0.5) * 3;
      cac = Math.max(targetCac, cac - optimization * 0.1 + randomFactor);

      const dailySpend = 25 + Math.random() * 50;
      const dailyNewUsers = Math.round(dailySpend / cac);

      data.push({
        date: date.toISOString().split('T')[0],
        cac: parseFloat(cac.toFixed(2)),
        marketingSpend: parseFloat(dailySpend.toFixed(2)),
        newUsers: dailyNewUsers
      });
    }

    const current = data[data.length - 1].cac;
    const previousIndex = Math.max(0, data.length - 8);
    const previous = data[previousIndex].cac;
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    const avgCac = data.reduce((sum, day) => sum + day.cac, 0) / data.length;
    const totalSpend = data.reduce((sum, day) => sum + day.marketingSpend, 0);
    const totalNewUsers = data.reduce((sum, day) => sum + day.newUsers, 0);

    return {
      data,
      summary: {
        current: parseFloat(current.toFixed(2)),
        previous: parseFloat(previous.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent),
        average: parseFloat(avgCac.toFixed(2)),
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalNewUsers: totalNewUsers,
        trend: change <= 0 ? 'down' : 'up'
      }
    };
  };

  const generateMockAcquisitionData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let organicRatio = 0.35; // Starting with 35% organic

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Organic ratio improves over time (from 35% to 55%)
      const progress = i / days;
      organicRatio = 0.35 + (0.20 * progress);
      organicRatio += (Math.random() - 0.5) * 0.05;
      organicRatio = Math.min(0.80, Math.max(0.20, organicRatio));

      const baseUsers = 20 + (progress * 30);
      const dailyNewUsers = Math.round(baseUsers + (Math.random() - 0.5) * 10);
      const organicUsers = Math.round(dailyNewUsers * organicRatio);
      const paidUsers = dailyNewUsers - organicUsers;

      data.push({
        date: date.toISOString().split('T')[0],
        totalUsers: dailyNewUsers,
        organicUsers: organicUsers,
        paidUsers: paidUsers,
        organicPercent: parseFloat((organicRatio * 100).toFixed(1)),
        paidPercent: parseFloat(((1 - organicRatio) * 100).toFixed(1))
      });
    }

    const totalUsers = data.reduce((sum, day) => sum + day.totalUsers, 0);
    const totalOrganic = data.reduce((sum, day) => sum + day.organicUsers, 0);
    const totalPaid = data.reduce((sum, day) => sum + day.paidUsers, 0);
    const avgOrganicPercent = parseFloat(((totalOrganic / totalUsers) * 100).toFixed(1));
    const avgPaidPercent = parseFloat(((totalPaid / totalUsers) * 100).toFixed(1));

    return {
      data,
      summary: {
        totalUsers: totalUsers,
        organicUsers: totalOrganic,
        paidUsers: totalPaid,
        organicPercent: avgOrganicPercent,
        paidPercent: avgPaidPercent,
        previous: {
          organicPercent: parseFloat((avgOrganicPercent - 5).toFixed(1)),
          paidPercent: parseFloat((avgPaidPercent + 5).toFixed(1))
        },
        trend: 'up'
      }
    };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#16213e',
          border: '1px solid #2d3561',
          borderRadius: '8px',
          padding: '0.75rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.85rem' }}>
            {formatDate(label)}
          </p>
          {payload.map((entry, index) => {
            let value = entry.value;
            if (entry.name === 'New Users' || entry.dataKey === 'users' || entry.name === 'Cumulative Users') {
              value = formatNumber(entry.value);
            } else if (entry.name === 'CAC' || entry.name === 'Marketing Spend') {
              value = formatCurrency(entry.value);
            } else {
              value = formatCurrency(entry.value);
            }
            return (
              <p key={index} style={{ margin: '0.25rem 0 0 0', color: entry.color, fontSize: '0.9rem' }}>
                {entry.name}: {value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          Loading strategic dashboard...
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Strategic Dashboard</Title>
        <DateRangeSelector>
          <DateButton
            $active={dateRange === '30d'}
            onClick={() => setDateRange('30d')}
          >
            30 Days
          </DateButton>
          <DateButton
            $active={dateRange === '90d'}
            onClick={() => setDateRange('90d')}
          >
            90 Days
          </DateButton>
          <DateButton
            $active={dateRange === '180d'}
            onClick={() => setDateRange('180d')}
          >
            180 Days
          </DateButton>
        </DateRangeSelector>
      </DashboardHeader>

      {error && (
        <ErrorState>
          {error}
        </ErrorState>
      )}

      {mrrData && (
        <>
          <MetricsRow>
            <MetricCard>
              <MetricLabel>Current MRR</MetricLabel>
              <MetricValue>{formatCurrency(mrrData.summary.current)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Previous MRR (7d ago)</MetricLabel>
              <MetricValue>{formatCurrency(mrrData.summary.previous)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Change (7d)</MetricLabel>
              <MetricValue style={{
                color: mrrData.summary.trend === 'up' ? '#00d26a' : '#e94560'
              }}>
                {mrrData.summary.trend === 'up' ? '↑' : '↓'}
                {Math.abs(mrrData.summary.change)}%
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Target MRR</MetricLabel>
              <MetricValue>$10,000</MetricValue>
            </MetricCard>
          </MetricsRow>

          <ChartContainer>
            <ChartTitle>Monthly Recurring Revenue Trend</ChartTitle>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={mrrData.data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#a0a0a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  stroke="#a0a0a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#a0a0a0' }}
                />
                <ReferenceLine
                  y={10000}
                  label="Target $10k"
                  stroke="#00d26a"
                  strokeDasharray="3 3"
                  style={{ color: '#00d26a' }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#e94560"
                  strokeWidth={2}
                  dot={{ fill: '#e94560', r: 3 }}
                  activeDot={{ r: 6 }}
                  name="MRR"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#7b2cbf"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Target Path"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* User Growth Section */}
          {userGrowthData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Total Users</MetricLabel>
                  <MetricValue>{formatNumber(userGrowthData.summary.current)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Previous (7d ago)</MetricLabel>
                  <MetricValue>{formatNumber(userGrowthData.summary.previous)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>New Users (7d)</MetricLabel>
                  <MetricValue style={{
                    color: userGrowthData.summary.trend === 'up' ? '#00d26a' : '#e94560'
                  }}>
                    {userGrowthData.summary.trend === 'up' ? '+' : ''}
                    {formatNumber(userGrowthData.summary.change)}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Avg Daily New Users</MetricLabel>
                  <MetricValue>{formatNumber(userGrowthData.summary.avgDailyNewUsers)}</MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>User Growth Trend</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={userGrowthData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d26a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00d26a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value;
                      }}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#00d26a"
                      strokeWidth={2}
                      fill="url(#colorUsers)"
                      dot={{ fill: '#00d26a', r: 3 }}
                      activeDot={{ r: 6 }}
                      name="Cumulative Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#7b2cbf"
                      strokeWidth={2}
                      dot={false}
                      name="New Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {/* CAC Trend Section */}
          {cacData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Current CAC</MetricLabel>
                  <MetricValue>{formatCurrency(cacData.summary.current)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Previous CAC (7d ago)</MetricLabel>
                  <MetricValue>{formatCurrency(cacData.summary.previous)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Change (7d)</MetricLabel>
                  <MetricValue style={{
                    color: cacData.summary.trend === 'down' ? '#00d26a' : '#e94560'
                  }}>
                    {cacData.summary.trend === 'down' ? '↓' : '↑'}
                    {formatCurrency(Math.abs(cacData.summary.change))}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Average CAC</MetricLabel>
                  <MetricValue>{formatCurrency(cacData.summary.average)}</MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Customer Acquisition Cost (CAC) Trend</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={cacData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorCac" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffb020" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffb020" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <ReferenceLine
                      y={15}
                      label="Target $15"
                      stroke="#00d26a"
                      strokeDasharray="3 3"
                      style={{ color: '#00d26a' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cac"
                      stroke="#ffb020"
                      strokeWidth={2}
                      dot={{ fill: '#ffb020', r: 3 }}
                      activeDot={{ r: 6 }}
                      name="CAC"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {acquisitionData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Organic Users</MetricLabel>
                  <MetricValue style={{ color: '#00d26a' }}>
                    {formatNumber(acquisitionData.summary.organicUsers)}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Paid Users</MetricLabel>
                  <MetricValue style={{ color: '#7b2cbf' }}>
                    {formatNumber(acquisitionData.summary.paidUsers)}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Organic %</MetricLabel>
                  <MetricValue style={{
                    color: acquisitionData.summary.trend === 'up' ? '#00d26a' : '#e94560'
                  }}>
                    {acquisitionData.summary.trend === 'up' ? '↑' : '↓'}
                    {acquisitionData.summary.organicPercent}%
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Previous (7d ago)</MetricLabel>
                  <MetricValue>
                    {acquisitionData.summary.previous.organicPercent}% / {acquisitionData.summary.previous.paidPercent}%
                  </MetricValue>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Organic vs Paid User Acquisition</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={acquisitionData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Bar
                      dataKey="organicUsers"
                      name="Organic Users"
                      fill="#00d26a"
                      stackId="acquisition"
                    />
                    <Bar
                      dataKey="paidUsers"
                      name="Paid Users"
                      fill="#7b2cbf"
                      stackId="acquisition"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

          {/* Revenue vs Spend Section */}
          {revenueSpendData && (
            <>
              <MetricsRow>
                <MetricCard>
                  <MetricLabel>Monthly Revenue</MetricLabel>
                  <MetricValue>{formatCurrency(revenueSpendData.summary.current.revenue)}</MetricValue>
                  <MetricChange $positive={revenueSpendData.summary.change.revenue >= 0}>
                    {revenueSpendData.summary.change.revenue >= 0 ? '↑' : '↓'} {Math.abs(revenueSpendData.summary.change.revenue)}%
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Marketing Spend</MetricLabel>
                  <MetricValue>{formatCurrency(revenueSpendData.summary.current.spend)}</MetricValue>
                  <MetricChange $positive={revenueSpendData.summary.change.spend <= 0}>
                    {revenueSpendData.summary.change.spend <= 0 ? '↓' : '↑'} {Math.abs(revenueSpendData.summary.change.spend)}%
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Monthly Profit</MetricLabel>
                  <MetricValue $positive={revenueSpendData.summary.current.profit >= 0}>
                    {formatCurrency(revenueSpendData.summary.current.profit)}
                  </MetricValue>
                  <MetricChange $positive={revenueSpendData.summary.current.profit >= 0}>
                    {revenueSpendData.summary.current.profit >= 0 ? '✓' : '✗'} {revenueSpendData.summary.current.profitMargin}%
                  </MetricChange>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Avg Profit Margin</MetricLabel>
                  <MetricValue $positive={revenueSpendData.summary.averages.profitMargin >= 0}>
                    {revenueSpendData.summary.averages.profitMargin}%
                  </MetricValue>
                  <MetricChange>
                    {formatCurrency(revenueSpendData.summary.averages.revenue)} / {formatCurrency(revenueSpendData.summary.averages.spend)}
                  </MetricChange>
                </MetricCard>
              </MetricsRow>

              <ChartContainer>
                <ChartTitle>Revenue vs Marketing Spend</ChartTitle>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={revenueSpendData.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#a0a0a0"
                      style={{ fontSize: '0.85rem' }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: '#a0a0a0' }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#00d26a"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="spend"
                      name="Marketing Spend"
                      stroke="#e94560"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={0}
                      stroke="#2d3561"
                      strokeWidth={1}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}
            </>
          )}
        </>
      )}
    </DashboardContainer>
  );
}

export default StrategicDashboard;
