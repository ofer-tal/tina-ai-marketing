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
  // Check Feb ASC transactions
  const ascFeb = await MarketingRevenue.find({
    transactionDate: { $gte: new Date('2026-02-01'), $lt: new Date('2026-02-02') }
  }).lean();

  console.log('=== FEBRUARY 1 APP STORE TRANSACTIONS (' + ascFeb.length + ') ===');
  let totalRevenue = 0;
  for (const tx of ascFeb) {
    const rev = tx.revenue || {};
    const meta = tx.metadata || {};
    console.log('$' + (rev.netAmount || 0).toFixed(2) + ' | Orig: ' + (rev.originalCurrency || 'N/A') + ' | ' + (rev.originalAmount || 0));
    totalRevenue += rev.netAmount || 0;
  }
  console.log('Total: $' + totalRevenue.toFixed(2));

} finally {
  await databaseService.disconnect();
}
