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

  // Test with a small date range - include records with no metrics
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Testing ASA API: ${startDateStr} to ${endDateStr}\n`);

  // Make a direct API call to see raw response
  const requestBody = {
    startTime: startDateStr,
    endTime: endDateStr,
    granularity: 'DAILY',
    timeZone: 'UTC',
    groupBy: ['countryOrRegion'],
    returnRecordsWithNoMetrics: true,  // Include records even with zero metrics
    returnRowTotals: true,
    selector: {
      orderBy: [{ field: 'countryOrRegion', sortOrder: 'ASCENDING' }],
      pagination: { offset: 0, limit: 20 }
    }
  };

  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('Raw API Response:');
  console.log(JSON.stringify(response, null, 2));

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
