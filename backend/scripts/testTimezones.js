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

  // Try with America/Los_Angeles timezone
  const requestBody = {
    startTime: '2026-01-01',
    endTime: '2026-01-31',
    granularity: 'DAILY',
    timeZone: 'America/Los_Angeles',
    returnRecordsWithNoMetrics: true,
    returnRowTotals: true,
    returnGrandTotals: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 100 }
    }
  };

  console.log('Querying Jan 2026 with America/Los_Angeles timezone...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('Total results:', response.pagination?.totalResults);

  if (response.data && response.data.row) {
    const byCampaign = {};
    for (const row of response.data.row) {
      const metadata = row.metadata || {};
      const campaignId = metadata.campaignId;
      const campaignName = metadata.campaignName || 'Unknown';
      const localSpend = parseFloat(row.total?.localSpend?.amount || 0);

      if (!byCampaign[campaignId]) {
        byCampaign[campaignId] = { name: campaignName, spend: 0 };
      }
      byCampaign[campaignId].spend += localSpend;
    }

    console.log('\nSpend by Campaign (with correct timezone):');
    for (const id of campaignIds) {
      const data = byCampaign[id];
      if (data) {
        console.log(`  $${data.spend.toFixed(2)} - ${data.name}`);
      } else {
        console.log(`  $0.00 - Campaign ${id} (not found in results)`);
      }
    }

    const total = Object.values(byCampaign).reduce((sum, c) => sum + c.spend, 0);
    console.log(`\n  TOTAL: $${total.toFixed(2)}`);
    console.log(`  Expected: $65.10`);
  }

  // Also try without specifying timezone
  console.log('\n\nTrying WITHOUT timeZone parameter...\n');
  const requestBody2 = {
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

  const response2 = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody2)
  });

  if (response2.data && response2.data.row) {
    const byCampaign2 = {};
    for (const row of response2.data.row) {
      const metadata = row.metadata || {};
      const campaignId = metadata.campaignId;
      const localSpend = parseFloat(row.total?.localSpend?.amount || 0);

      if (!byCampaign2[campaignId]) {
        byCampaign2[campaignId] = { name: metadata.campaignName || 'Unknown', spend: 0 };
      }
      byCampaign2[campaignId].spend += localSpend;
    }

    console.log('\nWithout timezone:');
    for (const id of campaignIds) {
      const data = byCampaign2[id];
      if (data) {
        console.log(`  $${data.spend.toFixed(2)} - ${data.name}`);
      }
    }
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
