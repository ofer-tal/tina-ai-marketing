#!/usr/bin/env node

/**
 * Analyze revenue by currency and country
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
  console.log('Analyzing revenue by currency and country...\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');

  // Get all transactions with positive revenue
  const transactions = await revenueCollection
    .find({ 'revenue.netAmount': { $gt: 0 } })
    .sort({ transactionDate: 1 })
    .toArray();

  console.log(`Total transactions: ${transactions.length}\n`);

  // Group by currency
  const byCurrency = {};
  // Group by country
  const byCountry = {};
  // Group by currency + country
  const byCurrencyCountry = {};

  for (const tx of transactions) {
    const currency = tx.revenue?.currency || 'UNKNOWN';
    const country = tx.metadata?.countryCode || 'UNKNOWN';

    if (!byCurrency[currency]) byCurrency[currency] = { count: 0, revenue: 0 };
    byCurrency[currency].count++;
    byCurrency[currency].revenue += tx.revenue?.netAmount || 0;

    if (!byCountry[country]) byCountry[country] = { count: 0, revenue: 0 };
    byCountry[country].count++;
    byCountry[country].revenue += tx.revenue?.netAmount || 0;

    const key = `${currency}-${country}`;
    if (!byCurrencyCountry[key]) byCurrencyCountry[key] = { count: 0, revenue: 0 };
    byCurrencyCountry[key].count++;
    byCurrencyCountry[key].revenue += tx.revenue?.netAmount || 0;
  }

  console.log('By Currency:');
  console.log('Currency | Count | Revenue');
  console.log('---------|-------|----------');
  for (const [currency, data] of Object.entries(byCurrency).sort((a, b) => b[1].revenue - a[1].revenue)) {
    console.log(`${currency.padEnd(8)} | ${data.count.toString().padStart(5)} | $${data.revenue.toFixed(2).padStart(9)}`);
  }

  console.log('\nBy Country (Top 15):');
  console.log('Country | Count | Revenue');
  console.log('--------|-------|----------');
  let idx = 0;
  for (const [country, data] of Object.entries(byCountry).sort((a, b) => b[1].revenue - a[1].revenue)) {
    if (idx++ >= 15) break;
    console.log(`${country.padEnd(7)} | ${data.count.toString().padStart(5)} | $${data.revenue.toFixed(2).padStart(9)}`);
  }

  console.log('\nBy Currency + Country (showing non-USD):');
  console.log('Currency-Country | Count | Revenue');
  console.log('------------------|-------|----------');
  for (const [key, data] of Object.entries(byCurrencyCountry).sort((a, b) => b[1].revenue - a[1].revenue)) {
    if (key.startsWith('USD-')) continue; // Skip USD for brevity
    if (data.revenue === 0) continue;
    console.log(`${key.padEnd(17)} | ${data.count.toString().padStart(5)} | $${data.revenue.toFixed(2).padStart(9)}`);
  }

  // Show sample transactions for non-USD
  console.log('\nSample non-USD transactions:');
  console.log('Date       | Country | Currency | Net Amount | Title');
  console.log('-----------|---------|----------|------------|-------');
  let sampleCount = 0;
  for (const tx of transactions) {
    if (sampleCount >= 10) break;
    if (tx.revenue?.currency && tx.revenue.currency !== 'USD') {
      const date = tx.transactionDate.toISOString().split('T')[0];
      const country = tx.metadata?.countryCode || '?';
      const currency = tx.revenue?.currency || '?';
      const netAmount = tx.revenue?.netAmount || 0;
      const title = (tx.metadata?.title || '?').substring(0, 25);
      console.log(`${date} | ${country} | ${currency} | $${netAmount.toFixed(2).padStart(8)} | ${title}`);
      sampleCount++;
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

analyze().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
