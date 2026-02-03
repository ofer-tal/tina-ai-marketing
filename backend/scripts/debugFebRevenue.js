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
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Get ALL February transactions with full details
  const febTx = await MarketingRevenue.find({
    transactionDate: { $gte: startOfMonth }
  }).sort({ transactionDate: -1 });

  console.log(`=== FEBRUARY TRANSACTIONS (${febTx.length} total) ===`);

  let totalUsdRevenue = 0;
  let totalOriginalRevenue = 0;

  for (const tx of febTx) {
    const rev = tx.revenue || {};
    const meta = tx.metadata || {};

    console.log(`\nDate: ${tx.transactionDate?.toISOString().split('T')[0]}`);
    console.log(`  TransactionId: ${tx.transactionId?.substring(0, 50)}...`);
    console.log(`  Source: ${meta.source || 'unknown'}`);
    console.log(`  Net Amount (USD): $${rev.netAmount || 'MISSING'}`);
    console.log(`  Original Currency: ${rev.originalCurrency || rev.currency || 'N/A'}`);
    console.log(`  Original Amount: ${rev.originalAmount || 'N/A'}`);
    console.log(`  Currency of Proceeds: ${meta.currencyOfProceeds || 'N/A'}`);

    if (rev.netAmount) totalUsdRevenue += rev.netAmount;
    if (rev.originalAmount) totalOriginalRevenue += rev.originalAmount;
  }

  console.log(`\n=== TOTALS ===`);
  console.log(`Sum of USD Net Amounts: $${totalUsdRevenue.toFixed(2)}`);
  console.log(`Sum of Original Amounts: ${totalOriginalRevenue.toFixed(2)}`);

  // Check for transactions without currency conversion
  const noConversion = await MarketingRevenue.countDocuments({
    transactionDate: { $gte: startOfMonth },
    'revenue.originalCurrency': { $exists: false }
  });

  console.log(`\nTransactions WITHOUT currency conversion: ${noConversion}`);

} finally {
  await databaseService.disconnect();
}
