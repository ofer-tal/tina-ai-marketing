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

  const grossTotal = await MarketingRevenue.aggregate([
    { $match: { transactionDate: { $gte: janStart, $lt: janEnd } } },
    { $group: { _id: null, gross: { $sum: '$revenue.grossAmount' }, net: { $sum: '$revenue.netAmount' } } }
  ]);

  console.log('JANUARY 2026 TOTALS:');
  console.log('Gross Revenue: $' + grossTotal[0].gross.toFixed(2));
  console.log('Net Revenue: $' + grossTotal[0].net.toFixed(2));
  console.log('Apple Fees: $' + (grossTotal[0].gross - grossTotal[0].net).toFixed(2));

  // Check for transactions with non-USD original currency
  const nonUSD = await MarketingRevenue.find({
    transactionDate: { $gte: janStart, $lt: janEnd },
    'metadata.originalCurrency': { $exists: true, $ne: 'USD' }
  }).limit(10);

  console.log('\nTransactions with NON-USD original currency:');
  for (const tx of nonUSD) {
    console.log(tx.transactionDate.toISOString().split('T')[0] + ': ' + (tx.metadata.originalCurrency || 'N/A') + ' ' + (tx.revenue.originalAmount || 0));
  }

} finally {
  await databaseService.disconnect();
}
