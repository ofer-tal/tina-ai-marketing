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
  // Get ALL January 2026 transactions
  const janStart = new Date('2026-01-01');
  const janEnd = new Date('2026-02-01');

  const janTx = await MarketingRevenue.find({
    transactionDate: { $gte: janStart, $lt: janEnd }
  }).lean();

  console.log('=== ALL JANUARY 2026 TRANSACTIONS (' + janTx.length + ') ===\n');

  // Group by date
  const byDate = {};
  let totalRevenue = 0;
  let totalRefunds = 0;

  for (const tx of janTx) {
    const date = tx.transactionDate.toISOString().split('T')[0];
    const rev = tx.revenue || {};
    const meta = tx.metadata || {};
    const netAmount = rev.netAmount || 0;

    if (!byDate[date]) {
      byDate[date] = { count: 0, revenue: 0, refunds: 0, sources: {} };
    }

    byDate[date].count++;
    byDate[date].revenue += netAmount;
    byDate[date].sources[meta.source || 'unknown'] = (byDate[date].sources[meta.source || 'unknown'] || 0) + 1;

    if (netAmount < 0) totalRefunds += Math.abs(netAmount);
    totalRevenue += netAmount;
  }

  // Sort by date
  const dates = Object.keys(byDate).sort();
  for (const date of dates) {
    const d = byDate[date];
    console.log(date + ': ' + d.count + ' txns, $' + d.revenue.toFixed(2) + ' (' + JSON.stringify(d.sources) + ')');
  }

  console.log('\n=== JANUARY TOTALS ===');
  console.log('Total Revenue (including refunds): $' + totalRevenue.toFixed(2));
  console.log('Refunds: $' + totalRefunds.toFixed(2));
  console.log('Net Revenue (after refunds): $' + (totalRevenue + totalRefunds).toFixed(2));
  console.log('Total Transactions: ' + janTx.length);

  // Check which dates have NO transactions
  console.log('\n=== DATES WITH NO TRANSACTIONS ===');
  for (let i = 1; i <= 31; i++) {
    const date = `2026-01-${String(i).padStart(2, '0')}`;
    if (!byDate[date]) {
      console.log(date);
    }
  }

  // Check for transactions without proper revenue
  const missingRevenue = await MarketingRevenue.countDocuments({
    transactionDate: { $gte: janStart, $lt: janEnd },
    'revenue.netAmount': { $exists: false }
  });
  console.log('\nTransactions without netAmount: ' + missingRevenue);

} finally {
  await databaseService.disconnect();
}
