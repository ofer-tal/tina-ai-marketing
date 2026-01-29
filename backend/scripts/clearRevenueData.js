#!/usr/bin/env node

/**
 * Clear Revenue Data Script
 *
 * Clears all marketing_revenue data so you can re-run the backfill
 * with corrected logic (zero-revenue filter + subscription events).
 *
 * Run: node backend/scripts/clearRevenueData.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function clearData() {
  console.log('Clearing revenue data...');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');
  const aggregateCollection = mongoose.connection.db.collection('marketing_daily_revenue_aggregates');

  // Count before
  const revenueCount = await revenueCollection.countDocuments();
  const aggregateCount = await aggregateCollection.countDocuments();

  console.log(`Found ${revenueCount} revenue transactions`);
  console.log(`Found ${aggregateCount} daily aggregates`);

  if (revenueCount > 0) {
    const result = await revenueCollection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} revenue transactions`);
  }

  if (aggregateCount > 0) {
    const result = await aggregateCollection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} daily aggregates`);
  }

  console.log('Done!');
  await mongoose.disconnect();
  process.exit(0);
}

clearData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
