#!/usr/bin/env node

/**
 * Quick verification script for revenue back-fill data
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

async function verifyData() {
  console.log('Connecting to database...');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');
  const aggregateCollection = mongoose.connection.db.collection('marketing_daily_revenue_aggregates');

  // Get counts
  const revenueCount = await revenueCollection.countDocuments();
  const aggregateCount = await aggregateCollection.countDocuments();
  const ascCount = await revenueCollection.countDocuments({ transactionId: /^asc_/ });

  console.log('\n=== Revenue Data Verification ===');
  console.log(`Total Marketing Revenue records: ${revenueCount}`);
  console.log(`  - Records with asc_ prefix (from backfill): ${ascCount}`);
  console.log(`  - Other records: ${revenueCount - ascCount}`);
  console.log(`Total Daily Revenue Aggregate records: ${aggregateCount}`);

  // Get one sample transaction from backfill (asc_ prefix)
  const sampleTransaction = await revenueCollection.findOne({ transactionId: /^asc_/ });

  // Get recent transactions
  const transactions = await revenueCollection
    .find()
    .sort({ transactionDate: -1 })
    .limit(15)
    .toArray();

  // Print sample transaction if available
  if (sampleTransaction) {
    console.log('\n--- Sample Transaction (raw) ---');
    console.log(JSON.stringify(sampleTransaction, null, 2));
  }

  if (transactions.length > 0) {
    console.log('\n--- Recent Revenue Transactions ---');
    transactions.forEach((r, i) => {
      const date = r.transactionDate ? r.transactionDate.toISOString().split('T')[0] : 'N/A';
      const gross = r.revenue?.grossAmount || 0;
      const net = r.revenue?.netAmount || 0;
      const prodId = r.metadata?.productId || r.product?.productId || 'N/A';
      const isNew = r.customer?.new ? 'New' : 'Returning';
      console.log(`  ${i+1}. ${date} | ${prodId} | ${isNew} | Gross: $${gross.toFixed(2)} | Net: $${net.toFixed(2)}`);
    });

    // Calculate totals
    const totals = await revenueCollection.aggregate([
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$revenue.grossAmount' },
          totalNet: { $sum: '$revenue.netAmount' },
          totalAppleFees: { $sum: '$revenue.appleFeeAmount' },
          transactionCount: { $sum: 1 },
          newCustomers: { $sum: { $cond: ['$customer.new', 1, 0] } }
        }
      }
    ]).toArray();

    if (totals.length > 0) {
      const t = totals[0];
      console.log('\n--- Total Back-filled Revenue ---');
      console.log(`  Total Transactions: ${t.transactionCount}`);
      console.log(`  New Customers: ${t.newCustomers}`);
      console.log(`  Total Gross Revenue: $${t.totalGross.toFixed(2)}`);
      console.log(`  Total Apple Fees: $${t.totalAppleFees.toFixed(2)}`);
      console.log(`  Total Net Revenue: $${t.totalNet.toFixed(2)}`);
    }
  } else {
    console.log('\nNo transactions found in database.');
  }

  // Get date range
  const dateRange = await revenueCollection.aggregate([
    {
      $group: {
        _id: null,
        earliestDate: { $min: '$transactionDate' },
        latestDate: { $max: '$transactionDate' }
      }
    }
  ]).toArray();

  if (dateRange.length > 0 && dateRange[0].earliestDate) {
    console.log('\n--- Date Range Covered ---');
    console.log(`  From: ${dateRange[0].earliestDate.toISOString().split('T')[0]}`);
    console.log(`  To: ${dateRange[0].latestDate.toISOString().split('T')[0]}`);
  }

  await mongoose.disconnect();
  console.log('\nVerification complete.');
  process.exit(0);
}

verifyData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
