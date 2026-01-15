import fs from 'fs';

const filePath = 'frontend/src/pages/Campaigns.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import for recharts (LineChart for revenue trend)
const importsEnd = content.indexOf('from \'recharts\'\';');
if (importsEnd !== -1 && !content.includes('LineChart')) {
  content = content.replace(
    'from \'recharts\'\';',
    'from \'recharts\';\nimport { LineChart, Line } from \'recharts\';'
  );
}

// 2. Add state for revenue attribution (after existing state declarations)
const stateEnd = content.indexOf('const [dailySpend, setDailySpend]');
if (stateEnd !== -1) {
  const searchForSetDailySpend = content.indexOf('setDailySpend]', stateEnd);
  if (searchForSetDailySpend !== -1) {
    const insertPoint = content.indexOf(');', searchForSetDailySpend) + 2;
    content = content.slice(0, insertPoint) +
      '\n  const [showRevenue, setShowRevenue] = useState(false);\n  const [revenueData, setRevenueData] = useState([]);\n  const [revenueLoading, setRevenueLoading] = useState(false);' +
      content.slice(insertPoint);
  }
}

// 3. Add fetch revenue function
const mainComponentStart = content.indexOf('function Campaigns()');
if (mainComponentStart !== -1) {
  const useEffectEnd = content.indexOf('}, [filterStatus]);');
  if (useEffectEnd !== -1) {
    const insertPoint = content.indexOf('\n', useEffectEnd) + 1;
    const fetchRevenueFunction = `
  // Feature #139: Fetch revenue attribution
  const fetchRevenueAttribution = async () => {
    setRevenueLoading(true);
    try {
      const response = await fetch('http://localhost:3003/api/revenue/attribution/campaigns?startDate=' +
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() +
        '&endDate=' + new Date().toISOString());
      const result = await response.json();
      if (result.success) {
        setRevenueData(result.data);
      } else {
        setRevenueData([]);
      }
    } catch (error) {
      console.error('Error fetching revenue attribution:', error);
      setRevenueData([]);
    } finally {
      setRevenueLoading(false);
    }
  };

  const handleViewRevenue = () => {
    setShowRevenue(true);
    fetchRevenueAttribution();
  };

  const handleCloseRevenue = () => {
    setShowRevenue(false);
  };
`;
    content = content.slice(0, insertPoint) + fetchRevenueFunction + content.slice(insertPoint);
  }
}

// 4. Add "Revenue" button to campaigns table (in the actions column)
const buttonCellPattern = /<TableCell>\s*<ActionButton[^>]*>View Ad Groups<\/ActionButton>/;
if (buttonCellPattern.test(content) && !content.includes('View Revenue')) {
  content = content.replace(
    buttonCellPattern,
    `<TableCell>\n                <ActionButton onClick={() => handleViewAdGroups(campaign.campaignId)}>View Ad Groups</ActionButton>\n                <ActionButton onClick={handleViewRevenue} style={{ marginLeft: '0.5rem' }}>💰 Revenue</ActionButton>\n              </TableCell>`
  );
}

// 5. Add Revenue Section component (before the closing PageContainer tag)
const pageContainerEnd = content.lastIndexOf('</PageContainer>');
if (pageContainerEnd !== -1 && !content.includes('RevenueSection')) {
  const revenueSection = `
      {/* Feature #139: Revenue attribution */}
      {showRevenue && (
        <RevenueSection>
          <RevenueHeader>
            <RevenueTitle>
              💰 Revenue Attribution by Campaign (Last 30 Days)
            </RevenueTitle>
            <CloseRevenueButton onClick={handleCloseRevenue}>
              ✕ Close
            </CloseRevenueButton>
          </RevenueHeader>

          {revenueLoading ? (
            <LoadingState>Loading revenue attribution data...</LoadingState>
          ) : revenueData.length === 0 ? (
            <EmptyState>No revenue attribution data available.</EmptyState>
          ) : (
            <>
              <RevenueTable>
                <RevenueTableHeader>
                  <RevenueHeaderCell>Campaign</RevenueHeaderCell>
                  <RevenueHeaderCell>Attributed Revenue</RevenueHeaderCell>
                  <RevenueHeaderCell>Transactions</RevenueHeaderCell>
                  <RevenueHeaderCell>New Customer Rev</RevenueHeaderCell>
                  <RevenueHeaderCell>New Customers</RevenueHeaderCell>
                </RevenueTableHeader>
                {revenueData.map((item) => (
                  <RevenueTableRow key={item._id.campaignId}>
                    <RevenueCell>
                      <RevenueCampaignName>{item._id.campaignName}</RevenueCampaignName>
                      <RevenueCampaignId>{item._id.campaignId}</RevenueCampaignId>
                    </RevenueCell>
                    <RevenueCell>
                      <RevenueValue>${item.totalRevenue.toFixed(2)}</RevenueValue>
                    </RevenueCell>
                    <RevenueCell>
                      <RevenueCount>{item.transactionCount}</RevenueCount>
                    </RevenueCell>
                    <RevenueCell>
                      <RevenueValue color="#00d26a">${item.newCustomerRevenue.toFixed(2)}</RevenueValue>
                    </RevenueCell>
                    <RevenueCell>
                      <RevenueCount>{item.newCustomerCount}</RevenueCount>
                    </RevenueCell>
                  </RevenueTableRow>
                ))}
              </RevenueTable>

              <RevenueSummary>
                <SummaryCard>
                  <SummaryLabel>Total Attributed Revenue</SummaryLabel>
                  <SummaryValue>
                    ${revenueData.reduce((sum, item) => sum + item.totalRevenue, 0).toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Total Transactions</SummaryLabel>
                  <SummaryValue>
                    {revenueData.reduce((sum, item) => sum + item.transactionCount, 0)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>New Customer Revenue</SummaryLabel>
                  <SummaryValue color="#00d26a">
                    ${revenueData.reduce((sum, item) => sum + item.newCustomerRevenue, 0).toFixed(2)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>New Customers</SummaryLabel>
                  <SummaryValue>
                    {revenueData.reduce((sum, item) => sum + item.newCustomerCount, 0)}
                  </SummaryValue>
                </SummaryCard>
              </RevenueSummary>
            </>
          )}
        </RevenueSection>
      )}
`;

  // Insert before the closing PageContainer tag
  content = content.slice(0, pageContainerEnd) + revenueSection + '\n    ' + content.slice(pageContainerEnd);
}

// 6. Add styled components for Revenue Section (before the export)
const exportIndex = content.lastIndexOf('\nexport default Campaigns;');
if (exportIndex !== -1 && !content.includes('const RevenueSection')) {
  const styledComponents = `
const RevenueSection = styled.div\`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
\`;

const RevenueHeader = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
\`;

const RevenueTitle = styled.h2\`
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #00d26a 0%, #e94560 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
\`;

const CloseRevenueButton = styled.button\`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    border-color: #e94560;
  }
\`;

const RevenueTable = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
\`;

const RevenueTableHeader = styled.div\`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
  font-weight: 600;
  color: #a0a0a0;
\`;

const RevenueHeaderCell = styled.div\`
  text-align: left;
\`;

const RevenueTableRow = styled.div\`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #1f1f3a;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #252545;
  }
\`;

const RevenueCell = styled.div\`
  display: flex;
  flex-direction: column;
  justify-content: center;
\`;

const RevenueCampaignName = styled.div\`
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.25rem;
\`;

const RevenueCampaignId = styled.div\`
  font-size: 0.85rem;
  color: #a0a0a0;
\`;

const RevenueValue = styled.div\`
  font-size: 1.1rem;
  font-weight: 600;
  color: \${props => props.color || '#eaeaea'};
\`;

const RevenueCount = styled.div\`
  font-size: 1rem;
  color: #a0a0a0;
\`;

const RevenueSummary = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
\`;

`;

  content = content.slice(0, exportIndex) + styledComponents + '\n' + content.slice(exportIndex);
}

fs.writeFileSync(filePath, content);
console.log('✅ Added revenue attribution functionality to Campaigns.jsx');
