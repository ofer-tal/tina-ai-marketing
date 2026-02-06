import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const WeeklyRevenueAggregates = () => {
  const [aggregates, setAggregates] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAggregates();
  }, []);

  const fetchAggregates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/revenue/weekly/aggregates');
      const data = await response.json();

      if (data.success) {
        setAggregates(data.data);
      } else {
        setError(data.error || 'Failed to fetch weekly aggregates');
      }
    } catch (err) {
      console.error('Error fetching weekly aggregates:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekClick = async (week) => {
    try {
      setSelectedWeek(week);
      setShowModal(true);

      const response = await fetch(
        `/api/revenue/weekly/${week.year}/${week.weekNumber}/transactions`
      );
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data.transactions);
      } else {
        console.error('Failed to fetch transactions:', data.error);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedWeek(null);
    setTransactions([]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return '#00d26a'; // Green
    if (growth < 0) return '#ff4757'; // Red
    return '#a0a0a0'; // Gray
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return '↑';
    if (growth < 0) return '↓';
    return '−';
  };

  // Calculate summary statistics
  const summary = aggregates.reduce((acc, week) => {
    return {
      totalRevenue: acc.totalRevenue + (week.revenue?.netRevenue || 0),
      totalTransactions: acc.totalTransactions + (week.transactions?.totalCount || 0),
      totalCustomers: acc.totalCustomers + (week.customers?.totalActive || 0),
      weekCount: acc.weekCount + 1
    };
  }, { totalRevenue: 0, totalTransactions: 0, totalCustomers: 0, weekCount: 0 });

  const averageRevenue = summary.weekCount > 0 ? summary.totalRevenue / summary.weekCount : 0;

  return (
    <Container>
      <Header>
        <Title>📊 Weekly Revenue Aggregates</Title>
        <RefreshButton onClick={fetchAggregates}>🔄 Refresh</RefreshButton>
      </Header>

      {error && (
        <ErrorMessage>
          ⚠️ {error}
        </ErrorMessage>
      )}

      {loading ? (
        <LoadingMessage>Loading weekly revenue data...</LoadingMessage>
      ) : aggregates.length === 0 ? (
        <EmptyMessage>
          No weekly aggregates found. Generate weekly aggregates to view revenue trends.
        </EmptyMessage>
      ) : (
        <>
          <SummaryCards>
            <SummaryCard>
              <SummaryLabel>Total Revenue</SummaryLabel>
              <SummaryValue color="#00d26a">{formatCurrency(summary.totalRevenue)}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>Total Transactions</SummaryLabel>
              <SummaryValue color="#9b59b6">{summary.totalTransactions}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>Total Customers</SummaryLabel>
              <SummaryValue color="#3498db">{summary.totalCustomers}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>Average Weekly Revenue</SummaryLabel>
              <SummaryValue color="#f39c12">{formatCurrency(averageRevenue)}</SummaryValue>
            </SummaryCard>
          </SummaryCards>

          <WeeksGrid>
            {aggregates.map((week) => (
              <WeekCard
                key={week.weekIdentifier}
                onClick={() => handleWeekClick(week)}
              >
                <WeekHeader>
                  <WeekIdentifier>Week {week.weekNumber}</WeekIdentifier>
                  <WeekYear>{week.year}</WeekYear>
                </WeekHeader>

                <WeekDates>
                  {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                </WeekDates>

                <WeekMetrics>
                  <Metric>
                    <MetricLabel>Net Revenue</MetricLabel>
                    <MetricValue color="#00d26a">
                      {formatCurrency(week.revenue?.netRevenue || 0)}
                    </MetricValue>
                  </Metric>

                  <Metric>
                    <MetricLabel>Transactions</MetricLabel>
                    <MetricValue color="#9b59b6">
                      {week.transactions?.totalCount || 0}
                    </MetricValue>
                  </Metric>

                  <Metric>
                    <MetricLabel>Customers</MetricLabel>
                    <MetricValue color="#3498db">
                      {week.customers?.totalActive || 0}
                    </MetricValue>
                  </Metric>
                </WeekMetrics>

                {week.weekOverWeek && week.weekOverWeek.revenueGrowth !== 0 && (
                  <WeekOverWeek>
                    <WowLabel>Week-over-Week</WowLabel>
                    <WowValue color={getGrowthColor(week.weekOverWeek.revenueGrowth)}>
                      {getGrowthIcon(week.weekOverWeek.revenueGrowth)}{' '}
                      {Math.abs(week.weekOverWeek.revenueGrowth).toFixed(1)}%
                    </WowValue>
                    <WowAmount>
                      {week.weekOverWeek.revenueGrowthAmount > 0 ? '+' : ''}
                      {formatCurrency(week.weekOverWeek.revenueGrowthAmount)}
                    </WowAmount>
                  </WeekOverWeek>
                )}

                <WeekBreakdown>
                  <BreakdownItem>
                    <BreakdownLabel>Subscription</BreakdownLabel>
                    <BreakdownValue>{formatCurrency(week.breakdown?.subscriptionRevenue || 0)}</BreakdownValue>
                  </BreakdownItem>
                  <BreakdownItem>
                    <BreakdownLabel>One-Time</BreakdownLabel>
                    <BreakdownValue>{formatCurrency(week.breakdown?.oneTimePurchaseRevenue || 0)}</BreakdownValue>
                  </BreakdownItem>
                </WeekBreakdown>
              </WeekCard>
            ))}
          </WeeksGrid>
        </>
      )}

      {showModal && selectedWeek && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                Week {selectedWeek.weekNumber} ({selectedWeek.year}) - Transactions
              </ModalTitle>
              <CloseButton onClick={closeModal}>×</CloseButton>
            </ModalHeader>

            <ModalBody>
              <ModalSection>
                <ModalSectionTitle>Weekly Summary</ModalSectionTitle>
                <SummaryRow>
                  <SummaryRowLabel>Net Revenue:</SummaryRowLabel>
                  <SummaryRowValue>{formatCurrency(selectedWeek.revenue?.netRevenue || 0)}</SummaryRowValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryRowLabel>Gross Revenue:</SummaryRowLabel>
                  <SummaryRowValue>{formatCurrency(selectedWeek.revenue?.grossRevenue || 0)}</SummaryRowValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryRowLabel>Apple Fees:</SummaryRowLabel>
                  <SummaryRowValue>{formatCurrency(selectedWeek.revenue?.appleFees || 0)}</SummaryRowValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryRowLabel>Transactions:</SummaryRowLabel>
                  <SummaryRowValue>{selectedWeek.transactions?.totalCount || 0}</SummaryRowValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryRowLabel>Customers:</SummaryRowLabel>
                  <SummaryRowValue>{selectedWeek.customers?.totalActive || 0}</SummaryRowValue>
                </SummaryRow>
              </ModalSection>

              <ModalSection>
                <ModalSectionTitle>Transactions ({transactions.length})</ModalSectionTitle>
                <TransactionsList>
                  {transactions.length === 0 ? (
                    <NoTransactions>No transactions found for this week</NoTransactions>
                  ) : (
                    transactions.map((transaction) => (
                      <TransactionItem key={transaction.transactionId}>
                        <TransactionHeader>
                          <TransactionId>{transaction.transactionId}</TransactionId>
                          <TransactionDate>
                            {formatDate(transaction.transactionDate)}
                          </TransactionDate>
                        </TransactionHeader>
                        <TransactionDetails>
                          <DetailRow>
                            <DetailLabel>Amount:</DetailLabel>
                            <DetailValue>{formatCurrency(transaction.revenue?.netAmount || 0)}</DetailValue>
                          </DetailRow>
                          <DetailRow>
                            <DetailLabel>Type:</DetailLabel>
                            <DetailValue>{transaction.customer?.subscriptionType || 'N/A'}</DetailValue>
                          </DetailRow>
                          <DetailRow>
                            <DetailLabel>Customer:</DetailLabel>
                            <DetailValue>
                              {transaction.customer?.new ? '🆕 New' : '↩️ Returning'}
                            </DetailValue>
                          </DetailRow>
                          <DetailRow>
                            <DetailLabel>Channel:</DetailLabel>
                            <DetailValue>
                              {transaction.attributedTo?.channel || 'organic'}
                            </DetailValue>
                          </DetailRow>
                        </TransactionDetails>
                      </TransactionItem>
                    ))
                  )}
                </TransactionsList>
              </ModalSection>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

const Container = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid #ff4757;
  border-radius: 8px;
  padding: 16px;
  color: #ff4757;
  margin-bottom: 20px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #a0a0a0;
  font-size: 16px;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #a0a0a0;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const SummaryCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.color || '#ffffff'};
`;

const WeeksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
`;

const WeekCard = styled.div`
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  }
`;

const WeekHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const WeekIdentifier = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
`;

const WeekYear = styled.div`
  font-size: 14px;
  color: #a0a0a0;
`;

const WeekDates = styled.div`
  font-size: 13px;
  color: #a0a0a0;
  margin-bottom: 16px;
`;

const WeekMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Metric = styled.div`
  text-align: center;
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: #a0a0a0;
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.color || '#ffffff'};
`;

const WeekOverWeek = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 16px;
`;

const WowLabel = styled.div`
  font-size: 12px;
  color: #a0a0a0;
`;

const WowValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.color};
`;

const WowAmount = styled.div`
  font-size: 14px;
  color: ${props => props.color};
`;

const WeekBreakdown = styled.div`
  display: flex;
  gap: 20px;
`;

const BreakdownItem = styled.div`
  flex: 1;
`;

const BreakdownLabel = styled.div`
  font-size: 11px;
  color: #a0a0a0;
  margin-bottom: 4px;
`;

const BreakdownValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
`;

const ModalContent = styled.div`
  background: #1a1a2e;
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #a0a0a0;
  font-size: 32px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #ffffff;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ModalSection = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ModalSectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 16px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const SummaryRowLabel = styled.div`
  color: #a0a0a0;
  font-size: 14px;
`;

const SummaryRowValue = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
`;

const TransactionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NoTransactions = styled.div`
  text-align: center;
  padding: 40px;
  color: #a0a0a0;
`;

const TransactionItem = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
`;

const TransactionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const TransactionId = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
`;

const TransactionDate = styled.div`
  font-size: 12px;
  color: #a0a0a0;
`;

const TransactionDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
`;

const DetailLabel = styled.div`
  font-size: 12px;
  color: #a0a0a0;
`;

const DetailValue = styled.div`
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
`;

export default WeeklyRevenueAggregates;
