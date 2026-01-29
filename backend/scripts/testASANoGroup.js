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

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Testing WITHOUT groupBy: ${startDateStr} to ${endDateStr}\n`);

  // Test WITHOUT groupBy to see the daily structure
  const requestBody = {
    startTime: startDateStr,
    endTime: endDateStr,
    granularity: 'DAILY',
    timeZone: 'UTC',
    returnRecordsWithNoMetrics: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 20 }
    }
  };

  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('Response structure (without groupBy):');

  if (response.data && response.data.row && response.data.row.length > 0) {
    const firstRow = response.data.row[0];
    console.log('\nFirst row structure:');
    console.log('  Has "total" object:', !!firstRow.total);
    console.log('  Has "granularity" array:', !!(firstRow.granularity && Array.isArray(firstRow.granularity)));
    console.log('  Has "metadata":', !!firstRow.metadata);

    if (firstRow.metadata) {
      console.log(`  Campaign ID: ${firstRow.metadata.campaignId}`);
      console.log(`  Campaign Name: ${firstRow.metadata.campaignName}`);
    }

    if (firstRow.granularity && Array.isArray(firstRow.granularity)) {
      console.log(`\n  Granularity array length: ${firstRow.granularity.length}`);
      console.log(`  First granularity entry:`);
      console.log(JSON.stringify(firstRow.granularity[0], null, 2).split('\n').slice(0, 15).join('\n'));
    } else if (firstRow.total) {
      console.log('\n  Total object (no daily breakdown when using groupBy):');
      console.log(`    impressions: ${firstRow.total.impressions}`);
      console.log(`    taps: ${firstRow.total.taps}`);
    }
  }

  console.log(`\nTotal rows returned: ${response.data?.row?.length || 0}`);

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
