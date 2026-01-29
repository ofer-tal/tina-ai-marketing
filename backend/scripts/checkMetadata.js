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
    returnRecordsWithNoMetrics: true,
    returnRowTotals: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 20 }
    }
  };

  console.log('Getting campaigns with metadata...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  if (response.data?.reportingDataResponse?.row) {
    const targetCampaignIds = ['1846030687', '1779957313', '1851806652'];

    for (const row of response.data.reportingDataResponse.row) {
      console.log('=== Metadata ===');
      console.log(JSON.stringify(row.metadata, null, 2));

      // Calculate spend
      let totalSpend = 0;
      if (Array.isArray(row.granularity)) {
        for (const day of row.granularity) {
          totalSpend += parseFloat(day.localSpend?.amount || 0);
        }
      }

      // Try different possible field names for campaign ID
      const campaignId = row.metadata?.campaignId || row.metadata?.['campaign-id'] || row.campaignId;
      const campaignName = row.metadata?.campaignName || row.metadata?.['campaign-name'] || row.campaignName;

      console.log(`\n>>> Campaign ID: ${campaignId}`);
      console.log(`>>> Campaign Name: ${campaignName}`);
      console.log(`>>> Total Spend: $${totalSpend.toFixed(2)}`);

      if (targetCampaignIds.includes(String(campaignId))) {
        console.log('*** TARGET CAMPAIGN FOUND! ***');
      }
      console.log();
    }
  }
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
