#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function test() {
  const { default: appleSearchAdsService } = await import('../services/appleSearchAdsService.js');

  // Try December 2025
  const requestBody = {
    startTime: '2025-12-01',
    endTime: '2025-12-31',
    granularity: 'DAILY',
    timeZone: 'UTC',
    returnRecordsWithNoMetrics: true,
    returnRowTotals: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 100 }
    }
  };

  console.log('Querying December 2025...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('Total results:', response.pagination?.totalResults);

  if (response.data && response.data.row) {
    // Find rows with actual spend
    const withSpend = response.data.row.filter(r => {
      const spend = parseFloat(r.total?.localSpend?.amount || 0);
      return spend > 0;
    });

    console.log(`Rows with spend > 0: ${withSpend.length}`);

    if (withSpend.length > 0) {
      console.log('\nCampaigns with spend in Dec 2025:');
      for (const row of withSpend) {
        const metadata = row.metadata || {};
        const spend = row.total?.localSpend?.amount || '0';
        const impr = row.total?.impressions || 0;
        console.log(`  $${spend} - ${metadata.campaignName} (ID: ${metadata.campaignId}, ${impr} impr)`);
      }
    } else {
      console.log('\nNo spend found in Dec 2025 either');
    }

    // Check grand totals if available
    if (response.data.grandTotals) {
      const totalSpend = response.data.grandTotals.total?.localSpend?.amount || 0;
      console.log(`\nGrand totals spend: $${totalSpend}`);
    }
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
