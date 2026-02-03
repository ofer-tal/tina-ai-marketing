import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const { default: databaseService } = await import('../services/database.js');
const { default: MarketingRevenue } = await import('../models/MarketingRevenue.js');

await databaseService.connect();

try {
  const janStart = new Date('2026-01-01');
  const janEnd = new Date('2026-02-01');

  const janTx = await MarketingRevenue.find({
    transactionDate: { $gte: janStart, $lt: janEnd }
  }).lean();

  console.log('=== DETAILED JANUARY 2026 TRANSACTION ANALYSIS ===\n');

  // Show sample transaction structure
  console.log('--- SAMPLE TRANSACTION STRUCTURE ---');
  if (janTx.length > 0) {
    const sample = janTx[0];
    console.log(JSON.stringify(sample, null, 2));
  }

  console.log('\n=== ANALYZING TRANSACTION FIELDS ===');

  // Check what fields exist for product identification
  const productSources = new Set();
  const txnTypes = new Set();
  const sources = new Set();

  for (const tx of janTx) {
    if (tx.metadata?.productType) productSources.add('productType');
    if (tx.metadata?.productId) productSources.add('productId');
    if (tx.metadata?.productName) productSources.add('productName');
    if (tx.metadata?.sku) productSources.add('sku');
    if (tx.transactionType) txnTypes.add(tx.transactionType);
    if (tx.source) sources.add(tx.source);
  }

  console.log('Product identification fields present:', productSources);
  console.log('Transaction types:', txnTypes);
  console.log('Sources:', sources);

  console.log('\n=== NEW SALES ONLY (excluding refunds, excluding renewals) ===');

  // Filter for only positive new sales (not refunds, not renewals)
  const newSales = janTx.filter(tx => {
    const isRenewal = tx.customer?.new === false || tx.customer?.new === 'false';
    const isPositive = (tx.revenue?.grossAmount || 0) > 0;
    const isNew = tx.customer?.new === true || tx.customer?.new === 'true';
    return isNew && isPositive;
  });

  console.log(`Found ${newSales.length} NEW sales (positive amount)`);

  // Group by transaction amount to identify product tiers
  const byAmount = {};
  for (const tx of newSales) {
    const amt = (tx.revenue?.grossAmount || 0).toFixed(2);
    if (!byAmount[amt]) byAmount[amt] = { count: 0, total: 0, netTotal: 0 };
    byAmount[amt].count++;
    byAmount[amt].total += tx.revenue?.grossAmount || 0;
    byAmount[amt].netTotal += tx.revenue?.netAmount || 0;
  }

  console.log('\n--- NEW SALES BY AMOUNT (helps identify product tiers) ---');
  let totalNewGross = 0;
  let totalNewNet = 0;
  for (const [amt, data] of Object.entries(byAmount).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))) {
    console.log(`$${amt}: ${data.count} txns, gross total: $${data.total.toFixed(2)}, net total: $${data.netTotal.toFixed(2)}`);
    totalNewGross += data.total;
    totalNewNet += data.netTotal;
  }

  console.log(`\nTOTAL NEW SALES (gross): $${totalNewGross.toFixed(2)}`);
  console.log(`TOTAL NEW SALES (net): $${totalNewNet.toFixed(2)}`);

  console.log('\n=== RENEWALS (positive amounts only) ===');
  const renewals = janTx.filter(tx => {
    const isRenewal = tx.customer?.new === false || tx.customer?.new === 'false';
    const isPositive = (tx.revenue?.grossAmount || 0) > 0;
    return isRenewal && isPositive;
  });

  console.log(`Found ${renewals.length} RENEWALS (positive amount)`);

  const byAmountRenewal = {};
  for (const tx of renewals) {
    const amt = (tx.revenue?.grossAmount || 0).toFixed(2);
    if (!byAmountRenewal[amt]) byAmountRenewal[amt] = { count: 0, total: 0, netTotal: 0 };
    byAmountRenewal[amt].count++;
    byAmountRenewal[amt].total += tx.revenue?.grossAmount || 0;
    byAmountRenewal[amt].netTotal += tx.revenue?.netAmount || 0;
  }

  console.log('\n--- RENEWALS BY AMOUNT ---');
  let totalRenewalGross = 0;
  for (const [amt, data] of Object.entries(byAmountRenewal).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))) {
    console.log(`$${amt}: ${data.count} txns, gross total: $${data.total.toFixed(2)}, net total: $${data.netTotal.toFixed(2)}`);
    totalRenewalGross += data.total;
  }
  console.log(`\nTOTAL RENEWALS (gross): $${totalRenewalGross.toFixed(2)}`);

  console.log('\n=== REFUNDS (negative amounts) ===');
  const refunds = janTx.filter(tx => (tx.revenue?.grossAmount || 0) < 0);
  console.log(`Found ${refunds.length} REFUNDS`);

  let totalRefund = 0;
  const byAmountRefund = {};
  for (const tx of refunds) {
    const amt = (tx.revenue?.grossAmount || 0).toFixed(2);
    if (!byAmountRefund[amt]) byAmountRefund[amt] = { count: 0, total: 0 };
    byAmountRefund[amt].count++;
    byAmountRefund[amt].total += tx.revenue?.grossAmount || 0;
    totalRefund += tx.revenue?.grossAmount || 0;
  }

  console.log('\n--- REFUNDS BY AMOUNT ---');
  for (const [amt, data] of Object.entries(byAmountRefund)) {
    console.log(`$${amt}: ${data.count} txns, total: $${data.total.toFixed(2)}`);
  }
  console.log(`\nTOTAL REFUNDS: $${totalRefund.toFixed(2)}`);

  console.log('\n=== SUMMARY ===');
  console.log(`NEW SALES (gross): $${totalNewGross.toFixed(2)}`);
  console.log(`RENEWALS (gross): $${totalRenewalGross.toFixed(2)}`);
  console.log(`REFUNDS: $${totalRefund.toFixed(2)}`);
  console.log(`NET AFTER REFUNDS: $${(totalNewGross + totalRefund).toFixed(2)}`);

  console.log('\n=== APP STORE CONNECT EXPECTED: $381 ===');
  console.log(`Expected breakdown: $240 Annual + $124 Monthly + $16.92 Weekly`);
  console.log(`Our NEW SALES total: $${totalNewGross.toFixed(2)}`);
  console.log(`Difference: $${(totalNewGross - 381).toFixed(2)}`);

} finally {
  await databaseService.disconnect();
}
