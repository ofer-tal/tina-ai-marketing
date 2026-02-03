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
  // Get transactions from Jan 20 onwards, grouped by date and source
  const bySourceAndDate = await MarketingRevenue.aggregate([
    { $match: { transactionDate: { $gte: new Date('2026-01-20') } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
          source: { $ifNull: ['$metadata.source', 'unknown'] }
        },
        count: { $sum: 1 },
        revenue: { $sum: '$revenue.netAmount' }
      }
    },
    { $sort: { '_id.date': -1, '_id.source': 1 } }
  ]);

  console.log('=== TRANSACTIONS BY DATE AND SOURCE ===');
  let lastDate = '';
  for (const item of bySourceAndDate) {
    if (item._id.date !== lastDate) {
      console.log(`\n${item._id.date}:`);
      lastDate = item._id.date;
    }
    console.log(`  ${item._id.source}: ${item.count} txns, $${item.revenue.toFixed(2)}`);
  }

  // Count real vs mock
  const realCount = await MarketingRevenue.countDocuments({
    transactionDate: { $gte: new Date('2026-01-20') },
    'metadata.source': 'app-store-connect'
  });
  const mockCount = await MarketingRevenue.countDocuments({
    transactionDate: { $gte: new Date('2026-01-20') },
    transactionId: /^trans_/
  });

  console.log(`\n=== TOTALS SINCE JAN 20 ===`);
  console.log(`Real App Store transactions: ${realCount}`);
  console.log(`Mock transactions (trans_*): ${mockCount}`);

} finally {
  await databaseService.disconnect();
}
