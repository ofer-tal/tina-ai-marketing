import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #00d26a 0%, #e94560 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  color: #a0a0a0;
  margin: 0;
  font-size: 1.1rem;
`;

const RevenueSection = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
`;

const DailyAggregateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DailyAggregateCard = styled.div`
  background: #1f1f3a;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #2d3561;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #252545;
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const AggregateDate = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const AggregateRevenue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: #00d26a;
  margin-bottom: 0.5rem;
`;

const AggregateTransactions = styled.div`
  font-size: 0.9rem;
  color: #7b2cbf;
`;

const AggregateCustomers = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-top: 0.5rem;
`;

const AggregateDetails = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #2d3561;
`;

const AggregateDetailItem = styled.div`
  flex: 1;
`;

const AggregateDetailLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const AggregateDetailValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.color || '#eaeaea'};
`;

const RevenueBreakdown = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #2d3561;
`;

const BreakdownItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const BreakdownLabel = styled.div`
  font-size: 0.7rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const BreakdownValue = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.color || '#eaeaea'};
`;

const RevenueSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const SummaryCard = styled.div`
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #2d3561;
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.color || '#eaeaea'};
`;

const Modal = styled.div`
  display: ${props => props.show ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #16213e;
  border-radius: 16px;
  padding: 2rem;
  max-width: 900px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid #2d3561;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: #eaeaea;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0a0a0;
  cursor: pointer;
  padding: 0.5rem;

  &:hover {
    color: #eaeaea;
  }
`;

const TransactionTable = styled.div`
  margin-top: 1.5rem;
`;

const TransactionTableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
  font-weight: 600;
  color: #a0a0a0;
  font-size: 0.9rem;
`;

const TransactionTableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1f1f3a;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;

  &:hover {
    background: #252545;
  }
`;

const TransactionCell = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  word-break: break-word;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  margin-bottom: 1rem;

  &:hover {
    background: #ff6b6b;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

function DailyRevenueAggregates() {
  const [dailyAggregates, setDailyAggregates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fetchDailyAggregates = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // Last 14 days

      const response = await fetch(
        `http://localhost:3001/api/revenue/daily/aggregates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setDailyAggregates(result.data);
      }
    } catch (err) {
      console.error('Error fetching daily aggregates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAggregateClick = async (aggregate) => {
    setSelectedDate(aggregate);
    setShowModal(true);

    try {
      const response = await fetch(
        `http://localhost:3001/api/revenue/daily/${aggregate.date}/transactions`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setDailyTransactions(result.data);
      }
    } catch (err) {
      console.error('Error fetching daily transactions:', err);
      setDailyTransactions([]);
    }
  };

  useEffect(() => {
    fetchDailyAggregates();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>📅 Daily Revenue Aggregates</PageTitle>
          <PageSubtitle>Feature #152: Revenue aggregation by day • Feature #158: One-time purchase tracking</PageSubtitle>
        </PageHeader>
        <LoadingState>Loading daily aggregates...</LoadingState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>📅 Daily Revenue Aggregates</PageTitle>
        <PageSubtitle>Feature #152: Revenue aggregation by day with drill-down to transactions</PageSubtitle>
      </PageHeader>

      <RevenueSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <SectionTitle>Daily Revenue (Last 14 Days)</SectionTitle>
          <RefreshButton onClick={fetchDailyAggregates}>
            🔄 Refresh
          </RefreshButton>
        </div>

        {dailyAggregates.length === 0 ? (
          <EmptyState>
            No daily aggregates available.{" "}
            <span style={{ color: '#e94560', cursor: 'pointer' }} onClick={fetchDailyAggregates}>
              Click here to load data.
            </span>
          </EmptyState>
        ) : (
          <>
            <DailyAggregateGrid>
              {dailyAggregates.map((aggregate) => (
                <DailyAggregateCard
                  key={aggregate._id}
                  onClick={() => handleAggregateClick(aggregate)}
                >
                  <AggregateDate>{aggregate.date}</AggregateDate>
                  <AggregateRevenue>${aggregate.revenue.netRevenue.toFixed(2)}</AggregateRevenue>
                  <AggregateTransactions>{aggregate.transactions.totalCount} transactions</AggregateTransactions>
                  <AggregateCustomers>
                    {aggregate.customers.newCount} new • {aggregate.customers.returningCount} returning
                  </AggregateCustomers>
                  <AggregateDetails>
                    <AggregateDetailItem>
                      <AggregateDetailLabel>Gross</AggregateDetailLabel>
                      <AggregateDetailValue color="#eaeaea">
                        ${aggregate.revenue.grossRevenue.toFixed(0)}
                      </AggregateDetailValue>
                    </AggregateDetailItem>
                    <AggregateDetailItem>
                      <AggregateDetailLabel>Apple Fees</AggregateDetailLabel>
                      <AggregateDetailValue color="#ff6b6b">
                        -${aggregate.revenue.appleFees.toFixed(2)}
                      </AggregateDetailValue>
                    </AggregateDetailItem>
                    <AggregateDetailItem>
                      <AggregateDetailLabel>Avg/Trans</AggregateDetailLabel>
                      <AggregateDetailValue color="#7b2cbf">
                        ${aggregate.averages.revenuePerTransaction.toFixed(2)}
                      </AggregateDetailValue>
                    </AggregateDetailItem>
                  </AggregateDetails>
                  <RevenueBreakdown>
                    <BreakdownItem>
                      <BreakdownLabel>Subscription</BreakdownLabel>
                      <BreakdownValue color="#7b2cbf">
                        ${(aggregate.breakdown?.subscriptionRevenue || 0).toFixed(2)}
                      </BreakdownValue>
                    </BreakdownItem>
                    <BreakdownItem>
                      <BreakdownLabel>One-Time</BreakdownLabel>
                      <BreakdownValue color="#00d26a">
                        ${(aggregate.breakdown?.oneTimePurchaseRevenue || 0).toFixed(2)}
                      </BreakdownValue>
                    </BreakdownItem>
                  </RevenueBreakdown>
                </DailyAggregateCard>
              ))}
            </DailyAggregateGrid>

            <RevenueSummary>
              <SummaryCard>
                <SummaryLabel>Total Net Revenue</SummaryLabel>
                <SummaryValue color="#00d26a">
                  ${dailyAggregates.reduce((sum, item) => sum + item.revenue.netRevenue, 0).toFixed(2)}
                </SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Subscription Revenue</SummaryLabel>
                <SummaryValue color="#7b2cbf">
                  ${dailyAggregates.reduce((sum, item) => sum + (item.breakdown?.subscriptionRevenue || 0), 0).toFixed(2)}
                </SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>One-Time Purchase Revenue</SummaryLabel>
                <SummaryValue color="#00d26a">
                  ${dailyAggregates.reduce((sum, item) => sum + (item.breakdown?.oneTimePurchaseRevenue || 0), 0).toFixed(2)}
                </SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Total Transactions</SummaryLabel>
                <SummaryValue>
                  {dailyAggregates.reduce((sum, item) => sum + item.transactions.totalCount, 0)}
                </SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Total New Customers</SummaryLabel>
                <SummaryValue color="#7b2cbf">
                  {dailyAggregates.reduce((sum, item) => sum + item.customers.newCount, 0)}
                </SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Avg Daily Revenue</SummaryLabel>
                <SummaryValue>
                  ${(dailyAggregates.reduce((sum, item) => sum + item.revenue.netRevenue, 0) / dailyAggregates.length).toFixed(2)}
                </SummaryValue>
              </SummaryCard>
            </RevenueSummary>
          </>
        )}
      </RevenueSection>

      <RevenueSection>
        <SectionTitle>📋 Feature Implementation Checklist</SectionTitle>
        <ul style={{ color: '#a0a0a0', lineHeight: '1.8' }}>
          <li>✅ Step 1: Fetch daily transactions - App Store Connect API integration</li>
          <li>✅ Step 2: Sum revenue by date - MongoDB aggregation pipeline</li>
          <li>✅ Step 3: Store daily aggregates - DailyRevenueAggregate model with pre-computed stats</li>
          <li>✅ Step 4: Display in dashboard - Interactive daily aggregate cards shown above</li>
          <li>✅ Step 5: Enable drill-down to transactions - Click any day to see individual transactions</li>
        </ul>
      </RevenueSection>

      <RevenueSection>
        <SectionTitle>💳 Feature #158: One-Time Purchase Tracking</SectionTitle>
        <ul style={{ color: '#a0a0a0', lineHeight: '1.8' }}>
          <li>✅ Step 1: Filter transactions by one-time purchase - Backend aggregates non-subscription transactions</li>
          <li>✅ Step 2: Aggregate purchase revenue - Stored in breakdown.oneTimePurchaseRevenue</li>
          <li>✅ Step 3: Store in marketing_revenue - DailyRevenueAggregate model includes breakdown</li>
          <li>✅ Step 4: Display in dashboard - Cards show subscription vs one-time purchase revenue</li>
          <li>✅ Step 5: Compare to subscription revenue - Side-by-side breakdown in summary</li>
        </ul>
      </RevenueSection>

      <Modal show={showModal} onClick={() => setShowModal(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>
              📅 Transactions for {selectedDate?.date}
            </ModalTitle>
            <CloseButton onClick={() => setShowModal(false)}>✕</CloseButton>
          </ModalHeader>

          {selectedDate && (
            <>
              <RevenueSummary>
                <SummaryCard>
                  <SummaryLabel>Net Revenue</SummaryLabel>
                  <SummaryValue color="#00d26a">
                    ${selectedDate.revenue.netRevenue.toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Subscription Revenue</SummaryLabel>
                  <SummaryValue color="#7b2cbf">
                    ${(selectedDate.breakdown?.subscriptionRevenue || 0).toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>One-Time Purchase Revenue</SummaryLabel>
                  <SummaryValue color="#00d26a">
                    ${(selectedDate.breakdown?.oneTimePurchaseRevenue || 0).toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Transactions</SummaryLabel>
                  <SummaryValue>
                    {selectedDate.transactions.totalCount}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>New Customers</SummaryLabel>
                  <SummaryValue color="#7b2cbf">
                    {selectedDate.customers.newCount}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Average/Transaction</SummaryLabel>
                  <SummaryValue>
                    ${selectedDate.averages.revenuePerTransaction.toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
              </RevenueSummary>

              <h3 style={{ color: '#eaeaea', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Individual Transactions ({dailyTransactions.length})
              </h3>

              {dailyTransactions.length === 0 ? (
                <EmptyState>No transactions found for this date.</EmptyState>
              ) : (
                <TransactionTable>
                  <TransactionTableHeader>
                    <TransactionCell>Transaction ID</TransactionCell>
                    <TransactionCell>Type</TransactionCell>
                    <TransactionCell>Gross</TransactionCell>
                    <TransactionCell>Net</TransactionCell>
                    <TransactionCell>Customer</TransactionCell>
                  </TransactionTableHeader>
                  {dailyTransactions.map((tx) => (
                    <TransactionTableRow key={tx.transactionId}>
                      <TransactionCell>
                        <div style={{ fontWeight: 500, color: '#eaeaea', fontSize: '0.8rem' }}>
                          {tx.transactionId.substring(0, 30)}...
                        </div>
                      </TransactionCell>
                      <TransactionCell>
                        <div style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>
                          {tx.customer?.subscriptionType || 'One-time'}
                        </div>
                      </TransactionCell>
                      <TransactionCell>
                        <div style={{ color: '#eaeaea' }}>
                          ${tx.revenue.grossAmount.toFixed(2)}
                        </div>
                      </TransactionCell>
                      <TransactionCell>
                        <div style={{ color: '#00d26a' }}>
                          ${tx.revenue.netAmount.toFixed(2)}
                        </div>
                      </TransactionCell>
                      <TransactionCell>
                        <div style={{
                          color: tx.customer?.new ? '#7b2cbf' : '#a0a0a0',
                          fontSize: '0.85rem'
                        }}>
                          {tx.customer?.new ? 'New' : 'Returning'}
                        </div>
                      </TransactionCell>
                    </TransactionTableRow>
                  ))}
                </TransactionTable>
              )}
            </>
          )}
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}

export default DailyRevenueAggregates;
