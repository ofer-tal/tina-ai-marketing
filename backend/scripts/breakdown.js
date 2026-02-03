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

  // Get all January transactions with details
  const janTx = await MarketingRevenue.find({
    transactionDate: { $gte: janStart, $lt: janEnd }
  }).lean();

  console.log('=== ALL JANUARY 2026 TRANSACTIONS ===\n');

  // Group by product type
  const byProductType = {};
  const byIsNew = {};
  const byProductId = {};

  for (const tx of janTx) {
    const rev = tx.revenue || {};
    const meta = tx.metadata || {};
    const prod = meta.productType || meta.productId || 'unknown';
    const isNew = tx.customer?.new;

    // By product type
    if (!byProductType[prod]) byProductType[prod] = { count: 0, gross: 0, net: 0 };
    byProductType[prod].count++;
    byProductType[prod].gross += rev.grossAmount || 0;
    byProductType[prod].net += rev.netAmount || 0;

    // By new vs renewal
    const isNewStr = isNew ? 'NEW' : 'RENEWAL';
    if (!byIsNew[isNewStr]) byIsNew[isNewStr] = { count: 0, gross: 0 };
    byIsNew[isNewStr].count++;
    byIsNew[isNewStr].gross += rev.grossAmount || 0;
    byIsNew[isNewStr].net += rev.netAmount || 0;
  }

  console.log('--- BY PRODUCT TYPE ---');
  for (const [prod, data] of Object.entries(byProductType)) {
    console.log(`${prod}: ${data.count} txns, gross: $${data.gross.toFixed(2)}, net: $${data.net.toFixed(2)}`);
  }

  console.log('\n--- NEW VS RENEWAL ---');
  for (const [type, data] of Object.entries(byIsNew)) {
    console.log(`${type}: ${data.count} txns, gross: $${data.gross.toFixed(2)}, net: $${data.net.toFixed(2)}`);
  }

  // Show specific transactions
  console.log('\n--- INDIVIDUAL TRANSACTIONS (sorted by amount) ---');
  janTx.sort((a, b) => (b.revenue?.grossAmount || 0) - (a.revenue?.grossAmount || 0));

  for (const tx of janTx.slice(0, 20)) {
    const rev = tx.revenue || {};
    const meta = tx.metadata || {};
    console.log(`$${(rev.grossAmount || 0).toFixed(2)} | ${meta.productType || 'N/A'} | ${meta.productId || 'N/A'} | ${tx.customer?.new ? 'NEW' : 'RENEWAL'}`);
  }

} finally {
  await databaseService.disconnect();
}
