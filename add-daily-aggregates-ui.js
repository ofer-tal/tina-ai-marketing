// Add this code to RevenueAttributionTest.jsx before the final checklist section

// Add these new styled components after the existing styled components:

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

// Add this state to the component (after existing useState declarations):
const [dailyAggregates, setDailyAggregates] = useState([]);
const [selectedDate, setSelectedDate] = useState(null);
const [dailyTransactions, setDailyTransactions] = useState([]);
const [showModal, setShowModal] = useState(false);

// Add this function (after fetchRevenueAttribution function):
const fetchDailyAggregates = async () => {
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
  }
};

// Add this function to handle clicking on a daily aggregate:
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

// Update the useEffect to also fetch daily aggregates:
useEffect(() => {
  fetchRevenueAttribution();
  fetchDailyAggregates();
}, []);

// Add this section before the "Feature Implementation Checklist" section:

<RevenueSection>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <SectionTitle>📅 Daily Revenue Aggregates (Last 14 Days)</SectionTitle>
    <RefreshButton onClick={fetchDailyAggregates}>
      🔄 Refresh
    </RefreshButton>
  </div>

  {dailyAggregates.length === 0 ? (
    <EmptyState>No daily aggregates available. Click "Refresh" to load data.</EmptyState>
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

{/* Add this modal at the end, before the closing PageContainer tag: */}

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
