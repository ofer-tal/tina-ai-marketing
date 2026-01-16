import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import DataTable from '../components/DataTable';

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
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  color: #a0a0a0;
  margin: 0;
  font-size: 1.1rem;
`;

const Section = styled.section`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #eaeaea;
`;

const ControlsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
  }
`;

const CodeBlock = styled.pre`
  background: #0f0f1e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.875rem;
  color: #eaeaea;
  margin-top: 1rem;
`;

// Generate sample campaign data
const generateCampaignData = (count) => {
  const platforms = ['apple_search_ads', 'tiktok', 'instagram', 'facebook'];
  const statuses = ['active', 'paused', 'completed', 'draft', 'failed'];
  const names = [
    'Summer Romance',
    'Spicy Stories',
    'Love Tales',
    'Romance Readers',
    'Passionate Reads',
    'Romantic Escapes',
    'Love Stories',
    'Date Night',
    'Valentine Special',
    'Cupid\'s Arrow'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${names[i % names.length]} #${Math.floor(i / names.length) + 1}`,
    platform: platforms[i % platforms.length],
    status: statuses[i % statuses.length],
    budget: Math.floor(Math.random() * 1000) + 100,
    actualSpend: Math.floor(Math.random() * 800) + 50,
    impressions: Math.floor(Math.random() * 100000) + 1000,
    clicks: Math.floor(Math.random() * 5000) + 100,
    conversions: Math.floor(Math.random() * 500) + 10,
    roi: (Math.random() * 200 - 50).toFixed(1),
    startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }));
};

// Generate sample revenue data
const generateRevenueData = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    date: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    grossRevenue: (Math.random() * 500 + 200).toFixed(2),
    netRevenue: (Math.random() * 400 + 150).toFixed(2),
    subscriptions: Math.floor(Math.random() * 50) + 10,
    oneTimePurchases: Math.floor(Math.random() * 30) + 5,
    refunds: Math.floor(Math.random() * 5),
    cac: (Math.random() * 20 + 5).toFixed(2),
    ltv: (Math.random() * 100 + 50).toFixed(2)
  }));
};

const DataTableDemo = () => {
  const [campaigns] = useState(() => generateCampaignData(50));
  const [revenueData] = useState(() => generateRevenueData(30));
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(false);

  // Campaign columns
  const campaignColumns = [
    {
      key: 'name',
      label: 'Campaign Name',
      sortable: true,
      width: '2fr'
    },
    {
      key: 'platform',
      label: 'Platform',
      sortable: true,
      render: (value) => {
        const icons = {
          apple_search_ads: '🍎',
          tiktok: '🎵',
          instagram: '📸',
          facebook: '👥'
        };
        return `${icons[value] || '📊'} ${value.replace('_', ' ')}`;
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px'
    },
    {
      key: 'budget',
      label: 'Budget',
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      key: 'actualSpend',
      label: 'Spend',
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      key: 'impressions',
      label: 'Impressions',
      sortable: true,
      render: (value) => value.toLocaleString()
    },
    {
      key: 'clicks',
      label: 'Clicks',
      sortable: true,
      render: (value) => value.toLocaleString()
    },
    {
      key: 'conversions',
      label: 'Conversions',
      sortable: true
    },
    {
      key: 'roi',
      label: 'ROI',
      sortable: true,
      render: (value) => {
        const numValue = parseFloat(value);
        const color = numValue >= 20 ? '#00d26a' : numValue >= 0 ? '#ffb020' : '#f8312f';
        return <span style={{ color, fontWeight: 'bold' }}>{value}%</span>;
      }
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true
    }
  ];

  // Revenue columns
  const revenueColumns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      width: '150px'
    },
    {
      key: 'grossRevenue',
      label: 'Gross Revenue',
      sortable: true,
      render: (value) => `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    {
      key: 'netRevenue',
      label: 'Net Revenue',
      sortable: true,
      render: (value) => `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    {
      key: 'subscriptions',
      label: 'Subscriptions',
      sortable: true
    },
    {
      key: 'oneTimePurchases',
      label: 'One-Time',
      sortable: true
    },
    {
      key: 'refunds',
      label: 'Refunds',
      sortable: true,
      render: (value) => value > 0 ? <span style={{ color: '#f8312f' }}>{value}</span> : value
    },
    {
      key: 'cac',
      label: 'CAC',
      sortable: true,
      render: (value) => `$${parseFloat(value).toFixed(2)}`
    },
    {
      key: 'ltv',
      label: 'LTV',
      sortable: true,
      render: (value) => `$${parseFloat(value).toFixed(2)}`
    }
  ];

  const handleRowClick = (row) => {
    setSelectedCampaign(row);
    alert(`Clicked on: ${row.name}\nID: ${row.id}\nStatus: ${row.status}\nROI: ${row.roi}%`);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>DataTable Component Demo</PageTitle>
        <PageSubtitle>
          Sortable, paginated data tables with customizable columns and styling
        </PageSubtitle>
      </PageHeader>

      {/* Example 1: Campaigns Table */}
      <Section>
        <SectionTitle>📢 Ad Campaigns Table</SectionTitle>
        <ControlsBar>
          <Button onClick={handleRefresh}>🔄 Refresh Data</Button>
          {selectedCampaign && (
            <span style={{ color: '#a0a0a0', marginLeft: 'auto' }}>
              Selected: {selectedCampaign.name}
            </span>
          )}
        </ControlsBar>

        <DataTable
          data={campaigns}
          columns={campaignColumns}
          loading={loading}
          onRowClick={handleRowClick}
          rowKey="id"
          emptyMessage="No campaigns found"
        />

        <CodeBlock>{`// Campaigns table configuration
const campaignColumns = [
  { key: 'name', label: 'Campaign Name', sortable: true, width: '2fr' },
  { key: 'platform', label: 'Platform', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'budget', label: 'Budget', sortable: true, render: (v) => '$' + v },
  { key: 'roi', label: 'ROI', sortable: true },
];

<DataTable
  data={campaigns}
  columns={campaignColumns}
  onRowClick={handleRowClick}
  rowKey="id"
/>`}</CodeBlock>
      </Section>

      {/* Example 2: Revenue Table */}
      <Section>
        <SectionTitle>💰 Revenue Analytics Table</SectionTitle>

        <DataTable
          data={revenueData}
          columns={revenueColumns}
          rowKey="id"
          emptyMessage="No revenue data available"
        />

        <CodeBlock>{`// Revenue table with custom cell rendering
const revenueColumns = [
  {
    key: 'grossRevenue',
    label: 'Gross Revenue',
    sortable: true,
    render: (value) => '$' + parseFloat(value).toLocaleString()
  },
  {
    key: 'cac',
    label: 'CAC',
    sortable: true,
    render: (value) => '$' + parseFloat(value).toFixed(2)
  }
];

<DataTable
  data={revenueData}
  columns={revenueColumns}
  rowKey="id"
/>`}</CodeBlock>
      </Section>

      {/* Example 3: Minimal Table */}
      <Section>
        <SectionTitle>📋 Minimal Table Example</SectionTitle>

        <DataTable
          data={campaigns.slice(0, 5)}
          columns={[
            { key: 'name', label: 'Name', sortable: true },
            { key: 'status', label: 'Status', sortable: true },
            { key: 'roi', label: 'ROI', sortable: true }
          ]}
          rowKey="id"
        />

        <CodeBlock>{`// Minimal table configuration
<DataTable
  data={data}
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ]}
  rowKey="id"
/>`}</CodeBlock>
      </Section>

      {/* Features List */}
      <Section>
        <SectionTitle>✨ Features</SectionTitle>
        <div style={{ color: '#eaeaea', lineHeight: '1.8' }}>
          <ul>
            <li><strong>Sorting:</strong> Click column headers to sort (ascending → descending → reset)</li>
            <li><strong>Pagination:</strong> Navigate through large datasets with customizable page sizes</li>
            <li><strong>Custom Rendering:</strong> Use the <code>render</code> prop to customize cell content</li>
            <li><strong>Status Badges:</strong> Automatic color-coded badges for status fields</li>
            <li><strong>Row Clicks:</strong> Make rows clickable with the <code>onRowClick</code> prop</li>
            <li><strong>Loading State:</strong> Built-in loading spinner</li>
            <li><strong>Empty State:</strong> Customizable message when no data is available</li>
            <li><strong>Striped Rows:</strong> Alternating row colors for better readability</li>
            <li><strong>Hover Effects:</strong> Visual feedback on row hover</li>
            <li><strong>Responsive:</strong> Works with styled-components grid system</li>
            <li><strong>Accessible:</strong> ARIA labels and keyboard navigation support</li>
          </ul>
        </div>
      </Section>

      {/* API Documentation */}
      <Section>
        <SectionTitle>📚 API Reference</SectionTitle>

        <div style={{ color: '#eaeaea' }}>
          <h3 style={{ color: '#e94560' }}>Props</h3>
          <CodeBlock>{`interface DataTableProps {
  data: Array<Object>;              // Required: Array of data objects
  columns: Array<Column>;           // Required: Column definitions
  loading?: boolean;                // Show loading state (default: false)
  emptyMessage?: string;            // Empty state message (default: 'No data available')
  onRowClick?: (row) => void;       // Row click handler
  stripeRows?: boolean;             // Add row striping (default: true)
  hoverRows?: boolean;              // Add hover effect (default: true)
  rowKey?: string;                  // Unique key field (default: 'id')
}

interface Column {
  key: string;                      // Field name in data object
  label: string;                    // Column header text
  sortable?: boolean;               // Enable sorting (default: true)
  width?: string;                   // CSS grid width (default: '1fr')
  render?: (value, row, index) => ReactNode;  // Custom cell renderer
}`}</CodeBlock>

          <h3 style={{ color: '#e94560', marginTop: '2rem' }}>Usage Example</h3>
          <CodeBlock>{`import DataTable from './components/DataTable';

function MyPage() {
  const [data, setData] = useState([
    { id: 1, name: 'Item 1', status: 'active', value: 100 },
    { id: 2, name: 'Item 2', status: 'paused', value: 200 },
  ]);

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (value) => '$' + value.toLocaleString()
    }
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      onRowClick={(row) => console.log('Clicked:', row)}
      rowKey="id"
    />
  );
}`}</CodeBlock>
        </div>
      </Section>
    </PageContainer>
  );
};

export default DataTableDemo;
