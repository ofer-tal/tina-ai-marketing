#!/usr/bin/env node

/**
 * Check for duplicate revenue transactions
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

async function checkDuplicates() {
  console.log('Checking for duplicate revenue transactions...\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');

  // Get all transactions
  const transactions = await revenueCollection
    .find({})
    .sort({ transactionDate: 1 })
    .toArray();

  console.log(`Total transactions: ${transactions.length}`);

  // Check for duplicate transaction IDs
  const txnIds = new Map();
  let duplicates = 0;

  for (const tx of transactions) {
    const id = tx.transactionId;
    if (txnIds.has(id)) {
      duplicates++;
      console.log(`\nDuplicate ID: ${id}`);
      console.log(`  1) ${tx.transactionDate?.toISOString().split('T')[0]} | $${tx.revenue?.netAmount || 0} | ${tx.metadata?.title || 'N/A'}`);
      const existing = txnIds.get(id);
      console.log(`  2) ${existing.transactionDate?.toISOString().split('T')[0]} | $${existing.revenue?.netAmount || 0} | ${existing.metadata?.title || 'N/A'}`);
    } else {
      txnIds.set(id, tx);
    }
  }

  console.log(`\nDuplicate transaction IDs: ${duplicates}`);

  // Check date range
  if (transactions.length > 0) {
    const sorted = transactions.sort((a, b) => a.transactionDate - b.transactionDate);
    const firstDate = sorted[0].transactionDate.toISOString().split('T')[0];
    const lastDate = sorted[sorted.length - 1].transactionDate.toISOString().split('T')[0];
    const days = Math.ceil((sorted[sorted.length - 1].transactionDate - sorted[0].transactionDate) / (1000 * 60 * 60 * 24));

    console.log(`\nDate Range:`);
    console.log(`  From: ${firstDate}`);
    console.log(`  To: ${lastDate}`);
    console.log(`  Days: ${days}`);
  }

  // Calculate totals by source/type
  const bySource = { SALES: 0, SUBSCRIPTION_EVENT: 0, unknown: 0 };
  let totalNetRevenue = 0;
  let positiveRevenue = 0;
  let negativeRevenue = 0; // refunds

  for (const tx of transactions) {
    const source = tx.metadata?.source || 'unknown';
    if (source.includes('SUBSCRIPTION_EVENT')) {
      bySource.SUBSCRIPTION_EVENT++;
    } else if (source.includes('SALES') || source.includes('app-store-connect')) {
      bySource.SALES++;
    }

    const netAmount = tx.revenue?.netAmount || 0;
    totalNetRevenue += netAmount;
    if (netAmount > 0) positiveRevenue += netAmount;
    if (netAmount < 0) negativeRevenue += Math.abs(netAmount);
  }

  console.log(`\nBy Source:`);
  console.log(`  SALES-like: ${bySource.SALES}`);
  console.log(`  SUBSCRIPTION_EVENT: ${bySource.SUBSCRIPTION_EVENT}`);

  console.log(`\nRevenue Breakdown:`);
  console.log(`  Positive revenue: $${positiveRevenue.toFixed(2)}`);
  console.log(`  Refunds (negative): -$${negativeRevenue.toFixed(2)}`);
  console.log(`  Net total: $${totalNetRevenue.toFixed(2)}`);

  // Show sample of transactions by source
  console.log(`\nSample SALES transactions:`);
  let salesCount = 0;
  for (const tx of transactions) {
    if (salesCount >= 5) break;
    const netAmount = tx.revenue?.netAmount || 0;
    if (netAmount > 0 && tx.metadata?.title && !tx.metadata?.source?.includes('SUBSCRIPTION_EVENT')) {
      console.log(`  ${tx.transactionDate?.toISOString().split('T')[0]} | $${netAmount.toFixed(2)} | ${tx.metadata?.title?.substring(0, 40)}`);
      salesCount++;
    }
  }

  console.log(`\nSample SUBSCRIPTION_EVENT transactions:`);
  let subCount = 0;
  for (const tx of transactions) {
    if (subCount >= 5) break;
    const netAmount = tx.revenue?.netAmount || 0;
    if (netAmount > 0 && tx.metadata?.source?.includes('SUBSCRIPTION_EVENT')) {
      console.log(`  ${tx.transactionDate?.toISOString().split('T')[0]} | $${netAmount.toFixed(2)} | ${tx.metadata?.title?.substring(0, 40)}`);
      subCount++;
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

checkDuplicates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
