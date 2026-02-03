#!/usr/bin/env node

/**
 * Debug script to show raw Subscription column values
 * from the SALES report TSV data
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const { default: appStoreConnectService } = await import('../services/appStoreConnectService.js');

try {
  // Fetch SALES report for a specific day
  const reportData = await appStoreConnectService.fetchSalesReports({
    frequency: 'DAILY',
    reportType: 'SALES',
    reportSubType: 'SUMMARY',
    reportDate: '2026-01-07'
  });

  console.log('=== RAW SALES REPORT DATA FOR 2026-01-07 ===\n');

  const transactions = reportData.transactions || [];
  console.log(`Total transactions: ${transactions.length}\n`);

  // Group by Subscription column value
  const bySubscriptionValue = {};

  for (const tx of transactions) {
    const subValue = tx.metadata?.subscriptionStatus || 'EMPTY';
    const sku = tx.metadata?.productId || 'unknown';
    const title = tx.metadata?.title || 'Unknown';
    const gross = tx.revenue?.grossAmount || 0;
    const isNew = tx.customer?.new;

    if (!bySubscriptionValue[subValue]) {
      bySubscriptionValue[subValue] = [];
    }
    bySubscriptionValue[subValue].push({ sku, title, gross, isNew });
  }

  console.log('--- BY SUBSCRIPTION COLUMN VALUE ---');
  for (const [subValue, txns] of Object.entries(bySubscriptionValue)) {
    console.log(`\nSubscription = "${subValue}":`);
    for (const tx of txns) {
      const newFlag = tx.isNew ? 'NEW' : 'RENEWAL';
      console.log(`  $${tx.gross.toFixed(2)} | ${tx.sku} | ${newFlag}`);
    }
  }

  // Now fetch annual subscription transactions
  console.log('\n=== ANNUAL SUBSCRIPTION TRANSACTIONS ===');

  // Check a different day
  const reportData2 = await appStoreConnectService.fetchSalesReports({
    frequency: 'DAILY',
    reportType: 'SALES',
    reportSubType: 'SUMMARY',
    reportDate: '2026-01-01'
  });

  const annualTxns = (reportData2.transactions || []).filter(tx =>
    tx.metadata?.productId?.includes('annualTrial') ||
    tx.customer?.subscriptionType === 'annual'
  );

  console.log(`\nFound ${annualTxns.length} annual transactions on 2026-01-01:`);
  for (const tx of annualTxns) {
    console.log(`  SKU: ${tx.metadata?.productId}`);
    console.log(`  Title: ${tx.metadata?.title}`);
    console.log(`  Subscription column: "${tx.metadata?.subscriptionStatus}"`);
    console.log(`  Period: "${tx.metadata?.period || 'N/A'}"`);
    console.log(`  Gross: $${tx.revenue?.grossAmount || 0}`);
    console.log(`  customer.new: ${tx.customer?.new}`);
    console.log();
  }

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
