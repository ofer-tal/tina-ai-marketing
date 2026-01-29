#!/usr/bin/env node

/**
 * Deep dive into January 2026 transactions
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

async function analyzeJanuary() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';
  await mongoose.connect(uri);

  const revenueCollection = mongoose.connection.db.collection('marketing_revenues');

  // Get all January 2026 transactions
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 1, 1);

  const txns = await revenueCollection.find({
    transactionDate: { $gte: start, $lt: end }
  }).sort({ 'revenue.netAmount': -1 }).toArray();

  console.log('January 2026 - All Transactions (sorted by amount):\n');
  console.log('Date       | Country | Currency | Net Amount | Units | Product Type | Title');
  console.log('-----------|---------|----------|------------|-------|--------------|-------');

  let totalNet = 0;
  let totalPositive = 0;
  let totalNegative = 0;

  for (const tx of txns) {
    const date = tx.transactionDate.toISOString().split('T')[0];
    const country = tx.metadata?.countryCode || '?';
    const currency = tx.revenue?.currency || '?';
    const netAmount = tx.revenue?.netAmount || 0;
    const grossAmount = tx.revenue?.grossAmount || 0;
    const units = tx.metadata?.quantity || tx.metadata?.originalUnits || 1;
    const productType = tx.metadata?.productTypeIdentifier || '?';
    const title = (tx.metadata?.title || '?').substring(0, 25);

    totalNet += netAmount;
    if (netAmount > 0) totalPositive += netAmount;
    if (netAmount < 0) totalNegative += netAmount;

    const marker = netAmount < 0 ? 'REFUND' : '       ';
    console.log(`${date} | ${country} | ${currency} | $${netAmount.toFixed(2).padStart(8)} | ${units.toString().padStart(5)} | ${productType.padEnd(12)} | ${title} ${marker}`);
  }

  console.log('\nSummary:');
  console.log(`  Total Positive: $${totalPositive.toFixed(2)}`);
  console.log(`  Total Refunds: $${Math.abs(totalNegative).toFixed(2)}`);
  console.log(`  Net Total: $${totalNet.toFixed(2)}`);
  console.log(`  Expected (from ASC): ~$394`);
  console.log(`  Difference: ${(totalNet - 394).toFixed(2)} (${((totalNet / 394 - 1) * 100).toFixed(0)}% higher)`);

  console.log('\nBy Currency:');
  const byCurrency = {};
  for (const tx of txns) {
    const currency = tx.revenue?.currency || 'UNKNOWN';
    if (!byCurrency[currency]) byCurrency[currency] = { count: 0, revenue: 0 };
    byCurrency[currency].count++;
    byCurrency[currency].revenue += tx.revenue?.netAmount || 0;
  }
  for (const [currency, data] of Object.entries(byCurrency).sort((a, b) => b[1].revenue - a[1].revenue)) {
    console.log(`  ${currency}: ${data.count} txns, $${data.revenue.toFixed(2)}`);
  }

  console.log('\nBy Country:');
  const byCountry = {};
  for (const tx of txns) {
    const country = tx.metadata?.countryCode || 'UNKNOWN';
    if (!byCountry[country]) byCountry[country] = { count: 0, revenue: 0 };
    byCountry[country].count++;
    byCountry[country].revenue += tx.revenue?.netAmount || 0;
  }
  for (const [country, data] of Object.entries(byCountry).sort((a, b) => b[1].revenue - a[1].revenue)) {
    console.log(`  ${country}: ${data.count} txns, $${data.revenue.toFixed(2)}`);
  }

  console.log('\nBy Product Type:');
  const byProductType = {};
  for (const tx of txns) {
    const pt = tx.metadata?.productTypeIdentifier || 'UNKNOWN';
    if (!byProductType[pt]) byProductType[pt] = { count: 0, revenue: 0 };
    byProductType[pt].count++;
    byProductType[pt].revenue += tx.revenue?.netAmount || 0;
  }
  for (const [pt, data] of Object.entries(byProductType).sort((a, b) => b[1].revenue - a[1].revenue)) {
    console.log(`  ${pt}: ${data.count} txns, $${data.revenue.toFixed(2)}`);
  }

  console.log('\nHigh value transactions (> $100):');
  const highValue = txns.filter(t => t.revenue?.netAmount > 100);
  if (highValue.length > 0) {
    for (const tx of highValue) {
      const date = tx.transactionDate.toISOString().split('T')[0];
      const netAmount = tx.revenue?.netAmount || 0;
      const grossAmount = tx.revenue?.grossAmount || 0;
      const units = tx.metadata?.quantity || tx.metadata?.originalUnits || 1;
      const title = tx.metadata?.title || '?';
      console.log(`  ${date}: $${netAmount.toFixed(2)} (gross: $${grossAmount.toFixed(2)}, units: ${units}) - ${title}`);
    }
  } else {
    console.log('  None found');
  }

  await mongoose.disconnect();
  process.exit(0);
}

analyzeJanuary().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
