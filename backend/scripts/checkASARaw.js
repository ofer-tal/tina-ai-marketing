#!/usr/bin/env node

/**
 * Check ASA data in database and test API
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

async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const spendCollection = mongoose.connection.db.collection('daily_spend');

  console.log('Checking daily_spend collection...\n');

  // Check all records (not just ASA)
  const allCount = await spendCollection.countDocuments();
  console.log(`Total daily_spend records: ${allCount}`);

  // Check for ASA records
  const asaCount = await spendCollection.countDocuments({ platform: 'apple_search_ads' });
  console.log(`ASA platform records: ${asaCount}`);

  // Check for any record with apple_search
  const anyApple = await spendCollection.countDocuments({ platform: { $regex: 'apple', $options: 'i' } });
  console.log(`Any apple* platform records: ${anyApple}`);

  // Show sample records
  const samples = await spendCollection.find({}).limit(5).toArray();
  console.log('\nSample records:');
  for (const s of samples) {
    console.log(`  platform: ${s.platform}, date: ${s.date}, campaignId: ${s.campaignId}`);
  }

  // Test the API directly
  console.log('\n\nTesting ASA API directly...\n');

  const { default: appleSearchAdsService } = await import('../services/appleSearchAdsService.js');

  // Test with a small date range (last 7 days)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Fetching data from ${startDateStr} to ${endDateStr}...`);

  const result = await appleSearchAdsService.getDailySpendData(startDateStr, endDateStr);

  console.log(`\nAPI Result:`);
  console.log(`  success: ${result.success}`);
  console.log(`  data length: ${result.data?.length || 0}`);
  if (result.error) {
    console.log(`  error: ${result.error}`);
  }

  if (result.data && result.data.length > 0) {
    console.log(`\nFirst 3 records from API:`);
    result.data.slice(0, 3).forEach((d, i) => {
      console.log(`  ${i+1}. ${d.date} | Campaign: ${d.campaignId} | Spend: $${d.spend} | Impr: ${d.impressions} | Clicks: ${d.clicks}`);
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
