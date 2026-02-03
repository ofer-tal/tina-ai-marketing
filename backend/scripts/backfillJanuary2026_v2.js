#!/usr/bin/env node

/**
 * January 2026 Revenue Re-fetch Script - V2
 *
 * This version fetches BOTH SALES and SUBSCRIPTION_EVENT reports
 * to capture all transactions including trial conversions.
 *
 * Run: node backend/scripts/backfillJanuary2026_v2.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

// Dynamic imports after env is loaded
const { default: appStoreConnectService } = await import('../services/appStoreConnectService.js');
const { default: databaseService } = await import('../services/database.js');
const { default: MarketingRevenue } = await import('../models/MarketingRevenue.js');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`  ✓ ${message}`, 'green');
}

function error(message) {
  log(`  ✗ ${message}`, 'red');
}

function info(message) {
  log(`  → ${message}`, 'cyan');
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

/**
 * Main re-fetch function for January 2026
 */
async function runJanuaryBackfill() {
  log('January 2026 Revenue Re-fetch Script V2', 'bright');
  log('Fetching BOTH SALES and SUBSCRIPTION_EVENT reports', 'cyan');

  try {
    section('Step 1: Connecting to Database');
    await databaseService.connect();
    success('Connected to database');

    section('Step 2: Verifying App Store Connect Configuration');
    if (!appStoreConnectService.isConfigured()) {
      error('App Store Connect service is not configured');
      await databaseService.disconnect();
      process.exit(1);
    }
    success('App Store Connect service is configured');

    // January 2026 date range
    section('Step 3: January 2026 Date Range');
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-02-01');

    log(`Start Date: 2026-01-01`, 'cyan');
    log(`End Date: 2026-02-01`, 'cyan');

    // Delete existing January data for clean re-import
    section('Step 4: Deleting Existing January Data');
    const deleteResult = await MarketingRevenue.deleteMany({
      transactionDate: {
        $gte: startDate,
        $lt: endDate
      }
    });
    success(`Deleted ${deleteResult.deletedCount} existing transactions`);

    // Fetch and store data day by day
    section('Step 5: Fetching SALES + SUBSCRIPTION_EVENT Reports');

    let totalStored = 0;
    let failedDays = [];
    let totalPaidRevenue = 0;
    const salesReportCounts = {};
    const subEventCounts = {};

    // Process each day in January 2026
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfMonth = currentDate.getDate();

      info(`Processing ${dateStr} (Day ${dayOfMonth} of 31)`);

      try {
        // Fetch SALES report
        let salesTxns = [];
        try {
          const salesReport = await appStoreConnectService.fetchSalesReports({
            frequency: 'DAILY',
            reportType: 'SALES',
            reportSubType: 'SUMMARY',
            reportDate: dateStr
          });
          salesTxns = salesReport.transactions || [];
          salesReportCounts[dateStr] = salesTxns.length;
          if (salesTxns.length > 0) {
            log(`  SALES: ${salesTxns.length} txns`, 'cyan');
          }
        } catch (err) {
          error(`SALES report failed: ${err.message}`);
        }

        // Fetch SUBSCRIPTION_EVENT report
        let subEventTxns = [];
        try {
          const subReport = await appStoreConnectService.fetchSubscriptionEvents({
            frequency: 'DAILY',
            reportDate: dateStr
          });
          subEventTxns = subReport.transactions || [];
          subEventCounts[dateStr] = subEventTxns.length;
          if (subEventTxns.length > 0) {
            log(`  SUBSCRIPTION_EVENT: ${subEventTxns.length} txns`, 'magenta');
          }
        } catch (err) {
          error(`SUBSCRIPTION_EVENT report failed: ${err.message}`);
        }

        // Combine transactions
        const allTransactions = [...salesTxns, ...subEventTxns];

        // Deduplicate by transactionId
        const seenIds = new Set();
        const uniqueTransactions = [];
        for (const tx of allTransactions) {
          if (!seenIds.has(tx.transactionId)) {
            seenIds.add(tx.transactionId);
            uniqueTransactions.push(tx);
          }
        }

        const dedupCount = allTransactions.length - uniqueTransactions.length;
        if (dedupCount > 0) {
          log(`  Deduplicated ${dedupCount} duplicate transaction(s)`, 'yellow');
        }

        // Store transactions
        for (const transaction of uniqueTransactions) {
          try {
            const result = await MarketingRevenue.findOneAndUpdate(
              { transactionId: transaction.transactionId },
              transaction,
              { upsert: true, new: true, overwrite: true }
            );
            totalStored++;

            if (transaction.revenue && transaction.revenue.netAmount > 0) {
              totalPaidRevenue += transaction.revenue.netAmount;
            }
          } catch (err) {
            error(`Failed to store transaction ${transaction.transactionId}: ${err.message}`);
          }
        }

        if (uniqueTransactions.length > 0) {
          const dayRevenue = uniqueTransactions.reduce((sum, tx) =>
            sum + (tx.revenue?.netAmount > 0 ? tx.revenue.netAmount : 0), 0);
          success(`${dateStr}: ${uniqueTransactions.length} unique txns, $${dayRevenue.toFixed(2)} revenue`);
        } else {
          log(`${dateStr}: No transactions found`, 'yellow');
        }

      } catch (err) {
        error(`Failed to process ${dateStr}: ${err.message}`);
        failedDays.push({ date: dateStr, error: err.message });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    section('Re-fetch Summary');
    log(`Total Transactions Stored: ${totalStored}`, 'cyan');
    log(`Total Paid Revenue: $${totalPaidRevenue.toFixed(2)}`, 'green');

    log(`\n--- SALES Report Counts ---`, 'cyan');
    let totalSales = 0;
    for (const [date, count] of Object.entries(salesReportCounts)) {
      log(`  ${date}: ${count} txns`, 'cyan');
      totalSales += count;
    }
    log(`  SALES Total: ${totalSales} txns`, 'cyan');

    log(`\n--- SUBSCRIPTION_EVENT Report Counts ---`, 'magenta');
    let totalSubs = 0;
    for (const [date, count] of Object.entries(subEventCounts)) {
      log(`  ${date}: ${count} txns`, 'magenta');
      totalSubs += count;
    }
    log(`  SUBSCRIPTION_EVENT Total: ${totalSubs} txns`, 'magenta');

    if (failedDays.length > 0) {
      log(`Failed Days: ${failedDays.length}`, 'yellow');
      failedDays.forEach(day => {
        log(`  - ${day.date}: ${day.error}`, 'yellow');
      });
    }

    // Verification
    section('Step 6: Verification - New vs Renewal Breakdown');

    const janTx = await MarketingRevenue.find({
      transactionDate: { $gte: startDate, $lt: endDate }
    }).lean();

    let newSalesCount = 0;
    let newSalesGross = 0;
    let renewalCount = 0;
    let renewalGross = 0;
    let refundCount = 0;
    let refundTotal = 0;

    const byProductType = {};

    for (const tx of janTx) {
      const gross = tx.revenue?.grossAmount || 0;
      const isNew = tx.customer?.new === true;
      const productType = tx.metadata?.productType || 'unknown';
      const subscriptionType = tx.customer?.subscriptionType || 'unknown';

      const typeKey = `${productType}/${subscriptionType}`;
      if (!byProductType[typeKey]) byProductType[typeKey] = { count: 0, gross: 0 };
      byProductType[typeKey].count++;
      byProductType[typeKey].gross += gross;

      if (gross < 0) {
        refundCount++;
        refundTotal += gross;
      } else if (isNew) {
        newSalesCount++;
        newSalesGross += gross;
      } else {
        renewalCount++;
        renewalGross += gross;
      }
    }

    log(`\nTotal Transactions: ${janTx.length}`, 'cyan');
    log(`NEW Sales (gross): ${newSalesCount} txns, $${newSalesGross.toFixed(2)}`, 'green');
    log(`Renewals (gross): ${renewalCount} txns, $${renewalGross.toFixed(2)}`, 'yellow');
    log(`Refunds: ${refundCount} txns, $${refundTotal.toFixed(2)}`, 'red');

    log(`\nExpected (App Store Connect): $381.00`, 'cyan');
    log(`Our NEW Sales: $${newSalesGross.toFixed(2)}`, newSalesGross > 350 ? 'green' : 'yellow');
    log(`Difference: $${(newSalesGross - 381).toFixed(2)}`, Math.abs(newSalesGross - 381) < 50 ? 'green' : 'yellow');

    console.log('\n--- BY PRODUCT TYPE ---');
    for (const [type, data] of Object.entries(byProductType).sort((a, b) => b[1].gross - a[1].gross)) {
      console.log(`${type}: ${data.count} txns, $${data.gross.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (err) {
    error(`Re-fetch failed: ${err.message}`);
    console.error(err);
    await databaseService.disconnect();
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

runJanuaryBackfill().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
