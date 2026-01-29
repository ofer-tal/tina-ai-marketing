#!/usr/bin/env node

/**
 * Show revenue for specific months
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

async function showRevenue() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');

  // Helper to get month stats
  async function getMonthStats(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const txns = await revenueCollection.find({
      transactionDate: { $gte: start, $lt: end }
    }).toArray();

    const positive = txns.filter(t => (t.revenue?.netAmount || 0) > 0);
    const negative = txns.filter(t => (t.revenue?.netAmount || 0) < 0);

    const totalPositive = positive.reduce((sum, t) => sum + (t.revenue?.netAmount || 0), 0);
        const totalNegative = negative.reduce((sum, t) => sum + (t.revenue?.netAmount || 0), 0);

    return {
      transactionCount: txns.length,
      positiveCount: positive.length,
      negativeCount: negative.length,
      totalPositive,
      totalNegative,
      net: totalPositive + totalNegative,
      transactions: txns
    };
  }

  console.log('Revenue from Database:\n');
  console.log('Month      | Txns | Positive  | Refunds   | Net       | Per Day (avg)');
  console.log('-----------|------|-----------|-----------|-----------|---------------');

  const months = [
    [2025, 9, 'Sep 2025'],
    [2025, 10, 'Oct 2025'],
    [2025, 11, 'Nov 2025'],
    [2025, 12, 'Dec 2025'],
    [2026, 1, 'Jan 2026'],
  ];

  for (const [year, month, label] of months) {
    const stats = await getMonthStats(year, month);
    if (stats.transactionCount > 0) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const perDay = stats.net / daysInMonth;
      console.log(`${label} | ${stats.transactionCount.toString().padStart(4)} | $${stats.totalPositive.toFixed(2).padStart(8)} | $${Math.abs(stats.totalNegative).toFixed(2).padStart(8)} | $${stats.net.toFixed(2).padStart(8)} | $${perDay.toFixed(2)}`);
    }
  }

  console.log('\nNovember 2025 Detail (first 10 transactions):');
  const novStats = await getMonthStats(2025, 11);
  console.log('Date       | Country | Currency | Net Amount | Title');
  console.log('-----------|---------|----------|------------|-------');
  for (const tx of novStats.transactions.slice(0, 10)) {
    const date = tx.transactionDate.toISOString().split('T')[0];
    const country = tx.metadata?.countryCode || '?';
    const currency = tx.revenue?.currency || '?';
    const netAmount = tx.revenue?.netAmount || 0;
    const title = (tx.metadata?.title || tx.metadata?.productId || '?').substring(0, 30);
    console.log(`${date} | ${country} | ${currency} | $${netAmount.toFixed(2).padStart(8)} | ${title}`);
  }

  console.log('\nDecember 2025 Detail (first 10 transactions):');
  const decStats = await getMonthStats(2025, 12);
  console.log('Date       | Country | Currency | Net Amount | Title');
  console.log('-----------|---------|----------|------------|-------');
  for (const tx of decStats.transactions.slice(0, 10)) {
    const date = tx.transactionDate.toISOString().split('T')[0];
    const country = tx.metadata?.countryCode || '?';
    const currency = tx.revenue?.currency || '?';
    const netAmount = tx.revenue?.netAmount || 0;
    const title = (tx.metadata?.title || tx.metadata?.productId || '?').substring(0, 30);
    console.log(`${date} | ${country} | ${currency} | $${netAmount.toFixed(2).padStart(8)} | ${title}`);
  }

  console.log('\nWhat to compare in App Store Connect:');
  console.log('- Go to Sales and Trends');
  console.log('- Select "Sales" (not "Proceeds")');
  console.log('- Filter by the app (Blush)');
  console.log('- View by Month for Nov 2025 and Dec 2025');
  console.log('- Look at "Proceeds" or "Estimated" (not "Sales" or "Units")');

  await mongoose.disconnect();
  process.exit(0);
}

showRevenue().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
