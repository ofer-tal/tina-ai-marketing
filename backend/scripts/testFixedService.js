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

  console.log('Testing updated getDailySpendData...\n');

  const result = await appleSearchAdsService.getDailySpendData('2026-01-01', '2026-01-31');

  console.log(`Success: ${result.success}`);
  console.log(`Records returned: ${result.data.length}\n`);

  // Group by campaign
  const byCampaign = {};
  for (const record of result.data) {
    if (!byCampaign[record.campaignId]) {
      byCampaign[record.campaignId] = {
        name: record.campaignName,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0
      };
    }
    byCampaign[record.campaignId].spend += record.spend;
    byCampaign[record.campaignId].impressions += record.impressions;
    byCampaign[record.campaignId].clicks += record.clicks;
    byCampaign[record.campaignId].conversions += record.conversions;
  }

  console.log('=== JAN 2026 SPEND BY CAMPAIGN ===');
  for (const [id, data] of Object.entries(byCampaign).sort((a, b) => b[1].spend - a[1].spend)) {
    if (data.spend > 0) {
      console.log(`$${data.spend.toFixed(2).padStart(7)} | ${data.name} (ID: ${id})`);
      console.log(`           Impr: ${data.impressions} | Clicks: ${data.clicks} | Installs: ${data.conversions}\n`);
    }
  }

  const totalSpend = Object.values(byCampaign).reduce((sum, c) => sum + c.spend, 0);
  console.log(`=== TOTAL: $${totalSpend.toFixed(2)} ===`);
  console.log(`Expected: $65.10`);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
