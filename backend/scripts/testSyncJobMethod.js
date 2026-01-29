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
  const { default: databaseService } = await import('../services/database.js');
  const { default: DailySpend } = await import('../models/DailySpend.js');

  await databaseService.connect();

  console.log('=== Testing getCampaignReport (used by scheduled sync job) ===\n');

  // Test with one of the campaigns that has spend
  const campaignId = '1846030687'; // Blush - Category - other English speaking
  const startDate = '2026-01-01';
  const endDate = '2026-01-31';

  console.log(`Fetching report for campaign ${campaignId} (${startDate} to ${endDate})...\n`);

  const result = await appleSearchAdsService.getCampaignReport(campaignId, startDate, endDate);

  console.log(`Success: ${result.success}`);
  console.log(`Records returned: ${result.report.length}\n`);

  // Calculate totals from the report
  let totalSpend = 0;
  let totalImpr = 0;
  let totalClicks = 0;
  let totalConv = 0;

  for (const day of result.report) {
    totalSpend += day.spend || 0;
    totalImpr += day.impressions || 0;
    totalClicks += day.clicks || 0;
    totalConv += day.conversions || 0;
  }

  console.log('=== Report Totals ===');
  console.log(`Spend: $${totalSpend.toFixed(2)}`);
  console.log(`Impressions: ${totalImpr}`);
  console.log(`Clicks: ${totalClicks}`);
  console.log(`Conversions: ${totalConv}`);

  // Check if we have data in database
  const dbCount = await DailySpend.countDocuments({
    platform: 'apple_search_ads',
    campaignId: campaignId,
    date: { $gte: startDate, $lte: endDate }
  });

  console.log(`\nDatabase records for this campaign/date range: ${dbCount}`);

  await databaseService.disconnect();
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
