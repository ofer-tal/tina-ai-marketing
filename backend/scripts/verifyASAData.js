#!/usr/bin/env node

/**
 * Verify Apple Search Ads back-fill data
 * Shows monthly spend totals
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function verifyASAData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const spendCollection = mongoose.connection.db.collection('daily_spend');

  console.log('Apple Search Ads Back-fill Verification\n');
  console.log('=' .repeat(60));

  // Get all records
  const records = await spendCollection
    .find({ platform: 'apple_search_ads' })
    .sort({ date: 1 })
    .toArray();

  console.log(`\nTotal records: ${records.length}`);

  if (records.length === 0) {
    console.log('No ASA data found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Get date range
  const sorted = records.sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = sorted[0].date;
  const lastDate = sorted[sorted.length - 1].date;
  console.log(`Date range: ${firstDate} to ${lastDate}\n`);

  // Group by month
  const byMonth = {};
  for (const record of records) {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        count: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        campaigns: new Set()
      };
    }

    byMonth[monthKey].count++;
    byMonth[monthKey].spend += record.actualSpend || 0;
    byMonth[monthKey].impressions += record.impressions || 0;
    byMonth[monthKey].clicks += record.clicks || 0;
    byMonth[monthKey].conversions += record.conversions || 0;
    if (record.campaignId) byMonth[monthKey].campaigns.add(record.campaignId);
  }

  console.log('Monthly Spend Summary:');
  console.log('Month     | Days | Spend     | Impr | Clicks | Conv | CPC   | CPM');
  console.log('----------|------|-----------|------|--------|------|-------|-------');

  for (const [month, data] of Object.entries(byMonth).sort()) {
    const days = data.count;
    const spend = data.spend.toFixed(2);
    const impr = data.impressions.toLocaleString();
    const clicks = data.clicks.toLocaleString();
    const conv = data.conversions.toLocaleString();
    const cpc = data.clicks > 0 ? (data.spend / data.clicks).toFixed(2) : 'N/A';
    const cpm = data.impressions > 0 ? (data.spend / data.impressions * 1000).toFixed(2) : 'N/A';
    const numCampaigns = data.campaigns.size;

    console.log(`${month}  | ${days.toString().padStart(4)} | $${spend.padStart(8)} | ${impr.padStart(6)} | ${clicks.padStart(6)} | ${conv.padStart(4)} | ${cpc.padStart(5)} | ${cpm.padStart(6)} (${numCampaigns} campaigns)`);
  }

  // Calculate totals
  const totals = Object.values(byMonth).reduce((acc, m) => {
    acc.count += m.count;
    acc.spend += m.spend;
    acc.impressions += m.impressions;
    acc.clicks += m.clicks;
    acc.conversions += m.conversions;
    return acc;
  }, { count: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0 });

  console.log('----------|------|-----------|------|--------|------|-------|-------');
  console.log(`TOTAL     | ${totals.count.toString().padStart(4)} | $${totals.spend.toFixed(2).padStart(8)} | ${totals.impressions.toLocaleString().padStart(6)} | ${totals.clicks.toLocaleString().padStart(6)} | ${totals.conversions.toLocaleString().padStart(4)}`);

  // Show sample records
  console.log('\nSample Records (first 5):');
  console.log('Date       | Campaign | Spend   | Impr | Clicks');
  console.log('-----------|----------|---------|------|-------');
  for (const record of sorted.slice(0, 5)) {
    const date = record.date;
    const campaign = (record.campaignName || '').substring(0, 18);
    const spend = (record.actualSpend || 0).toFixed(2);
    const impr = record.impressions || 0;
    const clicks = record.clicks || 0;
    console.log(`${date} | ${campaign.padEnd(18)} | $${spend.padStart(6)} | ${impr.toString().padStart(5)} | ${clicks}`);
  }

  // Campaign breakdown
  console.log('\nCampaigns Found:');
  const campaignData = {};
  for (const record of sorted) {
    const cid = record.campaignId;
    const name = record.campaignName || 'Unknown';
    if (!campaignData[cid]) {
      campaignData[cid] = { name, days: 0, spend: 0 };
    }
    campaignData[cid].days++;
    campaignData[cid].spend += record.actualSpend || 0;
  }

  for (const [cid, data] of Object.entries(campaignData)) {
    console.log(`  ${data.name} (ID: ${cid}): ${data.days} days, $${data.spend.toFixed(2)} total`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

verifyASAData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
