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

  const response = await appleSearchAdsService.getCampaigns(200, 0);

  if (response.success && response.campaigns) {
    console.log('Campaign List:\n');
    for (const c of response.campaigns) {
      const id = c.id;
      const name = c.name;
      const status = c.status || 'UNKNOWN';
      const servingStatus = c.servingStatus || 'UNKNOWN';

      console.log(`ID: ${id}`);
      console.log(`  Name: ${name}`);
      console.log(`  Status: ${status}`);
      console.log(`  Serving: ${servingStatus}`);
      console.log();
    }

    // Look for the specific campaigns the user mentioned
    const targetNames = [
      'Blush - Category - other English speaking',
      'Blush - Competition - US',
      'Blush - Category - US new keywords'
    ];

    console.log('\nLooking for campaigns with spend:');
    for (const targetName of targetNames) {
      const found = response.campaigns.find(c => c.name === targetName);
      if (found) {
        console.log(`✓ Found: "${targetName}" - ID: ${found.id}, Status: ${found.status}, Serving: ${found.servingStatus}`);
      } else {
        console.log(`✗ NOT FOUND: "${targetName}"`);
        // Try partial match
        const partial = response.campaigns.find(c => c.name.includes(targetName.split(' - ')[1]) || c.name.includes('other English'));
        if (partial) {
          console.log(`  Partial match: "${partial.name}" - ID: ${partial.id}`);
        }
      }
    }
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
