#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function clearData() {
  const { default: databaseService } = await import('../services/database.js');
  const { default: DailySpend } = await import('../models/DailySpend.js');

  await databaseService.connect();

  console.log('Clearing existing ASA backfill data...');

  const result = await DailySpend.deleteMany({ platform: 'apple_search_ads' });

  console.log(`Deleted ${result.deletedCount} records`);

  await databaseService.disconnect();
}

clearData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
