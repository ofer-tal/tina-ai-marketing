#!/usr/bin/env node

/**
 * Analyze revenue transactions in detail
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

async function analyze() {
  console.log('Analyzing revenue transactions...\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');

  // Get all transactions with positive revenue
  const transactions = await revenueCollection
    .find({ 'revenue.netAmount': { $gt: 0 } })
    .sort({ transactionDate: 1 })
    .toArray();

  console.log(`Total transactions with positive revenue: ${transactions.length}`);
  console.log(`Total positive revenue: $${transactions.reduce((sum, tx) => sum + (tx.revenue?.netAmount || 0), 0).toFixed(2)}\n`);

  // Group by month
  const byMonth = {};
  for (const tx of transactions) {
    const date = tx.transactionDate;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, revenue: 0, txns: [] };
    byMonth[monthKey].count++;
    byMonth[monthKey].revenue += tx.revenue?.netAmount || 0;
    byMonth[monthKey].txns.push(tx);
  }

  console.log('Revenue by Month:');
  console.log('Month     | Txns  | Revenue');
  console.log('----------|-------|----------');
  for (const [month, data] of Object.entries(byMonth).sort()) {
    console.log(`${month}  | ${data.count.toString().padStart(5)} | $${data.revenue.toFixed(2).padStart(8)}`);
  }

  // Show all transactions
  console.log('\nAll Transactions (Date | Product | Net Amount | Units):');
  console.log('-------------------------------------------------------------');
  for (const tx of transactions) {
    const date = tx.transactionDate.toISOString().split('T')[0];
    const title = (tx.metadata?.title || tx.metadata?.productId || 'Unknown').substring(0, 35);
    const netAmount = tx.revenue?.netAmount || 0;
    const units = tx.metadata?.quantity || tx.metadata?.originalUnits || 1;
    const productId = tx.metadata?.productTypeIdentifier || '';

    console.log(`${date} | ${title.padEnd(35)} | $${netAmount.toFixed(2).padStart(7)} | units:${units} | type:${productId}`);
  }

  // Get refunds
  console.log('\nRefunds:');
  const refunds = await revenueCollection
    .find({ 'revenue.netAmount': { $lt: 0 } })
    .sort({ transactionDate: 1 })
    .toArray();

  if (refunds.length > 0) {
    console.log('Date       | Product | Refund Amount');
    console.log('-----------|---------|--------------');
    for (const tx of refunds) {
      const date = tx.transactionDate.toISOString().split('T')[0];
      const title = (tx.metadata?.title || 'Unknown').substring(0, 30);
      const netAmount = tx.revenue?.netAmount || 0;
      console.log(`${date} | ${title.padEnd(30)} | $${netAmount.toFixed(2)}`);
    }
  } else {
    console.log('No refunds found');
  }

  await mongoose.disconnect();
  process.exit(0);
}

analyze().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
