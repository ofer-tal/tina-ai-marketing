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

  const campaignIds = ['1846030687', '1779957313', '1851806652'];

  // Try WITHOUT timeZone parameter
  const requestBody = {
    startTime: '2026-01-01',
    endTime: '2026-01-31',
    granularity: 'DAILY',
    returnRecordsWithNoMetrics: true,
    returnRowTotals: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 100 }
    }
  };

  console.log('Querying Jan 2026 WITHOUT timezone...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('Total results:', response.pagination?.totalResults);

  if (response.data && response.data.row) {
    console.log(`Rows returned: ${response.data.row.length}\n`);

    // Show all rows with spend
    const withSpend = response.data.row.filter(r => {
      const spend = parseFloat(r.total?.localSpend?.amount || 0);
      return spend > 0;
    });

    console.log(`Rows with spend > 0: ${withSpend.length}\n`);

    // Show details for our target campaigns
    for (const row of response.data.row) {
      const metadata = row.metadata || {};
      if (campaignIds.includes(String(metadata.campaignId))) {
        const spend = row.total?.localSpend?.amount || '0';
        const impr = row.total?.impressions || 0;
        const taps = row.total?.taps || 0;
        console.log(`${metadata.campaignName} (ID: ${metadata.campaignId})`);
        console.log(`  Spend: $${spend} | Impr: ${impr} | Taps: ${taps}`);
      }
    }

    // Also try ad group level reports which might have the data
    console.log('\n\nTrying ad group level reports for campaign 1846030687...\n');

    const adGroupRequest = {
      startTime: '2026-01-01',
      endTime: '2026-01-31',
      granularity: 'DAILY',
      returnRecordsWithNoMetrics: true,
      selector: {
        orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
        pagination: { offset: 0, limit: 20 }
      }
    };

    const adResponse = await appleSearchAdsService.makeRequest(`/reports/campaigns/${1846030687}/adgroups`, {
      method: 'POST',
      body: JSON.stringify(adGroupRequest)
    });

    if (adResponse.data && adResponse.data.row) {
      console.log(`Ad Group level - Total results: ${adResponse.pagination?.totalResults}`);
      const adGroupSpend = adResponse.data.row.reduce((sum, r) => sum + parseFloat(r.total?.localSpend?.amount || 0), 0);
      console.log(`Total ad group spend: $${adGroupSpend.toFixed(2)}`);
    }
  }

  // Don't use process.exit() - let script end naturally
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
