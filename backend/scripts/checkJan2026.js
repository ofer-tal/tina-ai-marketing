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

  // Query January 2026
  const requestBody = {
    startTime: '2026-01-01',
    endTime: '2026-01-31',
    granularity: 'DAILY',
    timeZone: 'UTC',
    returnRecordsWithNoMetrics: true,
    returnRowTotals: true,
    returnGrandTotals: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 100 }
    }
  };

  console.log('Querying API for January 2026 spend data...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('Total results:', response.pagination?.totalResults);

  if (response.data && response.data.row) {
    console.log(`Rows returned: ${response.data.row.length}`);

    // Group by campaign
    const byCampaign = {};
    for (const row of response.data.row) {
      const metadata = row.metadata || {};
      const campaignId = metadata.campaignId;
      const campaignName = metadata.campaignName || 'Unknown';
      const localSpend = parseFloat(row.total?.localSpend?.amount || 0);

      if (!byCampaign[campaignId]) {
        byCampaign[campaignId] = { name: campaignName, spend: 0, impressions: 0, taps: 0 };
      }
      byCampaign[campaignId].spend += localSpend;
      byCampaign[campaignId].impressions += row.total?.impressions || 0;
      byCampaign[campaignId].taps += row.total?.taps || 0;
    }

    console.log('\nSpend by Campaign (from API):');
    for (const [id, data] of Object.entries(byCampaign).sort((a, b) => b[1].spend - a[1].spend)) {
      console.log(`  $${data.spend.toFixed(2)} - ${data.name} (ID: ${id})`);
    }

    // Show sample row structure for debugging
    if (response.data.row.length > 0) {
      console.log('\nSample row structure:');
      const sample = response.data.row[0];
      console.log(JSON.stringify(sample, null, 2).split('\n').slice(0, 40).join('\n'));
    }
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
