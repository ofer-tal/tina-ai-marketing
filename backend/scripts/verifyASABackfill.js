#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function verify() {
  const { default: databaseService } = await import('../services/database.js');
  const { default: DailySpend } = await import('../models/DailySpend.js');

  await databaseService.connect();

  console.log('=== Verifying ASA Backfill Data ===\n');

  // Count records
  const count = await DailySpend.countDocuments({ platform: 'apple_search_ads' });
  console.log(`Total DailySpend records: ${count}\n`);

  // Check date range
  const dates = await DailySpend.find({ platform: 'apple_search_ads' })
    .sort({ date: 1 })
    .limit(1);
  const latest = await DailySpend.find({ platform: 'apple_search_ads' })
    .sort({ date: -1 })
    .limit(1);

  if (dates.length > 0) {
    console.log(`Date range: ${dates[0].date} to ${latest[0].date}\n`);
  }

  // Check data with spend
  const withSpend = await DailySpend.find({
    platform: 'apple_search_ads',
    actualSpend: { $gt: 0 }
  }).sort({ date: -1 });

  console.log(`Records with spend > 0: ${withSpend.length}\n`);

  // Group by campaign
  const byCampaign = {};
  for (const record of withSpend) {
    const id = record.campaignId;
    if (!byCampaign[id]) {
      byCampaign[id] = {
        name: record.campaignName,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        count: 0
      };
    }
    byCampaign[id].spend += record.actualSpend || 0;
    byCampaign[id].impressions += record.impressions || 0;
    byCampaign[id].clicks += record.clicks || 0;
    byCampaign[id].conversions += record.conversions || 0;
    byCampaign[id].count++;
  }

  console.log('=== Spend by Campaign ===');
  for (const [id, data] of Object.entries(byCampaign).sort((a, b) => b[1].spend - a[1].spend)) {
    console.log(`$${data.spend.toFixed(2).padStart(7)} | ${data.name} (${data.count} days)`);
    console.log(`           Impr: ${data.impressions} | Clicks: ${data.clicks} | Conversions: ${data.conversions}\n`);
  }

  // Show sample record
  if (withSpend.length > 0) {
    console.log('=== Sample Record ===');
    const sample = withSpend[0];
    console.log(JSON.stringify({
      date: sample.date,
      campaignId: sample.campaignId,
      campaignName: sample.campaignName,
      actualSpend: sample.actualSpend,
      impressions: sample.impressions,
      clicks: sample.clicks,
      conversions: sample.conversions
    }, null, 2));
  }

  await databaseService.disconnect();
}

verify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
