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

  console.log('JANUARY 2026: ' + janTx.length + ' transactions');

  // Group by date
  const byDate = {};
  for (const tx of janTx) {
    const date = tx.transactionDate.toISOString().split('T')[0];
    const rev = tx.revenue || {};
    if (!byDate[date]) byDate[date] = { count: 0, revenue: 0 };
    byDate[date].count++;
    byDate[date].revenue += rev.netAmount || 0;
  }

  const dates = Object.keys(byDate).sort();
  let total = 0;
  for (const date of dates) {
    console.log(date + ': ' + byDate[date].count + ' txns, $' + byDate[date].revenue.toFixed(2));
    total += byDate[date].revenue;
  }
  console.log('TOTAL: $' + total.toFixed(2));

} finally {
  await databaseService.disconnect();
}
