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

  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('January 2026 - Spend by Campaign:\n');
  console.log('Amount    | Campaign Name');
  console.log('----------|' + '-'.repeat(50));

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

    for (const [id, data] of Object.entries(byCampaign).sort((a, b) => b[1].spend - a[1].spend)) {
      if (data.spend > 0) {
        console.log(`$${data.spend.toFixed(2).padStart(8)} | ${data.name}`);
      }
    }

    const total = Object.values(byCampaign).reduce((sum, c) => sum + c.spend, 0);
    console.log('----------|' + '-'.repeat(50));
    console.log(`$${total.toFixed(2).padStart(8)} | TOTAL`);
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
