#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function check() {
  const { default: appleSearchAdsService } = await import('../services/appleSearchAdsService.js');

  console.log('Fetching Apple Search Ads campaigns...\n');

  const response = await appleSearchAdsService.getCampaigns(200, 0);

  if (response.success && response.campaigns) {
    console.log(`Found ${response.campaigns.length} campaigns:\n`);

    for (const c of response.campaigns) {
      const status = c.status || 'UNKNOWN';
      const servingStatus = c.servingStatus || 'UNKNOWN';
      const dailyBudget = c.dailyBudget?.amount || 'N/A';
      const currency = c.dailyBudget?.currency || 'USD';

      console.log(`  ${c.name}`);
      console.log(`    ID: ${c.id}`);
      console.log(`    Status: ${status}`);
      console.log(`    Serving Status: ${servingStatus}`);
      console.log(`    Daily Budget: ${dailyBudget} ${currency}`);
      console.log(`    Countries: ${c.countriesOrRegions?.join(', ') || 'N/A'}`);
      console.log();
    }
  } else {
    console.log('Failed to fetch campaigns');
    if (response.error) console.log(`Error: ${response.error}`);
  }

  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
