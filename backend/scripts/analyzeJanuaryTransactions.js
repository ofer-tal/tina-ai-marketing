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

  console.log('=== JANUARY 2026 TRANSACTIONS - DETAILED ANALYSIS ===\n');

  // Group by SKU
  const bySku = {};
  const byTitle = {};

  for (const tx of janTx) {
    const sku = tx.metadata?.productId || tx.metadata?.sku || 'unknown';
    const title = tx.metadata?.title || 'Unknown';
    const isNew = tx.customer?.new === true;
    const gross = tx.revenue?.grossAmount || 0;
    const net = tx.revenue?.netAmount || 0;

    if (!bySku[sku]) {
      bySku[sku] = { count: 0, newCount: 0, newGross: 0, renewalCount: 0, renewalGross: 0, titles: new Set() };
    }
    bySku[sku].count++;
    bySku[sku].titles.add(title);
    if (isNew) {
      bySku[sku].newCount++;
      bySku[sku].newGross += gross;
    } else {
      bySku[sku].renewalCount++;
      bySku[sku].renewalGross += gross;
    }

    if (!byTitle[title]) {
      byTitle[title] = { count: 0, newCount: 0, newGross: 0, renewalCount: 0, renewalGross: 0, skus: new Set() };
    }
    byTitle[title].count++;
    byTitle[title].skus.add(sku);
    if (isNew) {
      byTitle[title].newCount++;
      byTitle[title].newGross += gross;
    } else {
      byTitle[title].renewalCount++;
      byTitle[title].renewalGross += gross;
    }
  }

  console.log('--- BY SKU (Product ID) ---');
  for (const [sku, data] of Object.entries(bySku).sort((a, b) => b[1].newGross - a[1].newGross)) {
    const titles = Array.from(data.titles).join(', ');
    console.log(`SKU: ${sku}`);
    console.log(`  Title: ${titles}`);
    console.log(`  Total: ${data.count} txns`);
    console.log(`  NEW: ${data.newCount} txns = $${data.newGross.toFixed(2)}`);
    console.log(`  RENEWAL: ${data.renewalCount} txns = $${data.renewalGross.toFixed(2)}`);
    console.log();
  }

  console.log('\n--- BY TITLE (Product Name) ---');
  for (const [title, data] of Object.entries(byTitle).sort((a, b) => b[1].newGross - a[1].newGross)) {
    const skus = Array.from(data.skus).join(', ');
    console.log(`Title: ${title}`);
    console.log(`  SKU: ${skus}`);
    console.log(`  Total: ${data.count} txns`);
    console.log(`  NEW: ${data.newCount} txns = $${data.newGross.toFixed(2)}`);
    console.log(`  RENEWAL: ${data.renewalCount} txns = $${data.renewalGross.toFixed(2)}`);
    console.log();
  }

  console.log('\n--- ALL INDIVIDUAL TRANSACTIONS (NEW sales only, sorted by amount) ---');
  const newSales = janTx.filter(tx => (tx.revenue?.grossAmount || 0) > 0 && tx.customer?.new === true);
  newSales.sort((a, b) => (b.revenue?.grossAmount || 0) - (a.revenue?.grossAmount || 0));

  for (const tx of newSales) {
    const sku = tx.metadata?.productId || tx.metadata?.sku || 'unknown';
    const title = tx.metadata?.title || 'Unknown';
    const gross = tx.revenue?.grossAmount || 0;
    const net = tx.revenue?.netAmount || 0;
    const currency = tx.revenue?.currency || 'USD';
    const origCurrency = tx.metadata?.originalCurrency || currency;
    const origAmount = tx.metadata?.originalGrossAmount || gross;
    const subType = tx.customer?.subscriptionType || 'unknown';
    const date = tx.transactionDate.toISOString().split('T')[0];

    console.log(`$${gross.toFixed(2)} | ${sku} | ${title} | ${subType} | ${date} | ${origCurrency} ${origAmount.toFixed(2)}`);
  }

  console.log(`\nTOTAL NEW SALES: ${newSales.length} txns`);
  const totalNewGross = newSales.reduce((sum, tx) => sum + (tx.revenue?.grossAmount || 0), 0);
  console.log(`TOTAL NEW GROSS: $${totalNewGross.toFixed(2)}`);

  console.log('\n=== APP STORE CONNECT EXPECTED: $381 ===');
  console.log('Expected breakdown: $240 Annual + $124 Monthly + $16.92 Weekly');

} finally {
  await databaseService.disconnect();
}
