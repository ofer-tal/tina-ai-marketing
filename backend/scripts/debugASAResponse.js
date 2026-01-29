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

  // Simple request first
  const requestBody = {
    startTime: '2026-01-01',
    endTime: '2026-01-31',
    granularity: 'DAILY',
    returnRecordsWithNoMetrics: true,
    returnRowTotals: true,
    returnGrandTotals: true,
    selector: {
      orderBy: [{ field: 'localSpend', sortOrder: 'DESCENDING' }],
      pagination: { offset: 0, limit: 20 }
    }
  };

  console.log('Making request...\n');
  const response = await appleSearchAdsService.makeRequest('/reports/campaigns', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  console.log('=== FULL RESPONSE STRUCTURE ===');
  console.log('Pagination:', JSON.stringify(response.pagination, null, 2));

  if (response.data) {
    console.log('\nData keys:', Object.keys(response.data));

    // Check for reportingDataResponse wrapper
    if (response.data.reportingDataResponse) {
      console.log('\n=== Has reportingDataResponse wrapper ===');
      const rdr = response.data.reportingDataResponse;
      console.log('reportingDataResponse keys:', Object.keys(rdr));

      if (rdr.row) {
        console.log('\nRow count (from reportingDataResponse):', rdr.row.length);

        // Target campaign IDs
        const targetCampaignIds = ['1846030687', '1779957313', '1851806652'];
        const campaignSpend = {};

        // Process each row - each row represents a campaign with daily granularity data
        for (const row of rdr.row) {
          const campaignId = row.campaignId;
          const campaignName = row.campaignName || 'Unknown';

          // Calculate total spend from granularity array
          let totalSpend = 0;
          if (Array.isArray(row.granularity)) {
            for (const day of row.granularity) {
              totalSpend += parseFloat(day.localSpend?.amount || 0);
            }
          }

          if (targetCampaignIds.includes(String(campaignId))) {
            campaignSpend[campaignId] = { name: campaignName, spend: totalSpend };
          }
        }

        console.log('\n=== TARGET CAMPAIGNS SPEND (Jan 2026) ===');
        for (const id of targetCampaignIds) {
          if (campaignSpend[id]) {
            console.log(`$${campaignSpend[id].spend.toFixed(2)} - ${campaignSpend[id].name} (ID: ${id})`);
          } else {
            console.log(`NOT FOUND - Campaign ID: ${id}`);
          }
        }

        const totalTargetSpend = Object.values(campaignSpend).reduce((sum, c) => sum + c.spend, 0);
        console.log(`\nTOTAL: $${totalTargetSpend.toFixed(2)}`);
        console.log(`EXPECTED: $65.10`);

        // Show all campaigns with spend
        console.log('\n=== ALL CAMPAIGNS WITH SPEND ===');
        for (const row of rdr.row) {
          let totalSpend = 0;
          if (Array.isArray(row.granularity)) {
            for (const day of row.granularity) {
              totalSpend += parseFloat(day.localSpend?.amount || 0);
            }
          }
          if (totalSpend > 0) {
            console.log(`$${totalSpend.toFixed(2)} - ${row.campaignName} (ID: ${row.campaignId})`);
          }
        }
      }

      if (rdr.grandTotals) {
        console.log('\n=== Grand Totals ===');
        console.log(JSON.stringify(rdr.grandTotals, null, 2));
      }
    } else if (response.data.row) {
      console.log('\nRow count:', response.data.row.length);

      // Show first row structure
      if (response.data.row.length > 0) {
        console.log('\n=== First row structure ===');
        console.log(JSON.stringify(response.data.row[0], null, 2));
      }

      // Show rows with spend
      const withSpend = response.data.row.filter(r => {
        const spend = parseFloat(r.total?.localSpend?.amount || 0);
        return spend > 0;
      });
      console.log(`\n=== Rows with spend > 0: ${withSpend.length} ===`);
      for (const row of withSpend) {
        console.log(`  Campaign: ${row.metadata?.campaignName} (ID: ${row.metadata?.campaignId})`);
        console.log(`  Date: ${row.date}`);
        console.log(`  Spend: $${row.total?.localSpend?.amount || '0'}`);
        console.log(`  Impressions: ${row.total?.impressions || 0}`);
        console.log();
      }
    }

    if (response.data.grandTotals) {
      console.log('\n=== Grand Totals ===');
      console.log(JSON.stringify(response.data.grandTotals, null, 2));
    }
  }
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
