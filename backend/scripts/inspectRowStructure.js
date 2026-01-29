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
      pagination: { offset: 0, limit: 5 }
    }
  };

  console.log('Getting first 5 campaigns with full row structure...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  if (response.data?.reportingDataResponse?.row) {
    for (let i = 0; i < response.data.reportingDataResponse.row.length; i++) {
      const row = response.data.reportingDataResponse.row[i];
      console.log(`=== Row ${i} ===`);
      console.log('All keys in row:', Object.keys(row));
      console.log('\nRow data:');
      console.log(JSON.stringify(row, null, 2));

      // Calculate spend
      let totalSpend = 0;
      if (Array.isArray(row.granularity)) {
        for (const day of row.granularity) {
          totalSpend += parseFloat(day.localSpend?.amount || 0);
        }
      }
      console.log(`\n>>> Total calculated spend: $${totalSpend.toFixed(2)}\n`);
    }
  }
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
